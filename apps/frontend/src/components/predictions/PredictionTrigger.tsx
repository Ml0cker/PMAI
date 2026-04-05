'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { Spinner } from '@/components/ui/Spinner';

interface Market {
  id: string;
  question: string;
  outcomePrices: string[];
}

interface PredictionTriggerProps {
  market: Market;
}

export function PredictionTrigger({ market }: PredictionTriggerProps) {
  const [status, setStatus] = useState<'idle' | 'paying' | 'pending' | 'completed' | 'error'>('idle');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<{ prediction: string; confidence: number; reasoning: string[] } | null>(null);

  const handleDemoPrediction = async () => {
    setStatus('pending');
    setErrorMsg(null);
    setPrediction(null);

    try {
      const response = await apiClient.post<{
        id: string;
        status: string;
        prediction: { prediction: string; confidence: number; reasoning: string[] };
        message: string;
      }>('/predictions/demo-trigger', {
        marketId: market.id,
      });

      setRequestId(response.id);
      setPrediction(response.prediction);
      setStatus('completed');
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
        Pay with Bags (via Bags.fm) to receive an AI-powered market prediction.
      </p>

      {status === 'idle' || status === 'error' ? (
        <div className="space-y-3">
          <button
            onClick={handleDemoPrediction}
            className="w-full rounded-lg bg-accent-green/10 border border-accent-green/30 px-4 py-2.5 text-sm font-medium text-accent-green transition-all hover:bg-accent-green/20 hover:border-accent-green/50"
          >
            Generate AI Prediction (Demo)
          </button>
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
