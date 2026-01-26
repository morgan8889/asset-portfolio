/**
 * Asset Search Service
 *
 * Feature: 005-live-market-data
 *
 * Service for searching assets with UK market symbol recognition.
 * Handles .L suffix detection and exchange identification.
 */

import { Asset } from '@/types';
import { assetQueries } from '@/lib/db/queries';
import {
  isUKSymbol,
  getExchange,
  normalizeSymbol,
} from '@/lib/utils/market-utils';
import { Exchange } from '@/types/market';

export interface SearchResult extends Asset {
  detectedExchange: Exchange;
  isUKMarket: boolean;
}

/**
 * Searches for assets by query, with UK symbol recognition.
 *
 * @param query - Search term (symbol or name)
 * @param limit - Maximum number of results
 * @returns Array of assets with exchange information
 */
export async function searchAssets(
  query: string,
  limit: number = 50
): Promise<SearchResult[]> {
  const normalizedQuery = normalizeSymbol(query);

  // Search in local database first
  const localResults = await assetQueries.search(query, limit);

  // Transform results with exchange detection
  return localResults.map((asset) => ({
    ...asset,
    detectedExchange: getExchange(asset.symbol),
    isUKMarket: isUKSymbol(asset.symbol),
  }));
}

/**
 * Creates or gets an asset with proper exchange detection.
 *
 * @param symbol - The stock symbol (e.g., 'AAPL', 'VOD.L')
 * @param name - The asset name
 * @param type - Asset type
 * @returns The asset ID
 */
export async function createAssetWithExchange(
  symbol: string,
  name: string,
  type: 'stock' | 'etf' | 'crypto' | 'bond' | 'cash' | 'other'
): Promise<string> {
  const normalizedSymbol = normalizeSymbol(symbol);
  const exchange = getExchange(normalizedSymbol);
  const isUK = isUKSymbol(normalizedSymbol);

  // Check if asset already exists
  const existing = await assetQueries.getBySymbol(normalizedSymbol);
  if (existing) {
    // Update exchange if not set
    if (!existing.exchange && exchange !== 'UNKNOWN') {
      await assetQueries.update(existing.id, {
        exchange: exchange === 'LSE' ? 'LSE' : exchange,
      });
    }
    return existing.id;
  }

  // Create new asset with exchange information
  return await assetQueries.create({
    symbol: normalizedSymbol,
    name,
    type,
    exchange: exchange === 'UNKNOWN' ? undefined : exchange,
    currency: isUK ? 'GBP' : 'USD',
    metadata: {},
  });
}

/**
 * Detects UK market characteristics for a symbol.
 *
 * @param symbol - The stock symbol
 * @returns Object with UK market information
 */
export function detectUKSymbol(symbol: string): {
  isUK: boolean;
  exchange: Exchange;
  displayExchange: string;
  currency: string;
} {
  const normalized = normalizeSymbol(symbol);
  const isUK = isUKSymbol(normalized);
  const exchange = getExchange(normalized);

  return {
    isUK,
    exchange,
    displayExchange: isUK ? (exchange === 'AIM' ? 'AIM' : 'LSE') : exchange,
    currency: isUK ? 'GBP' : 'USD',
  };
}

/**
 * Gets exchange display name.
 *
 * @param exchange - Exchange code
 * @returns Human-readable exchange name
 */
export function getExchangeDisplayName(exchange: Exchange): string {
  const displayNames: Record<Exchange, string> = {
    NYSE: 'NYSE',
    NASDAQ: 'NASDAQ',
    AMEX: 'AMEX',
    LSE: 'London Stock Exchange',
    AIM: 'AIM (London)',
    CRYPTO: 'Cryptocurrency',
    UNKNOWN: 'Unknown',
  };

  return displayNames[exchange] || exchange;
}

/**
 * Gets exchange badge color for display.
 *
 * @param exchange - Exchange code
 * @returns Tailwind color classes
 */
export function getExchangeBadgeColor(exchange: Exchange): string {
  const colors: Record<Exchange, string> = {
    NYSE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    NASDAQ: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    AMEX: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    LSE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    AIM: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    CRYPTO:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    UNKNOWN: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  };

  return colors[exchange] || colors.UNKNOWN;
}
