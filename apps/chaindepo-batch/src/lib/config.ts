// BATCH_ROLLBACK — birinchi cron vazifasining nomi, qiymati o'z nomiga teng string
export const BATCH_ROLLBACK = 'BATCH_ROLLBACK';
// BATCH_TOP_SHIPMENTS — ikkinchi cron vazifasining nomi
export const BATCH_TOP_SHIPMENTS = 'BATCH_TOP_SHIPMENTS';
// BATCH_TOP_CARRIERS — uchinchi cron vazifasining nomi
export const BATCH_TOP_CARRIERS = 'BATCH_TOP_CARRIERS';
// Nega konstanta: bu nomlar ikki joyda ishlatiladi (@Cron decoratorida va Logger contextida); qo'lda ikki marta yozsangiz, xato yozib qo'yish mumkin, konstanta orqali TypeScript sizni himoya qiladi
