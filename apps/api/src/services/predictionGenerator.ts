import { AI, isValidPredictionOutput, ErrorCode, AppError } from '@pmai/shared';

interface MarketContext {
  marketId: string;
  question: string;
  outcomes: string[];
  outcomePrices: string[];
  description: string;
}

interface PredictionOutput {
  prediction: string;
  confidence: number;
  reasoning: string[];
  modelVersion: string;
}

function buildPrompt(ctx: MarketContext): string {
  const prices = ctx.outcomes.map((outcome, i) => {
    const price = parseFloat(ctx.outcomePrices[i] || '0');
    return `${outcome}: ${(price * 100).toFixed(1)}%`;
  }).join(', ');

  return `You are an expert prediction market analyst. Analyze the following Polymarket question and provide your prediction.

## Market Question
${ctx.question}

## Description
${ctx.description || 'No description available.'}

## Current Market Odds
${prices}

## Instructions
1. Analyze the market question and current odds.
2. Provide your prediction as either "YES" or "NO".
3. Assign a confidence score between 0.0 and 1.0.
4. Provide 2-5 concise reasoning points.

## Response Format
You MUST respond with ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "prediction": "YES" or "NO",
  "confidence": 0.0 to 1.0,
  "reasoning": ["reason 1", "reason 2", ...]
}`;
}

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 3000;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class PredictionGenerator {
  async generate(ctx: MarketContext): Promise<PredictionOutput> {
    const apiKey = process.env.OPENROUTER_API_KEY || '';
    console.log('[PredictionGenerator] OPENROUTER_API_KEY present:', !!apiKey, 'length:', apiKey.length);
    if (!apiKey) {
      throw new AppError(ErrorCode.AI_SERVICE_ERROR, 'OPENROUTER_API_KEY environment variable is required', 500);
    }

    const prompt = buildPrompt(ctx);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const waitMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[AI] Rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await delay(waitMs);
      }

      try {
        const result = await this.callOpenRouter(apiKey, prompt);
        return result;
      } catch (err) {
        lastError = err as Error;

        // Only retry on rate limit (429)
        if (err instanceof AppError && err.code === ErrorCode.RATE_LIMITED) {
          continue;
        }

        // Non-rate-limit errors should not be retried
        throw err;
      }
    }

    throw lastError || new AppError(ErrorCode.AI_SERVICE_ERROR, 'AI service unavailable after retries', 503);
  }

  private async callOpenRouter(apiKey: string, prompt: string): Promise<PredictionOutput> {
    console.log('[PredictionGenerator] Calling OpenRouter with key length:', apiKey.length);
    console.log('[PredictionGenerator] Key starts with:', apiKey.substring(0, 10));
    const response = await fetch(AI.OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://pmai.fun',
        'X-Title': 'pmai.fun AI Engine',
      },
      body: JSON.stringify({
        model: AI.MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: AI.MAX_TOKENS,
        temperature: AI.TEMPERATURE,
      }),
      signal: AbortSignal.timeout(AI.REQUEST_TIMEOUT_MS),
    });

    if (response.status === 429) {
      throw new AppError(
        ErrorCode.RATE_LIMITED,
        'AI model is temporarily rate-limited. Please try again in a moment.',
        429
      );
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new AppError(
        ErrorCode.AI_SERVICE_ERROR,
        `OpenRouter API returned ${response.status}: ${errorBody.substring(0, 200)}`,
        502
      );
    }

    const data: any = await response.json();
    if (!data.choices?.length) {
      throw new AppError(ErrorCode.AI_SERVICE_ERROR, 'OpenRouter returned no choices', 502);
    }

    const rawResponse = data.choices[0].message.content;

    let parsed: any;
    try {
      const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new AppError(
        ErrorCode.AI_RESPONSE_INVALID,
        `AI returned invalid JSON: ${rawResponse.substring(0, 200)}`,
        502
      );
    }

    if (!isValidPredictionOutput(parsed)) {
      throw new AppError(
        ErrorCode.AI_RESPONSE_INVALID,
        'AI response does not match expected prediction schema',
        502
      );
    }

    return {
      prediction: parsed.prediction,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      modelVersion: AI.MODEL,
    };
  }
}
