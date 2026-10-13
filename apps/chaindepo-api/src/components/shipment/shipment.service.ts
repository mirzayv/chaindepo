/**
 * ============================================================================
 *  apps/chaindepo-api/src/components/shipment/shipment.service.ts
 * ============================================================================
 *
 *  BU FAYL NIMA?
 *  ShipmentService — yuk (shipment) bilan bog'liq BARCHA biznes mantiq shu yerda.
 *  Resolver so'rovni qabul qiladi → Service'ga topshiradi → Service MongoDB bilan ishlaydi.
 *  "Yupqa Resolver, qalin Service" tamoyili.
 *
 *  ROLLAR:
 *  USER (shipper)  — yukni yaratadi va egasi bo'ladi (memberId).
 *  CARRIER         — yukka biriktiriladi (carrierId), o'ziga biriktirilgan yuklarni ko'radi.
 *  ADMIN           — istalgan yukni boshqaradi.
 */

import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, ObjectId } from 'mongoose';
import { Shipment, Shipments } from '../../libs/dto/shipment/shipment';
import {
	AllShipmentsInquiry,
	MyShipmentsInquiry,
	ShipmentInput,
	ShipmentsInquiry,
} from '../../libs/dto/shipment/shipment.input';
import { OrdinaryInquiry } from '../../libs/dto/common/common.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { StatisticModifier, T } from '../../libs/types/common';
import { ShipmentStatus } from '../../libs/enums/shipment.enum';
// ShipmentStatus — CREATED | PICKED_UP | IN_TRANSIT | DELIVERED | CANCELLED | DELETE (o'chirilgan).
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { ViewService } from '../view/view.service';
import { ShipmentUpdate } from '../../libs/dto/shipment/shipment.update';
import moment = require('moment');
import {
	generateTrackingCode,
	lookupAuthMemberLiked,
	lookupMember,
	shapeIntoMongoObjectId,
} from '../../libs/config';
// lookupAuthMemberLiked — tayyor $lookup bosqichi: "shu foydalanuvchi like bosganmi?" (meLiked).
// lookupMember          — tayyor $lookup bosqichi: yukni yaratgan shipper ma'lumoti (memberData).
// generateTrackingCode  — yuk uchun noyob kuzatuv kodi.
import { LikeService } from '../like/like.service';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { TrackingEventService } from '../tracking-event/tracking-event.service';

@Injectable()
export class ShipmentService {
	constructor(
		@InjectModel('Shipment') private readonly shipmentModel: Model<Shipment>,
		// shipmentModel — MongoDB'dagi "shipments" kolleksiyasi bilan ishlash uchun model.
		@InjectConnection() private readonly connection: Connection,
		// createShipment + genesis hodisasi bitta tranzaksiyada.
		private memberService: MemberService,
		// Shipper statistikasi (memberShipments) va carrier'ni tekshirish uchun.
		private viewService: ViewService,
		private likeService: LikeService,
		private trackingEventService: TrackingEventService,
		// Har bir status o'zgarishi hash zanjiriga hodisa sifatida yoziladi.
	) {}

