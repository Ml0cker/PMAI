import prisma from '@pmai/db';
import { logger } from '../lib/logger.js';
import { POLYMARKET } from '@pmai/shared';
import { sleep } from '@pmai/shared';

interface GammaMarket {
  id: string;
  question: string;
  slug: string;
  outcomes?: string[];
  clobTokenIds?: string[];
  outcomePrices?: string[];
  volume24hr?: number | string;
  volume?: number | string;
  liquidity?: number | string;
  active?: boolean;
  closed?: boolean;
  category?: string;
  description?: string;
  endDate?: string;
  startDate?: string;
  imageUrl?: string;
}

interface GammaEvent {
  id: string;
  title: string;
  slug: string;
  category?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  image?: string;
  imageUrl?: string;
  closed?: boolean;
  tags?: Array<{ label: string; slug: string; forceHide?: boolean }>;
  markets: GammaMarket[];
}

const CATEGORY_TAGS = ['Politics', 'Crypto', 'Sports', 'Science', 'Entertainment', 'Economics', 'World', 'Tech', 'Pop Culture', 'Business'];

const SKIP_TAGS = new Set(['hide from new', 'rewards 20, 4.5, 50', 'rewards 50, 4.5, 100', 'rewards 50, 4.5, 20', 'recurring', 'daily temperature', 'tweet markets', 'mentions', 'primaries']);

const TAG_TO_CATEGORY: Record<string, string> = {
  'Politics': 'politics', 'Crypto': 'crypto', 'Sports': 'sports', 'Science': 'science',
  'Entertainment': 'entertainment', 'Tech': 'tech', 'Economics': 'economics',
  'Business': 'business', 'World': 'world', 'Pop Culture': 'entertainment',
  'NBA': 'sports', 'NFL': 'sports', 'MLB': 'sports', 'NHL': 'sports', 'Soccer': 'sports',
  'UFC': 'sports', 'Tennis': 'sports', 'Golf': 'sports', 'Formula 1': 'sports',
  'Movies': 'entertainment', 'Music': 'entertainment', 'Eurovision': 'entertainment', 'YouTube': 'entertainment',
  'Climate': 'science', 'Space': 'science', 'AI': 'tech',
  'Bitcoin': 'crypto', 'Ethereum': 'crypto', 'DeFi': 'crypto',
  'Finance': 'economics', 'Fed': 'economics', 'Inflation': 'economics',
  'Elections': 'politics', 'Geopolitics': 'world',
};

function extractCategory(tags?: GammaEvent['tags']): string | null {
  if (!tags?.length) return null;
  const visible = tags.filter(t => !t.forceHide && !SKIP_TAGS.has(t.label.toLowerCase()));
  for (const tag of visible) {
    const mapped = TAG_TO_CATEGORY[tag.label];
    if (mapped) return mapped;
  }
  for (const tag of visible) {
    const lower = tag.label.toLowerCase();
    if (CATEGORY_TAGS.map(c => c.toLowerCase()).includes(lower)) return lower;
  }
  return null;
}

function toFloat(val: number | string | undefined): number | null {
  if (val === undefined || val === null) return null;
  const n = typeof val === 'string' ? parseFloat(val) : val;
  return isNaN(n) ? null : n;
}

export class PolymarketRestSync {
  private baseUrl = POLYMARKET.REST_BASE_URL;

  async syncAll() {
    logger.info('Starting full market sync from Polymarket Gamma API');

    const events = await this.fetchPaginatedEvents();

    let marketsCreated = 0;
    let marketsUpdated = 0;
    let errors = 0;

    for (const event of events) {
      if (!event.id || !event.title) continue;

      try {
        const eventSlug = event.slug || `event-${event.id}`;
        const category = event.category || extractCategory(event.tags);

        await prisma.event.upsert({
          where: { id: event.id },
          create: {
            id: event.id,
            title: event.title,
            slug: eventSlug,
            category,
            description: event.description,
            startDate: event.startDate ? new Date(event.startDate) : null,
            endDate: event.endDate ? new Date(event.endDate) : null,
            imageUrl: event.image || event.imageUrl || null,
            active: !event.closed,
            closed: !!event.closed,
          },
          update: {
            title: event.title,
            slug: eventSlug,
            category: category || undefined,
            endDate: event.endDate ? new Date(event.endDate) : null,
            imageUrl: event.image || event.imageUrl || undefined,
            active: !event.closed,
            closed: !!event.closed,
          },
        });

        for (const market of event.markets) {
          try {
            if (!market.question || !market.id) continue;
            if (POLYMARKET.EXCLUDED_TITLE_PATTERNS.some(p => p.test(market.question))) continue;

            const outcomes = market.outcomes?.length ? market.outcomes : ['Yes', 'No'];
            const outcomePrices = market.outcomePrices?.length ? market.outcomePrices : ['0.5', '0.5'];
            const clobTokenIds = market.clobTokenIds?.length ? market.clobTokenIds : [];
            const volume24hr = toFloat(market.volume24hr);
            const volume = toFloat(market.volume);
            const liquidity = toFloat(market.liquidity);

            const existing = await prisma.market.findUnique({ where: { id: market.id } });

            if (existing) {
              await prisma.market.update({
                where: { id: market.id },
                data: { outcomePrices, volume24hr, volume, liquidity, active: !!market.active, closed: !!market.closed },
              });

              await prisma.marketSnapshot.create({
                data: { marketId: market.id, outcomePrices, volume24hr, volume, liquidity },
              });

              marketsUpdated++;
            } else {
              await prisma.market.create({
                data: {
                  id: market.id,
                  eventId: event.id,
                  question: market.question,
                  slug: market.slug || market.id,
                  outcomes,
                  clobTokenIds,
                  outcomePrices,
                  volume24hr,
                  volume,
                  liquidity,
                  active: market.active !== false,
                  closed: !!market.closed,
                },
              });
              marketsCreated++;
            }
          } catch (err) {
            errors++;
            logger.warn({ marketId: market.id, question: market.question, error: (err as Error).message }, 'Failed to sync market, skipping');
          }
        }
      } catch (err) {
        errors++;
        logger.warn({ eventId: event.id, error: (err as Error).message }, 'Failed to sync event, skipping');
      }
    }

    logger.info(
      { marketsCreated, marketsUpdated, totalEvents: events.length, errors },
      'Full market sync completed'
    );
  }

  private async fetchPaginatedEvents(): Promise<GammaEvent[]> {
    const allEvents: GammaEvent[] = [];
    let offset = 0;
    const limit = POLYMARKET.MARKET_SYNC_LIMIT;
    let hasMore = true;

    while (hasMore) {
      const url = `${this.baseUrl}/events?limit=${limit}&offset=${offset}&active=true&closed=false&order=volume24hr&ascending=false`;

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`Gamma API returned ${response.status}: ${await response.text()}`);
      }

      const events: GammaEvent[] = await response.json();
      allEvents.push(...events);

      hasMore = events.length === limit;
      offset += limit;

      if (hasMore) await sleep(200);
    }

    return allEvents;
  }
}
