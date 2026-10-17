import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import * as mongoose from 'mongoose';
import { AssistantService } from './assistant.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { AssistantInput } from '../../libs/dto/assistant/assistant.input';
import { AssistantAnswer } from '../../libs/dto/assistant/assistant';

@Resolver()
export class AssistantResolver {
	constructor(private readonly assistantService: AssistantService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => AssistantAnswer)
	public async askAssistant(
		@Args('input') input: AssistantInput,
		@AuthMember('_id') memberId: mongoose.ObjectId,
	): Promise<AssistantAnswer> {
		console.log('Mutation: askAssistant');
		return await this.assistantService.askAssistant(memberId, input);
	}
}
