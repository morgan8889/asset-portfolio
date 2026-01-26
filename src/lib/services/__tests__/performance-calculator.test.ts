/**
 * Performance Calculator Service Tests
 *
 * Tests for gain/loss calculation logic including top performers and biggest losers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Decimal } from 'decimal.js';
import type { Holding, Asset } from '@/types';
import type { HoldingPerformance, TimePeriod } from '@/types/dashboard';
import type { PriceLookupResult, PriceCache } from '../price-lookup';

// Use vi.hoisted for mock definitions
const { mockHoldingQueries, mockAssetQueries, mockPriceLookup } = vi.hoisted(
  () => ({
    mockHoldingQueries: {
      getByPortfolio: vi.fn(),
    },
    mockAssetQueries: {
      getAll: vi.fn(),
    },
    mockPriceLookup: {
      getPriceAtDate: vi.fn(),
      createPriceCache: vi.fn(),
    },
  })
);

vi.mock('@/lib/db', () => ({
  holdingQueries: mockHoldingQueries,
  assetQueries: mockAssetQueries,
}));

vi.mock('../price-lookup', () => ({
  getPriceAtDate: mockPriceLookup.getPriceAtDate,
  createPriceCache: mockPriceLookup.createPriceCache,
}));

// Import after mocks
import {
  calculatePerformance,
  calculateAllPerformance,
  getTopPerformers,
  getBiggestLosers,
} from '../performance-calculator';

// Test helpers
const createMockHolding = (overrides: Partial<Holding> = {}): Holding => ({
  id: 'holding-1',
  portfolioId: 'portfolio-1',
  assetId: 'asset-1',
  quantity: new Decimal(10),
  averageCost: new Decimal(100),
  costBasis: new Decimal(1000),
  currentValue: new Decimal(1100),
  unrealizedGain: new Decimal(100),
  unrealizedGainPercent: 10,
  lots: [],
  lastUpdated: new Date(),
  ...overrides,
});

const createMockAsset = (overrides: Partial<Asset> = {}): Asset => ({
  id: 'asset-1',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  type: 'stock',
  currency: 'USD',
  metadata: {},
  ...overrides,
});

describe('calculatePerformance', () => {
  it('calculates positive gain correctly', () => {
    const result = calculatePerformance(
      new Decimal('1000'), // start value
      new Decimal('1100') // current value
    );

    expect(result.percentGain).toBe(10);
    expect(result.absoluteGain.toString()).toBe('100');
  });

  it('calculates negative loss correctly', () => {
    const result = calculatePerformance(
      new Decimal('1000'),
      new Decimal('900')
    );

    expect(result.percentGain).toBe(-10);
    expect(result.absoluteGain.toString()).toBe('-100');
  });

  it('handles zero start value without division error', () => {
    const result = calculatePerformance(new Decimal('0'), new Decimal('100'));

    expect(result.percentGain).toBe(0); // Avoid division by zero
    expect(result.absoluteGain.toString()).toBe('100');
  });

  it('handles zero current value correctly', () => {
    const result = calculatePerformance(new Decimal('1000'), new Decimal('0'));

    expect(result.percentGain).toBe(-100);
    expect(result.absoluteGain.toString()).toBe('-1000');
  });

  it('handles equal values (no change)', () => {
    const result = calculatePerformance(
      new Decimal('1000'),
      new Decimal('1000')
    );

    expect(result.percentGain).toBe(0);
    expect(result.absoluteGain.toString()).toBe('0');
  });

  it('handles small decimal values with precision', () => {
    const result = calculatePerformance(
      new Decimal('0.001'),
      new Decimal('0.002')
    );

    expect(result.percentGain).toBe(100);
    expect(result.absoluteGain.toString()).toBe('0.001');
  });

  it('handles large values without overflow', () => {
    const result = calculatePerformance(
      new Decimal('1000000000000'),
      new Decimal('1100000000000')
    );

    expect(result.percentGain).toBe(10);
    expect(result.absoluteGain.toString()).toBe('100000000000');
  });

  it('calculates percentage with decimal precision', () => {
    const result = calculatePerformance(
      new Decimal('1000'),
      new Decimal('1050')
    );

    expect(result.percentGain).toBe(5);
    expect(result.absoluteGain.toString()).toBe('50');
  });

  it('handles fractional percentage gains', () => {
    const result = calculatePerformance(
      new Decimal('1000'),
      new Decimal('1001')
    );

    expect(result.percentGain).toBeCloseTo(0.1, 5);
    expect(result.absoluteGain.toString()).toBe('1');
  });
});

describe('calculateAllPerformance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPriceLookup.createPriceCache.mockReturnValue(new Map());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no holdings', async () => {
    mockHoldingQueries.getByPortfolio.mockResolvedValue([]);
    mockAssetQueries.getAll.mockResolvedValue([]);

    const result = await calculateAllPerformance('portfolio-1', 'MONTH');

    expect(result).toEqual([]);
  });

  it('calculates performance for all holdings', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'holding-1',
        assetId: 'asset-1',
        currentValue: new Decimal(1100),
      }),
      createMockHolding({
        id: 'holding-2',
        assetId: 'asset-2',
        currentValue: new Decimal(900),
      }),
    ];

    const mockAssets = [
      createMockAsset({ id: 'asset-1', symbol: 'AAPL', name: 'Apple' }),
      createMockAsset({ id: 'asset-2', symbol: 'GOOG', name: 'Google' }),
    ];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await calculateAllPerformance('portfolio-1', 'MONTH');

    expect(result).toHaveLength(2);
    expect(result[0].holdingId).toBe('holding-1');
    expect(result[1].holdingId).toBe('holding-2');
  });

  it('skips holdings with zero quantity', async () => {
    const mockHoldings = [
      createMockHolding({ id: 'holding-1', quantity: new Decimal(0) }),
      createMockHolding({ id: 'holding-2', quantity: new Decimal(10) }),
    ];

    const mockAssets = [createMockAsset({ id: 'asset-1', symbol: 'AAPL' })];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await calculateAllPerformance('portfolio-1', 'MONTH');

    expect(result).toHaveLength(1);
    expect(result[0].holdingId).toBe('holding-2');
  });

  it('skips holdings without matching asset', async () => {
    const mockHoldings = [
      createMockHolding({ id: 'holding-1', assetId: 'unknown-asset' }),
      createMockHolding({ id: 'holding-2', assetId: 'asset-1' }),
    ];

    const mockAssets = [createMockAsset({ id: 'asset-1', symbol: 'AAPL' })];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await calculateAllPerformance('portfolio-1', 'MONTH');

    expect(result).toHaveLength(1);
    expect(result[0].holdingId).toBe('holding-2');
  });

  it('marks interpolated prices correctly', async () => {
    const mockHoldings = [
      createMockHolding({ id: 'holding-1', assetId: 'asset-1' }),
    ];

    const mockAssets = [createMockAsset({ id: 'asset-1', symbol: 'AAPL' })];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: true,
    });

    const result = await calculateAllPerformance('portfolio-1', 'MONTH');

    expect(result[0].isInterpolated).toBe(true);
  });

  it('calculates correct gain/loss values', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'holding-1',
        assetId: 'asset-1',
        quantity: new Decimal(10),
        currentValue: new Decimal(1500), // $150 per share now
      }),
    ];

    const mockAssets = [createMockAsset({ id: 'asset-1', symbol: 'AAPL' })];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    // Price at period start was $100 per share
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await calculateAllPerformance('portfolio-1', 'MONTH');

    // Start value: 10 shares * $100 = $1000
    // Current value: $1500
    // Gain: $500 (50%)
    expect(result[0].periodStartValue.toNumber()).toBe(1000);
    expect(result[0].absoluteGain.toNumber()).toBe(500);
    expect(result[0].percentGain).toBe(50);
  });

  it('uses current value as fallback when price is zero', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'holding-1',
        assetId: 'asset-1',
        currentValue: new Decimal(1000),
      }),
    ];

    const mockAssets = [createMockAsset({ id: 'asset-1', symbol: 'AAPL' })];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(0),
      isInterpolated: false,
    });

    const result = await calculateAllPerformance('portfolio-1', 'MONTH');

    // When price is zero, falls back to current value for start
    // This results in 0% gain
    expect(result[0].percentGain).toBe(0);
    expect(result[0].isInterpolated).toBe(true);
  });

  it('handles price lookup errors gracefully with zero fallback', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'holding-1',
        assetId: 'asset-1',
        currentValue: new Decimal(1100),
      }),
      createMockHolding({
        id: 'holding-2',
        assetId: 'asset-2',
        currentValue: new Decimal(1200),
      }),
    ];

    const mockAssets = [
      createMockAsset({ id: 'asset-1', symbol: 'AAPL' }),
      createMockAsset({ id: 'asset-2', symbol: 'GOOG' }),
    ];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    // First call throws, second succeeds
    mockPriceLookup.getPriceAtDate
      .mockRejectedValueOnce(new Error('Price lookup failed'))
      .mockResolvedValueOnce({
        price: new Decimal(100),
        isInterpolated: false,
      });

    const result = await calculateAllPerformance('portfolio-1', 'MONTH');

    // Both holdings get processed - failed one gets value 0 as fallback
    expect(result).toHaveLength(2);
    // First holding: start value 0 (error fallback), current 1100
    expect(result[0].holdingId).toBe('holding-1');
    expect(result[0].periodStartValue.toNumber()).toBe(0);
    expect(result[0].isInterpolated).toBe(true);
    // Second holding: normal calculation
    expect(result[1].holdingId).toBe('holding-2');
    expect(result[1].periodStartValue.toNumber()).toBe(1000); // 10 shares * $100
  });

  it('includes asset information in results', async () => {
    const mockHoldings = [
      createMockHolding({ id: 'holding-1', assetId: 'asset-1' }),
    ];

    const mockAssets = [
      createMockAsset({
        id: 'asset-1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
      }),
    ];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await calculateAllPerformance('portfolio-1', 'MONTH');

    expect(result[0].symbol).toBe('AAPL');
    expect(result[0].name).toBe('Apple Inc.');
    expect(result[0].assetType).toBe('stock');
  });

  it('uses correct time period start date', async () => {
    const mockHoldings = [
      createMockHolding({ id: 'holding-1', assetId: 'asset-1' }),
    ];

    const mockAssets = [createMockAsset({ id: 'asset-1', symbol: 'AAPL' })];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    // Test with different periods
    await calculateAllPerformance('portfolio-1', 'WEEK');
    expect(mockPriceLookup.getPriceAtDate).toHaveBeenCalled();

    vi.clearAllMocks();
    mockPriceLookup.createPriceCache.mockReturnValue(new Map());
    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    await calculateAllPerformance('portfolio-1', 'YEAR');
    expect(mockPriceLookup.getPriceAtDate).toHaveBeenCalled();
  });
});

describe('getTopPerformers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPriceLookup.createPriceCache.mockReturnValue(new Map());
  });

  it('returns empty array when no holdings have positive gains', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'holding-1',
        assetId: 'asset-1',
        currentValue: new Decimal(900), // Loss
      }),
    ];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue([
      createMockAsset({ id: 'asset-1' }),
    ]);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await getTopPerformers('portfolio-1', 'MONTH', 5);

    expect(result).toEqual([]);
  });

  it('returns top performers sorted by percentage gain descending', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'holding-1',
        assetId: 'asset-1',
        quantity: new Decimal(10),
        currentValue: new Decimal(1200), // 20% gain
      }),
      createMockHolding({
        id: 'holding-2',
        assetId: 'asset-2',
        quantity: new Decimal(10),
        currentValue: new Decimal(1500), // 50% gain
      }),
      createMockHolding({
        id: 'holding-3',
        assetId: 'asset-3',
        quantity: new Decimal(10),
        currentValue: new Decimal(1100), // 10% gain
      }),
    ];

    const mockAssets = [
      createMockAsset({ id: 'asset-1', symbol: 'AAPL' }),
      createMockAsset({ id: 'asset-2', symbol: 'GOOG' }),
      createMockAsset({ id: 'asset-3', symbol: 'MSFT' }),
    ];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100), // Start price $100/share = $1000 for 10 shares
      isInterpolated: false,
    });

    const result = await getTopPerformers('portfolio-1', 'MONTH', 3);

    expect(result).toHaveLength(3);
    expect(result[0].holdingId).toBe('holding-2'); // 50% gain
    expect(result[1].holdingId).toBe('holding-1'); // 20% gain
    expect(result[2].holdingId).toBe('holding-3'); // 10% gain
  });

  it('limits results to requested count', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'h1',
        assetId: 'a1',
        currentValue: new Decimal(1100),
      }),
      createMockHolding({
        id: 'h2',
        assetId: 'a2',
        currentValue: new Decimal(1200),
      }),
      createMockHolding({
        id: 'h3',
        assetId: 'a3',
        currentValue: new Decimal(1300),
      }),
      createMockHolding({
        id: 'h4',
        assetId: 'a4',
        currentValue: new Decimal(1400),
      }),
      createMockHolding({
        id: 'h5',
        assetId: 'a5',
        currentValue: new Decimal(1500),
      }),
    ];

    const mockAssets = mockHoldings.map((h) =>
      createMockAsset({ id: h.assetId, symbol: `SYM-${h.id}` })
    );

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await getTopPerformers('portfolio-1', 'MONTH', 3);

    expect(result).toHaveLength(3);
  });

  it('excludes holdings with zero or negative gains', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'h1',
        assetId: 'a1',
        currentValue: new Decimal(1100),
      }), // +10%
      createMockHolding({
        id: 'h2',
        assetId: 'a2',
        currentValue: new Decimal(1000),
      }), // 0%
      createMockHolding({
        id: 'h3',
        assetId: 'a3',
        currentValue: new Decimal(900),
      }), // -10%
    ];

    const mockAssets = mockHoldings.map((h) =>
      createMockAsset({ id: h.assetId })
    );

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await getTopPerformers('portfolio-1', 'MONTH', 5);

    expect(result).toHaveLength(1);
    expect(result[0].holdingId).toBe('h1');
  });
});

describe('getBiggestLosers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPriceLookup.createPriceCache.mockReturnValue(new Map());
  });

  it('returns empty array when no holdings have negative gains', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'holding-1',
        assetId: 'asset-1',
        currentValue: new Decimal(1100), // Gain
      }),
    ];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue([
      createMockAsset({ id: 'asset-1' }),
    ]);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await getBiggestLosers('portfolio-1', 'MONTH', 5);

    expect(result).toEqual([]);
  });

  it('returns biggest losers sorted by percentage loss ascending (worst first)', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'holding-1',
        assetId: 'asset-1',
        quantity: new Decimal(10),
        currentValue: new Decimal(800), // -20% loss
      }),
      createMockHolding({
        id: 'holding-2',
        assetId: 'asset-2',
        quantity: new Decimal(10),
        currentValue: new Decimal(500), // -50% loss
      }),
      createMockHolding({
        id: 'holding-3',
        assetId: 'asset-3',
        quantity: new Decimal(10),
        currentValue: new Decimal(900), // -10% loss
      }),
    ];

    const mockAssets = [
      createMockAsset({ id: 'asset-1', symbol: 'AAPL' }),
      createMockAsset({ id: 'asset-2', symbol: 'GOOG' }),
      createMockAsset({ id: 'asset-3', symbol: 'MSFT' }),
    ];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100), // Start price $100/share = $1000 for 10 shares
      isInterpolated: false,
    });

    const result = await getBiggestLosers('portfolio-1', 'MONTH', 3);

    expect(result).toHaveLength(3);
    expect(result[0].holdingId).toBe('holding-2'); // -50% loss (worst)
    expect(result[1].holdingId).toBe('holding-1'); // -20% loss
    expect(result[2].holdingId).toBe('holding-3'); // -10% loss
  });

  it('limits results to requested count', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'h1',
        assetId: 'a1',
        currentValue: new Decimal(900),
      }),
      createMockHolding({
        id: 'h2',
        assetId: 'a2',
        currentValue: new Decimal(800),
      }),
      createMockHolding({
        id: 'h3',
        assetId: 'a3',
        currentValue: new Decimal(700),
      }),
      createMockHolding({
        id: 'h4',
        assetId: 'a4',
        currentValue: new Decimal(600),
      }),
      createMockHolding({
        id: 'h5',
        assetId: 'a5',
        currentValue: new Decimal(500),
      }),
    ];

    const mockAssets = mockHoldings.map((h) =>
      createMockAsset({ id: h.assetId, symbol: `SYM-${h.id}` })
    );

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await getBiggestLosers('portfolio-1', 'MONTH', 3);

    expect(result).toHaveLength(3);
  });

  it('excludes holdings with zero or positive gains', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'h1',
        assetId: 'a1',
        currentValue: new Decimal(900),
      }), // -10%
      createMockHolding({
        id: 'h2',
        assetId: 'a2',
        currentValue: new Decimal(1000),
      }), // 0%
      createMockHolding({
        id: 'h3',
        assetId: 'a3',
        currentValue: new Decimal(1100),
      }), // +10%
    ];

    const mockAssets = mockHoldings.map((h) =>
      createMockAsset({ id: h.assetId })
    );

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue(mockAssets);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await getBiggestLosers('portfolio-1', 'MONTH', 5);

    expect(result).toHaveLength(1);
    expect(result[0].holdingId).toBe('h1');
  });
});

describe('Time Period Support', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPriceLookup.createPriceCache.mockReturnValue(new Map());
  });

  const timePeriods: TimePeriod[] = [
    'TODAY',
    'WEEK',
    'MONTH',
    'QUARTER',
    'YEAR',
    'ALL',
  ];

  it.each(timePeriods)('supports %s time period', async (period) => {
    const mockHoldings = [
      createMockHolding({ id: 'holding-1', assetId: 'asset-1' }),
    ];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue([
      createMockAsset({ id: 'asset-1' }),
    ]);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await calculateAllPerformance('portfolio-1', period);

    expect(result).toHaveLength(1);
    expect(result[0].period).toBe(period);
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPriceLookup.createPriceCache.mockReturnValue(new Map());
  });

  it('handles very small quantities', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'holding-1',
        assetId: 'asset-1',
        quantity: new Decimal('0.00001'),
        currentValue: new Decimal('0.0015'),
      }),
    ];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue([
      createMockAsset({ id: 'asset-1' }),
    ]);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await calculateAllPerformance('portfolio-1', 'MONTH');

    expect(result).toHaveLength(1);
    expect(result[0].percentGain).toBeDefined();
  });

  it('handles very large quantities', async () => {
    const mockHoldings = [
      createMockHolding({
        id: 'holding-1',
        assetId: 'asset-1',
        quantity: new Decimal('1000000000'),
        currentValue: new Decimal('110000000000'),
      }),
    ];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue([
      createMockAsset({ id: 'asset-1' }),
    ]);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await calculateAllPerformance('portfolio-1', 'MONTH');

    expect(result).toHaveLength(1);
    expect(result[0].absoluteGain.toNumber()).toBeDefined();
  });

  it('handles multiple holdings with same asset', async () => {
    // This shouldn't typically happen but the function should handle it
    const mockHoldings = [
      createMockHolding({
        id: 'holding-1',
        assetId: 'asset-1',
        currentValue: new Decimal(1100),
      }),
      createMockHolding({
        id: 'holding-2',
        assetId: 'asset-1',
        currentValue: new Decimal(1200),
      }),
    ];

    mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
    mockAssetQueries.getAll.mockResolvedValue([
      createMockAsset({ id: 'asset-1' }),
    ]);
    mockPriceLookup.getPriceAtDate.mockResolvedValue({
      price: new Decimal(100),
      isInterpolated: false,
    });

    const result = await calculateAllPerformance('portfolio-1', 'MONTH');

    expect(result).toHaveLength(2);
  });

  it('handles database query failures', async () => {
    mockHoldingQueries.getByPortfolio.mockRejectedValue(new Error('DB Error'));
    mockAssetQueries.getAll.mockResolvedValue([]);

    await expect(
      calculateAllPerformance('portfolio-1', 'MONTH')
    ).rejects.toThrow('DB Error');
  });
});
