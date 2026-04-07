# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Run Commands

```bash
# Install all workspace dependencies
npm install

# Build everything (shared → db → api → frontend)
npm run build

# Build individual packages
npm run build -w packages/shared
npm run build -w packages/db
npm run build -w apps/api
npm run build -w workers/polymarket

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to DB (no migration files)
npm run db:migrate     # Run migrations (interactive)
npm run db:studio      # Open Prisma Studio GUI

# Dev servers (use tsx watch for hot reload)
npm run dev:frontend        # Next.js on :3000
npm run dev:api             # Express + WebSocket on :4000
npm run dev:worker:polymarket
npm run dev:worker:ai
npm run dev:worker:solana

# Docker
npm run docker:up
npm run docker:down
npm run docker:build

# Typecheck all packages
npm run typecheck
```

## Architecture

Monorepo with npm workspaces. All packages are ESM (`"type": "module"`).

### Package Map

| Package | Purpose | Port |
|---|---|---|
| `packages/shared` | Types, constants, utils (`@pmai/shared`) | — |
| `packages/db` | Prisma schema + client (`@pmai/db`) | — |
| `apps/api` | Express REST + WebSocket + BullMQ queues | 4000 |
| `apps/frontend` | Next.js 14 App Router + TailwindCSS | 3000 |
| `workers/polymarket` | Gamma API sync + WebSocket ingestion | — |
| `workers/ai` | OpenRouter prediction engine | — |
| `workers/solana` | Tx verification + SPL token burn | — |

### Key Data Flow

```
POST /predictions/trigger
  → solanaQueue:verify_deposit
  → aiQueue:generate_prediction
  → Store immutable Prediction record
  → solanaQueue:burn_tokens
  → WebSocket broadcast to frontend
```

### Queue System

BullMQ with Redis 5+. Queue names defined in `packages/shared/src/constants/index.ts`:
- `polymarket` — market sync jobs
- `ai-prediction` — prediction generation
- `solana` — deposit verification + token burning

### Database

PostgreSQL with Prisma ORM. 8 models: User, Wallet, Event, Market, MarketSnapshot, PredictionRequest, Prediction, TokenDeposit, TransactionLog.

- `Prediction` has **no `updatedAt`** — records are immutable once written
- `TransactionLog` and `TokenDeposit` use `transactionSignature` unique constraint for idempotency
- `Market.eventId` references `Event.id` (Gamma API event ID, not slug)

### ESM Requirements

All local imports in worker/api packages **must** use `.js` extensions:
```typescript
import { something } from './services/foo.js';  // correct
import { something } from './services/foo';      // will fail at runtime
```

### Environment Variables

Copy `.env.example` to `.env`. Required for running locally:
- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection (must be v5+ for BullMQ)
- `OPENROUTER_API_KEY` — for AI predictions via OpenRouter
- `BAGS_MINT_ADDRESS` — SPL token mint address

### Frontend Theme

Pump.fun-inspired dark theme. Colors defined in `apps/frontend/tailwind.config.ts`:
- Background: `#0e0e12`, Surface: `#1a1a24`
- Accent green: `#00ff88`, Accent red: `#ff3b3b`, Accent purple: `#7c3aed`

## Development Workflow

### Local Setup
1. Copy `.env.example` to `.env` and fill in required variables
2. Start PostgreSQL and Redis (or use Docker)
3. Run `npm install` then `npm run db:push`
4. Start dev servers in separate terminals:
   - `npm run dev:frontend` (port 3000)
   - `npm run dev:api` (port 4000)
   - `npm run dev:worker:polymarket` (background job)

### Testing
- Run tests: `npm test`
- Type check: `npm run typecheck`
- Build check: `npm run build`

### Code Style
- ESM imports only (use `.js` extensions for local imports)
- TypeScript strict mode enabled
- No console.log in production code (use logger)
- Immutable data patterns where possible

## Common Issues & Solutions

**ESM Import Errors**: Always use `.js` extensions in worker/api packages
```typescript
// ✓ Correct
import { foo } from './lib/bar.js';

// ✗ Wrong
import { foo } from './lib/bar';
```

**Database Connection**: Ensure `DATABASE_URL` format is `postgresql://user:pass@host:port/db`

**Redis Connection**: Must be Redis 5+ for BullMQ compatibility

**WebSocket Issues**: Check CORS headers in API responses, frontend origin must match

## Deployment

Production deployment via GitHub Actions to remote server at `77.238.226.31`.
- Docker Compose stack in `/opt/pmai`
- Check status: `npm run deploy:status`
- Manual deploy: `npm run deploy`
