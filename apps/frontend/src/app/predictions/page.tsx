'use client';

import { usePredictions } from '@/hooks/usePredictions';
import { PredictionCard } from '@/components/predictions/PredictionCard';
import { Spinner } from '@/components/ui/Spinner';

export default function PredictionsPage() {
  const { predictions, isLoading, error, mutate } = usePredictions({ limit: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          <span className="text-accent-purple">AI</span> Predictions
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          All AI-generated predictions with confidence scores and market odds comparison.
        </p>
      </div>

      {isLoading && !predictions.length ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : predictions.length > 0 ? (
        <div className="space-y-3">
          {predictions.map((pred) => (
            <PredictionCard key={pred.id} prediction={pred} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-accent-red/30 bg-bg-secondary p-6 text-center">
          <p className="text-accent-red">Failed to load predictions.</p>
          <p className="mt-2 text-xs text-text-tertiary break-all">{String(error?.message || error)}</p>
          <button
            onClick={() => mutate()}
            className="mt-3 rounded-lg bg-accent-red/10 border border-accent-red/30 px-4 py-2 text-sm font-medium text-accent-red transition-all hover:bg-accent-red/20"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-text-tertiary">
          <span className="text-4xl mb-3">🤖</span>
          <p>No predictions yet. Be the first to get an AI prediction!</p>
        </div>
      )}
    </div>
  );
}
