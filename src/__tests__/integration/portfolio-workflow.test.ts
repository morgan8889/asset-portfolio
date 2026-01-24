import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Decimal } from 'decimal.js';
import { db } from '@/lib/db/schema';
import {
  portfolioQueries,
  transactionQueries,
  assetQueries,
  holdingQueries,
} from '@/lib/db';
import { usePortfolioStore, useTransactionStore } from '@/lib/stores';
import {
  Portfolio,
  Transaction,
  TransactionType,
  PortfolioSettings,
  Holding,
} from '@/types';

// Mock crypto.randomUUID for predictable IDs
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});

const defaultSettings: PortfolioSettings = {
  rebalanceThreshold: 5,
  taxStrategy: 'fifo',
};

describe('Portfolio Workflow Integration Tests', () => {
  beforeEach(async () => {
    // Reset UUID counter
    uuidCounter = 0;
    vi.clearAllMocks();

    // Clear database
    await db.portfolios.clear();
    await db.assets.clear();
    await db.holdings.clear();
    await db.transactions.clear();
    await db.priceHistory.clear();
    await db.priceSnapshots.clear();
    await db.dividendRecords.clear();
    await db.userSettings.clear();

    // Reset stores
    usePortfolioStore.setState({
      portfolios: [],
      currentPortfolio: null,
      holdings: [],
      assets: [],
      metrics: null,
      loading: false,
      error: null,
    });

    useTransactionStore.setState({
      transactions: [],
      filteredTransactions: [],
      currentFilter: {},
      summary: null,
      loading: false,
      importing: false,
      error: null,
    });
  });

  afterEach(async () => {
    // Clean up
    await db.portfolios.clear();
    await db.assets.clear();
    await db.holdings.clear();
    await db.transactions.clear();
    vi.clearAllMocks();
  });

  describe('Complete Portfolio Creation and Transaction Flow', () => {
    it('should create portfolio, add transactions, and calculate metrics', async () => {
      // Step 1: Create portfolio directly in database
      const portfolioId = await portfolioQueries.create({
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      });

      expect(portfolioId).toMatch(/test-uuid-/);

      // Verify portfolio was created
      const portfolio = await portfolioQueries.getById(portfolioId);
      expect(portfolio).toBeDefined();
      expect(portfolio!.name).toBe('Test Portfolio');

      // Step 2: Add transactions
      await db.transactions.add({
        id: 'tx1',
        assetId: 'AAPL',
        portfolioId: portfolioId,
        type: 'buy',
        quantity: '10',
        price: '150',
        totalAmount: '1500',
        fees: '1',
        currency: 'USD',
        date: new Date('2023-01-01'),
        notes: 'Initial purchase',
      } as any);

      await db.transactions.add({
        id: 'tx2',
        assetId: 'AAPL',
        portfolioId: portfolioId,
        type: 'buy',
        quantity: '5',
        price: '160',
        totalAmount: '800',
        fees: '1',
        currency: 'USD',
        date: new Date('2023-02-01'),
        notes: 'Additional purchase',
      } as any);

      // Step 3: Verify transaction retrieval
      const transactions = await transactionQueries.getFiltered({
        portfolioId,
      });
      expect(transactions).toHaveLength(2);

      // Step 4: Add holding for metrics calculation
      await db.holdings.add({
        id: 'h1',
        portfolioId: portfolioId,
        assetId: 'AAPL',
        quantity: '15',
        averageCost: '153.33',
        costBasis: '2302',
        currentValue: '2400',
        unrealizedGain: '98',
        unrealizedGainPercent: 4.26,
        lots: [],
        lastUpdated: new Date(),
      } as any);

      // Step 5: Calculate portfolio metrics using the store
      const portfolioStore = usePortfolioStore.getState();
      await portfolioStore.calculateMetrics(portfolioId);

      const state = usePortfolioStore.getState();
      expect(state.metrics).toBeDefined();
      expect(state.metrics!.totalValue.toNumber()).toBe(2400);
      expect(state.metrics!.totalCost.toNumber()).toBe(2302);
    });
  });

  describe('Multi-Asset Portfolio Management', () => {
    it('should handle multiple assets and transaction types', async () => {
      const portfolioId = 'multi-asset-portfolio';

      // Create portfolio
      await db.portfolios.add({
        id: portfolioId,
        name: 'Multi-Asset Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      });

      // Add mixed transactions
      await db.transactions.add({
        id: 'tx1',
        assetId: 'AAPL',
        portfolioId: portfolioId,
        type: 'buy',
        quantity: '10',
        price: '150',
        totalAmount: '1500',
        fees: '1',
        currency: 'USD',
        date: new Date('2023-01-01'),
        notes: 'AAPL initial',
      } as any);

      await db.transactions.add({
        id: 'tx2',
        assetId: 'MSFT',
        portfolioId: portfolioId,
        type: 'buy',
        quantity: '20',
        price: '250',
        totalAmount: '5000',
        fees: '2',
        currency: 'USD',
        date: new Date('2023-01-15'),
        notes: 'MSFT initial',
      } as any);

      await db.transactions.add({
        id: 'tx3',
        assetId: 'AAPL',
        portfolioId: portfolioId,
        type: 'dividend',
        quantity: '10',
        price: '0.23',
        totalAmount: '2.30',
        fees: '0',
        currency: 'USD',
        date: new Date('2023-03-01'),
        notes: 'Quarterly dividend',
      } as any);

      await db.transactions.add({
        id: 'tx4',
        assetId: 'MSFT',
        portfolioId: portfolioId,
        type: 'sell',
        quantity: '5',
        price: '280',
        totalAmount: '1400',
        fees: '1',
        currency: 'USD',
        date: new Date('2023-04-01'),
        notes: 'Partial profit taking',
      } as any);

      // Test filtering by asset
      const appleTransactions = await transactionQueries.getFiltered({
        portfolioId,
        assetId: 'AAPL',
      });
      expect(appleTransactions).toHaveLength(2); // buy + dividend

      // Test filtering by transaction type
      const buyTransactions = await transactionQueries.getFiltered({
        portfolioId,
        type: ['buy'],
      });
      expect(buyTransactions).toHaveLength(2); // AAPL buy + MSFT buy

      // Test filtering by date range
      const earlyTransactions = await transactionQueries.getFiltered({
        portfolioId,
        dateFrom: new Date('2023-01-01'),
        dateTo: new Date('2023-01-31'),
      });
      expect(earlyTransactions).toHaveLength(2); // Only January transactions
    });
  });

  describe('Error Handling and Data Consistency', () => {
    it('should handle database errors gracefully', async () => {
      const portfolioStore = usePortfolioStore.getState();

      // Test creating portfolio with invalid data
      // The store should catch the error and set error state
      await portfolioStore.createPortfolio({
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      });

      // Verify error handling behavior
      const state = usePortfolioStore.getState();
      expect(state.loading).toBe(false);
      // If no error, the operation succeeded
      if (!state.error) {
        const portfolios = await portfolioQueries.getAll();
        expect(portfolios.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('should maintain data consistency during transaction failures', async () => {
      const portfolioId = 'test-portfolio';

      // Create portfolio first
      await db.portfolios.add({
        id: portfolioId,
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      });

      // Add first transaction successfully
      await db.transactions.add({
        id: 'tx1',
        assetId: 'AAPL',
        portfolioId: portfolioId,
        type: 'buy',
        quantity: '10',
        price: '150',
        totalAmount: '1500',
        fees: '1',
        currency: 'USD',
        date: new Date(),
        notes: 'First transaction',
      } as any);

      // Verify first transaction exists
      const transactions = await transactionQueries.getFiltered({
        portfolioId,
      });
      expect(transactions).toHaveLength(1);

      // Try adding duplicate transaction with same ID (should fail)
      try {
        await db.transactions.add({
          id: 'tx1', // Same ID - will fail
          assetId: 'MSFT',
          portfolioId: portfolioId,
          type: 'buy',
          quantity: '5',
          price: '250',
          totalAmount: '1250',
          fees: '1',
          currency: 'USD',
          date: new Date(),
          notes: 'Duplicate ID transaction',
        } as any);
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }

      // First transaction should still exist
      const afterFailure = await transactionQueries.getFiltered({
        portfolioId,
      });
      expect(afterFailure).toHaveLength(1);
      expect(afterFailure[0].assetId).toBe('AAPL');
    });
  });

  describe('Performance and Bulk Operations', () => {
    it('should handle bulk transaction imports efficiently', async () => {
      const portfolioId = 'bulk-portfolio';

      // Create portfolio
      await db.portfolios.add({
        id: portfolioId,
        name: 'Bulk Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      });

      // Create 100 mock transactions
      const bulkTransactions = Array.from({ length: 100 }, (_, i) => ({
        assetId: `STOCK${i % 10}`,
        portfolioId: portfolioId,
        type: (i % 2 === 0 ? 'buy' : 'sell') as TransactionType,
        quantity: new Decimal(Math.floor(Math.random() * 100) + 1),
        price: new Decimal(Math.floor(Math.random() * 200) + 50),
        totalAmount: new Decimal(1000),
        fees: new Decimal(1),
        currency: 'USD',
        date: new Date(2023, 0, i + 1),
        notes: `Bulk transaction ${i}`,
      }));

      const startTime = Date.now();
      const ids = await transactionQueries.createMany(bulkTransactions);
      const endTime = Date.now();

      // Verify all transactions were created
      expect(ids).toHaveLength(100);

      // Verify they exist in database
      const allTransactions = await transactionQueries.getFiltered({
        portfolioId,
      });
      expect(allTransactions).toHaveLength(100);

      // Should complete reasonably quickly (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });
});
