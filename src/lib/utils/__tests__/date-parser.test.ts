/**
 * Date Parser Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseDate,
  detectDateFormat,
  isAmbiguousDateFormat,
  formatToIso,
  formatForDisplay,
  validateTransactionDate,
} from '../date-parser';

describe('parseDate', () => {
  describe('ISO 8601 formats', () => {
    it('parses yyyy-MM-dd format', () => {
      const result = parseDate('2025-01-15');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0); // January is 0
      expect(result?.getDate()).toBe(15);
    });

    it('parses yyyy/MM/dd format', () => {
      const result = parseDate('2025/01/15');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });
  });

  describe('US formats', () => {
    it('parses MM/dd/yyyy format', () => {
      const result = parseDate('01/15/2025');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('parses M/d/yyyy format', () => {
      const result = parseDate('1/5/2025');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(5);
    });

    it('parses MM-dd-yyyy format', () => {
      const result = parseDate('01-15-2025');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2025);
    });
  });

  describe('Written formats', () => {
    it('parses "January 15, 2025" format', () => {
      const result = parseDate('January 15, 2025');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('parses "Jan 15, 2025" format', () => {
      const result = parseDate('Jan 15, 2025');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });
  });

  describe('Edge cases', () => {
    it('returns null for empty string', () => {
      expect(parseDate('')).toBeNull();
    });

    it('returns null for null input', () => {
      expect(parseDate(null as any)).toBeNull();
    });

    it('returns null for invalid date string', () => {
      expect(parseDate('not-a-date')).toBeNull();
    });

    it('trims whitespace', () => {
      const result = parseDate('  2025-01-15  ');
      expect(result).not.toBeNull();
      expect(result?.getFullYear()).toBe(2025);
    });

    it('rejects dates before 1900', () => {
      expect(parseDate('1800-01-01')).toBeNull();
    });

    it('rejects dates after 2100', () => {
      expect(parseDate('2150-01-01')).toBeNull();
    });
  });
});

describe('detectDateFormat', () => {
  it('detects ISO format', () => {
    const values = ['2025-01-15', '2025-02-20', '2025-03-25'];
    expect(detectDateFormat(values)).toBe('yyyy-MM-dd');
  });

  it('detects US format', () => {
    const values = ['01/15/2025', '02/20/2025', '03/25/2025'];
    expect(detectDateFormat(values)).toBe('MM/dd/yyyy');
  });

  it('returns null for empty array', () => {
    expect(detectDateFormat([])).toBeNull();
  });

  it('returns null for unparseable values', () => {
    const values = ['not-a-date', 'also-not-a-date'];
    expect(detectDateFormat(values)).toBeNull();
  });
});

describe('isAmbiguousDateFormat', () => {
  it('returns true for ambiguous MM/DD or DD/MM dates', () => {
    const values = ['01/05/2025', '02/03/2025'];
    expect(isAmbiguousDateFormat(values)).toBe(true);
  });

  it('returns false when day > 12 indicates DD/MM', () => {
    const values = ['15/01/2025', '20/02/2025'];
    expect(isAmbiguousDateFormat(values)).toBe(false);
  });

  it('returns false when second number > 12 indicates MM/DD', () => {
    const values = ['01/15/2025', '02/20/2025'];
    expect(isAmbiguousDateFormat(values)).toBe(false);
  });

  it('returns false for ISO format', () => {
    const values = ['2025-01-15', '2025-02-20'];
    expect(isAmbiguousDateFormat(values)).toBe(false);
  });
});

describe('formatToIso', () => {
  it('formats date to ISO string', () => {
    const date = new Date(2025, 0, 15); // January 15, 2025
    expect(formatToIso(date)).toBe('2025-01-15');
  });
});

describe('formatForDisplay', () => {
  it('formats date for user display', () => {
    const date = new Date(2025, 0, 15);
    expect(formatForDisplay(date)).toBe('Jan 15, 2025');
  });
});

describe('validateTransactionDate', () => {
  it('accepts valid past dates', () => {
    const pastDate = new Date(2024, 5, 15);
    const result = validateTransactionDate(pastDate);
    expect(result.isValid).toBe(true);
    expect(result.warning).toBeUndefined();
  });

  it('accepts future dates with warning', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const result = validateTransactionDate(futureDate);
    expect(result.isValid).toBe(true);
    expect(result.warning).toBe('Date is in the future');
  });

  it('rejects dates before 1950', () => {
    const oldDate = new Date(1940, 0, 1);
    const result = validateTransactionDate(oldDate);
    expect(result.isValid).toBe(false);
  });
});
