/**
 * Price Store: Live Market Data
 *
 * Feature: 005-live-market-data
 *
 * Zustand store for managing price data, polling infrastructure,
 * and user preferences for price updates.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import Decimal from 'decimal.js';

import {
  LivePriceData,
  MarketState,
  PriceUpdatePreferences,
  RefreshInterval,
  StalenessLevel,
  DEFAULT_PRICE_PREFERENCES,
  REFRESH_INTERVALS,
} from '@/types/market';
import { calculateStaleness } from '@/lib/utils/staleness';
import { convertPenceToPounds, getExchange } from '@/lib/utils/market-utils';
import { getMarketState } from '@/lib/services/market-hours';
import {
  priceResponseSchema,
  batchPriceResponseSchema,
  type BatchPriceResponse as ValidatedBatchPriceResponse,
} from '@/lib/schemas/price-schemas';

// Types for the store
interface PriceData {
  symbol: string;
  price: string;
  currency: string;
  change: string;
  changePercent: number;
  timestamp: Date;
  source: string;
  marketState?: MarketState;
}


interface PriceState {
  // State
  prices: Map<string, LivePriceData>;
  lastFetchTime: Date | null;
  loading: boolean;
  error: string | null;
  preferences: PriceUpdatePreferences;
  isPolling: boolean;
  watchedSymbols: Set<string>;
  isOnline: boolean;

  // Actions
  setPreferences: (preferences: Partial<PriceUpdatePreferences>) => void;
  loadPreferences: () => Promise<void>;
  savePreferences: () => Promise<void>;

  addWatchedSymbol: (symbol: string) => void;
  removeWatchedSymbol: (symbol: string) => void;
  setWatchedSymbols: (symbols: string[]) => void;

  updatePrice: (symbol: string, data: PriceData) => void;
  updatePrices: (data: Record<string, PriceData>) => void;
  getPrice: (symbol: string) => LivePriceData | undefined;

  refreshPrice: (symbol: string) => Promise<void>;
  refreshAllPrices: () => Promise<void>;

  startPolling: () => void;
  stopPolling: () => void;
  updateStaleness: () => void;

  // Cache persistence
  loadCachedPrices: () => Promise<void>;
  persistPriceCache: () => Promise<void>;

  // Network state
  setOnline: (online: boolean) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

// Polling interval reference
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

// Staleness update interval reference
let stalenessIntervalId: ReturnType<typeof setInterval> | null = null;

// Visibility change handler reference
let visibilityHandler: (() => void) | null = null;

// Online/offline handler references
let onlineHandler: (() => void) | null = null;
let offlineHandler: (() => void) | null = null;

/**
 * Transforms raw price data into LivePriceData with staleness and currency conversion.
 */
function transformPriceData(
  data: PriceData,
  refreshInterval: RefreshInterval
): LivePriceData {
  const price = new Decimal(data.price);
  const { displayPrice, displayCurrency } = convertPenceToPounds(price, data.currency);
  const exchange = getExchange(data.symbol);
  const marketState = data.marketState || getMarketState(data.symbol);
  const staleness = calculateStaleness(data.timestamp, refreshInterval);

  return {
    symbol: data.symbol,
    price: data.price,
    currency: data.currency,
    displayPrice: displayPrice.toString(),
    displayCurrency,
    change: data.change,
    changePercent: data.changePercent,
    timestamp: data.timestamp,
    source: data.source,
    marketState,
    staleness,
    exchange,
  };
}

