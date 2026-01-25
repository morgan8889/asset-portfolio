/**
 * CSV Validator Service Unit Tests
 */

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  validateRows,
  validateRow,
  parseNumericValue,
  mapTransactionType,
  getValidationSummary,
  groupErrorsByField,
} from '../csv-validator';
import type { ColumnMapping } from '@/types/csv-import';

// Helper to create standard mappings
function createStandardMappings(): ColumnMapping[] {
  return [
    { csvColumn: 'Date', csvColumnIndex: 0, transactionField: 'date', confidence: 1, isUserOverride: false },
    { csvColumn: 'Symbol', csvColumnIndex: 1, transactionField: 'symbol', confidence: 1, isUserOverride: false },
    { csvColumn: 'Quantity', csvColumnIndex: 2, transactionField: 'quantity', confidence: 1, isUserOverride: false },
    { csvColumn: 'Price', csvColumnIndex: 3, transactionField: 'price', confidence: 1, isUserOverride: false },
    { csvColumn: 'Type', csvColumnIndex: 4, transactionField: 'type', confidence: 1, isUserOverride: false },
    { csvColumn: 'Fees', csvColumnIndex: 5, transactionField: 'fees', confidence: 1, isUserOverride: false },
    { csvColumn: 'Notes', csvColumnIndex: 6, transactionField: 'notes', confidence: 1, isUserOverride: false },
  ];
}

describe('validateRows', () => {
  it('validates all rows and returns results', () => {
    const rows = [
      { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: 'buy', Fees: '5', Notes: '' },
      { Date: '2025-01-16', Symbol: 'GOOGL', Quantity: '5', Price: '175.50', Type: 'buy', Fees: '0', Notes: 'Test' },
    ];
    const mappings = createStandardMappings();

    const result = validateRows(rows, mappings);

    expect(result.validCount).toBe(2);
    expect(result.errorCount).toBe(0);
    expect(result.valid.length).toBe(2);
    expect(result.errors.length).toBe(0);
  });

  it('separates valid and invalid rows', () => {
    const rows = [
      { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: 'buy', Fees: '', Notes: '' },
      { Date: 'invalid-date', Symbol: 'GOOGL', Quantity: '5', Price: '175.50', Type: 'buy', Fees: '', Notes: '' },
    ];
    const mappings = createStandardMappings();

    const result = validateRows(rows, mappings);

    expect(result.validCount).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.valid[0].parsed.symbol).toBe('AAPL');
    expect(result.errors[0].field).toBe('date');
  });

  it('includes correct row numbers in results', () => {
    const rows = [
      { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: '' },
      { Date: '2025-01-16', Symbol: 'GOOGL', Quantity: '5', Price: '175.50', Type: '', Fees: '', Notes: '' },
    ];
    const mappings = createStandardMappings();

    const result = validateRows(rows, mappings);

    // Row numbers are +2 (1 for header, 1 for 0-index)
    expect(result.valid[0].rowNumber).toBe(2);
    expect(result.valid[1].rowNumber).toBe(3);
  });
});

