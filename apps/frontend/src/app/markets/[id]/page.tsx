'use client';

import { useParams } from 'next/navigation';
import { useMarket } from '@/hooks/useMarkets';
import { PredictionTrigger } from '@/components/predictions/PredictionTrigger';
import { PredictionResult } from '@/components/predictions/PredictionResult';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.id as string;
  const { market, isLoading, error, mutate } = useMarket(marketId);

  if (isLoading && !market) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-accent-red mb-2">Failed to load market.</p>
        {error && <p className="text-xs text-text-tertiary mb-4">{String(error?.message || error)}</p>}
        <button
          onClick={() => mutate()}
          className="rounded-lg bg-accent-red/10 border border-accent-red/30 px-4 py-2 text-sm font-medium text-accent-red transition-all hover:bg-accent-red/20"
        >
          Retry
        </button>
      </div>
    );
  }

  const m = market as {
    question: string;
    category?: string | null;
    eventDescription?: string | null;
    outcomes: string[];
    outcomePrices: string[];
    volume24hr?: number | null;
    volume?: number | null;
    liquidity?: number | null;
    active: boolean;
    closed: boolean;
  };

  const yesPrice = parseFloat(String(m.outcomePrices[0] || '0'));
  const noPrice = parseFloat(String(m.outcomePrices[1] || '0'));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-border bg-bg-secondary p-6">
          <div className="flex items-center gap-2 mb-2">
            {m.category && <Badge>{m.category}</Badge>}
            {m.active && !m.closed && <Badge variant="green">Active</Badge>}
          </div>
          <h1 className="text-xl font-bold">{m.question}</h1>

          {m.eventDescription && (
            <p className="mt-2 text-sm text-text-secondary">{m.eventDescription}</p>
          )}

          <div className="mt-4 flex gap-8">
            <div>
              <div className="text-3xl font-bold font-mono text-accent-green">{(yesPrice * 100).toFixed(1)}%</div>
              <div className="text-xs text-text-tertiary mt-1">YES</div>
            </div>
            <div>
              <div className="text-3xl font-bold font-mono text-accent-red">{(noPrice * 100).toFixed(1)}%</div>
              <div className="text-xs text-text-tertiary mt-1">NO</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-bg-tertiary p-3 text-center">
              <div className="text-xs text-text-tertiary">24h Volume</div>
              <div className="text-sm font-mono text-text-primary mt-1">
                {m.volume24hr ? `$${(m.volume24hr / 1_000_000).toFixed(2)}M` : '--'}
              </div>
            </div>
            <div className="rounded-lg bg-bg-tertiary p-3 text-center">
              <div className="text-xs text-text-tertiary">Total Volume</div>
              <div className="text-sm font-mono text-text-primary mt-1">
                {m.volume ? `$${(m.volume / 1_000_000).toFixed(2)}M` : '--'}
              </div>
            </div>
            <div className="rounded-lg bg-bg-tertiary p-3 text-center">
              <div className="text-xs text-text-tertiary">Liquidity</div>
              <div className="text-sm font-mono text-text-primary mt-1">
                {m.liquidity ? `$${(m.liquidity / 1_000_000).toFixed(2)}M` : '--'}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-bg-secondary p-6">
          <h2 className="text-lg font-semibold mb-4">AI Predictions</h2>
          <PredictionResult marketId={marketId} />
        </div>
      </div>

      <div className="space-y-4">
        <PredictionTrigger market={{ id: marketId, question: m.question, outcomePrices: m.outcomePrices as string[] }} />

        <div className="rounded-xl border border-border bg-bg-secondary p-4 text-center">
          <p className="text-xs text-text-tertiary">
            Powered by <span className="text-accent-purple font-medium">Bags.fm</span>
          </p>
        </div>
      </div>
    </div>
  );
}
