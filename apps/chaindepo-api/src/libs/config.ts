// MongoDB'ning ObjectId klassi 'bson' paketidan import qilinyapti — bu string ID'larni MongoDB tushunadigan maxsus ID formatiga aylantirish uchun kerak
import { ObjectId } from 'bson';
// T — bu loyihaning umumiy "har qanday obyekt" tipi, boshqa faylda e'lon qilingan, bu yerda funksiya parametrlarining tipini belgilash uchun ishlatiladi
import { T } from './types/common';

// Tashuvchilar (carrier) ro'yxatini saralash uchun ruxsat etilgan maydonlar ro'yxati — massiv, string qiymatlardan iborat
export const availableCarrierSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews', 'memberRank'];
// A'zolar ro'yxatini saralash uchun ruxsat etilgan maydonlar ro'yxati
export const availableMemberSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews'];

// Yuklar (shipment) ro'yxatini saralash uchun ruxsat etilgan maydonlar — ko'p qatorli massiv, o'qishni osonlashtirish uchun
export const availableShipmentSorts = [
	'createdAt',
	'updatedAt',
	'shipmentLikes',
	'shipmentViews',
	'shipmentRank',
	'shipmentPrice',
	'shipmentWeight',
];

// Maqolalar (board-article) ro'yxatini saralash uchun ruxsat etilgan maydonlar
export const availableBoardArticleSorts = ['createdAt', 'updatedAt', 'articleLikes', 'articleViews'];
// Izohlar (comment) ro'yxatini saralash uchun ruxsat etilgan maydonlar
export const availableCommentSorts = ['createdAt', 'updatedAt'];

/** IMAGE CONFIGURATION **/
// uuid paketidan v4 funksiyasi 'uuidv4' nomi bilan import qilinyapti — bu tasodifiy, takrorlanmaydigan ID yaratish uchun
import { v4 as uuidv4 } from 'uuid';
// Node.js'ning yo'l (path) bilan ishlash moduli, faylning kengaytmasini (masalan .png) ajratib olish uchun ishlatiladi
import * as path from 'path';

// Yuklashga ruxsat etilgan rasm formatlarining ro'yxati
export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
/** member input rules (signup and profile update); login stays lenient so old accounts still work */
export const MEMBER_NICK_REGEX = /^[A-Za-z0-9_]+$/;
export const MEMBER_NICK_MESSAGE = 'Nickname: 3–20 letters, numbers or _';
export const MEMBER_PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).+$/;
export const MEMBER_PASSWORD_MESSAGE = 'Password: 8–64 characters with at least one letter and one number';
export const MEMBER_PHONE_REGEX = /^01[016789]\d{7,8}$/;
export const MEMBER_PHONE_MESSAGE = 'Phone: Korean mobile number, e.g. 01012345678';

// '+82 10-1234-5678' → '01012345678': strip spaces and dashes, then a leading +82 becomes 0.
// Used by @Transform (validation) and again in MemberService before saving, because the global
// ValidationPipe has no transform: true, so resolvers receive the raw value.
export const normalizeMemberPhone = (value: unknown): unknown => {
	if (typeof value !== 'string') return value;
	return value.replace(/[\s-]/g, '').replace(/^\+82/, '0');
};

// upload folders under uploads/; target is client input, so only these are accepted
export const validUploadTargets = ['member', 'shipment', 'article'];
// getSerialForImage — bitta 'filename' parametrini (tipi avtomatik string deb chiqariladi) qabul qiluvchi funksiya, rasmga noyob nom beradi
export const getSerialForImage = (filename: string) => {
	// path.parse(filename).ext — berilgan fayl nomidan faqat kengaytmani (masalan '.jpg') ajratib, 'ext' konstantasiga saqlaydi
	const ext = path.parse(filename).ext;
	// uuidv4() chaqirilib, tasodifiy ID yaratiladi, unga yuqorida olingan kengaytma qo'shib qaytariladi
	return uuidv4() + ext;
};

/** TRACKING CODE **/
// Node.js'ning o'rnatilgan crypto moduli — tasodifiy baytlar yaratish uchun (qo'shimcha paket kerak emas)
import { randomBytes } from 'crypto';
import moment = require('moment');

