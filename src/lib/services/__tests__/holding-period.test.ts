/**
 * Holding Period Calculator Tests
 *
 * Unit tests for tax lot holding period classification and threshold calculations.
 * Tests IRS Publication 550 requirements for long-term capital gains.
 */

import { describe, it, expect } from 'vitest';
import { addDays } from 'date-fns';
import {
  calculateHoldingPeriod,
  calculateHoldingDays,
  getHoldingPeriodThreshold,
} from '../holding-period';

describe('calculateHoldingPeriod', () => {
  const purchaseDate = new Date('2024-01-01');

  describe('short-term classification (≤365 days)', () => {
    it('should return "short" for 0 days (same-day sale)', () => {
      const referenceDate = new Date('2024-01-01');

      const result = calculateHoldingPeriod(purchaseDate, referenceDate);

      expect(result).toBe('short');
    });

    it('should return "short" for 1 day', () => {
      const referenceDate = new Date('2024-01-02');

      const result = calculateHoldingPeriod(purchaseDate, referenceDate);

      expect(result).toBe('short');
    });

    it('should return "short" for 100 days', () => {
      const referenceDate = addDays(purchaseDate, 100);

      const result = calculateHoldingPeriod(purchaseDate, referenceDate);

      expect(result).toBe('short');
    });

    it('should return "short" for 364 days', () => {
      const referenceDate = addDays(purchaseDate, 364);

      const result = calculateHoldingPeriod(purchaseDate, referenceDate);

      expect(result).toBe('short');
    });

    it('should return "short" for exactly 365 days', () => {
      const referenceDate = addDays(purchaseDate, 365);

      const result = calculateHoldingPeriod(purchaseDate, referenceDate);

      expect(result).toBe('short');
    });

    it('should return "short" for non-leap year 1 year anniversary', () => {
      const purchase = new Date('2023-01-01');
      const oneYearLater = new Date('2024-01-01'); // 365 days in 2023

      const result = calculateHoldingPeriod(purchase, oneYearLater);

      expect(result).toBe('short');
    });

    it('should return "short" for leap year 1 year anniversary', () => {
      const purchase = new Date('2024-01-01');
      const oneYearLater = new Date('2024-12-31'); // 365 days in leap year 2024

      const result = calculateHoldingPeriod(purchase, oneYearLater);

      expect(result).toBe('short');
    });
  });

  describe('long-term classification (>365 days)', () => {
    it('should return "long" for 366 days', () => {
      const referenceDate = addDays(purchaseDate, 366);

      const result = calculateHoldingPeriod(purchaseDate, referenceDate);

      expect(result).toBe('long');
    });

    it('should return "long" for 367 days', () => {
      const referenceDate = addDays(purchaseDate, 367);

      const result = calculateHoldingPeriod(purchaseDate, referenceDate);

      expect(result).toBe('long');
    });

    it('should return "long" for 400 days', () => {
      const referenceDate = addDays(purchaseDate, 400);

      const result = calculateHoldingPeriod(purchaseDate, referenceDate);

      expect(result).toBe('long');
    });

    it('should return "long" for 2 years (730 days)', () => {
      const referenceDate = addDays(purchaseDate, 730);

      const result = calculateHoldingPeriod(purchaseDate, referenceDate);

      expect(result).toBe('long');
    });

    it('should return "long" for non-leap year after 1 year anniversary', () => {
      const purchase = new Date('2023-01-01');
      const oneYearOneDayLater = new Date('2024-01-02'); // 366 days

      const result = calculateHoldingPeriod(purchase, oneYearOneDayLater);

      expect(result).toBe('long');
    });
  });

  describe('input validation', () => {
    it('should throw error when purchaseDate is not a valid Date', () => {
      const invalidDate = new Date('invalid');
      const validDate = new Date('2024-01-01');

      expect(() => calculateHoldingPeriod(invalidDate, validDate)).toThrow(
        'Invalid purchase date provided'
      );
    });

    it('should throw error when referenceDate is not a valid Date', () => {
      const validDate = new Date('2024-01-01');
      const invalidDate = new Date('invalid');

      expect(() => calculateHoldingPeriod(validDate, invalidDate)).toThrow(
        'Invalid reference date provided'
      );
    });

    it('should throw error when referenceDate is before purchaseDate', () => {
      const purchase = new Date('2024-06-01');
      const beforePurchase = new Date('2024-01-01');

      expect(() => calculateHoldingPeriod(purchase, beforePurchase)).toThrow(
        'Reference date cannot be before purchase date'
      );
    });
  });
});

describe('calculateHoldingDays', () => {
  const purchaseDate = new Date('2024-01-01');

  it('should return 0 for same-day purchase and reference', () => {
    const referenceDate = new Date('2024-01-01');

    const result = calculateHoldingDays(purchaseDate, referenceDate);

    expect(result).toBe(0);
  });

  it('should return 1 for next day', () => {
    const referenceDate = new Date('2024-01-02');

    const result = calculateHoldingDays(purchaseDate, referenceDate);

    expect(result).toBe(1);
  });

  it('should return 30 for 30 days later', () => {
    const referenceDate = addDays(purchaseDate, 30);

    const result = calculateHoldingDays(purchaseDate, referenceDate);

    expect(result).toBe(30);
  });

  it('should return 365 for 1 year anniversary (non-leap year)', () => {
    const purchase = new Date('2023-01-01');
    const oneYearLater = new Date('2024-01-01');

    const result = calculateHoldingDays(purchase, oneYearLater);

    expect(result).toBe(365);
  });

  it('should return 365 for 1 year anniversary in leap year', () => {
    const purchase = new Date('2024-01-01');
    const oneYearLater = new Date('2024-12-31'); // Leap year 2024

    const result = calculateHoldingDays(purchase, oneYearLater);

    expect(result).toBe(365);
  });

  it('should return 366 for day after 1 year anniversary', () => {
    const purchase = new Date('2023-01-01');
    const dayAfterAnniversary = new Date('2024-01-02');

    const result = calculateHoldingDays(purchase, dayAfterAnniversary);

    expect(result).toBe(366);
  });

  it('should return 730 for 2 years', () => {
    const referenceDate = addDays(purchaseDate, 730);

    const result = calculateHoldingDays(purchaseDate, referenceDate);

    expect(result).toBe(730);
  });

  describe('input validation', () => {
    it('should throw error when purchaseDate is invalid', () => {
      const invalidDate = new Date('invalid');
      const validDate = new Date('2024-01-01');

      expect(() => calculateHoldingDays(invalidDate, validDate)).toThrow(
        'Invalid purchase date provided'
      );
    });

    it('should throw error when referenceDate is invalid', () => {
      const validDate = new Date('2024-01-01');
      const invalidDate = new Date('invalid');

      expect(() => calculateHoldingDays(validDate, invalidDate)).toThrow(
        'Invalid reference date provided'
      );
    });
  });
});