describe('validateRow', () => {
  const mappings = createStandardMappings();

  describe('date validation', () => {
    it('validates valid date', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.isValid).toBe(true);
      expect(result.parsed.date).toBeInstanceOf(Date);
    });

    it('rejects empty date', () => {
      const row = { Date: '', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'date')).toBe(true);
    });

    it('rejects invalid date format', () => {
      const row = { Date: 'not-a-date', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'date')).toBe(true);
    });
  });

  describe('symbol validation', () => {
    it('validates valid symbol', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.symbol).toBe('AAPL');
    });

    it('converts symbol to uppercase', () => {
      const row = { Date: '2025-01-15', Symbol: 'aapl', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.symbol).toBe('AAPL');
    });

    it('rejects empty symbol', () => {
      const row = { Date: '2025-01-15', Symbol: '', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'symbol')).toBe(true);
    });

    it('rejects symbol with invalid characters', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL$%', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'symbol')).toBe(true);
    });
  });

  describe('quantity validation', () => {
    it('validates positive quantity', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.quantity?.toString()).toBe('10');
    });

    it('validates negative quantity (for sells)', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '-10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.isValid).toBe(true);
      expect(result.parsed.quantity?.toString()).toBe('-10');
    });

    it('validates decimal quantity', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10.5', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.quantity?.toString()).toBe('10.5');
    });

    it('rejects zero quantity', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '0', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'quantity')).toBe(true);
    });

    it('rejects non-numeric quantity', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: 'ten', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'quantity')).toBe(true);
    });
  });

  describe('price validation', () => {
    it('validates valid price', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.price?.toString()).toBe('150');
    });

    it('accepts zero price (for some transaction types)', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '0', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.isValid).toBe(true);
      expect(result.parsed.price?.toString()).toBe('0');
    });

    it('rejects negative price', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '-150', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'price')).toBe(true);
    });
  });

  describe('type inference', () => {
    it('maps buy type', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: 'Buy', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.type).toBe('buy');
    });

    it('maps sell type', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: 'Sell', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.type).toBe('sell');
    });

    it('infers buy from positive quantity when type is missing', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.type).toBe('buy');
    });

    it('infers sell from negative quantity when type is missing', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '-10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.type).toBe('sell');
    });
  });

  describe('fees validation', () => {
    it('validates valid fees', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: '5.99', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.fees?.toString()).toBe('5.99');
    });

    it('defaults to zero when fees is empty', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.fees?.toString()).toBe('0');
    });

    it('defaults to zero for invalid fees (non-blocking)', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: 'invalid', Notes: '' };
      const result = validateRow(row, mappings, 2);

      expect(result.isValid).toBe(true); // Fees errors are non-blocking
      expect(result.parsed.fees?.toString()).toBe('0');
    });
  });

  describe('notes handling', () => {
    it('preserves notes content', () => {
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: 'Test note' };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.notes).toBe('Test note');
    });

    it('truncates long notes', () => {
      const longNote = 'A'.repeat(1500);
      const row = { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: '', Fees: '', Notes: longNote };
      const result = validateRow(row, mappings, 2);

      expect(result.parsed.notes?.length).toBe(1000);
    });
  });
});

describe('parseNumericValue', () => {
  it('parses simple numbers', () => {
    expect(parseNumericValue('100')?.toString()).toBe('100');
    expect(parseNumericValue('100.50')?.toString()).toBe('100.5');
  });

  it('parses negative numbers', () => {
    expect(parseNumericValue('-100')?.toString()).toBe('-100');
  });

  it('removes currency symbols', () => {
    expect(parseNumericValue('$100')?.toString()).toBe('100');
    expect(parseNumericValue('€100')?.toString()).toBe('100');
    expect(parseNumericValue('£100')?.toString()).toBe('100');
  });

  it('removes commas', () => {
    expect(parseNumericValue('1,000')?.toString()).toBe('1000');
    expect(parseNumericValue('1,000,000.50')?.toString()).toBe('1000000.5');
  });

  it('handles parentheses as negative', () => {
    expect(parseNumericValue('(100)')?.toString()).toBe('-100');
  });

  it('returns null for invalid values', () => {
    expect(parseNumericValue('not a number')).toBeNull();
    expect(parseNumericValue('')).toBeNull();
    expect(parseNumericValue(null as any)).toBeNull();
  });
});

describe('mapTransactionType', () => {
  it('maps buy keywords', () => {
    expect(mapTransactionType('buy')).toBe('buy');
    expect(mapTransactionType('Buy')).toBe('buy');
    expect(mapTransactionType('BUY')).toBe('buy');
    expect(mapTransactionType('bought')).toBe('buy');
    expect(mapTransactionType('purchase')).toBe('buy');
  });

  it('maps sell keywords', () => {
    expect(mapTransactionType('sell')).toBe('sell');
    expect(mapTransactionType('sold')).toBe('sell');
    expect(mapTransactionType('sale')).toBe('sell');
  });

  it('maps dividend keywords', () => {
    expect(mapTransactionType('dividend')).toBe('dividend');
    expect(mapTransactionType('div')).toBe('dividend');
    expect(mapTransactionType('distribution')).toBe('dividend');
  });

  it('maps reinvestment keywords', () => {
    expect(mapTransactionType('reinvest')).toBe('reinvestment');
    expect(mapTransactionType('reinvestment')).toBe('reinvestment');
    expect(mapTransactionType('drip')).toBe('reinvestment');
  });

  it('maps transfer keywords', () => {
    expect(mapTransactionType('transfer in')).toBe('transfer_in');
    expect(mapTransactionType('transfer out')).toBe('transfer_out');
    expect(mapTransactionType('deposit')).toBe('transfer_in');
  });

  it('returns null for unknown types', () => {
    expect(mapTransactionType('unknown')).toBeNull();
    expect(mapTransactionType('')).toBeNull();
  });
});

