/**
 * Price Lookup Service
 *
 * Common utilities for looking up historical prices.
 * Used by performance-calculator and historical-value services.
 *
 * @module services/price-lookup
 */

import { Decimal } from 'decimal.js';
import { priceQueries } from '@/lib/db';
import { startOfDay } from 'date-fns';

export interface PriceLookupResult {
  price: Decimal;
  isInterpolated: boolean;
}

export type PriceCache = Map<string, Map<string, PriceLookupResult>>;

/** Threshold in milliseconds for considering a price "interpolated" (3 days) */
const INTERPOLATION_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Find the closest price to a target date from a price history array.
 */
export function findClosestPrice<T extends { timestamp: Date | string; price: Decimal | number }>(
  priceHistory: T[],
  targetDate: Date
): { price: T; diffMs: number } | null {
  if (priceHistory.length === 0) return null;

  let closest = priceHistory[0];
  let minDiff = Math.abs(new Date(priceHistory[0].timestamp).getTime() - targetDate.getTime());

  for (const snapshot of priceHistory) {
    const diff = Math.abs(new Date(snapshot.timestamp).getTime() - targetDate.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closest = snapshot;
    }
  }

  return { price: closest, diffMs: minDiff };
}

/**
 * Get price for an asset at a specific date with caching.
 *
 * @param assetId - The asset ID to look up
 * @param date - Target date for the price
 * @param cache - Optional cache to avoid repeated queries
 * @returns Price and whether it was interpolated
 */
export async function getPriceAtDate(
  assetId: string,
  date: Date,
  cache?: PriceCache
): Promise<PriceLookupResult> {
  const dateKey = startOfDay(date).toISOString();

  // Check cache first
  if (cache) {
    const assetCache = cache.get(assetId);
    if (assetCache?.has(dateKey)) {
      return assetCache.get(dateKey)!;
    }
  }

  // Get historical prices (request extra days for interpolation)
  const daysSinceDate = Math.ceil((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  const priceHistory = await priceQueries.getHistoryForAsset(assetId, daysSinceDate + 30);

  // No history available
  if (priceHistory.length === 0) {
    return { price: new Decimal(0), isInterpolated: true };
  }

  const closest = findClosestPrice(priceHistory, date);
  if (!closest) {
    return { price: new Decimal(0), isInterpolated: true };
  }

  const result: PriceLookupResult = {
    price: new Decimal(closest.price.price.toString()),
    isInterpolated: closest.diffMs > INTERPOLATION_THRESHOLD_MS,
  };

  // Update cache
  if (cache) {
    if (!cache.has(assetId)) {
      cache.set(assetId, new Map());
    }
    cache.get(assetId)!.set(dateKey, result);
  }

  return result;
}

/**
 * Create a new price cache instance.
 */
export function createPriceCache(): PriceCache {
  return new Map();
}
