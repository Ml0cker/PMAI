import { Queue } from 'bullmq';
import type { AIJobData, PolymarketJobData, SolanaJobData } from '@pmai/shared';
import { QUEUE_NAMES } from '@pmai/shared';
import { redisConnection } from './redis';

export const aiQueue = new Queue<AIJobData>(QUEUE_NAMES.AI_PREDICTION, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const solanaQueue = new Queue<SolanaJobData>(QUEUE_NAMES.SOLANA, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

export const polymarketQueue = new Queue<PolymarketJobData>(QUEUE_NAMES.POLYMARKET, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000 },
  },
});
