/**
 * Price Service: Live Market Data
 *
 * Feature: 005-live-market-data
 *
 * Service for orchestrating price updates, managing price cache,
 * and coordinating between the price store and API layer.
 */

import Decimal from 'decimal.js';
import { LivePriceData, MarketState, RefreshInterval } from '@/types/market';
import { convertPenceToPounds, getExchange, isUKSymbol } from '@/lib/utils/market-utils';
import { calculateStaleness } from '@/lib/utils/staleness';
import { getMarketState } from './market-hours';

// Price data cache with timestamps
interface CachedPrice {
  symbol: string;
  price: Decimal;
  currency: string;
  change: Decimal;
  changePercent: number;
  timestamp: Date;
  source: string;
  marketState: MarketState;
}

const priceCache = new Map<string, CachedPrice>();

/**
 * Fetches a single price from the API.
 *
 * @param symbol - The stock/crypto symbol
 * @returns The price data or null if fetch failed
 */
export async function fetchPrice(symbol: string): Promise<CachedPrice | null> {
  try {
    const response = await fetch(`/api/prices/${encodeURIComponent(symbol)}`);

    if (!response.ok) {
      console.error(`Failed to fetch price for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    const cachedPrice: CachedPrice = {
      symbol: data.symbol,
      price: new Decimal(data.price),
      currency: data.metadata?.currency || 'USD',
      change: new Decimal(data.metadata?.change || 0),
      changePercent: data.metadata?.changePercent || 0,
      timestamp: new Date(data.timestamp),
      source: data.source,
      marketState: data.metadata?.marketState || getMarketState(symbol),
    };

    // Update cache
    priceCache.set(symbol.toUpperCase(), cachedPrice);

    return cachedPrice;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetches prices for multiple symbols in batch.
 *
 * @param symbols - Array of stock/crypto symbols
 * @returns Map of symbol to price data
 */
export async function fetchPrices(symbols: string[]): Promise<Map<string, CachedPrice>> {
  const results = new Map<string, CachedPrice>();

  if (symbols.length === 0) {
    return results;
  }

  try {
    const response = await fetch('/api/prices/[symbol]', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols }),
    });

    if (!response.ok) {
      // Fall back to individual requests
      const individualResults = await Promise.allSettled(symbols.map(fetchPrice));

      individualResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.set(symbols[index].toUpperCase(), result.value);
        }
      });

      return results;
    }

    const data = await response.json();

    if (data.successful) {
      data.successful.forEach((item: any) => {
        const cachedPrice: CachedPrice = {
          symbol: item.symbol,
          price: new Decimal(item.price),
          currency: item.metadata?.currency || 'USD',
          change: new Decimal(item.metadata?.change || 0),
          changePercent: item.metadata?.changePercent || 0,
          timestamp: new Date(item.timestamp),
          source: item.source,
          marketState: item.metadata?.marketState || getMarketState(item.symbol),
        };

        results.set(item.symbol.toUpperCase(), cachedPrice);
        priceCache.set(item.symbol.toUpperCase(), cachedPrice);
      });
    }

    return results;
  } catch (error) {
    console.error('Error fetching batch prices:', error);
    return results;
  }
}

/**
 * Gets a cached price for a symbol.
 *
 * @param symbol - The stock/crypto symbol
 * @returns The cached price or undefined
 */
export function getCachedPrice(symbol: string): CachedPrice | undefined {
  return priceCache.get(symbol.toUpperCase());
}

/**
 * Transforms cached price data to LivePriceData for display.
 *
 * @param cached - The cached price data
 * @param refreshInterval - User's refresh interval preference
 * @returns LivePriceData with staleness and display formatting
 */
export function transformToLivePriceData(
  cached: CachedPrice,
  refreshInterval: RefreshInterval
): LivePriceData {
  const { displayPrice, displayCurrency } = convertPenceToPounds(cached.price, cached.currency);
  const exchange = getExchange(cached.symbol);
  const staleness = calculateStaleness(cached.timestamp, refreshInterval);

  return {
    symbol: cached.symbol,
    price: cached.price.toString(),
    currency: cached.currency,
    displayPrice: displayPrice.toString(),
    displayCurrency,
    change: cached.change.toString(),
    changePercent: cached.changePercent,
    timestamp: cached.timestamp,
    source: cached.source,
    marketState: cached.marketState,
    staleness,
    exchange,
  };
}

/**
 * Gets live price data for a symbol, fetching if necessary.
 *
 * @param symbol - The stock/crypto symbol
 * @param refreshInterval - User's refresh interval preference
 * @param forceRefresh - Whether to force a fresh fetch
 * @returns LivePriceData or null if unavailable
 */
export async function getLivePrice(
  symbol: string,
  refreshInterval: RefreshInterval,
  forceRefresh: boolean = false
): Promise<LivePriceData | null> {
  const upperSymbol = symbol.toUpperCase();

  // Check cache first unless forcing refresh
  if (!forceRefresh) {
    const cached = priceCache.get(upperSymbol);
    if (cached) {
      const staleness = calculateStaleness(cached.timestamp, refreshInterval);
      // Use cache if data is fresh or aging
      if (staleness !== 'stale') {
        return transformToLivePriceData(cached, refreshInterval);
      }
    }
  }

  // Fetch fresh data
  const freshData = await fetchPrice(symbol);
  if (!freshData) {
    // Return stale cached data if available
    const cached = priceCache.get(upperSymbol);
    if (cached) {
      return transformToLivePriceData(cached, refreshInterval);
    }
    return null;
  }

  return transformToLivePriceData(freshData, refreshInterval);
}

/**
 * Gets live prices for multiple symbols.
 *
 * @param symbols - Array of stock/crypto symbols
 * @param refreshInterval - User's refresh interval preference
 * @returns Map of symbol to LivePriceData
 */
export async function getLivePrices(
  symbols: string[],
  refreshInterval: RefreshInterval
): Promise<Map<string, LivePriceData>> {
  const results = new Map<string, LivePriceData>();

  // Fetch all prices
  const cached = await fetchPrices(symbols);

  // Transform to LivePriceData
  cached.forEach((price, symbol) => {
    results.set(symbol, transformToLivePriceData(price, refreshInterval));
  });

  return results;
}

/**
 * Clears the price cache.
 */
export function clearPriceCache(): void {
  priceCache.clear();
}

/**
 * Gets all cached prices as LivePriceData.
 *
 * @param refreshInterval - User's refresh interval preference
 * @returns Array of LivePriceData
 */
export function getAllCachedPrices(refreshInterval: RefreshInterval): LivePriceData[] {
  return Array.from(priceCache.values()).map((cached) =>
    transformToLivePriceData(cached, refreshInterval)
  );
}

/**
 * Persists price cache to IndexedDB for offline resilience.
 * This should be called periodically to ensure data survives page refreshes.
 *
 * Note: The existing PriceSnapshot schema uses assetId, so we store by symbol
 * which serves as the asset identifier for price lookups.
 */
export async function persistPriceCache(): Promise<void> {
  try {
    const { priceQueries } = await import('@/lib/db/queries');
    const prices = Array.from(priceCache.values());

    for (const price of prices) {
      await priceQueries.saveSnapshot({
        assetId: price.symbol, // Using symbol as assetId for price lookups
        price: price.price,
        change: price.change,
        changePercent: price.changePercent,
        timestamp: price.timestamp,
        source: price.source,
        marketState: price.marketState,
      });
    }
  } catch (error) {
    console.error('Failed to persist price cache:', error);
  }
}

/**
 * Loads a price from IndexedDB cache for a specific symbol.
 * This should be called on app initialization or when needing offline data.
 *
 * @param symbol - The stock/crypto symbol to load
 */
export async function loadCachedPrice(symbol: string): Promise<void> {
  try {
    const { priceQueries } = await import('@/lib/db/queries');
    const snapshot = await priceQueries.getLatestSnapshot(symbol.toUpperCase());

    if (snapshot) {
      priceCache.set(symbol.toUpperCase(), {
        symbol: symbol.toUpperCase(),
        price: snapshot.price,
        currency: 'USD', // Default, will be updated on next fetch
        change: snapshot.change,
        changePercent: snapshot.changePercent,
        timestamp: snapshot.timestamp,
        source: snapshot.source,
        marketState: snapshot.marketState || 'CLOSED',
      });
    }
  } catch (error) {
    console.error(`Failed to load cached price for ${symbol}:`, error);
  }
}

/**
 * Loads prices from IndexedDB cache for multiple symbols.
 *
 * @param symbols - Array of symbols to load
 */
export async function loadCachedPrices(symbols: string[]): Promise<void> {
  await Promise.allSettled(symbols.map(loadCachedPrice));
}