// generateTrackingCode — yuk uchun noyob kuzatuv kodi: 'CD' + YYMMDD + 8 ta katta hex belgi (masalan CD261013A1B2C3D4)
export const generateTrackingCode = (): string => {
	return 'CD' + moment().format('YYMMDD') + randomBytes(4).toString('hex').toUpperCase();
};

// shapeIntoMongoObjectId —'target' parametrini (tipi 'any', ya'ni istalgan turdagi qiymat) qabul qiladi
export const shapeIntoMongoObjectId = (target: any) => {
	// agar target string bo'lsa — yangi ObjectId obyektiga aylantiradi (argument sifatida target uzatiladi), aks holda o'zini qaytaradi
	return typeof target === 'string' ? new ObjectId(target) : target;
};

// lookupMember — bu funksiya emas, tayyor obyekt konstanta: oddiy $lookup buyrug'i
export const lookupMember = {
	$lookup: {
		// qaysi collection'dan qidirish kerak — 'members'
		from: 'members',
		// hozirgi hujjatning qaysi maydoni orqali solishtirish — 'memberId'
		localField: 'memberId',
		// 'members' collection'idagi qaysi maydon bilan solishtirish — '_id'
		foreignField: '_id',
		// topilgan natija qaysi yangi nom ostida qo'shiladi — 'memberData'
		as: 'memberData',
	},
};

// lookupFollowingData — follow qilingan a'zoning ma'lumotini olish uchun tayyor $lookup obyekti
export const lookupFollowingData = {
	$lookup: {
		from: 'members',
		// hujjatdagi 'followingId' maydoni orqali solishtiriladi
		localField: 'followingId',
		foreignField: '_id',
		as: 'followingData',
	},
};

// lookupFollowerData — obuna bo'lgan (follower) a'zoning ma'lumotini olish uchun tayyor $lookup obyekti
export const lookupFollowerData = {
	$lookup: {
		from: 'members',
		// hujjatdagi 'followerId' maydoni orqali solishtiriladi
		localField: 'followerId',
		foreignField: '_id',
		as: 'followerData',
	},
};

// lookupAuthMemberLiked — ikkita PARAMETR qabul qiluvchi funksiya:
// memberId (tipi T) — hozirgi so'rovchi foydalanuvchining ID'si
// targetRefId (tipi string) — tekshiriladigan elementning maydoni, DEFAULT qiymati '$_id' (agar chaqirishda berilmasa, shu ishlatiladi)
export const lookupAuthMemberLiked = (memberId: T, targetRefId: string = '$_id') => {
	// funksiya bitta obyekt qaytaradi — bu MongoDB aggregation stage
	return {
		$lookup: {
			// qidiriladigan collection — 'likes'
			from: 'likes',
			// let bloki — tashqi qiymatlarni ichki pipeline'ga o'zgaruvchi sifatida uzatadi
			let: {
				// tashqaridan kelgan targetRefId argumenti 'localLikeRefId' nomli o'zgaruvchiga joylanadi
				localLikeRefId: targetRefId,
				// tashqaridan kelgan memberId argumenti 'localMemberId' nomli o'zgaruvchiga joylanadi
				localMemberId: memberId,
				// qattiq kodlangan true qiymati, keyinroq natijaga yozib qo'yish uchun
				localMyFavorite: true,
			},
			// pipeline — 'likes' collection'ining o'zi ichida ishlaydigan mustaqil, kichik aggregation
			pipeline: [
				{
					// $match bosqichi — filtrlash
					$match: {
						// $expr — ikkita maydonni bir-biriga solishtirish imkonini beruvchi operator
						$expr: {
							// $and — ikkala shart ham bir vaqtda to'g'ri bo'lishi kerak
							$and: [
								// like hujjatining 'likeRefId' maydoni tashqaridan kelgan qiymatga teng bo'lishi kerak
								{ $eq: ['$likeRefId', '$$localLikeRefId'] },
								// like hujjatining 'memberId' maydoni tashqaridan kelgan qiymatga teng bo'lishi kerak
								{ $eq: ['$memberId', '$$localMemberId'] },
							],
						},
					},
				},
				{
					// $project bosqichi — natijada qaysi maydonlar chiqishini belgilaydi
					$project: {
						// _id maydoni natijadan yashiriladi (0 — ko'rsatilmaydi)
						_id: 0,
						// memberId maydoni ko'rsatiladi (1 — ko'rsatiladi)
						memberId: 1,
						// likeRefId maydoni ko'rsatiladi
						likeRefId: 1,
						// myFavorite maydoniga qo'lda, let blokidagi qiymat yoziladi (agar hujjat shu yergacha yetib kelsa, demak like mavjud)
						myFavorite: '$$localMyFavorite',
					},
				},
			],
			// natija shu nom ostida asosiy hujjatga qo'shiladi
			as: 'meLiked',
		},
	};
};

