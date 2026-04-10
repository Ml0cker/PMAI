'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface PaymentButtonProps {
  marketId: string;
  onPaymentComplete: (transactionSignature: string) => void;
  disabled?: boolean;
}

export function PaymentButton({ onPaymentComplete, disabled }: PaymentButtonProps) {
  const { connected, publicKey } = useWallet();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    if (!publicKey || !connected) return;

    setIsPaying(true);
    setError(null);

    try {
      // TODO: Replace with real Bags.fm SDK payment when integrated.
      // For now simulate payment — 1.5s delay to mimic transaction.
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const fakeSignature = `demo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      onPaymentComplete(fakeSignature);
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
