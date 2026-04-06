import { Router, Request, Response } from 'express';
import prisma from '@pmai/db';
import { redisConnection } from '../lib/redis.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // DB check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: 'error', latencyMs: Date.now() - dbStart };
  }

  // Redis check
  const redisStart = Date.now();
  try {
    await redisConnection.ping();
    checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
  } catch {
    checks.redis = { status: 'error', latencyMs: Date.now() - redisStart };
  }

  const allOk = Object.values(checks).every((c) => c.status === 'ok');
  res.status(allOk ? 200 : 503).json({ status: allOk ? 'healthy' : 'degraded', checks });
});

export { router as healthRouter };
