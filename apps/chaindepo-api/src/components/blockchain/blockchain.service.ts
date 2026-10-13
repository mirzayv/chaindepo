/**
 * ============================================================================
 *  apps/chaindepo-api/src/components/blockchain/blockchain.service.ts
 * ============================================================================
 *
 *  BU FAYL NIMA?
 *  BlockchainService — TrackingEvent hash'larini Ethereum Sepolia'dagi ChainDepoAnchor
 *  kontraktiga yozadi (anchor) va tekshiradi (isAnchored). MongoDB bilan ishlamaydi.
 *
 *  .env: SEPOLIA_RPC_URL, ANCHOR_CONTRACT_ADDRESS, ANCHOR_PRIVATE_KEY.
 *  Biri yo'q yoki noto'g'ri bo'lsa — bitta ogohlantirish, anchoring o'chadi, ilova ishlayveradi.
 *  Private key va RPC URL (ichida API kalit bo'lishi mumkin) HECH QACHON log qilinmaydi.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Contract, JsonRpcProvider, Wallet, id, isAddress } from 'ethers';

const ANCHOR_ABI = [
	'function anchor(bytes32 shipmentKey, bytes32 eventHash)',
	'function isAnchored(bytes32 eventHash) view returns (bool)',
	'event EventAnchored(bytes32 indexed shipmentKey, bytes32 indexed eventHash, uint256 timestamp)',
];

const TX_WAIT_TIMEOUT_MS = 180_000;

export type AnchorResult =
	| { status: 'ANCHORED'; txHash: string }
	| { status: 'ALREADY_ANCHORED' }
	| { status: 'DISABLED' };

@Injectable()
export class BlockchainService {
	private readonly logger = new Logger(BlockchainService.name);
	private readonly contract: Contract | null = null;
	private queue: Promise<unknown> = Promise.resolve();
	// Yagona navbat: barcha yozuv tranzaksiyalari ketma-ket — nonce'lar to'qnashmaydi.

	constructor() {
		const rpcUrl = process.env.SEPOLIA_RPC_URL;
		const address = process.env.ANCHOR_CONTRACT_ADDRESS;
		const privateKey = process.env.ANCHOR_PRIVATE_KEY;

		const missing: string[] = [];
		if (!rpcUrl) missing.push('SEPOLIA_RPC_URL');
		if (!address) missing.push('ANCHOR_CONTRACT_ADDRESS');
		if (!privateKey) missing.push('ANCHOR_PRIVATE_KEY');
		if (missing.length) {
			this.logger.warn(`Blockchain anchoring disabled: missing ${missing.join(', ')}`);
			return;
		}
		if (!isAddress(address)) {
			this.logger.warn('Blockchain anchoring disabled: invalid ANCHOR_CONTRACT_ADDRESS');
			return;
		}

		try {
			const provider = new JsonRpcProvider(rpcUrl, 'sepolia', { staticNetwork: true });
			// staticNetwork — RPC ishlamasa ham ishga tushishda tarmoqni qayta-qayta aniqlamaydi.
			const wallet = new Wallet(privateKey as string, provider);
			this.contract = new Contract(address as string, ANCHOR_ABI, wallet);
		} catch {
			this.logger.warn('Blockchain anchoring disabled: invalid ANCHOR_PRIVATE_KEY or SEPOLIA_RPC_URL');
			// Xato obyekti log qilinmaydi — unda maxfiy qiymat bo'lishi mumkin.
			return;
		}
		this.logger.log('Blockchain anchoring enabled (Sepolia)');
	}

	public isEnabled(): boolean {
		return this.contract !== null;
	}

	public toShipmentKey(shipmentId: unknown): string {
		return id(String(shipmentId));
	}

	public toBytes32(eventHash: string): string {
		return '0x' + eventHash;
	}

	public async anchor(shipmentId: unknown, eventHash: string): Promise<AnchorResult> {
		const contract = this.contract;
		if (!contract) return { status: 'DISABLED' };

		return await this.enqueue(async (): Promise<AnchorResult> => {
			const hash = this.toBytes32(eventHash);
			if (await contract.isAnchored(hash)) return { status: 'ALREADY_ANCHORED' };
			// Oldindan tekshirish — gaz sarflanmaydi.

			try {
				const tx = await contract.anchor(this.toShipmentKey(shipmentId), hash);
				await tx.wait(1, TX_WAIT_TIMEOUT_MS);
				// Kvitansiya kutiladi (navbat ichida) — keyingi tranzaksiya undan keyin yuboriladi.
				// Timeout — tushib qolgan tranzaksiya navbatni abadiy to'xtatmasligi uchun (keyin anchorPendingEvents).
				return { status: 'ANCHORED', txHash: tx.hash };
			} catch (err: any) {
				const reason = `${err?.reason ?? ''} ${err?.shortMessage ?? ''}`;
				if (reason.includes('Already anchored')) return { status: 'ALREADY_ANCHORED' };
				throw err;
			}
		});
	}

	public async isAnchored(eventHash: string): Promise<boolean | null> {
		// Faqat o'qish — navbatdan tashqarida. null: o'chirilgan yoki RPC xatosi.
		if (!this.contract) return null;
		try {
			return Boolean(await this.contract.isAnchored(this.toBytes32(eventHash)));
		} catch (err: any) {
			console.log('isAnchored failed:', err?.shortMessage ?? err?.code);
			return null;
		}
	}

	private enqueue<R>(task: () => Promise<R>): Promise<R> {
		const result = this.queue.then(task);
		this.queue = result.catch(() => undefined);
		// Bitta vazifa xatosi navbatni to'xtatmaydi.
		return result;
	}
}
