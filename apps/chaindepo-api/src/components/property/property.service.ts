/**
 * ============================================================================
 *  apps/chaindepo-api/src/components/property/property.service.ts
 * ============================================================================
 *
 *  BU FAYL NIMA?
 *  PropertyService — mulk (uy) bilan bog'liq BARCHA biznes mantiq shu yerda.
 *  Resolver (Burak'dagi Controller) so'rovni qabul qiladi → Service'ga topshiradi → Service MongoDB bilan ishlaydi.
 *  "Yupqa Resolver, qalin Service" tamoyili.
 *
 *  REAL ESTATE MISOLI:
 *  Resolver — agentlikning qabulxonasi (mijozni kutib oladi, kirish kartasini tekshiradi).
 *  Service  — agentning o'zi (arxivdan uy qidiradi, shartnoma tuzadi, statistikani yangilaydi).
 *
 *  140–141-DARSLARDA FRONTEND QAYSI METODLARNI ISHLATADI:
 *  - getProperties()      → List sahifa (140) va Detail'dagi "Destination Property" (141)
 *  - getProperty()        → Detail sahifa (141) — GET_PROPERTY
 *  - likeTargetProperty() → yurakcha ❤️ (ikkala sahifada)
 *  - shapeMatchQuery()    → getProperties ichida filtrlarni MongoDB tiliga o'giradi (BUGUN O'ZGARDI)
 */

