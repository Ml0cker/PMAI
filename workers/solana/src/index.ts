import { Worker, Queue } from 'bullmq';
import { TransactionVerifier } from './services/transactionVerifier.js';
import { TokenBurner } from './services/tokenBurner.js';
import { logger } from './lib/logger.js';
import { redisConnection } from './lib/redis.js';
import { QUEUE_NAMES, QUEUE_DLQ_SUFFIX } from '@pmai/shared';
import type { SolanaJobData } from '@pmai/shared';
import prisma from '@pmai/db';
import Redis from 'ioredis';

const verifier = new TransactionVerifier();
const burner = new TokenBurner();

const worker = new Worker<SolanaJobData>(
  QUEUE_NAMES.SOLANA,
  async (job) => {
    logger.info({ jobId: job.id, type: job.data.type }, 'Processing Solana job');

    switch (job.data.type) {
      case 'verify_deposit': {
        const result = await verifier.verifyDeposit({
          transactionSignature: job.data.transactionSignature,
          walletAddress: job.data.walletAddress || '',
          expectedAmount: job.data.amount || 0,
        });

        const request = await prisma.predictionRequest.findFirst({
          where: { burnSignature: job.data.transactionSignature },
        });

        if (request && result.userId) {
          // Advance prediction flow: update request and queue AI job
          await prisma.predictionRequest.update({
            where: { id: request.id },
            data: { userId: result.userId, status: 'processing' },
          });

          const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
          const aiQueue = new Queue('ai-prediction', { connection: redis });

          await aiQueue.add(
            'generate_prediction',
            {
              type: 'generate_prediction',
              predictionRequestId: request.id,
              marketId: request.marketId,
              userId: result.userId,
            },
            {
              attempts: 3,
              backoff: { type: 'exponential', delay: 5000 },
              jobId: `predict-${request.id}`,
            }
          );

          await redis.quit();

          logger.info({ requestId: request.id }, 'AI prediction job queued after deposit verification');
        }

        return result;
      }

      case 'burn_tokens': {
        return burner.processBurn({
          transactionSignature: job.data.transactionSignature,
          userId: job.data.userId || '',
          predictionRequestId: job.data.predictionRequestId || '',
        });
      }
    }
  },
  {
    connection: redisConnection,
    concurrency: 3,
  }
);

const dlq = new Queue(QUEUE_NAMES.SOLANA + QUEUE_DLQ_SUFFIX, {
  connection: redisConnection,
});

worker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, error: err.message, attemptsMade: job?.attemptsMade }, 'Solana job failed');
  if (job && job.attemptsMade >= (job.opts.attempts || 0)) {
    await dlq.add(
      job.name,
      { ...job.data, _error: err.message, _failedAt: new Date().toISOString() },
      { jobId: `dlq-${job.id}` }
    );
  }
});

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Solana job completed');
});

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});

logger.info('Solana worker started');
