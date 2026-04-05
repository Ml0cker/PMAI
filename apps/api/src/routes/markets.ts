import { Router, Request, Response, NextFunction } from 'express';
import { MarketService } from '../services/marketService';
import { AppError, ErrorCode } from '@pmai/shared';
import prisma from '@pmai/db';

const router = Router();
const marketService = new MarketService();

router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.event.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    const labels = categories
      .map(c => c.category)
      .filter((c): c is string => c !== null);
    res.json({ categories: labels });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const category = req.query.category as string | undefined;
    const sort = (req.query.sort as string) || 'volume24hr';
    const order = (req.query.order as string) === 'asc' ? 'asc' : 'desc';

    const result = await marketService.listMarkets({ page, limit, category, sort, order });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const market = await marketService.getMarket(req.params.id as string);
    if (!market) {
      throw new AppError(ErrorCode.MARKET_NOT_FOUND, 'Market not found', 404);
    }
    res.json(market);
  } catch (err) {
    next(err);
  }
});

export { router as marketsRouter };
