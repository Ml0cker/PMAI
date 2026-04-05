import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const GAMMA_BASE = 'https://gamma-api.polymarket.com';

async function backfill() {
  let updated = 0;
  let notFound = 0;
  let total = await p.event.count({ where: { imageUrl: null } });
  console.log(`Found ${total} events without images`);

  while (true) {
    const events = await p.event.findMany({
      where: { imageUrl: null },
      select: { id: true },
      take: 100,
    });

    if (!events.length) break;

    const concurrency = 5;
    for (let i = 0; i < events.length; i += concurrency) {
      const chunk = events.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        chunk.map(async (ev) => {
          const res = await fetch(`${GAMMA_BASE}/events/${ev.id}`, {
            signal: AbortSignal.timeout(5000),
          });
          if (!res.ok) return null;
          const data = await res.json();
          const img = data.image || data.imageUrl;
          if (img) {
            await p.event.updateMany({ where: { id: ev.id }, data: { imageUrl: img } });
            return 1;
          }
          return 0;
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value === 1) updated++;
          else if (r.value === null) notFound++;
        }
      }
    }

    const remaining = await p.event.count({ where: { imageUrl: null } });
    console.log(`  Updated so far: ${updated} | Remaining: ${remaining}`);

    if (remaining === 0) break;

    // Rate limit
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nDone! Updated ${updated} events with images.`);
  if (notFound) console.log(`Not found or no image: ${notFound}`);

  await p.$disconnect();
}

backfill().catch(err => { console.error(err); process.exit(1); });
