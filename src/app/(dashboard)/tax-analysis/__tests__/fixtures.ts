/**
 * Test Fixtures for Tax Analysis Page Tests
 *
 * Provides consistent mock data for testing the tax-analysis page integration,
 * including holdings, assets, portfolios, and price data.
 */

import { Decimal } from 'decimal.js';
import { Portfolio, PortfolioSettings } from '@/types';
import { Asset, Holding, TaxLot } from '@/types/asset';

// ============================================================================
// Mock Portfolio
// ============================================================================

export const mockPortfolioSettings: PortfolioSettings = {
  rebalanceThreshold: 5,
  taxStrategy: 'fifo',
};

export const mockPortfolio: Portfolio = {
  id: 'portfolio-test-1',
  name: 'Test Portfolio',
  type: 'taxable',
  currency: 'USD',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastAccessedAt: new Date('2024-01-15'),
  settings: mockPortfolioSettings,
};

// ============================================================================
// Mock Assets
// ============================================================================

export const mockAssets: Asset[] = [
  {
    id: 'asset-uuid-aapl',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    exchange: 'NASDAQ',
    currency: 'USD',
    metadata: {},
  },
  {
    id: 'asset-uuid-msft',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    type: 'stock',
    exchange: 'NASDAQ',
    currency: 'USD',
    metadata: {},
  },
  {
    id: 'asset-uuid-googl',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    type: 'stock',
    exchange: 'NASDAQ',
    currency: 'USD',
    metadata: {},
  },
];

// ============================================================================
// Mock Tax Lots
// ============================================================================

const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

export const mockTaxLots: Record<string, TaxLot[]> = {
  'asset-uuid-aapl': [
    {
      id: 'lot-aapl-1',
      quantity: new Decimal(100),
      purchasePrice: new Decimal(150),
      purchaseDate: oneYearAgo,
      soldQuantity: new Decimal(0),
      remainingQuantity: new Decimal(100),
      lotType: 'standard',
    },
  ],
  'asset-uuid-msft': [
    {
      id: 'lot-msft-1',
      quantity: new Decimal(50),
      purchasePrice: new Decimal(350),
      purchaseDate: threeMonthsAgo,
      soldQuantity: new Decimal(0),
      remainingQuantity: new Decimal(50),
      lotType: 'standard',
    },
  ],
};

// ============================================================================
// Mock Holdings
// ============================================================================

export const mockHoldings: Holding[] = [
  {
    id: 'holding-aapl-1',
    portfolioId: mockPortfolio.id,
    assetId: 'asset-uuid-aapl',
    quantity: new Decimal(100),
    costBasis: new Decimal(15000), // 100 * 150
    averageCost: new Decimal(150),
    currentValue: new Decimal(17500), // 100 * 175
    unrealizedGain: new Decimal(2500),
    unrealizedGainPercent: 16.67,
    lots: mockTaxLots['asset-uuid-aapl'],
    lastUpdated: new Date(),
  },
  {
    id: 'holding-msft-1',
    portfolioId: mockPortfolio.id,
    assetId: 'asset-uuid-msft',
    quantity: new Decimal(50),
    costBasis: new Decimal(17500), // 50 * 350
    averageCost: new Decimal(350),
    currentValue: new Decimal(21000), // 50 * 420
    unrealizedGain: new Decimal(3500),
    unrealizedGainPercent: 20.0,
    lots: mockTaxLots['asset-uuid-msft'],
    lastUpdated: new Date(),
  },
];

// ============================================================================
// Mock Price Data
// ============================================================================

/**
 * Price data keyed by SYMBOL (as stored in priceStore)
 * This is what priceStore.prices contains
 */
export const mockPricesSymbolKeyed = new Map([
  ['AAPL', {
    symbol: 'AAPL',
    displayPrice: '175.00',
    displayCurrency: 'USD',
    price: '175.00',
    currency: 'USD',
    change: '1.50',
    changePercent: 0.86,
    timestamp: new Date(),
    source: 'yahoo',
    staleness: 'fresh' as const,
  }],
  ['MSFT', {
    symbol: 'MSFT',
    displayPrice: '420.00',
    displayCurrency: 'USD',
    price: '420.00',
    currency: 'USD',
    change: '5.00',
    changePercent: 1.2,
    timestamp: new Date(),
    source: 'yahoo',
    staleness: 'fresh' as const,
  }],
]);

/**
 * Price data keyed by ASSET ID (what TaxAnalysisTab expects)
 * This is what the page component converts to
 */
export const mockPricesAssetIdKeyed = new Map<string, Decimal>([
  ['asset-uuid-aapl', new Decimal('175.00')],
  ['asset-uuid-msft', new Decimal('420.00')],
]);

/**
 * Asset symbol map (assetId -> symbol)
 * Used by TaxAnalysisTab for display
 */
export const mockAssetSymbolMap = new Map<string, string>([
  ['asset-uuid-aapl', 'AAPL'],
  ['asset-uuid-msft', 'MSFT'],
  ['asset-uuid-googl', 'GOOGL'],
]);

/**
 * Symbol to asset ID map (symbol -> assetId)
 * Used for converting symbol-keyed prices to assetId-keyed
 */
export const mockSymbolToAssetId = new Map<string, string>([
  ['AAPL', 'asset-uuid-aapl'],
  ['MSFT', 'asset-uuid-msft'],
  ['GOOGL', 'asset-uuid-googl'],
]);

// ============================================================================
// Mock Tax Settings
// ============================================================================

export const mockTaxSettings = {
  shortTermRate: new Decimal('0.24'),
  longTermRate: new Decimal('0.15'),
};

// ============================================================================
// Bug Demonstration Helpers
// ============================================================================

/**
 * Demonstrates Bug #1: Object.entries on Map returns empty array
 * This proves why forEach must be used instead
 */
export function demonstrateMapIterationBug(): { bugBehavior: number; correctBehavior: number } {
  const map = new Map([['AAPL', { displayPrice: '150' }]]);

  // BUG: Object.entries returns [] for Maps
  const bugBehavior = Object.entries(map).length;

  // CORRECT: forEach works on Maps
  const result: string[] = [];
  map.forEach((_, key) => result.push(key));
  const correctBehavior = result.length;

  return { bugBehavior, correctBehavior };
}

/**
 * Creates mock store state with configurable lastFetchTime
 * for testing useMemo recalculation trigger
 */
export function createMockPriceStoreState(lastFetchTime: Date | null = null) {
  return {
    prices: mockPricesSymbolKeyed,
    lastFetchTime,
    loading: false,
    error: null,
    isPolling: false,
    watchedSymbols: new Set(['AAPL', 'MSFT']),
    isOnline: true,
  };
}
