'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const TOKEN_AMOUNT = 1;
const TOKEN_DECIMALS = 6;

interface PaymentButtonProps {
  marketId: string;
  onPaymentComplete: (transactionSignature: string) => void;
  disabled?: boolean;
}

export function PaymentButton({ onPaymentComplete, disabled }: PaymentButtonProps) {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!publicKey || !connected) return;

    setIsPaying(true);
    setError(null);

    try {
      const bagsMintStr = process.env.NEXT_PUBLIC_BAGS_MINT;
      const platformWalletStr = process.env.NEXT_PUBLIC_PLATFORM_WALLET;

      if (!bagsMintStr || !platformWalletStr) {
        throw new Error('Payment not configured. Missing token addresses.');
      }

      const bagsMint = new PublicKey(bagsMintStr);
      const platformWallet = new PublicKey(platformWalletStr);

      // Try both Token and Token-2022 program IDs
      let userTokenAccount: PublicKey | undefined;
      let platformTokenAccount: PublicKey | undefined;
      let tokenProgram = TOKEN_PROGRAM_ID;

      for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
        try {
          const userAta = getAssociatedTokenAddressSync(bagsMint, publicKey, false, programId);
          const platformAta = getAssociatedTokenAddressSync(bagsMint, platformWallet, false, programId);
          // Verify user token account exists
          await connection.getTokenAccountBalance(userAta);
          userTokenAccount = userAta;
          platformTokenAccount = platformAta;
          tokenProgram = programId;
          break;
        } catch {
          continue;
        }
      }

      if (!userTokenAccount || !platformTokenAccount) {
        throw new Error('BAGS token account not found. Make sure you have BAGS tokens.');
      }

      const amount = TOKEN_AMOUNT * Math.pow(10, TOKEN_DECIMALS);

      const transferIx = createTransferInstruction(
        userTokenAccount,
        platformTokenAccount,
        publicKey,
        amount,
        [],
        tokenProgram,
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      const transaction = new Transaction({
        feePayer: publicKey,
        blockhash,
        lastValidBlockHeight,
      });
      transaction.add(transferIx);

      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      }, 'confirmed');

      onPaymentComplete(signature);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="green"
        size="lg"
        className="w-full"
        onClick={handlePayment}
        disabled={disabled || isPaying || !connected}
      >
        {isPaying ? (
          <span className="flex items-center gap-2">
            <Spinner className="h-4 w-4" />
            Processing...
          </span>
        ) : (
          <>Pay 1 BAGS</>
        )}
      </Button>

      {error && <p className="text-xs text-accent-red text-center">{error}</p>}
    </div>
  );
}
