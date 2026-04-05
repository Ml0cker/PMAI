import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

const junk = ['hide from new', 'rewards 20, 4.5, 50', 'rewards 50, 4.5, 100', 'rewards 50, 4.5, 20', 'recurring', 'daily temperature', 'tweet markets', 'mentions', 'primaries', 'kitkat', 'egg', 'trump-machado'];

const subToMain = {
  'basketball': 'sports', 'hockey': 'sports', 'ncaa': 'sports', 'ncaa basketball': 'sports',
  'ncaa cbb': 'sports', 'golf': 'sports', 'chess': 'sports', 'cycling': 'sports',
  'games': 'entertainment', 'esports': 'entertainment', 'culture': 'entertainment',
  'climate & science': 'science', 'earthquakes': 'science', 'weather': 'science',
  'global elections': 'politics', 'us election': 'politics', 'trump': 'politics',
  'cabinet': 'politics', 'gov shutdown': 'politics', 'dhs': 'politics',
  'commodities': 'economics', 'india': 'world', 'canada': 'world', 'hungary': 'world',
  'hungary election': 'world', 'epstein': 'world', 'world elections': 'politics',
  'fidesz': 'politics',
};

const validCategories = ['politics', 'crypto', 'sports', 'science', 'entertainment', 'economics', 'tech', 'world', 'business'];

async function clean() {
  for (const cat of junk) {
    await p.event.updateMany({ where: { category: cat }, data: { category: null } });
  }

  for (const [sub, main] of Object.entries(subToMain)) {
    await p.event.updateMany({ where: { category: sub }, data: { category: main } });
  }

  await p.event.updateMany({
    where: { category: { notIn: validCategories, not: null } },
    data: { category: null },
  });

  const cats = await p.event.findMany({ where: { category: { not: null } }, select: { category: true }, distinct: ['category'] });
  console.log('Final categories:', cats.map(c => c.category));
  for (const cat of cats) {
    const count = await p.event.count({ where: { category: cat.category } });
    console.log(`  ${cat.category}: ${count} events`);
  }
  await p.$disconnect();
}

clean().catch(err => { console.error(err); process.exit(1); });
