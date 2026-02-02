/**
 * Tax Calculator Service Tests
 *
 * Unit tests for tax calculation functions including holding period,
 * aging lot detection, and tax exposure metrics.
 */

import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  calculateHoldingPeriod,
  detectAgingLots,
  calculateTaxExposure,
} from '../tax-calculator';
import { Holding, TaxLot, Asset } from '@/types';
import { DEFAULT_TAX_SETTINGS } from '@/types/settings';

describe('calculateHoldingPeriod', () => {
  it('should return "short" for lots held less than 365 days', () => {
    const purchaseDate = new Date('2024-06-01');
    const currentDate = new Date('2025-01-01'); // 214 days later

    const result = calculateHoldingPeriod(purchaseDate, currentDate);

    expect(result).toBe('short');
  });

  it('should return "long" for lots held exactly 365 days', () => {
    const purchaseDate = new Date('2024-01-01');
    const currentDate = new Date('2024-12-31'); // 365 days later (leap year)

    const result = calculateHoldingPeriod(purchaseDate, currentDate);

    expect(result).toBe('long');
  });

  it('should return "long" for lots held more than 365 days', () => {
    const purchaseDate = new Date('2023-01-01');
    const currentDate = new Date('2025-01-01'); // 731 days later

    const result = calculateHoldingPeriod(purchaseDate, currentDate);

    expect(result).toBe('long');
  });

  it('should use current date when not provided', () => {
    const purchaseDate = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000); // 400 days ago

    const result = calculateHoldingPeriod(purchaseDate);

    expect(result).toBe('long');
  });
});

