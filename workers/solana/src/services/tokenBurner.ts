import { Connection, PublicKey } from '@solana/web3.js';
import { createBurnInstruction, getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SOLANA } from '@pmai/shared';
import prisma from '@pmai/db';
import { logger } from '../lib/logger';

export class TokenBurner {
  private connection: Connection;
  private bagsMint: PublicKey;
  private platformWallet: PublicKey;

  constructor() {
    this.connection = new Connection(SOLANA.RPC_URL, SOLANA.CONFIRMATION_COMMITMENT);
    this.bucksMint = new PublicKey(SOLANA.BAGS_MINT_ADDRESS);
    this.platformWallet = new PublicKey(process.env.PLATFORM_WALLET_ADDRESS || '');
  }

  constructBurnInstruction(userWalletAddress: string, amount: bigint) {
    const userPublicKey = new PublicKey(userWalletAddress);

    const userTokenAccount = getAssociatedTokenAddressSync(
      this.bagsMint,
      userPublicKey,
      false,
      TOKEN_PROGRAM_ID
    );

    const burnIx = createBurnInstruction(
      userTokenAccount,
      this.bagsMint,
      userPublicKey,
      amount,
      [],
      TOKEN_PROGRAM_ID
    );

    return {
      instruction: burnIx,
      userTokenAccount: userTokenAccount.toBase58(),
      userPublicKey: userPublicKey.toBase58(),
    };
  }

  async verifyBurn(transactionSignature: string): Promise<boolean> {
    try {
      const tx = await this.connection.getTransaction(transactionSignature, {
        commitment: SOLANA.CONFIRMATION_COMMITMENT,
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || tx.meta?.err) {
        logger.warn({ transactionSignature }, 'Burn transaction failed or not found');
        return false;
      }

      const hasBurn = tx.transaction.message.staticAccountKeys.some(
        (key) => key.toBase58() === SOLANA.BAGS_MINT_ADDRESS
      );

      return hasBurn;
    } catch (err) {
      logger.error({ error: (err as Error).message, transactionSignature }, 'Failed to verify burn transaction');
      return false;
    }
  }

  async processBurn(params: {
    transactionSignature: string;
    userId: string;
    predictionRequestId: string;
  }) {
    const { transactionSignature, userId, predictionRequestId } = params;

    const verified = await this.verifyBurn(transactionSignature);

    await prisma.predictionRequest.update({
      where: { id: predictionRequestId },
      data: {
        burnStatus: verified ? 'burned' : 'burn_failed',
      },
    });

    await prisma.transactionLog.create({
      data: {
        userId,
        type: 'burn',
        transactionSignature,
        status: verified ? 'success' : 'failed',
      },
    });

    if (verified) {
      logger.info({ transactionSignature, predictionRequestId }, 'Token burn verified and recorded');
    } else {
      logger.warn({ transactionSignature, predictionRequestId }, 'Token burn verification failed');
    }

    return verified;
  }
}
