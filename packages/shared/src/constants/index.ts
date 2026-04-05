export const QUEUE_NAMES = {
  POLYMARKET: 'polymarket',
  AI_PREDICTION: 'ai-prediction',
  SOLANA: 'solana',
} as const;

export const QUEUE_DLQ_SUFFIX = '-dlq';

export const POLYMARKET = {
  REST_BASE_URL: 'https://gamma-api.polymarket.com',
  WS_URL: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
  WS_RECONNECT_DELAY_MS: 5000,
  WS_MAX_RECONNECT_DELAY_MS: 60000,
  SYNC_INTERVAL_MS: 300_000,
  MARKET_SYNC_LIMIT: 100,
  EXCLUDED_TITLE_PATTERNS: [
    /5\s*min\b/i,
    /\b5min\b/i,
    /\bBTC\s+price/i,
    /\bETH\s+price/i,
  ],
} as const;

export const SOLANA = {
  RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  BAGS_MINT_ADDRESS: process.env.BAGS_MINT_ADDRESS || '',
  BURN_AMOUNT: BigInt(1_000_000),
  CONFIRMATION_COMMITMENT: 'confirmed' as const,
  TOKEN_DECIMALS: 6,
} as const;

export const AI = {
  OPENROUTER_API_URL: 'https://openrouter.ai/api/v1/chat/completions',
  MODEL: 'qwen/qwen3.6-plus:free',
  MAX_TOKENS: 2048,
  TEMPERATURE: 0.3,
  REQUEST_TIMEOUT_MS: 60_000,
} as const;

export const PREDICTION_COST_TOKENS = 1_000_000;

export const WS_EVENTS = {
  MARKET_UPDATE: 'market:update',
  NEW_PREDICTION: 'prediction:new',
  PREDICTION_COMPLETE: 'prediction:complete',
  PRICE_CHANGE: 'price:change',
} as const;
