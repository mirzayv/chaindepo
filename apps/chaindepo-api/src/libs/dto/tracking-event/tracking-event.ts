import { Field, Int, ObjectType } from '@nestjs/graphql';
import * as mongoose from 'mongoose';
import { ShipmentLocation, ShipmentStatus } from '../../enums/shipment.enum';

@ObjectType()
export class TrackingEvent {
	@Field(() => String)
	_id!: mongoose.ObjectId;

	@Field(() => String)
	shipmentId!: mongoose.ObjectId;

	@Field(() => String)
	memberId!: mongoose.ObjectId;

	@Field(() => ShipmentStatus)
	eventStatus!: ShipmentStatus;

	@Field(() => ShipmentLocation)
	eventLocation!: ShipmentLocation;

	@Field(() => String, { nullable: true })
	eventNote?: string;

	@Field(() => String)
	prevHash!: string;

	@Field(() => String)
	eventHash!: string;

	@Field(() => String, { nullable: true })
	eventTxHash?: string | null;

	@Field(() => Date)
	createdAt!: Date;

	@Field(() => Date)
	updatedAt!: Date;
}

@ObjectType()
export class ChainVerification {
	@Field(() => Boolean)
	valid!: boolean;

	@Field(() => Int)
	totalEvents!: number;

	@Field(() => Int, { nullable: true })
	brokenAtIndex!: number | null;

	@Field(() => String, { nullable: true })
	lastEventHash!: string | null;

	@Field(() => Int, { nullable: true })
	anchoredEvents!: number | null;
	// On-chain isAnchored() === true bo'lgan hodisalar soni. null — anchoring o'chirilgan.
}

@ObjectType()
export class EventAnchorStatus {
	@Field(() => String)
	eventId!: mongoose.ObjectId;

	@Field(() => String)
	eventHash!: string;

	@Field(() => String, { nullable: true })
	eventTxHash!: string | null;

	@Field(() => Boolean, { nullable: true })
	anchored!: boolean | null;
	// null — anchoring o'chirilgan yoki RPC xatosi.
}
