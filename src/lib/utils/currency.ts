/**
 * Centralized currency formatting utilities
 */

export interface CurrencyFormatOptions {
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  notation?: 'standard' | 'compact';
}

/**
 * Formats a number as currency with consistent styling across the application
 */
export function formatCurrency(
  value: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    currency = 'USD',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    notation = 'standard',
  } = options;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
    notation,
  }).format(value);
}

/**
 * Formats a number as a percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 2
): string {
  return `${(value * 100).toFixed(decimals)}%`;
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
