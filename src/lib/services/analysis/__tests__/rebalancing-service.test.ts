/**
 * Tests for Rebalancing Service
 */

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import {
  calculateRebalancing,
  validateTargetModel,
  normalizeTargetModel,
} from '../rebalancing-service';
import { TargetModel } from '@/types/analysis';
import { Holding, Asset } from '@/types';

describe('Rebalancing Service', () => {
  describe('calculateRebalancing', () => {
    it('should calculate rebalancing actions', () => {
      const holdings: Holding[] = [
        {
          id: '1',
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(1000),
          costBasis: new Decimal(80000),
          averageCost: new Decimal(80),
          currentValue: new Decimal(80000),
          unrealizedGain: new Decimal(0),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: '2',
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(200),
          costBasis: new Decimal(20000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(20000),
          unrealizedGain: new Decimal(0),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      const assets: Asset[] = [
        {
          id: 'a1',
          symbol: 'AAPL',
          name: 'Apple',
          type: 'stock',
          currency: 'USD',
          metadata: {},
        },
        {
          id: 'a2',
          symbol: 'BOND',
          name: 'Bond',
          type: 'bond',
          currency: 'USD',
          metadata: {},
        },
      ];

      const targetModel: TargetModel = {
        id: '60-40',
        name: '60/40',
        isSystem: true,
        allocations: {
          stock: 60,
          bond: 40,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      const plan = calculateRebalancing({
        holdings,
        assets,
        totalValue: new Decimal(100000),
        targetModel,
      });

      expect(plan.actions).toBeDefined();
      expect(plan.actions.length).toBeGreaterThan(0);

      const stockAction = plan.actions.find((a) => a.assetType === 'stock');
      expect(stockAction).toBeDefined();
      expect(stockAction!.action).toBe('sell'); // 80% -> 60%
      expect(stockAction!.differencePercent).toBeLessThan(0);

      const bondAction = plan.actions.find((a) => a.assetType === 'bond');
      expect(bondAction).toBeDefined();
      expect(bondAction!.action).toBe('buy'); // 20% -> 40%
      expect(bondAction!.differencePercent).toBeGreaterThan(0);
    });

    it('should generate hold actions for balanced portfolio', () => {
      const holdings: Holding[] = [
        {
          id: '1',
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(600),
          costBasis: new Decimal(60000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(60000),
          unrealizedGain: new Decimal(0),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: '2',
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(400),
          costBasis: new Decimal(40000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(40000),
          unrealizedGain: new Decimal(0),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      const assets: Asset[] = [
        {
          id: 'a1',
          symbol: 'AAPL',
          name: 'Apple',
          type: 'stock',
          currency: 'USD',
          metadata: {},
        },
        {
          id: 'a2',
          symbol: 'BOND',
          name: 'Bond',
          type: 'bond',
          currency: 'USD',
          metadata: {},
        },
      ];

      const targetModel: TargetModel = {
        id: '60-40',
        name: '60/40',
        isSystem: true,
        allocations: {
          stock: 60,
          bond: 40,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      const plan = calculateRebalancing({
        holdings,
        assets,
        totalValue: new Decimal(100000),
        targetModel,
      });

      const stockAction = plan.actions.find((a) => a.assetType === 'stock');
      const bondAction = plan.actions.find((a) => a.assetType === 'bond');

      expect(stockAction!.action).toBe('hold');
      expect(bondAction!.action).toBe('hold');
    });
  });

  describe('validateTargetModel', () => {
    it('should validate model with correct allocation', () => {
      const model: TargetModel = {
        id: 'test',
        name: 'Test',
        isSystem: false,
        allocations: {
          stock: 60,
          bond: 40,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      expect(validateTargetModel(model)).toBe(true);
    });

    it('should reject model with incorrect total', () => {
      const model: TargetModel = {
        id: 'test',
        name: 'Test',
        isSystem: false,
        allocations: {
          stock: 60,
          bond: 30,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      expect(validateTargetModel(model)).toBe(false);
    });
  });

  describe('normalizeTargetModel', () => {
    it('should normalize model to 100%', () => {
      const model: TargetModel = {
        id: 'test',
        name: 'Test',
        isSystem: false,
        allocations: {
          stock: 60,
          bond: 30,
          etf: 0,
          crypto: 0,
          real_estate: 0,
          commodity: 0,
          cash: 0,
          index: 0,
          other: 0,
        },
      };

      const normalized = normalizeTargetModel(model);
      const total = Object.values(normalized.allocations).reduce(
        (sum, val) => sum + val,
        0
      );

      expect(Math.abs(total - 100)).toBeLessThan(0.01);
    });
  });
});
