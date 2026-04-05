import prisma from '@pmai/db';
import { Prisma } from '@prisma/client';

function parseJsonField<T>(val: unknown): T {
  if (Array.isArray(val)) return val as T;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return val as T; }
  }
  return val as T;
}

export class MarketService {
  async listMarkets(params: {
    page: number;
    limit: number;
    category?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }) {
    const { page, limit, category, sort = 'volume24hr', order = 'desc' } = params;

    const where: Prisma.MarketWhereInput = {
      active: true,
      closed: false,
    };

    if (category) {
      where.event = { category: { equals: category, mode: 'insensitive' } };
    }

    const orderBy: Prisma.MarketOrderByWithRelationInput = {};
    if (sort === 'volume24hr') {
      orderBy.volume24hr = order;
    } else if (sort === 'createdAt') {
      orderBy.createdAt = order;
    } else if (sort === 'liquidity') {
      orderBy.liquidity = order;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [markets, total] = await Promise.all([
      prisma.market.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          event: { select: { category: true, title: true, imageUrl: true } },
          predictions: {
            where: {},
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              prediction: true,
              confidence: true,
              reasoning: true,
              modelVersion: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.market.count({ where }),
    ]);

    const formatted = markets.map((m) => ({
      id: m.id,
      eventId: m.eventId,
      question: m.question,
      slug: m.slug,
      outcomes: parseJsonField<string[]>(m.outcomes),
      clobTokenIds: parseJsonField<string[]>(m.clobTokenIds),
      outcomePrices: parseJsonField<string[]>(m.outcomePrices),
      volume24hr: m.volume24hr,
      volume: m.volume,
      liquidity: m.liquidity,
      active: m.active,
      closed: m.closed,
      category: m.event?.category || null,
      eventTitle: m.event?.title || null,
      imageUrl: m.event?.imageUrl || null,
      latestPrediction: m.predictions[0]
        ? {
            id: m.predictions[0].id,
            prediction: m.predictions[0].prediction,
            confidence: m.predictions[0].confidence,
            reasoning: parseJsonField<string[]>(m.predictions[0].reasoning),
            modelVersion: m.predictions[0].modelVersion,
            createdAt: m.predictions[0].createdAt.toISOString(),
          }
        : null,
    }));

    return {
      markets: formatted,
      total,
      page,
      limit,
    };
  }

  async getMarket(id: string) {
    const market = await prisma.market.findUnique({
      where: { id },
      include: {
        event: { select: { category: true, title: true, description: true, imageUrl: true } },
        snapshots: {
          orderBy: { recordedAt: 'desc' },
          take: 20,
        },
        predictions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: { select: { id: true } },
          },
        },
      },
    });

    if (!market) return null;

    return {
      id: market.id,
      eventId: market.eventId,
      question: market.question,
      slug: market.slug,
      outcomes: parseJsonField<string[]>(market.outcomes),
      clobTokenIds: parseJsonField<string[]>(market.clobTokenIds),
      outcomePrices: parseJsonField<string[]>(market.outcomePrices),
      volume24hr: market.volume24hr,
      volume: market.volume,
      liquidity: market.liquidity,
      active: market.active,
      closed: market.closed,
      resolvedAt: market.resolvedAt,
      winningOutcome: market.winningOutcome,
      category: market.event?.category || null,
      eventTitle: market.event?.title || null,
      eventDescription: market.event?.description || null,
      imageUrl: market.event?.imageUrl || null,
      snapshots: market.snapshots.map((s) => ({
        id: s.id,
        outcomePrices: parseJsonField<string[]>(s.outcomePrices),
        volume24hr: s.volume24hr,
        volume: s.volume,
        liquidity: s.liquidity,
        recordedAt: s.recordedAt.toISOString(),
      })),
      predictions: market.predictions.map((p) => ({
        id: p.id,
        prediction: p.prediction,
        confidence: p.confidence,
        reasoning: parseJsonField<string[]>(p.reasoning),
        modelVersion: p.modelVersion,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  }
}
