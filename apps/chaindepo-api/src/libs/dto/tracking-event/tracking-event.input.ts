import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length } from 'class-validator';
import * as mongoose from 'mongoose';
import { ShipmentLocation, ShipmentStatus } from '../../enums/shipment.enum';

@InputType()
export class TrackingEventInput {
	@IsNotEmpty()
	@Field(() => String)
	shipmentId!: mongoose.ObjectId;

	@IsNotEmpty()
	@Field(() => ShipmentStatus)
	eventStatus!: ShipmentStatus;

	@IsNotEmpty()
	@Field(() => ShipmentLocation)
	eventLocation!: ShipmentLocation;

	@IsOptional()
	@Length(1, 500)
	@Field(() => String, { nullable: true })
	eventNote?: string;
}