	public async createShipment(input: ShipmentInput): Promise<Shipment> {
		// USER (shipper) yangi yuk yaratadi.
		if (input.carrierId) {
			input.carrierId = shapeIntoMongoObjectId(input.carrierId);
			await this.assertCarrier(input.carrierId as ObjectId);
		}
		input.shipmentTrackingCode = generateTrackingCode();
		// Kuzatuv kodi HAR DOIM serverda yaratiladi — mijozdan qabul qilinmaydi.

		const session = await this.connection.startSession();
		let result: Shipment | undefined;
		try {
			await session.withTransaction(async () => {
				const [shipment] = await this.shipmentModel.create([input], { session });
				const genesis = await this.trackingEventService.createGenesisEvent(shipment as unknown as Shipment, session);
				// Genesis CREATED hodisasi (joy = shipmentOrigin) va shipment.lastEventHash — yuk bilan BIRGA yoziladi.
				result = genesis.shipment;
			});
		} catch (err: any) {
			console.log('Error, Service.model:', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		} finally {
			await session.endSession();
		}
		if (!result) throw new BadRequestException(Message.CREATE_FAILED);

		await this.memberService.memberStatsEditor({
			_id: result.memberId,
			targetKey: 'memberShipments',
			modifier: 1,
		});
		// Shipperning "yuklari soni" +1.
		return result;
	}

	public async getShipmentByTrackingCode(trackingCode: string): Promise<Shipment> {
		// Ochiq (public) kuzatuv sahifasi uchun: ko'rish yozilmaydi, shipper ma'lumoti qo'shilmaydi.
		const result = await this.shipmentModel
			.findOne({ shipmentTrackingCode: trackingCode, shipmentStatus: { $ne: ShipmentStatus.DELETE } })
			.lean()
			.exec();
		if (!result) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result as unknown as Shipment;
	}

	public async claimShipment(carrierId: ObjectId, shipmentId: ObjectId): Promise<Shipment> {
		// CARRIER tashuvchisi yo'q (carrierId: null) CREATED yukni o'ziga oladi. Zanjirga hodisa yozilmaydi.
		await this.assertCarrier(carrierId);
		const result = await this.shipmentModel
			.findOneAndUpdate(
				{ _id: shipmentId, shipmentStatus: ShipmentStatus.CREATED, carrierId: null },
				// carrierId: null — maydon yo'q bo'lsa ham mos keladi. Shart tufayli ikki carrier bir yukni ola olmaydi.
				{ carrierId: carrierId },
				{ new: true },
			)
			.exec();
		if (!result) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		return result as unknown as Shipment;
	}

	public async getShipment(memberId: ObjectId, shipmentId: ObjectId): Promise<Shipment> {
		// memberId   — kim ko'ryapti (login qilmagan bo'lsa null).
		// shipmentId — qaysi yuk.
		const search: T = {
			_id: shipmentId,
			shipmentStatus: { $ne: ShipmentStatus.DELETE },
		};
		// O'chirilgan (DELETE) yukni ochib bo'lmaydi.

		const targetShipment: Shipment = (await this.shipmentModel.findOne(search).lean().exec()) as unknown as Shipment;
		// .lean() — oddiy JS obyekt qaytaradi → keyin unga meLiked, memberData qo'sha olamiz.
		if (!targetShipment) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			// Faqat LOGIN QILGAN foydalanuvchi uchun:
			const viewInput = { memberId: memberId, viewRefId: shipmentId, viewGroup: ViewGroup.SHIPMENT };
			const newView = await this.viewService.recordView(viewInput);
			// recordView — birinchi ko'rishda yozadi, qayta ko'rishda null qaytaradi.
			if (newView) {
				await this.shipmentStatsEditor({ _id: shipmentId, targetKey: 'shipmentViews', modifier: 1 });
				targetShipment.shipmentViews++;
			}

			// meLiked
			const likeInput: LikeInput = { memberId, likeRefId: shipmentId, likeGroup: LikeGroup.SHIPMENT };
			targetShipment.meLiked = await this.likeService.checkLikeExistence(likeInput);
		}

		(targetShipment as any).memberData = await this.memberService.getMember(null as any, targetShipment.memberId);
		// Yukni yaratgan shipper ma'lumoti.
		return targetShipment;
	}

