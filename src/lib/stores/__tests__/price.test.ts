/**
 * Price Store Unit Tests
 *
 * Feature: 005-live-market-data
 *
 * Comprehensive tests for the price store covering polling lifecycle,
 * preference management, cache persistence, online/offline transitions,
 * and error recovery.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type Mock,
} from 'vitest';
import { usePriceStore } from '../price';
import { DEFAULT_PRICE_PREFERENCES } from '@/types/market';

// Use vi.hoisted to ensure mocks are available when vi.mock factory runs
// (vi.mock is hoisted and runs before module-level variable declarations)
const { mockSettingsGet, mockSettingsSet, mockSaveBatchSnapshots, mockFetch } =
  vi.hoisted(() => ({
    mockSettingsGet: vi.fn(),
    mockSettingsSet: vi.fn(),
    mockSaveBatchSnapshots: vi.fn(),
    mockFetch: vi.fn(),
  }));

// Mock fetch globally
global.fetch = mockFetch;

// Mock IndexedDB queries
vi.mock('@/lib/db/queries', () => ({
  settingsQueries: {
    get: mockSettingsGet,
    set: mockSettingsSet,
  },
  priceQueries: {
    saveBatchSnapshots: mockSaveBatchSnapshots,
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
      pollingLock: false,
      pollingService: null,
    });

    // Clear all mocks (call history) and reset implementations
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    // Ensure polling is stopped
    usePriceStore.getState().stopPolling();
  });

  describe('Preference Management', () => {
    it('should set preferences', () => {
      usePriceStore.getState().setPreferences({ refreshInterval: 'realtime' });

      // Re-read state after mutation
      expect(usePriceStore.getState().preferences.refreshInterval).toBe(
        'realtime'
      );
    });

    it('should merge preferences instead of replacing', () => {
      const store = usePriceStore.getState();
      store.setPreferences({ refreshInterval: 'realtime' });
      usePriceStore
        .getState()
        .setPreferences({ showStalenessIndicator: false });

      // Re-read state after mutations

      const state = usePriceStore.getState();
      expect(state.preferences.refreshInterval).toBe('realtime');
      expect(state.preferences.showStalenessIndicator).toBe(false);
      expect(state.preferences.pauseWhenHidden).toBe(true); // default preserved
    });

    it('should restart polling when interval changes', async () => {
      const store = usePriceStore.getState();
      store.setWatchedSymbols(['AAPL']);

      usePriceStore.getState().startPolling();

      const wasPolling = usePriceStore.getState().isPolling;

      // Change interval
      usePriceStore.getState().setPreferences({ refreshInterval: 'realtime' });

      // Wait for microtask
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      // Re-read state after mutation
      const state = usePriceStore.getState();
      expect(wasPolling).toBe(true);
      expect(state.isPolling).toBe(true);
      expect(state.preferences.refreshInterval).toBe('realtime');
    });

    it('should not restart polling when changing to manual', () => {
      const store = usePriceStore.getState();
      store.setWatchedSymbols(['AAPL']);

      usePriceStore.getState().startPolling();

      usePriceStore.getState().setPreferences({ refreshInterval: 'manual' });

      // Re-read state after mutation

      expect(usePriceStore.getState().isPolling).toBe(false);
    });
  });

  describe('Symbol Watching', () => {
    it('should add watched symbol', () => {
      usePriceStore.getState().addWatchedSymbol('AAPL');

      // Re-read state after mutation

      expect(usePriceStore.getState().watchedSymbols.has('AAPL')).toBe(true);
    });

    it('should normalize symbols to uppercase', () => {
      usePriceStore.getState().addWatchedSymbol('aapl');

      // Re-read state after mutation

      expect(usePriceStore.getState().watchedSymbols.has('AAPL')).toBe(true);
    });

    it('should remove watched symbol', () => {
      const store = usePriceStore.getState();
      store.addWatchedSymbol('AAPL');
      usePriceStore.getState().removeWatchedSymbol('AAPL');

      // Re-read state after mutation

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

      // Re-read state after mutation

      expect(usePriceStore.getState().prices.has('AAPL')).toBe(false);
    });

    it('should set multiple watched symbols', () => {
      usePriceStore.getState().setWatchedSymbols(['AAPL', 'GOOGL', 'MSFT']);

      // Re-read state after mutation

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

      // Re-read state after mutation

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

      // Re-read state after mutation

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

      // Re-read state after mutation

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

      // Re-read state after mutation

      expect(usePriceStore.getState().isPolling).toBe(true);
    });

    it('should not start polling in manual mode', () => {
      usePriceStore.getState().setWatchedSymbols(['AAPL']);
      usePriceStore.getState().setPreferences({ refreshInterval: 'manual' });
      usePriceStore.getState().startPolling();

      // Re-read state after mutation

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

      // Re-read state after mutation

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

      // Re-read state after timer-triggered mutation

      const price = usePriceStore.getState().getPrice('AAPL');
      expect(price?.staleness).toBe('stale'); // 2 min old with 60s interval = stale

      usePriceStore.getState().stopPolling();
      vi.useRealTimers();
    });
  });

  describe('Online/Offline Handling', () => {
    it('should set online status', () => {
      usePriceStore.getState().setOnline(false);

      // Re-read state after mutation

      expect(usePriceStore.getState().isOnline).toBe(false);
    });

    it('should skip fetch when offline', async () => {
      usePriceStore.getState().setOnline(false);

      await usePriceStore.getState().refreshPrice('AAPL');

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should resume polling when coming online', async () => {
      usePriceStore.getState().setWatchedSymbols(['AAPL']);

      // Mock successful batch fetch (refreshAllPrices uses batch endpoint)
      mockFetch.mockResolvedValueOnce({
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
          ],
          failed: [],
          total: 1,
          timestamp: new Date().toISOString(),
        }),
      });

      // Go offline then online
      usePriceStore.getState().setOnline(false);
      usePriceStore.getState().setOnline(true);

      // Should trigger refresh
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
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
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await usePriceStore.getState().refreshPrice('AAPL');

      // Re-read state after mutation
      const state = usePriceStore.getState();
      // Should still have cached data

      const price = state.getPrice('AAPL');
      expect(price).toBeDefined();
      expect(price?.symbol).toBe('AAPL');
      expect(state.error).toContain('Network error');
    });

    it('should set error state on fetch failure', async () => {
      const store = usePriceStore.getState();

      mockFetch.mockRejectedValueOnce(new Error('API error'));

      await usePriceStore.getState().refreshPrice('AAPL');

      // Re-read state after mutation

      const state = usePriceStore.getState();
      expect(state.error).toContain('API error');
      expect(state.loading).toBe(false);
    });

    it('should clear error state', () => {
      usePriceStore.getState().setError('Test error');

      // Re-read state after mutation

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

      // Re-read state after mutation

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

      mockSettingsGet.mockResolvedValueOnce(cachedData);

      await usePriceStore.getState().loadCachedPrices();

      // Re-read state after async mutation

      const state = usePriceStore.getState();
      expect(state.prices.size).toBe(1);
      expect(state.getPrice('AAPL')).toBeDefined();
    });

    it('should persist prices to IndexedDB', async () => {
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

      await usePriceStore.getState().persistPriceCache();

      expect(mockSettingsSet).toHaveBeenCalledWith(
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
      const store = usePriceStore.getState();
      await store.persistPriceCache();

      expect(mockSettingsSet).not.toHaveBeenCalled();
    });
  });

  describe('Batch Refresh', () => {
    it('should refresh all watched symbols', async () => {
      // Set up mock for persistPriceCache which is called after successful refresh
      const { settingsQueries } = await import('@/lib/db/queries');
      (settingsQueries.set as any).mockResolvedValue(undefined);

      usePriceStore.getState().setWatchedSymbols(['AAPL', 'GOOGL']);

      mockFetch.mockResolvedValueOnce({
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

      // Re-read state after async mutation

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
      expect(mockFetch).not.toHaveBeenCalled();

      // Re-read state after mutation
      const state = usePriceStore.getState();
      // Should still have cached data
      expect(state.getPrice('AAPL')).toBeDefined();
    });
  });
});
