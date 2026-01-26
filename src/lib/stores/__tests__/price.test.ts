/**
 * Price Store Unit Tests
 *
 * Feature: 005-live-market-data
 *
 * Comprehensive tests for the price store covering polling lifecycle,
 * preference management, cache persistence, online/offline transitions,
 * and error recovery.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { usePriceStore } from '../price';
import { DEFAULT_PRICE_PREFERENCES } from '@/types/market';

// Mock fetch globally
global.fetch = vi.fn();

// Mock IndexedDB queries
vi.mock('@/lib/db/queries', () => ({
  settingsQueries: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

describe('Price Store', () => {
  beforeEach(() => {
    // Reset store state
    const store = usePriceStore.getState();
    store.stopPolling();
    usePriceStore.setState({
      prices: new Map(),
      lastFetchTime: null,
      loading: false,
      error: null,
      preferences: DEFAULT_PRICE_PREFERENCES,
      isPolling: false,
      watchedSymbols: new Set(),
      isOnline: true,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Ensure polling is stopped
    usePriceStore.getState().stopPolling();
  });

  describe('Preference Management', () => {
    it('should set preferences', () => {
      usePriceStore.getState().setPreferences({ refreshInterval: 'realtime' });

      expect(usePriceStore.getState().preferences.refreshInterval).toBe('realtime');
    });

    it('should merge preferences instead of replacing', () => {
      usePriceStore.getState().setPreferences({ refreshInterval: 'realtime' });
      usePriceStore.getState().setPreferences({ showStalenessIndicator: false });

      const state = usePriceStore.getState();
      expect(state.preferences.refreshInterval).toBe('realtime');
      expect(state.preferences.showStalenessIndicator).toBe(false);
      expect(state.preferences.pauseWhenHidden).toBe(true); // default preserved
    });

    it('should restart polling when interval changes', async () => {
      usePriceStore.getState().setWatchedSymbols(['AAPL']);
      usePriceStore.getState().startPolling();

      const wasPolling = usePriceStore.getState().isPolling;

      // Change interval
      usePriceStore.getState().setPreferences({ refreshInterval: 'realtime' });

      // Wait for microtask
      await new Promise((resolve) => queueMicrotask(resolve));

      expect(wasPolling).toBe(true);
      expect(usePriceStore.getState().isPolling).toBe(true);
      expect(usePriceStore.getState().preferences.refreshInterval).toBe('realtime');
    });

    it('should not restart polling when changing to manual', () => {
      usePriceStore.getState().setWatchedSymbols(['AAPL']);
      usePriceStore.getState().startPolling();

      usePriceStore.getState().setPreferences({ refreshInterval: 'manual' });

      expect(usePriceStore.getState().isPolling).toBe(false);
    });
  });

  describe('Symbol Watching', () => {
    it('should add watched symbol', () => {
      usePriceStore.getState().addWatchedSymbol('AAPL');

      expect(usePriceStore.getState().watchedSymbols.has('AAPL')).toBe(true);
    });

    it('should normalize symbols to uppercase', () => {
      usePriceStore.getState().addWatchedSymbol('aapl');

      expect(usePriceStore.getState().watchedSymbols.has('AAPL')).toBe(true);
    });

    it('should remove watched symbol', () => {
      usePriceStore.getState().addWatchedSymbol('AAPL');
      usePriceStore.getState().removeWatchedSymbol('AAPL');

      expect(usePriceStore.getState().watchedSymbols.has('AAPL')).toBe(false);
    });

    it('should remove price data when removing symbol', () => {
      usePriceStore.getState().updatePrice('AAPL', {
        symbol: 'AAPL',
        price: '150.00',
        currency: 'USD',
        change: '1.50',
        changePercent: 1.0,
        timestamp: new Date(),
        source: 'yahoo',
      });

      usePriceStore.getState().removeWatchedSymbol('AAPL');

      expect(usePriceStore.getState().prices.has('AAPL')).toBe(false);
    });

    it('should set multiple watched symbols', () => {
      usePriceStore.getState().setWatchedSymbols(['AAPL', 'GOOGL', 'MSFT']);

      const state = usePriceStore.getState();
      expect(state.watchedSymbols.size).toBe(3);
      expect(state.watchedSymbols.has('AAPL')).toBe(true);
      expect(state.watchedSymbols.has('GOOGL')).toBe(true);
      expect(state.watchedSymbols.has('MSFT')).toBe(true);
    });
  });

  describe('Price Management', () => {
    it('should update single price', () => {
      const timestamp = new Date();

      usePriceStore.getState().updatePrice('AAPL', {
        symbol: 'AAPL',
        price: '150.00',
        currency: 'USD',
        change: '1.50',
        changePercent: 1.0,
        timestamp,
        source: 'yahoo',
      });

      const price = usePriceStore.getState().getPrice('AAPL');
      expect(price).toBeDefined();
      expect(price?.symbol).toBe('AAPL');
      expect(price?.displayPrice).toBe('150');
      expect(price?.displayCurrency).toBe('USD');
    });

    it('should update multiple prices', () => {
      const timestamp = new Date();

      usePriceStore.getState().updatePrices({
        AAPL: {
          symbol: 'AAPL',
          price: '150.00',
          currency: 'USD',
          change: '1.50',
          changePercent: 1.0,
          timestamp,
          source: 'yahoo',
        },
        GOOGL: {
          symbol: 'GOOGL',
          price: '2800.00',
          currency: 'USD',
          change: '25.00',
          changePercent: 0.9,
          timestamp,
          source: 'yahoo',
        },
      });

      const state = usePriceStore.getState();
      expect(state.prices.size).toBe(2);
      expect(state.getPrice('AAPL')).toBeDefined();
      expect(state.getPrice('GOOGL')).toBeDefined();
    });

    it('should convert UK pence to pounds', () => {
      usePriceStore.getState().updatePrice('VOD.L', {
        symbol: 'VOD.L',
        price: '7250', // 72.50 GBP in pence
        currency: 'GBp',
        change: '50',
        changePercent: 0.69,
        timestamp: new Date(),
        source: 'yahoo',
      });

      const price = usePriceStore.getState().getPrice('VOD.L');
      expect(price?.displayPrice).toBe('72.5');
      expect(price?.displayCurrency).toBe('GBP');
      expect(price?.exchange).toBe('LSE');
    });

    it('should return undefined for non-existent symbol', () => {
      const price = usePriceStore.getState().getPrice('NONEXISTENT');

      expect(price).toBeUndefined();
    });
  });

  describe('Polling Lifecycle', () => {
    it('should start polling', () => {
      usePriceStore.getState().setWatchedSymbols(['AAPL']);
      usePriceStore.getState().startPolling();

      expect(usePriceStore.getState().isPolling).toBe(true);
    });

    it('should not start polling in manual mode', () => {
      usePriceStore.getState().setWatchedSymbols(['AAPL']);
      usePriceStore.getState().setPreferences({ refreshInterval: 'manual' });
      usePriceStore.getState().startPolling();

      expect(usePriceStore.getState().isPolling).toBe(false);
    });

    it('should not start polling if already polling', () => {
      usePriceStore.getState().setWatchedSymbols(['AAPL']);
      usePriceStore.getState().startPolling();

      const firstPoll = usePriceStore.getState().isPolling;
      usePriceStore.getState().startPolling();

      expect(firstPoll).toBe(true);
      expect(usePriceStore.getState().isPolling).toBe(true);
    });

    it('should stop polling', () => {
      usePriceStore.getState().setWatchedSymbols(['AAPL']);
      usePriceStore.getState().startPolling();

      expect(usePriceStore.getState().isPolling).toBe(true);

      usePriceStore.getState().stopPolling();

      expect(usePriceStore.getState().isPolling).toBe(false);
    });

    it('should update staleness periodically', async () => {
      vi.useFakeTimers();

      const oldTimestamp = new Date(Date.now() - 120000); // 2 minutes ago

      usePriceStore.getState().updatePrice('AAPL', {
        symbol: 'AAPL',
        price: '150.00',
        currency: 'USD',
        change: '1.50',
        changePercent: 1.0,
        timestamp: oldTimestamp,
        source: 'yahoo',
      });

      usePriceStore.getState().setWatchedSymbols(['AAPL']);
      usePriceStore.getState().startPolling();

      // Fast-forward 5 seconds to trigger staleness update
      vi.advanceTimersByTime(5000);

      const price = usePriceStore.getState().getPrice('AAPL');
      expect(price?.staleness).toBe('stale'); // 2 min old with 60s interval = stale

      usePriceStore.getState().stopPolling();
      vi.useRealTimers();
    });
  });

  describe('Online/Offline Handling', () => {
    it('should set online status', () => {
      usePriceStore.getState().setOnline(false);

      expect(usePriceStore.getState().isOnline).toBe(false);
    });

    it('should skip fetch when offline', async () => {
      usePriceStore.getState().setOnline(false);

      await usePriceStore.getState().refreshPrice('AAPL');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should resume polling when coming online', async () => {
      usePriceStore.getState().setWatchedSymbols(['AAPL']);

      // Mock successful fetch
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          symbol: 'AAPL',
          price: 150,
          source: 'yahoo',
          timestamp: new Date().toISOString(),
          metadata: { currency: 'USD', change: 1.5, changePercent: 1.0 },
        }),
      });

      // Go offline then online
      usePriceStore.getState().setOnline(false);
      usePriceStore.getState().setOnline(true);

      // Should trigger refresh
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should keep cached data on fetch error', async () => {
      // Set initial price
      usePriceStore.getState().updatePrice('AAPL', {
        symbol: 'AAPL',
        price: '150.00',
        currency: 'USD',
        change: '1.50',
        changePercent: 1.0,
        timestamp: new Date(),
        source: 'yahoo',
      });

      // Mock failed fetch
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await usePriceStore.getState().refreshPrice('AAPL');

      // Should still have cached data
      const state = usePriceStore.getState();
      const price = state.getPrice('AAPL');
      expect(price).toBeDefined();
      expect(price?.symbol).toBe('AAPL');
      expect(state.error).toContain('Network error');
    });

    it('should set error state on fetch failure', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API error'));

      await usePriceStore.getState().refreshPrice('AAPL');

      const state = usePriceStore.getState();
      expect(state.error).toContain('API error');
      expect(state.loading).toBe(false);
    });

    it('should clear error state', () => {
      usePriceStore.getState().setError('Test error');

      expect(usePriceStore.getState().error).toBe('Test error');

      usePriceStore.getState().clearError();

      expect(usePriceStore.getState().error).toBeNull();
    });
  });

  describe('Staleness Updates', () => {
    it('should update staleness for all prices', () => {
      const oldTimestamp = new Date(Date.now() - 120000); // 2 minutes ago

      usePriceStore.getState().updatePrices({
        AAPL: {
          symbol: 'AAPL',
          price: '150.00',
          currency: 'USD',
          change: '1.50',
          changePercent: 1.0,
          timestamp: oldTimestamp,
          source: 'yahoo',
        },
        GOOGL: {
          symbol: 'GOOGL',
          price: '2800.00',
          currency: 'USD',
          change: '25.00',
          changePercent: 0.9,
          timestamp: oldTimestamp,
          source: 'yahoo',
        },
      });

      usePriceStore.getState().updateStaleness();

      const state = usePriceStore.getState();
      const aaplPrice = state.getPrice('AAPL');
      const googlPrice = state.getPrice('GOOGL');

      expect(aaplPrice?.staleness).toBe('stale');
      expect(googlPrice?.staleness).toBe('stale');
    });

    it('should not update state if staleness unchanged', () => {
      const freshTimestamp = new Date();

      usePriceStore.getState().updatePrice('AAPL', {
        symbol: 'AAPL',
        price: '150.00',
        currency: 'USD',
        change: '1.50',
        changePercent: 1.0,
        timestamp: freshTimestamp,
        source: 'yahoo',
      });

      const pricesBefore = usePriceStore.getState().prices;
      usePriceStore.getState().updateStaleness();
      const pricesAfter = usePriceStore.getState().prices;

      // Should be same Map reference if nothing changed
      expect(pricesBefore).toBe(pricesAfter);
    });
  });

  describe('Cache Persistence', () => {
    it('should load cached prices from IndexedDB', async () => {
      const { settingsQueries } = await import('@/lib/db/queries');

      const cachedData = {
        AAPL: {
          symbol: 'AAPL',
          price: '150.00',
          currency: 'USD',
          displayPrice: '150',
          displayCurrency: 'USD',
          change: '1.50',
          changePercent: 1.0,
          timestamp: new Date().toISOString(),
          source: 'yahoo',
          marketState: 'CLOSED',
          staleness: 'fresh',
          exchange: 'NASDAQ',
        },
      };

      (settingsQueries.get as any).mockResolvedValueOnce(cachedData);

      await usePriceStore.getState().loadCachedPrices();

      // Get fresh state after async operation
      const state = usePriceStore.getState();
      expect(state.prices.size).toBe(1);
      expect(state.getPrice('AAPL')).toBeDefined();
    });

    it('should persist prices to IndexedDB', async () => {
      const { settingsQueries } = await import('@/lib/db/queries');

      const store = usePriceStore.getState();
      store.updatePrice('AAPL', {
        symbol: 'AAPL',
        price: '150.00',
        currency: 'USD',
        change: '1.50',
        changePercent: 1.0,
        timestamp: new Date(),
        source: 'yahoo',
      });

      await store.persistPriceCache();

      expect(settingsQueries.set).toHaveBeenCalledWith(
        'priceCache',
        expect.objectContaining({
          AAPL: expect.objectContaining({
            symbol: 'AAPL',
            displayPrice: '150',
          }),
        })
      );
    });

    it('should not persist empty cache', async () => {
      const { settingsQueries } = await import('@/lib/db/queries');

      const store = usePriceStore.getState();
      await store.persistPriceCache();

      expect(settingsQueries.set).not.toHaveBeenCalled();
    });
  });

  describe('Batch Refresh', () => {
    it('should refresh all watched symbols', async () => {
      // Set up mock for persistPriceCache which is called after successful refresh
      const { settingsQueries } = await import('@/lib/db/queries');
      (settingsQueries.set as any).mockResolvedValue(undefined);

      usePriceStore.getState().setWatchedSymbols(['AAPL', 'GOOGL']);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          successful: [
            {
              symbol: 'AAPL',
              price: 150,
              source: 'yahoo',
              timestamp: new Date().toISOString(),
              metadata: { currency: 'USD', change: 1.5, changePercent: 1.0 },
              cached: false,
            },
            {
              symbol: 'GOOGL',
              price: 2800,
              source: 'yahoo',
              timestamp: new Date().toISOString(),
              metadata: { currency: 'USD', change: 25, changePercent: 0.9 },
              cached: false,
            },
          ],
          failed: [],
          total: 2,
          timestamp: new Date().toISOString(),
        }),
      });

      await usePriceStore.getState().refreshAllPrices();

      // Get fresh state after async operation
      const state = usePriceStore.getState();
      expect(state.prices.size).toBe(2);
      expect(state.getPrice('AAPL')).toBeDefined();
      expect(state.getPrice('GOOGL')).toBeDefined();
    });

    it('should use cached prices when offline', async () => {
      usePriceStore.getState().setWatchedSymbols(['AAPL']);

      // Set initial cached price
      usePriceStore.getState().updatePrice('AAPL', {
        symbol: 'AAPL',
        price: '150.00',
        currency: 'USD',
        change: '1.50',
        changePercent: 1.0,
        timestamp: new Date(),
        source: 'yahoo',
      });

      usePriceStore.getState().setOnline(false);
      await usePriceStore.getState().refreshAllPrices();

      // Should not call fetch
      expect(global.fetch).not.toHaveBeenCalled();

      // Should still have cached data
      expect(usePriceStore.getState().getPrice('AAPL')).toBeDefined();
    });
  });
});
