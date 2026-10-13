/** HASH CHAIN **/
// TrackingEvent'lar zanjiri: har bir hodisa oldingi hodisaning hash'ini (prevHash) o'z ichiga oladi.
// Yozish (appendEvent) va tekshirish (verifyShipmentChain) AYNAN shu funksiyadan foydalanadi.
import { createHash } from 'crypto';

// Birinchi (genesis) hodisaning prevHash qiymati — 64 ta nol.
export const GENESIS_HASH = '0'.repeat(64);

export interface TrackingEventHashPayload {
	shipmentId: any; // ObjectId yoki string
	memberId: any; // ObjectId yoki string
	eventStatus: string;
	eventLocation: string;
	eventNote?: string | null;
	createdAt: Date;
	prevHash: string;
}

// canonicalJson — kalitlar alifbo tartibida saralangan JSON. Bir xil ma'lumot → har doim bir xil string.
export const canonicalJson = (obj: Record<string, unknown>): string => {
	const sorted: Record<string, unknown> = {};
	for (const key of Object.keys(obj).sort()) sorted[key] = obj[key];
	return JSON.stringify(sorted);
};

// computeEventHash — hodisa maydonlaridan SHA-256 (hex) hisoblaydi.
export const computeEventHash = (payload: TrackingEventHashPayload): string => {
	const normalized = {
		shipmentId: String(payload.shipmentId),
		memberId: String(payload.memberId),
		eventStatus: payload.eventStatus,
		eventLocation: payload.eventLocation,
		eventNote: payload.eventNote ?? null,
		// undefined bo'lsa JSON.stringify kalitni tashlab yuboradi — shuning uchun null.
		createdAt: new Date(payload.createdAt).toISOString(),
		prevHash: payload.prevHash,
	};
	return createHash('sha256').update(canonicalJson(normalized)).digest('hex');
};
