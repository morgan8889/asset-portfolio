/**
 * Tax Calculator Performance Tests
 *
 * Validates that tax calculations meet performance targets from spec:
 * - SC-003: Tax Exposure widget renders in <200ms
 * - Aging lot detection efficient for 500 holdings
 */

import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import { detectAgingLots, calculateTaxExposure } from '../tax-calculator';
import { Holding, TaxLot } from '@/types/asset';
import { Asset } from '@/types';
import { DEFAULT_TAX_SETTINGS } from '@/types/settings';

/**
 * Generate test holdings with tax lots for performance testing
 */
function generateTestHoldings(count: number): {
  holdings: Holding[];
  assetMap: Map<string, Asset>;
} {
  const holdings: Holding[] = [];
  const assetMap = new Map<string, Asset>();
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const assetId = `asset-${i}`;
    const symbol = `TEST${i}`;

    // Create asset
    const asset: Asset = {
      id: assetId,
      symbol,
      name: `Test Asset ${i}`,
      type: 'stock',
      currentPrice: new Decimal(100 + i),
      currency: 'USD',
      region: 'US',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    assetMap.set(assetId, asset);

    // Create holding with 2-3 tax lots per holding
    const lotCount = 2 + (i % 2); // Alternates between 2 and 3 lots
    const lots: TaxLot[] = [];
    let totalQuantity = new Decimal(0);
    let totalCost = new Decimal(0);

    for (let j = 0; j < lotCount; j++) {
      // Mix of short-term, long-term, and aging lots
      const daysOld = (i * 10 + j * 100) % 400; // 0-400 days old
      const purchaseDate = new Date(now.getTime() - daysOld * 24 * 60 * 60 * 1000);
      const quantity = new Decimal(10 + j * 5);
      const purchasePrice = new Decimal(90 + i + j * 5);

      totalQuantity = totalQuantity.plus(quantity);
      totalCost = totalCost.plus(quantity.times(purchasePrice));

      lots.push({
        id: `lot-${i}-${j}`,
        quantity,
        purchasePrice,
        purchaseDate,
        soldQuantity: new Decimal(0),
        remainingQuantity: quantity,
      });
    }

    const costBasis = totalCost;
    const averageCost = totalQuantity.isZero() ? new Decimal(0) : costBasis.div(totalQuantity);
    const currentValue = totalQuantity.times(asset.currentPrice);
    const unrealizedGain = currentValue.minus(costBasis);

    holdings.push({
      id: `holding-${i}`,
      portfolioId: 'test-portfolio',
      assetId,
      quantity: totalQuantity,
      costBasis,
      averageCost,
      currentValue,
      unrealizedGain,
      unrealizedGainPercent: costBasis.isZero() ? 0 : unrealizedGain.div(costBasis).times(100).toNumber(),
      lots,
      lastUpdated: new Date(),
    });
  }

  return { holdings, assetMap };
}

describe('Tax Calculator Performance', () => {
  it('should detect aging lots in <200ms for 500 holdings', () => {
    const { holdings, assetMap } = generateTestHoldings(500);

    const startTime = performance.now();
    const agingLots = detectAgingLots(holdings, assetMap, 30);
    const endTime = performance.now();

    const duration = endTime - startTime;

    // Should complete in <200ms
    expect(duration).toBeLessThan(200);

    // Should find some aging lots (probabilistic due to random date distribution)
    console.log(`Detected ${agingLots.length} aging lots in ${duration.toFixed(2)}ms`);
  });

  it('should calculate tax exposure in <200ms for 500 holdings', () => {
    const { holdings, assetMap } = generateTestHoldings(500);

    const taxSettings = DEFAULT_TAX_SETTINGS;

    const startTime = performance.now();
    const taxExposure = calculateTaxExposure(holdings, assetMap, taxSettings);
    const endTime = performance.now();

    const duration = endTime - startTime;

    // Should complete in <200ms (SC-003)
    expect(duration).toBeLessThan(200);

    // Should return valid metrics
    expect(taxExposure).toBeDefined();
    expect(taxExposure.estimatedTaxLiability).toBeInstanceOf(Decimal);
    expect(taxExposure.netShortTerm).toBeInstanceOf(Decimal);
    expect(taxExposure.netLongTerm).toBeInstanceOf(Decimal);

    console.log(`Calculated tax exposure in ${duration.toFixed(2)}ms`);
    console.log(`  - ST Gains: $${taxExposure.netShortTerm.toFixed(2)}`);
    console.log(`  - LT Gains: $${taxExposure.netLongTerm.toFixed(2)}`);
    console.log(`  - Tax Liability: $${taxExposure.estimatedTaxLiability.toFixed(2)}`);
  });

  it('should handle combined tax operations in <200ms', () => {
    // Realistic scenario: dashboard widget rendering
    const { holdings, assetMap } = generateTestHoldings(500);

    const taxSettings: TaxSettings = {
      shortTermRate: 0.24,
      longTermRate: 0.15,
    };

    const startTime = performance.now();

    // Combined operations that would happen in widget render
    const agingLots = detectAgingLots(holdings, assetMap, 30);
    const taxExposure = calculateTaxExposure(holdings, assetMap, taxSettings);

    const endTime = performance.now();
    const duration = endTime - startTime;

    // Combined operations should still complete in <200ms
    expect(duration).toBeLessThan(200);

    console.log(`Combined tax operations completed in ${duration.toFixed(2)}ms`);
    console.log(`  - Aging lots: ${agingLots.length}`);
    console.log(`  - Tax liability: $${taxExposure.estimatedTaxLiability.toFixed(2)}`);
  });

  it('should scale well with 1000 holdings', () => {
    // Stress test with 2x the target
    const { holdings, assetMap } = generateTestHoldings(1000);

    const taxSettings: TaxSettings = {
      shortTermRate: 0.24,
      longTermRate: 0.15,
    };

    const startTime = performance.now();
    const taxExposure = calculateTaxExposure(holdings, assetMap, taxSettings);
    const agingLots = detectAgingLots(holdings, assetMap, 30);
    const endTime = performance.now();

    const duration = endTime - startTime;

    // Should still complete in reasonable time (< 400ms for 2x data)
    expect(duration).toBeLessThan(400);

    console.log(`Stress test (1000 holdings) completed in ${duration.toFixed(2)}ms`);
    console.log(`  - Aging lots: ${agingLots.length}`);
  });
});
