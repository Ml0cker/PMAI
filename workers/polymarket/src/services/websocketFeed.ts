import WebSocket from 'ws';
import prisma from '@pmai/db';
import { logger } from '../lib/logger.js';
import { POLYMARKET } from '@pmai/shared';
import { sleep } from '@pmai/shared';

export class PolymarketWebSocketFeed {
  private ws: WebSocket | null = null;
  private reconnectAttempt = 0;
  private isShuttingDown = false;
  private static readonly MAX_RECONNECT_ATTEMPTS = 10;

  async start() {
    this.isShuttingDown = false;
    this.connect();
  }

  async stop() {
    this.isShuttingDown = true;
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close(1000, 'Shutdown');
    }
  }

  private connect() {
    if (this.isShuttingDown) return;

    this.ws = new WebSocket(POLYMARKET.WS_URL);

    this.ws.on('open', async () => {
      logger.info('Connected to Polymarket WebSocket');
      this.reconnectAttempt = 0;
      await this.subscribeToActiveMarkets();
    });

    this.ws.on('message', (data) => {
      try {
        this.handleMessage(JSON.parse(data.toString()));
      } catch (err) {
        logger.warn({ error: (err as Error).message }, 'Failed to parse WS message');
      }
    });

    this.ws.on('close', (code, reason) => {
      logger.warn({ code, reason: reason.toString() }, 'Polymarket WebSocket closed');
      this.scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      logger.error({ error: err.message }, 'Polymarket WebSocket error');
    });
  }

  private async subscribeToActiveMarkets() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const activeMarkets = await prisma.market.findMany({
      where: { active: true },
      select: { id: true },
      take: 500,
    });

    const conditionIds = activeMarkets.map((m) => m.id);

    const batchSize = 50;
    for (let i = 0; i < conditionIds.length; i += batchSize) {
      const batch = conditionIds.slice(i, i + batchSize);
      this.ws.send(
        JSON.stringify({
          type: 'subscribe',
          channel: 'tickers',
          markets: batch,
        })
      );
    }

    logger.info({ count: conditionIds.length }, 'Subscribed to active markets via WebSocket');
  }

  private handleMessage(msg: Record<string, unknown>) {
    const channel = msg.channel as string;
    const data = msg.data as Record<string, unknown>;

    switch (channel) {
      case 'tickers':
        this.handleTickerUpdate(data);
        break;
      default:
        logger.debug({ channel }, 'Ignoring unknown WS channel');
    }
  }

  private async handleTickerUpdate(data: Record<string, unknown>) {
    const marketId = data.asset_id as string;
    if (!marketId) return;

    const outcomePrices = data.price as string | undefined;
    if (!outcomePrices) return;

    try {
      await prisma.market.update({
        where: { id: marketId },
        data: {
          outcomePrices: [outcomePrices, (1 - parseFloat(outcomePrices)).toFixed(4)],
          volume24hr: data.volume_24hr ? parseFloat(String(data.volume_24hr)) : undefined,
        },
      });

      await prisma.marketSnapshot.create({
        data: {
          marketId,
          outcomePrices: [outcomePrices, (1 - parseFloat(outcomePrices)).toFixed(4)],
          volume24hr: data.volume_24hr ? parseFloat(String(data.volume_24hr)) : null,
        },
      });
    } catch (err) {
      logger.warn({ marketId, error: (err as Error).message }, 'Failed to update market from WS');
    }
  }

  private scheduleReconnect() {
    if (this.isShuttingDown) return;
    if (this.reconnectAttempt >= PolymarketWebSocketFeed.MAX_RECONNECT_ATTEMPTS) {
      logger.warn('Max WebSocket reconnect attempts reached, giving up');
      return;
    }

    const delay = Math.min(
      POLYMARKET.WS_RECONNECT_DELAY_MS * Math.pow(1.5, this.reconnectAttempt),
      POLYMARKET.WS_MAX_RECONNECT_DELAY_MS
    );
    this.reconnectAttempt++;

    logger.info({ attempt: this.reconnectAttempt, delayMs: delay }, 'Scheduling WebSocket reconnect');

    setTimeout(() => this.connect(), delay);
  }
}
