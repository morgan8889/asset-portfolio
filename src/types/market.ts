/**
 * Market Types: Live Market Data
 *
 * Feature: 005-live-market-data
 *
 * Types for market state, trading hours, and price update preferences.
 */

// =============================================================================
// Enums and Constants
// =============================================================================

export type MarketState = 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';

export type RefreshInterval = 'realtime' | 'frequent' | 'standard' | 'manual';

export type StalenessLevel = 'fresh' | 'aging' | 'stale';

export type Exchange =
  | 'NYSE'
  | 'NASDAQ'
  | 'AMEX'
  | 'LSE'
  | 'AIM'
  | 'CRYPTO'
  | 'UNKNOWN';

export const REFRESH_INTERVALS: Record<RefreshInterval, number> = {
  realtime: 15_000, // 15 seconds
  frequent: 30_000, // 30 seconds
  standard: 60_000, // 60 seconds (default)
  manual: 0, // No automatic refresh
};

// =============================================================================
// Market Reference Data
// =============================================================================

export interface TradingHours {
  preMarket?: { start: string; end: string };
  regular: { start: string; end: string };
  postMarket?: { start: string; end: string };
}

export interface Market {
  id: string;
  name: string;
  country: 'US' | 'UK';
  timezone: string;
  currency: string;
  symbolSuffix?: string;
  tradingHours: TradingHours;
}

export interface MarketStatus {
  market: string;
  state: MarketState;
  nextStateChange?: Date;
  isHoliday: boolean;
  holidayName?: string;
}

// =============================================================================
// User Preferences
// =============================================================================

export interface PriceUpdatePreferences {
  refreshInterval: RefreshInterval;
  showStalenessIndicator: boolean;
  pauseWhenHidden: boolean;
}

export const DEFAULT_PRICE_PREFERENCES: PriceUpdatePreferences = {
  refreshInterval: 'standard',
  showStalenessIndicator: true,
  pauseWhenHidden: true,
};

// =============================================================================
// Price Data Types
// =============================================================================

export interface LivePriceData {
  symbol: string;
  price: string; // Decimal string for precision
  currency: string; // Original currency ('USD', 'GBP', 'GBp')
  displayPrice: string; // After pence-to-pounds conversion
  displayCurrency: string; // Always 'USD' or 'GBP'
  change: string;
  changePercent: number;
  timestamp: Date;
  source: string;
  marketState: MarketState;
  staleness: StalenessLevel;
  exchange: Exchange;
}

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
