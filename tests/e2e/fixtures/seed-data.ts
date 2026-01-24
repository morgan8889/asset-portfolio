import { Decimal } from 'decimal.js';
import {
  Portfolio,
  Asset,
  Holding,
  Transaction,
  TaxLot,
  PortfolioSettings,
} from '@/types';

/**
 * E2E Test Fixtures
 *
 * Consistent test data for E2E tests. Use these fixtures to seed
 * the database with predictable data before running tests.
 */

// ============================================================================
// Portfolio Fixtures
// ============================================================================

export const defaultPortfolioSettings: PortfolioSettings = {
  rebalanceThreshold: 5,
  taxStrategy: 'fifo',
};

export const testPortfolios: Portfolio[] = [
  {
    id: 'test-portfolio-1',
    name: 'Main Investment Portfolio',
    type: 'taxable',
    currency: 'USD',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    settings: defaultPortfolioSettings,
  },
  {
    id: 'test-portfolio-2',
    name: 'Retirement IRA',
    type: 'ira',
    currency: 'USD',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    settings: { ...defaultPortfolioSettings, taxStrategy: 'lifo' },
  },
  {
    id: 'test-portfolio-3',
    name: 'Crypto Portfolio',
    type: 'taxable',
    currency: 'USD',
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    settings: defaultPortfolioSettings,
  },
];

// ============================================================================
// Asset Fixtures
// ============================================================================

export const testAssets: Asset[] = [
  {
    id: 'asset-aapl',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    currentPrice: 175.5,
    priceUpdatedAt: new Date(),
    metadata: {
      marketCap: 2800000000000,
      peRatio: 28.5,
      dividendYield: 0.5,
      beta: 1.2,
    },
  },
  {
    id: 'asset-googl',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    type: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    sector: 'Technology',
    currentPrice: 140.25,
    priceUpdatedAt: new Date(),
    metadata: {
      marketCap: 1750000000000,
      peRatio: 25.3,
      dividendYield: 0,
      beta: 1.1,
    },
  },
  {
    id: 'asset-vti',
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    type: 'etf',
    currency: 'USD',
    exchange: 'NYSE',
    currentPrice: 250.75,
    priceUpdatedAt: new Date(),
    metadata: {
      dividendYield: 1.5,
      beta: 1.0,
    },
  },
  {
    id: 'asset-btc',
    symbol: 'BTC',
    name: 'Bitcoin',
    type: 'crypto',
    currency: 'USD',
    currentPrice: 65000,
    priceUpdatedAt: new Date(),
    metadata: {
      marketCap: 1200000000000,
    },
  },
  {
    id: 'asset-eth',
    symbol: 'ETH',
    name: 'Ethereum',
    type: 'crypto',
    currency: 'USD',
    currentPrice: 3500,
    priceUpdatedAt: new Date(),
    metadata: {
      marketCap: 420000000000,
    },
  },
  {
    id: 'asset-bnd',
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    type: 'bond',
    currency: 'USD',
    exchange: 'NYSE',
    currentPrice: 75.5,
    priceUpdatedAt: new Date(),
    metadata: {
      dividendYield: 3.2,
      beta: 0.15,
    },
  },
];

// ============================================================================
// Tax Lot Fixtures
// ============================================================================

function createTaxLot(
  id: string,
  quantity: number,
  purchasePrice: number,
  purchaseDate: Date
): TaxLot {
  return {
    id,
    quantity: new Decimal(quantity),
    purchasePrice: new Decimal(purchasePrice),
    purchaseDate,
    soldQuantity: new Decimal(0),
    remainingQuantity: new Decimal(quantity),
  };
}

// ============================================================================
// Holding Fixtures
// ============================================================================

