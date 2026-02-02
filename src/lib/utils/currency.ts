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
 * Supports both simple (amount, currency, locale) and options-based signatures
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
