import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, Length, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class AssistantHistoryInput {
	@IsIn(['user', 'model'])
	@Field(() => String)
	role!: 'user' | 'model';

	@IsString()
	@MaxLength(1000)
	@Field(() => String)
	text!: string;
}

@InputType()
export class AssistantInput {
	@IsNotEmpty()
	@Length(1, 500)
	@Field(() => String)
	message!: string;

	// only the last 6 items are sent to the model (see AssistantService)
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => AssistantHistoryInput)
	@Field(() => [AssistantHistoryInput], { nullable: true })
	history?: AssistantHistoryInput[];
}
