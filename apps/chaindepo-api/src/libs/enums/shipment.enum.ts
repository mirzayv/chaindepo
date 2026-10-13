import { registerEnumType } from '@nestjs/graphql';

export enum ShipmentType {
	DOCUMENT = 'DOCUMENT',
	PARCEL = 'PARCEL',
	PALLET = 'PALLET',
	CONTAINER = 'CONTAINER',
}
registerEnumType(ShipmentType, {
	name: 'ShipmentType',
});

export enum ShipmentStatus {
	CREATED = 'CREATED',
	PICKED_UP = 'PICKED_UP',
	IN_TRANSIT = 'IN_TRANSIT',
	DELIVERED = 'DELIVERED',
	CANCELLED = 'CANCELLED',
	DELETE = 'DELETE',
}
registerEnumType(ShipmentStatus, {
	name: 'ShipmentStatus',
});

export enum ShipmentLocation {
	SEOUL = 'SEOUL',
	BUSAN = 'BUSAN',
	INCHEON = 'INCHEON',
	DAEGU = 'DAEGU',
	GYEONGJU = 'GYEONGJU',
	GWANGJU = 'GWANGJU',
	CHONJU = 'CHONJU',
	DAEJON = 'DAEJON',
	JEJU = 'JEJU',
}
registerEnumType(ShipmentLocation, {
	name: 'ShipmentLocation',
});
