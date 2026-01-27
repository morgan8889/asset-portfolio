/**
 * Benchmark Service Tests
 *
 * Tests for benchmark data fetching, caching, and comparison functionality.
 *
 * @module services/__tests__/benchmark-service
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Decimal } from 'decimal.js';

import {
  getSupportedBenchmarks,
  calculateBenchmarkReturn,
  SUPPORTED_BENCHMARKS,
} from '../benchmark-service';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the database
vi.mock('@/lib/db/schema', () => ({
  db: {
    priceHistory: {
      where: vi.fn().mockReturnValue({
        between: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      bulkPut: vi.fn().mockResolvedValue(undefined),
    },
    assets: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    },
    getHoldingsByPortfolio: vi.fn().mockResolvedValue([]),
  },
}));

// Mock snapshot service
vi.mock('../snapshot-service', () => ({
  getSnapshots: vi.fn().mockResolvedValue([]),
}));

describe('benchmark-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Only clear call history, don't reset implementations
    vi.clearAllMocks();
  });

  describe('getSupportedBenchmarks', () => {
    it('returns list of supported benchmarks', () => {
      const benchmarks = getSupportedBenchmarks();

      expect(benchmarks).toHaveLength(3);
      expect(benchmarks[0].symbol).toBe('^GSPC');
      expect(benchmarks[0].name).toBe('S&P 500');
    });

    it('includes S&P 500, Dow Jones, and NASDAQ', () => {
      const benchmarks = getSupportedBenchmarks();
      const symbols = benchmarks.map((b) => b.symbol);

      expect(symbols).toContain('^GSPC');
      expect(symbols).toContain('^DJI');
      expect(symbols).toContain('^IXIC');
    });

    it('each benchmark has required properties', () => {
      const benchmarks = getSupportedBenchmarks();

      for (const benchmark of benchmarks) {
        expect(benchmark).toHaveProperty('symbol');
        expect(benchmark).toHaveProperty('name');
        expect(benchmark).toHaveProperty('description');
        expect(typeof benchmark.symbol).toBe('string');
        expect(typeof benchmark.name).toBe('string');
        expect(typeof benchmark.description).toBe('string');
      }
    });
  });

  describe('SUPPORTED_BENCHMARKS', () => {
    it('S&P 500 has correct symbol', () => {
      const sp500 = SUPPORTED_BENCHMARKS.find((b) => b.name === 'S&P 500');
      expect(sp500).toBeDefined();
      expect(sp500?.symbol).toBe('^GSPC');
    });

    it('Dow Jones has correct symbol', () => {
      const dji = SUPPORTED_BENCHMARKS.find((b) => b.name === 'Dow Jones');
      expect(dji).toBeDefined();
      expect(dji?.symbol).toBe('^DJI');
    });

    it('NASDAQ has correct symbol', () => {
      const nasdaq = SUPPORTED_BENCHMARKS.find((b) =>
        b.name.includes('NASDAQ')
      );
      expect(nasdaq).toBeDefined();
      expect(nasdaq?.symbol).toBe('^IXIC');
    });
  });

  describe('calculateBenchmarkReturn', () => {
    it('returns 0 when no data available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            chart: {
              result: [
                {
                  timestamp: [],
                  indicators: { quote: [{ close: [] }] },
                },
              ],
            },
          }),
      });

      const result = await calculateBenchmarkReturn(
        '^GSPC',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toBe(0);
    });

    it('calculates positive return correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock response in the format returned by the /api/benchmark route
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            timestamps: [
              Math.floor(startDate.getTime() / 1000),
              Math.floor(endDate.getTime() / 1000),
            ],
            closes: [100, 110],
          }),
      });

      const result = await calculateBenchmarkReturn(
        '^GSPC',
        startDate,
        endDate
      );

      expect(result).toBeCloseTo(10, 1); // 10% return
    });

    it('calculates negative return correctly', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      // Mock response in the format returned by the /api/benchmark route
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            timestamps: [
              Math.floor(startDate.getTime() / 1000),
              Math.floor(endDate.getTime() / 1000),
            ],
            closes: [100, 90],
          }),
      });

      const result = await calculateBenchmarkReturn(
        '^GSPC',
        startDate,
        endDate
      );

      expect(result).toBeCloseTo(-10, 1); // -10% return
    });

    it('handles API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await calculateBenchmarkReturn(
        '^GSPC',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toBe(0);
    });

    it('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await calculateBenchmarkReturn(
        '^GSPC',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toBe(0);
    });

    it('handles malformed API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ chart: null }),
      });

      const result = await calculateBenchmarkReturn(
        '^GSPC',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      expect(result).toBe(0);
    });
  });

  describe('benchmark symbol validation', () => {
    it('recognizes valid index symbols starting with ^', () => {
      const validSymbols = ['^GSPC', '^DJI', '^IXIC'];

      for (const symbol of validSymbols) {
        expect(symbol.startsWith('^')).toBe(true);
      }
    });

    it('all supported benchmarks have valid symbols', () => {
      for (const benchmark of SUPPORTED_BENCHMARKS) {
        expect(benchmark.symbol.startsWith('^')).toBe(true);
      }
    });
  });
});
