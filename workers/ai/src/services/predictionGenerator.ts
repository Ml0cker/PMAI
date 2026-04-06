import prisma from '@pmai/db';
import { OpenRouterClient } from './openRouterClient';
import { buildPredictionPrompt } from './promptBuilder';
import { isValidPredictionOutput, AI, AppError, ErrorCode } from '@pmai/shared';
import { logger } from '../lib/logger';
import { Redis } from 'ioredis';

export class PredictionGenerator {
  private client: OpenRouterClient;

  constructor() {
    this.client = new OpenRouterClient();
  }

  async generate(requestId: string, marketId: string, userId: string) {
    logger.info({ requestId, marketId }, 'Generating prediction');

    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: {
        event: true,
        snapshots: {
          orderBy: { recordedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!market) {
      throw new AppError(ErrorCode.MARKET_NOT_FOUND, `Market ${marketId} not found`);
    }

    const priceHistory = market.snapshots.map((s) => ({
      price: parseFloat(String((s.outcomePrices as string[])[0] || '0')),
      recordedAt: s.recordedAt.toISOString(),
    }));

    const context = {
      question: market.question,
      description: market.event?.description || undefined,
      category: market.event?.category || undefined,
      currentOdds: (market.outcomes as string[]).map((outcome, i) => ({
        outcome,
        price: parseFloat(String((market.outcomePrices as string[])[i] || '0')),
      })),
      priceHistory,
    };

    const prompt = buildPredictionPrompt(context);

    const rawResponse = await this.client.chatCompletion([{ role: 'user', content: prompt }]);

    let parsed: unknown;
    try {
      const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new AppError(
        ErrorCode.AI_RESPONSE_INVALID,
        `AI returned invalid JSON: ${rawResponse.substring(0, 200)}`
      );
    }

    if (!isValidPredictionOutput(parsed)) {
      throw new AppError(ErrorCode.AI_RESPONSE_INVALID, 'AI response does not match expected prediction schema');
    }

    const validParsed = parsed as any;

    const prediction = await prisma.prediction.create({
      data: {
        requestId,
        userId,
        marketId,
        prediction: validParsed.prediction,
        confidence: validParsed.confidence,
        reasoning: validParsed.reasoning,
        modelVersion: AI.MODEL,
      },
    });

    await prisma.predictionRequest.update({
      where: { id: requestId },
      data: { status: 'completed' },
    });

    // Queue token burn job
    const request = await prisma.predictionRequest.findUnique({
      where: { id: requestId },
    });

    if (request?.burnSignature) {
      try {
        const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
        const { Queue } = await import('bullmq');
        const solanaQueue = new Queue('solana', { connection: redis });

        await solanaQueue.add(
          'burn_tokens',
          {
            type: 'burn_tokens',
            transactionSignature: request.burnSignature,
            userId,
            predictionRequestId: requestId,
          },
          {
            attempts: 5,
            backoff: { type: 'exponential', delay: 5000 },
            jobId: `burn-${requestId}`,
          }
        );

        await redis.quit();
      } catch (err) {
        logger.warn({ error: (err as Error).message }, 'Failed to queue burn job');
      }
    }

    logger.info(
      { requestId, predictionId: prediction.id, prediction: prediction.prediction, confidence: prediction.confidence },
      'Prediction generated and stored'
    );

    return prediction;
  }
}
