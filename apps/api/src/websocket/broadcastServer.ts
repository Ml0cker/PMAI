import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../lib/logger.js';

type Client = {
  ws: WebSocket;
  subscriptions: Set<string>;
  userId?: string;
};

const clients = new Map<string, Client>();

export function setupBroadcastServer(wss: WebSocketServer) {
  wss.on('connection', (ws) => {
    const clientId = crypto.randomUUID();
    const client: Client = { ws, subscriptions: new Set() };
    clients.set(clientId, client);

    logger.info({ clientId }, 'WebSocket client connected');

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'subscribe' && Array.isArray(msg.channels)) {
          msg.channels.forEach((ch: string) => client.subscriptions.add(ch));
        }
        if (msg.type === 'unsubscribe' && Array.isArray(msg.channels)) {
          msg.channels.forEach((ch: string) => client.subscriptions.delete(ch));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      logger.info({ clientId }, 'WebSocket client disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ clientId, error: err.message }, 'WebSocket error');
      clients.delete(clientId);
    });

    ws.send(JSON.stringify({ type: 'connected', clientId }));
  });
}

export function broadcast(channel: string, payload: unknown) {
  const message = JSON.stringify({
    channel,
    data: payload,
    timestamp: new Date().toISOString(),
  });
  let sent = 0;
  for (const [, client] of clients) {
    if (client.subscriptions.has(channel) || client.subscriptions.has('*')) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
        sent++;
      }
    }
  }
  if (sent > 0) {
    logger.debug({ channel, sent }, 'Broadcast message sent');
  }
}