// lookupFavorite — sevimli yuklar ro'yxatida, ichki joylashgan 'favoriteShipment' obyektining egasi (a'zosi) ma'lumotini olish uchun
export const lookupFavorite = {
	$lookup: {
		from: 'members',
		// e'tibor bering, bu yerda ichki (nested) maydonga murojaat qilinyapti — 'favoriteShipment.memberId'
		localField: 'favoriteShipment.memberId',
		foreignField: '_id',
		// natija ham ichki joyga, 'favoriteShipment.memberData' sifatida qo'shiladi
		as: 'favoriteShipment.memberData',
	},
};

// lookupVisit — ko'rilgan yuklar ro'yxatida, ichki joylashgan 'visitedShipment' obyektining egasi ma'lumotini olish uchun
export const lookupVisit = {
	$lookup: {
		from: 'members',
		// ichki maydonga murojaat — 'visitedShipment.memberId'
		localField: 'visitedShipment.memberId',
		foreignField: '_id',
		as: 'visitedShipment.memberData',
	},
};

// LookupAuthMemberFollowed — TypeScript interfeysi, keyingi funksiyaning birinchi parametri qanday shaklda bo'lishini belgilaydi
interface LookupAuthMemberFollowed {
	// followerId maydoni, tipi T
	followerId: T;
	// followingId maydoni, tipi string
	followingId: string;
}

// lookupAuthMemberFollowed — CURRY funksiya: funksiya funksiyani qaytaradi (ikki qavatli chaqiriladi)
export const lookupAuthMemberFollowed =
	// birinchi qavat — bitta PARAMETR 'input' oladi, tipi yuqoridagi interfeys
	(input: LookupAuthMemberFollowed) =>
		// ikkinchi qavat — boshqa lookup funksiyalar bilan bir xil imzoni saqlash uchun, memberId va targetRefId parametrlarini oladi
		(memberId: T, targetRefId: string = '$_id') => {
			// input obyektidan followerId va followingId ajratib olinadi (destructuring)
			const { followerId, followingId } = input;
			// funksiya obyekt qaytaradi — MongoDB aggregation stage
			return {
				$lookup: {
					// bu safar 'follows' collection'idan qidiriladi
					from: 'follows',
					let: {
						// tashqi followerId qiymati ichki o'zgaruvchiga joylanadi
						localFollowerId: followerId,
						// tashqi followingId qiymati ichki o'zgaruvchiga joylanadi
						localFollowingId: followingId,
						localMyFavorite: true,
					},
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										// follow hujjatining followerId maydoni solishtiriladi
										{ $eq: ['$followerId', '$$localFollowerId'] },
										// follow hujjatining followingId maydoni solishtiriladi
										{ $eq: ['$followingId', '$$localFollowingId'] },
									],
								},
							},
						},
						{
							$project: {
								_id: 0,
								followerId: 1,
								followingId: 1,
								// natija maydoni nomi bu safar 'myFollowing' (like'dan farqli, 'myFavorite' emas)
								myFollowing: '$$localMyFavorite',
							},
						},
					],
					// natija shu nom ostida qo'shiladi — 'meFollowed'
					as: 'meFollowed',
				},
			};
		};
