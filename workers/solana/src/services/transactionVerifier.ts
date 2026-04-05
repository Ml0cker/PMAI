import { Connection, PublicKey } from '@solana/web3.js';
import { SOLANA } from '@pmai/shared';
import prisma from '@pmai/db';
import { logger } from '../lib/logger';
import { AppError, ErrorCode } from '@pmai/shared';

export class TransactionVerifier {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(SOLANA.RPC_URL, SOLANA.CONFIRMATION_COMMITMENT);
  }

  async verifyDeposit(params: {
    transactionSignature: string;
    walletAddress: string;
    expectedAmount: number;
  }): Promise<{ verified: boolean; userId: string; walletId: string }> {
    const { transactionSignature, walletAddress, expectedAmount } = params;

    let tx;
    try {
      tx = await this.connection.getTransaction(transactionSignature, {
        commitment: SOLANA.CONFIRMATION_COMMITMENT,
        maxSupportedTransactionVersion: 0,
      });
    } catch {
      throw new AppError(ErrorCode.TRANSACTION_NOT_FOUND, `Transaction not found: ${transactionSignature}`);
    }

    if (!tx || !tx.meta) {
      throw new AppError(ErrorCode.TRANSACTION_NOT_FOUND, 'Transaction has no metadata');
    }

    if (tx.meta.err) {
      throw new AppError(ErrorCode.INVALID_TRANSACTION, 'Transaction failed on-chain');
    }

    const senderPubkey = tx.transaction.message.staticAccountKeys[0]?.toBase58();
    if (senderPubkey !== walletAddress) {
      throw new AppError(
        ErrorCode.INVALID_TRANSACTION,
        `Transaction sender ${senderPubkey} does not match wallet ${walletAddress}`
      );
    }

    let wallet = await prisma.wallet.findFirst({ where: { address: walletAddress } });

    if (!wallet) {
      const user = await prisma.user.create({ data: {} });
      wallet = await prisma.wallet.create({
        data: { userId: user.id, address: walletAddress },
      });
      logger.info({ walletId: wallet.id, address: walletAddress }, 'New wallet registered');
    }

    await prisma.tokenDeposit.upsert({
      where: { transactionSignature },
      create: {
        userId: wallet.userId,
        walletId: wallet.id,
        transactionSignature,
        amount: expectedAmount,
        status: 'verified',
        verifiedAt: new Date(),
      },
      update: {
        status: 'verified',
        verifiedAt: new Date(),
      },
    });

    await prisma.transactionLog.create({
      data: {
        userId: wallet.userId,
        walletId: wallet.id,
        type: 'deposit',
        transactionSignature,
        amount: expectedAmount,
        status: 'success',
      },
    });

    logger.info({ transactionSignature, walletAddress, amount: expectedAmount }, 'Token deposit verified');

    return { verified: true, userId: wallet.userId, walletId: wallet.id };
  }
}
