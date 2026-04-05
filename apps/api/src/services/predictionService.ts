import prisma from '@pmai/db';
import { aiQueue, solanaQueue } from '../lib/queues';
import { logger } from '../lib/logger';
import { AppError, ErrorCode } from '@pmai/shared';

function parseJsonField<T>(val: unknown): T {
  if (Array.isArray(val)) return val as T;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return val as T; }
  }
  return val as T;
}

export class PredictionService {
  async triggerPrediction(params: {
    marketId: string;
    walletAddress: string;
    transactionSignature: string;
    tokenAmount: bigint;
  }) {
    const { marketId, walletAddress, transactionSignature, tokenAmount } = params;

    // 1. Validate market exists and is active
    const market = await prisma.market.findUnique({ where: { id: marketId } });
    if (!market || !market.active) {
      throw new AppError(ErrorCode.MARKET_NOT_ACTIVE, 'Market is not available for predictions', 400);
    }

    // 2. Idempotency: check if transaction signature already used
    const existingLog = await prisma.transactionLog.findUnique({
      where: { transactionSignature },
    });
    if (existingLog) {
      throw new AppError(ErrorCode.TRANSACTION_ALREADY_USED, 'Transaction already processed', 409);
    }

    // 3. Find or create wallet + user
    let wallet = await prisma.wallet.findFirst({
      where: { address: walletAddress },
    });

    let userId: string;
    if (!wallet) {
      const user = await prisma.user.create({ data: {} });
      wallet = await prisma.wallet.create({
        data: { userId: user.id, address: walletAddress },
      });
      userId = user.id;
    } else {
      userId = wallet.userId;
    }

    // 4. Enqueue solana verification job
    await solanaQueue.add(
      'verify_deposit',
      {
        type: 'verify_deposit',
        transactionSignature,
        userId,
        walletAddress,
        amount: Number(tokenAmount),
      },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
        jobId: `verify-${transactionSignature}`,
      }
    );

    // 5. Create prediction request in DB
    const request = await prisma.predictionRequest.create({
      data: {
        userId,
        marketId,
        tokenAmount: Number(tokenAmount),
        burnSignature: transactionSignature,
      },
    });

    logger.info(
      { requestId: request.id, marketId, txSig: transactionSignature },
      'Prediction request created, deposit verification queued'
    );

    return request;
  }

  async markDepositVerified(data: {
    transactionSignature: string;
    userId: string;
    requestId: string;
  }) {
    await prisma.predictionRequest.update({
      where: { id: data.requestId },
      data: { userId: data.userId, status: 'processing' },
    });

    const request = await prisma.predictionRequest.findUnique({
      where: { id: data.requestId },
      include: { market: true },
    });

    if (!request) throw new Error('Prediction request not found');

    // Enqueue AI prediction job
    await aiQueue.add(
      'generate_prediction',
      {
        type: 'generate_prediction',
        predictionRequestId: data.requestId,
        marketId: request.marketId,
        userId: data.userId,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        jobId: `predict-${data.requestId}`,
      }
    );

    logger.info({ requestId: data.requestId }, 'AI prediction job queued');
  }

  async listPredictions(params: {
    page: number;
    limit: number;
    userId?: string;
    marketId?: string;
  }) {
    const where: Record<string, unknown> = {};
    if (params.userId) where.userId = params.userId;
    if (params.marketId) where.marketId = params.marketId;

    const [predictions, total] = await Promise.all([
      prisma.prediction.findMany({
        where,
        include: {
          market: { select: { id: true, question: true, slug: true, outcomePrices: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      prisma.prediction.count({ where }),
    ]);

    return {
      predictions: predictions.map((p) => ({
        id: p.id,
        prediction: p.prediction,
        confidence: p.confidence,
        reasoning: parseJsonField<string[]>(p.reasoning),
        modelVersion: p.modelVersion,
        createdAt: p.createdAt.toISOString(),
        market: {
          id: p.market.id,
          question: p.market.question,
          slug: p.market.slug,
          currentYesPrice: parseJsonField<string[]>(p.market.outcomePrices)[0] || '0',
          currentNoPrice: parseJsonField<string[]>(p.market.outcomePrices)[1] || '0',
        },
      })),
      total,
      page: params.page,
      limit: params.limit,
    };
  }

  async getPrediction(id: string) {
    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: {
        market: { select: { question: true, slug: true, outcomes: true, outcomePrices: true } },
        user: { select: { id: true } },
      },
    });

    if (!prediction) return null;

    return {
      id: prediction.id,
      prediction: prediction.prediction,
      confidence: prediction.confidence,
      reasoning: parseJsonField<string[]>(prediction.reasoning),
      modelVersion: prediction.modelVersion,
      createdAt: prediction.createdAt.toISOString(),
      market: {
        question: prediction.market.question,
        slug: prediction.market.slug,
        outcomes: parseJsonField<string[]>(prediction.market.outcomes),
        currentYesPrice: parseJsonField<string[]>(prediction.market.outcomePrices)[0] || '0',
        currentNoPrice: parseJsonField<string[]>(prediction.market.outcomePrices)[1] || '0',
      },
    };
  }
}
