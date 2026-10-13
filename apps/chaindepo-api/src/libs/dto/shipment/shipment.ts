import { Field, Int, ObjectType } from '@nestjs/graphql';
import * as mongoose from 'mongoose';
import { ShipmentLocation, ShipmentStatus, ShipmentType } from '../../enums/shipment.enum';
import { Member, TotalCounter } from '../member/member';
import { MeLiked } from '../like/like';

@ObjectType()
export class Shipment {
	@Field(() => String)
	_id!: mongoose.ObjectId;

	@Field(() => ShipmentType)
	shipmentType!: ShipmentType;

	@Field(() => ShipmentStatus)
	shipmentStatus!: ShipmentStatus;

	@Field(() => ShipmentLocation)
	shipmentOrigin!: ShipmentLocation;

	@Field(() => ShipmentLocation)
	shipmentDestination!: ShipmentLocation;

	@Field(() => String)
	shipmentAddress!: string;

	@Field(() => String)
	shipmentTitle!: string;

	@Field(() => Number)
	shipmentPrice!: number;

	@Field(() => Number)
	shipmentWeight!: number;

	@Field(() => String)
	shipmentTrackingCode!: string;

	@Field(() => Int)
	shipmentViews!: number;

	@Field(() => Int)
	shipmentLikes!: number;

	@Field(() => Int)
	shipmentComments!: number;

	@Field(() => Int)
	shipmentRank!: number;

	@Field(() => [String])
	shipmentImages!: string[];

	@Field(() => String, { nullable: true })
	shipmentDesc?: string;

	@Field(() => String)
	memberId!: mongoose.ObjectId;

	@Field(() => String, { nullable: true })
	carrierId?: mongoose.ObjectId;

	@Field(() => String, { nullable: true })
	lastEventHash?: string;

	@Field(() => Date, { nullable: true })
	deliveredAt?: Date;

	@Field(() => Date, { nullable: true })
	deletedAt?: Date;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;

	/** from aggregation **/

	@Field(() => [MeLiked], { nullable: true })
	meLiked?: MeLiked[];

	@Field(() => Member, { nullable: true })
	memberData?: Member;
}

@ObjectType()
export class Shipments {
	@Field(() => [Shipment])
	list: Shipment[] | undefined;

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[] | undefined;
}
