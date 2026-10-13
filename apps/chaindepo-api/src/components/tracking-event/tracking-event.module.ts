import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrackingEventResolver } from './tracking-event.resolver';
import { TrackingEventService } from './tracking-event.service';
import TrackingEventSchema from '../../schemas/TrackingEvent.model';
import ShipmentSchema from '../../schemas/Shipment.model';
import { AuthModule } from '../auth/auth.module';

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
	],
	providers: [TrackingEventResolver, TrackingEventService],
	exports: [TrackingEventService],
})
export class TrackingEventModule {}
