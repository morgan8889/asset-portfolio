/**
 * Region Inference Utility
 *
 * Infers geographic region from ticker symbol suffixes and exchanges.
 */

import { Region } from '@/types/asset';

/**
 * Ticker suffix to region mapping
 */
const TICKER_SUFFIX_MAP: Record<string, Region> = {
  '.L': 'UK', // London Stock Exchange
  '.LON': 'UK',
  '.TO': 'CA', // Toronto Stock Exchange
  '.V': 'CA', // TSX Venture Exchange
  '.DE': 'EU', // Deutsche Börse (Germany)
  '.F': 'EU', // Frankfurt
  '.PA': 'EU', // Paris (Euronext)
  '.AS': 'EU', // Amsterdam
  '.MI': 'EU', // Milan
  '.MC': 'EU', // Madrid
  '.HK': 'APAC', // Hong Kong
  '.T': 'APAC', // Tokyo
  '.SS': 'APAC', // Shanghai
  '.SZ': 'APAC', // Shenzhen
  '.KS': 'APAC', // Korea Stock Exchange
  '.AX': 'APAC', // Australian Securities Exchange
  '.NZ': 'APAC', // New Zealand
  '.SI': 'APAC', // Singapore
  '.TW': 'APAC', // Taiwan
  '.BK': 'EMERGING', // Thailand
  '.JK': 'EMERGING', // Indonesia
  '.KL': 'EMERGING', // Malaysia
  '.BO': 'EMERGING', // Bombay Stock Exchange
  '.NS': 'EMERGING', // National Stock Exchange of India
  '.SA': 'EMERGING', // Brazil
  '.MX': 'EMERGING', // Mexico
  '.IS': 'EMERGING', // Turkey
  '.TWO': 'EMERGING', // Taiwan OTC
};

/**
 * Exchange to region mapping (fallback if suffix not found)
 */
const EXCHANGE_MAP: Record<string, Region> = {
  NYSE: 'US',
  NASDAQ: 'US',
  AMEX: 'US',
  LSE: 'UK',
  AIM: 'UK',
  TSX: 'CA',
  FRA: 'EU',
  EPA: 'EU',
  AMS: 'EU',
  BIT: 'EU',
  BME: 'EU',
  HKEX: 'APAC',
  TSE: 'APAC',
  SSE: 'APAC',
  SZSE: 'APAC',
  KRX: 'APAC',
  ASX: 'APAC',
  NSE: 'EMERGING',
  BSE: 'EMERGING',
  BOVESPA: 'EMERGING',
  BMV: 'EMERGING',
};

/**
 * Infer region from ticker symbol and exchange.
 *
 * Priority:
 * 1. Check ticker suffix (.L, .TO, etc.)
 * 2. Check exchange code (if provided)
 * 3. Default to US
 *
 * @param symbol - Ticker symbol (e.g., "VOD.L", "AAPL", "BTC-USD")
 * @param exchange - Optional exchange code (e.g., "NYSE", "LSE")
 * @returns Inferred region
 */
export function inferRegion(symbol: string, exchange?: string): Region {
  // Check ticker suffix first
  for (const [suffix, region] of Object.entries(TICKER_SUFFIX_MAP)) {
    if (symbol.toUpperCase().endsWith(suffix.toUpperCase())) {
      return region;
    }
  }

  // Check exchange if provided
  if (exchange) {
    const exchangeUpper = exchange.toUpperCase();
    if (exchangeUpper in EXCHANGE_MAP) {
      return EXCHANGE_MAP[exchangeUpper];
    }
  }

  // Special case for crypto (no region)
  // Use more specific patterns to avoid false positives
  const symbolUpper = symbol.toUpperCase();
  if (
    symbolUpper.endsWith('-USD') ||
    symbolUpper.endsWith('/USD') ||
    symbolUpper.includes('USDT')
  ) {
    return 'OTHER';
  }

  // Default to US
  return 'US';
}

/**
 * Get human-readable region name
 */
export function getRegionName(region: Region): string {
  const names: Record<Region, string> = {
    US: 'United States',
    UK: 'United Kingdom',
    EU: 'Europe',
    APAC: 'Asia-Pacific',
    EMERGING: 'Emerging Markets',
    CA: 'Canada',
    OTHER: 'Other',
  };
  return names[region];
}

/**
 * Get region flag emoji (for display)
 */
export function getRegionFlag(region: Region): string {
  const flags: Record<Region, string> = {
    US: '🇺🇸',
    UK: '🇬🇧',
    EU: '🇪🇺',
    APAC: '🌏',
    EMERGING: '🌍',
    CA: '🇨🇦',
    OTHER: '🌐',
  };
  return flags[region];
}
