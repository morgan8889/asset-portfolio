/**
 * API Contracts: Portfolio Performance Analytics
 *
 * No new REST endpoints required - all data is local.
 * This file documents the existing price API extension for benchmark data.
 *
 * @module contracts/api-contracts
 */

// =============================================================================
// Existing Price API Extension
// =============================================================================

/**
 * GET /api/prices/[symbol]
 *
 * Extended to support index symbols (prefixed with ^).
 *
 * Example: GET /api/prices/^GSPC
 *
 * Response unchanged - same format as stock prices.
 */

export interface PriceAPIRequest {
  /** Stock symbol (e.g., "AAPL") or index symbol (e.g., "^GSPC") */
  symbol: string;
}

export interface PriceAPIResponse {
  symbol: string;
  price: number;
  source: 'yahoo' | 'coingecko';
  metadata?: {
    currency: string;
    marketState: string;
    regularMarketTime: number;
    previousClose: number;
    change: number;
  };
  cached: boolean;
  timestamp: string; // ISO 8601
}

export interface PriceAPIError {
  error: string;
  symbol: string;
  details?: string; // Only in development
}

// =============================================================================
// Validation Changes Required
// =============================================================================

/**
 * Update validateSymbol in src/lib/utils/validation.ts
 *
 * Current: Only allows alphanumeric + common suffixes
 * Required: Allow ^ prefix for index symbols
 *
 * New pattern: /^[\^]?[A-Za-z0-9.-]+$/
 *
 * Examples:
 * - "AAPL" → valid (stock)
 * - "BRK.B" → valid (stock with suffix)
 * - "^GSPC" → valid (S&P 500 index)
 * - "^DJI" → valid (Dow Jones index)
 * - "^IXIC" → valid (NASDAQ Composite)
 */

export const SUPPORTED_BENCHMARK_SYMBOLS = [
  { symbol: '^GSPC', name: 'S&P 500', description: 'US Large Cap' },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', description: 'US 30 Blue Chips' },
  { symbol: '^IXIC', name: 'NASDAQ Composite', description: 'US Tech-Heavy' },
  { symbol: '^RUT', name: 'Russell 2000', description: 'US Small Cap' },
  { symbol: '^VIX', name: 'CBOE Volatility Index', description: 'Market Volatility' },
] as const;

// =============================================================================
// Internal Service Contracts (No HTTP)
// =============================================================================

/**
 * These are not HTTP APIs but internal IndexedDB operations.
 * Documented here for completeness.
 */

/**
 * PerformanceSnapshot CRUD operations via Dexie.js
 *
 * CREATE: db.performanceSnapshots.add(snapshot)
 * READ: db.performanceSnapshots.where('[portfolioId+date]').between(...)
 * UPDATE: db.performanceSnapshots.put(snapshot) // upsert by [portfolioId+date]
 * DELETE: db.performanceSnapshots.where('portfolioId').equals(id).delete()
 */

export interface SnapshotQueryParams {
  portfolioId: string;
  startDate: Date;
  endDate: Date;
}

export interface SnapshotUpsertParams {
  portfolioId: string;
  date: Date;
  totalValue: string; // Serialized Decimal
  totalCost: string;
  dayChange: string;
  dayChangePercent: number;
  cumulativeReturn: string;
  twrReturn: string;
  holdingCount: number;
  hasInterpolatedPrices: boolean;
}

// =============================================================================
// Event Contracts (Transaction Hooks)
// =============================================================================

/**
 * Snapshot computation is triggered by transaction changes.
 * These events are handled internally, not via HTTP.
 */

export type SnapshotTriggerEvent =
  | { type: 'TRANSACTION_ADDED'; transactionId: string; portfolioId: string; date: Date }
  | { type: 'TRANSACTION_MODIFIED'; transactionId: string; portfolioId: string; oldDate: Date; newDate: Date }
  | { type: 'TRANSACTION_DELETED'; transactionId: string; portfolioId: string; date: Date }
  | { type: 'PRICE_UPDATED'; assetId: string; date: Date }
  | { type: 'MANUAL_REFRESH'; portfolioId: string };

/**
 * Handler for snapshot trigger events.
 * Called from transaction store actions.
 */
export interface ISnapshotTriggerHandler {
  handleEvent(event: SnapshotTriggerEvent): Promise<void>;
}
