interface MarketContext {
  question: string;
  description?: string;
  category?: string;
  currentOdds: { outcome: string; price: number }[];
  priceHistory: { price: number; recordedAt: string }[];
}

export function buildPredictionPrompt(context: MarketContext): string {
  const priceHistorySummary =
    context.priceHistory.length > 0
      ? context.priceHistory
          .slice(-10)
          .map((p) => `  ${p.recordedAt}: ${p.price.toFixed(4)}`)
          .join('\n')
      : 'No price history available.';

  const oddsSummary = context.currentOdds
    .map((o) => `${o.outcome}: ${(o.price * 100).toFixed(1)}%`)
    .join(', ');

  return `You are an expert prediction market analyst. Analyze the following Polymarket question and provide your prediction.

## Market Question
${context.question}

## Category
${context.category || 'Uncategorized'}

## Description
${context.description || 'No description available.'}

## Current Market Odds
${oddsSummary}

## Recent Price History (last 10 snapshots)
${priceHistorySummary}

## Instructions
1. Analyze the market question, current odds, and any relevant context.
2. Consider whether the market odds are accurate or if there is an edge.
3. Provide your prediction as either "YES" or "NO".
4. Assign a confidence score between 0.0 and 1.0.
5. Provide 2-5 concise reasoning points.

## Response Format
You MUST respond with ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "prediction": "YES" or "NO",
  "confidence": 0.0 to 1.0,
  "reasoning": ["reason 1", "reason 2", ...]
}`;
}
