/**
 * Market Utilities: Live Market Data
 *
 * Feature: 005-live-market-data
 *
 * Utilities for UK symbol detection, exchange identification, and currency conversion.
 */

import Decimal from 'decimal.js';
import { Exchange, MARKETS } from '@/types/market';

/**
 * Detects if a symbol is a UK-listed security (LSE or AIM).
 * UK symbols use the .L suffix on Yahoo Finance.
 *
 * @param symbol - The stock symbol to check
 * @returns True if the symbol ends with .L (case-insensitive)
 */
export function isUKSymbol(symbol: string): boolean {
  return /\.[Ll]$/.test(symbol);
}

/**
 * Detects if a symbol is a cryptocurrency.
 *
 * @param symbol - The symbol to check
 * @returns True if the symbol matches known crypto patterns
 */
export function isCryptoSymbol(symbol: string): boolean {
  const cryptoPatterns = /^(BTC|ETH|USDT|BNB|SOL|XRP|ADA|AVAX|DOT|MATIC)$/i;
  return cryptoPatterns.test(symbol);
}

/**
 * Determines the exchange for a given symbol.
 *
 * Logic:
 * - .L suffix → LSE (default for UK; AIM detection requires additional metadata)
 * - Known crypto symbols → CRYPTO
 * - Otherwise → US (covers NYSE, NASDAQ, AMEX)
 *
 * @param symbol - The stock/crypto symbol
 * @returns The detected exchange
 */
export function getExchange(symbol: string): Exchange {
  if (isUKSymbol(symbol)) {
    return 'LSE';
  }
  if (isCryptoSymbol(symbol)) {
    return 'CRYPTO';
  }
  // Default to US markets for non-.L symbols
  // Actual exchange (NYSE/NASDAQ/AMEX) can be determined from API response
  return 'UNKNOWN';
}

/**
 * Gets the market data for an exchange.
 *
 * @param exchange - The exchange identifier
 * @returns Market data or undefined if not found
 */
export function getMarket(exchange: Exchange) {
  return MARKETS[exchange];
}

/**
 * Converts a price from pence (GBp) to pounds (GBP).
 *
 * Yahoo Finance returns UK stock prices with currency "GBp" when quoted in pence.
 * This function handles the conversion for display purposes.
 *
 * @param price - The price value (as Decimal for precision)
 * @param currency - The currency code from the API ('USD', 'GBP', 'GBp')
 * @returns Object with displayPrice (in major currency units) and displayCurrency
 */
export function convertPenceToPounds(
  price: Decimal,
  currency: string
): { displayPrice: Decimal; displayCurrency: string } {
  if (currency === 'GBp') {
    return {
      displayPrice: price.div(100),
      displayCurrency: 'GBP',
    };
  }
  return {
    displayPrice: price,
    displayCurrency: currency,
  };
}

/**
 * Formats a price for display with currency symbol.
 *
 * @param price - The price value (as Decimal)
 * @param currency - The currency code ('USD', 'GBP')
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted price string with currency symbol
 */
export function formatPrice(
  price: Decimal,
  currency: string,
  decimals: number = 2
): string {
  const symbols: Record<string, string> = {
    USD: '$',
    GBP: '£',
    EUR: '€',
  };

  const symbol = symbols[currency] || currency + ' ';
  return `${symbol}${price.toFixed(decimals)}`;
}

/**
 * Normalizes a symbol for API requests.
 *
 * - Converts to uppercase
 * - Preserves .L suffix for UK symbols
 *
 * @param symbol - The raw symbol input
 * @returns Normalized symbol
 */
export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

/**
 * Extracts the base symbol (without exchange suffix).
 *
 * @param symbol - The full symbol (e.g., 'VOD.L')
 * @returns The base symbol (e.g., 'VOD')
 */
export function getBaseSymbol(symbol: string): string {
  return symbol.replace(/\.[Ll]$/, '');
}

/**
 * Gets the timezone for a market based on the symbol.
 *
 * @param symbol - The stock symbol
 * @returns IANA timezone string
 */
export function getMarketTimezone(symbol: string): string {
  if (isUKSymbol(symbol)) {
    return 'Europe/London';
  }
  // Default to US Eastern for US markets and crypto
  return 'America/New_York';
}
