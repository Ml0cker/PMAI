import { Router, Request, Response, NextFunction } from 'express';
import { PredictionService } from '../services/predictionService.js';
import { AppError, ErrorCode } from '@pmai/shared';
import { PredictionGenerator } from '../services/predictionGenerator.js';
import prisma from '@pmai/db';

const router = Router();
const predictionService = new PredictionService();

router.post('/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { marketId, walletAddress, transactionSignature, tokenAmount } = req.body;

    if (!marketId || !walletAddress || !transactionSignature || !tokenAmount) {
      throw new AppError(
        ErrorCode.INVALID_TRANSACTION,
        'Missing required fields: marketId, walletAddress, transactionSignature, tokenAmount',
        400
      );
    }

    const predictionRequest = await predictionService.triggerPrediction({
      marketId,
      walletAddress,
      transactionSignature,
      tokenAmount: BigInt(tokenAmount),
    });

    res.status(202).json({
      id: predictionRequest.id,
      status: predictionRequest.status,
      message: 'Prediction request submitted. Processing will begin shortly.',
    });
  } catch (err) {
    next(err);
  }
});

// Demo prediction trigger — bypasses payment, calls AI directly
router.post('/demo-trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { marketId } = req.body;
    if (!marketId) {
      throw new AppError(ErrorCode.INVALID_TRANSACTION, 'Missing required field: marketId', 400);
    }

    const market = await prisma.market.findUnique({
      where: { id: marketId },
      include: { event: true },
    });
    if (!market || !market.active) {
      throw new AppError(ErrorCode.MARKET_NOT_ACTIVE, 'Market not found or inactive', 404);
    }

    // Create or find demo user
    let user = await prisma.user.findFirst({ where: { id: 'demo-user' } });
    if (!user) {
      user = await prisma.user.create({ data: { id: 'demo-user' } });
    }

    // Create prediction request
    const request = await prisma.predictionRequest.create({
      data: {
        userId: user.id,
        marketId,
        tokenAmount: 0,
        burnSignature: 'demo',
        status: 'processing',
      },
    });

    // Generate prediction directly (no queue)
    const generator = new PredictionGenerator();
    const outcomes: string[] = Array.isArray(market.outcomes) ? market.outcomes as string[] : JSON.parse(market.outcomes as string || '["Yes","No"]');
    const outcomePrices: string[] = Array.isArray(market.outcomePrices) ? market.outcomePrices as string[] : JSON.parse(market.outcomePrices as string || '["0.5","0.5"]');
    const prediction = await generator.generate({
      marketId: market.id,
      question: market.question,
      outcomes,
      outcomePrices,
      description: market.event?.description || '',
    });

    // Store immutable prediction
    await prisma.prediction.create({
      data: {
        requestId: request.id,
        userId: user.id,
        marketId,
        prediction: prediction.prediction,
        confidence: prediction.confidence,
        reasoning: prediction.reasoning as unknown as object,
        modelVersion: prediction.modelVersion,
      },
    });

    await prisma.predictionRequest.update({
      where: { id: request.id },
      data: { status: 'completed' },
    });

    res.status(200).json({
      id: request.id,
      status: 'completed',
      prediction,
      message: 'Demo prediction generated successfully',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const userId = req.query.userId as string | undefined;
    const marketId = req.query.marketId as string | undefined;

    const result = await predictionService.listPredictions({ page, limit, userId, marketId });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prediction = await predictionService.getPrediction(req.params.id as string);
    if (!prediction) {
      throw new AppError(ErrorCode.PREDICTION_NOT_FOUND, 'Prediction not found', 404);
    }
    res.json(prediction);
  } catch (err) {
    next(err);
  }
});

router.get('/request/:requestId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await predictionService.getPredictionByRequestId(req.params.requestId as string);
    if (!result) {
      throw new AppError(ErrorCode.PREDICTION_NOT_FOUND, 'Prediction request not found', 404);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export { router as predictionsRouter };
