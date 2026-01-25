/**
 * Price API Contracts: Live Market Data
 *
 * Feature: 005-live-market-data
 * Date: 2026-01-25
 *
 * Zod schemas for API request/response validation
 */

import { z } from 'zod';

// =============================================================================
// Enums and Constants
// =============================================================================

export const MarketStateSchema = z.enum(['PRE', 'REGULAR', 'POST', 'CLOSED']);
export type MarketState = z.infer<typeof MarketStateSchema>;

export const RefreshIntervalSchema = z.enum([
  'realtime',
  'frequent',
  'standard',
  'manual',
]);
export type RefreshInterval = z.infer<typeof RefreshIntervalSchema>;

export const StalenessLevelSchema = z.enum(['fresh', 'aging', 'stale']);
export type StalenessLevel = z.infer<typeof StalenessLevelSchema>;

export const ExchangeSchema = z.enum([
  'NYSE',
  'NASDAQ',
  'AMEX',
  'LSE',
  'AIM',
  'CRYPTO',
  'UNKNOWN',
]);
export type Exchange = z.infer<typeof ExchangeSchema>;

export const REFRESH_INTERVALS: Record<RefreshInterval, number> = {
  realtime: 30_000, // 30 seconds
  frequent: 60_000, // 1 minute
  standard: 300_000, // 5 minutes (default)
  manual: 0, // No automatic refresh
};

// =============================================================================
// Market Reference Data
// =============================================================================

export const TradingHoursSchema = z.object({
  preMarket: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
  regular: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  postMarket: z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .optional(),
});
export type TradingHours = z.infer<typeof TradingHoursSchema>;

export const MarketSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.enum(['US', 'UK']),
  timezone: z.string(),
  currency: z.string(),
  symbolSuffix: z.string().optional(),
  tradingHours: TradingHoursSchema,
});
export type Market = z.infer<typeof MarketSchema>;

export const MarketStatusSchema = z.object({
  market: z.string(),
  state: MarketStateSchema,
  nextStateChange: z.date().optional(),
  isHoliday: z.boolean(),
  holidayName: z.string().optional(),
});
export type MarketStatus = z.infer<typeof MarketStatusSchema>;

// =============================================================================
// Price Data Schemas
// =============================================================================

/**
 * Raw price response from Yahoo Finance API
 */
export const YahooFinanceResponseSchema = z.object({
  symbol: z.string(),
  regularMarketPrice: z.number(),
  regularMarketChange: z.number().optional(),
  regularMarketChangePercent: z.number().optional(),
  regularMarketTime: z.number(), // Unix timestamp
  currency: z.string(), // 'USD', 'GBP', 'GBp' (pence)
  marketState: MarketStateSchema.optional(),
  exchangeName: z.string().optional(),
  fullExchangeName: z.string().optional(),
});
export type YahooFinanceResponse = z.infer<typeof YahooFinanceResponseSchema>;

/**
 * Normalized price data for internal use
 */
export const PriceSnapshotSchema = z.object({
  symbol: z.string(),
  price: z.string(), // Decimal string for precision
  currency: z.string(),
  change: z.string().optional(),
  changePercent: z.number().optional(),
  timestamp: z.date(),
  source: z.string(),
  marketState: MarketStateSchema.optional(),
});
export type PriceSnapshot = z.infer<typeof PriceSnapshotSchema>;

/**
 * Extended price data for display with staleness and conversion
 */
export const LivePriceDataSchema = z.object({
  symbol: z.string(),
  price: z.string(), // Raw price as Decimal string
  currency: z.string(), // Original currency ('USD', 'GBP', 'GBp')
  displayPrice: z.string(), // After pence→pounds conversion
  displayCurrency: z.string(), // Always 'USD' or 'GBP'
  change: z.string(),
  changePercent: z.number(),
  timestamp: z.date(),
  source: z.string(),
  marketState: MarketStateSchema,
  staleness: StalenessLevelSchema,
  exchange: ExchangeSchema,
});
export type LivePriceData = z.infer<typeof LivePriceDataSchema>;

