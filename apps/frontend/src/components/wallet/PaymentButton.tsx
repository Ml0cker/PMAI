'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { getRpcUrl, markRpcFailed, markRpcOk } from '@/lib/rpcPool';

const TOKEN_AMOUNT = 1;

interface PaymentButtonProps {
  marketId: string;
  onPaymentComplete: (transactionSignature: string) => void;
  disabled?: boolean;
}

async function waitForConfirmation(conn: Connection, signature: string, timeoutMs = 45000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const status = await conn.getSignatureStatus(signature);
      if (status?.value) {
        if (status.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
        }
        if (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized') {
          return;
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Transaction failed')) throw err;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error('Transaction confirmation timed out');
}

export function PaymentButton({ onPaymentComplete, disabled }: PaymentButtonProps) {
  const { connected, publicKey, sendTransaction } = useWallet();
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

      const userTokenAccount = getAssociatedTokenAddressSync(bagsMint, publicKey);
      const platformTokenAccount = getAssociatedTokenAddressSync(bagsMint, platformWallet);

      // Build transaction — don't set blockhash, sendTransaction will get a fresh one
      const transaction = new Transaction();

      // Check if platform token account exists, create if not
      const rpcUrl = getRpcUrl();
      const conn = new Connection(rpcUrl, 'confirmed');

      try {
        await getAccount(conn, platformTokenAccount);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            platformTokenAccount,
            platformWallet,
            bagsMint,
          ),
        );
      }

      // Fetch mint decimals
      const mintInfo = await conn.getParsedAccountInfo(bagsMint);
      const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals ?? 9;
      const amount = BigInt(TOKEN_AMOUNT) * BigInt(10 ** decimals);

      transaction.add(
        createTransferInstruction(
          userTokenAccount,
          platformTokenAccount,
          publicKey,
          amount,
          [],
          TOKEN_PROGRAM_ID,
        ),
      );

      transaction.feePayer = publicKey;

      // sendTransaction gets fresh blockhash right before sending
      const signature = await sendTransaction(transaction, conn, { skipPreflight: true });

      // Wait for confirmation by polling signature status
      await waitForConfirmation(conn, signature);

      markRpcOk(rpcUrl);
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
