import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Decimal } from 'decimal.js';
import { db } from '../schema';
import {
  portfolioQueries,
  assetQueries,
  holdingQueries,
  transactionQueries,
  priceQueries,
  settingsQueries,
} from '../queries';
import { PortfolioSettings, TransactionType } from '@/types';

// Mock crypto.randomUUID for predictable IDs
let uuidCounter = 0;
vi.stubGlobal('crypto', {
  randomUUID: () => `test-uuid-${++uuidCounter}`,
});

const defaultSettings: PortfolioSettings = {
  rebalanceThreshold: 5,
  taxStrategy: 'fifo',
};

describe('Portfolio Queries', () => {
  beforeEach(async () => {
    // Reset UUID counter for predictable IDs
    uuidCounter = 0;
    vi.clearAllMocks();

    // Clear all tables before each test
    await db.portfolios.clear();
    await db.assets.clear();
    await db.holdings.clear();
    await db.transactions.clear();
    await db.priceHistory.clear();
    await db.priceSnapshots.clear();
    await db.dividendRecords.clear();
    await db.userSettings.clear();
  });

  afterEach(async () => {
    // Clean up after each test
    await db.portfolios.clear();
    await db.assets.clear();
    await db.holdings.clear();
    await db.transactions.clear();
    await db.userSettings.clear();
  });

  describe('portfolioQueries', () => {
    it('should get all portfolios ordered by name', async () => {
      // Create portfolios in reverse alphabetical order
      await db.portfolios.add({
        id: 'p1',
        name: 'Portfolio B',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      });
      await db.portfolios.add({
        id: 'p2',
        name: 'Portfolio A',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      });

      const result = await portfolioQueries.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Portfolio A');
      expect(result[1].name).toBe('Portfolio B');
    });

    it('should get portfolio by id', async () => {
      await db.portfolios.add({
        id: 'p1',
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      });

      const result = await portfolioQueries.getById('p1');

      expect(result).toBeDefined();
      expect(result!.name).toBe('Test Portfolio');
    });

    it('should create new portfolio with generated id and timestamps', async () => {
      const portfolioData = {
        name: 'Test Portfolio',
        type: 'taxable' as const,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      const result = await portfolioQueries.create(portfolioData);

      expect(result).toMatch(/test-uuid-/);

      const created = await portfolioQueries.getById(result);
      expect(created).toBeDefined();
      expect(created!.name).toBe(portfolioData.name);
      expect(created!.createdAt).toBeInstanceOf(Date);
      expect(created!.updatedAt).toBeInstanceOf(Date);
    });

    it('should update portfolio with new timestamp', async () => {
      await db.portfolios.add({
        id: 'p1',
        name: 'Original Name',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date('2020-01-01'),
        settings: defaultSettings,
      });

      await portfolioQueries.update('p1', { name: 'Updated Portfolio' });

      const updated = await portfolioQueries.getById('p1');
      expect(updated!.name).toBe('Updated Portfolio');
      expect(updated!.updatedAt.getTime()).toBeGreaterThan(
        new Date('2020-01-01').getTime()
      );
    });

    it('should delete portfolio and cascade delete related data', async () => {
      // Create portfolio with related holdings and transactions
      await db.portfolios.add({
        id: 'p1',
        name: 'To Delete',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      });
      await db.holdings.add({
        id: 'h1',
        portfolioId: 'p1',
        assetId: 'a1',
        quantity: '10',
        costBasis: '1000',
        averageCost: '100',
        currentValue: '1100',
        unrealizedGain: '100',
        unrealizedGainPercent: 10,
        lots: [],
        lastUpdated: new Date(),
      } as any);
      await db.transactions.add({
        id: 't1',
        portfolioId: 'p1',
        assetId: 'a1',
        type: 'buy',
        date: new Date(),
        quantity: '10',
        price: '100',
        totalAmount: '1000',
        fees: '5',
        currency: 'USD',
      } as any);

      await portfolioQueries.delete('p1');

      const portfolio = await portfolioQueries.getById('p1');
      const holdings = await db.holdings
        .where('portfolioId')
        .equals('p1')
        .toArray();
      const transactions = await db.transactions
        .where('portfolioId')
        .equals('p1')
        .toArray();

      expect(portfolio).toBeUndefined();
      expect(holdings).toHaveLength(0);
      expect(transactions).toHaveLength(0);
    });
  });

  describe('assetQueries', () => {
    it('should get asset by symbol (case insensitive)', async () => {
      await db.assets.add({
        id: 'a1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
        metadata: {},
      });

      const result = await assetQueries.getBySymbol('aapl');

      expect(result).toBeDefined();
      expect(result!.symbol).toBe('AAPL');
    });

    it('should search assets by symbol and name', async () => {
      await db.assets.add({
        id: 'a1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
        metadata: {},
      });
      await db.assets.add({
        id: 'a2',
        symbol: 'MSFT',
        name: 'Microsoft Corp.',
        type: 'stock',
        currency: 'USD',
        metadata: {},
      });

      const result = await assetQueries.search('app', 10);

      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
    });

    it('should throw error when creating asset with existing symbol', async () => {
      await db.assets.add({
        id: 'a1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
        metadata: {},
      });

      const newAssetData = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock' as const,
        currency: 'USD',
        metadata: {},
      };

      await expect(assetQueries.create(newAssetData)).rejects.toThrow(
        'Asset with symbol AAPL already exists'
      );
    });

    it('should update asset price with timestamp', async () => {
      await db.assets.add({
        id: 'a1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
        currentPrice: 100,
        metadata: {},
      });

      await assetQueries.updatePrice('a1', 150.5);

      const updated = await assetQueries.getById('a1');
      expect(updated!.currentPrice).toBe(150.5);
      expect(updated!.priceUpdatedAt).toBeInstanceOf(Date);
    });
  });

  describe('transactionQueries', () => {
    it('should filter transactions by multiple criteria', async () => {
      await db.transactions.add({
        id: 't1',
        portfolioId: 'p1',
        assetId: 'a1',
        type: 'buy',
        date: new Date('2023-06-15'),
        quantity: '10',
        price: '100',
        totalAmount: '1000',
        fees: '5',
        currency: 'USD',
      } as any);
      await db.transactions.add({
        id: 't2',
        portfolioId: 'p1',
        assetId: 'a1',
        type: 'sell',
        date: new Date('2023-07-15'),
        quantity: '5',
        price: '110',
        totalAmount: '550',
        fees: '5',
        currency: 'USD',
      } as any);
      await db.transactions.add({
        id: 't3',
        portfolioId: 'p2',
        assetId: 'a1',
        type: 'buy',
        date: new Date('2023-08-15'),
        quantity: '20',
        price: '105',
        totalAmount: '2100',
        fees: '10',
        currency: 'USD',
      } as any);

      const filter = {
        portfolioId: 'p1',
        type: ['buy' as TransactionType],
        dateFrom: new Date('2023-01-01'),
        dateTo: new Date('2023-12-31'),
      };

      const result = await transactionQueries.getFiltered(filter);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('buy');
      expect(result[0].portfolioId).toBe('p1');
    });

    it('should create multiple transactions with bulk add', async () => {
      const transactionData = [
        {
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'buy' as TransactionType,
          date: new Date(),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(1),
          currency: 'USD',
        },
        {
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'sell' as TransactionType,
          date: new Date(),
          quantity: new Decimal(5),
          price: new Decimal(110),
          totalAmount: new Decimal(550),
          fees: new Decimal(1),
          currency: 'USD',
        },
      ];

      const result = await transactionQueries.createMany(transactionData);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatch(/test-uuid-/);
      expect(result[1]).toMatch(/test-uuid-/);

      const all = await db.transactions.toArray();
      expect(all).toHaveLength(2);
    });

    it('should calculate transaction summary correctly', async () => {
      await db.transactions.add({
        id: 't1',
        portfolioId: 'p1',
        assetId: 'a1',
        type: 'buy',
        date: new Date('2023-01-01'),
        quantity: '10',
        price: '100',
        totalAmount: '1000',
        fees: '10',
        currency: 'USD',
      } as any);
      await db.transactions.add({
        id: 't2',
        portfolioId: 'p1',
        assetId: 'a1',
        type: 'sell',
        date: new Date('2023-06-01'),
        quantity: '5',
        price: '110',
        totalAmount: '1100',
        fees: '15',
        currency: 'USD',
      } as any);
      await db.transactions.add({
        id: 't3',
        portfolioId: 'p1',
        assetId: 'a1',
        type: 'dividend',
        date: new Date('2023-03-01'),
        quantity: '0',
        price: '0',
        totalAmount: '50',
        fees: '0',
        currency: 'USD',
      } as any);

      const result = await transactionQueries.getSummary('p1');

      expect(result.totalTransactions).toBe(3);
      expect(result.totalBuys).toBe(1);
      expect(result.totalSells).toBe(1);
      expect(result.totalDividends).toBe(1);
      expect(result.totalInvested.toNumber()).toBe(1000);
      expect(result.totalDividendIncome.toNumber()).toBe(50);
      expect(result.totalFees.toNumber()).toBe(25);
    });
  });

  describe('settingsQueries', () => {
    it('should set new setting when key does not exist', async () => {
      await settingsQueries.set('theme', 'dark');

      const value = await settingsQueries.get('theme');
      expect(value).toBe('dark');
    });

    it('should update existing setting', async () => {
      await settingsQueries.set('theme', 'light');
      await settingsQueries.set('theme', 'dark');

      const value = await settingsQueries.get('theme');
      expect(value).toBe('dark');
    });

    it('should get all settings as object', async () => {
      await settingsQueries.set('theme', 'dark');
      await settingsQueries.set('currency', 'USD');

      const result = await settingsQueries.getAll();

      expect(result).toEqual({
        theme: 'dark',
        currency: 'USD',
      });
    });
  });
});
