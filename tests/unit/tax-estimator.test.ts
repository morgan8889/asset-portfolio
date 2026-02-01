import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  estimateTaxLiability,
  estimateForHolding,
  calculateLotAnalysis,
} from '@/lib/services/tax-estimator';
import { Holding, TaxLot } from '@/types/asset';
import { TaxSettings } from '@/types/tax';

describe('estimateTaxLiability', () => {
  const taxSettings: TaxSettings = {
    shortTermRate: new Decimal(0.24),
    longTermRate: new Decimal(0.15),
    updatedAt: new Date(),
  };

  afterEach(() => {
    vi.useRealTimers();
  });

  test('calculates ST and LT gains correctly with FIFO', () => {
    // Mock current date to ensure consistent test results
    vi.setSystemTime(new Date('2025-01-15'));

    const holdings: Holding[] = [
      {
        id: 'holding-1',
        portfolioId: 'portfolio-1',
        assetId: 'asset-1',
        quantity: new Decimal(15),
        costBasis: new Decimal(1550),
        averageCost: new Decimal(103.33),
        currentValue: new Decimal(1800),
        unrealizedGain: new Decimal(250),
        unrealizedGainPercent: 16.13,
        lastUpdated: new Date(),
        lots: [
          // Old lot (LT) - purchased > 1 year ago
          {
            id: 'lot-1',
            purchaseDate: new Date('2023-01-01'),
            purchasePrice: new Decimal(100),
            quantity: new Decimal(10),
            soldQuantity: new Decimal(0),
            remainingQuantity: new Decimal(10),
          },
          // Recent lot (ST) - purchased < 1 year ago
          {
            id: 'lot-2',
            purchaseDate: new Date('2024-12-01'),
            purchasePrice: new Decimal(110),
            quantity: new Decimal(5),
            soldQuantity: new Decimal(0),
            remainingQuantity: new Decimal(5),
          },
        ],
      },
    ];

    const prices = new Map([['asset-1', new Decimal(120)]]);

    const result = estimateTaxLiability(holdings, prices, taxSettings);

    // LT gain: 10 × (120 - 100) = 200
    expect(result.longTermGains.toNumber()).toBeCloseTo(200);

    // ST gain: 5 × (120 - 110) = 50
    expect(result.shortTermGains.toNumber()).toBeCloseTo(50);

    // LT tax: 200 × 0.15 = 30
    expect(result.estimatedLTTax.toNumber()).toBeCloseTo(30);

    // ST tax: 50 × 0.24 = 12
    expect(result.estimatedSTTax.toNumber()).toBeCloseTo(12);

    // Total tax: 30 + 12 = 42
    expect(result.totalEstimatedTax.toNumber()).toBeCloseTo(42);

    // Total unrealized gain: 250
    expect(result.totalUnrealizedGain.toNumber()).toBeCloseTo(250);

    // Net unrealized gain: 250 - 0 = 250
    expect(result.netUnrealizedGain.toNumber()).toBeCloseTo(250);
  });

  test('handles unrealized losses correctly', () => {
    vi.setSystemTime(new Date('2025-01-15'));

    const holdings: Holding[] = [
      {
        id: 'holding-1',
        portfolioId: 'portfolio-1',
        assetId: 'asset-1',
        quantity: new Decimal(10),
        costBasis: new Decimal(1500),
        averageCost: new Decimal(150),
        currentValue: new Decimal(1000),
        unrealizedGain: new Decimal(-500),
        unrealizedGainPercent: -33.33,
        lastUpdated: new Date(),
        lots: [
          {
            id: 'lot-1',
            purchaseDate: new Date('2024-12-01'), // Recent purchase, ST
            purchasePrice: new Decimal(150),
            quantity: new Decimal(10),
            soldQuantity: new Decimal(0),
            remainingQuantity: new Decimal(10),
          },
        ],
      },
    ];

    const prices = new Map([['asset-1', new Decimal(100)]]);

    const result = estimateTaxLiability(holdings, prices, taxSettings);

    // Loss: 10 × (100 - 150) = -500
    expect(result.shortTermLosses.toNumber()).toBeCloseTo(500); // Stored as positive
    expect(result.netUnrealizedGain.toNumber()).toBeCloseTo(-500);

    // No tax on losses
    expect(result.totalEstimatedTax.toNumber()).toBe(0);
    expect(result.shortTermGains.toNumber()).toBe(0);
    expect(result.longTermGains.toNumber()).toBe(0);
  });

  test('includes ESPP adjusted cost basis in lot analysis', () => {
    const holdings: Holding[] = [
      {
        id: 'holding-1',
        portfolioId: 'portfolio-1',
        assetId: 'asset-1',
        quantity: new Decimal(10),
        costBasis: new Decimal(850),
        averageCost: new Decimal(85),
        currentValue: new Decimal(1200),
        unrealizedGain: new Decimal(350),
        unrealizedGainPercent: 41.18,
        lastUpdated: new Date(),
        lots: [
          {
            id: 'lot-1',
            purchaseDate: new Date('2023-01-01'),
            purchasePrice: new Decimal(85), // Discounted price
            quantity: new Decimal(10),
            soldQuantity: new Decimal(0),
            remainingQuantity: new Decimal(10),
            lotType: 'espp',
            bargainElement: new Decimal(15), // Market was $100
          },
        ],
      },
    ];

    const prices = new Map([['asset-1', new Decimal(120)]]);

    const result = estimateTaxLiability(holdings, prices, taxSettings);
    const lotAnalysis = result.lots[0];

    // Cost basis: 10 × $85 = $850
    expect(lotAnalysis.costBasis.toNumber()).toBeCloseTo(850);

    // Adjusted cost basis: 10 × ($85 + $15) = $1000
    expect(lotAnalysis.adjustedCostBasis!.toNumber()).toBeCloseTo(1000);

    // Unrealized gain (using initial basis): 10 × (120 - 85) = 350
    expect(lotAnalysis.unrealizedGain.toNumber()).toBeCloseTo(350);

    // Bargain element preserved
    expect(lotAnalysis.bargainElement!.toNumber()).toBe(15);
  });

  test('ignores lots with zero remaining quantity', () => {
    const holdings: Holding[] = [
      {
        id: 'holding-1',
        portfolioId: 'portfolio-1',
        assetId: 'asset-1',
        quantity: new Decimal(0),
        costBasis: new Decimal(0),
        averageCost: new Decimal(100),
        currentValue: new Decimal(0),
        unrealizedGain: new Decimal(0),
        unrealizedGainPercent: 0,
        lastUpdated: new Date(),
        lots: [
          {
            id: 'lot-1',
            purchaseDate: new Date('2023-01-01'),
            purchasePrice: new Decimal(100),
            quantity: new Decimal(10),
            soldQuantity: new Decimal(10), // Fully sold
            remainingQuantity: new Decimal(0),
          },
        ],
      },
    ];

    const prices = new Map([['asset-1', new Decimal(120)]]);

    const result = estimateTaxLiability(holdings, prices, taxSettings);

    expect(result.totalUnrealizedGain.toNumber()).toBe(0);
    expect(result.lots.length).toBe(0);
  });

  test('handles missing price for asset', () => {
    const holdings: Holding[] = [
      {
        id: 'holding-1',
        portfolioId: 'portfolio-1',
        assetId: 'asset-1',
        quantity: new Decimal(10),
        costBasis: new Decimal(1000),
        averageCost: new Decimal(100),
        currentValue: new Decimal(0),
        unrealizedGain: new Decimal(0),
        unrealizedGainPercent: 0,
        lastUpdated: new Date(),
        lots: [
          {
            id: 'lot-1',
            purchaseDate: new Date('2023-01-01'),
            purchasePrice: new Decimal(100),
            quantity: new Decimal(10),
            soldQuantity: new Decimal(0),
            remainingQuantity: new Decimal(10),
          },
        ],
      },
    ];

    const prices = new Map(); // No price for asset-1

    // Should skip holdings without current price
    const result = estimateTaxLiability(holdings, prices, taxSettings);
    expect(result.lots.length).toBe(0);
    expect(result.totalUnrealizedGain.toNumber()).toBe(0);
  });

  test('handles multiple holdings with mixed ST/LT lots', () => {
    vi.setSystemTime(new Date('2025-01-15'));

    const holdings: Holding[] = [
      {
        id: 'holding-1',
        portfolioId: 'portfolio-1',
        assetId: 'asset-1',
        quantity: new Decimal(20),
        costBasis: new Decimal(2000),
        averageCost: new Decimal(100),
        currentValue: new Decimal(2400),
        unrealizedGain: new Decimal(400),
        unrealizedGainPercent: 20,
        lastUpdated: new Date(),
        lots: [
          {
            id: 'lot-1',
            purchaseDate: new Date('2022-01-01'), // Old, LT
            purchasePrice: new Decimal(100),
            quantity: new Decimal(20),
            soldQuantity: new Decimal(0),
            remainingQuantity: new Decimal(20),
          },
        ],
      },
      {
        id: 'holding-2',
        portfolioId: 'portfolio-1',
        assetId: 'asset-2',
        quantity: new Decimal(10),
        costBasis: new Decimal(500),
        averageCost: new Decimal(50),
        currentValue: new Decimal(600),
        unrealizedGain: new Decimal(100),
        unrealizedGainPercent: 20,
        lastUpdated: new Date(),
        lots: [
          {
            id: 'lot-2',
            purchaseDate: new Date('2024-12-01'), // Recent, ST
            purchasePrice: new Decimal(50),
            quantity: new Decimal(10),
            soldQuantity: new Decimal(0),
            remainingQuantity: new Decimal(10),
          },
        ],
      },
    ];

    const prices = new Map([
      ['asset-1', new Decimal(120)],
      ['asset-2', new Decimal(60)],
    ]);

    const result = estimateTaxLiability(holdings, prices, taxSettings);

    // Asset 1: LT gain = 20 × (120 - 100) = 400
    // Asset 2: ST gain = 10 × (60 - 50) = 100
    expect(result.longTermGains.toNumber()).toBeCloseTo(400);
    expect(result.shortTermGains.toNumber()).toBeCloseTo(100);

    // Tax: LT = 400 × 0.15 = 60, ST = 100 × 0.24 = 24
    expect(result.estimatedLTTax.toNumber()).toBeCloseTo(60);
    expect(result.estimatedSTTax.toNumber()).toBeCloseTo(24);
    expect(result.totalEstimatedTax.toNumber()).toBeCloseTo(84);
  });

  test('handles partial lot sales correctly', () => {
    const holdings: Holding[] = [
      {
        id: 'holding-1',
        portfolioId: 'portfolio-1',
        assetId: 'asset-1',
        quantity: new Decimal(5),
        costBasis: new Decimal(500),
        averageCost: new Decimal(100),
        currentValue: new Decimal(600),
        unrealizedGain: new Decimal(100),
        unrealizedGainPercent: 20,
        lastUpdated: new Date(),
        lots: [
          {
            id: 'lot-1',
            purchaseDate: new Date('2023-01-01'),
            purchasePrice: new Decimal(100),
            quantity: new Decimal(10),
            soldQuantity: new Decimal(5), // Partial sale
            remainingQuantity: new Decimal(5),
          },
        ],
      },
    ];

    const prices = new Map([['asset-1', new Decimal(120)]]);

    const result = estimateTaxLiability(holdings, prices, taxSettings);

    // Only remaining 5 shares count
    // LT gain: 5 × (120 - 100) = 100
    expect(result.longTermGains.toNumber()).toBeCloseTo(100);
    expect(result.lots[0].quantity.toNumber()).toBe(5);
  });
});

