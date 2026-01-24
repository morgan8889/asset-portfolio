import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  calculateTotalValue,
  calculateTotalCost,
  calculateTotalGain,
  calculateGainPercent,
  calculateAllocationByType,
  calculateHoldingAllocation,
  calculateDayChange,
  calculateBasicPerformance,
  calculatePortfolioMetrics,
  calculateRebalancingNeeds,
  calculateWeightedAverageCost,
  calculatePositionWeight,
  calculatePositionGainLoss,
  calculateDividendYield,
  HoldingWithAsset,
} from '../metrics-service';
import { Holding, Asset } from '@/types';
import { generateHoldingId, generateAssetId } from '@/types/storage';

describe('Metrics Service', () => {
  describe('calculateTotalValue', () => {
    it('should sum current values of all holdings', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(5),
          costBasis: new Decimal(500),
          averageCost: new Decimal(100),
          currentValue: new Decimal(600),
          unrealizedGain: new Decimal(100),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      const result = calculateTotalValue(holdings);
      expect(result.toString()).toBe('1800');
    });

    it('should return zero for empty holdings', () => {
      const result = calculateTotalValue([]);
      expect(result.toString()).toBe('0');
    });
  });

  describe('calculateTotalCost', () => {
    it('should sum cost basis of all holdings', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(5),
          costBasis: new Decimal(500),
          averageCost: new Decimal(100),
          currentValue: new Decimal(600),
          unrealizedGain: new Decimal(100),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      const result = calculateTotalCost(holdings);
      expect(result.toString()).toBe('1500');
    });

    it('should return zero for empty holdings', () => {
      const result = calculateTotalCost([]);
      expect(result.toString()).toBe('0');
    });
  });

  describe('calculateTotalGain', () => {
    it('should sum unrealized gains of all holdings', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(5),
          costBasis: new Decimal(500),
          averageCost: new Decimal(100),
          currentValue: new Decimal(400),
          unrealizedGain: new Decimal(-100),
          unrealizedGainPercent: -20,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      const result = calculateTotalGain(holdings);
      expect(result.toString()).toBe('100');
    });
  });

  describe('calculateGainPercent', () => {
    it('should calculate percentage gain', () => {
      const result = calculateGainPercent(new Decimal(200), new Decimal(1000));
      expect(result).toBe(20);
    });

    it('should return zero for zero cost', () => {
      const result = calculateGainPercent(new Decimal(100), new Decimal(0));
      expect(result).toBe(0);
    });

    it('should handle negative gains', () => {
      const result = calculateGainPercent(new Decimal(-200), new Decimal(1000));
      expect(result).toBe(-20);
    });
  });

  describe('calculateAllocationByType', () => {
    it('should calculate allocation breakdown by asset type', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(5),
          costBasis: new Decimal(500),
          averageCost: new Decimal(100),
          currentValue: new Decimal(600),
          unrealizedGain: new Decimal(100),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      const assets: Asset[] = [
        {
          id: 'a1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'stock',
          currentPrice: 120,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'a2',
          symbol: 'BTC',
          name: 'Bitcoin',
          type: 'crypto',
          currentPrice: 120,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const holdingsWithAssets: HoldingWithAsset[] = holdings.map((holding) => ({
        holding,
        asset: assets.find((a) => a.id === holding.assetId),
      }));

      const result = calculateAllocationByType(
        holdingsWithAssets,
        new Decimal(1800)
      );

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('stock');
      expect(result[0].percent).toBeCloseTo(66.67, 1);
      expect(result[1].type).toBe('crypto');
      expect(result[1].percent).toBeCloseTo(33.33, 1);
    });

    it('should handle missing asset data', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      const holdingsWithAssets: HoldingWithAsset[] = [
        { holding: holdings[0], asset: undefined },
      ];

      const result = calculateAllocationByType(
        holdingsWithAssets,
        new Decimal(1200)
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('other');
    });

    it('should return zero percent for zero total value', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(0),
          unrealizedGain: new Decimal(-1000),
          unrealizedGainPercent: -100,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      const assets: Asset[] = [
        {
          id: 'a1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'stock',
          currentPrice: 0,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const holdingsWithAssets: HoldingWithAsset[] = holdings.map((holding) => ({
        holding,
        asset: assets.find((a) => a.id === holding.assetId),
      }));

      const result = calculateAllocationByType(holdingsWithAssets, new Decimal(0));

      expect(result[0].percent).toBe(0);
    });
  });

  describe('calculateHoldingAllocation', () => {
    it('should calculate individual holding allocations', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(5),
          costBasis: new Decimal(500),
          averageCost: new Decimal(100),
          currentValue: new Decimal(600),
          unrealizedGain: new Decimal(100),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      const result = calculateHoldingAllocation(holdings, new Decimal(1800));

      expect(result).toHaveLength(2);
      expect(result[0].percent).toBeCloseTo(66.67, 1);
      expect(result[1].percent).toBeCloseTo(33.33, 1);
    });
  });

  describe('calculateDayChange', () => {
    it('should calculate day change and percentage', () => {
      const result = calculateDayChange(new Decimal(1200), new Decimal(1000));

      expect(result.change.toString()).toBe('200');
      expect(result.changePercent).toBe(20);
    });

    it('should handle negative change', () => {
      const result = calculateDayChange(new Decimal(800), new Decimal(1000));

      expect(result.change.toString()).toBe('-200');
      expect(result.changePercent).toBe(-20);
    });

    it('should handle zero previous value', () => {
      const result = calculateDayChange(new Decimal(1000), new Decimal(0));

      expect(result.change.toString()).toBe('1000');
      expect(result.changePercent).toBe(0);
    });
  });

  describe('calculateBasicPerformance', () => {
    it('should return basic performance metrics', () => {
      const holdings: Holding[] = [];
      const result = calculateBasicPerformance(15.5, holdings);

      expect(result.roi).toBe(15.5);
      expect(result.annualizedReturn).toBe(0);
      expect(result.volatility).toBe(0);
      expect(result.sharpeRatio).toBe(0);
      expect(result.maxDrawdown).toBe(0);
    });
  });

  describe('calculatePortfolioMetrics', () => {
    it('should calculate complete portfolio metrics', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      const assets: Asset[] = [
        {
          id: 'a1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'stock',
          currentPrice: 120,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const holdingsWithAssets: HoldingWithAsset[] = holdings.map((holding) => ({
        holding,
        asset: assets.find((a) => a.id === holding.assetId),
      }));

      const result = calculatePortfolioMetrics(holdingsWithAssets);

      expect(result.totalValue.toString()).toBe('1200');
      expect(result.totalCost.toString()).toBe('1000');
      expect(result.totalGain.toString()).toBe('200');
      expect(result.totalGainPercent).toBe(20);
      expect(result.dayChange.toString()).toBe('0');
      expect(result.dayChangePercent).toBe(0);
      expect(result.allocation).toHaveLength(1);
      expect(result.performance.roi).toBe(20);
    });

    it('should calculate day change when previous value provided', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      const assets: Asset[] = [
        {
          id: 'a1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'stock',
          currentPrice: 120,
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const holdingsWithAssets: HoldingWithAsset[] = holdings.map((holding) => ({
        holding,
        asset: assets.find((a) => a.id === holding.assetId),
      }));

      const result = calculatePortfolioMetrics(
        holdingsWithAssets,
        new Decimal(1100)
      );

      expect(result.dayChange.toString()).toBe('100');
      expect(result.dayChangePercent).toBeCloseTo(9.09, 1);
    });
  });

  describe('calculateRebalancingNeeds', () => {
    it('should calculate rebalancing adjustments', () => {
      const allocation = [
        {
          type: 'stock' as const,
          value: new Decimal(800),
          percent: 80,
        },
        {
          type: 'bond' as const,
          value: new Decimal(200),
          percent: 20,
        },
      ];

      const targetAllocations = new Map([
        ['stock' as const, 60],
        ['bond' as const, 40],
      ]);

      const result = calculateRebalancingNeeds(
        allocation,
        targetAllocations,
        new Decimal(1000)
      );

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('stock');
      expect(result[0].drift).toBe(20);
      expect(result[0].adjustmentValue.toString()).toBe('-200');
      expect(result[1].type).toBe('bond');
      expect(result[1].drift).toBe(-20);
      expect(result[1].adjustmentValue.toString()).toBe('200');
    });

    it('should handle missing target allocations', () => {
      const allocation = [
        {
          type: 'stock' as const,
          value: new Decimal(1000),
          percent: 100,
        },
      ];

      const targetAllocations = new Map();

      const result = calculateRebalancingNeeds(
        allocation,
        targetAllocations,
        new Decimal(1000)
      );

      expect(result[0].targetPercent).toBe(0);
      expect(result[0].drift).toBe(100);
    });
  });

  describe('calculateWeightedAverageCost', () => {
    it('should calculate weighted average cost', () => {
      const result = calculateWeightedAverageCost(
        new Decimal(10),
        new Decimal(1050)
      );

      expect(result.toString()).toBe('105');
    });

    it('should return zero for zero quantity', () => {
      const result = calculateWeightedAverageCost(
        new Decimal(0),
        new Decimal(1000)
      );

      expect(result.toString()).toBe('0');
    });
  });

  describe('calculatePositionWeight', () => {
    it('should calculate position weight in portfolio', () => {
      const result = calculatePositionWeight(
        new Decimal(250),
        new Decimal(1000)
      );

      expect(result).toBe(25);
    });

    it('should return zero for zero portfolio value', () => {
      const result = calculatePositionWeight(new Decimal(250), new Decimal(0));

      expect(result).toBe(0);
    });
  });

  describe('calculatePositionGainLoss', () => {
    it('should calculate gain for a position', () => {
      const result = calculatePositionGainLoss(
        new Decimal(1200),
        new Decimal(1000)
      );

      expect(result.gain.toString()).toBe('200');
      expect(result.gainPercent).toBe(20);
    });

    it('should calculate loss for a position', () => {
      const result = calculatePositionGainLoss(
        new Decimal(800),
        new Decimal(1000)
      );

      expect(result.gain.toString()).toBe('-200');
      expect(result.gainPercent).toBe(-20);
    });

    it('should handle zero cost basis', () => {
      const result = calculatePositionGainLoss(new Decimal(1000), new Decimal(0));

      expect(result.gain.toString()).toBe('1000');
      expect(result.gainPercent).toBe(0);
    });
  });

  describe('calculateDividendYield', () => {
    it('should calculate dividend yield percentage', () => {
      const result = calculateDividendYield(new Decimal(5), new Decimal(100));

      expect(result).toBe(5);
    });

    it('should handle zero price', () => {
      const result = calculateDividendYield(new Decimal(5), new Decimal(0));

      expect(result).toBe(0);
    });

    it('should calculate fractional yields', () => {
      const result = calculateDividendYield(new Decimal(2.5), new Decimal(80));

      expect(result).toBe(3.125);
    });
  });
});
