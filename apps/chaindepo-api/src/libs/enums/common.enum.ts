import { registerEnumType } from '@nestjs/graphql';

export enum Message {
	SOMETHING_WENT_WRONG = 'Something went wrong!',
	NO_DATA_FOUND = 'No data found!',
	CREATE_FAILED = 'Create failed!',
	UPDATE_FAILED = 'Update failed!',
	REMOVE_FAILED = 'Remove failed!',
	UPLOAD_FAILED = 'Upload failed!',
	BAD_REQUEST = 'Bad Request',

	USED_MEMBER_NICK_OR_PHONE = 'Already used member nick or phone!',
	ADMIN_SIGNUP_NOT_ALLOWED = 'Signup is allowed only as USER or CARRIER!',
	NO_MEMBER_NICK = 'No member with that member nick!',
	BLOCKED_USER = 'You have been blocked!',
	WRONG_PASSWORD = 'Wrong password, try again!',
	NOT_AUTHENTICATED = 'You are not authenticated, please login first!',
	TOKEN_NOT_EXIST = 'Bearer Token is not provided!',
	ONLY_SPECIFIC_ROLES_ALLOWED = 'Allowed only for members with specific roles!',
	NOT_ALLOWED_REQUEST = 'Not Allowed Request!',
	PROVIDE_ALLOWED_FORMAT = 'Please provide jpg, jpeg or png images!',
	INVALID_UPLOAD_TARGET = 'Upload target must be member, shipment or article!',
	SELF_SUBSCRIPTION_DENIED = 'Self subscription is denied!',
	INVALID_STATUS_TRANSITION = 'Invalid shipment status transition!',
	SAME_LOCATION_AS_LAST_EVENT = 'IN_TRANSIT location must differ from the last event location!',
	CHAIN_CONFLICT = 'Shipment was updated concurrently, please retry!',
	BLOCKCHAIN_DISABLED = 'Blockchain anchoring is disabled!',
}

export enum Direction {
	ASC = 1,
	DESC = -1,
}
registerEnumType(Direction, {
	name: 'Direction',
});
