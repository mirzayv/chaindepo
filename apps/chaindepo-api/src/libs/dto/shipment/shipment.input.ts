import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, IsPositive, Length, Min } from 'class-validator';
import * as mongoose from 'mongoose';
import { ShipmentLocation, ShipmentStatus, ShipmentType } from '../../enums/shipment.enum';
import { Direction } from '../../enums/common.enum';
import { availableShipmentSorts } from '../../config';
import { PeriodsRange, PricesRange } from '../common/common.input';

@InputType()
export class ShipmentInput {
	@IsNotEmpty()
	@Field(() => ShipmentType)
	shipmentType!: ShipmentType;

	@IsNotEmpty()
	@Field(() => ShipmentLocation)
	shipmentOrigin!: ShipmentLocation;

	@IsNotEmpty()
	@Field(() => ShipmentLocation)
	shipmentDestination!: ShipmentLocation;

	@IsNotEmpty()
	@Length(3, 100)
	@Field(() => String)
	shipmentAddress!: string;

	@IsNotEmpty()
	@Length(3, 100)
	@Field(() => String)
	shipmentTitle!: string;

	@IsNotEmpty()
	@Field(() => Number)
	shipmentPrice!: number;

	@IsNotEmpty()
	@IsPositive()
	@Field(() => Number)
	shipmentWeight!: number;

	@IsNotEmpty()
	@Field(() => [String])
	shipmentImages!: string[];

	@IsOptional()
	@Length(5, 500)
	@Field(() => String, { nullable: true })
	shipmentDesc?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	carrierId?: mongoose.ObjectId;

	memberId?: mongoose.ObjectId;

	shipmentTrackingCode?: string;
}

@InputType()
export class WeightsRange {
	@Field(() => Number)
	start!: number;

	@Field(() => Number)
	end!: number;
}

@InputType()
class SISearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	memberId?: mongoose.ObjectId;

	@IsOptional()
	@Field(() => String, { nullable: true })
	carrierId?: mongoose.ObjectId;

	@IsOptional()
	@Field(() => [ShipmentLocation], { nullable: true })
	originList?: ShipmentLocation[];

	@IsOptional()
	@Field(() => [ShipmentLocation], { nullable: true })
	destinationList?: ShipmentLocation[];

	@IsOptional()
	@Field(() => [ShipmentType], { nullable: true })
	typeList?: ShipmentType[];

	@IsOptional()
	@Field(() => [ShipmentStatus], { nullable: true })
	statusList?: ShipmentStatus[];

	@IsOptional()
	@Field(() => PricesRange, { nullable: true })
	pricesRange?: PricesRange;

	@IsOptional()
	@Field(() => WeightsRange, { nullable: true })
	weightsRange?: WeightsRange;

	@IsOptional()
	@Field(() => PeriodsRange, { nullable: true })
	periodsRange?: PeriodsRange;

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;
}

@InputType()
export class ShipmentsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page!: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit!: number;

	@IsOptional()
	@IsIn(availableShipmentSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => SISearch)
	search!: SISearch;
}

@InputType()
class MSISearch {
	@IsOptional()
	@Field(() => ShipmentStatus, { nullable: true })
	shipmentStatus?: ShipmentStatus;
}

@InputType()
export class MyShipmentsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page!: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit!: number;

	@IsOptional()
	@IsIn(availableShipmentSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => MSISearch)
	search!: MSISearch;
}

@InputType()
class ALSISearch {
	@IsOptional()
	@Field(() => ShipmentStatus, { nullable: true })
	shipmentStatus?: ShipmentStatus;

	@IsOptional()
	@Field(() => [ShipmentLocation], { nullable: true })
	shipmentOriginList?: ShipmentLocation[];

	@IsOptional()
	@Field(() => [ShipmentLocation], { nullable: true })
	shipmentDestinationList?: ShipmentLocation[];
}

@InputType()
export class AllShipmentsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page!: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit!: number;

	@IsOptional()
	@IsIn(availableShipmentSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => ALSISearch)
	search!: ALSISearch;
}
