'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, Connection } from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { getRpcUrl, markRpcFailed, markRpcOk } from '@/lib/rpcPool';

const TOKEN_AMOUNT = 1;
const TOKEN_DECIMALS = 6;
const MAX_RETRIES = 3;

function isRpcError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes('403') || msg.includes('429') || msg.includes('forbidden') || msg.includes('rate');
  }
  return false;
}

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

      const userTokenAccount = getAssociatedTokenAddressSync(bagsMint, publicKey);
      const platformTokenAccount = getAssociatedTokenAddressSync(bagsMint, platformWallet);

      const amount = BigInt(TOKEN_AMOUNT * Math.pow(10, TOKEN_DECIMALS));

      const transferIx = createTransferInstruction(
        userTokenAccount,
        platformTokenAccount,
        publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID,
      );

      let lastError: unknown = null;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        // Use pool RPC for blockhash — try different endpoint on each retry
        const rpcUrl = getRpcUrl();
        const rpcConn = new Connection(rpcUrl, 'confirmed');

        try {
          const { blockhash, lastValidBlockHeight } = await rpcConn.getLatestBlockhash('confirmed');

          const transaction = new Transaction({
            feePayer: publicKey,
            blockhash,
            lastValidBlockHeight,
          });
          transaction.add(transferIx);

          // sendTransaction uses the wallet adapter's connection
          const signature = await sendTransaction(transaction, connection);

          await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
          }, 'confirmed');

          markRpcOk(rpcUrl);
          onPaymentComplete(signature);
          return;
        } catch (err: unknown) {
          lastError = err;
          if (isRpcError(err)) {
            markRpcFailed(rpcUrl);
            continue;
          }
          throw err;
        }
      }

      throw lastError;
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
