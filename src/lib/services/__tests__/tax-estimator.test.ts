/**
 * Tax Estimator Service Tests
 *
 * Unit tests for tax liability estimation with FIFO lot selection, holding period
 * classification, and ESPP bargain element handling.
 */

import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import { addDays } from 'date-fns';
import {
  estimateTaxLiability,
  estimateForHolding,
  calculateLotAnalysis,
} from '../tax-estimator';
import { Holding, TaxLot } from '@/types/asset';
import { TaxSettings } from '@/types/tax';

// Test helpers
const createMockLot = (
  id: string,
  quantity: number,
  purchasePrice: number,
  purchaseDate: Date,
  soldQuantity: number = 0,
  lotType: 'standard' | 'espp' | 'rsu' = 'standard'
): TaxLot => {
  const qty = new Decimal(quantity);
  const sold = new Decimal(soldQuantity);
  return {
    id,
    quantity: qty,
    purchasePrice: new Decimal(purchasePrice),
    purchaseDate,
    soldQuantity: sold,
    remainingQuantity: qty.minus(sold),
    notes: undefined,
    lotType,
  };
};

const createMockHolding = (
  id: string,
  assetId: string,
  lots: TaxLot[]
): Holding => {
  const quantity = lots.reduce(
    (sum, lot) => sum.add(lot.remainingQuantity),
    new Decimal(0)
  );
  const costBasis = lots.reduce(
    (sum, lot) => sum.add(lot.purchasePrice.mul(lot.remainingQuantity)),
    new Decimal(0)
  );

  return {
    id,
    portfolioId: 'portfolio-1',
    assetId,
    quantity,
    costBasis,
    averageCost: quantity.greaterThan(0)
      ? costBasis.div(quantity)
      : new Decimal(0),
    currentValue: new Decimal(0), // Will be calculated
    unrealizedGain: new Decimal(0), // Will be calculated
    unrealizedGainPercent: 0,
    lots,
    lastUpdated: new Date(),
  };
};

const defaultTaxSettings: TaxSettings = {
  shortTermRate: new Decimal(0.24), // 24%
  longTermRate: new Decimal(0.15), // 15%
  updatedAt: new Date(),
};

