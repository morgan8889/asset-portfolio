/**
 * Snapshot Service Tests
 *
 * Tests for performance snapshot computation and persistence.
 * Uses mocked database and price lookups.
 *
 * @module services/__tests__/snapshot-service.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Decimal } from 'decimal.js';
import { subDays, addDays, startOfDay } from 'date-fns';

// Mock the database
vi.mock('@/lib/db/schema', () => ({
  db: {
    getPerformanceSnapshotsByPortfolio: vi.fn(),
    getLatestPerformanceSnapshot: vi.fn(),
    upsertPerformanceSnapshot: vi.fn(),
    deletePerformanceSnapshotsByPortfolio: vi.fn(),
    deletePerformanceSnapshotsFromDate: vi.fn(),
  },
}));

// Mock transaction queries
vi.mock('@/lib/db', () => ({
  transactionQueries: {
    getByPortfolio: vi.fn(),
  },
}));

// Mock price lookup
vi.mock('../price-lookup', () => ({
  getPriceAtDate: vi.fn(),
  createPriceCache: vi.fn(() => new Map()),
}));

import { db } from '@/lib/db/schema';
import { transactionQueries } from '@/lib/db';
import { getPriceAtDate, createPriceCache } from '../price-lookup';
import {
  getSnapshots,
  getLatestSnapshot,
  computeSnapshots,
  recomputeAll,
  deleteSnapshots,
  handleSnapshotTrigger,
  needsComputation,
  getAggregatedSnapshots,
} from '../snapshot-service';
import { Transaction } from '@/types';
import { PerformanceSnapshot } from '@/types/performance';

describe('Snapshot Service', () => {
  const mockPortfolioId = 'test-portfolio-123';
  const today = startOfDay(new Date());

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getSnapshots', () => {
    it('should return snapshots within date range', async () => {
      const mockSnapshots: PerformanceSnapshot[] = [
        {
          id: 'snap-1',
          portfolioId: mockPortfolioId,
          date: subDays(today, 2),
          totalValue: new Decimal(10000),
          totalCost: new Decimal(9000),
          dayChange: new Decimal(100),
          dayChangePercent: 1,
          cumulativeReturn: new Decimal(0.1111),
          twrReturn: new Decimal(0.1),
          holdingCount: 5,
          hasInterpolatedPrices: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(db.getPerformanceSnapshotsByPortfolio).mockResolvedValue(mockSnapshots);

      const result = await getSnapshots(
        mockPortfolioId,
        subDays(today, 7),
        today
      );

      expect(result).toEqual(mockSnapshots);
      expect(db.getPerformanceSnapshotsByPortfolio).toHaveBeenCalledWith(
        mockPortfolioId,
        subDays(today, 7),
        today
      );
    });
  });

  describe('getLatestSnapshot', () => {
    it('should return the latest snapshot', async () => {
      const mockSnapshot: PerformanceSnapshot = {
        id: 'snap-1',
        portfolioId: mockPortfolioId,
        date: subDays(today, 1),
        totalValue: new Decimal(10000),
        totalCost: new Decimal(9000),
        dayChange: new Decimal(100),
        dayChangePercent: 1,
        cumulativeReturn: new Decimal(0.1111),
        twrReturn: new Decimal(0.1),
        holdingCount: 5,
        hasInterpolatedPrices: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(db.getLatestPerformanceSnapshot).mockResolvedValue(mockSnapshot);

      const result = await getLatestSnapshot(mockPortfolioId);

      expect(result).toEqual(mockSnapshot);
    });

    it('should return null if no snapshots exist', async () => {
      vi.mocked(db.getLatestPerformanceSnapshot).mockResolvedValue(null);

      const result = await getLatestSnapshot(mockPortfolioId);

      expect(result).toBeNull();
    });
  });

  describe('computeSnapshots', () => {
    it('should delete snapshots if no transactions exist', async () => {
      vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue([]);

      await computeSnapshots(mockPortfolioId, subDays(today, 7), today);

      expect(db.deletePerformanceSnapshotsByPortfolio).toHaveBeenCalledWith(mockPortfolioId);
      expect(db.upsertPerformanceSnapshot).not.toHaveBeenCalled();
    });

    it('should compute snapshots for date range with transactions', async () => {
      const mockTransactions: Transaction[] = [
        {
          id: 'tx-1',
          portfolioId: mockPortfolioId,
          assetId: 'asset-1',
          type: 'buy',
          date: subDays(today, 5),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ];

      vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue(mockTransactions);
      vi.mocked(db.getPerformanceSnapshotsByPortfolio).mockResolvedValue([]);
      vi.mocked(getPriceAtDate).mockResolvedValue({
        price: new Decimal(110),
        isInterpolated: false,
      });

      await computeSnapshots(mockPortfolioId, subDays(today, 5), today);

      // Should create snapshots for each day
      expect(db.upsertPerformanceSnapshot).toHaveBeenCalled();
    });

    it('should handle multiple assets', async () => {
      const mockTransactions: Transaction[] = [
        {
          id: 'tx-1',
          portfolioId: mockPortfolioId,
          assetId: 'asset-1',
          type: 'buy',
          date: subDays(today, 3),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
        {
          id: 'tx-2',
          portfolioId: mockPortfolioId,
          assetId: 'asset-2',
          type: 'buy',
          date: subDays(today, 3),
          quantity: new Decimal(5),
          price: new Decimal(200),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ];

      vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue(mockTransactions);
      vi.mocked(db.getPerformanceSnapshotsByPortfolio).mockResolvedValue([]);
      vi.mocked(getPriceAtDate).mockImplementation(async (assetId) => ({
        price: assetId === 'asset-1' ? new Decimal(110) : new Decimal(220),
        isInterpolated: false,
      }));

      await computeSnapshots(mockPortfolioId, subDays(today, 3), today);

      expect(db.upsertPerformanceSnapshot).toHaveBeenCalled();
    });
  });

  describe('recomputeAll', () => {
    it('should delete and recompute all snapshots', async () => {
      const mockTransactions: Transaction[] = [
        {
          id: 'tx-1',
          portfolioId: mockPortfolioId,
          assetId: 'asset-1',
          type: 'buy',
          date: subDays(today, 30),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ];

      vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue(mockTransactions);
      vi.mocked(db.getPerformanceSnapshotsByPortfolio).mockResolvedValue([]);
      vi.mocked(getPriceAtDate).mockResolvedValue({
        price: new Decimal(110),
        isInterpolated: false,
      });

      await recomputeAll(mockPortfolioId);

      expect(db.deletePerformanceSnapshotsByPortfolio).toHaveBeenCalledWith(mockPortfolioId);
      expect(db.upsertPerformanceSnapshot).toHaveBeenCalled();
    });

    it('should do nothing if no transactions', async () => {
      vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue([]);

      await recomputeAll(mockPortfolioId);

      expect(db.deletePerformanceSnapshotsByPortfolio).toHaveBeenCalledWith(mockPortfolioId);
      expect(db.upsertPerformanceSnapshot).not.toHaveBeenCalled();
    });
  });

  describe('deleteSnapshots', () => {
    it('should delete all snapshots for portfolio', async () => {
      await deleteSnapshots(mockPortfolioId);

      expect(db.deletePerformanceSnapshotsByPortfolio).toHaveBeenCalledWith(mockPortfolioId);
    });
  });

  describe('handleSnapshotTrigger', () => {
    beforeEach(() => {
      vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue([
        {
          id: 'tx-1',
          portfolioId: mockPortfolioId,
          assetId: 'asset-1',
          type: 'buy',
          date: subDays(today, 5),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ]);
      vi.mocked(db.getPerformanceSnapshotsByPortfolio).mockResolvedValue([]);
      vi.mocked(getPriceAtDate).mockResolvedValue({
        price: new Decimal(110),
        isInterpolated: false,
      });
    });

    it('should handle TRANSACTION_ADDED event', async () => {
      await handleSnapshotTrigger({
        type: 'TRANSACTION_ADDED',
        portfolioId: mockPortfolioId,
        date: subDays(today, 3),
      });

      expect(db.upsertPerformanceSnapshot).toHaveBeenCalled();
    });

    it('should handle TRANSACTION_MODIFIED event', async () => {
      await handleSnapshotTrigger({
        type: 'TRANSACTION_MODIFIED',
        portfolioId: mockPortfolioId,
        oldDate: subDays(today, 5),
        newDate: subDays(today, 3),
      });

      expect(db.upsertPerformanceSnapshot).toHaveBeenCalled();
    });

    it('should handle TRANSACTION_DELETED event', async () => {
      await handleSnapshotTrigger({
        type: 'TRANSACTION_DELETED',
        portfolioId: mockPortfolioId,
        date: subDays(today, 3),
      });

      expect(db.upsertPerformanceSnapshot).toHaveBeenCalled();
    });

    it('should handle MANUAL_REFRESH event', async () => {
      await handleSnapshotTrigger({
        type: 'MANUAL_REFRESH',
        portfolioId: mockPortfolioId,
      });

      expect(db.deletePerformanceSnapshotsByPortfolio).toHaveBeenCalledWith(mockPortfolioId);
    });
  });

  describe('needsComputation', () => {
    it('should return false if no transactions', async () => {
      vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue([]);

      const result = await needsComputation(mockPortfolioId);

      expect(result).toBe(false);
    });

    it('should return true if transactions but no snapshots', async () => {
      vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue([
        {
          id: 'tx-1',
          portfolioId: mockPortfolioId,
          assetId: 'asset-1',
          type: 'buy',
          date: subDays(today, 5),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ]);
      vi.mocked(db.getLatestPerformanceSnapshot).mockResolvedValue(null);

      const result = await needsComputation(mockPortfolioId);

      expect(result).toBe(true);
    });

    it('should return true if latest snapshot is stale', async () => {
      vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue([
        {
          id: 'tx-1',
          portfolioId: mockPortfolioId,
          assetId: 'asset-1',
          type: 'buy',
          date: subDays(today, 5),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ]);
      vi.mocked(db.getLatestPerformanceSnapshot).mockResolvedValue({
        id: 'snap-1',
        portfolioId: mockPortfolioId,
        date: subDays(today, 3), // 3 days old
        totalValue: new Decimal(10000),
        totalCost: new Decimal(9000),
        dayChange: new Decimal(100),
        dayChangePercent: 1,
        cumulativeReturn: new Decimal(0.1111),
        twrReturn: new Decimal(0.1),
        holdingCount: 5,
        hasInterpolatedPrices: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await needsComputation(mockPortfolioId);

      expect(result).toBe(true);
    });

    it('should return false if snapshots are up to date', async () => {
      vi.mocked(transactionQueries.getByPortfolio).mockResolvedValue([
        {
          id: 'tx-1',
          portfolioId: mockPortfolioId,
          assetId: 'asset-1',
          type: 'buy',
          date: subDays(today, 5),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ]);
      vi.mocked(db.getLatestPerformanceSnapshot).mockResolvedValue({
        id: 'snap-1',
        portfolioId: mockPortfolioId,
        date: today, // Up to date
        totalValue: new Decimal(10000),
        totalCost: new Decimal(9000),
        dayChange: new Decimal(100),
        dayChangePercent: 1,
        cumulativeReturn: new Decimal(0.1111),
        twrReturn: new Decimal(0.1),
        holdingCount: 5,
        hasInterpolatedPrices: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await needsComputation(mockPortfolioId);

      expect(result).toBe(false);
    });
  });

  describe('getAggregatedSnapshots', () => {
    it('should return daily snapshots for short periods', async () => {
      const mockSnapshots: PerformanceSnapshot[] = Array.from({ length: 30 }, (_, i) => ({
        id: `snap-${i}`,
        portfolioId: mockPortfolioId,
        date: subDays(today, 29 - i),
        totalValue: new Decimal(10000 + i * 100),
        totalCost: new Decimal(9000),
        dayChange: new Decimal(100),
        dayChangePercent: 1,
        cumulativeReturn: new Decimal(0.1 + i * 0.01),
        twrReturn: new Decimal(0.1),
        holdingCount: 5,
        hasInterpolatedPrices: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      vi.mocked(db.getPerformanceSnapshotsByPortfolio).mockResolvedValue(mockSnapshots);

      const result = await getAggregatedSnapshots(
        mockPortfolioId,
        subDays(today, 30),
        today
      );

      // Should return all daily snapshots (no aggregation for <= 90 days)
      expect(result.length).toBe(30);
    });

    it('should aggregate to weekly for medium periods', async () => {
      const mockSnapshots: PerformanceSnapshot[] = Array.from({ length: 180 }, (_, i) => ({
        id: `snap-${i}`,
        portfolioId: mockPortfolioId,
        date: subDays(today, 179 - i),
        totalValue: new Decimal(10000 + i * 50),
        totalCost: new Decimal(9000),
        dayChange: new Decimal(50),
        dayChangePercent: 0.5,
        cumulativeReturn: new Decimal(0.1 + i * 0.005),
        twrReturn: new Decimal(0.1),
        holdingCount: 5,
        hasInterpolatedPrices: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      vi.mocked(db.getPerformanceSnapshotsByPortfolio).mockResolvedValue(mockSnapshots);

      const result = await getAggregatedSnapshots(
        mockPortfolioId,
        subDays(today, 180),
        today
      );

      // Should aggregate to ~26 weeks
      expect(result.length).toBeLessThan(180);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should aggregate to monthly for long periods', async () => {
      const mockSnapshots: PerformanceSnapshot[] = Array.from({ length: 400 }, (_, i) => ({
        id: `snap-${i}`,
        portfolioId: mockPortfolioId,
        date: subDays(today, 399 - i),
        totalValue: new Decimal(10000 + i * 25),
        totalCost: new Decimal(9000),
        dayChange: new Decimal(25),
        dayChangePercent: 0.25,
        cumulativeReturn: new Decimal(0.1 + i * 0.0025),
        twrReturn: new Decimal(0.1),
        holdingCount: 5,
        hasInterpolatedPrices: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      vi.mocked(db.getPerformanceSnapshotsByPortfolio).mockResolvedValue(mockSnapshots);

      const result = await getAggregatedSnapshots(
        mockPortfolioId,
        subDays(today, 400),
        today
      );

      // Should aggregate to ~13-14 months
      expect(result.length).toBeLessThan(50);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