describe('detectAgingLots', () => {
  const createMockLot = (
    id: string,
    purchaseDate: Date,
    remainingQuantity: number,
    purchasePrice: number
  ): TaxLot => ({
    id,
    quantity: new Decimal(remainingQuantity + 10), // Some sold
    purchasePrice: new Decimal(purchasePrice),
    purchaseDate,
    soldQuantity: new Decimal(10),
    remainingQuantity: new Decimal(remainingQuantity),
    notes: undefined,
  });

  const createMockHolding = (
    id: string,
    assetId: string,
    lots: TaxLot[]
  ): Holding => ({
    id,
    portfolioId: 'portfolio-1',
    assetId,
    quantity: lots.reduce(
      (sum, lot) => sum.add(lot.remainingQuantity),
      new Decimal(0)
    ),
    costBasis: new Decimal(0),
    averageCost: new Decimal(0),
    currentValue: new Decimal(0),
    unrealizedGain: new Decimal(0),
    unrealizedGainPercent: 0,
    lots,
    lastUpdated: new Date(),
  });

  const createMockAsset = (
    id: string,
    symbol: string,
    currentPrice: number
  ): Asset => ({
    id,
    symbol,
    name: `${symbol} Inc`,
    type: 'stock',
    currency: 'USD',
    currentPrice,
    priceUpdatedAt: new Date(),
    exchange: 'NASDAQ',
    sector: 'Technology',
    metadata: {},
  });

  it('should detect lots within 30 days of long-term status', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDateAging = new Date('2024-02-10'); // 356 days ago, 9 days until LT
    const purchaseDateNotAging = new Date('2024-05-01'); // 275 days ago, 90 days until LT

    const lot1 = createMockLot('lot-1', purchaseDateAging, 100, 50);
    const lot2 = createMockLot('lot-2', purchaseDateNotAging, 50, 40);

    const holding = createMockHolding('holding-1', 'asset-1', [lot1, lot2]);
    const asset = createMockAsset('asset-1', 'AAPL', 150);

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    const result = detectAgingLots([holding], assetMap, 30, currentDate);

    expect(result).toHaveLength(1);
    expect(result[0].lotId).toBe('lot-1');
    expect(result[0].daysUntilLongTerm).toBe(9);
    expect(result[0].assetSymbol).toBe('AAPL');
  });

  it('should calculate unrealized gains correctly', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDate = new Date('2024-02-10'); // 356 days ago

    const lot = createMockLot('lot-1', purchaseDate, 100, 50); // Cost: $5,000
    const holding = createMockHolding('holding-1', 'asset-1', [lot]);
    const asset = createMockAsset('asset-1', 'AAPL', 150); // Value: $15,000

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    const result = detectAgingLots([holding], assetMap, 30, currentDate);

    expect(result).toHaveLength(1);
    expect(result[0].unrealizedGain.toNumber()).toBe(10000); // $15,000 - $5,000
    expect(result[0].unrealizedGainPercent).toBe(200); // 200%
    expect(result[0].currentValue.toNumber()).toBe(15000);
  });

  it('should skip lots without price data', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDate = new Date('2024-02-10');

    const lot = createMockLot('lot-1', purchaseDate, 100, 50);
    const holding = createMockHolding('holding-1', 'asset-1', [lot]);
    const assetNoPrice = createMockAsset('asset-1', 'AAPL', 0);
    assetNoPrice.currentPrice = undefined; // No price data

    const assetMap = new Map<string, Asset>([['asset-1', assetNoPrice]]);

    const result = detectAgingLots([holding], assetMap, 30, currentDate);

    expect(result).toHaveLength(0);
  });

  it('should skip fully sold lots', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDate = new Date('2024-02-10');

    const lotSold: TaxLot = {
      id: 'lot-1',
      quantity: new Decimal(100),
      purchasePrice: new Decimal(50),
      purchaseDate,
      soldQuantity: new Decimal(100), // Fully sold
      remainingQuantity: new Decimal(0),
      notes: undefined,
    };

    const holding = createMockHolding('holding-1', 'asset-1', [lotSold]);
    const asset = createMockAsset('asset-1', 'AAPL', 150);

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    const result = detectAgingLots([holding], assetMap, 30, currentDate);

    expect(result).toHaveLength(0);
  });

  it('should sort by earliest lots first', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDate1 = new Date('2024-02-15'); // 351 days ago, 14 days until LT
    const purchaseDate2 = new Date('2024-02-10'); // 356 days ago, 9 days until LT
    const purchaseDate3 = new Date('2024-02-20'); // 346 days ago, 19 days until LT

    const lot1 = createMockLot('lot-1', purchaseDate1, 100, 50);
    const lot2 = createMockLot('lot-2', purchaseDate2, 50, 40);
    const lot3 = createMockLot('lot-3', purchaseDate3, 75, 45);

    const holding = createMockHolding('holding-1', 'asset-1', [
      lot1,
      lot2,
      lot3,
    ]);
    const asset = createMockAsset('asset-1', 'AAPL', 150);

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    const result = detectAgingLots([holding], assetMap, 30, currentDate);

    expect(result).toHaveLength(3);
    expect(result[0].lotId).toBe('lot-2'); // 9 days
    expect(result[1].lotId).toBe('lot-1'); // 14 days
    expect(result[2].lotId).toBe('lot-3'); // 19 days
  });

  it('should respect custom lookback days', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDate = new Date('2024-03-01'); // 337 days ago, 28 days until LT

    const lot = createMockLot('lot-1', purchaseDate, 100, 50);
    const holding = createMockHolding('holding-1', 'asset-1', [lot]);
    const asset = createMockAsset('asset-1', 'AAPL', 150);

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    // With 30-day lookback, should be included
    const result30 = detectAgingLots([holding], assetMap, 30, currentDate);
    expect(result30).toHaveLength(1);

    // With 20-day lookback, should be excluded
    const result20 = detectAgingLots([holding], assetMap, 20, currentDate);
    expect(result20).toHaveLength(0);
  });
});

