import { Worker, Queue } from 'bullmq';
import { PolymarketRestSync } from './services/restSync.js';
import { PolymarketWebSocketFeed } from './services/websocketFeed.js';
import { logger } from './lib/logger.js';
import { redisConnection } from './lib/redis.js';
import { QUEUE_NAMES, QUEUE_DLQ_SUFFIX, POLYMARKET } from '@pmai/shared';
import type { PolymarketJobData } from '@pmai/shared';

const restSync = new PolymarketRestSync();
const wsFeed = new PolymarketWebSocketFeed();

let worker: Worker<PolymarketJobData> | null = null;
let dlq: Queue | null = null;

try {
  worker = new Worker<PolymarketJobData>(
    QUEUE_NAMES.POLYMARKET,
    async (job) => {
      logger.info({ jobId: job.id, type: job.data.type }, 'Processing Polymarket job');

      switch (job.data.type) {
        case 'sync_markets':
        case 'sync_events':
          await restSync.syncAll();
          break;
      }
    },
    {
      connection: redisConnection,
      concurrency: 1,
    }
  );

  dlq = new Queue(QUEUE_NAMES.POLYMARKET + QUEUE_DLQ_SUFFIX, {
    connection: redisConnection,
  });

  worker.on('failed', async (job, err) => {
    logger.error({ jobId: job?.id, error: err.message, attemptsMade: job?.attemptsMade }, 'Polymarket job failed');
    if (job && job.attemptsMade >= (job.opts.attempts || 0)) {
      await dlq!.add(
        job.name,
        { ...job.data, _error: err.message, _failedAt: new Date().toISOString() },
        { jobId: `dlq-${job.id}` }
      );
    }
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Polymarket job completed');
  });
} catch (err) {
  logger.warn({ error: (err as Error).message }, 'BullMQ unavailable (Redis version too old?), running without queue support');
}

async function main() {
  logger.info('Polymarket worker starting');

  await restSync.syncAll().catch((err) =>
    logger.error({ error: err.message }, 'Initial sync failed, will retry via scheduler')
  );

  try {
    await wsFeed.start();
  } catch (err) {
    logger.warn({ error: (err as Error).message }, 'WebSocket feed failed to start, continuing without real-time updates');
  }

  setInterval(async () => {
    await restSync.syncAll().catch((err) =>
      logger.error({ error: err.message }, 'Periodic sync failed')
    );
  }, POLYMARKET.SYNC_INTERVAL_MS);

  logger.info('Polymarket worker fully started');
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down');
  await wsFeed.stop();
  await worker?.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down');
  await wsFeed.stop();
  await worker?.close();
  process.exit(0);
});

main().catch((err) => {
  logger.fatal({ error: err.message }, 'Polymarket worker failed to start');
  process.exit(1);
});
