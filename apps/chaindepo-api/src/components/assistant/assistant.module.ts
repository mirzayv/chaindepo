import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AssistantResolver } from './assistant.resolver';
import { AssistantService } from './assistant.service';
import { AuthModule } from '../auth/auth.module';
import { ShipmentModule } from '../shipment/shipment.module';
import { TrackingEventModule } from '../tracking-event/tracking-event.module';

@Module({
	imports: [HttpModule, AuthModule, ShipmentModule, TrackingEventModule],
	providers: [AssistantResolver, AssistantService],
})
export class AssistantModule {}
