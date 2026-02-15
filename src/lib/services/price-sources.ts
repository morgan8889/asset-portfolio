/**
 * Price Sources Service
 *
 * Shared price fetching logic for Yahoo Finance, CoinGecko, and other price APIs.
 * Used by both single-symbol and batch price API routes.
 */

import Decimal from 'decimal.js';
import { logger } from '@/lib/utils/logger';
import { convertPenceToPounds } from '@/lib/utils/market-utils';

// =============================================================================
// Constants
// =============================================================================

export const MAX_RETRIES = 3;
export const TIMEOUT_MS = 10000; // 10 seconds
export const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
export const MAX_CACHE_SIZE = 1000; // Limit cache to 1000 symbols

// =============================================================================
// Types
// =============================================================================

export interface PriceMetadata {
  currency: string;
  rawCurrency?: string;
  marketState?: string;
  regularMarketTime?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
  exchangeName?: string;
  fullExchangeName?: string;
  change24h?: number;
  lastUpdated?: number;
}

export interface PriceResult {
  price: number;
  metadata?: PriceMetadata;
}

export interface PriceSource {
  name: string;
  fetch: (symbol: string) => Promise<PriceResult>;
  supports: (symbol: string) => boolean;
}

export interface CacheEntry {
  price: number;
  timestamp: number;
  source: string;
  metadata?: PriceMetadata;
}

// =============================================================================
// Price Fetchers
// =============================================================================

/**
 * Fetch price from Yahoo Finance API.
 * Supports stocks, ETFs, and other securities. Automatically converts GBp to GBP.
 */
