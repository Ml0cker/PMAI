import Link from 'next/link';

function safeParsePrices(prices: string[] | string): [number, number] {
  let arr: string[];
  if (Array.isArray(prices)) {
    arr = prices;
  } else if (typeof prices === 'string') {
    try { arr = JSON.parse(prices); } catch { arr = ['0', '0']; }
  } else {
    arr = ['0', '0'];
  }
  const yes = parseFloat(arr[0] || '0');
  const no = parseFloat(arr[1] || '0');
  return [isNaN(yes) ? 0 : yes, isNaN(no) ? 0 : no];
}

function formatValue(val: number | null | undefined): string {
  if (val == null || isNaN(val)) return '--';
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(2)}`;
}

interface MarketCardProps {
  market: {
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
  };
}

export function MarketCard({ market }: MarketCardProps) {
  const [yesPrice, noPrice] = safeParsePrices(market.outcomePrices);

  return (
    <Link href={`/markets/${market.id}`}>
      <div className="group rounded-xl border border-border bg-bg-secondary p-4 transition-all hover:border-border-active hover:bg-bg-tertiary hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
        <div className="flex items-start gap-3">
          {market.imageUrl ? (
            <img
              src={market.imageUrl}
              alt=""
              className="h-10 w-10 flex-shrink-0 rounded-lg object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-bg-tertiary flex items-center justify-center text-lg">
              {market.category === 'politics' && '🏛️'}
              {market.category === 'crypto' && '₿'}
              {market.category === 'sports' && '⚽'}
              {market.category === 'science' && '🔬'}
              {market.category === 'entertainment' && '🎬'}
              {!['politics', 'crypto', 'sports', 'science', 'entertainment'].includes(market.category || '') && '📊'}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-text-primary group-hover:text-accent-green transition-colors">
              {market.question}
            </h3>

            {market.category && (
              <span className="mt-1 inline-block rounded-full bg-bg-tertiary px-2 py-0.5 text-xs text-text-tertiary">
                {market.category}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-xs">
              <span className="text-accent-green font-medium">YES</span>
              <span className="font-mono text-text-primary">{(yesPrice * 100).toFixed(1)}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-bg-primary overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-green transition-all duration-500"
                style={{ width: `${yesPrice * 100}%` }}
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs">
              <span className="text-accent-red font-medium">NO</span>
              <span className="font-mono text-text-primary">{(noPrice * 100).toFixed(1)}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-bg-primary overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-red transition-all duration-500"
                style={{ width: `${noPrice * 100}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-3 text-xs text-text-tertiary font-mono">
            <span>Vol: {formatValue(market.volume24hr)}</span>
            {market.liquidity != null && <span>Liq: {formatValue(market.liquidity)}</span>}
          </div>
          {market.latestPrediction && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                market.latestPrediction.prediction === 'YES'
                  ? 'bg-accent-green/10 text-accent-green'
                  : 'bg-accent-red/10 text-accent-red'
              }`}
            >
              AI: {market.latestPrediction.prediction} ({(market.latestPrediction.confidence * 100).toFixed(0)}%)
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
