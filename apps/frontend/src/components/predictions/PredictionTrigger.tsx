'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';
import { PaymentButton } from '@/components/wallet/PaymentButton';
import { useWallet } from '@solana/wallet-adapter-react';

interface Market {
  id: string;
  question: string;
  outcomePrices: string[];
}

interface PredictionTriggerProps {
  market: Market;
}

const TOKEN_COST = 1; // 1 BAGS token per prediction

export function PredictionTrigger({ market }: PredictionTriggerProps) {
  const { connected, publicKey } = useWallet();
  const [status, setStatus] = useState<'idle' | 'paying' | 'pending' | 'completed' | 'error'>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<{ prediction: string; confidence: number; reasoning: string[] } | null>(null);

  const handlePaymentComplete = async (transactionSignature: string) => {
    setStatus('pending');
    setErrorMsg(null);
    setPrediction(null);

    try {
      const response = await apiClient.post<{
        id: string;
        status: string;
        message: string;
      }>('/predictions/trigger', {
        marketId: market.id,
        walletAddress: publicKey?.toBase58(),
        transactionSignature,
        tokenAmount: TOKEN_COST.toString(),
      });

      setRequestId(response.id);

      // Poll for prediction result
      const pollInterval = setInterval(async () => {
        try {
          const predictionData = await apiClient.get<{
            id: string;
            status: string;
            prediction?: { prediction: string; confidence: number; reasoning: string[] };
          }>(`/predictions/request/${response.id}`);

          if (predictionData.status === 'completed' && predictionData.prediction) {
            clearInterval(pollInterval);
            setPrediction(predictionData.prediction);
            setStatus('completed');
          } else if (predictionData.status === 'failed') {
            clearInterval(pollInterval);
            setStatus('error');
            setErrorMsg('Prediction generation failed');
          }
        } catch (err) {
          clearInterval(pollInterval);
          setStatus('error');
          setErrorMsg('Failed to fetch prediction result');
        }
      }, 3000);

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (status === 'pending') {
          setStatus('error');
          setErrorMsg('Prediction timed out');
        }
      }, 120000);

    } catch (err: unknown) {
      const error = err as { status?: number; code?: string; message?: string };
      setStatus('error');
      setErrorMsg(error?.message || 'Prediction request failed');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-6">
      <h2 className="text-lg font-semibold mb-2">Get AI Prediction</h2>
      <p className="text-sm text-text-secondary mb-4">
        Pay {TOKEN_COST} BAGS token to receive an AI-powered market prediction.
      </p>

      {status === 'idle' || status === 'error' ? (
        <div className="space-y-3">
          {connected ? (
            <PaymentButton
              marketId={market.id}
              onPaymentComplete={handlePaymentComplete}
              disabled={status === 'paying'}
            />
          ) : (
            <div className="rounded-lg border border-accent-yellow/30 bg-bg-tertiary p-4 text-center">
              <p className="text-sm text-text-secondary">Connect your wallet to get predictions</p>
            </div>
          )}
          {errorMsg && <p className="text-xs text-accent-red text-center">{errorMsg}</p>}
        </div>
      ) : status === 'pending' ? (
        <div className="rounded-lg border border-accent-yellow/30 bg-bg-tertiary p-4 text-center">
          <Spinner />
          <p className="mt-2 text-sm text-text-secondary">Generating prediction...</p>
          <p className="text-xs text-text-tertiary mt-1">This usually takes 10-30 seconds</p>
        </div>
      ) : status === 'completed' && prediction ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-accent-green/30 bg-bg-tertiary p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-accent-green">
                AI says: {prediction.prediction}
              </span>
              <span className="text-xs font-mono text-text-secondary">
                {(prediction.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
            <ul className="space-y-1">
              {prediction.reasoning.map((r, i) => (
                <li key={i} className="text-xs text-text-secondary flex gap-1.5">
                  <span className="text-text-tertiary">{i + 1}.</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => { setStatus('idle'); setPrediction(null); setRequestId(null); }}
            className="w-full rounded-lg bg-bg-tertiary border border-border px-4 py-2 text-xs font-medium text-text-secondary transition-all hover:bg-bg-secondary hover:text-text-primary"
          >
            Generate Another
          </button>
        </div>
      ) : null}
    </div>
  );
}
