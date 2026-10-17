import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { MemberStatus, MemberType } from '../../enums/member.enum';
import { ObjectId } from 'mongoose';
import {
	MEMBER_NICK_MESSAGE,
	MEMBER_NICK_REGEX,
	MEMBER_PASSWORD_MESSAGE,
	MEMBER_PASSWORD_REGEX,
	MEMBER_PHONE_MESSAGE,
	MEMBER_PHONE_REGEX,
	normalizeMemberPhone,
} from '../../config';

@InputType()
export class MemberUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId | undefined;

	@IsOptional()
	@Field(() => MemberType, { nullable: true })
	memberType?: MemberType;

	@IsOptional()
	@Field(() => MemberStatus, { nullable: true })
	memberStatus?: MemberStatus;

	// same rules as signup (MemberInput); MemberService normalizes the phone again before saving
	@IsOptional()
	@Transform(({ value }) => normalizeMemberPhone(value))
	@Matches(MEMBER_PHONE_REGEX, { message: MEMBER_PHONE_MESSAGE })
	@Field(() => String, { nullable: true })
	memberPhone?: string;

	@IsOptional()
	@Length(3, 20, { message: MEMBER_NICK_MESSAGE })
	@Matches(MEMBER_NICK_REGEX, { message: MEMBER_NICK_MESSAGE })
	@Field(() => String, { nullable: true })
	memberNick?: string;

	@IsOptional()
	@Length(8, 64, { message: MEMBER_PASSWORD_MESSAGE })
	@Matches(MEMBER_PASSWORD_REGEX, { message: MEMBER_PASSWORD_MESSAGE })
	@Field(() => String, { nullable: true })
	memberPassword?: string;

	@IsOptional()
	@Length(3, 100)
	@Field(() => String, { nullable: true })
	memberFullName?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	memberImage?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	memberAddress?: string;

	@IsOptional()
	@Field(() => String, { nullable: true })
	memberDesc?: string;

	deleteAt?: Date;
}
