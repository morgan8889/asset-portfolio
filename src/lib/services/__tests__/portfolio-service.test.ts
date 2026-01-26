import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  calculatePortfolioSummary,
  generatePortfolioMetrics,
  generateRebalancingPlan,
  calculateDiversificationScore,
  calculateRiskMetrics,
  calculateProjectedIncome,
  compareToBenchmark,
} from '../portfolio-service';
import { Portfolio, Holding, Asset, PortfolioSettings } from '@/types';
import {
  generatePortfolioId,
  generateHoldingId,
  generateAssetId,
} from '@/types/storage';

const defaultSettings: PortfolioSettings = {
  rebalanceThreshold: 5,
  taxStrategy: 'fifo',
};

describe('Portfolio Service', () => {
  describe('calculatePortfolioSummary', () => {
    it('should calculate basic portfolio summary', () => {
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
          currency: 'USD',
          metadata: {},
        },
        {
          id: 'a2',
          symbol: 'MSFT',
          name: 'Microsoft Corp.',
          type: 'stock',
          currentPrice: 120,
          currency: 'USD',
          metadata: {},
        },
      ];

      const result = calculatePortfolioSummary(holdings, assets);

      expect(result.totalValue.toString()).toBe('1800');
      expect(result.totalCost.toString()).toBe('1500');
      expect(result.totalGain.toString()).toBe('300');
      expect(result.totalGainPercent).toBe(20);
      expect(result.holdingsCount).toBe(2);
      expect(result.topHoldings).toHaveLength(2);
      expect(result.topHoldings[0].symbol).toBe('AAPL');
    });

    it('should limit top holdings to specified count', () => {
      const holdings: Holding[] = Array.from({ length: 10 }, (_, i) => ({
        id: generateHoldingId(),
        portfolioId: 'p1',
        assetId: `a${i}`,
        quantity: new Decimal(10),
        costBasis: new Decimal(1000),
        averageCost: new Decimal(100),
        currentValue: new Decimal(1000 + i * 100),
        unrealizedGain: new Decimal(i * 100),
        unrealizedGainPercent: (i * 100) / 1000,
        lots: [],
        lastUpdated: new Date(),
      }));

      const assets: Asset[] = Array.from({ length: 10 }, (_, i) => ({
        id: `a${i}`,
        symbol: `SYM${i}`,
        name: `Asset ${i}`,
        type: 'stock' as const,
        currentPrice: 100,
        currency: 'USD',
        metadata: {},
      }));

      const result = calculatePortfolioSummary(holdings, assets, 3);

      expect(result.topHoldings).toHaveLength(3);
      expect(result.topHoldings[0].symbol).toBe('SYM9');
    });

    it('should handle zero total value', () => {
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
          currency: 'USD',
          metadata: {},
        },
      ];

      const result = calculatePortfolioSummary(holdings, assets);

      expect(result.totalValue.toString()).toBe('0');
      expect(result.topHoldings[0].percent).toBe(0);
    });

    it('should handle missing asset information', () => {
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

      const assets: Asset[] = [];

      const result = calculatePortfolioSummary(holdings, assets);

      expect(result.topHoldings[0].symbol).toBe('Unknown');
      expect(result.topHoldings[0].name).toBe('Unknown Asset');
    });
  });

  describe('generatePortfolioMetrics', () => {
    it('should generate complete portfolio metrics', () => {
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
          currency: 'USD',
          metadata: {},
        },
      ];

      const result = generatePortfolioMetrics(holdings, assets);

      expect(result.totalValue.toString()).toBe('1200');
      expect(result.totalCost.toString()).toBe('1000');
      expect(result.totalGain.toString()).toBe('200');
      expect(result.allocation).toHaveLength(1);
    });
  });

  describe('generateRebalancingPlan', () => {
    it('should generate rebalancing suggestions when drift exceeds threshold', () => {
      const portfolio: Portfolio = {
        id: generatePortfolioId(),
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          ...defaultSettings,
          rebalanceThreshold: 10,
          targetAllocations: [
            { type: 'stock', targetPercent: 60 },
            { type: 'bond', targetPercent: 40 },
          ],
        },
      };

      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: portfolio.id,
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(800),
          unrealizedGain: new Decimal(-200),
          unrealizedGainPercent: -20,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: generateHoldingId(),
          portfolioId: portfolio.id,
          assetId: 'a2',
          quantity: new Decimal(2),
          costBasis: new Decimal(200),
          averageCost: new Decimal(100),
          currentValue: new Decimal(200),
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
          name: 'Apple Inc.',
          type: 'stock',
          currentPrice: 80,
          currency: 'USD',
          metadata: {},
        },
        {
          id: 'a2',
          symbol: 'AGG',
          name: 'Bond Fund',
          type: 'bond',
          currentPrice: 100,
          currency: 'USD',
          metadata: {},
        },
      ];

      const currentPrices = new Map([
        ['a1', new Decimal(80)],
        ['a2', new Decimal(100)],
      ]);

      const result = generateRebalancingPlan(
        portfolio,
        holdings,
        assets,
        currentPrices
      );

      expect(result.portfolioId).toBe(portfolio.id);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.totalTrades).toBeGreaterThan(0);
    });

    it('should not generate suggestions when drift is within threshold', () => {
      const portfolio: Portfolio = {
        id: generatePortfolioId(),
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          ...defaultSettings,
          rebalanceThreshold: 50,
          targetAllocations: [
            { type: 'stock', targetPercent: 60 },
            { type: 'bond', targetPercent: 40 },
          ],
        },
      };

      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: portfolio.id,
          assetId: 'a1',
          quantity: new Decimal(6),
          costBasis: new Decimal(600),
          averageCost: new Decimal(100),
          currentValue: new Decimal(600),
          unrealizedGain: new Decimal(0),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: generateHoldingId(),
          portfolioId: portfolio.id,
          assetId: 'a2',
          quantity: new Decimal(4),
          costBasis: new Decimal(400),
          averageCost: new Decimal(100),
          currentValue: new Decimal(400),
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
          name: 'Apple Inc.',
          type: 'stock',
          currentPrice: 100,
          currency: 'USD',
          metadata: {},
        },
        {
          id: 'a2',
          symbol: 'AGG',
          name: 'Bond Fund',
          type: 'bond',
          currentPrice: 100,
          currency: 'USD',
          metadata: {},
        },
      ];

      const currentPrices = new Map([
        ['a1', new Decimal(100)],
        ['a2', new Decimal(100)],
      ]);

      const result = generateRebalancingPlan(
        portfolio,
        holdings,
        assets,
        currentPrices
      );

      expect(result.suggestions).toHaveLength(0);
      expect(result.totalTrades).toBe(0);
    });

    it('should calculate tax implications for sell suggestions', () => {
      const portfolio: Portfolio = {
        id: generatePortfolioId(),
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          ...defaultSettings,
          rebalanceThreshold: 5,
          targetAllocations: [{ type: 'stock', targetPercent: 50 }],
        },
      };

      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: portfolio.id,
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [
            {
              id: 'lot1',
              quantity: new Decimal(10),
              purchasePrice: new Decimal(100),
              purchaseDate: new Date('2023-01-01'),
              soldQuantity: new Decimal(0),
              remainingQuantity: new Decimal(10),
              notes: 'Lot 1',
            },
          ],
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
          currency: 'USD',
          metadata: {},
        },
      ];

      const currentPrices = new Map([['a1', new Decimal(120)]]);

      const result = generateRebalancingPlan(
        portfolio,
        holdings,
        assets,
        currentPrices
      );

      // Tax implications should be calculated if there are sell suggestions
      if (result.suggestions.some((s) => s.action === 'sell')) {
        expect(result.taxImplications.length).toBeGreaterThan(0);
      }
    });

    it('should skip tiny adjustments', () => {
      const portfolio: Portfolio = {
        id: generatePortfolioId(),
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: {
          ...defaultSettings,
          rebalanceThreshold: 0.01,
          targetAllocations: [{ type: 'stock', targetPercent: 60 }],
        },
      };

      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: portfolio.id,
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(10000),
          unrealizedGain: new Decimal(9000),
          unrealizedGainPercent: 900,
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
          currentPrice: 1000,
          currency: 'USD',
          metadata: {},
        },
      ];

      const currentPrices = new Map([['a1', new Decimal(1000)]]);

      const result = generateRebalancingPlan(
        portfolio,
        holdings,
        assets,
        currentPrices
      );

      // Suggestions should filter out tiny adjustments (< 0.01 shares)
      for (const suggestion of result.suggestions) {
        expect(suggestion.quantity.toNumber()).toBeGreaterThanOrEqual(0.01);
      }
    });
  });

  describe('calculateDiversificationScore', () => {
    it('should calculate diversification score', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(500),
          unrealizedGain: new Decimal(-500),
          unrealizedGainPercent: -50,
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
          currentValue: new Decimal(500),
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
          name: 'Apple Inc.',
          type: 'stock',
          currentPrice: 50,
          sector: 'Technology',
          currency: 'USD',
          metadata: {},
        },
        {
          id: 'a2',
          symbol: 'AGG',
          name: 'Bond Fund',
          type: 'bond',
          currentPrice: 100,
          sector: 'Fixed Income',
          currency: 'USD',
          metadata: {},
        },
      ];

      const result = calculateDiversificationScore(holdings, assets);

      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.assetTypeCount).toBe(2);
      expect(result.sectorCount).toBe(2);
      expect(result.concentrationRisk).toBeGreaterThanOrEqual(0);
    });

    it('should penalize concentrated portfolios', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(10000),
          unrealizedGain: new Decimal(9000),
          unrealizedGainPercent: 900,
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
          currentPrice: 1000,
          sector: 'Technology',
          currency: 'USD',
          metadata: {},
        },
      ];

      const result = calculateDiversificationScore(holdings, assets);

      expect(result.score).toBeLessThan(50);
      expect(result.assetTypeCount).toBe(1);
      expect(result.concentrationRisk).toBe(100);
    });
  });

  describe('calculateRiskMetrics', () => {
    it('should identify single stock risk', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(10000),
          unrealizedGain: new Decimal(9000),
          unrealizedGainPercent: 900,
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
          currentPrice: 1000,
          currency: 'USD',
          metadata: {},
        },
      ];

      const result = calculateRiskMetrics(holdings, assets);

      expect(result.singleStockRisk).toBe(true);
      expect(result.concentratedPosition).toBe('AAPL');
    });

    it('should identify concentrated positions above 25%', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(300),
          unrealizedGain: new Decimal(-700),
          unrealizedGainPercent: -70,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(700),
          unrealizedGain: new Decimal(-300),
          unrealizedGainPercent: -30,
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
          currentPrice: 30,
          currency: 'USD',
          metadata: {},
        },
        {
          id: 'a2',
          symbol: 'MSFT',
          name: 'Microsoft Corp.',
          type: 'stock',
          currentPrice: 70,
          currency: 'USD',
          metadata: {},
        },
      ];

      const result = calculateRiskMetrics(holdings, assets);

      // singleStockRisk is true when concentration exceeds threshold
      expect(result.singleStockRisk).toBe(true);
      expect(result.concentratedPosition).toBe('MSFT');
    });

    it('should identify volatile holdings', () => {
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
          quantity: new Decimal(1),
          costBasis: new Decimal(50000),
          averageCost: new Decimal(50000),
          currentValue: new Decimal(60000),
          unrealizedGain: new Decimal(10000),
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
          currency: 'USD',
          metadata: { beta: 1.2 },
        },
        {
          id: 'a2',
          symbol: 'BTC',
          name: 'Bitcoin',
          type: 'crypto',
          currentPrice: 60000,
          currency: 'USD',
          metadata: { beta: 2.5 },
        },
      ];

      const result = calculateRiskMetrics(holdings, assets);

      expect(result.volatileHoldings).toContain('BTC');
    });
  });

  describe('calculateProjectedIncome', () => {
    it('should calculate annual dividend income', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(100),
          costBasis: new Decimal(10000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(12000),
          unrealizedGain: new Decimal(2000),
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
          currency: 'USD',
          metadata: { dividendYield: 2.5 },
        },
      ];

      const result = calculateProjectedIncome(holdings, assets);

      expect(result.annualIncome.toString()).toBe('300');
      expect(result.yield).toBe(2.5);
      expect(result.incomeByAsset).toHaveLength(1);
    });

    it('should exclude holdings with no dividend yield', () => {
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
          symbol: 'TSLA',
          name: 'Tesla Inc.',
          type: 'stock',
          currentPrice: 120,
          currency: 'USD',
          metadata: { dividendYield: 0 },
        },
      ];

      const result = calculateProjectedIncome(holdings, assets);

      expect(result.annualIncome.toString()).toBe('0');
      expect(result.incomeByAsset).toHaveLength(0);
    });

    it('should sort income by asset from highest to lowest', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(100),
          costBasis: new Decimal(10000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(10000),
          unrealizedGain: new Decimal(0),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(100),
          costBasis: new Decimal(5000),
          averageCost: new Decimal(50),
          currentValue: new Decimal(5000),
          unrealizedGain: new Decimal(0),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      const assets: Asset[] = [
        {
          id: 'a1',
          symbol: 'LOW',
          name: 'Low Dividend',
          type: 'stock',
          currentPrice: 100,
          currency: 'USD',
          metadata: { dividendYield: 1.0 },
        },
        {
          id: 'a2',
          symbol: 'HIGH',
          name: 'High Dividend',
          type: 'stock',
          currentPrice: 50,
          currency: 'USD',
          metadata: { dividendYield: 5.0 },
        },
      ];

      const result = calculateProjectedIncome(holdings, assets);

      expect(result.incomeByAsset[0].symbol).toBe('HIGH');
      expect(result.incomeByAsset[1].symbol).toBe('LOW');
    });
  });

  describe('compareToBenchmark', () => {
    it('should calculate alpha when outperforming', () => {
      const result = compareToBenchmark(15, 10);

      expect(result.alpha).toBe(5);
      expect(result.outperforming).toBe(true);
      expect(result.difference).toBe(5);
    });

    it('should calculate alpha when underperforming', () => {
      const result = compareToBenchmark(8, 10);

      expect(result.alpha).toBe(-2);
      expect(result.outperforming).toBe(false);
      expect(result.difference).toBe(-2);
    });

    it('should handle matching benchmark performance', () => {
      const result = compareToBenchmark(10, 10);

      expect(result.alpha).toBe(0);
      expect(result.outperforming).toBe(false);
      expect(result.difference).toBe(0);
    });

    it('should handle negative returns', () => {
      const result = compareToBenchmark(-5, -10);

      expect(result.alpha).toBe(5);
      expect(result.outperforming).toBe(true);
    });
  });
});
