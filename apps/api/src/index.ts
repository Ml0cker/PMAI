import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(import.meta.dirname, '../../../.env') });

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { marketsRouter } from './routes/markets';
import { predictionsRouter } from './routes/predictions';
import { healthRouter } from './routes/health';
import { setupBroadcastServer } from './websocket/broadcastServer';

const PORT = parseInt(process.env.API_PORT || '4000', 10);
const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);

app.use('/health', healthRouter);
app.use('/markets', marketsRouter);
app.use('/predictions', predictionsRouter);

app.use(errorHandler);

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

setupBroadcastServer(wss);

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'API server listening');
});

export { app, server };
