/**
 * Tests for YTD return calculation
 * @module services/__tests__/ytd-return.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from 'decimal.js';
import { startOfYear } from 'date-fns';
import { calculateYtdReturn } from '../metrics-service';
import * as snapshotService from '../snapshot-service';

// Mock the snapshot-service module
vi.mock('../snapshot-service', () => ({
  getSnapshots: vi.fn(),
}));

// Helper function to create a mock snapshot with all required fields
function createMockSnapshot(overrides: any) {
  const date = overrides.date || new Date('2024-01-01');
  return {
    id: overrides.id || '1',
    portfolioId: overrides.portfolioId || 'portfolio-123',
    date,
    totalValue: overrides.totalValue || new Decimal(0),
    totalCost: overrides.totalCost || new Decimal(0),
    dayChange: overrides.dayChange || new Decimal(0),
    dayChangePercent: overrides.dayChangePercent || 0,
    periodReturn: overrides.periodReturn || 0,
    cumulativeReturn: overrides.cumulativeReturn || 0,
    twrReturn: overrides.twrReturn || 0,
    cashFlows: overrides.cashFlows || [],
    holdingCount: overrides.holdingCount || 0,
    hasInterpolatedPrices: overrides.hasInterpolatedPrices || false,
    createdAt: overrides.createdAt || date,
    updatedAt: overrides.updatedAt || date,
  };
}

describe('calculateYtdReturn', () => {
  const mockPortfolioId = 'portfolio-123';
  const currentDate = new Date('2024-06-15');
  const yearStart = startOfYear(currentDate);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('edge cases', () => {
    it('should return null when no snapshots available', async () => {
      vi.mocked(snapshotService.getSnapshots).mockResolvedValue([]);

      const result = await calculateYtdReturn(mockPortfolioId, currentDate);

      expect(result.return).toBeNull();
      expect(result.snapshotCount).toBe(0);
      expect(result.startDate).toEqual(yearStart);
      expect(result.endDate).toEqual(currentDate);
      expect(result.startValue).toBeUndefined();
      expect(result.endValue).toBeUndefined();
    });

    it('should return null when only 1 snapshot available', async () => {
      const singleSnapshot = createMockSnapshot({
        id: '1',
        portfolioId: mockPortfolioId,
        date: new Date('2024-01-01'),
        totalValue: new Decimal(10000),
        totalCost: new Decimal(10000),
        holdingCount: 5,
      });
      vi.mocked(snapshotService.getSnapshots).mockResolvedValue([
        singleSnapshot,
      ]);

      const result = await calculateYtdReturn(mockPortfolioId, currentDate);

      expect(result.return).toBeNull();
      expect(result.snapshotCount).toBe(1);
      expect(result.startValue).toBeUndefined();
      expect(result.endValue).toBeUndefined();
    });

    it('should return null when starting value is zero', async () => {
      const snapshots = [
        createMockSnapshot({
          id: '1',
          portfolioId: mockPortfolioId,
          date: new Date('2024-01-01'),
          totalValue: new Decimal(0), // Zero starting value
          totalCost: new Decimal(0),
          holdingCount: 0,
        }),
        createMockSnapshot({
          id: '2',
          portfolioId: mockPortfolioId,
          date: new Date('2024-06-15'),
          totalValue: new Decimal(10000),
          totalCost: new Decimal(10000),
          holdingCount: 5,
        }),
      ];
      vi.mocked(snapshotService.getSnapshots).mockResolvedValue(snapshots);

      const result = await calculateYtdReturn(mockPortfolioId, currentDate);

      expect(result.return).toBeNull();
      expect(result.snapshotCount).toBe(2);
      expect(result.startValue).toEqual(new Decimal(0));
      expect(result.endValue).toEqual(new Decimal(10000));
    });
  });

  describe('positive returns', () => {
    it('should calculate positive YTD return correctly', async () => {
      const snapshots = [
        createMockSnapshot({
          id: '1',
          portfolioId: mockPortfolioId,
          date: new Date('2024-01-01'),
          totalValue: new Decimal(10000),
          totalCost: new Decimal(10000),
          holdingCount: 5,
        }),
        createMockSnapshot({
          id: '2',
          portfolioId: mockPortfolioId,
          date: new Date('2024-06-15'),
          totalValue: new Decimal(12500), // 25% gain
          totalCost: new Decimal(10000),
          dayChange: new Decimal(100),
          dayChangePercent: 0.8,
          periodReturn: 0.8,
          cumulativeReturn: 25,
          holdingCount: 5,
        }),
      ];
      vi.mocked(snapshotService.getSnapshots).mockResolvedValue(snapshots);

      const result = await calculateYtdReturn(mockPortfolioId, currentDate);

      expect(result.return).toBe(25);
      expect(result.snapshotCount).toBe(2);
      expect(result.startValue).toEqual(new Decimal(10000));
      expect(result.endValue).toEqual(new Decimal(12500));
    });

    it('should handle small positive returns with precision', async () => {
      const snapshots = [
        createMockSnapshot({
          id: '1',
          portfolioId: mockPortfolioId,
          date: new Date('2024-01-01'),
          totalValue: new Decimal(100000),
          totalCost: new Decimal(100000),
          holdingCount: 10,
        }),
        createMockSnapshot({
          id: '2',
          portfolioId: mockPortfolioId,
          date: new Date('2024-06-15'),
          totalValue: new Decimal(100250), // 0.25% gain
          totalCost: new Decimal(100000),
          dayChange: new Decimal(10),
          dayChangePercent: 0.01,
          periodReturn: 0.01,
          cumulativeReturn: 0.25,
          holdingCount: 10,
        }),
      ];
      vi.mocked(snapshotService.getSnapshots).mockResolvedValue(snapshots);

      const result = await calculateYtdReturn(mockPortfolioId, currentDate);

      expect(result.return).toBe(0.25);
    });
  });

  describe('negative returns', () => {
    it('should calculate negative YTD return correctly', async () => {
      const snapshots = [
        createMockSnapshot({
          id: '1',
          portfolioId: mockPortfolioId,
          date: new Date('2024-01-01'),
          totalValue: new Decimal(10000),
          totalCost: new Decimal(10000),
          holdingCount: 5,
        }),
        createMockSnapshot({
          id: '2',
          portfolioId: mockPortfolioId,
          date: new Date('2024-06-15'),
          totalValue: new Decimal(8000), // 20% loss
          totalCost: new Decimal(10000),
          dayChange: new Decimal(-50),
          dayChangePercent: -0.62,
          periodReturn: -0.62,
          cumulativeReturn: -20,
          holdingCount: 5,
        }),
      ];
      vi.mocked(snapshotService.getSnapshots).mockResolvedValue(snapshots);

      const result = await calculateYtdReturn(mockPortfolioId, currentDate);

      expect(result.return).toBe(-20);
      expect(result.startValue).toEqual(new Decimal(10000));
      expect(result.endValue).toEqual(new Decimal(8000));
    });

    it('should handle large negative returns', async () => {
      const snapshots = [
        createMockSnapshot({
          id: '1',
          portfolioId: mockPortfolioId,
          date: new Date('2024-01-01'),
          totalValue: new Decimal(100000),
          totalCost: new Decimal(100000),
          holdingCount: 10,
        }),
        createMockSnapshot({
          id: '2',
          portfolioId: mockPortfolioId,
          date: new Date('2024-06-15'),
          totalValue: new Decimal(10000), // 90% loss
          totalCost: new Decimal(100000),
          dayChange: new Decimal(-1000),
          dayChangePercent: -9.09,
          periodReturn: -9.09,
          cumulativeReturn: -90,
          holdingCount: 10,
        }),
      ];
      vi.mocked(snapshotService.getSnapshots).mockResolvedValue(snapshots);

      const result = await calculateYtdReturn(mockPortfolioId, currentDate);

      expect(result.return).toBe(-90);
    });
  });

  describe('multiple snapshots', () => {
    it('should use first and last snapshot regardless of intermediate values', async () => {
      const snapshots = [
        createMockSnapshot({
          id: '1',
          portfolioId: mockPortfolioId,
          date: new Date('2024-01-01'),
          totalValue: new Decimal(10000),
          totalCost: new Decimal(10000),
          holdingCount: 5,
        }),
        createMockSnapshot({
          id: '2',
          portfolioId: mockPortfolioId,
          date: new Date('2024-03-01'),
          totalValue: new Decimal(15000), // Mid-period high
          totalCost: new Decimal(10000),
          dayChange: new Decimal(500),
          dayChangePercent: 3.45,
          periodReturn: 3.45,
          cumulativeReturn: 50,
          holdingCount: 5,
        }),
        createMockSnapshot({
          id: '3',
          portfolioId: mockPortfolioId,
          date: new Date('2024-04-01'),
          totalValue: new Decimal(7000), // Mid-period low
          totalCost: new Decimal(10000),
          dayChange: new Decimal(-8000),
          dayChangePercent: -53.33,
          periodReturn: -53.33,
          cumulativeReturn: -30,
          holdingCount: 5,
        }),
        createMockSnapshot({
          id: '4',
          portfolioId: mockPortfolioId,
          date: new Date('2024-06-15'),
          totalValue: new Decimal(11000), // Final value
          totalCost: new Decimal(10000),
          dayChange: new Decimal(100),
          dayChangePercent: 0.92,
          periodReturn: 0.92,
          cumulativeReturn: 10,
          holdingCount: 5,
        }),
      ];
      vi.mocked(snapshotService.getSnapshots).mockResolvedValue(snapshots);

      const result = await calculateYtdReturn(mockPortfolioId, currentDate);

      // Should calculate (11000 - 10000) / 10000 * 100 = 10%
      expect(result.return).toBe(10);
      expect(result.snapshotCount).toBe(4);
      expect(result.startValue).toEqual(new Decimal(10000));
      expect(result.endValue).toEqual(new Decimal(11000));
    });
  });

  describe('mid-year portfolio creation', () => {
    it('should calculate return from first available snapshot (since inception)', async () => {
      // Portfolio created in March, so first snapshot is March 15
      const midYearSnapshots = [
        createMockSnapshot({
          id: '1',
          portfolioId: mockPortfolioId,
          date: new Date('2024-03-15'), // Created mid-year
          totalValue: new Decimal(5000),
          totalCost: new Decimal(5000),
          holdingCount: 3,
        }),
        createMockSnapshot({
          id: '2',
          portfolioId: mockPortfolioId,
          date: new Date('2024-06-15'),
          totalValue: new Decimal(6000), // 20% gain since March
          totalCost: new Decimal(5000),
          dayChange: new Decimal(50),
          dayChangePercent: 0.84,
          periodReturn: 0.84,
          cumulativeReturn: 20,
          holdingCount: 3,
        }),
      ];
      vi.mocked(snapshotService.getSnapshots).mockResolvedValue(
        midYearSnapshots
      );

      const result = await calculateYtdReturn(mockPortfolioId, currentDate);

      // This is actually "since inception" return, not true YTD
      expect(result.return).toBe(20);
      expect(result.snapshotCount).toBe(2);
      expect(result.startValue).toEqual(new Decimal(5000));
      expect(result.endValue).toEqual(new Decimal(6000));
      // Note: The startDate in the result is still Jan 1, but the first snapshot is March 15
      expect(result.startDate).toEqual(yearStart);
    });
  });

  describe('date parameter handling', () => {
    it('should use current date when not provided', async () => {
      const snapshots = [
        createMockSnapshot({
          id: '1',
          portfolioId: mockPortfolioId,
          date: startOfYear(new Date()),
          totalValue: new Decimal(10000),
          totalCost: new Decimal(10000),
          holdingCount: 5,
        }),
        createMockSnapshot({
          id: '2',
          portfolioId: mockPortfolioId,
          date: new Date(),
          totalValue: new Decimal(11000),
          totalCost: new Decimal(10000),
          dayChange: new Decimal(100),
          dayChangePercent: 0.92,
          periodReturn: 0.92,
          cumulativeReturn: 10,
          holdingCount: 5,
        }),
      ];
      vi.mocked(snapshotService.getSnapshots).mockResolvedValue(snapshots);

      const result = await calculateYtdReturn(mockPortfolioId);

      expect(result.return).toBe(10);
      expect(snapshotService.getSnapshots).toHaveBeenCalledWith(
        mockPortfolioId,
        startOfYear(new Date()),
        expect.any(Date)
      );
    });
  });
});
