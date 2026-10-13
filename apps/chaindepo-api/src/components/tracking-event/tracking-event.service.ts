/**
 * ============================================================================
 *  apps/chaindepo-api/src/components/tracking-event/tracking-event.service.ts
 * ============================================================================
 *
 *  BU FAYL NIMA?
 *  TrackingEventService — yukning holat tarixi (append-only) va SHA-256 hash zanjiri.
 *  Har bir hodisa: eventHash = sha256(canonical JSON { ..., prevHash }).
 *  Birinchi (genesis) hodisaning prevHash'i — 64 ta nol.
 *
 *  Shipment'ning lastEventHash'i zanjirning "uchi". Yangi hodisa shart bilan yoziladi:
 *  { _id, lastEventHash: prevHash } — ikki parallel hodisa zanjirni ikkiga ajrata olmaydi.
 *  Shipment yangilanishi + hodisa yozilishi bitta tranzaksiyada (Atlas replica set).
 */

import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, ObjectId } from 'mongoose';
import { ChainVerification, EventAnchorStatus, TrackingEvent } from '../../libs/dto/tracking-event/tracking-event';
import { TrackingEventInput } from '../../libs/dto/tracking-event/tracking-event.input';
import { Shipment } from '../../libs/dto/shipment/shipment';
import { Member } from '../../libs/dto/member/member';
import { ShipmentLocation, ShipmentStatus } from '../../libs/enums/shipment.enum';
import { MemberType } from '../../libs/enums/member.enum';
import { Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { computeEventHash, GENESIS_HASH } from '../../libs/hash-chain';
import { BlockchainService } from '../blockchain/blockchain.service';

// Ruxsat etilgan holat o'tishlari. Orqaga qaytish yo'q; DELIVERED / CANCELLED'dan keyin hech narsa yo'q.
const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
	[ShipmentStatus.CREATED]: [ShipmentStatus.PICKED_UP, ShipmentStatus.CANCELLED],
	[ShipmentStatus.PICKED_UP]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.CANCELLED],
	[ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELIVERED],
	// IN_TRANSIT takrorlanishi mumkin — har safar YANGI joy bilan.
	[ShipmentStatus.DELIVERED]: [],
	[ShipmentStatus.CANCELLED]: [],
	[ShipmentStatus.DELETE]: [],
};

export interface AppendEventInput {
	memberId: ObjectId | string; // hodisani kim qo'shdi (JWT'dan string keladi — Mongoose ObjectId'ga o'giradi)
	eventStatus: ShipmentStatus;
	eventLocation: ShipmentLocation;
	eventNote?: string;
}

export interface AppendEventResult {
	event: TrackingEvent;
	shipment: Shipment; // yangilangan shipment (yangi status va lastEventHash bilan)
}

@Injectable()
export class TrackingEventService {
	constructor(
		@InjectModel('TrackingEvent') private readonly trackingEventModel: Model<TrackingEvent>,
		@InjectModel('Shipment') private readonly shipmentModel: Model<Shipment>,
		// Shipment modeli shu yerda ham ro'yxatdan o'tgan — ShipmentModule'ni import qilmaymiz (aylanma bog'liqlik bo'lmasligi uchun).
		@InjectConnection() private readonly connection: Connection,
		// Tranzaksiya (session) ochish uchun.
		private readonly blockchainService: BlockchainService,
		// eventHash'ni Sepolia'ga yozish (anchor) va tekshirish.
	) {}

	public async createTrackingEvent(authMember: Member, input: TrackingEventInput): Promise<TrackingEvent> {
		// CARRIER (biriktirilgan) yoki ADMIN yangi hodisa qo'shadi.
		const { eventStatus } = input;
		if (eventStatus === ShipmentStatus.CREATED || eventStatus === ShipmentStatus.DELETE) {
			throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		}
		// CREATED — faqat genesis (createShipment). DELETE — hodisa emas, yumshoq o'chirish.

		const shipment = await this.findActiveShipment(input.shipmentId);
		const isAdmin = authMember.memberType === MemberType.ADMIN;

		if (eventStatus === ShipmentStatus.CANCELLED) {
			if (!isAdmin) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
			// Shipper bekor qilishni updateShipment orqali qiladi; carrier bekor qila olmaydi.
		} else {
			const isAssignedCarrier = !!shipment.carrierId && String(shipment.carrierId) === String(authMember._id);
			if (!isAdmin && !isAssignedCarrier) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		}

		const { event } = await this.appendEvent(shipment, {
			memberId: authMember._id,
			eventStatus,
			eventLocation: input.eventLocation,
			eventNote: input.eventNote,
		});
		return event;
	}

	public async createGenesisEvent(shipment: Shipment, session: ClientSession): Promise<AppendEventResult> {
		// Yuk yaratilganda avtomatik CREATED hodisasi: joy = shipmentOrigin, prevHash = 64 ta nol.
		return await this.appendEvent(
			shipment,
			{
				memberId: shipment.memberId,
				eventStatus: ShipmentStatus.CREATED,
				eventLocation: shipment.shipmentOrigin,
			},
			session,
		);
	}

