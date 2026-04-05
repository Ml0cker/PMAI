import type { PolymarketMarket } from '../types/index.js';
import { POLYMARKET } from '../constants/index.js';

export function shouldIncludeMarket(market: PolymarketMarket): boolean {
  return !POLYMARKET.EXCLUDED_TITLE_PATTERNS.some(pattern =>
    pattern.test(market.question)
  );
}

export function parseOutcomePrice(price: string): number {
  const val = parseFloat(price);
  if (isNaN(val)) return 0;
  return Math.max(0, Math.min(1, val));
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function exponentialBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = delay * (0.5 + Math.random() * 0.5);
  return Math.floor(jitter);
}

export function isValidPredictionOutput(data: unknown): data is {
  prediction: 'YES' | 'NO';
  confidence: number;
  reasoning: string[];
} {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    (obj.prediction === 'YES' || obj.prediction === 'NO') &&
    typeof obj.confidence === 'number' &&
    obj.confidence >= 0 &&
    obj.confidence <= 1 &&
    Array.isArray(obj.reasoning) &&
    obj.reasoning.every(r => typeof r === 'string')
  );
}
