import { differenceInDays, addDays } from 'date-fns';

/**
 * Holding Period Calculator
 *
 * Calculates holding periods for tax lots and classifies them as Short-Term (≤ 1 year)
 * or Long-Term (> 1 year) based on IRS rules.
 *
 * IRS Publication 550: Long-term capital gains require holding for MORE than one year.
 */

/**
 * Determines if a tax lot qualifies for long-term capital gains treatment.
 *
 * @param purchaseDate Date when the asset was acquired
 * @param referenceDate Date to calculate from (typically current date for unrealized gains, or sell date for realized gains)
 * @returns 'short' if held ≤ 1 year (≤ 365 days), 'long' if held > 1 year (> 365 days)
 *
 * @throws Error if referenceDate is before purchaseDate or if invalid dates are provided
 *
 * @example
 * // Purchase on Jan 1, 2024
 * const purchase = new Date('2024-01-01');
 *
 * // Sell exactly 1 year later (365 days)
 * calculateHoldingPeriod(purchase, new Date('2024-12-31'));  // 'short'
 *
 * // Sell 366 days later (day after 1 year anniversary)
 * calculateHoldingPeriod(purchase, new Date('2025-01-01'));  // 'long'
 */
export function calculateHoldingPeriod(
  purchaseDate: Date,
  referenceDate: Date
): 'short' | 'long' {
  // Validate dates
  if (!(purchaseDate instanceof Date) || isNaN(purchaseDate.getTime())) {
    throw new Error('Invalid purchase date provided');
  }
  if (!(referenceDate instanceof Date) || isNaN(referenceDate.getTime())) {
    throw new Error('Invalid reference date provided');
  }
  if (referenceDate < purchaseDate) {
    throw new Error('Reference date cannot be before purchase date');
  }

  const days = differenceInDays(referenceDate, purchaseDate);

  // IRS requires MORE than one year (> 365 days) for long-term treatment
  return days > 365 ? 'long' : 'short';
}

/**
 * Returns the exact number of days an asset has been held.
 *
 * @param purchaseDate Date when the asset was acquired
 * @param referenceDate Date to calculate from
 * @returns Integer number of days held (can be 0 for same-day)
 *
 * @example
 * calculateHoldingDays(new Date('2024-01-01'), new Date('2024-01-01'));  // 0
 * calculateHoldingDays(new Date('2024-01-01'), new Date('2024-01-02'));  // 1
 * calculateHoldingDays(new Date('2024-01-01'), new Date('2024-12-31'));  // 365
 */
export function calculateHoldingDays(
  purchaseDate: Date,
  referenceDate: Date
): number {
  // Validate dates
  if (!(purchaseDate instanceof Date) || isNaN(purchaseDate.getTime())) {
    throw new Error('Invalid purchase date provided');
  }
  if (!(referenceDate instanceof Date) || isNaN(referenceDate.getTime())) {
    throw new Error('Invalid reference date provided');
  }

  return differenceInDays(referenceDate, purchaseDate);
}

/**
 * Returns the date when a lot will transition from short-term to long-term.
 *
 * @param purchaseDate Date when the asset was acquired
 * @returns Date (inclusive) when lot becomes long-term (purchaseDate + 366 days)
 *
 * @example
 * const purchase = new Date('2024-01-01');
 * const threshold = getHoldingPeriodThreshold(purchase);
 * // threshold = 2025-01-02 (day after 1-year anniversary)
 *
 * // Becomes long-term on this date:
 * calculateHoldingPeriod(purchase, threshold);  // 'long'
 *
 * // Still short-term one day before:
 * const dayBefore = addDays(threshold, -1);
 * calculateHoldingPeriod(purchase, dayBefore);  // 'short'
 */
export function getHoldingPeriodThreshold(purchaseDate: Date): Date {
  // Validate date
  if (!(purchaseDate instanceof Date) || isNaN(purchaseDate.getTime())) {
    throw new Error('Invalid purchase date provided');
  }

  // Add 366 days to get the first day that qualifies as long-term
  // (since we need MORE than 365 days, the 366th day is the first long-term day)
  return addDays(purchaseDate, 366);
}