	public async appendEvent(
		shipment: Shipment,
		input: AppendEventInput,
		session?: ClientSession,
	): Promise<AppendEventResult> {
		// Ichki yo'l: rol tekshiruvi YO'Q — chaqiruvchi ruxsatni oldin tekshiradi.
		await this.assertTransition(shipment, input);

		if (session) return await this.writeEvent(shipment, input, session);
		// Tashqi tranzaksiyaga qo'shiladi (createShipment).

		const ownSession = await this.connection.startSession();
		try {
			let result: AppendEventResult | undefined;
			await ownSession.withTransaction(async () => {
				result = await this.writeEvent(shipment, input, ownSession);
			});
			if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);
			this.scheduleAnchor(result.event);
			// Faqat commit'dan KEYIN. Tashqi session (genesis) bo'lsa — chaqiruvchi o'zi commit'dan keyin chaqiradi.
			return result;
		} finally {
			await ownSession.endSession();
		}
	}

	public async getTrackingEvents(shipmentId: ObjectId): Promise<TrackingEvent[]> {
		// Ochiq (public): eng eskisidan boshlab.
		await this.findActiveShipment(shipmentId);
		return (await this.trackingEventModel
			.find({ shipmentId: shipmentId })
			.sort({ createdAt: 1, _id: 1 })
			.lean()
			.exec()) as unknown as TrackingEvent[];
	}

	public async verifyShipmentChain(shipmentId: ObjectId): Promise<ChainVerification> {
		// Ochiq (public): har bir hash'ni tartib bilan QAYTA hisoblaydi.
		const shipment = await this.findActiveShipment(shipmentId);
		const events = (await this.trackingEventModel
			.find({ shipmentId: shipmentId })
			.sort({ createdAt: 1, _id: 1 })
			.lean()
			.exec()) as unknown as TrackingEvent[];

		let brokenAtIndex: number | null = null;
		for (let i = 0; i < events.length; i++) {
			const event = events[i];
			const expectedPrevHash = i === 0 ? GENESIS_HASH : events[i - 1].eventHash;
			if (event.prevHash !== expectedPrevHash || computeEventHash(event) !== event.eventHash) {
				brokenAtIndex = i;
				break;
			}
		}

		if (brokenAtIndex === null && events.length && events[events.length - 1].eventHash !== shipment.lastEventHash) {
			brokenAtIndex = events.length;
			// Hodisalar to'g'ri, lekin shipment.lastEventHash zanjir uchiga mos emas.
		}

		let anchoredEvents: number | null = null;
		if (this.blockchainService.isEnabled()) {
			const anchored = await Promise.all(events.map((event) => this.blockchainService.isAnchored(event.eventHash)));
			anchoredEvents = anchored.filter((value) => value === true).length;
			// On-chain hisoblanadi — eventTxHash'ga ishonilmaydi.
		}

		return {
			valid: events.length > 0 && brokenAtIndex === null,
			totalEvents: events.length,
			brokenAtIndex,
			lastEventHash: shipment.lastEventHash ?? null,
			anchoredEvents,
		};
	}

	public async getEventAnchorStatuses(shipmentId: ObjectId): Promise<EventAnchorStatus[]> {
		// Ochiq (public): har bir hodisa uchun on-chain isAnchored(eventHash).
		await this.findActiveShipment(shipmentId);
		const events = (await this.trackingEventModel
			.find({ shipmentId: shipmentId })
			.sort({ createdAt: 1, _id: 1 })
			.lean()
			.exec()) as unknown as TrackingEvent[];

		return await Promise.all(
			events.map(async (event) => ({
				eventId: event._id,
				eventHash: event.eventHash,
				eventTxHash: event.eventTxHash ?? null,
				anchored: await this.blockchainService.isAnchored(event.eventHash),
			})),
		);
	}

	public scheduleAnchor(event: TrackingEvent): void {
		// Fire-and-forget: GraphQL javobini kutdirmaydi va hech qachon xato qaytarmaydi.
		if (!this.blockchainService.isEnabled()) return;
		void this.anchorEvent(event).catch((err: any) => {
			console.log('Anchor failed:', String(event._id), err?.shortMessage ?? err?.code);
		});
	}

	public async anchorPendingEvents(): Promise<number> {
		// ADMIN: eventTxHash null bo'lgan barcha hodisalarni ketma-ket anchor qiladi.
		if (!this.blockchainService.isEnabled()) throw new BadRequestException(Message.BLOCKCHAIN_DISABLED);
		const events = (await this.trackingEventModel
			.find({ eventTxHash: null })
			.sort({ createdAt: 1, _id: 1 })
			.lean()
			.exec()) as unknown as TrackingEvent[];

		let count = 0;
		for (const event of events) {
			try {
				const status = await this.anchorEvent(event);
				if (status !== 'DISABLED') count++;
				// ALREADY_ANCHORED — muvaffaqiyat, lekin tx yo'q (eventTxHash null qoladi).
			} catch (err: any) {
				console.log('Anchor failed:', String(event._id), err?.shortMessage ?? err?.code);
				// Keyingi hodisaga o'tiladi.
			}
		}
		return count;
	}

	private async anchorEvent(event: TrackingEvent): Promise<'ANCHORED' | 'ALREADY_ANCHORED' | 'DISABLED'> {
		const result = await this.blockchainService.anchor(event.shipmentId, event.eventHash);
		if (result.status === 'ANCHORED') {
			await this.trackingEventModel
				.updateOne({ _id: event._id, eventTxHash: null }, { eventTxHash: result.txHash })
				.exec();
			// eventTxHash hash'ga kirmaydi — zanjir buzilmaydi.
		}
		return result.status;
	}

	private async writeEvent(
		shipment: Shipment,
		input: AppendEventInput,
		session: ClientSession,
	): Promise<AppendEventResult> {
		// withTransaction qayta urinishda shu funksiyani yana chaqiradi — qiymatlar har safar yangidan hisoblanadi.
		const prevHash = shipment.lastEventHash ?? GENESIS_HASH;
		const createdAt = new Date();
		const eventHash = computeEventHash({
			shipmentId: shipment._id,
			memberId: input.memberId,
			eventStatus: input.eventStatus,
			eventLocation: input.eventLocation,
			eventNote: input.eventNote,
			createdAt,
			prevHash,
		});

		const update: T = { shipmentStatus: input.eventStatus, lastEventHash: eventHash };
		if (input.eventStatus === ShipmentStatus.DELIVERED) update.deliveredAt = createdAt;

		const updatedShipment = await this.shipmentModel
			.findOneAndUpdate(
				{
					_id: shipment._id,
					shipmentStatus: shipment.shipmentStatus,
					lastEventHash: shipment.lastEventHash ?? null,
					// null — maydon yo'q bo'lgan (genesis'dan oldingi) hujjatga ham mos keladi.
				},
				update,
				{ new: true, session },
			)
			.exec();
		if (!updatedShipment) throw new BadRequestException(Message.CHAIN_CONFLICT);
		// Zanjir uchi o'zgargan — hodisa SAQLANMAYDI (tranzaksiya bekor bo'ladi).

		const [event] = await this.trackingEventModel.create(
			[
				{
					shipmentId: shipment._id,
					memberId: input.memberId,
					eventStatus: input.eventStatus,
					eventLocation: input.eventLocation,
					eventNote: input.eventNote,
					prevHash,
					eventHash,
					createdAt,
					// createdAt aniq beriladi — Mongoose timestamps uni almashtirmaydi.
				},
			],
			{ session },
		);

		return { event: event as unknown as TrackingEvent, shipment: updatedShipment as unknown as Shipment };
	}

	private async assertTransition(shipment: Shipment, input: AppendEventInput): Promise<void> {
		const isGenesis = input.eventStatus === ShipmentStatus.CREATED;
		if (isGenesis) {
			if (shipment.lastEventHash) throw new BadRequestException(Message.INVALID_STATUS_TRANSITION);
			return;
		}

		if (!shipment.lastEventHash) throw new BadRequestException(Message.INVALID_STATUS_TRANSITION);
		// Bu bosqichdan oldin yaratilgan yuklarda genesis hodisasi yo'q — zanjirga qo'shib bo'lmaydi.

		const allowed = ALLOWED_TRANSITIONS[shipment.shipmentStatus] ?? [];
		if (!allowed.includes(input.eventStatus)) throw new BadRequestException(Message.INVALID_STATUS_TRANSITION);

		if (shipment.shipmentStatus === ShipmentStatus.IN_TRANSIT && input.eventStatus === ShipmentStatus.IN_TRANSIT) {
			// Takroriy IN_TRANSIT — joy oldingi hodisadagidan farq qilishi shart.
			const lastEvent = await this.trackingEventModel
				.findOne({ shipmentId: shipment._id, eventHash: shipment.lastEventHash })
				.lean()
				.exec();
			if (lastEvent && lastEvent.eventLocation === input.eventLocation) {
				throw new BadRequestException(Message.SAME_LOCATION_AS_LAST_EVENT);
				// Alohida xabar — noto'g'ri status o'tishidan farqlash uchun (masalan, bir xil so'rov ikki marta yuborilganda).
			}
		}
	}

	private async findActiveShipment(shipmentId: ObjectId): Promise<Shipment> {
		const shipment = await this.shipmentModel
			.findOne({ _id: shipmentId, shipmentStatus: { $ne: ShipmentStatus.DELETE } })
			.lean()
			.exec();
		if (!shipment) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return shipment as unknown as Shipment;
	}
}
