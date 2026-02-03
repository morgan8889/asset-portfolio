/**
 * Net Worth Service Unit Tests
 *
 * Tests net worth calculation including:
 * - Asset valuation using price history
 * - Liability balance inclusion/exclusion based on start dates
 * - Historical net worth time series generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Decimal } from 'decimal.js';

// Mock database before importing the service
vi.mock('@/lib/db/schema', () => ({
  db: {
    getHoldingsByPortfolio: vi.fn(() => Promise.resolve([])),
    getLiabilitiesByPortfolio: vi.fn(() => Promise.resolve([])),
    assets: {
      bulkGet: vi.fn(() => Promise.resolve([])),
    },
    getPriceHistoryByAsset: vi.fn(() => Promise.resolve([])),
    getLiabilityPayments: vi.fn(() => Promise.resolve([])),
  },
}));

import {
  getNetWorthHistory,
  getCurrentNetWorth,
} from '../net-worth-service';
import { db } from '@/lib/db/schema';

describe('getNetWorthHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return monthly data points even with no holdings or liabilities', async () => {
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-03-31');

    const history = await getNetWorthHistory('portfolio-1', startDate, endDate);

    // Should have 3 months: Jan, Feb, Mar
    expect(history.length).toBe(3);
    expect(history[0].assets).toBe(0);
    expect(history[0].liabilities).toBe(0);
    expect(history[0].netWorth).toBe(0);
  });

  it('should calculate asset values from holdings and price history', async () => {
    const holdingId = 'holding-1';
    const assetId = 'asset-1';

    vi.mocked(db.getHoldingsByPortfolio).mockResolvedValue([
      {
        id: holdingId,
        portfolioId: 'portfolio-1',
        assetId,
        quantity: 10,
        averageCost: 100,
        ownershipPercentage: 100,
      } as any,
    ]);

    vi.mocked(db.getLiabilitiesByPortfolio).mockResolvedValue([]);

    vi.mocked(db.assets.bulkGet).mockResolvedValue([
      {
        id: assetId,
        symbol: 'AAPL',
        name: 'Apple',
        currentPrice: 150,
      } as any,
    ]);

    vi.mocked(db.getPriceHistoryByAsset).mockResolvedValue([
      { assetId, date: '2025-01-15', close: 140, open: 138, high: 142, low: 137, volume: 1000 },
      { assetId, date: '2025-02-15', close: 150, open: 145, high: 155, low: 143, volume: 1200 },
    ] as any);

    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-02-28');

    const history = await getNetWorthHistory('portfolio-1', startDate, endDate);

    expect(history.length).toBe(2);
    // Jan 31: most recent price on or before is Jan 15 (140), 10 shares = 1400
    expect(history[0].assets).toBe(1400);
    // Feb 28: most recent price on or before is Feb 15 (150), 10 shares = 1500
    expect(history[1].assets).toBe(1500);
  });

  it('should skip liabilities whose start date is after the calculation date', async () => {
    vi.mocked(db.getHoldingsByPortfolio).mockResolvedValue([]);

    // Liability starts in March 2025 - should NOT appear in Jan/Feb calculations
    vi.mocked(db.getLiabilitiesByPortfolio).mockResolvedValue([
      {
        id: 'liability-1',
        portfolioId: 'portfolio-1',
        name: 'Car Loan',
        balance: 20000,
        interestRate: 0.05,
        payment: 500,
        startDate: '2025-03-01',
        createdAt: '2025-03-01',
        updatedAt: '2025-03-01',
      },
    ]);

    vi.mocked(db.assets.bulkGet).mockResolvedValue([]);
    vi.mocked(db.getLiabilityPayments).mockResolvedValue([]);

    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-04-30');

    const history = await getNetWorthHistory('portfolio-1', startDate, endDate);

    // Jan and Feb: liability didn't exist yet, liabilities should be 0
    expect(history[0].liabilities).toBe(0); // Jan
    expect(history[1].liabilities).toBe(0); // Feb

    // Mar and Apr: liability exists, should show balance
    expect(history[2].liabilities).toBe(20000); // Mar
    expect(history[3].liabilities).toBe(20000); // Apr
  });

  it('should not throw when liabilities have start dates after history range start', async () => {
    vi.mocked(db.getHoldingsByPortfolio).mockResolvedValue([]);

    // Liability starts in 2025, but history goes back to 2020
    vi.mocked(db.getLiabilitiesByPortfolio).mockResolvedValue([
      {
        id: 'liability-1',
        portfolioId: 'portfolio-1',
        name: 'Mortgage',
        balance: 300000,
        interestRate: 0.045,
        payment: 1500,
        startDate: '2025-01-15',
        createdAt: '2025-01-15',
        updatedAt: '2025-01-15',
      },
    ]);

    vi.mocked(db.assets.bulkGet).mockResolvedValue([]);
    vi.mocked(db.getLiabilityPayments).mockResolvedValue([]);

    const startDate = new Date('2020-01-01');
    const endDate = new Date('2025-06-30');

    // This should NOT throw - it was the original bug
    await expect(
      getNetWorthHistory('portfolio-1', startDate, endDate)
    ).resolves.not.toThrow();

    const history = await getNetWorthHistory('portfolio-1', startDate, endDate);

    // All months before 2025-01-15 should have 0 liabilities
    const preLiabilityMonths = history.filter(
      (p) => p.date < new Date('2025-01-15')
    );
    for (const point of preLiabilityMonths) {
      expect(point.liabilities).toBe(0);
    }

    // Months from Feb 2025 onward should include the liability
    const postLiabilityMonths = history.filter(
      (p) => p.date >= new Date('2025-01-31')
    );
    expect(postLiabilityMonths.length).toBeGreaterThan(0);
    for (const point of postLiabilityMonths) {
      expect(point.liabilities).toBe(300000);
    }
  });

  it('should handle mix of holdings and liabilities correctly', async () => {
    const assetId = 'asset-1';

    vi.mocked(db.getHoldingsByPortfolio).mockResolvedValue([
      {
        id: 'holding-1',
        portfolioId: 'portfolio-1',
        assetId,
        quantity: 100,
        averageCost: 50,
        ownershipPercentage: 100,
      } as any,
    ]);

    vi.mocked(db.getLiabilitiesByPortfolio).mockResolvedValue([
      {
        id: 'liability-1',
        portfolioId: 'portfolio-1',
        name: 'Loan',
        balance: 5000,
        interestRate: 0.05,
        payment: 200,
        startDate: '2025-01-01',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ]);

    vi.mocked(db.assets.bulkGet).mockResolvedValue([
      { id: assetId, symbol: 'VTI', name: 'Vanguard Total', currentPrice: 200 } as any,
    ]);

    vi.mocked(db.getPriceHistoryByAsset).mockResolvedValue([
      { assetId, date: '2025-01-10', close: 200, open: 198, high: 202, low: 197, volume: 500 },
    ] as any);

    vi.mocked(db.getLiabilityPayments).mockResolvedValue([]);

    const startDate = new Date('2025-01-01');
    const endDate = new Date('2025-01-31');

    const history = await getNetWorthHistory('portfolio-1', startDate, endDate);

    expect(history.length).toBe(1);
    // Assets: 100 shares * $200 = $20,000
    expect(history[0].assets).toBe(20000);
    // Liabilities: $5,000
    expect(history[0].liabilities).toBe(5000);
    // Net worth: $20,000 - $5,000 = $15,000
    expect(history[0].netWorth).toBe(15000);
  });
});

describe('getCurrentNetWorth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 0 for empty portfolio', async () => {
    vi.mocked(db.getHoldingsByPortfolio).mockResolvedValue([]);
    vi.mocked(db.getLiabilitiesByPortfolio).mockResolvedValue([]);
    vi.mocked(db.assets.bulkGet).mockResolvedValue([]);

    const netWorth = await getCurrentNetWorth('portfolio-1');
    expect(netWorth).toBe(0);
  });
});
