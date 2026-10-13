import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrackingEventResolver } from './tracking-event.resolver';
import { TrackingEventService } from './tracking-event.service';
import TrackingEventSchema from '../../schemas/TrackingEvent.model';
import ShipmentSchema from '../../schemas/Shipment.model';
import { AuthModule } from '../auth/auth.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
	imports: [
		MongooseModule.forFeature([
			{
				name: 'TrackingEvent',
				schema: TrackingEventSchema,
			},
			{
				name: 'Shipment',
				schema: ShipmentSchema,
			},
		]),
		AuthModule,
		BlockchainModule,
	],
	providers: [TrackingEventResolver, TrackingEventService],
	exports: [TrackingEventService],
})
export class TrackingEventModule {}
