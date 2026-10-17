import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import * as mongoose from 'mongoose';
import { AssistantService } from './assistant.service';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { AssistantInput } from '../../libs/dto/assistant/assistant.input';
import { AssistantAnswer } from '../../libs/dto/assistant/assistant';
import { T } from '../../libs/types/common';

@Resolver()
export class AssistantResolver {
	constructor(private readonly assistantService: AssistantService) {}

	// open to guests (memberId is null); members are still identified when a token is sent
	@UseGuards(WithoutGuard)
	@Mutation(() => AssistantAnswer)
	public async askAssistant(
		@Args('input') input: AssistantInput,
		@AuthMember('_id') memberId: mongoose.ObjectId | null,
		@Context('req') req: any,
	): Promise<AssistantAnswer> {
		console.log('Mutation: askAssistant');
		return await this.assistantService.askAssistant(memberId, getClientIp(req), input);
	}
}

/**
 * Client IP for the guest limit: X-Real-IP (set by nginx), else the first X-Forwarded-For value, else the socket.
 * Behind nginx X-Real-IP is always overwritten with $remote_addr; without a proxy these headers can be spoofed.
 */
function getClientIp(req: T): string {
	const realIp = req?.headers?.['x-real-ip'];
	const forwardedFor = req?.headers?.['x-forwarded-for'];
	const firstForwarded = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0] : undefined;
	const ip = (typeof realIp === 'string' && realIp.trim()) || firstForwarded?.trim() || req?.socket?.remoteAddress || 'unknown';
	// IPv4-mapped IPv6 (::ffff:1.2.3.4) and plain IPv4 count as the same client
	return ip.replace(/^::ffff:/, '');
}