describe('calculateLotAnalysis', () => {
  const assetSymbol = 'AAPL';
  const currentPrice = new Decimal(150);
  const now = new Date('2025-06-01');

  it('should calculate correct unrealized gain for profitable lot', () => {
    const lot = createMockLot('lot-1', 100, 120, new Date('2024-01-01'));

    const result = calculateLotAnalysis(lot, assetSymbol, currentPrice, now);

    expect(result.lotId).toBe('lot-1');
    expect(result.assetSymbol).toBe('AAPL');
    expect(result.quantity).toEqual(new Decimal(100));
    expect(result.costBasis).toEqual(new Decimal(12000)); // 100 * 120
    expect(result.currentValue).toEqual(new Decimal(15000)); // 100 * 150
    expect(result.unrealizedGain).toEqual(new Decimal(3000)); // 15000 - 12000
  });

  it('should calculate correct unrealized loss for losing lot', () => {
    const lot = createMockLot('lot-1', 100, 180, new Date('2024-01-01'));

    const result = calculateLotAnalysis(lot, assetSymbol, currentPrice, now);

    expect(result.unrealizedGain).toEqual(new Decimal(-3000)); // 15000 - 18000
  });

  it('should classify as short-term for lots held ≤365 days', () => {
    const purchaseDate = addDays(now, -300); // 300 days ago
    const lot = createMockLot('lot-1', 100, 120, purchaseDate);

    const result = calculateLotAnalysis(lot, assetSymbol, currentPrice, now);

    expect(result.holdingPeriod).toBe('short');
    expect(result.holdingDays).toBe(300);
  });

  it('should classify as long-term for lots held >365 days', () => {
    const purchaseDate = addDays(now, -400); // 400 days ago
    const lot = createMockLot('lot-1', 100, 120, purchaseDate);

    const result = calculateLotAnalysis(lot, assetSymbol, currentPrice, now);

    expect(result.holdingPeriod).toBe('long');
    expect(result.holdingDays).toBe(400);
  });

  it('should handle boundary: exactly 365 days (short-term)', () => {
    const purchaseDate = addDays(now, -365);
    const lot = createMockLot('lot-1', 100, 120, purchaseDate);

    const result = calculateLotAnalysis(lot, assetSymbol, currentPrice, now);

    expect(result.holdingPeriod).toBe('short');
    expect(result.holdingDays).toBe(365);
  });

  it('should handle boundary: 366 days (long-term)', () => {
    const purchaseDate = addDays(now, -366);
    const lot = createMockLot('lot-1', 100, 120, purchaseDate);

    const result = calculateLotAnalysis(lot, assetSymbol, currentPrice, now);

    expect(result.holdingPeriod).toBe('long');
    expect(result.holdingDays).toBe(366);
  });

  it('should include ESPP-specific fields when lotType is espp', () => {
    const purchaseDate = new Date('2024-01-01');
    const grantDate = new Date('2023-07-01');
    const bargainElement = new Decimal(10);

    const lot: TaxLot = {
      ...createMockLot('lot-1', 100, 50, purchaseDate, 0, 'espp'),
      grantDate,
      bargainElement,
    };

    const result = calculateLotAnalysis(lot, assetSymbol, currentPrice, now);

    expect(result.lotType).toBe('espp');
    expect(result.grantDate).toEqual(grantDate);
    expect(result.bargainElement).toEqual(bargainElement);
    // Adjusted cost basis = costBasis + (bargainElement × quantity)
    expect(result.adjustedCostBasis).toEqual(new Decimal(6000)); // 5000 + (10 * 100)
  });

  it('should handle RSU lot type', () => {
    const lot = createMockLot(
      'lot-1',
      100,
      150,
      new Date('2024-01-01'),
      0,
      'rsu'
    );

    const result = calculateLotAnalysis(lot, assetSymbol, currentPrice, now);

    expect(result.lotType).toBe('rsu');
  });

  it('should handle standard lot type', () => {
    const lot = createMockLot('lot-1', 100, 120, new Date('2024-01-01'));

    const result = calculateLotAnalysis(lot, assetSymbol, currentPrice, now);

    expect(result.lotType).toBe('standard');
  });

  it('should handle partially sold lots', () => {
    const lot = createMockLot('lot-1', 100, 120, new Date('2024-01-01'), 60);

    const result = calculateLotAnalysis(lot, assetSymbol, currentPrice, now);

    expect(result.quantity).toEqual(new Decimal(40)); // remainingQuantity
    expect(result.costBasis).toEqual(new Decimal(4800)); // 40 * 120
    expect(result.currentValue).toEqual(new Decimal(6000)); // 40 * 150
  });

  it('should handle zero unrealized gain', () => {
    const lot = createMockLot('lot-1', 100, 150, new Date('2024-01-01'));

    const result = calculateLotAnalysis(lot, assetSymbol, currentPrice, now);

    expect(result.unrealizedGain).toEqual(new Decimal(0));
  });
});

