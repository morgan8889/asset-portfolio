/**
 * Tests for useLivePriceMetrics hook
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from 'decimal.js';
import { useLivePriceMetrics } from '../useLivePriceMetrics';
import { Holding, Asset } from '@/types';
import { LivePriceData } from '@/types/market';

// Mock the price store
const mockPrices = new Map<string, LivePriceData>();

vi.mock('@/lib/stores/price', () => ({
  usePriceStore: vi.fn((selector) => {
    const state = { prices: mockPrices };
    return selector(state);
  }),
}));

// Factory for creating test holdings
function createHolding(overrides: Partial<Holding> = {}): Holding {
  return {
    id: 'holding-1',
    portfolioId: 'portfolio-1',
    assetId: 'asset-1',
    quantity: new Decimal(10),
    costBasis: new Decimal(1000),
    currentValue: new Decimal(1200),
    unrealizedGain: new Decimal(200),
    unrealizedGainPercent: 20,
    averageCost: new Decimal(100),
    lots: [],
    lastUpdated: new Date(),
    ...overrides,
  };
}

// Factory for creating test assets
function createAsset(overrides: Partial<Asset> = {}): Asset {
  return {
    id: 'asset-1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    type: 'stock',
    currency: 'USD',
    exchange: 'NASDAQ',
    metadata: {},
    ...overrides,
  };
}

// Factory for creating live price data
function createPriceData(
  overrides: Partial<LivePriceData> = {}
): LivePriceData {
  return {
    symbol: 'AAPL',
    price: '150.00',
    displayPrice: '150.00',
    displayCurrency: 'USD',
    change: '2.50',
    changePercent: 1.69,
    currency: 'USD',
    marketState: 'REGULAR',
    timestamp: new Date(),
    source: 'yahoo',
    staleness: 'fresh',
    exchange: 'NASDAQ',
    ...overrides,
  };
}

describe('useLivePriceMetrics', () => {
  beforeEach(() => {
    mockPrices.clear();
  });

  describe('with no live prices', () => {
    it('returns hasLivePrices: false', () => {
      const holdings = [createHolding()];
      const assets = [createAsset()];

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      expect(result.current.hasLivePrices).toBe(false);
      expect(result.current.holdingsWithPrices).toBe(0);
    });

    it('returns zero values for day change', () => {
      const holdings = [createHolding()];
      const assets = [createAsset()];

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      expect(result.current.dayChange.toNumber()).toBe(0);
      expect(result.current.dayChangePercent).toBe(0);
    });

    it('falls back to stored values for metrics', () => {
      const holdings = [
        createHolding({
          currentValue: new Decimal(1500),
          costBasis: new Decimal(1000),
          unrealizedGain: new Decimal(500),
        }),
      ];
      const assets = [createAsset()];

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      // Uses stored values when no live prices
      expect(result.current.liveHoldings[0].liveValue.toNumber()).toBe(1500);
      expect(result.current.liveHoldings[0].liveGain.toNumber()).toBe(500);
    });
  });

  describe('with empty inputs', () => {
    it('handles empty holdings array', () => {
      const { result } = renderHook(() => useLivePriceMetrics([], []));

      expect(result.current.totalValue.toNumber()).toBe(0);
      expect(result.current.totalCost.toNumber()).toBe(0);
      expect(result.current.hasLivePrices).toBe(false);
      expect(result.current.liveHoldings).toHaveLength(0);
    });

    it('handles empty assets array', () => {
      const holdings = [createHolding()];

      const { result } = renderHook(() => useLivePriceMetrics(holdings, []));

      expect(result.current.liveHoldings).toHaveLength(0);
      expect(result.current.hasLivePrices).toBe(false);
    });
  });

  describe('with live prices', () => {
    it('calculates totalValue from live prices', () => {
      const holdings = [createHolding({ quantity: new Decimal(10) })];
      const assets = [createAsset({ symbol: 'AAPL' })];
      mockPrices.set('AAPL', createPriceData({ displayPrice: '150.00' }));

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      // 10 shares * $150 = $1500
      expect(result.current.totalValue.toNumber()).toBe(1500);
      expect(result.current.hasLivePrices).toBe(true);
    });

    it('calculates totalGain as liveValue - costBasis', () => {
      const holdings = [
        createHolding({
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
        }),
      ];
      const assets = [createAsset({ symbol: 'AAPL' })];
      mockPrices.set('AAPL', createPriceData({ displayPrice: '150.00' }));

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      // liveValue (1500) - costBasis (1000) = 500
      expect(result.current.totalGain.toNumber()).toBe(500);
      expect(result.current.totalGainPercent).toBe(50); // 500/1000 * 100
    });

    it('calculates dayChange from price.change * quantity', () => {
      const holdings = [createHolding({ quantity: new Decimal(10) })];
      const assets = [createAsset({ symbol: 'AAPL' })];
      mockPrices.set('AAPL', createPriceData({ change: '2.50' }));

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      // 10 shares * $2.50 change = $25
      expect(result.current.dayChange.toNumber()).toBe(25);
    });

    it('calculates dayChangePercent correctly', () => {
      const holdings = [createHolding({ quantity: new Decimal(10) })];
      const assets = [createAsset({ symbol: 'AAPL' })];
      mockPrices.set(
        'AAPL',
        createPriceData({
          displayPrice: '150.00',
          change: '2.50',
          changePercent: 1.69,
        })
      );

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      // dayChangePercent = dayChange / previousValue * 100
      // previousValue = 1500 - 25 = 1475
      // dayChangePercent = 25 / 1475 * 100 ≈ 1.69%
      expect(result.current.dayChangePercent).toBeCloseTo(1.69, 1);
    });
  });

  describe('top performers', () => {
    it('returns holdings sorted by gain percent DESC', () => {
      const holdings = [
        createHolding({
          id: 'h1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
        }),
        createHolding({
          id: 'h2',
          assetId: 'a2',
          quantity: new Decimal(10),
          costBasis: new Decimal(500),
        }),
        createHolding({
          id: 'h3',
          assetId: 'a3',
          quantity: new Decimal(10),
          costBasis: new Decimal(2000),
        }),
      ];
      const assets = [
        createAsset({ id: 'a1', symbol: 'AAPL' }),
        createAsset({ id: 'a2', symbol: 'MSFT' }),
        createAsset({ id: 'a3', symbol: 'GOOGL' }),
      ];
      mockPrices.set(
        'AAPL',
        createPriceData({ symbol: 'AAPL', displayPrice: '150.00' })
      ); // 50% gain
      mockPrices.set(
        'MSFT',
        createPriceData({ symbol: 'MSFT', displayPrice: '100.00' })
      ); // 100% gain
      mockPrices.set(
        'GOOGL',
        createPriceData({ symbol: 'GOOGL', displayPrice: '180.00' })
      ); // -10% loss

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      expect(result.current.topPerformers).toHaveLength(2);
      expect(result.current.topPerformers[0].symbol).toBe('MSFT'); // 100% gain first
      expect(result.current.topPerformers[1].symbol).toBe('AAPL'); // 50% gain second
    });

    it('filters out holdings with negative gains', () => {
      const holdings = [
        createHolding({
          id: 'h1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(2000),
        }),
      ];
      const assets = [createAsset({ id: 'a1', symbol: 'AAPL' })];
      mockPrices.set('AAPL', createPriceData({ displayPrice: '150.00' })); // Loss

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      expect(result.current.topPerformers).toHaveLength(0);
    });

    it('limits to top 5 performers', () => {
      const holdings = Array.from({ length: 10 }, (_, i) =>
        createHolding({
          id: `h${i}`,
          assetId: `a${i}`,
          quantity: new Decimal(10),
          costBasis: new Decimal(100),
        })
      );
      const assets = Array.from({ length: 10 }, (_, i) =>
        createAsset({ id: `a${i}`, symbol: `SYM${i}` })
      );
      holdings.forEach((_, i) => {
        mockPrices.set(
          `SYM${i}`,
          createPriceData({
            symbol: `SYM${i}`,
            displayPrice: String(20 + i * 5), // All gains
          })
        );
      });

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      expect(result.current.topPerformers).toHaveLength(5);
    });
  });

  describe('biggest losers', () => {
    it('returns holdings sorted by gain percent ASC (most negative first)', () => {
      const holdings = [
        createHolding({
          id: 'h1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1500),
        }),
        createHolding({
          id: 'h2',
          assetId: 'a2',
          quantity: new Decimal(10),
          costBasis: new Decimal(2000),
        }),
      ];
      const assets = [
        createAsset({ id: 'a1', symbol: 'AAPL' }),
        createAsset({ id: 'a2', symbol: 'MSFT' }),
      ];
      mockPrices.set(
        'AAPL',
        createPriceData({ symbol: 'AAPL', displayPrice: '100.00' })
      ); // -33% loss
      mockPrices.set(
        'MSFT',
        createPriceData({ symbol: 'MSFT', displayPrice: '100.00' })
      ); // -50% loss

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      expect(result.current.biggestLosers).toHaveLength(2);
      expect(result.current.biggestLosers[0].symbol).toBe('MSFT'); // -50% first
      expect(result.current.biggestLosers[1].symbol).toBe('AAPL'); // -33% second
    });

    it('filters out holdings with positive gains', () => {
      const holdings = [
        createHolding({
          id: 'h1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(500),
        }),
      ];
      const assets = [createAsset({ id: 'a1', symbol: 'AAPL' })];
      mockPrices.set('AAPL', createPriceData({ displayPrice: '150.00' })); // Gain

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      expect(result.current.biggestLosers).toHaveLength(0);
    });

    it('limits to top 5 losers', () => {
      const holdings = Array.from({ length: 10 }, (_, i) =>
        createHolding({
          id: `h${i}`,
          assetId: `a${i}`,
          quantity: new Decimal(10),
          costBasis: new Decimal(2000),
        })
      );
      const assets = Array.from({ length: 10 }, (_, i) =>
        createAsset({ id: `a${i}`, symbol: `SYM${i}` })
      );
      holdings.forEach((_, i) => {
        mockPrices.set(
          `SYM${i}`,
          createPriceData({
            symbol: `SYM${i}`,
            displayPrice: String(50 - i * 2), // All losses
          })
        );
      });

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      expect(result.current.biggestLosers).toHaveLength(5);
    });
  });

  describe('mixed price availability', () => {
    it('uses live price for holdings with prices', () => {
      const holdings = [createHolding({ quantity: new Decimal(10) })];
      const assets = [createAsset({ symbol: 'AAPL' })];
      mockPrices.set('AAPL', createPriceData({ displayPrice: '200.00' }));

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      expect(result.current.liveHoldings[0].hasLivePrice).toBe(true);
      expect(result.current.liveHoldings[0].liveValue.toNumber()).toBe(2000);
    });

    it('falls back to stored value for holdings without prices', () => {
      const holdings = [
        createHolding({
          currentValue: new Decimal(1500),
          unrealizedGain: new Decimal(500),
        }),
      ];
      const assets = [createAsset({ symbol: 'AAPL' })];
      // No price set for AAPL

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      expect(result.current.liveHoldings[0].hasLivePrice).toBe(false);
      expect(result.current.liveHoldings[0].liveValue.toNumber()).toBe(1500);
      expect(result.current.liveHoldings[0].liveGain.toNumber()).toBe(500);
    });

    it('correctly sums mixed live and stored values', () => {
      const holdings = [
        createHolding({
          id: 'h1',
          assetId: 'a1',
          quantity: new Decimal(10),
          currentValue: new Decimal(1000),
        }),
        createHolding({
          id: 'h2',
          assetId: 'a2',
          quantity: new Decimal(10),
          currentValue: new Decimal(500),
        }),
      ];
      const assets = [
        createAsset({ id: 'a1', symbol: 'AAPL' }),
        createAsset({ id: 'a2', symbol: 'MSFT' }),
      ];
      // Only AAPL has live price
      mockPrices.set('AAPL', createPriceData({ displayPrice: '150.00' }));

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      // AAPL: 10 * 150 = 1500 (live)
      // MSFT: 500 (stored fallback)
      expect(result.current.totalValue.toNumber()).toBe(2000);
      expect(result.current.holdingsWithPrices).toBe(1);
    });
  });

  describe('currency handling', () => {
    it('uses displayPrice (already converted from pence)', () => {
      const holdings = [createHolding({ quantity: new Decimal(100) })];
      const assets = [createAsset({ symbol: 'VOD.L', currency: 'GBP' })];
      // displayPrice is in pounds (already converted from pence)
      mockPrices.set(
        'VOD.L',
        createPriceData({
          symbol: 'VOD.L',
          price: '7250', // pence
          displayPrice: '72.50', // pounds
          currency: 'GBP',
        })
      );

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      // 100 shares * £72.50 = £7250
      expect(result.current.totalValue.toNumber()).toBe(7250);
    });
  });

  describe('edge cases', () => {
    it('handles zero cost basis', () => {
      const holdings = [createHolding({ costBasis: new Decimal(0) })];
      const assets = [createAsset({ symbol: 'AAPL' })];
      mockPrices.set('AAPL', createPriceData({ displayPrice: '150.00' }));

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      expect(result.current.totalGainPercent).toBe(0);
      expect(result.current.liveHoldings[0].liveGainPercent).toBe(0);
    });

    it('handles holdings without matching assets', () => {
      const holdings = [createHolding({ assetId: 'unknown-asset' })];
      const assets = [createAsset({ id: 'different-asset' })];

      const { result } = renderHook(() =>
        useLivePriceMetrics(holdings, assets)
      );

      expect(result.current.liveHoldings).toHaveLength(0);
    });
  });
});
