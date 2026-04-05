import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

const MAIN_CATEGORIES = new Set([
  'politics', 'crypto', 'sports', 'science', 'entertainment',
  'economics', 'tech', 'world', 'business', 'esports',
]);

const TAG_TO_CATEGORY = {
  'Politics': 'politics',
  'Crypto': 'crypto',
  'Sports': 'sports',
  'Science': 'science',
  'Entertainment': 'entertainment',
  'Tech': 'tech',
  'Economics': 'economics',
  'Business': 'business',
  'Esports': 'esports',
  'World': 'world',
  'Pop Culture': 'entertainment',
  'NBA': 'sports',
  'NFL': 'sports',
  'MLB': 'sports',
  'NHL': 'sports',
  'Soccer': 'sports',
  'UFC': 'sports',
  'Tennis': 'sports',
  'Golf': 'sports',
  'Formula 1': 'sports',
  'Boxing': 'sports',
  'MMA': 'sports',
  'Movies': 'entertainment',
  'Music': 'entertainment',
  'Eurovision': 'entertainment',
  'YouTube': 'entertainment',
  'Climate': 'science',
  'Space': 'science',
  'AI': 'tech',
  'Bitcoin': 'crypto',
  'Ethereum': 'crypto',
  'DeFi': 'crypto',
  'Finance': 'economics',
  'Fed': 'economics',
  'Inflation': 'economics',
  'Elections': 'politics',
  'Geopolitics': 'world',
};

const SKIP_TAGS = new Set([
  'hide from new', 'rewards 20, 4.5, 50', 'rewards 50, 4.5, 100', 'rewards 50, 4.5, 20',
  'recurring', 'daily temperature', 'tweet markets', 'mentions', 'primaries',
]);

function mapTagsToCategory(tags) {
  const visible = tags.filter(t => !t.forceHide && !SKIP_TAGS.has(t.label.toLowerCase()));

  // First try exact mapping
  for (const tag of visible) {
    const mapped = TAG_TO_CATEGORY[tag.label];
    if (mapped) return mapped;
  }

  // Then try main categories
  for (const tag of visible) {
    if (MAIN_CATEGORIES.has(tag.label.toLowerCase())) return tag.label.toLowerCase();
  }

  return null;
}

async function backfill() {
  const events = await fetch('https://gamma-api.polymarket.com/events?limit=1000&active=true&closed=false&order=volume24hr&ascending=false').then(r => r.json());

  let updated = 0;
  for (const e of events) {
    const category = mapTagsToCategory(e.tags || []);
    if (!category) continue;

    const result = await p.event.update({ where: { id: e.id }, data: { category } }).catch(() => null);
    if (result) updated++;
  }

  // Check what categories we now have
  const cats = await p.event.findMany({ where: { category: { not: null } }, select: { category: true }, distinct: ['category'] });
  console.log('Updated', updated, 'events');
  console.log('Categories:', cats.map(c => c.category));
  await p.$disconnect();
}

backfill().catch(err => { console.error(err); process.exit(1); });
