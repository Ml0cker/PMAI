'use client';

import { MarketCard } from './MarketCard';

interface Market {
  id: string;
  question: string;
  slug: string;
  outcomes: string[] | string;
  outcomePrices: string[] | string;
  volume24hr: number | null;
  volume?: number | null;
  liquidity?: number | null;
  category: string | null;
  imageUrl: string | null;
  latestPrediction: {
    id: string;
    prediction: string;
    confidence: number;
  } | null;
}

interface MarketFeedProps {
  markets: Market[];
  hasMore?: boolean;
}

export function MarketFeed({ markets }: MarketFeedProps) {
  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
        <span className="text-4xl mb-3">📊</span>
        <p>No markets found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {markets.map((market) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
}
