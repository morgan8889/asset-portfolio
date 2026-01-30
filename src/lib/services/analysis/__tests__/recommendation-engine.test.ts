/**
 * Tests for Recommendation Engine
 */

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import { generateRecommendations } from '../recommendation-engine';
import { Holding, Asset } from '@/types';

describe('Recommendation Engine', () => {
  describe('generateRecommendations', () => {
    it('should detect high cash drag', () => {
      const holdings: Holding[] = [
        {
          id: '1',
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(1000),
          costBasis: new Decimal(20000),
          averageCost: new Decimal(20),
          currentValue: new Decimal(20000),
          unrealizedGain: new Decimal(0),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: '2',
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(80000),
          costBasis: new Decimal(80000),
          averageCost: new Decimal(1),
          currentValue: new Decimal(80000),
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
          symbol: 'CASH',
          name: 'Cash',
          type: 'cash',
          currency: 'USD',
          metadata: {},
        },
      ];

      const recommendations = generateRecommendations({
        holdings,
        assets,
        totalValue: new Decimal(100000),
      });

      const cashDragRec = recommendations.find((r) => r.type === 'cash_drag');
      expect(cashDragRec).toBeDefined();
      expect(cashDragRec!.severity).toBe('high');
    });

    it('should detect asset type concentration', () => {
      const holdings: Holding[] = [
        {
          id: '1',
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(1000),
          costBasis: new Decimal(90000),
          averageCost: new Decimal(90),
          currentValue: new Decimal(90000),
          unrealizedGain: new Decimal(0),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: '2',
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(100),
          costBasis: new Decimal(10000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(10000),
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

      const recommendations = generateRecommendations({
        holdings,
        assets,
        totalValue: new Decimal(100000),
      });

      const concentrationRec = recommendations.find(
        (r) => r.type === 'concentration'
      );
      expect(concentrationRec).toBeDefined();
      expect(concentrationRec!.metadata?.assetType).toBe('stock');
    });

    it('should not generate recommendations for well-balanced portfolio', () => {
      const holdings: Holding[] = [
        {
          id: '1',
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(500),
          costBasis: new Decimal(30000),
          averageCost: new Decimal(60),
          currentValue: new Decimal(30000),
          unrealizedGain: new Decimal(0),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: '2',
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(300),
          costBasis: new Decimal(30000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(30000),
          unrealizedGain: new Decimal(0),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: '3',
          portfolioId: 'p1',
          assetId: 'a3',
          quantity: new Decimal(100),
          costBasis: new Decimal(30000),
          averageCost: new Decimal(300),
          currentValue: new Decimal(30000),
          unrealizedGain: new Decimal(0),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: '4',
          portfolioId: 'p1',
          assetId: 'a4',
          quantity: new Decimal(10000),
          costBasis: new Decimal(10000),
          averageCost: new Decimal(1),
          currentValue: new Decimal(10000),
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
          region: 'US',
          sector: 'Technology',
          metadata: {},
        },
        {
          id: 'a2',
          symbol: 'BOND',
          name: 'Bond',
          type: 'bond',
          currency: 'USD',
          region: 'US',
          metadata: {},
        },
        {
          id: 'a3',
          symbol: 'VT',
          name: 'Total World',
          type: 'etf',
          currency: 'USD',
          region: 'OTHER',
          metadata: {},
        },
        {
          id: 'a4',
          symbol: 'CASH',
          name: 'Cash',
          type: 'cash',
          currency: 'USD',
          region: 'US',
          metadata: {},
        },
      ];

      const recommendations = generateRecommendations({
        holdings,
        assets,
        totalValue: new Decimal(100000),
      });

      expect(recommendations.length).toBe(0);
    });
  });
});
