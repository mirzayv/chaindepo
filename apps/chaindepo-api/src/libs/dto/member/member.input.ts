import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Length, Matches, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { MemberAuthType, MemberStatus, MemberType } from '../../enums/member.enum';
import {
	availableCarrierSorts,
	availableMemberSorts,
	MEMBER_NICK_MESSAGE,
	MEMBER_NICK_REGEX,
	MEMBER_PASSWORD_MESSAGE,
	MEMBER_PASSWORD_REGEX,
	MEMBER_PHONE_MESSAGE,
	MEMBER_PHONE_REGEX,
	normalizeMemberPhone,
} from '../../config';
import { Direction } from '../../enums/common.enum';

// each field uses one message for all its checks, so the first error the client sees is always the right one
@InputType()
export class MemberInput {
	@IsNotEmpty({ message: MEMBER_NICK_MESSAGE })
	@Length(3, 20, { message: MEMBER_NICK_MESSAGE })
	@Matches(MEMBER_NICK_REGEX, { message: MEMBER_NICK_MESSAGE })
	@Field(() => String)
	memberNick!: string;

	@IsNotEmpty({ message: MEMBER_PASSWORD_MESSAGE })
	@Length(8, 64, { message: MEMBER_PASSWORD_MESSAGE })
	@Matches(MEMBER_PASSWORD_REGEX, { message: MEMBER_PASSWORD_MESSAGE })
	@Field(() => String)
	memberPassword!: string;

	// validated after normalization; MemberService normalizes again before saving
	@Transform(({ value }) => normalizeMemberPhone(value))
	@IsNotEmpty({ message: MEMBER_PHONE_MESSAGE })
	@Matches(MEMBER_PHONE_REGEX, { message: MEMBER_PHONE_MESSAGE })
	@Field(() => String)
	memberPhone!: string;

	@IsOptional()
	@Field(() => MemberType, { nullable: true })
	memberType?: MemberType;

	@IsOptional()
	@Field(() => MemberAuthType, { nullable: true })
	memberAuthType?: MemberAuthType;
}

@InputType()
export class LoginInput {
	// lenient on purpose (no pattern checks): accounts created under the old rules must still log in
	@IsNotEmpty()
	@Length(3, 20)
	@Field(() => String)
	memberNick!: string;

	@IsNotEmpty()
	@Length(1, 64)
	@Field(() => String)
	memberPassword!: string;
}

@InputType()
class CarrierISearch {
	@IsNotEmpty()
	@Field(() => String, { nullable: true })
	text?: string;
}

@InputType()
export class CarriersInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number | undefined;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number | undefined;

	@IsOptional()
	@IsIn(availableCarrierSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => CarrierISearch)
	search: CarrierISearch | undefined;
}

@InputType()
class MISearch {
	@IsOptional()
	@Field(() => MemberStatus, { nullable: true })
	memberStatus?: MemberStatus;

	@IsOptional()
	@Field(() => MemberType, { nullable: true })
	memberType?: MemberType;

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;
}
@InputType()
export class MembersInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number | undefined;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number | undefined;

	@IsOptional()
	@IsIn(availableMemberSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => MISearch)
	search: MISearch | undefined;
}