describe('getValidationSummary', () => {
  it('returns success message when all rows valid', () => {
    const result = { valid: [], errors: [], validCount: 10, errorCount: 0 };
    const summary = getValidationSummary(result);

    expect(summary).toContain('All 10 rows are valid');
  });

  it('returns mixed message when some errors', () => {
    const result = { valid: [], errors: [], validCount: 8, errorCount: 2 };
    const summary = getValidationSummary(result);

    expect(summary).toContain('8 of 10 rows are valid');
    expect(summary).toContain('2 rows have errors');
  });
});

describe('groupErrorsByField', () => {
  it('groups errors by field type', () => {
    const errors = [
      { rowNumber: 2, originalData: {}, field: 'date' as const, value: '', message: '', severity: 'error' as const },
      { rowNumber: 3, originalData: {}, field: 'date' as const, value: '', message: '', severity: 'error' as const },
      { rowNumber: 4, originalData: {}, field: 'symbol' as const, value: '', message: '', severity: 'error' as const },
    ];

    const grouped = groupErrorsByField(errors);

    expect(grouped.date.length).toBe(2);
    expect(grouped.symbol.length).toBe(1);
    expect(grouped.quantity.length).toBe(0);
  });
});

describe('Error Reporting', () => {
  const mappings = createStandardMappings();

  it('includes original row data in errors for debugging', () => {
    const rows = [
      { Date: 'bad-date', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: 'buy', Fees: '', Notes: '' },
    ];

    const result = validateRows(rows, mappings);

    expect(result.errors.length).toBe(1);
    expect(result.errors[0].originalData).toEqual(rows[0]);
    expect(result.errors[0].value).toBe('bad-date');
  });

  it('provides clear error messages for each validation failure', () => {
    const rows = [
      { Date: '', Symbol: '', Quantity: 'invalid', Price: '-100', Type: 'buy', Fees: '', Notes: '' },
    ];

    const result = validateRows(rows, mappings);

    // Should have multiple errors
    expect(result.errors.length).toBeGreaterThan(0);

    // Each error should have a meaningful message
    result.errors.forEach(error => {
      expect(error.message).toBeTruthy();
      expect(error.message.length).toBeGreaterThan(0);
    });
  });

  it('correctly assigns error severity', () => {
    const rows = [
      { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: 'buy', Fees: 'invalid', Notes: '' },
    ];

    const result = validateRows(rows, mappings);

    // Fees errors should be warnings, not blocking errors
    // The row should still be valid because fees errors are non-blocking
    expect(result.validCount).toBe(1);
  });

  it('accumulates multiple errors for a single row', () => {
    const rows = [
      { Date: 'bad-date', Symbol: '', Quantity: '', Price: '', Type: 'buy', Fees: '', Notes: '' },
    ];

    const result = validateRows(rows, mappings);

    // Single row with multiple field errors
    expect(result.errors.length).toBeGreaterThan(1);
    expect(result.errors.every(e => e.rowNumber === 2)).toBe(true);
  });

  it('preserves row ordering in error reports', () => {
    const rows = [
      { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: 'buy', Fees: '', Notes: '' },
      { Date: 'bad-date-2', Symbol: 'GOOGL', Quantity: '5', Price: '175.50', Type: 'buy', Fees: '', Notes: '' },
      { Date: '2025-01-17', Symbol: 'MSFT', Quantity: '20', Price: '380.25', Type: 'buy', Fees: '', Notes: '' },
      { Date: 'bad-date-4', Symbol: 'TSLA', Quantity: '15', Price: '250.00', Type: 'buy', Fees: '', Notes: '' },
    ];

    const result = validateRows(rows, mappings);

    expect(result.validCount).toBe(2);
    expect(result.errorCount).toBe(2);

    // Errors should be from rows 3 and 5 (1-indexed with header)
    const errorRows = result.errors.map(e => e.rowNumber);
    expect(errorRows).toContain(3);
    expect(errorRows).toContain(5);
  });

  it('handles large number of errors efficiently', () => {
    // Generate 100 rows with alternating valid/invalid
    const rows = Array.from({ length: 100 }, (_, i) => ({
      Date: i % 2 === 0 ? '2025-01-15' : 'bad-date',
      Symbol: 'AAPL',
      Quantity: '10',
      Price: '150.00',
      Type: 'buy',
      Fees: '',
      Notes: '',
    }));

    const result = validateRows(rows, mappings);

    expect(result.validCount).toBe(50);
    expect(result.errorCount).toBe(50);
    expect(result.errors.length).toBe(50);
  });
});
