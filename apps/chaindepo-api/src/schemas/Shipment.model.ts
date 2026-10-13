import { Schema } from 'mongoose';
import { ShipmentLocation, ShipmentStatus, ShipmentType } from '../libs/enums/shipment.enum';

const ShipmentSchema = new Schema(
	{
		shipmentType: {
			type: String,
			enum: ShipmentType,
			required: true,
		},

		shipmentStatus: {
			type: String,
			enum: ShipmentStatus,
			default: ShipmentStatus.CREATED,
		},

		shipmentOrigin: {
			type: String,
			enum: ShipmentLocation,
			required: true,
		},

		shipmentDestination: {
			type: String,
			enum: ShipmentLocation,
			required: true,
		},

		shipmentAddress: {
			type: String,
			required: true,
		},

		shipmentTitle: {
			type: String,
			required: true,
		},

		shipmentPrice: {
			type: Number,
			required: true,
		},

		shipmentWeight: {
			type: Number,
			required: true,
		},

		shipmentTrackingCode: {
			type: String,
			required: true,
			unique: true,
		},

		shipmentViews: {
			type: Number,
			default: 0,
		},

		shipmentLikes: {
			type: Number,
			default: 0,
		},

		shipmentComments: {
			type: Number,
			default: 0,
		},

		shipmentRank: {
			type: Number,
			default: 0,
		},

		shipmentImages: {
			type: [String],
			required: true,
		},

		shipmentDesc: {
			type: String,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		carrierId: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
		},

		lastEventHash: {
			type: String,
		},

		deliveredAt: {
			type: Date,
		},

		deletedAt: {
			type: Date,
		},
	},
	{ timestamps: true, collection: 'shipments' },
);

export default ShipmentSchema;