export const testHoldings: Holding[] = [
  {
    id: 'holding-1',
    portfolioId: 'test-portfolio-1',
    assetId: 'asset-aapl',
    quantity: new Decimal(100),
    averageCost: new Decimal(150),
    costBasis: new Decimal(15000),
    currentValue: new Decimal(17550),
    unrealizedGain: new Decimal(2550),
    unrealizedGainPercent: 17,
    lots: [
      createTaxLot('lot-1', 50, 140, new Date('2023-01-15')),
      createTaxLot('lot-2', 50, 160, new Date('2023-06-20')),
    ],
    lastUpdated: new Date(),
  },
  {
    id: 'holding-2',
    portfolioId: 'test-portfolio-1',
    assetId: 'asset-vti',
    quantity: new Decimal(200),
    averageCost: new Decimal(230),
    costBasis: new Decimal(46000),
    currentValue: new Decimal(50150),
    unrealizedGain: new Decimal(4150),
    unrealizedGainPercent: 9.02,
    lots: [createTaxLot('lot-3', 200, 230, new Date('2023-03-10'))],
    lastUpdated: new Date(),
  },
  {
    id: 'holding-3',
    portfolioId: 'test-portfolio-1',
    assetId: 'asset-googl',
    quantity: new Decimal(50),
    averageCost: new Decimal(120),
    costBasis: new Decimal(6000),
    currentValue: new Decimal(7012.5),
    unrealizedGain: new Decimal(1012.5),
    unrealizedGainPercent: 16.88,
    lots: [createTaxLot('lot-4', 50, 120, new Date('2023-09-01'))],
    lastUpdated: new Date(),
  },
  // Crypto holdings in portfolio 3
  {
    id: 'holding-4',
    portfolioId: 'test-portfolio-3',
    assetId: 'asset-btc',
    quantity: new Decimal(0.5),
    averageCost: new Decimal(55000),
    costBasis: new Decimal(27500),
    currentValue: new Decimal(32500),
    unrealizedGain: new Decimal(5000),
    unrealizedGainPercent: 18.18,
    lots: [createTaxLot('lot-5', 0.5, 55000, new Date('2024-01-15'))],
    lastUpdated: new Date(),
  },
];

// ============================================================================
// Transaction Fixtures
// ============================================================================

export const testTransactions: Transaction[] = [
  {
    id: 'tx-1',
    portfolioId: 'test-portfolio-1',
    assetId: 'asset-aapl',
    type: 'buy',
    date: new Date('2023-01-15'),
    quantity: new Decimal(50),
    price: new Decimal(140),
    totalAmount: new Decimal(7000),
    fees: new Decimal(5),
    currency: 'USD',
    notes: 'Initial purchase',
  },
  {
    id: 'tx-2',
    portfolioId: 'test-portfolio-1',
    assetId: 'asset-aapl',
    type: 'buy',
    date: new Date('2023-06-20'),
    quantity: new Decimal(50),
    price: new Decimal(160),
    totalAmount: new Decimal(8000),
    fees: new Decimal(5),
    currency: 'USD',
    notes: 'Dollar cost averaging',
  },
  {
    id: 'tx-3',
    portfolioId: 'test-portfolio-1',
    assetId: 'asset-vti',
    type: 'buy',
    date: new Date('2023-03-10'),
    quantity: new Decimal(200),
    price: new Decimal(230),
    totalAmount: new Decimal(46000),
    fees: new Decimal(0),
    currency: 'USD',
    notes: 'Index fund investment',
  },
  {
    id: 'tx-4',
    portfolioId: 'test-portfolio-1',
    assetId: 'asset-googl',
    type: 'buy',
    date: new Date('2023-09-01'),
    quantity: new Decimal(50),
    price: new Decimal(120),
    totalAmount: new Decimal(6000),
    fees: new Decimal(5),
    currency: 'USD',
    notes: 'Tech sector diversification',
  },
  {
    id: 'tx-5',
    portfolioId: 'test-portfolio-1',
    assetId: 'asset-vti',
    type: 'dividend',
    date: new Date('2023-12-15'),
    quantity: new Decimal(0),
    price: new Decimal(0),
    totalAmount: new Decimal(150),
    fees: new Decimal(0),
    currency: 'USD',
    notes: 'Q4 dividend',
  },
  {
    id: 'tx-6',
    portfolioId: 'test-portfolio-3',
    assetId: 'asset-btc',
    type: 'buy',
    date: new Date('2024-01-15'),
    quantity: new Decimal(0.5),
    price: new Decimal(55000),
    totalAmount: new Decimal(27500),
    fees: new Decimal(25),
    currency: 'USD',
    notes: 'Bitcoin investment',
  },
];