describe('calculateTaxExposure', () => {
  const createMockLot = (
    id: string,
    purchaseDate: Date,
    remainingQuantity: number,
    purchasePrice: number
  ): TaxLot => ({
    id,
    quantity: new Decimal(remainingQuantity),
    purchasePrice: new Decimal(purchasePrice),
    purchaseDate,
    soldQuantity: new Decimal(0),
    remainingQuantity: new Decimal(remainingQuantity),
    notes: undefined,
  });

  const createMockHolding = (
    id: string,
    assetId: string,
    lots: TaxLot[]
  ): Holding => ({
    id,
    portfolioId: 'portfolio-1',
    assetId,
    quantity: lots.reduce(
      (sum, lot) => sum.add(lot.remainingQuantity),
      new Decimal(0)
    ),
    costBasis: new Decimal(0),
    averageCost: new Decimal(0),
    currentValue: new Decimal(0),
    unrealizedGain: new Decimal(0),
    unrealizedGainPercent: 0,
    lots,
    lastUpdated: new Date(),
  });

  const createMockAsset = (
    id: string,
    symbol: string,
    currentPrice: number
  ): Asset => ({
    id,
    symbol,
    name: `${symbol} Inc`,
    type: 'stock',
    currency: 'USD',
    currentPrice,
    priceUpdatedAt: new Date(),
    exchange: 'NASDAQ',
    sector: 'Technology',
    metadata: {},
  });

  it('should calculate short-term gains correctly', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDate = new Date('2024-06-01'); // 244 days ago (short-term)

    const lot = createMockLot('lot-1', purchaseDate, 100, 50); // Cost: $5,000
    const holding = createMockHolding('holding-1', 'asset-1', [lot]);
    const asset = createMockAsset('asset-1', 'AAPL', 60); // Value: $6,000

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    const result = calculateTaxExposure(
      [holding],
      assetMap,
      DEFAULT_TAX_SETTINGS,
      currentDate
    );

    expect(result.shortTermGains.toNumber()).toBe(1000); // $6,000 - $5,000
    expect(result.longTermGains.toNumber()).toBe(0);
    expect(result.netShortTerm.toNumber()).toBe(1000);
  });

  it('should calculate long-term gains correctly', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDate = new Date('2023-06-01'); // 609 days ago (long-term)

    const lot = createMockLot('lot-1', purchaseDate, 100, 50); // Cost: $5,000
    const holding = createMockHolding('holding-1', 'asset-1', [lot]);
    const asset = createMockAsset('asset-1', 'AAPL', 60); // Value: $6,000

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    const result = calculateTaxExposure(
      [holding],
      assetMap,
      DEFAULT_TAX_SETTINGS,
      currentDate
    );

    expect(result.longTermGains.toNumber()).toBe(1000);
    expect(result.shortTermGains.toNumber()).toBe(0);
    expect(result.netLongTerm.toNumber()).toBe(1000);
  });

  it('should calculate losses correctly', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDateST = new Date('2024-06-01'); // Short-term
    const purchaseDateLT = new Date('2023-06-01'); // Long-term

    const lotST = createMockLot('lot-1', purchaseDateST, 100, 60); // Cost: $6,000
    const lotLT = createMockLot('lot-2', purchaseDateLT, 100, 60); // Cost: $6,000
    const holding = createMockHolding('holding-1', 'asset-1', [lotST, lotLT]);
    const asset = createMockAsset('asset-1', 'AAPL', 50); // Value: $5,000 each

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    const result = calculateTaxExposure(
      [holding],
      assetMap,
      DEFAULT_TAX_SETTINGS,
      currentDate
    );

    expect(result.shortTermLosses.toNumber()).toBe(1000); // $6,000 - $5,000
    expect(result.longTermLosses.toNumber()).toBe(1000);
    expect(result.netShortTerm.toNumber()).toBe(-1000);
    expect(result.netLongTerm.toNumber()).toBe(-1000);
  });

  it('should calculate estimated tax liability correctly', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDateST = new Date('2024-06-01'); // Short-term
    const purchaseDateLT = new Date('2023-06-01'); // Long-term

    const lotST = createMockLot('lot-1', purchaseDateST, 100, 50); // Gain: $1,000
    const lotLT = createMockLot('lot-2', purchaseDateLT, 100, 50); // Gain: $1,000
    const holding = createMockHolding('holding-1', 'asset-1', [lotST, lotLT]);
    const asset = createMockAsset('asset-1', 'AAPL', 60);

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    const result = calculateTaxExposure(
      [holding],
      assetMap,
      DEFAULT_TAX_SETTINGS,
      currentDate
    );

    // ST: $1,000 × (0.24 + 0.05) = $290
    // LT: $1,000 × (0.15 + 0.05) = $200
    // Total: $490
    expect(result.estimatedTaxLiability.toNumber()).toBe(490);
  });

  it('should calculate effective tax rate correctly', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDateST = new Date('2024-06-01');
    const purchaseDateLT = new Date('2023-06-01');

    const lotST = createMockLot('lot-1', purchaseDateST, 100, 50); // Gain: $1,000
    const lotLT = createMockLot('lot-2', purchaseDateLT, 100, 50); // Gain: $1,000
    const holding = createMockHolding('holding-1', 'asset-1', [lotST, lotLT]);
    const asset = createMockAsset('asset-1', 'AAPL', 60);

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    const result = calculateTaxExposure(
      [holding],
      assetMap,
      DEFAULT_TAX_SETTINGS,
      currentDate
    );

    // Total gains: $2,000
    // Total tax: $490
    // Effective rate: $490 / $2,000 = 0.245 (24.5%)
    expect(result.effectiveTaxRate).toBeCloseTo(0.245, 3);
  });

  it('should count aging lots correctly', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDateAging1 = new Date('2024-02-10'); // 356 days ago, 9 days until LT
    const purchaseDateAging2 = new Date('2024-02-15'); // 351 days ago, 14 days until LT
    const purchaseDateNotAging = new Date('2024-05-01'); // 275 days ago, 90 days until LT

    const lot1 = createMockLot('lot-1', purchaseDateAging1, 100, 50);
    const lot2 = createMockLot('lot-2', purchaseDateAging2, 50, 40);
    const lot3 = createMockLot('lot-3', purchaseDateNotAging, 75, 45);

    const holding = createMockHolding('holding-1', 'asset-1', [
      lot1,
      lot2,
      lot3,
    ]);
    const asset = createMockAsset('asset-1', 'AAPL', 60);

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    const result = calculateTaxExposure(
      [holding],
      assetMap,
      DEFAULT_TAX_SETTINGS,
      currentDate
    );

    expect(result.agingLotsCount).toBe(2); // lot1 and lot2
  });

  it('should handle zero gains gracefully', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDate = new Date('2024-06-01');

    const lot = createMockLot('lot-1', purchaseDate, 100, 50);
    const holding = createMockHolding('holding-1', 'asset-1', [lot]);
    const asset = createMockAsset('asset-1', 'AAPL', 50); // No gain/loss

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    const result = calculateTaxExposure(
      [holding],
      assetMap,
      DEFAULT_TAX_SETTINGS,
      currentDate
    );

    expect(result.totalUnrealizedGain.toNumber()).toBe(0);
    expect(result.estimatedTaxLiability.toNumber()).toBe(0);
    expect(result.effectiveTaxRate).toBe(0);
  });

  it('should skip holdings without price data', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDate = new Date('2024-06-01');

    const lot = createMockLot('lot-1', purchaseDate, 100, 50);
    const holding = createMockHolding('holding-1', 'asset-1', [lot]);
    const assetNoPrice = createMockAsset('asset-1', 'AAPL', 0);
    assetNoPrice.currentPrice = undefined;

    const assetMap = new Map<string, Asset>([['asset-1', assetNoPrice]]);

    const result = calculateTaxExposure(
      [holding],
      assetMap,
      DEFAULT_TAX_SETTINGS,
      currentDate
    );

    expect(result.totalUnrealizedGain.toNumber()).toBe(0);
    expect(result.estimatedTaxLiability.toNumber()).toBe(0);
  });

  it('should handle zero purchase price (free shares from grants)', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDate = new Date('2024-06-01');

    // Zero purchase price lot (e.g., stock grants)
    const lot = createMockLot('lot-1', purchaseDate, 100, 0);
    const holding = createMockHolding('holding-1', 'asset-1', [lot]);
    const asset = createMockAsset('asset-1', 'AAPL', 50); // Current price $50

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    const result = calculateTaxExposure(
      [holding],
      assetMap,
      DEFAULT_TAX_SETTINGS,
      currentDate
    );

    // All gain is unrealized (100 shares * $50 = $5000)
    expect(result.shortTermGains.toNumber()).toBe(5000);
    expect(result.totalUnrealizedGain.toNumber()).toBe(5000);
    // Tax should be calculated on gains
    expect(result.estimatedTaxLiability.toNumber()).toBeGreaterThan(0);
  });

  it('should handle negative cost basis gracefully', () => {
    const currentDate = new Date('2025-01-31');
    const purchaseDate = new Date('2023-01-01'); // Long-term

    // Simulate negative cost basis (e.g., after dividends exceed investment)
    const lot = createMockLot('lot-1', purchaseDate, 100, -5); // Negative price
    const holding = createMockHolding('holding-1', 'asset-1', [lot]);
    const asset = createMockAsset('asset-1', 'AAPL', 50);

    const assetMap = new Map<string, Asset>([['asset-1', asset]]);

    // Should not throw error with negative cost basis
    const result = calculateTaxExposure(
      [holding],
      assetMap,
      DEFAULT_TAX_SETTINGS,
      currentDate
    );

    // Should calculate gains properly
    expect(result.longTermGains.toNumber()).toBeGreaterThan(0);
    expect(result.estimatedTaxLiability.toNumber()).toBeGreaterThan(0);
  });
});