describe('calculateLotAnalysis', () => {
  test('calculates all fields correctly for standard lot', () => {
    const lot: TaxLot = {
      id: 'lot-1',
      purchaseDate: new Date('2023-06-15'),
      purchasePrice: new Decimal(100),
      quantity: new Decimal(50),
      soldQuantity: new Decimal(10),
      remainingQuantity: new Decimal(40),
      lotType: 'standard',
    };

    const analysis = calculateLotAnalysis(lot, 'AAPL', new Decimal(150));

    expect(analysis.lotId).toBe('lot-1');
    expect(analysis.assetSymbol).toBe('AAPL');
    expect(analysis.quantity.toNumber()).toBe(40);
    expect(analysis.costBasis.toNumber()).toBeCloseTo(4000); // 40 × 100
    expect(analysis.currentValue.toNumber()).toBeCloseTo(6000); // 40 × 150
    expect(analysis.unrealizedGain.toNumber()).toBeCloseTo(2000); // 6000 - 4000
    expect(analysis.holdingPeriod).toBe('long');
    expect(analysis.lotType).toBe('standard');
  });

  test('includes ESPP fields for ESPP lot', () => {
    const lot: TaxLot = {
      id: 'lot-2',
      purchaseDate: new Date('2024-01-01'),
      purchasePrice: new Decimal(85),
      quantity: new Decimal(100),
      soldQuantity: new Decimal(0),
      remainingQuantity: new Decimal(100),
      lotType: 'espp',
      bargainElement: new Decimal(15),
      grantDate: new Date('2023-06-01'),
    };

    const analysis = calculateLotAnalysis(lot, 'GOOGL', new Decimal(120));

    expect(analysis.bargainElement!.toNumber()).toBe(15);
    expect(analysis.adjustedCostBasis!.toNumber()).toBeCloseTo(10000); // 100 × (85 + 15)
    expect(analysis.lotType).toBe('espp');
  });

  test('handles negative unrealized gain (loss)', () => {
    const lot: TaxLot = {
      id: 'lot-3',
      purchaseDate: new Date('2024-01-01'),
      purchasePrice: new Decimal(150),
      quantity: new Decimal(10),
      soldQuantity: new Decimal(0),
      remainingQuantity: new Decimal(10),
    };

    const analysis = calculateLotAnalysis(lot, 'TSLA', new Decimal(100));

    expect(analysis.unrealizedGain.toNumber()).toBeCloseTo(-500); // 10 × (100 - 150)
    expect(analysis.currentValue.toNumber()).toBeCloseTo(1000);
    expect(analysis.costBasis.toNumber()).toBeCloseTo(1500);
  });
});
