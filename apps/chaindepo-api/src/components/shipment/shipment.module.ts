import { Module } from '@nestjs/common';
import { ShipmentResolver } from './shipment.resolver';
import { ShipmentService } from './shipment.service';
import { MongooseModule } from '@nestjs/mongoose';
import ShipmentSchema from '../../schemas/Shipment.model';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import { MemberModule } from '../member/member.module';
import { LikeModule } from '../like/like.module';

@Module({
	imports: [
		MongooseModule.forFeature([
			{
				name: 'Shipment',
				schema: ShipmentSchema,
			},
		]),
		AuthModule,
		ViewModule,
		MemberModule,
		LikeModule,
	],
	providers: [ShipmentResolver, ShipmentService],
	exports: [ShipmentService],
})
export class ShipmentModule {}
