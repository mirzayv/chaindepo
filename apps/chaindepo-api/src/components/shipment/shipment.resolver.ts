import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ShipmentService } from './shipment.service';
import { Shipments, Shipment } from '../../libs/dto/shipment/shipment';
import {
	ShipmentInput,
	ShipmentsInquiry,
	MyShipmentsInquiry,
	AllShipmentsInquiry,
} from '../../libs/dto/shipment/shipment.input';
import { OrdinaryInquiry } from '../../libs/dto/common/common.input';
import { MemberType } from '../../libs/enums/member.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import * as mongoose from 'mongoose';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { ShipmentUpdate } from '../../libs/dto/shipment/shipment.update';

@Resolver()
export class ShipmentResolver {
	constructor(private readonly shipmentService: ShipmentService) {}

	@Roles(MemberType.USER)
	@UseGuards(RolesGuard)
	@Mutation(() => Shipment)
	public async createShipment(
		@Args('input') input: ShipmentInput,
		@AuthMember('_id') memberId: mongoose.ObjectId,
	): Promise<Shipment> {
		console.log('Mutation: createShipment');
		input.memberId = memberId;
		return await this.shipmentService.createShipment(input);
	}

	@UseGuards(WithoutGuard)
	@Query((returns) => Shipment)
	public async getShipment(
		@Args('shipmentId') input: string,
		@AuthMember('_id') memberId: mongoose.ObjectId,
	): Promise<Shipment> {
		console.log('Query: getShipment');
		const shipmentId = shapeIntoMongoObjectId(input);
		return await this.shipmentService.getShipment(memberId, shipmentId);
	}

	@Roles(MemberType.USER)
	@UseGuards(RolesGuard)
	@Mutation((returns) => Shipment)
	public async updateShipment(
		@Args('input') input: ShipmentUpdate,
		@AuthMember('_id') memberId: mongoose.ObjectId,
	): Promise<Shipment> {
		console.log('Mutation: updateShipment');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.shipmentService.updateShipment(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query((returns) => Shipments)
	public async getShipments(
		@Args('input') input: ShipmentsInquiry,
		@AuthMember('_id') memberId: mongoose.ObjectId,
	): Promise<Shipments> {
		console.log('Query: getShipments');
		return await this.shipmentService.getShipments(memberId, input);
	}

	@Roles(MemberType.USER)
	@UseGuards(RolesGuard)
	@Query((returns) => Shipments)
	public async getMyShipments(
		@Args('input') input: MyShipmentsInquiry,
		@AuthMember('_id') memberId: mongoose.ObjectId,
	): Promise<Shipments> {
		console.log('Query: getMyShipments');
		return await this.shipmentService.getMyShipments(memberId, input);
	}

	@Roles(MemberType.CARRIER)
	@UseGuards(RolesGuard)
	@Query((returns) => Shipments)
	public async getCarrierShipments(
		@Args('input') input: MyShipmentsInquiry,
		@AuthMember('_id') memberId: mongoose.ObjectId,
	): Promise<Shipments> {
		console.log('Query: getCarrierShipments');
		return await this.shipmentService.getCarrierShipments(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query((returns) => Shipments)
	public async getFavorites(
		@Args('input') input: OrdinaryInquiry,
		@AuthMember('_id') memberId: mongoose.ObjectId,
	): Promise<Shipments> {
		console.log('Query: getFavorites');
		return await this.shipmentService.getFavorite(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query((returns) => Shipments)
	public async getVisited(
		@Args('input') input: OrdinaryInquiry,
		@AuthMember('_id') memberId: mongoose.ObjectId,
	): Promise<Shipments> {
		console.log('Query: getVisited');
		return await this.shipmentService.getVisited(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Shipment)
	public async likeTargetShipment(
		@Args('shipmentId') input: string,
		@AuthMember('_id') memberId: mongoose.ObjectId,
	): Promise<Shipment> {
		console.log('Mutation: likeTargetShipment');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.shipmentService.likeTargetShipment(memberId, likeRefId);
	}

	/** ADMIN **/

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query((returns) => Shipments)
	public async getAllShipmentsByAdmin(
		@Args('input') input: AllShipmentsInquiry,
		@AuthMember('_id') memberId: mongoose.ObjectId,
	): Promise<Shipments> {
		console.log('Query: getAllShipmentsByAdmin');
		return await this.shipmentService.getAllShipmentsByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation((returns) => Shipment)
	public async updateShipmentByAdmin(@Args('input') input: ShipmentUpdate): Promise<Shipment> {
		console.log('Mutation: updateShipmentByAdmin');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.shipmentService.updateShipmentByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation((returns) => Shipment)
	public async removeShipmentByAdmin(@Args('shipmentId') input: string): Promise<Shipment> {
		console.log('Mutation: removeShipmentByAdmin');
		const shipmentId = shapeIntoMongoObjectId(input);
		return await this.shipmentService.removeShipmentByAdmin(shipmentId);
	}
}
