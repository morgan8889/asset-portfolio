import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  calculateCurrentAllocation,
  calculateRebalancingPlan,
  calculateTaxEfficientRebalancingPlan,
} from '../rebalancing-service';
import { Asset, Holding } from '@/types';

// Test data helpers
function createAsset(overrides: Partial<Asset>): Asset {
  return {
    id: 'asset-1',
    symbol: 'TEST',
    name: 'Test Asset',
    type: 'stock',
    currency: 'USD',
    metadata: {},
    ...overrides,
  };
}

function createHolding(overrides: Partial<Holding>): Holding {
  return {
    id: 'holding-1',
    portfolioId: 'portfolio-1',
    assetId: 'asset-1',
    quantity: new Decimal(10),
    averageCost: new Decimal(100),
    currentValue: new Decimal(1000),
    costBasis: new Decimal(1000),
    unrealizedGain: new Decimal(0),
    unrealizedGainPercent: 0,
    lots: [],
    lastUpdated: new Date(),
    ...overrides,
  };
}

describe('RebalancingService', () => {
  describe('calculateCurrentAllocation', () => {
    it('should calculate allocation by asset class', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({
            id: 'h1',
            currentValue: new Decimal(6000),
          }),
          asset: createAsset({ id: 'a1', type: 'stock' }),
        },
        {
          holding: createHolding({
            id: 'h2',
            currentValue: new Decimal(4000),
          }),
          asset: createAsset({ id: 'a2', type: 'bond' }),
        },
      ];

      const allocation = calculateCurrentAllocation(
        holdingsWithAssets,
        'assetClass'
      );

      expect(allocation.dimension).toBe('assetClass');
      expect(allocation.breakdown).toHaveLength(2);
      expect(allocation.breakdown[0].category).toBe('stock');
      expect(allocation.breakdown[0].percentage).toBe(60);
      expect(allocation.breakdown[1].category).toBe('bond');
      expect(allocation.breakdown[1].percentage).toBe(40);
      expect(allocation.totalValue).toBe('10000');
    });

    it('should calculate allocation by sector', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({
            id: 'h1',
            currentValue: new Decimal(7000),
          }),
          asset: createAsset({ id: 'a1', sector: 'Technology' }),
        },
        {
          holding: createHolding({
            id: 'h2',
            currentValue: new Decimal(3000),
          }),
          asset: createAsset({ id: 'a2', sector: 'Healthcare' }),
        },
      ];

      const allocation = calculateCurrentAllocation(
        holdingsWithAssets,
        'sector'
      );

      expect(allocation.breakdown[0].category).toBe('Technology');
      expect(allocation.breakdown[0].percentage).toBe(70);
    });

    it('should calculate allocation by region', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({
            id: 'h1',
            currentValue: new Decimal(8000),
          }),
          asset: createAsset({ id: 'a1', region: 'US' }),
        },
        {
          holding: createHolding({
            id: 'h2',
            currentValue: new Decimal(2000),
          }),
          asset: createAsset({ id: 'a2', region: 'EU' }),
        },
      ];

      const allocation = calculateCurrentAllocation(
        holdingsWithAssets,
        'region'
      );

      expect(allocation.breakdown[0].category).toBe('US');
      expect(allocation.breakdown[0].percentage).toBe(80);
    });

    it('should group unclassified assets', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({
            id: 'h1',
            currentValue: new Decimal(5000),
          }),
          asset: createAsset({ id: 'a1', sector: 'Technology' }),
        },
        {
          holding: createHolding({
            id: 'h2',
            currentValue: new Decimal(5000),
          }),
          asset: createAsset({ id: 'a2', sector: undefined }),
        },
      ];

      const allocation = calculateCurrentAllocation(
        holdingsWithAssets,
        'sector'
      );

      expect(allocation.hasUnclassified).toBe(true);
      const unclassified = allocation.breakdown.find(
        (b) => b.category === 'Unclassified'
      );
      expect(unclassified).toBeDefined();
      expect(unclassified?.percentage).toBe(50);
    });

    it('should handle negative cash (margin)', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({
            id: 'h1',
            currentValue: new Decimal(10000),
          }),
          asset: createAsset({ id: 'a1', type: 'stock' }),
        },
        {
          holding: createHolding({
            id: 'h2',
            currentValue: new Decimal(-2000),
          }),
          asset: createAsset({ id: 'a2', type: 'cash' }),
        },
      ];

      const allocation = calculateCurrentAllocation(
        holdingsWithAssets,
        'assetClass'
      );

      const cashItem = allocation.breakdown.find((b) => b.category === 'cash');
      expect(cashItem?.value).toBe('-2000');
    });

    it('should exclude portfolios from calculation', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({
            id: 'h1',
            portfolioId: 'p1',
            currentValue: new Decimal(6000),
          }),
          asset: createAsset({ id: 'a1', type: 'stock' }),
        },
        {
          holding: createHolding({
            id: 'h2',
            portfolioId: 'p2',
            currentValue: new Decimal(4000),
          }),
          asset: createAsset({ id: 'a2', type: 'bond' }),
        },
      ];

      const allocation = calculateCurrentAllocation(
        holdingsWithAssets,
        'assetClass',
        ['p2'] // Exclude portfolio 2
      );

      expect(allocation.totalValue).toBe('6000');
      expect(allocation.breakdown).toHaveLength(1);
      expect(allocation.breakdown[0].category).toBe('stock');
    });

    it('should count holdings per category', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({
            id: 'h1',
            currentValue: new Decimal(3000),
          }),
          asset: createAsset({ id: 'a1', type: 'stock' }),
        },
        {
          holding: createHolding({
            id: 'h2',
            currentValue: new Decimal(3000),
          }),
          asset: createAsset({ id: 'a2', type: 'stock' }),
        },
        {
          holding: createHolding({
            id: 'h3',
            currentValue: new Decimal(4000),
          }),
          asset: createAsset({ id: 'a3', type: 'bond' }),
        },
      ];

      const allocation = calculateCurrentAllocation(
        holdingsWithAssets,
        'assetClass'
      );

      const stockItem = allocation.breakdown.find((b) => b.category === 'stock');
      expect(stockItem?.count).toBe(2);
    });
  });

  describe('calculateRebalancingPlan', () => {
    it('should generate rebalancing plan', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({
            id: 'h1',
            currentValue: new Decimal(7000),
          }),
          asset: createAsset({ id: 'a1', type: 'stock' }),
        },
        {
          holding: createHolding({
            id: 'h2',
            currentValue: new Decimal(3000),
          }),
          asset: createAsset({ id: 'a2', type: 'bond' }),
        },
      ];

      const plan = calculateRebalancingPlan(
        holdingsWithAssets,
        'Balanced 60/40',
        { stock: 60, bond: 40 },
        'assetClass'
      );

      expect(plan.targetModelName).toBe('Balanced 60/40');
      expect(plan.totalValue).toBe('10000');
      expect(plan.items).toHaveLength(2);

      const stockItem = plan.items.find((i) => i.category === 'stock');
      expect(stockItem?.currentPercent).toBe(70);
      expect(stockItem?.targetPercent).toBe(60);
      expect(stockItem?.driftPercent).toBe(10);
      expect(stockItem?.action).toBe('SELL');

      const bondItem = plan.items.find((i) => i.category === 'bond');
      expect(bondItem?.currentPercent).toBe(30);
      expect(bondItem?.targetPercent).toBe(40);
      expect(bondItem?.driftPercent).toBe(-10);
      expect(bondItem?.action).toBe('BUY');
    });

    it('should throw error if targets do not sum to 100%', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({ currentValue: new Decimal(5000) }),
          asset: createAsset({ type: 'stock' }),
        },
      ];

      expect(() =>
        calculateRebalancingPlan(
          holdingsWithAssets,
          'Invalid',
          { stock: 50, bond: 30 },
          'assetClass'
        )
      ).toThrow('must sum to 100%');
    });

    it('should handle HOLD action when within tolerance', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({
            id: 'h1',
            currentValue: new Decimal(6000),
          }),
          asset: createAsset({ id: 'a1', type: 'stock' }),
        },
        {
          holding: createHolding({
            id: 'h2',
            currentValue: new Decimal(4000),
          }),
          asset: createAsset({ id: 'a2', type: 'bond' }),
        },
      ];

      const plan = calculateRebalancingPlan(
        holdingsWithAssets,
        'Balanced',
        { stock: 60, bond: 40 },
        'assetClass'
      );

      const stockItem = plan.items.find((i) => i.category === 'stock');
      expect(stockItem?.action).toBe('HOLD');
    });

    it('should sort items by drift magnitude', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({
            id: 'h1',
            currentValue: new Decimal(5000),
          }),
          asset: createAsset({ id: 'a1', type: 'stock' }),
        },
        {
          holding: createHolding({
            id: 'h2',
            currentValue: new Decimal(3000),
          }),
          asset: createAsset({ id: 'a2', type: 'bond' }),
        },
        {
          holding: createHolding({
            id: 'h3',
            currentValue: new Decimal(2000),
          }),
          asset: createAsset({ id: 'a3', type: 'cash' }),
        },
      ];

      const plan = calculateRebalancingPlan(
        holdingsWithAssets,
        'Model',
        { stock: 60, bond: 30, cash: 10 },
        'assetClass'
      );

      // Should be sorted by absolute drift
      expect(Math.abs(plan.items[0].driftPercent)).toBeGreaterThanOrEqual(
        Math.abs(plan.items[1].driftPercent)
      );
    });

    it('should handle categories not in current holdings', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({
            id: 'h1',
            currentValue: new Decimal(10000),
          }),
          asset: createAsset({ id: 'a1', type: 'stock' }),
        },
      ];

      const plan = calculateRebalancingPlan(
        holdingsWithAssets,
        'Model',
        { stock: 60, bond: 40 },
        'assetClass'
      );

      const bondItem = plan.items.find((i) => i.category === 'bond');
      expect(bondItem).toBeDefined();
      expect(bondItem?.currentPercent).toBe(0);
      expect(bondItem?.action).toBe('BUY');
    });
  });

  describe('calculateTaxEfficientRebalancingPlan', () => {
    it('should prioritize using cash for purchases', () => {
      const holdingsWithAssets = [
        {
          holding: createHolding({
            id: 'h1',
            currentValue: new Decimal(6000),
          }),
          asset: createAsset({ id: 'a1', type: 'stock' }),
        },
        {
          holding: createHolding({
            id: 'h2',
            currentValue: new Decimal(2000),
          }),
          asset: createAsset({ id: 'a2', type: 'bond' }),
        },
        {
          holding: createHolding({
            id: 'h3',
            currentValue: new Decimal(2000),
          }),
          asset: createAsset({ id: 'a3', type: 'cash' }),
        },
      ];

      const plan = calculateTaxEfficientRebalancingPlan(
        holdingsWithAssets,
        'Balanced',
        { stock: 60, bond: 40, cash: 0 },
        'assetClass'
      );

      const cashItem = plan.items.find((i) => i.category === 'cash');
      expect(cashItem?.action).toBe('SELL'); // Cash should be used
    });
  });
});
