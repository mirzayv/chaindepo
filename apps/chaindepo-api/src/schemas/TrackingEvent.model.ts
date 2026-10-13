import { Schema } from 'mongoose';
import { ShipmentLocation, ShipmentStatus } from '../libs/enums/shipment.enum';

const TrackingEventSchema = new Schema(
	{
		shipmentId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Shipment',
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		eventStatus: {
			type: String,
			enum: ShipmentStatus,
			required: true,
		},

		eventLocation: {
			type: String,
			enum: ShipmentLocation,
			required: true,
		},

		eventNote: {
			type: String,
		},

		prevHash: {
			type: String,
			required: true,
		},

		eventHash: {
			type: String,
			required: true,
		},

		eventTxHash: {
			type: String,
			default: null,
		},
	},
	{ timestamps: true, collection: 'trackingEvents' },
);

TrackingEventSchema.index({ shipmentId: 1, createdAt: 1 });

export default TrackingEventSchema;
