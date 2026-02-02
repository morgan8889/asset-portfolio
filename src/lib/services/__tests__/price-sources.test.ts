/**
 * Price Sources Service Tests
 *
 * Comprehensive test coverage for price fetching logic including:
 * - PriceCache (LRU cache with TTL)
 * - Yahoo Finance API integration
 * - CoinGecko API integration
 * - Retry logic with exponential backoff
 * - Source fallback strategies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  PriceCache,
  fetchYahooPrice,
  fetchCoinGeckoPrice,
  fetchPriceWithRetry,
  MAX_RETRIES,
  TIMEOUT_MS,
  CACHE_DURATION,
  MAX_CACHE_SIZE,
  type CacheEntry,
} from '../price-sources';

// =============================================================================
// Test Setup
// =============================================================================

// Mock logger to avoid console noise in tests
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// PriceCache Tests (5 tests)
// =============================================================================

describe('PriceCache', () => {
  let cache: PriceCache;

  beforeEach(() => {
    cache = new PriceCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should store and retrieve cached prices', () => {
    const symbol = 'AAPL';
    const entry: CacheEntry = {
      price: 150.25,
      timestamp: Date.now(),
      source: 'yahoo',
      metadata: { currency: 'USD' },
    };

    cache.set(symbol, entry);
    const cached = cache.get(symbol);

    expect(cached).toEqual(entry);
    expect(cached?.price).toBe(150.25);
    expect(cached?.metadata?.currency).toBe('USD');
  });

  it('should respect 5-minute TTL and invalidate expired entries', () => {
    const symbol = 'AAPL';
    const entry: CacheEntry = {
      price: 150.25,
      timestamp: Date.now(),
      source: 'yahoo',
    };

    cache.set(symbol, entry);

    // Advance time by 4 minutes - should still be cached
    vi.advanceTimersByTime(4 * 60 * 1000);
    expect(cache.get(symbol)).toEqual(entry);

    // Advance time by 2 more minutes (6 minutes total) - should be expired
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(cache.get(symbol)).toBeNull();
  });

  it('should return null for non-existent cache entries', () => {
    expect(cache.get('NONEXISTENT')).toBeNull();
    expect(cache.size).toBe(0);
  });

  it('should enforce cache size limit with LRU eviction', () => {
    // Fill cache to MAX_CACHE_SIZE
    for (let i = 0; i < MAX_CACHE_SIZE; i++) {
      cache.set(`SYMBOL${i}`, {
        price: i,
        timestamp: Date.now(),
        source: 'yahoo',
      });
    }

    expect(cache.size).toBe(MAX_CACHE_SIZE);

    // Re-set SYMBOL0 to move it to end (most recently used)
    cache.set('SYMBOL0', {
      price: 0,
      timestamp: Date.now(),
      source: 'yahoo',
    });

    // Add a new entry - should evict SYMBOL1 (first entry after re-added SYMBOL0)
    cache.set('NEW_SYMBOL', {
      price: 9999,
      timestamp: Date.now(),
      source: 'yahoo',
    });

    expect(cache.size).toBe(MAX_CACHE_SIZE);
    expect(cache.get('SYMBOL0')).not.toBeNull(); // Should still exist (recently set)
    expect(cache.get('SYMBOL1')).toBeNull(); // Should be evicted
    expect(cache.get('NEW_SYMBOL')).not.toBeNull(); // Should exist
  });

  it('should clear all cache entries', () => {
    cache.set('AAPL', { price: 150, timestamp: Date.now(), source: 'yahoo' });
    cache.set('GOOGL', { price: 2800, timestamp: Date.now(), source: 'yahoo' });

    expect(cache.size).toBe(2);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get('AAPL')).toBeNull();
    expect(cache.get('GOOGL')).toBeNull();
  });
});

// =============================================================================
// fetchYahooPrice Tests (4 tests)
// =============================================================================

describe('fetchYahooPrice', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch valid price from Yahoo Finance', async () => {
    const mockResponse = {
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: 150.25,
              currency: 'USD',
              previousClose: 148.5,
              marketState: 'REGULAR',
              regularMarketTime: 1640000000,
              exchangeName: 'NMS',
              fullExchangeName: 'NASDAQ',
            },
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchYahooPrice('AAPL');

    expect(result.price).toBe(150.25);
    expect(result.metadata?.currency).toBe('USD');
    expect(result.metadata?.marketState).toBe('REGULAR');
    expect(result.metadata?.previousClose).toBe(148.5);
    expect(result.metadata?.change).toBeCloseTo(1.75, 2);
    expect(result.metadata?.changePercent).toBeCloseTo(1.18, 1);
  });

  it('should convert GBp to GBP for UK stocks (.L suffix)', async () => {
    const mockResponse = {
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: 15025, // Price in pence
              currency: 'GBp',
              previousClose: 15000,
              marketState: 'REGULAR',
              regularMarketTime: 1640000000,
              exchangeName: 'LSE',
              fullExchangeName: 'London Stock Exchange',
            },
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchYahooPrice('VOD.L');

    // Should convert pence to pounds
    expect(result.price).toBe(150.25); // 15025 pence = 150.25 pounds
    expect(result.metadata?.currency).toBe('GBP'); // Display currency
    expect(result.metadata?.rawCurrency).toBe('GBp'); // Original currency
    expect(result.metadata?.previousClose).toBe(150); // Also converted
    expect(result.metadata?.change).toBeCloseTo(0.25, 2); // Change also converted
  });

  it('should handle network timeout errors', async () => {
    // Mock fetch to reject with abort error (simulating timeout)
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    global.fetch = vi.fn().mockRejectedValue(abortError);

    await expect(fetchYahooPrice('AAPL')).rejects.toThrow(
      'The operation was aborted'
    );
  });

  it('should throw error on invalid symbol or API error', async () => {
    const mockErrorResponse = {
      chart: {
        error: { description: 'No data found for symbol' },
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => mockErrorResponse,
    });

    await expect(fetchYahooPrice('INVALID_SYMBOL')).rejects.toThrow(
      'Yahoo Finance API error: 404'
    );
  });
});

// =============================================================================
// fetchCoinGeckoPrice Tests (3 tests)
// =============================================================================

describe('fetchCoinGeckoPrice', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should fetch crypto prices from CoinGecko', async () => {
    const mockResponse = {
      bitcoin: {
        usd: 42000.5,
        usd_24h_change: 2.5,
        last_updated_at: 1640000000,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchCoinGeckoPrice('BTC');

    expect(result.price).toBe(42000.5);
    expect(result.metadata?.currency).toBe('USD');
    expect(result.metadata?.change24h).toBe(2.5);
    expect(result.metadata?.lastUpdated).toBe(1640000000);
  });

  it('should handle network timeout errors', async () => {
    // Mock fetch to reject with abort error (simulating timeout)
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    global.fetch = vi.fn().mockRejectedValue(abortError);

    await expect(fetchCoinGeckoPrice('BTC')).rejects.toThrow(
      'The operation was aborted'
    );
  });

  it('should throw error for unsupported cryptocurrency', async () => {
    await expect(fetchCoinGeckoPrice('FAKECOIN')).rejects.toThrow(
      'Cryptocurrency FAKECOIN not supported'
    );

    expect(global.fetch).not.toHaveBeenCalled(); // Should fail before API call
  });
});

// =============================================================================
// fetchPriceWithRetry Tests (6 tests)
// =============================================================================

describe('fetchPriceWithRetry', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return price on first successful attempt', async () => {
    const mockResponse = {
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: 150.25,
              currency: 'USD',
              previousClose: 148.5,
            },
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchPriceWithRetry('AAPL');

    expect(result.price).toBe(150.25);
    expect(result.source).toBe('yahoo');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry with exponential backoff on failure', async () => {
    const mockErrorResponse = {
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: 150.25,
              currency: 'USD',
              previousClose: 148.5,
            },
          },
        ],
      },
    };

    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount < 3) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockErrorResponse,
      });
    });

    const promise = fetchPriceWithRetry('AAPL');

    // First attempt fails immediately
    await vi.advanceTimersByTimeAsync(0);

    // Second attempt after 1s delay (2^0 * 1000 = 1000ms)
    await vi.advanceTimersByTimeAsync(1000);

    // Third attempt after 2s delay (2^1 * 1000 = 2000ms)
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;

    expect(result.price).toBe(150.25);
    expect(callCount).toBe(3);
  });

  it('should use CoinGecko for cryptocurrency symbols', async () => {
    const coinGeckoSuccess = {
      bitcoin: {
        usd: 42000.5,
        usd_24h_change: 2.5,
        last_updated_at: 1640000000,
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => coinGeckoSuccess,
    });

    const result = await fetchPriceWithRetry('BTC');

    expect(result.price).toBe(42000.5);
    expect(result.source).toBe('coingecko');
    expect(result.metadata?.currency).toBe('USD');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should handle stock symbols (Yahoo only)', async () => {
    const mockResponse = {
      chart: {
        result: [
          {
            meta: {
              regularMarketPrice: 2800.5,
              currency: 'USD',
              previousClose: 2750.0,
            },
          },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchPriceWithRetry('GOOGL');

    expect(result.price).toBe(2800.5);
    expect(result.source).toBe('yahoo');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw error after all retries and sources exhausted', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error('All sources unavailable'));

    const promise = fetchPriceWithRetry('AAPL');

    // Wait for all retries (3 attempts with delays)
    for (let i = 0; i < MAX_RETRIES; i++) {
      await vi.advanceTimersByTimeAsync(0); // Attempt
      if (i < MAX_RETRIES - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        await vi.advanceTimersByTimeAsync(delay); // Backoff delay
      }
    }

    await expect(promise).rejects.toThrow(
      /Failed to fetch price for AAPL after 3 retries/
    );
    expect(global.fetch).toHaveBeenCalledTimes(MAX_RETRIES);
  });

  it('should handle malformed API responses gracefully', async () => {
    // Mock a response with missing data
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}), // Empty response
    });

    const promise = fetchPriceWithRetry('AAPL');

    // Wait for all retries
    for (let i = 0; i < MAX_RETRIES; i++) {
      await vi.advanceTimersByTimeAsync(0); // Attempt
      if (i < MAX_RETRIES - 1) {
        const delay = Math.min(1000 * Math.pow(2, i), 5000);
        await vi.advanceTimersByTimeAsync(delay); // Backoff delay
      }
    }

    await expect(promise).rejects.toThrow(/Failed to fetch price for AAPL/);
  });
});