import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
// BadRequestException (400) — mijoz noto'g'ri so'rov yubordi. InternalServerErrorException (500) — serverda muammo.
// Injectable — DECORATOR: klassni NestJS'ning dependency injection tizimiga "tayyor" qiladi.
import { InjectModel } from '@nestjs/mongoose';
// InjectModel — DECORATOR: Mongoose modelini constructor'ga in'ektsiya qiladi.
import { Model, ObjectId } from 'mongoose';
import { Properties, Property } from '../../libs/dto/property/property';
// Property — bitta uyning tipi. Properties — { list: Property[], metaCounter: [...] } (ro'yxat + jami son).
import {
	AgentPropertiesInquiry,
	AllPropertiesInquiry,
	PropertiesInquiry,
	PropertyInput,
	OrdinaryInquiry,
} from '../../libs/dto/property/property.input';
// PropertiesInquiry — frontend'dagi searchFilter aynan shu tipda keladi: { page, limit, sort, direction, search }.
import { Direction, Message } from '../../libs/enums/common.enum';
import { MemberService } from '../member/member.service';
import { StatisticModifier, T } from '../../libs/types/common';
import { PropertyStatus } from '../../libs/enums/property.enum';
// PropertyStatus — ACTIVE (sotuvda) | SOLD (sotilgan) | DELETE (o'chirilgan).
import { ViewGroup } from '../../libs/enums/view.enum';
import { ViewService } from '../view/view.service';
import { PropertyUpdate } from '../../libs/dto/property/property.update';
import moment = require('moment');
import { lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
// lookupAuthMemberLiked — tayyor $lookup bosqichi: "shu foydalanuvchi like bosganmi?" (meLiked).
// lookupMember          — tayyor $lookup bosqichi: uyni joylagan agent ma'lumoti (memberData).
// shapeIntoMongoObjectId — string ID'ni MongoDB ObjectId'ga aylantiradi.
import { LikeService } from '../like/like.service';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';

@Injectable()
export class PropertyService {
	constructor(
		@InjectModel('Property') private readonly propertyModel: Model<Property>,
		// propertyModel — MongoDB'dagi "properties" kolleksiyasi bilan ishlash uchun model (arxiv shkafining kaliti).
		private memberService: MemberService,
		// Agent statistikasi (memberProperties) va agent ma'lumotini olish uchun.
		private viewService: ViewService,
		// Ko'rishlarni yozish (recordView) uchun.
		private likeService: LikeService,
		// Like qo'shish/olib tashlash (toggleLike) va tekshirish (checkLikeExistence) uchun.
	) {}
	// Constructor'dagi hamma narsani NestJS O'ZI yaratib beradi (dependency injection) — "new" yozish shart emas.

	public async createProperty(input: PropertyInput): Promise<Property> {
		// AGENT yangi uy joylaganda. (Bugungi darsga aloqasi yo'q.)
		try {
			const result = await this.propertyModel.create(input);
			await this.memberService.memberStatsEditor({
				_id: result.memberId,
				targetKey: 'memberProperties',
				modifier: 1,
			});
			// Agentning "joylagan uylari soni" +1. Batch server agent reytingini shu son bilan hisoblaydi (×5).
			return result;
		} catch (err: any) {
			console.log('Error, Service.model:', err.message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	// ════════════════════════════════════════════════════════════════════════
	//  getProperty — BITTA UY. Frontend: detail.tsx → GET_PROPERTY (141-DARS)
	// ════════════════════════════════════════════════════════════════════════
	public async getProperty(memberId: ObjectId, propertyId: ObjectId): Promise<Property> {
		// memberId   — PARAMETR: kim ko'ryapti (login qilmagan bo'lsa null).
		// propertyId — PARAMETR: qaysi uy (frontend URL'idagi ?id=...).

		const search: T = {
			_id: propertyId,
			propertyStatus: PropertyStatus.ACTIVE,
		};
		// Qidiruv sharti: shu ID'li VA sotuvda turgan uy. Sotilgan yoki o'chirilgan uyni ochib bo'lmaydi.

		const targetProperty: Property = (await this.propertyModel.findOne(search).lean().exec()) as unknown as Property;
		// findOne — METOD: bitta hujjat topadi.
		// .lean() — oddiy JS obyekt qaytaradi (Mongoose hujjati emas) → keyin unga meLiked, memberData qo'sha olamiz.
		if (!targetProperty) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		if (memberId) {
			// Faqat LOGIN QILGAN foydalanuvchi uchun:

			const viewInput = { memberId: memberId, viewRefId: propertyId, viewGroup: ViewGroup.PROPERTY };
			const newView = await this.viewService.recordView(viewInput);
			// recordView — "shu odam shu uyni ko'rdi" deb yozadi. Agar OLDIN ko'rgan bo'lsa → null (qayta sanalmaydi).
			if (newView) {
				await this.propertyStatsEditor({ _id: propertyId, targetKey: 'propertyViews', modifier: 1 });
				// Birinchi marta ko'rsa — bazada propertyViews +1.
				targetProperty.propertyViews++;
				// Javobdagi son ham +1 (bazaga qayta murojaat qilmaslik uchun).
			}
			// ☝️ SHU SABABLI frontend'da GET_PROPERTY → fetchPolicy: 'network-only'.
			// Keshdan olinsa bu kod ishlamaydi → ko'rish yozilmaydi → batch'dagi reyting (views + likes×2) buziladi.

			// meLiked
			const likeInput: LikeInput = { memberId, likeRefId: propertyId, likeGroup: LikeGroup.PROPERTY };
			targetProperty.meLiked = await this.likeService.checkLikeExistence(likeInput);
			// "Men shu uyga like bosganmanmi?" → [{ myFavorite: true }] yoki [].
			// Frontend detail.tsx'da yurakcha qizil ❤️ yoki bo'sh 🤍 chiqishi shunga bog'liq.
		}

		(targetProperty as any).memberData = await this.memberService.getMember(null as any, targetProperty.memberId);
		// Uyni joylagan AGENT ma'lumoti. Detail sahifaning o'ng tomonidagi "Get More Information" (ism, telefon, rasm).
		return targetProperty;
	}

	public async updateProperty(memberId: ObjectId, input: PropertyUpdate): Promise<Property> {
		// AGENT o'z uyini tahrirlaydi yoki SOLD/DELETE qiladi. (Bugungi darsga aloqasi yo'q.)
		let { propertyStatus, soldAt, deletedAt } = input;
		const search: T = {
			_id: input._id,
			memberId: memberId,
			propertyStatus: PropertyStatus.ACTIVE,
		};
		// memberId sharti: agent faqat O'ZINING uyini o'zgartira oladi.

		if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
		else if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();

		const result = await this.propertyModel
			.findOneAndUpdate(search, input, {
				new: true,
			})
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (soldAt || deletedAt) {
			await this.memberService.memberStatsEditor({
				_id: memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
			// Uy sotilsa/o'chirilsa — agentning faol uylari soni -1.
		}

		return result as unknown as Property;
	}

	// ════════════════════════════════════════════════════════════════════════
	//  getProperties — UYLAR RO'YXATI. Frontend: index.tsx → GET_PROPERTIES (140-DARS)
	//  Detail'dagi "Destination Property" ham shu metodni ishlatadi (141-DARS)
	// ════════════════════════════════════════════════════════════════════════
	public async getProperties(memberId: ObjectId, input: PropertiesInquiry): Promise<Properties> {
		// memberId — PARAMETR: kim so'rayapti (meLiked uchun). input — PARAMETR: frontend'dagi searchFilter (chek).
		const match: T = { propertyStatus: PropertyStatus.ACTIVE }; //boshlang'ich filtr: faqat faol mulklar
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC }; //"agar foydalanuvchi saralash tanlamagan bo'lsa, sana bo'yicha sarala" degan mantiq
		// [ ] — computed property name: kalit nomi o'zgaruvchidan. "Lowest Price" → { propertyPrice: 'ASC' }.
		// Frontend'dagi Sort by menyusi (New / Lowest / Highest) aynan shu qatorga ta'sir qiladi.

		this.shapeMatchQuery(match, input); //bu private metod chaqiriladi, u match obyektini referens orqali to'ldiradi (narx, joylashuv, xona soni kabi qo'shimcha filtrlarni qo'shadi) — bu bugungi darsga aloqasi yo'q, avvalgi darsdan qolgan
		// ☝️ Tuzatish: shapeMatchQuery'ning O'ZI bugun o'zgardi (pastda, "&& .length" qismi). Frontend Filter.tsx'dagi checkbox'lar shu yerga keladi.
		console.log('match:', match);
		// Terminalda ko'rgan "match: { propertyStatus: 'ACTIVE', propertyLocation: { '$in': ['SEOUL','BUSAN'] } }" — shu.

		const result = await this.propertyModel
			.aggregate([
				// aggregate — konveyer (pipeline): har bosqich oldingisining natijasini oladi.
				//filtrlash va saralash.
				{ $match: match },
				// 1) Faqat shartlarga mos uylar qoladi (arxivdan kerakli papkalar ajratildi).
				{ $sort: sort },
				// 2) Tartiblandi.
				{
					$facet: {
						// 3) $facet — natijani IKKI parallel tarmoqqa bo'ladi: "mana 9 ta uy" + "jami 27 ta bor".
						//list qismida sahifalash ($skip, $limit),
						list: [
							{ $skip: (input.page - 1) * input.limit },
							// Oldingi sahifalardagilarni o'tkazib yubor. 2-sahifa, limit 9 → 9 ta o'tkaziladi.
							{ $limit: input.limit },
							// Faqat 9 tasini ol.
							//va aynan mana shu qatorda:
							//bu yerda lookupAuthMemberLikedga faqat bitta argument (memberId) beriladi — ikkinchi parametr (targetRefId) berilmagan,
							// demak funksiya ichidagi default qiymat ('$_id') ishlatiladi.
							// Bu mantiqiy: getPropertiesda biz "ro'yxatdagi har bir mulkning o'z _idsi" bo'yicha tekshiramiz — boshqa
							// hech qanday maxsus maydon kerak emas (getFavoritesda esa $followingId yoki $followerId kabi boshqa maydon
							// kerak bo'lgan edi, chunki u yerda mulk emas, a'zolar ro'yxati edi).
							lookupAuthMemberLiked(memberId),
							// → har bir kartada meLiked → frontend PropertyCard'dagi yurakcha qizil/kulrang.
							lookupMember,
							//lookupMember (mulk egasining ma'lumotini olish uchun, avvalgi darsdan) va { $unwind: '$memberData' } boradi.
							{ $unwind: '$memberData' },
							// $unwind — [ {agent} ] massivni { agent } obyektga aylantiradi.
						],
						metaCounter: [{ $count: 'total' }],
						// Jami son → frontend'da setTotal → pagination sahifalari va "Total 27 properties available".
					},
				},
			])
			.exec();
		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		return result[0];
		// $facet doim BITTA hujjat qaytaradi: [ { list, metaCounter } ] → [0].
		// Frontend: data.getProperties.list va data.getProperties.metaCounter[0].total.
	}

	public async getFavorite(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		// MyPage → "My Favorites": men like bosgan uylar.
		return await this.likeService.getFavoriteProperties(memberId, input);
	}

	public async getVisited(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
		// MyPage → "Recently Visited": men ko'rgan uylar (getProperty'dagi recordView shu ro'yxatni to'ldiradi).
		return await this.viewService.getVisitedProperties(memberId, input);
	}

	// ════════════════════════════════════════════════════════════════════════
	//  shapeMatchQuery — CHEKNI MONGODB TILIGA O'GIRISH (BUGUN O'ZGARDI)
	//  Frontend Filter.tsx'dagi har bir checkbox/input shu yerdagi bitta qatorga mos keladi.
	// ════════════════════════════════════════════════════════════════════════
	private shapeMatchQuery(match: T, input: PropertiesInquiry): void {
		// private — faqat shu klass ichidan chaqiriladi. void — hech narsa qaytarmaydi, match'ni o'zgartiradi (referens).
		const {
			memberId,
			locationList,
			roomsList,
			bedsList,
			typeList,
			periodsRange,
			pricesRange,
			squaresRange,
			options,
			text,
		} = input.search;
		// DESTRUCTURING: input.search'dan 10 ta property alohida o'zgaruvchilarga.
		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		// Faqat shu agentning uylari (agent sahifasi uchun).

		// ─── BUGUN O'ZGARTIRILGAN 4 QATOR ────────────────────────────────────
		if (locationList && locationList.length) match.propertyLocation = { $in: locationList };
		if (roomsList && roomsList.length) match.propertyRooms = { $in: roomsList };
		if (bedsList && bedsList.length) match.propertyBeds = { $in: bedsList };
		if (typeList && typeList.length) match.propertyType = { $in: typeList };
		// NEGA "&& .length"? Mijoz hamma checkbox'ni olib tashlasa → locationList: [] (bo'sh massiv) kelishi mumkin.
		// { $in: [] } = "bo'sh ro'yxatdagi shaharlardan biri" = HECH NARSA → ro'yxat bo'm-bo'sh chiqardi.
		// Endi bo'sh massiv → shart qo'shilmaydi → "shahar tanlanmagan, hammasini ko'rsat".
		// $in — "shu qiymatlardan biriga teng": SEOUL YOKI BUSAN. Checkbox'lar = ro'yxat → $in.
		// ─────────────────────────────────────────────────────────────────────

		if (pricesRange) match.propertyPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
		// $gte (>=) va $lte (<=): narx oralig'i. Filter'dagi "Price Range" min/max input'lari.
		if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };
		// Joylangan sana oralig'i.
		if (squaresRange) match.propertySquare = { $gte: squaresRange.start, $lte: squaresRange.end };
		// Maydon (m²) oralig'i. Filter'dagi "Square meter" Min/Max select'lari.
		// DIQQAT: bu yerga ".length" QO'SHILMAYDI — squaresRange massiv emas, { start, end } OBYEKT.
		// Do'stingizda shu yerda .length bor edi → filtr umuman ishlamasdi.

		if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };
		// "What are you looking for?" qutisi. $regex — "sarlavha ichida shu so'z bormi". 'i' — katta-kichik harf farqsiz.
		if (options) {
			// ⚠️ REVIEW: "options && options.length" bo'lishi kerak. options: [] kelsa → $or: [] → MongoDB XATO beradi.
			// Hozir frontend Filter'dagi useEffect bo'sh options'ni o'chirib yuborgani uchun xato chiqmayapti.
			match['$or'] = options.map((ele) => {
				return { [ele]: true };
			});
			// ['propertyBarter', 'propertyRent'] → $or: [{ propertyBarter: true }, { propertyRent: true }]
			// "Barter YOKI ijara". Filter'dagi "Options" checkbox'lari.
		}
	}

	public async getAgentProperties(memberId: ObjectId, input: AgentPropertiesInquiry): Promise<Properties> {
		// AGENT o'zining uylari ro'yxatini ko'radi (MyPage → My Properties). O'chirilganlaridan tashqari hammasi.
		const { propertyStatus } = input.search;
		if (propertyStatus === PropertyStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);

		const match: T = {
			memberId: memberId,
			propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE },
			// $ne — "teng emas": DELETE bo'lmaganlar.
		};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.propertyModel
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

	public async getAllPropertiesByAdmin(input: AllPropertiesInquiry): Promise<Properties> {
		// ADMIN panel: hamma uylar, istalgan statusda.
		const { propertyStatus, propertyLocationList } = input.search;
		const match: T = {};
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		if (propertyStatus) match.propertyStatus = propertyStatus;
		if (propertyLocationList) match.propertyLocation = { $in: propertyLocationList };

		const result = await this.propertyModel
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

	public async updatePropertyByAdmin(input: PropertyUpdate): Promise<Property> {
		// ADMIN istalgan uyni o'zgartiradi (memberId sharti yo'q).
		let { propertyStatus, soldAt, deletedAt } = input;
		const search: T = {
			_id: input._id,
			propertyStatus: PropertyStatus.ACTIVE,
		};

		if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
		else if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();

		const result = await this.propertyModel
			.findOneAndUpdate(search, input, {
				new: true,
			})
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

		if (soldAt || deletedAt) {
			await this.memberService.memberStatsEditor({
				_id: result.memberId,
				targetKey: 'memberProperties',
				modifier: -1,
			});
		}

		return result;
	}

	public async removePropertyByAdmin(propertyId: ObjectId): Promise<Property> {
		// ADMIN bazadan BUTUNLAY o'chiradi — faqat oldin DELETE statusiga o'tkazilgan uylarni.
		const search: T = { _id: propertyId, propertyStatus: PropertyStatus.DELETE };
		const result = await this.propertyModel.findOneAndDelete(search).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

		return result;
	}

	// ════════════════════════════════════════════════════════════════════════
	//  likeTargetProperty — YURAKCHA ❤️. Frontend: index.tsx va detail.tsx → LIKE_TARGET_PROPERTY
	// ════════════════════════════════════════════════════════════════════════
	public async likeTargetProperty(memberId: ObjectId, likeRefId: ObjectId): Promise<Property> {
		// memberId — kim bosdi. likeRefId — qaysi uyga.
		const target = await this.propertyModel.findOne({ _id: likeRefId, propertyStatus: PropertyStatus.ACTIVE }).exec();
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		// Uy mavjud va sotuvda ekanini tekshirish.

		const input: LikeInput = { memberId, likeRefId, likeGroup: LikeGroup.PROPERTY };
		const modifier: number = await this.likeService.toggleLike(input);
		// toggleLike — TUGMA (yoqish/o'chirish): like bor bo'lsa → o'chiradi, -1; yo'q bo'lsa → yaratadi, +1.

		const result = await this.propertyStatsEditor({ _id: likeRefId, targetKey: 'propertyLikes', modifier });
		// Uyning like soni +1 yoki -1. Bu son batch'dagi reytingga ×2 bilan kiradi.
		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

		return result;
		// Frontend shundan keyin refetch qiladi → yangi like soni va yurakcha rangi ko'rinadi.
	}

	public async propertyStatsEditor(input: StatisticModifier): Promise<Property> {
		// Umumiy yordamchi: istalgan statistika maydonini (propertyViews, propertyLikes, propertyComments) +/- qiladi.
		const { _id, targetKey, modifier } = input;
		return (await this.propertyModel
			.findByIdAndUpdate(
				_id,
				{ $inc: { [targetKey]: modifier } },
				// $inc — "increment": maydonni modifier qadar oshir (yoki manfiy bo'lsa kamaytir). Atomik — bir vaqtda ikki like bosilsa ham to'g'ri sanaydi.
				{
					new: true,
					// new: true — YANGILANGAN hujjatni qaytar (eski emas).
				},
			)
			.exec()) as unknown as Property;
	}
}
