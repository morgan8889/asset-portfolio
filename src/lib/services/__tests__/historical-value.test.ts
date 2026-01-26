/**
 * Historical Value Service Tests
 *
 * Tests for portfolio value reconstruction over time.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from 'decimal.js';

// Mock the database queries
vi.mock('@/lib/db', () => ({
  transactionQueries: {
    getByPortfolio: vi.fn(),
  },
  priceQueries: {
    getHistoryForAsset: vi.fn(),
  },
  holdingQueries: {
    getByPortfolio: vi.fn(),
  },
  assetQueries: {
    getAll: vi.fn(),
  },
}));

import { getHistoricalValues, getValueAtDate } from '../historical-value';
import { transactionQueries, priceQueries } from '@/lib/db';

describe('getHistoricalValues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when portfolio has no transactions', async () => {
    vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue([]);

    const result = await getHistoricalValues('portfolio-1', 'MONTH');

    expect(result).toEqual([]);
  });

  it('calculates value points for a period with transactions', async () => {
    const mockTransactions = [
      {
        id: 'tx-1',
        portfolioId: 'portfolio-1',
        assetId: 'asset-1',
        type: 'buy',
        date: new Date('2024-01-01'),
        quantity: new Decimal('10'),
        price: new Decimal('100'),
        totalAmount: new Decimal('1000'),
        fees: new Decimal('0'),
        currency: 'USD',
      },
    ];

    const mockPriceHistory = [
      {
        id: 'price-1',
        assetId: 'asset-1',
        price: new Decimal('110'),
        timestamp: new Date('2024-01-15'),
        source: 'test',
      },
    ];

    vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue(
      mockTransactions as any
    );
    vi.mocked(priceQueries.getHistoryForAsset).mockResolvedValue(
      mockPriceHistory as any
    );

    const result = await getHistoricalValues('portfolio-1', 'WEEK');

    // Should have data points for the week
    expect(result.length).toBeGreaterThan(0);
    // Each point should have required properties
    result.forEach((point) => {
      expect(point).toHaveProperty('date');
      expect(point).toHaveProperty('totalValue');
      expect(point).toHaveProperty('change');
      expect(point).toHaveProperty('hasInterpolatedPrices');
    });
  });
});

describe('getValueAtDate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for portfolio with no transactions', async () => {
    vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue([]);

    const result = await getValueAtDate('portfolio-1', new Date());

    expect(result).toBeNull();
  });

  it('returns zero for date before any transactions', async () => {
    const mockTransactions = [
      {
        id: 'tx-1',
        portfolioId: 'portfolio-1',
        assetId: 'asset-1',
        type: 'buy',
        date: new Date('2024-06-01'),
        quantity: new Decimal('10'),
        price: new Decimal('100'),
        totalAmount: new Decimal('1000'),
        fees: new Decimal('0'),
        currency: 'USD',
      },
    ];

    vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue(
      mockTransactions as any
    );

    const result = await getValueAtDate('portfolio-1', new Date('2024-01-01'));

    expect(result).not.toBeNull();
    expect(result!.toString()).toBe('0');
  });
});
