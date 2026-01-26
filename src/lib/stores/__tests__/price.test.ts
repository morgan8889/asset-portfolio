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
      const store = usePriceStore.getState();
      store.setPreferences({ refreshInterval: 'realtime' });

      expect(store.preferences.refreshInterval).toBe('realtime');
    });

    it('should merge preferences instead of replacing', () => {
      const store = usePriceStore.getState();
      store.setPreferences({ refreshInterval: 'realtime' });
      store.setPreferences({ showStalenessIndicator: false });

      expect(store.preferences.refreshInterval).toBe('realtime');
      expect(store.preferences.showStalenessIndicator).toBe(false);
      expect(store.preferences.pauseWhenHidden).toBe(true); // default preserved
    });

    it('should restart polling when interval changes', async () => {
      const store = usePriceStore.getState();
      store.setWatchedSymbols(['AAPL']);
      store.startPolling();

      const wasPolling = store.isPolling;

      // Change interval
      store.setPreferences({ refreshInterval: 'realtime' });

      // Wait for microtask
      await new Promise<void>((resolve) => queueMicrotask(() => resolve()));

      expect(wasPolling).toBe(true);
      expect(store.isPolling).toBe(true);
      expect(store.preferences.refreshInterval).toBe('realtime');
    });

    it('should not restart polling when changing to manual', () => {
      const store = usePriceStore.getState();
      store.setWatchedSymbols(['AAPL']);
      store.startPolling();

      store.setPreferences({ refreshInterval: 'manual' });

      expect(store.isPolling).toBe(false);
    });
  });

  describe('Symbol Watching', () => {
    it('should add watched symbol', () => {
      const store = usePriceStore.getState();
      store.addWatchedSymbol('AAPL');

      expect(store.watchedSymbols.has('AAPL')).toBe(true);
    });

    it('should normalize symbols to uppercase', () => {
      const store = usePriceStore.getState();
      store.addWatchedSymbol('aapl');

      expect(store.watchedSymbols.has('AAPL')).toBe(true);
    });

    it('should remove watched symbol', () => {
      const store = usePriceStore.getState();
      store.addWatchedSymbol('AAPL');
      store.removeWatchedSymbol('AAPL');

      expect(store.watchedSymbols.has('AAPL')).toBe(false);
    });

    it('should remove price data when removing symbol', () => {
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

      store.removeWatchedSymbol('AAPL');

      expect(store.prices.has('AAPL')).toBe(false);
    });

    it('should set multiple watched symbols', () => {
      const store = usePriceStore.getState();
      store.setWatchedSymbols(['AAPL', 'GOOGL', 'MSFT']);

      expect(store.watchedSymbols.size).toBe(3);
      expect(store.watchedSymbols.has('AAPL')).toBe(true);
      expect(store.watchedSymbols.has('GOOGL')).toBe(true);
      expect(store.watchedSymbols.has('MSFT')).toBe(true);
    });
  });

  describe('Price Management', () => {
    it('should update single price', () => {
      const store = usePriceStore.getState();
      const timestamp = new Date();

      store.updatePrice('AAPL', {
        symbol: 'AAPL',
        price: '150.00',
        currency: 'USD',
        change: '1.50',
        changePercent: 1.0,
        timestamp,
        source: 'yahoo',
      });

      const price = store.getPrice('AAPL');
      expect(price).toBeDefined();
      expect(price?.symbol).toBe('AAPL');
      expect(price?.displayPrice).toBe('150');
      expect(price?.displayCurrency).toBe('USD');
    });

    it('should update multiple prices', () => {
      const store = usePriceStore.getState();
      const timestamp = new Date();

      store.updatePrices({
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

      expect(store.prices.size).toBe(2);
      expect(store.getPrice('AAPL')).toBeDefined();
      expect(store.getPrice('GOOGL')).toBeDefined();
    });

    it('should convert UK pence to pounds', () => {
      const store = usePriceStore.getState();

      store.updatePrice('VOD.L', {
        symbol: 'VOD.L',
        price: '7250', // 72.50 GBP in pence
        currency: 'GBp',
        change: '50',
        changePercent: 0.69,
        timestamp: new Date(),
        source: 'yahoo',
      });

      const price = store.getPrice('VOD.L');
      expect(price?.displayPrice).toBe('72.5');
      expect(price?.displayCurrency).toBe('GBP');
      expect(price?.exchange).toBe('LSE');
    });

    it('should return undefined for non-existent symbol', () => {
      const store = usePriceStore.getState();
      const price = store.getPrice('NONEXISTENT');

      expect(price).toBeUndefined();
    });
  });

  describe('Polling Lifecycle', () => {
    it('should start polling', () => {
      const store = usePriceStore.getState();
      store.setWatchedSymbols(['AAPL']);
      store.startPolling();

      expect(store.isPolling).toBe(true);
    });

    it('should not start polling in manual mode', () => {
      const store = usePriceStore.getState();
      store.setWatchedSymbols(['AAPL']);
      store.setPreferences({ refreshInterval: 'manual' });
      store.startPolling();

      expect(store.isPolling).toBe(false);
    });

    it('should not start polling if already polling', () => {
      const store = usePriceStore.getState();
      store.setWatchedSymbols(['AAPL']);
      store.startPolling();

      const firstPoll = store.isPolling;
      store.startPolling();

      expect(firstPoll).toBe(true);
      expect(store.isPolling).toBe(true);
    });

    it('should stop polling', () => {
      const store = usePriceStore.getState();
      store.setWatchedSymbols(['AAPL']);
      store.startPolling();

      expect(store.isPolling).toBe(true);

      store.stopPolling();

      expect(store.isPolling).toBe(false);
    });

    it('should update staleness periodically', async () => {
      vi.useFakeTimers();

      const store = usePriceStore.getState();
      const oldTimestamp = new Date(Date.now() - 120000); // 2 minutes ago

      store.updatePrice('AAPL', {
        symbol: 'AAPL',
        price: '150.00',
        currency: 'USD',
        change: '1.50',
        changePercent: 1.0,
        timestamp: oldTimestamp,
        source: 'yahoo',
      });

      store.setWatchedSymbols(['AAPL']);
      store.startPolling();

      // Fast-forward 5 seconds to trigger staleness update
      vi.advanceTimersByTime(5000);

      const price = store.getPrice('AAPL');
      expect(price?.staleness).toBe('stale'); // 2 min old with 60s interval = stale

      store.stopPolling();
      vi.useRealTimers();
    });
  });

  describe('Online/Offline Handling', () => {
    it('should set online status', () => {
      const store = usePriceStore.getState();
      store.setOnline(false);

      expect(store.isOnline).toBe(false);
    });

    it('should skip fetch when offline', async () => {
      const store = usePriceStore.getState();
      store.setOnline(false);

      await store.refreshPrice('AAPL');

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should resume polling when coming online', async () => {
      const store = usePriceStore.getState();
      store.setWatchedSymbols(['AAPL']);

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
      store.setOnline(false);
      store.setOnline(true);

      // Should trigger refresh
      await vi.waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should keep cached data on fetch error', async () => {
      const store = usePriceStore.getState();

      // Set initial price
      store.updatePrice('AAPL', {
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

      await store.refreshPrice('AAPL');

      // Should still have cached data
      const price = store.getPrice('AAPL');
      expect(price).toBeDefined();
      expect(price?.symbol).toBe('AAPL');
      expect(store.error).toContain('Network error');
    });

    it('should set error state on fetch failure', async () => {
      const store = usePriceStore.getState();

      (global.fetch as any).mockRejectedValueOnce(new Error('API error'));

      await store.refreshPrice('AAPL');

      expect(store.error).toContain('API error');
      expect(store.loading).toBe(false);
    });

    it('should clear error state', () => {
      const store = usePriceStore.getState();
      store.setError('Test error');

      expect(store.error).toBe('Test error');

      store.clearError();

      expect(store.error).toBeNull();
    });
  });

  describe('Staleness Updates', () => {
    it('should update staleness for all prices', () => {
      const store = usePriceStore.getState();
      const oldTimestamp = new Date(Date.now() - 120000); // 2 minutes ago

      store.updatePrices({
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

      store.updateStaleness();

      const aaplPrice = store.getPrice('AAPL');
      const googlPrice = store.getPrice('GOOGL');

      expect(aaplPrice?.staleness).toBe('stale');
      expect(googlPrice?.staleness).toBe('stale');
    });

    it('should not update state if staleness unchanged', () => {
      const store = usePriceStore.getState();
      const freshTimestamp = new Date();

      store.updatePrice('AAPL', {
        symbol: 'AAPL',
        price: '150.00',
        currency: 'USD',
        change: '1.50',
        changePercent: 1.0,
        timestamp: freshTimestamp,
        source: 'yahoo',
      });

      const pricesBefore = store.prices;
      store.updateStaleness();
      const pricesAfter = store.prices;

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

      const store = usePriceStore.getState();
      await store.loadCachedPrices();

      expect(store.prices.size).toBe(1);
      expect(store.getPrice('AAPL')).toBeDefined();
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
      const store = usePriceStore.getState();
      store.setWatchedSymbols(['AAPL', 'GOOGL']);

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

      await store.refreshAllPrices();

      expect(store.prices.size).toBe(2);
      expect(store.getPrice('AAPL')).toBeDefined();
      expect(store.getPrice('GOOGL')).toBeDefined();
    });

    it('should use cached prices when offline', async () => {
      const store = usePriceStore.getState();
      store.setWatchedSymbols(['AAPL']);

      // Set initial cached price
      store.updatePrice('AAPL', {
        symbol: 'AAPL',
        price: '150.00',
        currency: 'USD',
        change: '1.50',
        changePercent: 1.0,
        timestamp: new Date(),
        source: 'yahoo',
      });

      store.setOnline(false);
      await store.refreshAllPrices();

      // Should not call fetch
      expect(global.fetch).not.toHaveBeenCalled();

      // Should still have cached data
      expect(store.getPrice('AAPL')).toBeDefined();
    });
  });
});
