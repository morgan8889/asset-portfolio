import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { addDays } from 'date-fns';
import {
  calculateHoldingPeriod,
  calculateHoldingDays,
  getHoldingPeriodThreshold,
} from '@/lib/services/holding-period';

describe('calculateHoldingPeriod', () => {
  test('same day is short-term', () => {
    const date = new Date('2024-01-01');
    expect(calculateHoldingPeriod(date, date)).toBe('short');
  });

  test('365 days (exactly 1 year) is short-term', () => {
    const purchase = new Date('2024-01-01');
    const sell = new Date('2024-12-31'); // 365 days later (2024 is leap year, so Dec 31 is 365 days)
    expect(calculateHoldingPeriod(purchase, sell)).toBe('short');
  });

  test('366 days (more than 1 year) is long-term', () => {
    const purchase = new Date('2024-01-01');
    const sell = new Date('2025-01-01'); // 366 days later (leap year)
    expect(calculateHoldingPeriod(purchase, sell)).toBe('long');
  });

  test('leap year Feb 29 edge case', () => {
    const purchase = new Date('2024-02-29');
    const shortSell = new Date('2025-02-28'); // 364 days
    const longSell = new Date('2025-03-01'); // 366 days

    expect(calculateHoldingPeriod(purchase, shortSell)).toBe('short');
    expect(calculateHoldingPeriod(purchase, longSell)).toBe('long');
  });

  test('non-leap year boundary', () => {
    const purchase = new Date('2023-01-01');
    const sell365 = new Date('2023-12-31'); // 364 days in non-leap year
    const sell366 = new Date('2024-01-02'); // 366 days

    expect(calculateHoldingPeriod(purchase, sell365)).toBe('short');
    expect(calculateHoldingPeriod(purchase, sell366)).toBe('long');
  });

  test('throws error if reference date before purchase date', () => {
    const purchase = new Date('2024-01-01');
    const invalid = new Date('2023-12-31');

    expect(() => calculateHoldingPeriod(purchase, invalid)).toThrow(
      'Reference date cannot be before purchase date'
    );
  });

  test('throws error for invalid purchase date', () => {
    const invalidDate = new Date('invalid');
    const validDate = new Date('2024-01-01');

    expect(() => calculateHoldingPeriod(invalidDate, validDate)).toThrow(
      'Invalid purchase date provided'
    );
  });

  test('throws error for invalid reference date', () => {
    const validDate = new Date('2024-01-01');
    const invalidDate = new Date('invalid');

    expect(() => calculateHoldingPeriod(validDate, invalidDate)).toThrow(
      'Invalid reference date provided'
    );
  });

  test('future reference date is valid', () => {
    const purchase = new Date('2024-01-01');
    const future = new Date('2030-01-01');

    // Should not throw, valid for "what-if" analysis
    expect(calculateHoldingPeriod(purchase, future)).toBe('long');
  });

  test('exactly 366 days after purchase', () => {
    const purchase = new Date('2024-01-01');
    const sell = addDays(purchase, 366);

    expect(calculateHoldingPeriod(purchase, sell)).toBe('long');
  });

  test('exactly 365 days after purchase', () => {
    const purchase = new Date('2024-01-01');
    const sell = addDays(purchase, 365);

    expect(calculateHoldingPeriod(purchase, sell)).toBe('short');
  });
});

describe('calculateHoldingDays', () => {
  test('returns 0 for same day', () => {
    const date = new Date('2024-01-01');
    expect(calculateHoldingDays(date, date)).toBe(0);
  });

  test('returns 1 for next day', () => {
    expect(
      calculateHoldingDays(new Date('2024-01-01'), new Date('2024-01-02'))
    ).toBe(1);
  });

  test('returns correct days for full year (leap)', () => {
    expect(
      calculateHoldingDays(new Date('2024-01-01'), new Date('2024-12-31'))
    ).toBe(365); // 2024 is leap year
  });

  test('returns correct days for full year (non-leap)', () => {
    expect(
      calculateHoldingDays(new Date('2023-01-01'), new Date('2023-12-31'))
    ).toBe(364); // 2023 is not leap year
  });

  test('returns negative for dates in wrong order', () => {
    const result = calculateHoldingDays(
      new Date('2024-01-02'),
      new Date('2024-01-01')
    );
    expect(result).toBe(-1);
  });

  test('throws error for invalid purchase date', () => {
    const invalidDate = new Date('invalid');
    const validDate = new Date('2024-01-01');

    expect(() => calculateHoldingDays(invalidDate, validDate)).toThrow(
      'Invalid purchase date provided'
    );
  });

  test('throws error for invalid reference date', () => {
    const validDate = new Date('2024-01-01');
    const invalidDate = new Date('invalid');

    expect(() => calculateHoldingDays(validDate, invalidDate)).toThrow(
      'Invalid reference date provided'
    );
  });
});

describe('getHoldingPeriodThreshold', () => {
  test('returns date 366 days after purchase', () => {
    const purchase = new Date('2024-01-01');
    const threshold = getHoldingPeriodThreshold(purchase);

    // 2024 is a leap year, so 366 days from Jan 1, 2024 is Jan 1, 2025
    expect(threshold).toEqual(new Date('2025-01-01'));
  });

  test('threshold date is first long-term day', () => {
    const purchase = new Date('2024-06-15');
    const threshold = getHoldingPeriodThreshold(purchase);

    expect(calculateHoldingPeriod(purchase, threshold)).toBe('long');

    const dayBefore = addDays(threshold, -1);
    expect(calculateHoldingPeriod(purchase, dayBefore)).toBe('short');
  });

  test('handles leap year purchase date', () => {
    const purchase = new Date('2024-02-29');
    const threshold = getHoldingPeriodThreshold(purchase);

    // 366 days from Feb 29, 2024 should be Mar 1, 2025
    expect(threshold).toEqual(new Date('2025-03-01'));
  });

  test('throws error for invalid date', () => {
    const invalidDate = new Date('invalid');

    expect(() => getHoldingPeriodThreshold(invalidDate)).toThrow(
      'Invalid purchase date provided'
    );
  });

  test('threshold minus one day is still short-term', () => {
    const purchase = new Date('2023-01-01');
    const threshold = getHoldingPeriodThreshold(purchase);
    const dayBefore = addDays(threshold, -1);

    expect(calculateHoldingPeriod(purchase, dayBefore)).toBe('short');
    expect(calculateHoldingPeriod(purchase, threshold)).toBe('long');
  });
});
