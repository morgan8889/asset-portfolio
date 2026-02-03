import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '../schema';
import { countTransactions, getPaginatedTransactions } from '../queries';
import type { Transaction } from '@/types/transaction';
import Decimal from 'decimal.js';

describe('Pagination Queries', () => {
  const testPortfolioId = 'test-portfolio-001';
  const testAssetId = 'test-asset-001';

  beforeEach(async () => {
    // Create 100 test transactions
    const transactions: any[] = [];
    for (let i = 0; i < 100; i++) {
      transactions.push({
        id: `txn-${String(i).padStart(3, '0')}`,
        portfolioId: testPortfolioId,
        assetId: i % 2 === 0 ? 'AAPL' : 'GOOGL',
        type: i % 3 === 0 ? 'buy' : 'sell',
        date: new Date(2024, 0, i + 1),
        quantity: new Decimal('10'),
        price: new Decimal('100'),
        totalAmount: new Decimal('1000'),
        fees: new Decimal('1'),
        currency: 'USD',
        notes: `Transaction ${i}`,
      });
    }
    await db.transactions.bulkAdd(transactions);
  });

  afterEach(async () => {
    await db.transactions.clear();
  });

  describe('countTransactions', () => {
    it('should count all transactions for portfolio', async () => {
      const count = await countTransactions(testPortfolioId);
      expect(count).toBe(100);
    });

    it('should count filtered transactions by type', async () => {
      const count = await countTransactions(testPortfolioId, ['buy']);
      expect(count).toBe(34); // Every 3rd transaction (0, 3, 6, ..., 99)
    });

    it('should count transactions matching search term', async () => {
      const count = await countTransactions(testPortfolioId, undefined, 'AAPL');
      expect(count).toBe(50); // Half are AAPL
    });

    it('should return 0 for non-existent portfolio', async () => {
      const count = await countTransactions('non-existent-portfolio');
      expect(count).toBe(0);
    });
  });

  describe('getPaginatedTransactions', () => {
    it('should return first page with 25 transactions', async () => {
      const result = await getPaginatedTransactions({
        page: 1,
        pageSize: 25,
        portfolioId: testPortfolioId,
      });

      expect(result.data).toHaveLength(25);
      expect(result.totalCount).toBe(100);
      expect(result.totalPages).toBe(4);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(25);
    });

    it('should return second page with correct offset', async () => {
      const result = await getPaginatedTransactions({
        page: 2,
        pageSize: 25,
        portfolioId: testPortfolioId,
      });

      expect(result.data).toHaveLength(25);
      // Verify we're getting different transactions than page 1
      expect(result.data[0].id).not.toBe('txn-000');
    });

    it('should handle last page with partial results', async () => {
      const result = await getPaginatedTransactions({
        page: 4,
        pageSize: 30,
        portfolioId: testPortfolioId,
      });

      expect(result.data).toHaveLength(10); // 100 - (3 * 30) = 10
      expect(result.totalPages).toBe(4);
    });

    it('should sort by date descending by default', async () => {
      const result = await getPaginatedTransactions({
        page: 1,
        pageSize: 10,
        portfolioId: testPortfolioId,
      });

      const dates = result.data.map((t) => new Date(t.date).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
      }
    });

    it('should sort by date ascending when specified', async () => {
      const result = await getPaginatedTransactions({
        page: 1,
        pageSize: 10,
        portfolioId: testPortfolioId,
        sortOrder: 'asc',
      });

      const dates = result.data.map((t) => new Date(t.date).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });

    it('should filter by transaction type', async () => {
      const result = await getPaginatedTransactions({
        page: 1,
        pageSize: 50,
        portfolioId: testPortfolioId,
        filterType: ['buy'],
      });

      expect(result.totalCount).toBe(34);
      result.data.forEach((t) => {
        expect(t.type).toBe('buy');
      });
    });

    it('should filter by search term', async () => {
      const result = await getPaginatedTransactions({
        page: 1,
        pageSize: 50,
        portfolioId: testPortfolioId,
        searchTerm: 'AAPL',
      });

      expect(result.totalCount).toBe(50);
      result.data.forEach((t) => {
        expect(t.assetId).toBe('AAPL');
      });
    });

    it('should combine filter and search', async () => {
      const result = await getPaginatedTransactions({
        page: 1,
        pageSize: 50,
        portfolioId: testPortfolioId,
        filterType: ['buy'],
        searchTerm: 'AAPL',
      });

      // buy transactions are at indices 0, 3, 6, 9, etc.
      // AAPL transactions are at even indices
      // Overlap: 0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96 = 17
      expect(result.totalCount).toBe(17);
    });

    it('should return empty array for page beyond total pages', async () => {
      const result = await getPaginatedTransactions({
        page: 10,
        pageSize: 25,
        portfolioId: testPortfolioId,
      });

      expect(result.data).toHaveLength(0);
      expect(result.totalPages).toBe(4);
    });

    it('should handle page size of 100', async () => {
      const result = await getPaginatedTransactions({
        page: 1,
        pageSize: 100,
        portfolioId: testPortfolioId,
      });

      expect(result.data).toHaveLength(100);
      expect(result.totalPages).toBe(1);
    });

    it('should convert Decimal fields correctly', async () => {
      const result = await getPaginatedTransactions({
        page: 1,
        pageSize: 1,
        portfolioId: testPortfolioId,
      });

      const transaction = result.data[0];
      expect(transaction.quantity).toBeInstanceOf(Decimal);
      expect(transaction.price).toBeInstanceOf(Decimal);
      expect(transaction.totalAmount).toBeInstanceOf(Decimal);
      expect(transaction.fees).toBeInstanceOf(Decimal);
    });
  });
});