describe('estimateTaxLiability', () => {
  // Note: Function uses current date internally, so we use recent dates
  const now = new Date(); // Actual current date

  it('should calculate tax for single short-term lot with gain', () => {
    const purchaseDate = addDays(now, -200); // Short-term (< 365 days)
    const lot = createMockLot('lot-1', 100, 120, purchaseDate);
    const holding = createMockHolding('holding-1', 'AAPL', [lot]);
    const currentPrices = new Map([['AAPL', new Decimal(150)]]);

    const result = estimateTaxLiability(
      [holding],
      currentPrices,
      defaultTaxSettings
    );

    expect(result.shortTermGains).toEqual(new Decimal(3000)); // (150 - 120) * 100
    expect(result.longTermGains).toEqual(new Decimal(0));
    expect(result.estimatedSTTax).toEqual(new Decimal(720)); // 3000 * 0.24
    expect(result.estimatedLTTax).toEqual(new Decimal(0));
    expect(result.totalEstimatedTax).toEqual(new Decimal(720));
  });

  it('should calculate tax for single long-term lot with gain', () => {
    const purchaseDate = addDays(now, -400); // Long-term
    const lot = createMockLot('lot-1', 100, 120, purchaseDate);
    const holding = createMockHolding('holding-1', 'AAPL', [lot]);
    const currentPrices = new Map([['AAPL', new Decimal(150)]]);

    const result = estimateTaxLiability(
      [holding],
      currentPrices,
      defaultTaxSettings
    );

    expect(result.shortTermGains).toEqual(new Decimal(0));
    expect(result.longTermGains).toEqual(new Decimal(3000));
    expect(result.estimatedSTTax).toEqual(new Decimal(0));
    expect(result.estimatedLTTax).toEqual(new Decimal(450)); // 3000 * 0.15
    expect(result.totalEstimatedTax).toEqual(new Decimal(450));
  });

  it('should calculate tax for multiple lots with mixed holding periods', () => {
    const stLot = createMockLot('lot-1', 100, 120, addDays(now, -200));
    const ltLot = createMockLot('lot-2', 50, 130, addDays(now, -400));
    const holding = createMockHolding('holding-1', 'AAPL', [stLot, ltLot]);
    const currentPrices = new Map([['AAPL', new Decimal(150)]]);

    const result = estimateTaxLiability(
      [holding],
      currentPrices,
      defaultTaxSettings
    );

    // ST: (150 - 120) * 100 = 3000
    // LT: (150 - 130) * 50 = 1000
    expect(result.shortTermGains).toEqual(new Decimal(3000));
    expect(result.longTermGains).toEqual(new Decimal(1000));
    expect(result.estimatedSTTax).toEqual(new Decimal(720)); // 3000 * 0.24
    expect(result.estimatedLTTax).toEqual(new Decimal(150)); // 1000 * 0.15
    expect(result.totalEstimatedTax).toEqual(new Decimal(870));
  });

  it('should handle lots with losses', () => {
    const stLot = createMockLot('lot-1', 100, 180, addDays(now, -200));
    const holding = createMockHolding('holding-1', 'AAPL', [stLot]);
    const currentPrices = new Map([['AAPL', new Decimal(150)]]);

    const result = estimateTaxLiability(
      [holding],
      currentPrices,
      defaultTaxSettings
    );

    expect(result.shortTermLosses).toEqual(new Decimal(3000)); // (180 - 150) * 100
    expect(result.shortTermGains).toEqual(new Decimal(0));
    expect(result.estimatedSTTax).toEqual(new Decimal(0)); // No tax on losses
    expect(result.totalEstimatedTax).toEqual(new Decimal(0));
  });

  it('should handle mixed gains and losses', () => {
    const gainLot = createMockLot('lot-1', 100, 120, addDays(now, -200));
    const lossLot = createMockLot('lot-2', 50, 180, addDays(now, -200));
    const holding = createMockHolding('holding-1', 'AAPL', [gainLot, lossLot]);
    const currentPrices = new Map([['AAPL', new Decimal(150)]]);

    const result = estimateTaxLiability(
      [holding],
      currentPrices,
      defaultTaxSettings
    );

    expect(result.shortTermGains).toEqual(new Decimal(3000)); // (150 - 120) * 100
    expect(result.shortTermLosses).toEqual(new Decimal(1500)); // (180 - 150) * 50
    expect(result.netUnrealizedGain).toEqual(new Decimal(1500)); // 3000 - 1500
    expect(result.estimatedSTTax).toEqual(new Decimal(720)); // Only tax on gains
  });

  it('should handle multiple holdings across different assets', () => {
    const lot1 = createMockLot('lot-1', 100, 120, addDays(now, -200));
    const lot2 = createMockLot('lot-2', 50, 80, addDays(now, -400));

    const holding1 = createMockHolding('holding-1', 'AAPL', [lot1]);
    const holding2 = createMockHolding('holding-2', 'GOOGL', [lot2]);

    const currentPrices = new Map([
      ['AAPL', new Decimal(150)],
      ['GOOGL', new Decimal(100)],
    ]);

    const result = estimateTaxLiability(
      [holding1, holding2],
      currentPrices,
      defaultTaxSettings
    );

    // AAPL ST: (150 - 120) * 100 = 3000
    // GOOGL LT: (100 - 80) * 50 = 1000
    expect(result.shortTermGains).toEqual(new Decimal(3000));
    expect(result.longTermGains).toEqual(new Decimal(1000));
    expect(result.totalEstimatedTax).toEqual(new Decimal(870)); // 720 + 150
  });

  it('should skip holdings without current price', () => {
    const lot = createMockLot('lot-1', 100, 120, addDays(now, -200));
    const holding = createMockHolding('holding-1', 'AAPL', [lot]);
    const currentPrices = new Map(); // No price for AAPL

    const result = estimateTaxLiability(
      [holding],
      currentPrices,
      defaultTaxSettings
    );

    expect(result.totalEstimatedTax).toEqual(new Decimal(0));
    expect(result.lots).toHaveLength(0);
  });

  it('should skip lots with zero remaining quantity', () => {
    const lot = createMockLot('lot-1', 100, 120, addDays(now, -200), 100);
    const holding = createMockHolding('holding-1', 'AAPL', [lot]);
    const currentPrices = new Map([['AAPL', new Decimal(150)]]);

    const result = estimateTaxLiability(
      [holding],
      currentPrices,
      defaultTaxSettings
    );

    expect(result.totalEstimatedTax).toEqual(new Decimal(0));
    expect(result.lots).toHaveLength(0);
  });

  it('should apply custom tax rates', () => {
    const lot = createMockLot('lot-1', 100, 120, addDays(now, -200));
    const holding = createMockHolding('holding-1', 'AAPL', [lot]);
    const currentPrices = new Map([['AAPL', new Decimal(150)]]);

    const customTaxSettings: TaxSettings = {
      shortTermRate: new Decimal(0.37), // 37%
      longTermRate: new Decimal(0.2), // 20%
      updatedAt: new Date(),
    };

    const result = estimateTaxLiability(
      [holding],
      currentPrices,
      customTaxSettings
    );

    expect(result.estimatedSTTax).toEqual(new Decimal(1110)); // 3000 * 0.37
  });

  it('should return lot-level details in results', () => {
    const lot = createMockLot('lot-1', 100, 120, addDays(now, -200));
    const holding = createMockHolding('holding-1', 'AAPL', [lot]);
    const currentPrices = new Map([['AAPL', new Decimal(150)]]);

    const result = estimateTaxLiability(
      [holding],
      currentPrices,
      defaultTaxSettings
    );

    expect(result.lots).toHaveLength(1);
    expect(result.lots[0].lotId).toBe('lot-1');
    expect(result.lots[0].assetSymbol).toBe('AAPL');
    expect(result.lots[0].unrealizedGain).toEqual(new Decimal(3000));
  });

  it('should handle zero gains scenario', () => {
    const lot = createMockLot('lot-1', 100, 150, addDays(now, -200));
    const holding = createMockHolding('holding-1', 'AAPL', [lot]);
    const currentPrices = new Map([['AAPL', new Decimal(150)]]);

    const result = estimateTaxLiability(
      [holding],
      currentPrices,
      defaultTaxSettings
    );

    expect(result.totalUnrealizedGain).toEqual(new Decimal(0));
    expect(result.totalEstimatedTax).toEqual(new Decimal(0));
  });

  it('should handle all losses scenario', () => {
    const lot1 = createMockLot('lot-1', 100, 180, addDays(now, -200));
    const lot2 = createMockLot('lot-2', 50, 200, addDays(now, -400));
    const holding = createMockHolding('holding-1', 'AAPL', [lot1, lot2]);
    const currentPrices = new Map([['AAPL', new Decimal(150)]]);

    const result = estimateTaxLiability(
      [holding],
      currentPrices,
      defaultTaxSettings
    );

    expect(result.shortTermLosses).toEqual(new Decimal(3000));
    expect(result.longTermLosses).toEqual(new Decimal(2500));
    expect(result.totalEstimatedTax).toEqual(new Decimal(0));
  });
});

