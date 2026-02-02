/**
 * Centralized currency formatting utilities
 *
 * Re-exports enhanced utilities from main utils module for consistency.
 */

import { Decimal } from 'decimal.js';

export interface CurrencyFormatOptions {
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  notation?: 'standard' | 'compact';
}

/**
 * Formats a number/Decimal as currency with consistent styling
 *
 * Supports two signatures for flexibility:
 *
 * 1. **Simple signature** (recommended for most cases):
 *    ```typescript
 *    formatCurrency(1234.56, 'USD', 'en-US') // "$1,234.56"
 *    formatCurrency(1234.56, 'EUR', 'de-DE') // "1.234,56 €"
 *    ```
 *
 * 2. **Options-based signature** (for advanced formatting):
 *    ```typescript
 *    formatCurrency(1234567.89, {
 *      currency: 'USD',
 *      notation: 'compact',
 *      minimumFractionDigits: 1,
 *      maximumFractionDigits: 1,
 *    }) // "$1.2M"
 *    ```
 *
 * @param amount - The numeric value to format (number, string, or Decimal)
 * @param currencyOrOptions - Currency code (e.g., 'USD') or formatting options object
 * @param locale - The locale for formatting (default: 'en-US'). Only used with simple signature.
 * @returns Formatted currency string
 *
 * @example
 * // Simple usage
 * formatCurrency(1234.56) // "$1,234.56" (defaults to USD, en-US)
 * formatCurrency(new Decimal('1234.56'), 'GBP') // "£1,234.56"
 *
 * @example
 * // Compact notation for large numbers
 * formatCurrency(1234567, { currency: 'USD', notation: 'compact' }) // "$1.2M"
 *
 * @example
 * // Custom decimal places
 * formatCurrency(1234.5, { currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }) // "$1,235"
 */
export function formatCurrency(
  amount: number | string | Decimal,
  currencyOrOptions?: string | CurrencyFormatOptions,
  locale: string = 'en-US'
): string {
  const value = amount instanceof Decimal ? amount.toNumber() : Number(amount);

  // Options-based signature
  if (typeof currencyOrOptions === 'object') {
    const {
      currency = 'USD',
      minimumFractionDigits = 0,
      maximumFractionDigits = 0,
      notation = 'standard',
    } = currencyOrOptions;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
      notation,
    }).format(value);
  }

  // Simple signature
  const currency = currencyOrOptions || 'USD';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formats a number as a percentage
 * Supports both decimal input (0.15 → 15%) and percentage input (15 → 15%)
 */
export function formatPercentage(
  value: number,
  decimals: number = 2,
  showSign: boolean = false,
  isDecimal: boolean = false
): string {
  const percentValue = isDecimal ? value * 100 : value;
  const formatted = percentValue.toFixed(decimals);
  const sign = showSign && percentValue > 0 ? '+' : '';
  return `${sign}${formatted}%`;
}

/**
 * Formats large numbers in abbreviated form (e.g., $1.2M)
 */
export function formatCompactCurrency(
  value: number,
  currency: string = 'USD'
): string {
  return formatCurrency(value, {
    currency,
    notation: 'compact',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
