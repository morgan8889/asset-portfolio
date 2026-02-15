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
  DEFAULT_PRICE_PREFERENCES,
  REFRESH_INTERVALS,
} from '@/types/market';
import {
  calculateStaleness,
  recalculatePriceStaleness,
} from '@/lib/utils/staleness';
import { convertPenceToPounds, getExchange } from '@/lib/utils/market-utils';
import { getMarketState } from '@/lib/services/market-hours';
import { logger } from '@/lib/utils/logger';
import {
  priceResponseSchema,
  batchPriceResponseSchema,
} from '@/lib/schemas/price-schemas';
import {
  PricePollingService,
  createPricePollingService,
  type PollingCallbacks,
} from '@/lib/services/price-polling';

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
  pollingLock: boolean; // Prevents race conditions in polling restart
  pollingService: PricePollingService | null; // Encapsulated polling infrastructure
  symbolToAssetId: Map<string, string>; // Maps symbol -> assetId for snapshot persistence
  _refreshInFlight: boolean; // Prevents duplicate concurrent refreshAllPrices() calls

  // Actions
  setPreferences: (
    preferences: Partial<PriceUpdatePreferences>
  ) => Promise<void>;
  loadPreferences: () => Promise<void>;
  savePreferences: () => Promise<void>;

  addWatchedSymbol: (symbol: string) => void;
  removeWatchedSymbol: (symbol: string) => void;
  setWatchedSymbols: (symbols: string[]) => void;

  // Symbol-to-AssetId mapping for historical snapshots
  setSymbolAssetMapping: (symbol: string, assetId: string) => void;
  setSymbolAssetMappings: (mappings: Record<string, string>) => void;

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
  persistPriceSnapshots: () => Promise<void>; // Save to priceSnapshots table for historical data

  // Network state
  setOnline: (online: boolean) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

/**
 * Transforms raw price data into LivePriceData with staleness and currency conversion.
 */
