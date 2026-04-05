'use client';

import { useMarkets } from '@/hooks/useMarkets';
import { MarketFeed } from '@/components/markets/MarketFeed';
import { MarketFilters } from '@/components/markets/MarketFilters';
import { Spinner } from '@/components/ui/Spinner';
import { useState } from 'react';

export default function HomePage() {
  const [category, setCategory] = useState<string | undefined>();
  const [sort, setSort] = useState('volume24hr');

  const { markets, isLoading, isLoadingMore, hasMore, error, sentinelRef, mutate } = useMarkets({ category, sort });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-bg-secondary p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">
            <span className="text-accent-green">AI</span> Prediction Markets
          </h1>
          <span className="inline-block h-2 w-2 rounded-full bg-accent-green animate-pulse-green" />
        </div>
        <p className="mt-1 text-sm text-text-secondary">
          Real-time Polymarket analysis powered by AI. Pay with Bags (via Bags.fm) to unlock predictions.
        </p>
      </div>

      <MarketFilters
        selectedCategory={category}
        onCategoryChange={setCategory}
        selectedSort={sort}
        onSortChange={setSort}
      />

      {isLoading && !markets.length ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : markets.length > 0 ? (
        <>
          <MarketFeed markets={markets} />
          <div ref={sentinelRef} className="flex justify-center py-8">
            {isLoadingMore && <Spinner className="h-6 w-6" />}
            {!hasMore && markets.length > 0 && (
              <span className="text-xs text-text-tertiary">
                {markets.length} markets loaded
              </span>
            )}
          </div>
        </>
      ) : error ? (
        <div className="rounded-lg border border-accent-red/30 bg-bg-secondary p-6 text-center">
          <p className="text-accent-red">Failed to load markets.</p>
          <button
            onClick={() => mutate()}
            className="mt-3 rounded-lg bg-accent-red/10 border border-accent-red/30 px-4 py-2 text-sm font-medium text-accent-red transition-all hover:bg-accent-red/20"
          >
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
