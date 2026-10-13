import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TrackingEventService } from './tracking-event.service';
import { ChainVerification, TrackingEvent } from '../../libs/dto/tracking-event/tracking-event';
import { TrackingEventInput } from '../../libs/dto/tracking-event/tracking-event.input';
import { Member } from '../../libs/dto/member/member';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class TrackingEventResolver {
	constructor(private readonly trackingEventService: TrackingEventService) {}

	@Roles(MemberType.CARRIER, MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => TrackingEvent)
	public async createTrackingEvent(
		@Args('input') input: TrackingEventInput,
		@AuthMember() authMember: Member,
	): Promise<TrackingEvent> {
		console.log('Mutation: createTrackingEvent');
		input.shipmentId = shapeIntoMongoObjectId(input.shipmentId);
		return await this.trackingEventService.createTrackingEvent(authMember, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => [TrackingEvent])
	public async getTrackingEvents(@Args('shipmentId') input: string): Promise<TrackingEvent[]> {
		console.log('Query: getTrackingEvents');
		const shipmentId = shapeIntoMongoObjectId(input);
		return await this.trackingEventService.getTrackingEvents(shipmentId);
	}

	@UseGuards(WithoutGuard)
	@Query(() => ChainVerification)
	public async verifyShipmentChain(@Args('shipmentId') input: string): Promise<ChainVerification> {
		console.log('Query: verifyShipmentChain');
		const shipmentId = shapeIntoMongoObjectId(input);
		return await this.trackingEventService.verifyShipmentChain(shipmentId);
	}
}