// =============================================================================
// User Preferences
// =============================================================================

export const PriceUpdatePreferencesSchema = z.object({
  refreshInterval: RefreshIntervalSchema,
  showStalenessIndicator: z.boolean(),
  pauseWhenHidden: z.boolean(),
});
export type PriceUpdatePreferences = z.infer<typeof PriceUpdatePreferencesSchema>;

export const DEFAULT_PRICE_PREFERENCES: PriceUpdatePreferences = {
  refreshInterval: 'standard',
  showStalenessIndicator: true,
  pauseWhenHidden: true,
};

// =============================================================================
// API Request/Response Schemas
// =============================================================================

/**
 * GET /api/prices/[symbol]
 */
export const PriceRequestSchema = z.object({
  symbol: z.string().min(1).max(20),
});
export type PriceRequest = z.infer<typeof PriceRequestSchema>;

export const PriceResponseSchema = z.object({
  success: z.literal(true),
  data: PriceSnapshotSchema,
  metadata: z.object({
    cached: z.boolean(),
    cacheAge: z.number().optional(),
    rateLimit: z
      .object({
        remaining: z.number(),
        resetAt: z.number(),
      })
      .optional(),
  }),
});
export type PriceResponse = z.infer<typeof PriceResponseSchema>;

export const PriceErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type PriceErrorResponse = z.infer<typeof PriceErrorResponseSchema>;

/**
 * POST /api/prices/batch
 */
export const BatchPriceRequestSchema = z.object({
  symbols: z.array(z.string().min(1).max(20)).min(1).max(50),
});
export type BatchPriceRequest = z.infer<typeof BatchPriceRequestSchema>;

export const BatchPriceResponseSchema = z.object({
  success: z.literal(true),
  data: z.record(z.string(), PriceSnapshotSchema),
  errors: z.record(z.string(), z.string()).optional(),
  metadata: z.object({
    requested: z.number(),
    successful: z.number(),
    failed: z.number(),
    cached: z.number(),
  }),
});
export type BatchPriceResponse = z.infer<typeof BatchPriceResponseSchema>;

// =============================================================================
// Static Market Data
// =============================================================================

export const MARKETS: Record<string, Market> = {
  NYSE: {
    id: 'NYSE',
    name: 'New York Stock Exchange',
    country: 'US',
    timezone: 'America/New_York',
    currency: 'USD',
    tradingHours: {
      preMarket: { start: '04:00', end: '09:30' },
      regular: { start: '09:30', end: '16:00' },
      postMarket: { start: '16:00', end: '20:00' },
    },
  },
  NASDAQ: {
    id: 'NASDAQ',
    name: 'NASDAQ Stock Market',
    country: 'US',
    timezone: 'America/New_York',
    currency: 'USD',
    tradingHours: {
      preMarket: { start: '04:00', end: '09:30' },
      regular: { start: '09:30', end: '16:00' },
      postMarket: { start: '16:00', end: '20:00' },
    },
  },
  AMEX: {
    id: 'AMEX',
    name: 'NYSE American',
    country: 'US',
    timezone: 'America/New_York',
    currency: 'USD',
    tradingHours: {
      preMarket: { start: '04:00', end: '09:30' },
      regular: { start: '09:30', end: '16:00' },
      postMarket: { start: '16:00', end: '20:00' },
    },
  },
  LSE: {
    id: 'LSE',
    name: 'London Stock Exchange',
    country: 'UK',
    timezone: 'Europe/London',
    currency: 'GBP',
    symbolSuffix: '.L',
    tradingHours: {
      preMarket: { start: '05:05', end: '08:00' },
      regular: { start: '08:00', end: '16:30' },
      postMarket: { start: '16:30', end: '17:15' },
    },
  },
  AIM: {
    id: 'AIM',
    name: 'AIM (Alternative Investment Market)',
    country: 'UK',
    timezone: 'Europe/London',
    currency: 'GBP',
    symbolSuffix: '.L',
    tradingHours: {
      regular: { start: '08:00', end: '16:30' },
    },
  },
};
