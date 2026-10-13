// Injectable decorator — classni dependency injection uchun tayyorlaydi
import { Injectable } from '@nestjs/common';
// InjectModel decorator — Mongoose modelini constructor'ga in'ektsiya qilish uchun
import { InjectModel } from '@nestjs/mongoose';
// Member va Shipment DTO'lari chaindepo-api'dan to'g'ridan-to'g'ri import qilinyapti (monorepo imkoniyati)
import { Member } from 'apps/chaindepo-api/src/libs/dto/member/member';
import { Shipment } from 'apps/chaindepo-api/src/libs/dto/shipment/shipment';
// MemberStatus, MemberType enum'lari — a'zoning holati va turi
import { MemberStatus, MemberType } from 'apps/chaindepo-api/src/libs/enums/member.enum';
// ShipmentStatus enum'i — yukning holati
import { ShipmentStatus } from 'apps/chaindepo-api/src/libs/enums/shipment.enum';
// Model — Mongoose modelining umumiy tipi
import { Model } from 'mongoose';

@Injectable()
export class ChainDepoBatchService {
	constructor(
		// 'Shipment' modeli in'ektsiya qilinadi, tipi Model<Shipment>
		@InjectModel('Shipment') private readonly shipmentModel: Model<Shipment>,
		// 'Member' modeli in'ektsiya qilinadi, tipi Model<Member>
		@InjectModel('Member') private readonly memberModel: Model<Member>,
	) {}

	// batchRollback — parametr olmaydi, Promise<void> qaytaradi (void = "bo'shliq", hech qanday qiymat qaytarmaydi, faqat amal bajaradi)
	public async batchRollback(): Promise<void> {
		// updateMany — ikkita argument oladi: birinchisi FILTR (qaysi hujjatlar), ikkinchisi YANGILANISH (nima o'zgaradi); findOneAndUpdate'dan farqi — barcha mos hujjatlarni BIR VAQTDA yangilaydi
		await this.shipmentModel
			.updateMany(
				{
					// filtr: o'chirilmagan (DELETE bo'lmagan) yuklar
					shipmentStatus: { $ne: ShipmentStatus.DELETE },
				},
				// yangilanish: shipmentRank maydonini 0ga tushirish — bu "belgilash tizimi": 0 degani "hali hisoblanmagan, navbatda"
				{ shipmentRank: 0 },
			)
			.exec();
		// xuddi shunday, barcha faol CARRIER turidagi a'zolarning reytingi 0ga tushiriladi
		await this.memberModel
			.updateMany({ memberStatus: MemberStatus.ACTIVE, memberType: MemberType.CARRIER }, { memberRank: 0 })
			.exec();
		// konsolga tasdiqlash log'i
		console.log('batchRollback');
	}

	// batchTopShipments — yuklar reytingini hisoblaydi
	public async batchTopShipments(): Promise<void> {
		// barcha o'chirilmagan VA hali hisoblanmagan (shipmentRank: 0) yuklar topiladi, natija Shipment[] tipidagi massivga saqlanadi
		const shipments: Shipment[] = await this.shipmentModel
			.find({ shipmentStatus: { $ne: ShipmentStatus.DELETE }, shipmentRank: 0 })
			.exec();
		// .map() har bir yuk uchun async funksiya chaqiradi; async funksiya HAR DOIM Promise qaytaradi, demak promisedList — bu natijalar massivi EMAS, balki PROMISE'LAR massivi (har biri "yangilashni boshladim, hali tugatmadim" degan va'da)
		const promisedList = shipments.map(async (ele: Shipment) => {
			// destructuring — hujjatdan uchta kerakli maydon ajratib olinadi
			const { _id, shipmentLikes, shipmentViews } = ele;
			// BIZNES FORMULASI: like 2 barobar og'irroq, chunki like — ongli harakat (odam yoqtirib bosgan), view esa passiv (shunchaki ko'rgan, balki tasodifan)
			const rank = shipmentLikes * 2 + shipmentViews * 1;
			// shu yukning shipmentRank maydoni yangi hisoblangan qiymat bilan yangilanadi
			return await this.shipmentModel.findByIdAndUpdate(_id, {
				shipmentRank: rank,
			});
		});
		// Promise.all — barcha Promise'larni BIR VAQTDA, PARALLEL kutadi; agar for sikli ichida await yozganingizda 100 ta yuk ketma-ket (~1 soniya) yangilanardi, bu yerda esa hammasi birga (~10-50ms)
		await Promise.all(promisedList);
	}

	// batchTopCarriers — tashuvchilar reytingini hisoblaydi, batchTopShipments'ning aynan bir xil naqshi
	public async batchTopCarriers(): Promise<void> {
		// barcha CARRIER turidagi, hali hisoblanmagan a'zolar topiladi
		const carriers: Member[] = await this.memberModel.find({ memberType: MemberType.CARRIER, memberRank: 0 }).exec();
		const promisedList = carriers.map(async (ele: Member) => {
			// destructuring — to'rtta maydon ajratib olinadi
			const { _id, memberLikes, memberArticles, memberViews } = ele;
			// memberShipments yuk jo'natuvchining (shipper) yuklarini sanaydi, shuning uchun tashuvchiga biriktirilgan va YETKAZILGAN yuklar alohida sanaladi
			const deliveredCount = await this.shipmentModel
				.countDocuments({ carrierId: _id, shipmentStatus: ShipmentStatus.DELIVERED })
				.exec();
			// BIZNES FORMULASI: yetkazilgan yuk (5x) eng qimmatli hissa; maqola yozish (3x) — jamiyatga hissa; like olish (2x) va ko'rilish (1x) — passivroq ko'rsatkichlar
			const rank = deliveredCount * 5 + memberArticles * 3 + memberLikes * 2 + memberViews * 1;
			// shu a'zoning memberRank maydoni yangilanadi
			return await this.memberModel.findByIdAndUpdate(_id, {
				memberRank: rank,
			});
		});
		// yana parallel kutish
		await Promise.all(promisedList);
	}

	// oddiy salom metodi, Controller'dagi @Get() orqali chaqiriladi
	public getHello(): string {
		return 'Welcome to ChainDepo BATCH Server';
	}
}
