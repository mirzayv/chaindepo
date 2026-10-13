import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsPositive, Length } from 'class-validator';
import { ShipmentLocation, ShipmentStatus, ShipmentType } from '../../enums/shipment.enum';
import * as mongoose from 'mongoose';

@InputType()
export class ShipmentUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: mongoose.ObjectId | undefined;

	@IsOptional()
	@Field(() => ShipmentType, { nullable: true })
	shipmentType?: ShipmentType;

	@IsOptional()
	@Field(() => ShipmentStatus, { nullable: true })
	shipmentStatus?: ShipmentStatus;

	@IsOptional()
	@Field(() => ShipmentLocation, { nullable: true })
	shipmentOrigin?: ShipmentLocation;

	@IsOptional()
	@Field(() => ShipmentLocation, { nullable: true })
	shipmentDestination?: ShipmentLocation;

	@IsOptional()
	@Length(3, 100)
	@Field(() => String, { nullable: true })
	shipmentAddress?: string;

	@IsOptional()
	@Length(3, 100)
	@Field(() => String, { nullable: true })
	shipmentTitle?: string;

	@IsOptional()
	@Field(() => Number, { nullable: true })
	shipmentPrice?: number;

	@IsOptional()
	@IsPositive()
	@Field(() => Number, { nullable: true })
	shipmentWeight?: number;

	@IsOptional()
	@Field(() => [String], { nullable: true })
	shipmentImages?: string[];

	@IsOptional()
	@Length(5, 500)
	@Field(() => String, { nullable: true })
	shipmentDesc?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	carrierId?: mongoose.ObjectId;

	deliveredAt?: Date;

	deletedAt?: Date;
}
