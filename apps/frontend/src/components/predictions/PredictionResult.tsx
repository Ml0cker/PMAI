'use client';

import { usePredictions } from '@/hooks/usePredictions';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';

interface PredictionResultProps {
  marketId: string;
}

export function PredictionResult({ marketId }: PredictionResultProps) {
  const { predictions, isLoading, error } = usePredictions({ marketId });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-accent-red">Failed to load predictions</p>;
  }

  if (predictions.length === 0) {
    return (
      <p className="text-sm text-text-tertiary text-center py-8">No predictions yet for this market.</p>
    );
  }

  return (
    <div className="space-y-4">
      {predictions.map((pred) => {
        const currentYes = parseFloat(pred.market.currentYesPrice) * 100;
        const aiYes = pred.prediction === 'YES' ? pred.confidence * 100 : (1 - pred.confidence) * 100;
        const diff = aiYes - currentYes;

        return (
          <div key={pred.id} className="rounded-lg border border-border bg-bg-tertiary p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Badge variant={pred.prediction === 'YES' ? 'green' : 'red'}>
                  {pred.prediction}
                </Badge>
                <span className="text-sm font-mono text-text-primary">
                  {(pred.confidence * 100).toFixed(1)}% confidence
                </span>
              </div>
              <span className="text-xs text-text-tertiary">{new Date(pred.createdAt).toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div className="rounded-md bg-bg-secondary p-2">
                <div className="text-xs text-text-tertiary mb-0.5">Market</div>
                <div className="text-sm font-mono text-text-primary">{currentYes.toFixed(1)}%</div>
              </div>
              <div className="rounded-md bg-bg-secondary p-2">
                <div className="text-xs text-text-tertiary mb-0.5">AI</div>
                <div className="text-sm font-mono text-accent-purple">{aiYes.toFixed(1)}%</div>
              </div>
              <div className="rounded-md bg-bg-secondary p-2">
                <div className="text-xs text-text-tertiary mb-0.5">Diff</div>
                <div className={`text-sm font-mono ${diff >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                  {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
                </div>
              </div>
            </div>

            {pred.reasoning && pred.reasoning.length > 0 && (
              <ul className="space-y-1">
                {pred.reasoning.map((reason, i) => (
                  <li key={i} className="text-xs text-text-secondary flex gap-2">
                    <span className="text-text-tertiary flex-shrink-0">{i + 1}.</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 text-xs text-text-tertiary">
              Model: {pred.modelVersion}
            </div>
          </div>
        );
      })}
    </div>
  );
}
