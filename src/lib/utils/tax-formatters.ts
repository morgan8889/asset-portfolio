/**
 * Tax Data Formatting Utilities
 *
 * Display helpers for tax-related data in UI and export reports.
 */

import { Decimal } from 'decimal.js';
import { HoldingPeriod } from '@/types/tax';
import { formatPercentage } from './currency';

/**
 * @deprecated Use formatPercentage() from @/lib/utils/currency instead
 * Preserved for backward compatibility in tax exports
 *
 * Format percentage with appropriate precision
 *
 * @param percent - Decimal or number percentage (0.15 = 15%)
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted percentage string (e.g., "15.00%")
 */
export function formatPercent(
  percent: Decimal | number | string | undefined | null,
  precision: number = 2
): string {
  if (percent === undefined || percent === null) {
    return '0.00%';
  }

  const decimal =
    percent instanceof Decimal ? percent : new Decimal(percent.toString());
  const value = decimal.mul(100).toNumber(); // Convert 0.15 to 15

  // Use the standard formatPercentage function for consistency
  // formatPercentage expects the percentage value (not decimal), so pass value directly
  return formatPercentage(value, precision, false, true);
}

/**
 * Format holding period for display
 *
 * @param period - Holding period classification
 * @returns Formatted string (e.g., "Short-Term", "Long-Term", "Mixed")
 */
export function formatHoldingPeriod(period: HoldingPeriod): string {
  switch (period) {
    case 'short':
      return 'Short-Term';
    case 'long':
      return 'Long-Term';
    case 'mixed':
      return 'Mixed';
    default:
      return 'Unknown';
  }
}

/**
 * Format holding period abbreviation for compact display
 *
 * @param period - Holding period classification
 * @returns Abbreviated string (e.g., "ST", "LT", "Mixed")
 */
export function formatHoldingPeriodAbbr(period: HoldingPeriod): string {
  switch (period) {
    case 'short':
      return 'ST';
    case 'long':
      return 'LT';
    case 'mixed':
      return 'Mixed';
    default:
      return '—';
  }
}

/**
 * Format days until long-term status
 *
 * @param days - Number of days
 * @returns Formatted string (e.g., "7 days", "1 day", "Long-term")
 */
export function formatDaysUntilLongTerm(days: number): string {
  if (days <= 0) {
    return 'Long-term';
  }
  if (days === 1) {
    return '1 day';
  }
  return `${days} days`;
}

/**
 * Format date for export (yyyy-MM-dd)
 *
 * @param date - Date object or undefined
 * @returns Formatted date string or empty string
 */
export function formatExportDate(date: Date | undefined): string {
  if (!date) {
    return '';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Format shares quantity for export
 *
 * @param quantity - Decimal or number quantity
 * @returns Formatted quantity string (e.g., "1,234.5678")
 */
export function formatExportQuantity(
  quantity: Decimal | number | string | undefined
): string {
  if (quantity === undefined) {
    return '';
  }

  const decimal =
    quantity instanceof Decimal ? quantity : new Decimal(quantity.toString());

  return decimal.toFixed(4).replace(/\.?0+$/, ''); // Remove trailing zeros
}

/**
 * Format currency for export (without symbol)
 *
 * @param amount - Decimal or number amount
 * @returns Formatted amount string (e.g., "1234.56")
 */
export function formatExportCurrency(
  amount: Decimal | number | string | undefined
): string {
  if (amount === undefined) {
    return '';
  }

  const decimal =
    amount instanceof Decimal ? amount : new Decimal(amount.toString());

  return decimal.toFixed(2);
}

/**
 * Format percentage for export
 *
 * @param percent - Decimal or number percentage (0.15 = 15%)
 * @returns Formatted percentage string (e.g., "15.00%")
 */
export function formatExportPercent(
  percent: Decimal | number | string | undefined
): string {
  if (percent === undefined) {
    return '';
  }

  return formatPercent(percent, 2);
}
