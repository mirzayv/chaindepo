import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { T } from './libs/types/common';
// SocketModule import qilinyapti — bu FAYL DARAJASIDAGI "tanishtirish" (BUGUN QO'SHILDI)
import { SocketModule } from './socket/socket.module';

@Module({
	imports: [
		// .env faylini o'qish uchun
		ConfigModule.forRoot(),
		// GraphQL serverini sozlash
		GraphQLModule.forRoot({
			// Apollo drayveri ishlatiladi
			driver: ApolloDriver,
			// Playground (brauzerdagi test interfeysi) yoqilgan
			playground: true,
			// GraphQL'ning o'z upload mexanizmi o'chirilgan (graphql-upload paketi ishlatilgani uchun)
			uploads: false,
			// sxema avtomatik generatsiya qilinadi (qo'lda .graphql fayl yozish shart emas)
			autoSchemaFile: true,
			// formatError — xatolarni chiroyli formatga keltiradigan funksiya, parametri error (tipi T)
			formatError: (error: T) => {
				// yangi obyekt yaratiladi, kerakli maydonlar ajratib olinadi
				// xato xabari — birinchi mavjudi olinadi (|| operatori). Apollo 4 + Nest 10'da HttpException javobi
				// extensions.originalError'da keladi; ValidationPipe xabarlari massiv bo'ladi — mijozga birinchisi qaytariladi
				const rawMessage =
					error?.extensions?.originalError?.message ||
					error?.extensions?.exception?.response?.message ||
					error?.extensions?.response?.message ||
					error?.message;
				const graphQLFormattedError = {
					// xato kodi
					code: error?.extensions?.code,
					message: Array.isArray(rawMessage) ? rawMessage[0] : rawMessage,
				};
				// konsolga chiqariladi
				console.log('GRAPHQL GLOBAL ERR:', graphQLFormattedError);
				// formatlangan xato qaytariladi
				return graphQLFormattedError;
			},
		}),
		// barcha biznes-modullarni birlashtiruvchi modul
		ComponentsModule,
		// MongoDB ulanishi
		DatabaseModule,
		// BUGUN QO'SHILDI: NestJS DARAJASIDA "ishlat" — faqat import qilish yetarli emas, bu massivga ham qo'shish shart, aks holda modul hech qachon ishga tushmaydi
		SocketModule,
	],
	// AppController ro'yxatga olinadi
	controllers: [AppController],
	// AppService va AppResolver ro'yxatga olinadi
	providers: [AppService, AppResolver],
})
export class AppModule {}