describe('estimateForHolding', () => {
  const now = new Date(); // Actual current date

  it('should calculate tax for single holding', () => {
    const lot = createMockLot('lot-1', 100, 120, addDays(now, -200));
    const holding = createMockHolding('holding-1', 'AAPL', [lot]);
    const currentPrice = new Decimal(150);

    const result = estimateForHolding(
      holding,
      currentPrice,
      defaultTaxSettings
    );

    expect(result.shortTermGains).toEqual(new Decimal(3000));
    expect(result.totalEstimatedTax).toEqual(new Decimal(720));
  });

  it('should use holding assetId to match price', () => {
    const lot = createMockLot('lot-1', 100, 120, addDays(now, -400));
    const holding = createMockHolding('holding-1', 'CUSTOM_ID', [lot]);
    const currentPrice = new Decimal(150);

    const result = estimateForHolding(
      holding,
      currentPrice,
      defaultTaxSettings
    );

    expect(result.longTermGains).toEqual(new Decimal(3000));
  });
});

describe('integration: ESPP lot handling', () => {
  const now = new Date('2025-06-01');

  it('should include ESPP bargain element in lot analysis', () => {
    const purchaseDate = new Date('2024-01-01');
    const grantDate = new Date('2023-07-01');
    const bargainElement = new Decimal(15);

    const esppLot: TaxLot = {
      ...createMockLot('lot-1', 100, 50, purchaseDate, 0, 'espp'),
      grantDate,
      bargainElement,
    };

    const holding = createMockHolding('holding-1', 'AAPL', [esppLot]);
    const currentPrices = new Map([['AAPL', new Decimal(70)]]);

    const result = estimateTaxLiability(
      [holding],
      currentPrices,
      defaultTaxSettings
    );

    expect(result.lots).toHaveLength(1);
    expect(result.lots[0].lotType).toBe('espp');
    expect(result.lots[0].grantDate).toEqual(grantDate);
    expect(result.lots[0].bargainElement).toEqual(bargainElement);
    // Cost basis: 100 * 50 = 5000
    // Adjusted cost basis: 5000 + (15 * 100) = 6500
    expect(result.lots[0].adjustedCostBasis).toEqual(new Decimal(6500));
  });
});
