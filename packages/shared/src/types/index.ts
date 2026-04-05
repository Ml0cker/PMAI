// --- Queue Job Types ---
export type PolymarketJobData = {
  type: 'sync_markets' | 'sync_events';
  params?: Record<string, unknown>;
};

export type AIJobData = {
  type: 'generate_prediction';
  predictionRequestId: string;
  marketId: string;
  userId: string;
};

export type SolanaJobData = {
  type: 'verify_deposit' | 'burn_tokens';
  transactionSignature: string;
  userId?: string;
  walletAddress?: string;
  amount?: number;
  predictionRequestId?: string;
};

// --- Polymarket ---
export interface PolymarketMarket {
  id: string;
  question: string;
  slug: string;
  outcomes: string[];
  clobTokenIds: string[];
  outcomePrices: string[];
  volume24hr?: number;
  volume?: number;
  liquidity?: number;
  active: boolean;
  closed: boolean;
  category?: string;
  description?: string;
  endDate?: string;
  startDate?: string;
  imageUrl?: string;
}

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  category?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  imageUrl?: string;
  markets: PolymarketMarket[];
}

// --- AI Prediction ---
export interface AIPredictionOutput {
  prediction: 'YES' | 'NO';
  confidence: number;
  reasoning: string[];
  model_version: string;
  created_at: string;
}

// --- API Request/Response ---
export interface TriggerPredictionRequest {
  marketId: string;
  walletAddress: string;
  transactionSignature: string;
  tokenAmount: number;
}

export interface MarketResponse {
  id: string;
  eventId: string;
  question: string;
  slug: string;
  outcomes: string[];
  outcomePrices: string[];
  volume24hr: number | null;
  volume: number | null;
  liquidity: number | null;
  active: boolean;
  closed: boolean;
  category: string | null;
  imageUrl: string | null;
  latestPrediction: PredictionResponse | null;
}

export interface PredictionResponse {
  id: string;
  prediction: string;
  confidence: number;
  reasoning: string[];
  modelVersion: string;
  createdAt: string;
}

// --- Error Codes ---
export enum ErrorCode {
  MARKET_NOT_FOUND = 'MARKET_NOT_FOUND',
  PREDICTION_NOT_FOUND = 'PREDICTION_NOT_FOUND',
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  TRANSACTION_ALREADY_USED = 'TRANSACTION_ALREADY_USED',
  INVALID_TRANSACTION = 'INVALID_TRANSACTION',
  INSUFFICIENT_TOKENS = 'INSUFFICIENT_TOKENS',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  AI_RESPONSE_INVALID = 'AI_RESPONSE_INVALID',
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  MARKET_NOT_ACTIVE = 'MARKET_NOT_ACTIVE',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}
