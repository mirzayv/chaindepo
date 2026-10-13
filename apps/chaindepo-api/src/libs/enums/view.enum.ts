import { registerEnumType } from '@nestjs/graphql';

export enum ViewGroup {
	MEMBER = 'MEMBER',
	ARTICLE = 'ARTICLE',
	SHIPMENT = 'SHIPMENT',
}
registerEnumType(ViewGroup, {
	name: 'ViewGroup',
});
