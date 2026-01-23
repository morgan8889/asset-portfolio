import {
  Asset,
  Transaction,
  TransactionType,
  AssetMetadata,
  PortfolioSettings,
} from '@/types';
import Decimal from 'decimal.js';

let assetIdCounter = 1;
let transactionIdCounter = 1;

const defaultAssetMetadata: AssetMetadata = {};

const defaultPortfolioSettings: PortfolioSettings = {
  rebalanceThreshold: 5,
  taxStrategy: 'fifo',
};

export const createMockAsset = (overrides: Partial<Asset> = {}): Asset => ({
  id: `asset-${assetIdCounter++}`,
  symbol: 'AAPL',
  name: 'Apple Inc.',
  type: 'stock',
  exchange: 'NASDAQ',
  currency: 'USD',
  currentPrice: 150.0,
  priceUpdatedAt: new Date(),
  metadata: defaultAssetMetadata,
  ...overrides,
});

export const createMockTransaction = (
  overrides: Partial<Transaction> = {}
): Transaction => ({
  id: `transaction-${transactionIdCounter++}`,
  assetId: 'asset-1',
  portfolioId: 'default',
  type: 'buy' as TransactionType,
  date: new Date(),
  quantity: new Decimal(10),
  price: new Decimal(100),
  totalAmount: new Decimal(1000),
  fees: new Decimal(1),
  currency: 'USD',
  notes: '',
  ...overrides,
});

export const createMockPortfolioSnapshot = (overrides: any = {}) => ({
  id: `snapshot-${Date.now()}`,
  date: new Date().toISOString(),
  totalValue: new Decimal(10000),
  dayChange: new Decimal(100),
  dayChangePercent: new Decimal(1),
  holdings: [],
  ...overrides,
});

export const createMockAssets = (count: number): Asset[] =>
  Array.from({ length: count }, (_, i) =>
    createMockAsset({
      symbol: `STOCK${i + 1}`,
      name: `Stock ${i + 1} Inc.`,
      currentPrice: 100 + i * 10,
    })
  );

export const createMockTransactions = (
  count: number,
  assetId?: string
): Transaction[] =>
  Array.from({ length: count }, (_, i) =>
    createMockTransaction({
      assetId: assetId || `asset-${i + 1}`,
      type: (i % 2 === 0 ? 'buy' : 'sell') as TransactionType,
      quantity: new Decimal(10 + i),
      price: new Decimal(100 + i * 5),
      totalAmount: new Decimal((10 + i) * (100 + i * 5)),
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
    })
  );

export const createMockPortfolio = (overrides: any = {}) => ({
  id: `portfolio-${Date.now()}`,
  name: 'Test Portfolio',
  type: 'taxable',
  currency: 'USD',
  createdAt: new Date(),
  updatedAt: new Date(),
  settings: defaultPortfolioSettings,
  ...overrides,
});

export const resetCounters = () => {
  assetIdCounter = 1;
  transactionIdCounter = 1;
};
