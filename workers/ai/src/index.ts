import { Worker, Queue } from 'bullmq';
import { PredictionGenerator } from './services/predictionGenerator.js';
import { logger } from './lib/logger.js';
import { redisConnection } from './lib/redis.js';
import { QUEUE_NAMES, QUEUE_DLQ_SUFFIX } from '@pmai/shared';
import type { AIJobData } from '@pmai/shared';
import prisma from '@pmai/db';

const generator = new PredictionGenerator();

const worker = new Worker<AIJobData>(
  QUEUE_NAMES.AI_PREDICTION,
  async (job) => {
    logger.info({ jobId: job.id, type: job.data.type }, 'Processing AI job');

    if (job.data.type === 'generate_prediction') {
      return generator.generate(job.data.predictionRequestId, job.data.marketId, job.data.userId);
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

const dlq = new Queue(QUEUE_NAMES.AI_PREDICTION + QUEUE_DLQ_SUFFIX, {
  connection: redisConnection,
});

worker.on('failed', async (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'AI prediction job failed');

  if (job && job.attemptsMade >= (job.opts.attempts || 0)) {
    if (job.data.type === 'generate_prediction') {
      try {
        await prisma.predictionRequest.update({
          where: { id: job.data.predictionRequestId },
          data: { status: 'failed' },
        });
      } catch (updateErr) {
        logger.error({ error: (updateErr as Error).message }, 'Failed to mark prediction as failed');
      }
    }
    await dlq.add(
      job.name,
      { ...job.data, _error: err.message, _failedAt: new Date().toISOString() },
      { jobId: `dlq-${job.id}` }
    );
  }
});

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'AI prediction job completed');
});

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});

logger.info('AI prediction worker started');