export const usePriceStore = create<PriceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      prices: new Map(),
      lastFetchTime: null,
      loading: false,
      error: null,
      preferences: DEFAULT_PRICE_PREFERENCES,
      isPolling: false,
      watchedSymbols: new Set(),
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,

      // Preference management
      setPreferences: (newPreferences) => {
        const current = get().preferences;
        const updated = { ...current, ...newPreferences };
        set({ preferences: updated });

        // If interval changed and we're polling, restart with new interval
        if (
          newPreferences.refreshInterval !== undefined &&
          newPreferences.refreshInterval !== current.refreshInterval &&
          get().isPolling
        ) {
          // Stop polling synchronously to prevent race condition
          get().stopPolling();
          // Use queueMicrotask to ensure cleanup completes before restart
          if (updated.refreshInterval !== 'manual') {
            queueMicrotask(() => {
              // Double-check state hasn't changed before restarting
              if (get().preferences.refreshInterval !== 'manual') {
                get().startPolling();
              }
            });
          }
        }

        // Save preferences asynchronously
        get().savePreferences();
      },

      loadPreferences: async () => {
        try {
          // Dynamic import to avoid SSR issues
          const { settingsQueries } = await import('@/lib/db/queries');
          const saved = await settingsQueries.get('priceUpdatePreferences');

          if (saved) {
            set({ preferences: { ...DEFAULT_PRICE_PREFERENCES, ...saved } });
          }
        } catch (error) {
          console.error('Failed to load price preferences:', error);
        }
      },

      savePreferences: async () => {
        try {
          const { settingsQueries } = await import('@/lib/db/queries');
          await settingsQueries.set('priceUpdatePreferences', get().preferences);
        } catch (error) {
          console.error('Failed to save price preferences:', error);
        }
      },

      // Symbol watching
      addWatchedSymbol: (symbol) => {
        const symbols = new Set(get().watchedSymbols);
        symbols.add(symbol.toUpperCase());
        set({ watchedSymbols: symbols });
      },

      removeWatchedSymbol: (symbol) => {
        const symbols = new Set(get().watchedSymbols);
        symbols.delete(symbol.toUpperCase());
        set({ watchedSymbols: symbols });

        // Also remove from prices
        const prices = new Map(get().prices);
        prices.delete(symbol.toUpperCase());
        set({ prices });
      },

      setWatchedSymbols: (symbols) => {
        set({ watchedSymbols: new Set(symbols.map((s) => s.toUpperCase())) });
      },

      // Price management
      updatePrice: (symbol, data) => {
        const prices = new Map(get().prices);
        const liveData = transformPriceData(data, get().preferences.refreshInterval);
        prices.set(symbol.toUpperCase(), liveData);
        set({ prices, lastFetchTime: new Date() });
      },

      updatePrices: (data) => {
        const prices = new Map(get().prices);
        const refreshInterval = get().preferences.refreshInterval;

        Object.entries(data).forEach(([symbol, priceData]) => {
          const liveData = transformPriceData(priceData, refreshInterval);
          prices.set(symbol.toUpperCase(), liveData);
        });

        set({ prices, lastFetchTime: new Date() });
      },

      getPrice: (symbol) => {
        // Pure getter - no state mutations
        // Staleness is updated by polling cycle or manual refresh
        return get().prices.get(symbol.toUpperCase());
      },

      // Price fetching
      refreshPrice: async (symbol) => {
        // Skip fetch if offline - rely on cached data
        if (!get().isOnline) {
          console.log(`Offline: using cached data for ${symbol}`);
          return;
        }

        set({ loading: true, error: null });

        try {
          const response = await fetch(`/api/prices/${encodeURIComponent(symbol)}`);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to fetch price for ${symbol}`);
          }

          const rawData = await response.json();

          // Validate response with Zod
          const parseResult = priceResponseSchema.safeParse(rawData);
          if (!parseResult.success) {
            console.error('Invalid price response:', parseResult.error);
            throw new Error('Invalid price data format received from API');
          }

          const data = parseResult.data;
          get().updatePrice(symbol, {
            symbol: data.symbol,
            price: String(data.price),
            currency: data.metadata?.currency || 'USD',
            change: String(data.metadata?.change || 0),
            changePercent: data.metadata?.changePercent || 0,
            timestamp: new Date(data.timestamp),
            source: data.source,
            marketState: data.metadata?.marketState,
          });

          // Persist to cache after successful fetch
          get().persistPriceCache();

          set({ loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch price';

          // Keep cached data available - don't clear prices on error
          // Just set error state so UI can show staleness indicator
          const existingPrice = get().prices.get(symbol.toUpperCase());
          if (existingPrice) {
            console.warn(`Using cached price for ${symbol} due to fetch error`);
            // Recalculate staleness for the cached data
            const updatedPrice = {
              ...existingPrice,
              staleness: calculateStaleness(existingPrice.timestamp, get().preferences.refreshInterval),
            };
            const prices = new Map(get().prices);
            prices.set(symbol.toUpperCase(), updatedPrice);
            set({ prices, loading: false, error: message });
          } else {
            set({ loading: false, error: message });
          }

          console.error(`Error fetching price for ${symbol}:`, error);
        }
      },

      refreshAllPrices: async () => {
        const symbols = Array.from(get().watchedSymbols);
        if (symbols.length === 0) return;

        // Skip fetch if offline - rely on cached data
        if (!get().isOnline) {
          console.log('Offline: using cached prices');
          // Recalculate staleness for all cached prices
          const prices = new Map(get().prices);
          const refreshInterval = get().preferences.refreshInterval;
          prices.forEach((data, symbol) => {
            prices.set(symbol, {
              ...data,
              staleness: calculateStaleness(data.timestamp, refreshInterval),
            });
          });
          set({ prices });
          return;
        }

        set({ loading: true, error: null });

        try {
          // Use batch endpoint for efficiency
          const response = await fetch('/api/prices/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols }),
          });

          if (!response.ok) {
            // Fall back to individual requests
            await Promise.allSettled(symbols.map((symbol) => get().refreshPrice(symbol)));
            return;
          }

          const rawResult = await response.json();

          // Validate response with Zod
          const parseResult = batchPriceResponseSchema.safeParse(rawResult);
          if (!parseResult.success) {
            console.error('Invalid batch price response:', parseResult.error);
            throw new Error('Invalid batch price data format received from API');
          }

          const result = parseResult.data;
          if (result.successful.length > 0) {
            const updates: Record<string, PriceData> = {};

            result.successful.forEach((item) => {
              updates[item.symbol] = {
                symbol: item.symbol,
                price: String(item.price),
                currency: item.metadata?.currency || 'USD',
                change: String(item.metadata?.change || 0),
                changePercent: item.metadata?.changePercent || 0,
                timestamp: new Date(item.timestamp),
                source: item.source,
                marketState: item.metadata?.marketState,
              };
            });

            get().updatePrices(updates);

            // Persist to cache after successful batch fetch
            get().persistPriceCache();
          }

          set({ loading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to fetch prices';

          // Keep cached data available - don't clear prices on error
          // Recalculate staleness for existing cached data
          const prices = new Map(get().prices);
          const refreshInterval = get().preferences.refreshInterval;
          prices.forEach((data, symbol) => {
            prices.set(symbol, {
              ...data,
              staleness: calculateStaleness(data.timestamp, refreshInterval),
            });
          });

          set({ prices, loading: false, error: message });
          console.error('Error fetching prices:', error);
        }
      },

      // Polling management
      startPolling: () => {
        const { preferences, isPolling, refreshAllPrices, setOnline, loadCachedPrices } = get();

        // Don't start if already polling or in manual mode
        if (isPolling || preferences.refreshInterval === 'manual') {
          return;
        }

        const intervalMs = REFRESH_INTERVALS[preferences.refreshInterval];
        if (intervalMs <= 0) return;

        // Load cached prices first for offline resilience
        loadCachedPrices();

        // Clear any existing intervals
        if (pollIntervalId) {
          clearInterval(pollIntervalId);
        }
        if (stalenessIntervalId) {
          clearInterval(stalenessIntervalId);
        }

        // Set up polling
        pollIntervalId = setInterval(() => {
          // Only poll if tab is visible (if pauseWhenHidden is true) and online
          if (
            get().isOnline &&
            (!preferences.pauseWhenHidden ||
              typeof document === 'undefined' ||
              document.visibilityState === 'visible')
          ) {
            refreshAllPrices();
          }
        }, intervalMs);

        // Set up staleness updates (every 5 seconds)
        stalenessIntervalId = setInterval(() => {
          get().updateStaleness();
        }, 5000);

        // Set up visibility change handler
        if (typeof document !== 'undefined' && preferences.pauseWhenHidden) {
          // Remove any existing handler
          if (visibilityHandler) {
            document.removeEventListener('visibilitychange', visibilityHandler);
          }

          visibilityHandler = () => {
            if (document.visibilityState === 'visible' && get().isOnline) {
              // Resume polling and fetch fresh data
              refreshAllPrices();
            }
          };

          document.addEventListener('visibilitychange', visibilityHandler);
        }

        // Set up online/offline handlers
        if (typeof window !== 'undefined') {
          // Remove any existing handlers
          if (onlineHandler) {
            window.removeEventListener('online', onlineHandler);
          }
          if (offlineHandler) {
            window.removeEventListener('offline', offlineHandler);
          }

          onlineHandler = () => setOnline(true);
          offlineHandler = () => setOnline(false);

          window.addEventListener('online', onlineHandler);
          window.addEventListener('offline', offlineHandler);

          // Set initial online state
          setOnline(navigator.onLine);
        }

        set({ isPolling: true });
      },

      stopPolling: () => {
        // Persist cache before stopping
        get().persistPriceCache();

        if (pollIntervalId) {
          clearInterval(pollIntervalId);
          pollIntervalId = null;
        }

        if (stalenessIntervalId) {
          clearInterval(stalenessIntervalId);
          stalenessIntervalId = null;
        }

        if (visibilityHandler && typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', visibilityHandler);
          visibilityHandler = null;
        }

        // Clean up online/offline handlers
        if (typeof window !== 'undefined') {
          if (onlineHandler) {
            window.removeEventListener('online', onlineHandler);
            onlineHandler = null;
          }
          if (offlineHandler) {
            window.removeEventListener('offline', offlineHandler);
            offlineHandler = null;
          }
        }

        set({ isPolling: false });
      },

      updateStaleness: () => {
        const prices = new Map(get().prices);
        const refreshInterval = get().preferences.refreshInterval;
        let updated = false;

        prices.forEach((data, symbol) => {
          const freshStaleness = calculateStaleness(data.timestamp, refreshInterval);
          if (data.staleness !== freshStaleness) {
            prices.set(symbol, { ...data, staleness: freshStaleness });
            updated = true;
          }
        });

        if (updated) {
          set({ prices });
        }
      },

      // Cache persistence for offline resilience
      loadCachedPrices: async () => {
        try {
          const { settingsQueries } = await import('@/lib/db/queries');
          const cached = await settingsQueries.get('priceCache');

          if (cached && typeof cached === 'object') {
            const prices = new Map<string, LivePriceData>();
            const refreshInterval = get().preferences.refreshInterval;

            Object.entries(cached).forEach(([symbol, data]: [string, any]) => {
              if (data && data.timestamp) {
                // Reconstruct LivePriceData with recalculated staleness
                const timestamp = new Date(data.timestamp);
                const staleness = calculateStaleness(timestamp, refreshInterval);

                prices.set(symbol, {
                  ...data,
                  timestamp,
                  staleness,
                });
              }
            });

            if (prices.size > 0) {
              set({ prices });
              console.log(`Loaded ${prices.size} cached prices from IndexedDB`);
            }
          }
        } catch (error) {
          console.error('Failed to load cached prices:', error);
        }
      },

      persistPriceCache: async () => {
        try {
          const { settingsQueries } = await import('@/lib/db/queries');
          const prices = get().prices;

          if (prices.size === 0) return;

          // Convert Map to plain object for storage
          const cacheObject: Record<string, LivePriceData> = {};
          prices.forEach((data, symbol) => {
            cacheObject[symbol] = {
              ...data,
              timestamp: data.timestamp, // Will be serialized as ISO string
            };
          });

          await settingsQueries.set('priceCache', cacheObject);
        } catch (error) {
          console.error('Failed to persist price cache:', error);
        }
      },

      // Network state management
      setOnline: (online) => {
        const wasOffline = !get().isOnline;
        set({ isOnline: online });

        if (online && wasOffline) {
          // Connection restored - clear error and refresh prices
          set({ error: null });
          console.log('Network connection restored, refreshing prices...');

          // Resume polling if it was active and not in manual mode
          const { preferences, watchedSymbols, isPolling } = get();
          if (
            watchedSymbols.size > 0 &&
            preferences.refreshInterval !== 'manual'
          ) {
            // Fetch fresh data immediately
            get().refreshAllPrices();

            // Restart polling if not already active
            if (!isPolling) {
              get().startPolling();
            }
          }
        } else if (!online) {
          // Going offline - notify user but keep cached data
          console.log('Network connection lost, using cached prices');
        }
      },

      // Error handling
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'price-store',
    }
  )
);

/**
 * Hook to set up cleanup on app unmount (beforeunload).
 * Use this in your app root component's useEffect.
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const cleanup = usePriceStore.getState().stopPolling;
 *   window.addEventListener('beforeunload', cleanup);
 *   return () => window.removeEventListener('beforeunload', cleanup);
 * }, []);
 * ```
 */
