import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

interface PredictionCardProps {
  prediction: {
    id: string;
    prediction: string;
    confidence: number;
    reasoning: string[];
    modelVersion: string;
    createdAt: string;
    market: {
      id: string;
      question: string;
      slug: string;
      currentYesPrice: string;
      currentNoPrice: string;
    };
  };
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const currentYes = parseFloat(prediction.market.currentYesPrice) * 100;
  const aiYes = prediction.prediction === 'YES' ? prediction.confidence * 100 : (1 - prediction.confidence) * 100;
  const diff = aiYes - currentYes;

  return (
    <Link href={`/markets/${prediction.market.id}`}>
      <div className="rounded-xl border border-border bg-bg-secondary p-4 transition-all hover:border-border-active hover:bg-bg-tertiary">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary truncate">{prediction.market.question}</p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={prediction.prediction === 'YES' ? 'green' : 'red'}>
                {prediction.prediction}
              </Badge>
              <span className="text-xs font-mono text-text-secondary">
                {(prediction.confidence * 100).toFixed(1)}% confidence
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary">Market:</span>
            <span className="font-mono text-text-primary">{currentYes.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary">AI:</span>
            <span className="font-mono text-accent-purple">{aiYes.toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-tertiary">Edge:</span>
            <span className={`font-mono font-medium ${diff >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
              {diff >= 0 ? '+' : ''}{diff.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-text-tertiary">
          <span>{new Date(prediction.createdAt).toLocaleString()}</span>
          <span>{prediction.modelVersion}</span>
        </div>
      </div>
    </Link>
  );
}
