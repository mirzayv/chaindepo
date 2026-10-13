import { Module } from '@nestjs/common';
// Controller va Service qo'shni fayllardan import qilinyapti
import { ChainDepoBatchController } from './chaindepo-batch.controller';
import { ChainDepoBatchService } from './chaindepo-batch.service';
// .env faylini o'qish uchun modul
import { ConfigModule } from '@nestjs/config';
// yuqorida yozgan MongoDB ulanish modulimiz
import { DatabaseModule } from './database/database.module';
// ScheduleModule — @nestjs/schedule paketidan, cron vazifalarini boshqaradigan asosiy modul (BUGUNGI DARSNING KALITI)
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
// DIQQAT: schema fayllari BOSHQA ILOVADAN (chaindepo-api) to'g'ridan-to'g'ri import qilinyapti — bu mumkin, chunki bu MONOREPO: ikkala ilova bir xil tsconfig va node_modules'ni bo'lishadi
import ShipmentSchema from 'apps/chaindepo-api/src/schemas/Shipment.model';
import MemberSchema from 'apps/chaindepo-api/src/schemas/Member.model';

@Module({
	imports: [
		// .env o'qiladi
		ConfigModule.forRoot(),
		// MongoDB ulanishi
		DatabaseModule,
		// ScheduleModule.forRoot() — cron mexanizmini ishga tushiradi; agar bu qatorni unutsangiz, @Cron metodlaringiz HECH QACHON chaqirilmaydi va hech qanday xato ham chiqmaydi (juda chalg'ituvchi bug)
		ScheduleModule.forRoot(),
		// Shipment modeli ro'yxatga olinadi — batch server yuklar reytingini hisoblaydi
		MongooseModule.forFeature([{ name: 'Shipment', schema: ShipmentSchema }]),
		// Member modeli ro'yxatga olinadi — batch server tashuvchilar (carrier) reytingini ham hisoblaydi
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
	],
	// Controller ro'yxatga olinadi (cron vazifalari shu yerda)
	controllers: [ChainDepoBatchController],
	// Service ro'yxatga olinadi (haqiqiy hisob-kitob shu yerda)
	providers: [ChainDepoBatchService],
})
export class ChainDepoBatchModule {}