export async function fetchYahooPrice(symbol: string): Promise<PriceResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Portfolio-Tracker/1.0)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.chart?.result?.[0]?.meta?.regularMarketPrice) {
      throw new Error('Invalid response format from Yahoo Finance');
    }

    const result = data.chart.result[0];
    const rawPrice = result.meta.regularMarketPrice;
    const currency = result.meta.currency;
    const previousClose = result.meta.previousClose;

    // Convert pence to pounds for UK stocks quoted in GBp
    const priceDecimal = new Decimal(rawPrice);
    const { displayPrice, displayCurrency } = convertPenceToPounds(
      priceDecimal,
      currency
    );

    // Calculate change (also needs conversion for GBp)
    const changeRaw = rawPrice - previousClose;
    const changePercent =
      previousClose > 0 ? (changeRaw / previousClose) * 100 : 0;

    const changeDecimal = new Decimal(changeRaw);
    const { displayPrice: displayChange } = convertPenceToPounds(
      changeDecimal,
      currency
    );

    return {
      price: displayPrice.toNumber(),
      metadata: {
        currency: displayCurrency,
        rawCurrency: currency, // Original currency (GBp or GBP)
        marketState: result.meta.marketState,
        regularMarketTime: result.meta.regularMarketTime,
        previousClose: currency === 'GBp' ? previousClose / 100 : previousClose,
        change: displayChange.toNumber(),
        changePercent: changePercent,
        exchangeName: result.meta.exchangeName,
        fullExchangeName: result.meta.fullExchangeName,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch cryptocurrency price from CoinGecko API.
 * Supports major cryptocurrencies with USD pricing.
 */
export async function fetchCoinGeckoPrice(
  symbol: string
): Promise<PriceResult> {
  const cryptoMapping: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    USDT: 'tether',
    BNB: 'binancecoin',
    SOL: 'solana',
    XRP: 'ripple',
    ADA: 'cardano',
    AVAX: 'avalanche-2',
    DOT: 'polkadot',
    MATIC: 'matic-network',
  };

  const coinId = cryptoMapping[symbol.toUpperCase()];
  if (!coinId) {
    throw new Error(`Cryptocurrency ${symbol} not supported`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data[coinId]?.usd) {
      throw new Error('Invalid response format from CoinGecko');
    }

    const coinData = data[coinId];
    return {
      price: Number(coinData.usd),
      metadata: {
        currency: 'USD',
        change24h: coinData.usd_24h_change,
        lastUpdated: coinData.last_updated_at,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// =============================================================================
// Price Sources Configuration
// =============================================================================

/**
 * Array of configured price sources.
 * Sources are tried in order until one succeeds.
 */
export const priceSources: PriceSource[] = [
  {
    name: 'yahoo',
    fetch: fetchYahooPrice,
    supports: (symbol) =>
      !/^(BTC|ETH|USDT|BNB|SOL|XRP|ADA|AVAX|DOT|MATIC)$/.test(
        symbol.toUpperCase()
      ),
  },
  {
    name: 'coingecko',
    fetch: fetchCoinGeckoPrice,
    supports: (symbol) =>
      /^(BTC|ETH|USDT|BNB|SOL|XRP|ADA|AVAX|DOT|MATIC)$/.test(
        symbol.toUpperCase()
      ),
  },
];

// =============================================================================
// Retry Logic
// =============================================================================

export interface FetchPriceWithRetryResult {
  price: number;
  source: string;
  metadata?: PriceMetadata;
}

/**
 * Fetch price with automatic retry logic across multiple sources.
 * Tries each applicable source up to MAX_RETRIES times before moving to next source.
 */
export async function fetchPriceWithRetry(
  symbol: string
): Promise<FetchPriceWithRetryResult> {
  // In test environments, return mock prices to avoid external API calls
  if (process.env.MOCK_PRICES === '1') {
    return {
      price: 100.0,
      source: 'mock',
      metadata: {
        currency: 'USD',
        change: 0.5,
        changePercent: 0.5,
        marketState: 'REGULAR',
        previousClose: 99.5,
      },
    };
  }

  const applicableSources = priceSources.filter((source) =>
    source.supports(symbol)
  );

  if (applicableSources.length === 0) {
    throw new Error(`No price source available for symbol: ${symbol}`);
  }

  let lastError: Error | null = null;

  for (const source of applicableSources) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        logger.info(
          `Fetching price for ${symbol} from ${source.name}, attempt ${attempt}`
        );
        const result = await source.fetch(symbol);
        logger.info(
          `Successfully fetched price for ${symbol} from ${source.name}: ${result.price}`
        );
        return {
          ...result,
          source: source.name,
        };
      } catch (error) {
        lastError = error as Error;
        logger.warn(
          `Failed to fetch price for ${symbol} from ${source.name} (attempt ${attempt}): ${lastError.message}`
        );

        // If this wasn't the last attempt, wait before retrying
        if (attempt < MAX_RETRIES) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  // All sources and retries failed
  const errorMessage =
    lastError?.message || 'Unknown error fetching price data';
  logger.error(`All price sources failed for ${symbol}: ${errorMessage}`);
  throw new Error(
    `Failed to fetch price for ${symbol} after ${MAX_RETRIES} retries: ${errorMessage}`
  );
}

// =============================================================================
// Cache Management
// =============================================================================

/**
 * In-memory LRU cache for price data.
 * Automatically evicts oldest entries when MAX_CACHE_SIZE is exceeded.
 */
export class PriceCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * Get cached price if still valid.
   */
  get(symbol: string): CacheEntry | null {
    const cached = this.cache.get(symbol);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_DURATION) {
      this.cache.delete(symbol);
      return null;
    }

    return cached;
  }

  /**
   * Set cache entry with LRU eviction.
   */
  set(symbol: string, entry: CacheEntry): void {
    // LRU eviction: if cache is full, delete oldest entry
    if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(symbol)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // Delete and re-add to move to end (most recently used)
    this.cache.delete(symbol);
    this.cache.set(symbol, entry);
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size for monitoring.
   */
  get size(): number {
    return this.cache.size;
  }
}

/**
 * Singleton cache instance for use across API routes.
 */
export const sharedPriceCache = new PriceCache();
