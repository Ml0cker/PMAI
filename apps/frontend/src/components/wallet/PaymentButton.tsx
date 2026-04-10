'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const BAGS_MINT_FALLBACK = '';
const CONFIRMATION_COMMITMENT = 'confirmed' as const;

interface PaymentButtonProps {
  marketId: string;
  onPaymentComplete: (transactionSignature: string) => void;
  disabled?: boolean;
}

export function PaymentButton({ marketId, onPaymentComplete, disabled }: PaymentButtonProps) {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!publicKey || !connected) return;

    setIsPaying(true);
    setError(null);

    try {
      // In production, this would use Bags.fm SDK to create swap + burn transaction.
      // For now, construct a token transfer as placeholder.
      const bagsMintStr = process.env.NEXT_PUBLIC_BAGS_MINT || BAGS_MINT_FALLBACK;
      const platformWalletStr = process.env.NEXT_PUBLIC_PLATFORM_WALLET || '';

      // If mint or platform wallet not configured — simulate payment for demo
      if (!bagsMintStr || !platformWalletStr) {
        const fakeSignature = `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        onPaymentComplete(fakeSignature);
        setIsPaying(false);
        return;
      }

      const bagsMint = new PublicKey(bagsMintStr);
      const platformWallet = new PublicKey(platformWalletStr);

      if (bagsMint.toBase58() === '11111111111111111111111111111111') {
        // No mint configured - simulate payment for demo
        const fakeSignature = `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        onPaymentComplete(fakeSignature);
        setIsPaying(false);
        return;
      }

      const userTokenAccount = await getAssociatedTokenAddressSync(bagsMint, publicKey, false, TOKEN_PROGRAM_ID);

      // Check if user has token account
      try {
        await getAccount(connection, userTokenAccount);
      } catch {
        setError('Token account not found. Please get Bags tokens first.');
        setIsPaying(false);
        return;
      }

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: platformWallet,
          lamports: LAMPORTS_PER_SOL * 0.01, // Minimal SOL for demo
        })
      );

      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(signature, 'confirmed');

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
          <>Pay with Bags (via Bags.fm)</>
        )}
      </Button>

      {error && <p className="text-xs text-accent-red text-center">{error}</p>}
    </div>
  );
}
