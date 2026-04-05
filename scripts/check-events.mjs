import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

const events = await p.event.findMany({ select: { id: true, imageUrl: true, title: true }, take: 5 });
events.forEach(e => console.log(e.id, '|', e.imageUrl ? e.imageUrl.substring(0, 80) : 'NULL', '|', e.title));
await p.$disconnect();