describe('getHoldingPeriodThreshold', () => {
  it('should return purchase date + 366 days', () => {
    const purchaseDate = new Date('2024-01-01');
    // 2024 is a leap year (366 days total), so +366 days = 2025-01-01
    const expectedThreshold = addDays(purchaseDate, 366);

    const result = getHoldingPeriodThreshold(purchaseDate);

    expect(result).toEqual(expectedThreshold);
  });

  it('should return correct threshold for non-leap year', () => {
    const purchaseDate = new Date('2023-01-01');
    const expectedThreshold = new Date('2024-01-02'); // 366 days later

    const result = getHoldingPeriodThreshold(purchaseDate);

    expect(result).toEqual(expectedThreshold);
  });

  it('should return correct threshold for leap year purchase', () => {
    const purchaseDate = new Date('2024-02-29'); // Leap day
    const expectedThreshold = addDays(purchaseDate, 366);

    const result = getHoldingPeriodThreshold(purchaseDate);

    expect(result).toEqual(expectedThreshold);
  });

  it('should return date where lot becomes long-term', () => {
    const purchaseDate = new Date('2024-01-01');
    const threshold = getHoldingPeriodThreshold(purchaseDate);

    // Threshold date should be long-term
    const resultOnThreshold = calculateHoldingPeriod(purchaseDate, threshold);
    expect(resultOnThreshold).toBe('long');

    // Day before threshold should be short-term
    const dayBefore = addDays(threshold, -1);
    const resultDayBefore = calculateHoldingPeriod(purchaseDate, dayBefore);
    expect(resultDayBefore).toBe('short');
  });

  it('should handle purchase at end of year', () => {
    const purchaseDate = new Date('2023-12-31');
    const expectedThreshold = addDays(purchaseDate, 366);

    const result = getHoldingPeriodThreshold(purchaseDate);

    expect(result).toEqual(expectedThreshold);
  });

  it('should handle purchase at beginning of year', () => {
    const purchaseDate = new Date('2024-01-01');
    const expectedThreshold = addDays(purchaseDate, 366);

    const result = getHoldingPeriodThreshold(purchaseDate);

    expect(result).toEqual(expectedThreshold);
  });

  describe('input validation', () => {
    it('should throw error when purchaseDate is invalid', () => {
      const invalidDate = new Date('invalid');

      expect(() => getHoldingPeriodThreshold(invalidDate)).toThrow(
        'Invalid purchase date provided'
      );
    });
  });
});

describe('integration: holding period edge cases', () => {
  it('should classify lot at exactly 365 days as short-term', () => {
    const purchase = new Date('2024-01-01');
    const day365 = addDays(purchase, 365);

    const period = calculateHoldingPeriod(purchase, day365);
    const days = calculateHoldingDays(purchase, day365);

    expect(period).toBe('short');
    expect(days).toBe(365);
  });

  it('should classify lot at exactly 366 days as long-term', () => {
    const purchase = new Date('2024-01-01');
    const day366 = addDays(purchase, 366);

    const period = calculateHoldingPeriod(purchase, day366);
    const days = calculateHoldingDays(purchase, day366);

    expect(period).toBe('long');
    expect(days).toBe(366);
  });

  it('should handle aging lot within 30-day window', () => {
    const purchase = new Date('2024-01-01');
    const threshold = getHoldingPeriodThreshold(purchase); // 2025-01-02

    // 20 days before threshold (still short-term, but aging)
    const agingDate = addDays(threshold, -20); // 2024-12-13

    const period = calculateHoldingPeriod(purchase, agingDate);
    const daysHeld = calculateHoldingDays(purchase, agingDate);
    const daysUntilLT = calculateHoldingDays(agingDate, threshold);

    expect(period).toBe('short');
    expect(daysHeld).toBe(346); // 365 - 20 + 1
    expect(daysUntilLT).toBe(20);
  });

  it('should handle lot just crossing long-term threshold', () => {
    const purchase = new Date('2024-06-15');
    const threshold = getHoldingPeriodThreshold(purchase);

    // Day of threshold
    const periodOnThreshold = calculateHoldingPeriod(purchase, threshold);
    expect(periodOnThreshold).toBe('long');

    // Day before
    const dayBefore = addDays(threshold, -1);
    const periodDayBefore = calculateHoldingPeriod(purchase, dayBefore);
    expect(periodDayBefore).toBe('short');

    // Day after
    const dayAfter = addDays(threshold, 1);
    const periodDayAfter = calculateHoldingPeriod(purchase, dayAfter);
    expect(periodDayAfter).toBe('long');
  });
});