function transformPriceData(
  data: PriceData,
  refreshInterval: RefreshInterval
): LivePriceData {
  const price = new Decimal(data.price);
  const { displayPrice, displayCurrency } = convertPenceToPounds(
    price,
    data.currency
  );
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
      pollingLock: false,
      pollingService: null,
      symbolToAssetId: new Map(),
      _refreshInFlight: false,

      // Preference management
      setPreferences: async (newPreferences) => {
        const current = get().preferences;
        const updated = { ...current, ...newPreferences };
        set({ preferences: updated });

        // If interval changed and we're polling, restart with new interval
        const intervalChanged =
          newPreferences.refreshInterval !== undefined &&
          newPreferences.refreshInterval !== current.refreshInterval;

        if (intervalChanged && get().isPolling) {
          // Use polling lock to prevent race conditions
          if (get().pollingLock) {
            logger.warn('Polling restart already in progress, skipping');
            return;
          }

          set({ pollingLock: true });

          // Set isPolling synchronously when changing to manual for immediate UI update
          if (updated.refreshInterval === 'manual') {
            set({ isPolling: false });
          }

          try {
            // Use the PricePollingService restart method which handles stop-then-start properly
            const service = get().pollingService;
            if (service) {
              await service.restart(updated);
              set({ isPolling: service.isPolling });
            } else {
              // Fallback to manual stop/start if service doesn't exist
              get().stopPolling();
              if (updated.refreshInterval !== 'manual') {
                get().startPolling();
              }
            }
          } catch (error) {
            logger.error('Error restarting polling:', error);
          } finally {
            set({ pollingLock: false });
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
          logger.error('Failed to load price preferences:', error);
        }
      },

      savePreferences: async () => {
        try {
          const { settingsQueries } = await import('@/lib/db/queries');
          await settingsQueries.set(
            'priceUpdatePreferences',
            get().preferences
          );
        } catch (error) {
          logger.error('Failed to save price preferences:', error);
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

      // Symbol-to-AssetId mapping for historical snapshots
      setSymbolAssetMapping: (symbol, assetId) => {
        const mapping = new Map(get().symbolToAssetId);
        mapping.set(symbol.toUpperCase(), assetId);
        set({ symbolToAssetId: mapping });
      },

      setSymbolAssetMappings: (mappings) => {
        const newMapping = new Map(get().symbolToAssetId);
        Object.entries(mappings).forEach(([symbol, assetId]) => {
          newMapping.set(symbol.toUpperCase(), assetId);
        });
        set({ symbolToAssetId: newMapping });
      },

      // Price management
      updatePrice: (symbol, data) => {
        const prices = new Map(get().prices);
        const liveData = transformPriceData(
          data,
          get().preferences.refreshInterval
        );
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
          logger.info(`Offline: using cached data for ${symbol}`);
          return;
        }

        set({ loading: true, error: null });

        try {
          const response = await fetch(
            `/api/prices/${encodeURIComponent(symbol)}`
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error || `Failed to fetch price for ${symbol}`
            );
          }

          const rawData = await response.json();

          // Validate response with Zod
          const parseResult = priceResponseSchema.safeParse(rawData);
          if (!parseResult.success) {
            logger.error('Invalid price response:', parseResult.error);
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

          // Persist to priceSnapshots for historical data (Growth Chart)
          get().persistPriceSnapshots();

          set({ loading: false });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to fetch price';

          // Keep cached data available - don't clear prices on error
          // Just set error state so UI can show staleness indicator
          const existingPrice = get().prices.get(symbol.toUpperCase());
          if (existingPrice) {
            logger.warn(`Using cached price for ${symbol} due to fetch error`);
            // Recalculate staleness for the cached data
            const updatedPrice = {
              ...existingPrice,
              staleness: calculateStaleness(
                existingPrice.timestamp,
                get().preferences.refreshInterval
              ),
            };
            const prices = new Map(get().prices);
            prices.set(symbol.toUpperCase(), updatedPrice);
            set({ prices, loading: false, error: message });
          } else {
            set({ loading: false, error: message });
          }

          logger.error(`Error fetching price for ${symbol}:`, error);
        }
      },

      refreshAllPrices: async () => {
        const symbols = Array.from(get().watchedSymbols);
        if (symbols.length === 0) return;

        // Skip if a refresh is already in-flight (prevents duplicate concurrent requests)
        if (get()._refreshInFlight) return;

        // Skip fetch if offline - rely on cached data
        if (!get().isOnline) {
          logger.info('Offline: using cached prices');
          // Recalculate staleness for all cached prices
          const prices = recalculatePriceStaleness(
            get().prices,
            get().preferences.refreshInterval
          );
          set({ prices });
          return;
        }

        set({ loading: true, error: null, _refreshInFlight: true });

        try {
          // Use batch endpoint for efficiency
          const response = await fetch('/api/prices/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols }),
          });

          if (!response.ok) {
            // Fall back to individual requests
            await Promise.allSettled(
              symbols.map((symbol) => get().refreshPrice(symbol))
            );
            return;
          }

          const rawResult = await response.json();

          // Validate response with Zod
          const parseResult = batchPriceResponseSchema.safeParse(rawResult);
          if (!parseResult.success) {
            logger.error('Invalid batch price response:', parseResult.error);
            throw new Error(
              'Invalid batch price data format received from API'
            );
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

            // Persist to priceSnapshots for historical data (Growth Chart)
            get().persistPriceSnapshots();
          }

          set({ loading: false });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Failed to fetch prices';

          // Keep cached data available - don't clear prices on error
          // Recalculate staleness for existing cached data
          const prices = recalculatePriceStaleness(
            get().prices,
            get().preferences.refreshInterval
          );

          set({ prices, loading: false, error: message });
          logger.error('Error fetching prices:', error);
        } finally {
          set({ _refreshInFlight: false });
        }
      },

      // Polling management (delegated to PricePollingService)
      startPolling: () => {
        const { preferences, isPolling } = get();

        // Don't start if already polling or in manual mode
        if (isPolling || preferences.refreshInterval === 'manual') {
          return;
        }

        const intervalMs = REFRESH_INTERVALS[preferences.refreshInterval];
        if (intervalMs <= 0) return;

        // Create polling service with callbacks if not exists
        let service = get().pollingService;
        if (!service) {
          const callbacks: PollingCallbacks = {
            onRefresh: () => get().refreshAllPrices(),
            onUpdateStaleness: () => get().updateStaleness(),
            onNetworkChange: (online) => {
              const wasOffline = !get().isOnline;
              set({ isOnline: online, error: online ? null : get().error });

              if (online && wasOffline) {
                // Connection restored - refresh prices
                logger.info(
                  'Network connection restored, refreshing prices...'
                );
                const { watchedSymbols, preferences: prefs } = get();
                if (
                  watchedSymbols.size > 0 &&
                  prefs.refreshInterval !== 'manual'
                ) {
                  get().refreshAllPrices();
                }
              } else if (!online) {
                logger.info('Network connection lost, using cached prices');
              }
            },
            onLoadCache: () => get().loadCachedPrices(),
            onPersistCache: () => get().persistPriceCache(),
          };
          service = createPricePollingService(callbacks);
          set({ pollingService: service });
        }

        // Set polling state synchronously for API compatibility
        set({ isPolling: true });

        // Start polling asynchronously (fire and forget)
        service
          .start(preferences)
          .then(() => {
            set({ isOnline: service!.isOnline });
          })
          .catch((error) => {
            logger.error('Failed to start polling:', error);
            set({ isPolling: false });
          });
      },

      stopPolling: () => {
        const service = get().pollingService;

        // Set state synchronously for API compatibility
        set({ isPolling: false });

        if (service) {
          // Stop polling asynchronously (fire and forget)
          service.stop().catch((error) => {
            logger.error('Failed to stop polling:', error);
          });
        }
      },

      updateStaleness: () => {
        const currentPrices = get().prices;
        const refreshInterval = get().preferences.refreshInterval;
        const prices = recalculatePriceStaleness(
          currentPrices,
          refreshInterval
        );

        // Only update if staleness actually changed
        let updated = false;
        currentPrices.forEach((data, symbol) => {
          const freshData = prices.get(symbol);
          if (freshData && data.staleness !== freshData.staleness) {
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
                const staleness = calculateStaleness(
                  timestamp,
                  refreshInterval
                );

                prices.set(symbol, {
                  ...data,
                  timestamp,
                  staleness,
                });
              }
            });

            if (prices.size > 0) {
              set({ prices });
              logger.info(`Loaded ${prices.size} cached prices from IndexedDB`);
            }
          }
        } catch (error) {
          logger.error('Failed to load cached prices:', error);
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
          logger.error('Failed to persist price cache:', error);
        }
      },

      /**
       * Persist current prices to priceSnapshots table for historical data.
       * This enables the Growth Chart widget to display historical portfolio values.
       */
      persistPriceSnapshots: async () => {
        try {
          const { prices, symbolToAssetId } = get();
          if (prices.size === 0 || symbolToAssetId.size === 0) return;

          const { priceQueries } = await import('@/lib/db/queries');

          const snapshots: Array<{
            assetId: string;
            price: Decimal;
            change: Decimal;
            changePercent: number;
            timestamp: Date;
            source: string;
            marketState?: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
          }> = [];

          prices.forEach((data, symbol) => {
            const assetId = symbolToAssetId.get(symbol);
            if (assetId) {
              snapshots.push({
                assetId,
                price: new Decimal(data.price),
                change: new Decimal(data.change),
                changePercent: data.changePercent,
                timestamp: data.timestamp,
                source: data.source,
                marketState: data.marketState,
              });
            }
          });

          if (snapshots.length > 0) {
            await priceQueries.saveBatchSnapshots(snapshots);
          }
        } catch (error) {
          logger.error('Failed to persist price snapshots:', error);
        }
      },

      // Network state management
      // Note: When polling service is active, it manages network state via its callbacks
      setOnline: (online) => {
        const wasOffline = !get().isOnline;
        set({ isOnline: online });

        // If no polling service (manual mode), handle network changes here
        if (!get().pollingService) {
          if (online && wasOffline) {
            set({ error: null });
            logger.info('Network connection restored, refreshing prices...');
            // Trigger a refresh when coming back online
            const { watchedSymbols } = get();
            if (watchedSymbols.size > 0) {
              get().refreshAllPrices();
            }
          } else if (!online) {
            logger.info('Network connection lost, using cached prices');
          }
        }
        // When polling service is active, it handles network changes via onNetworkChange callback
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