// ============================================================================
// Large Dataset for Performance Testing
// ============================================================================

export function generateLargeHoldingSet(
  portfolioId: string,
  count: number
): Holding[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `perf-holding-${i}`,
    portfolioId,
    assetId: `perf-asset-${i}`,
    quantity: new Decimal(Math.floor(Math.random() * 1000) + 1),
    averageCost: new Decimal(Math.random() * 500 + 10),
    costBasis: new Decimal(Math.random() * 50000 + 1000),
    currentValue: new Decimal(Math.random() * 60000 + 1000),
    unrealizedGain: new Decimal(Math.random() * 10000 - 5000),
    unrealizedGainPercent: Math.random() * 40 - 20,
    lots: [],
    lastUpdated: new Date(),
  }));
}

export function generateLargeTransactionSet(
  portfolioId: string,
  count: number
): Transaction[] {
  const types: Transaction['type'][] = ['buy', 'sell', 'dividend', 'fee'];
  const startDate = new Date('2020-01-01');

  return Array.from({ length: count }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    return {
      id: `perf-tx-${i}`,
      portfolioId,
      assetId: `perf-asset-${i % 50}`, // Distribute across 50 assets
      type: types[i % types.length],
      date,
      quantity: new Decimal(Math.floor(Math.random() * 100) + 1),
      price: new Decimal(Math.random() * 500 + 10),
      totalAmount: new Decimal(Math.random() * 10000 + 100),
      fees: new Decimal(Math.random() * 10),
      currency: 'USD',
    };
  });
}

// ============================================================================
// Seed Function
// ============================================================================

/**
 * Seeds the database with test data.
 * Call this in beforeEach/beforeAll hooks in E2E tests.
 */
export async function seedTestData(db: {
  portfolios: { bulkAdd: (items: Portfolio[]) => Promise<void> };
  assets: { bulkAdd: (items: Asset[]) => Promise<void> };
  holdings: { bulkAdd: (items: Holding[]) => Promise<void> };
  transactions: { bulkAdd: (items: Transaction[]) => Promise<void> };
}): Promise<void> {
  await Promise.all([
    db.portfolios.bulkAdd(testPortfolios),
    db.assets.bulkAdd(testAssets),
    db.holdings.bulkAdd(testHoldings),
    db.transactions.bulkAdd(testTransactions),
  ]);
}

/**
 * Clears all test data from the database.
 * Call this in afterEach/afterAll hooks in E2E tests.
 */
export async function clearTestData(db: {
  portfolios: { clear: () => Promise<void> };
  assets: { clear: () => Promise<void> };
  holdings: { clear: () => Promise<void> };
  transactions: { clear: () => Promise<void> };
}): Promise<void> {
  await Promise.all([
    db.portfolios.clear(),
    db.assets.clear(),
    db.holdings.clear(),
    db.transactions.clear(),
  ]);
}

// ============================================================================
// Test Scenario Generators
// ============================================================================

/**
 * Creates a portfolio with specific characteristics for testing.
 */
export function createTestPortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    id: `test-${Date.now()}`,
    name: 'Test Portfolio',
    type: 'taxable',
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: defaultPortfolioSettings,
    ...overrides,
  };
}

/**
 * Creates a transaction with specific characteristics for testing.
 */
export function createTestTransaction(
  overrides: Partial<Transaction> = {}
): Transaction {
  return {
    id: `tx-${Date.now()}`,
    portfolioId: 'test-portfolio-1',
    assetId: 'asset-aapl',
    type: 'buy',
    date: new Date(),
    quantity: new Decimal(10),
    price: new Decimal(150),
    totalAmount: new Decimal(1500),
    fees: new Decimal(0),
    currency: 'USD',
    ...overrides,
  };
}
