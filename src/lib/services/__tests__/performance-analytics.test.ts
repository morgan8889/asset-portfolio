/**
 * Performance Analytics Service Tests
 *
 * Tests for the performance analytics service including summary statistics,
 * holding performance calculations, and CSV export functionality.
 *
 * @module services/__tests__/performance-analytics.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Decimal } from 'decimal.js';
import { subDays } from 'date-fns';
import {
  getAggregationLevel,
  getMaxDataPoints,
} from '../performance-analytics';

// Mock the database and snapshot service
vi.mock('@/lib/db/schema', () => ({
  db: {
    getHoldingsByPortfolio: vi.fn(),
    assets: {
      toArray: vi.fn(),
    },
  },
}));

vi.mock('../snapshot-service', () => ({
  getSnapshots: vi.fn(),
  getAggregatedSnapshots: vi.fn(),
}));

import { db } from '@/lib/db/schema';
import { getSnapshots, getAggregatedSnapshots } from '../snapshot-service';

describe('Performance Analytics Service', () => {
  const mockPortfolioId = 'test-portfolio-123';
  const today = new Date();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getAggregationLevel', () => {
    it('should return daily for periods <= 90 days', () => {
      const startDate = subDays(today, 30);
      expect(getAggregationLevel(startDate, today)).toBe('daily');
    });

    it('should return weekly for periods between 91-365 days', () => {
      const startDate = subDays(today, 180);
      expect(getAggregationLevel(startDate, today)).toBe('weekly');
    });

    it('should return monthly for periods > 365 days', () => {
      const startDate = subDays(today, 400);
      expect(getAggregationLevel(startDate, today)).toBe('monthly');
    });

    it('should return daily for exactly 90 days', () => {
      const startDate = subDays(today, 90);
      expect(getAggregationLevel(startDate, today)).toBe('daily');
    });

    it('should return weekly for exactly 365 days', () => {
      const startDate = subDays(today, 365);
      expect(getAggregationLevel(startDate, today)).toBe('weekly');
    });
  });

  describe('getMaxDataPoints', () => {
    it('should return 7 for TODAY period', () => {
      expect(getMaxDataPoints('TODAY')).toBe(7);
    });

    it('should return 7 for WEEK period', () => {
      expect(getMaxDataPoints('WEEK')).toBe(7);
    });

    it('should return 30 for MONTH period', () => {
      expect(getMaxDataPoints('MONTH')).toBe(30);
    });

    it('should return 90 for QUARTER period', () => {
      expect(getMaxDataPoints('QUARTER')).toBe(90);
    });

    it('should return 52 for YEAR period (weekly)', () => {
      expect(getMaxDataPoints('YEAR')).toBe(52);
    });

    it('should return 120 for ALL period (monthly)', () => {
      expect(getMaxDataPoints('ALL')).toBe(120);
    });
  });

  describe('getSummary', () => {
    it('should return null when no snapshots exist', async () => {
      vi.mocked(getSnapshots).mockResolvedValue([]);

      const { getSummary } = await import('../performance-analytics');
      const result = await getSummary(mockPortfolioId, 'MONTH');

      expect(result).toBeNull();
    });

    it('should calculate summary statistics from snapshots', async () => {
      const mockSnapshots = [
        {
          id: 'snap-1',
          portfolioId: mockPortfolioId,
          date: subDays(today, 5),
          totalValue: new Decimal(10000),
          totalCost: new Decimal(9000),
          dayChange: new Decimal(100),
          dayChangePercent: 1,
          cumulativeReturn: new Decimal(0.1111),
          twrReturn: new Decimal(0.05),
          holdingCount: 5,
          hasInterpolatedPrices: false,
          createdAt: today,
          updatedAt: today,
        },
        {
          id: 'snap-2',
          portfolioId: mockPortfolioId,
          date: subDays(today, 4),
          totalValue: new Decimal(10200),
          totalCost: new Decimal(9000),
          dayChange: new Decimal(200),
          dayChangePercent: 2,
          cumulativeReturn: new Decimal(0.1333),
          twrReturn: new Decimal(0.07),
          holdingCount: 5,
          hasInterpolatedPrices: false,
          createdAt: today,
          updatedAt: today,
        },
        {
          id: 'snap-3',
          portfolioId: mockPortfolioId,
          date: subDays(today, 3),
          totalValue: new Decimal(9800),
          totalCost: new Decimal(9000),
          dayChange: new Decimal(-400),
          dayChangePercent: -3.92,
          cumulativeReturn: new Decimal(0.0889),
          twrReturn: new Decimal(0.03),
          holdingCount: 5,
          hasInterpolatedPrices: false,
          createdAt: today,
          updatedAt: today,
        },
        {
          id: 'snap-4',
          portfolioId: mockPortfolioId,
          date: subDays(today, 2),
          totalValue: new Decimal(10500),
          totalCost: new Decimal(9000),
          dayChange: new Decimal(700),
          dayChangePercent: 7.14,
          cumulativeReturn: new Decimal(0.1667),
          twrReturn: new Decimal(0.1),
          holdingCount: 5,
          hasInterpolatedPrices: false,
          createdAt: today,
          updatedAt: today,
        },
      ];

      vi.mocked(getSnapshots).mockResolvedValue(mockSnapshots);

      const { getSummary } = await import('../performance-analytics');
      const result = await getSummary(mockPortfolioId, 'WEEK');

      expect(result).not.toBeNull();
      expect(result!.portfolioId).toBe(mockPortfolioId);
      expect(result!.period).toBe('WEEK');
      expect(result!.startValue.toNumber()).toBe(10000);
      expect(result!.endValue.toNumber()).toBe(10500);
      expect(result!.periodHigh.toNumber()).toBe(10500);
      expect(result!.periodLow.toNumber()).toBe(9800);
      expect(result!.bestDay.changePercent).toBe(7.14);
      expect(result!.worstDay.changePercent).toBe(-3.92);
    });
  });

  describe('getChartData', () => {
    it('should return empty array when no snapshots exist', async () => {
      vi.mocked(getAggregatedSnapshots).mockResolvedValue([]);

      const { getChartData } = await import('../performance-analytics');
      const result = await getChartData(mockPortfolioId, 'MONTH');

      expect(result).toEqual([]);
    });

    it('should transform snapshots to chart data points', async () => {
      const mockSnapshots = [
        {
          id: 'snap-1',
          portfolioId: mockPortfolioId,
          date: subDays(today, 2),
          totalValue: new Decimal(10000),
          totalCost: new Decimal(9000),
          dayChange: new Decimal(100),
          dayChangePercent: 1,
          cumulativeReturn: new Decimal(0.1111),
          twrReturn: new Decimal(0.05),
          holdingCount: 5,
          hasInterpolatedPrices: false,
          createdAt: today,
          updatedAt: today,
        },
        {
          id: 'snap-2',
          portfolioId: mockPortfolioId,
          date: subDays(today, 1),
          totalValue: new Decimal(10500),
          totalCost: new Decimal(9000),
          dayChange: new Decimal(500),
          dayChangePercent: 5,
          cumulativeReturn: new Decimal(0.1667),
          twrReturn: new Decimal(0.1),
          holdingCount: 5,
          hasInterpolatedPrices: true,
          createdAt: today,
          updatedAt: today,
        },
      ];

      vi.mocked(getAggregatedSnapshots).mockResolvedValue(mockSnapshots);

      const { getChartData } = await import('../performance-analytics');
      const result = await getChartData(mockPortfolioId, 'WEEK');

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(10000);
      expect(result[0].change).toBe(100);
      expect(result[0].changePercent).toBe(1);
      expect(result[0].hasInterpolatedPrices).toBe(false);
      expect(result[1].value).toBe(10500);
      expect(result[1].hasInterpolatedPrices).toBe(true);
    });
  });

  describe('getHoldingPerformance', () => {
    it('should return empty array when no holdings exist', async () => {
      vi.mocked(db.getHoldingsByPortfolio).mockResolvedValue([]);
      vi.mocked(db.assets.toArray).mockResolvedValue([]);

      const { getHoldingPerformance } = await import('../performance-analytics');
      const result = await getHoldingPerformance(mockPortfolioId, 'MONTH');

      expect(result).toEqual([]);
    });

    it('should calculate holding performance metrics', async () => {
      const mockHoldings = [
        {
          id: 'holding-1',
          portfolioId: mockPortfolioId,
          assetId: 'asset-1',
          quantity: new Decimal(100),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(12),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: today,
        },
        {
          id: 'holding-2',
          portfolioId: mockPortfolioId,
          assetId: 'asset-2',
          quantity: new Decimal(50),
          costBasis: new Decimal(2000),
          averageCost: new Decimal(36),
          currentValue: new Decimal(1800),
          unrealizedGain: new Decimal(-200),
          unrealizedGainPercent: -10,
          lots: [],
          lastUpdated: today,
        },
      ];

      const mockAssets = [
        { id: 'asset-1', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
        { id: 'asset-2', symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
      ];

      vi.mocked(db.getHoldingsByPortfolio).mockResolvedValue(mockHoldings);
      vi.mocked(db.assets.toArray).mockResolvedValue(mockAssets);

      const { getHoldingPerformance } = await import('../performance-analytics');
      const result = await getHoldingPerformance(mockPortfolioId, 'MONTH');

      expect(result).toHaveLength(2);

      // Check first holding
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].name).toBe('Apple Inc.');
      expect(result[0].costBasis.toNumber()).toBe(1000);
      expect(result[0].currentValue.toNumber()).toBe(1200);

      // Check second holding
      expect(result[1].symbol).toBe('GOOGL');
      expect(result[1].name).toBe('Alphabet Inc.');
    });
  });

  describe('exportToCSV', () => {
    it('should return empty string when no snapshots exist', async () => {
      vi.mocked(getSnapshots).mockResolvedValue([]);

      const { exportToCSV } = await import('../performance-analytics');
      const result = await exportToCSV(mockPortfolioId, 'MONTH');

      expect(result).toBe('');
    });

    it('should generate CSV with headers and data', async () => {
      const mockSnapshots = [
        {
          id: 'snap-1',
          portfolioId: mockPortfolioId,
          date: new Date('2024-01-15T12:00:00Z'),
          totalValue: new Decimal(10000),
          totalCost: new Decimal(9000),
          dayChange: new Decimal(100),
          dayChangePercent: 1,
          cumulativeReturn: new Decimal(0.1111),
          twrReturn: new Decimal(0.05),
          holdingCount: 5,
          hasInterpolatedPrices: false,
          createdAt: today,
          updatedAt: today,
        },
        {
          id: 'snap-2',
          portfolioId: mockPortfolioId,
          date: new Date('2024-01-16T12:00:00Z'),
          totalValue: new Decimal(10500),
          totalCost: new Decimal(9000),
          dayChange: new Decimal(500),
          dayChangePercent: 5,
          cumulativeReturn: new Decimal(0.1667),
          twrReturn: new Decimal(0.1),
          holdingCount: 5,
          hasInterpolatedPrices: false,
          createdAt: today,
          updatedAt: today,
        },
      ];

      vi.mocked(getSnapshots).mockResolvedValue(mockSnapshots);

      const { exportToCSV } = await import('../performance-analytics');
      const result = await exportToCSV(mockPortfolioId, 'MONTH');

      // Check headers
      expect(result).toContain('Date');
      expect(result).toContain('Portfolio Value');
      expect(result).toContain('Daily Change');
      expect(result).toContain('Daily Change %');
      expect(result).toContain('Cumulative Return %');

      // Check that data rows contain values (dates may vary due to timezone)
      expect(result).toContain('10000.00');
      expect(result).toContain('10500.00');
      expect(result).toContain('100.00');
      expect(result).toContain('500.00');
    });

    it('should include holdings when option is set', async () => {
      const mockSnapshots = [
        {
          id: 'snap-1',
          portfolioId: mockPortfolioId,
          date: new Date('2024-01-15'),
          totalValue: new Decimal(10000),
          totalCost: new Decimal(9000),
          dayChange: new Decimal(100),
          dayChangePercent: 1,
          cumulativeReturn: new Decimal(0.1111),
          twrReturn: new Decimal(0.05),
          holdingCount: 5,
          hasInterpolatedPrices: false,
          createdAt: today,
          updatedAt: today,
        },
      ];

      const mockHoldings = [
        {
          id: 'holding-1',
          portfolioId: mockPortfolioId,
          assetId: 'asset-1',
          quantity: new Decimal(100),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(12),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: today,
        },
      ];

      const mockAssets = [
        { id: 'asset-1', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
      ];

      vi.mocked(getSnapshots).mockResolvedValue(mockSnapshots);
      vi.mocked(db.getHoldingsByPortfolio).mockResolvedValue(mockHoldings);
      vi.mocked(db.assets.toArray).mockResolvedValue(mockAssets);

      const { exportToCSV } = await import('../performance-analytics');
      const result = await exportToCSV(mockPortfolioId, 'MONTH', { includeHoldings: true });

      expect(result).toContain('Holdings Performance');
      expect(result).toContain('AAPL');
      expect(result).toContain('Apple Inc.');
    });
  });
});