	public async updateShipment(memberId: ObjectId, input: ShipmentUpdate): Promise<Shipment> {
		// Shipper o'z yukini faqat CREATED holatida (olib ketilmasdan oldin) tahrirlaydi yoki CANCELLED/DELETE qiladi.
		const { shipmentStatus } = input;
		if (shipmentStatus && shipmentStatus !== ShipmentStatus.CANCELLED && shipmentStatus !== ShipmentStatus.DELETE) {
			throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		}
		// PICKED_UP / IN_TRANSIT / DELIVERED — tashuvchi (TrackingEvent bosqichi) va admin uchun.

		if (input.carrierId) {
			input.carrierId = shapeIntoMongoObjectId(input.carrierId);
			await this.assertCarrier(input.carrierId as ObjectId);
		}

		if (shipmentStatus === ShipmentStatus.CANCELLED) {
			// Bekor qilish ham hash zanjiriga CANCELLED hodisasi sifatida yoziladi (TrackingEventService orqali).
			const target = await this.shipmentModel
				.findOne({ _id: input._id, memberId: memberId, shipmentStatus: ShipmentStatus.CREATED })
				.lean()
				.exec();
			if (!target) throw new InternalServerErrorException(Message.UPDATE_FAILED);

			await this.trackingEventService.appendEvent(target as unknown as Shipment, {
				memberId: memberId,
				eventStatus: ShipmentStatus.CANCELLED,
				eventLocation: target.shipmentOrigin,
				// Shipper faqat CREATED holatida bekor qiladi — yuk hali jo'natilgan joyda.
			});
			delete input.shipmentStatus;
			// Status allaqachon zanjir orqali o'rnatildi; quyida faqat qolgan maydonlar yangilanadi.
		}

		const search: T = {
			_id: input._id,
			memberId: memberId,
			shipmentStatus: shipmentStatus === ShipmentStatus.CANCELLED ? ShipmentStatus.CANCELLED : ShipmentStatus.CREATED,
		};
		// memberId sharti: shipper faqat O'ZINING yukini o'zgartira oladi.

		if (shipmentStatus === ShipmentStatus.DELETE) input.deletedAt = moment().toDate();

		const result = await this.shipmentModel
			.findOneAndUpdate(search, input, {
				new: true,
			})
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (input.deletedAt) {
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberShipments',
				modifier: -1,
			});
			// Yuk o'chirilsa — shipperning yuklari soni -1.
		}

		return result as unknown as Shipment;
	}

	public async getShipments(memberId: ObjectId, input: ShipmentsInquiry): Promise<Shipments> {
		// memberId — kim so'rayapti (meLiked uchun). input — { page, limit, sort, direction, search }.
		const match: T = { shipmentStatus: { $ne: ShipmentStatus.DELETE } };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		this.shapeMatchQuery(match, input);
		console.log('match:', match);

		const result = await this.shipmentModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						// $facet — natijani IKKI parallel tarmoqqa bo'ladi: sahifalangan ro'yxat + jami son.
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupAuthMemberLiked(memberId),
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async getFavorite(memberId: ObjectId, input: OrdinaryInquiry): Promise<Shipments> {
		// MyPage → "My Favorites": men like bosgan yuklar.
		return await this.likeService.getFavoriteShipments(memberId, input);
	}

	public async getVisited(memberId: ObjectId, input: OrdinaryInquiry): Promise<Shipments> {
		// MyPage → "Recently Visited": men ko'rgan yuklar.
		return await this.viewService.getVisitedShipments(memberId, input);
	}

	private shapeMatchQuery(match: T, input: ShipmentsInquiry): void {
		// Qidiruv filtrlarini MongoDB tiliga o'giradi (match'ni referens orqali o'zgartiradi).
		const {
			memberId,
			carrierId,
			originList,
			destinationList,
			typeList,
			statusList,
			periodsRange,
			pricesRange,
			weightsRange,
			text,
		} = input.search;
		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (carrierId) match.carrierId = shapeIntoMongoObjectId(carrierId);

		// "&& .length": bo'sh massiv kelsa → shart qo'shilmaydi ({ $in: [] } hech narsa qaytarmaydi).
		if (originList && originList.length) match.shipmentOrigin = { $in: originList };
		if (destinationList && destinationList.length) match.shipmentDestination = { $in: destinationList };
		if (typeList && typeList.length) match.shipmentType = { $in: typeList };
		if (statusList && statusList.length) match.shipmentStatus = { $in: statusList.filter((ele) => ele !== ShipmentStatus.DELETE) };

		if (pricesRange) match.shipmentPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
		if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };
		if (weightsRange) match.shipmentWeight = { $gte: weightsRange.start, $lte: weightsRange.end };
		// $gte (>=) va $lte (<=): oraliq. Bu yerga ".length" QO'SHILMAYDI — range'lar { start, end } OBYEKT.

		if (text) {
			// Sarlavha YOKI kuzatuv kodi bo'yicha qidiruv. 'i' — katta-kichik harf farqsiz.
			match['$or'] = [
				{ shipmentTitle: { $regex: new RegExp(text, 'i') } },
				{ shipmentTrackingCode: { $regex: new RegExp(text, 'i') } },
			];
		}
	}

	public async getMyShipments(memberId: ObjectId, input: MyShipmentsInquiry): Promise<Shipments> {
		// USER (shipper) o'zi yaratgan yuklar ro'yxatini ko'radi.
		return await this.getOwnShipments({ memberId: memberId }, input);
	}

	public async getCarrierShipments(carrierId: ObjectId, input: MyShipmentsInquiry): Promise<Shipments> {
		// CARRIER o'ziga biriktirilgan yuklar ro'yxatini ko'radi.
		return await this.getOwnShipments({ carrierId: carrierId }, input);
	}

	private async getOwnShipments(owner: T, input: MyShipmentsInquiry): Promise<Shipments> {
		const { shipmentStatus } = input.search;
		if (shipmentStatus === ShipmentStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const match: T = {
			...owner,
			shipmentStatus: shipmentStatus ?? { $ne: ShipmentStatus.DELETE },
			// $ne — "teng emas": DELETE bo'lmaganlar.
		};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.shipmentModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async getAllShipmentsByAdmin(input: AllShipmentsInquiry): Promise<Shipments> {
		// ADMIN panel: hamma yuklar, istalgan statusda.
		const { shipmentStatus, shipmentOriginList, shipmentDestinationList } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (shipmentStatus) match.shipmentStatus = shipmentStatus;
		if (shipmentOriginList) match.shipmentOrigin = { $in: shipmentOriginList };
		if (shipmentDestinationList) match.shipmentDestination = { $in: shipmentDestinationList };

		const result = await this.shipmentModel
			.aggregate([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
	}

	public async updateShipmentByAdmin(input: ShipmentUpdate): Promise<Shipment> {
		// ADMIN istalgan (o'chirilmagan) yukni o'zgartiradi. Statusdan faqat DELETE (yumshoq o'chirish) mumkin —
		// PICKED_UP / IN_TRANSIT / DELIVERED / CANCELLED faqat createTrackingEvent orqali (hash zanjiri).
		const { shipmentStatus } = input;
		if (shipmentStatus && shipmentStatus !== ShipmentStatus.DELETE) {
			throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		}
		const search: T = {
			_id: input._id,
			shipmentStatus: { $ne: ShipmentStatus.DELETE },
		};

		if (input.carrierId) {
			input.carrierId = shapeIntoMongoObjectId(input.carrierId);
			await this.assertCarrier(input.carrierId as ObjectId);
		}

		if (shipmentStatus === ShipmentStatus.DELETE) input.deletedAt = moment().toDate();
		// deliveredAt endi faqat DELIVERED hodisasi orqali o'rnatiladi.

		const result = await this.shipmentModel
			.findOneAndUpdate(search, input, {
				new: true,
			})
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (input.deletedAt) {
			await this.memberService.memberStatsEditor({
				_id: result.memberId,
				targetKey: 'memberShipments',
				modifier: -1,
			});
		}

		return result;
	}

	public async removeShipmentByAdmin(shipmentId: ObjectId): Promise<Shipment> {
		// ADMIN bazadan BUTUNLAY o'chiradi — faqat oldin DELETE statusiga o'tkazilgan yuklarni.
		const search: T = { _id: shipmentId, shipmentStatus: ShipmentStatus.DELETE };
		const result = await this.shipmentModel.findOneAndDelete(search).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		return result;
	}

	public async likeTargetShipment(memberId: ObjectId, likeRefId: ObjectId): Promise<Shipment> {
		// memberId — kim bosdi. likeRefId — qaysi yukka.
		const target = await this.shipmentModel
			.findOne({ _id: likeRefId, shipmentStatus: { $ne: ShipmentStatus.DELETE } })
			.exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = { memberId, likeRefId, likeGroup: LikeGroup.SHIPMENT };
		const modifier: number = await this.likeService.toggleLike(input);
		// toggleLike — like bor bo'lsa → o'chiradi, -1; yo'q bo'lsa → yaratadi, +1.

		const result = await this.shipmentStatsEditor({ _id: likeRefId, targetKey: 'shipmentLikes', modifier });
		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

		return result;
	}

	public async shipmentStatsEditor(input: StatisticModifier): Promise<Shipment> {
		// Umumiy yordamchi: istalgan statistika maydonini (shipmentViews, shipmentLikes, shipmentComments) +/- qiladi.
		const { _id, targetKey, modifier } = input;
		return (await this.shipmentModel
			.findByIdAndUpdate(
				_id,
				{ $inc: { [targetKey]: modifier } },
				// $inc — atomik oshirish/kamaytirish.
				{
					new: true,
				},
			)
			.exec()) as unknown as Shipment;
	}

	private async assertCarrier(carrierId: ObjectId): Promise<void> {
		// carrierId faol (ACTIVE) CARRIER a'zoga tegishli bo'lishi shart.
		const carrier = await this.memberService.getMember(null as any, carrierId).catch(() => null);
		if (!carrier || carrier.memberType !== MemberType.CARRIER || carrier.memberStatus !== MemberStatus.ACTIVE) {
			throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		}
	}
}
