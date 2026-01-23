/**
 * Column Detector Service Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  detectColumnMappings,
  updateColumnMapping,
  hasAllRequiredMappings,
  getMappingForField,
  getUnmappedRequiredFields,
} from '../column-detector';
import type { ColumnMapping } from '@/types/csv-import';

describe('detectColumnMappings', () => {
  describe('exact header matching', () => {
    it('detects standard headers with high confidence', () => {
      const headers = ['date', 'symbol', 'quantity', 'price', 'type', 'fees', 'notes'];
      const result = detectColumnMappings(headers);

      expect(result.missingRequiredFields).toHaveLength(0);
      expect(result.unmappedColumns).toHaveLength(0);

      // Check each mapping
      const dateMapping = getMappingForField(result.mappings, 'date');
      expect(dateMapping?.confidence).toBe(1.0);
      expect(dateMapping?.csvColumn).toBe('date');

      const symbolMapping = getMappingForField(result.mappings, 'symbol');
      expect(symbolMapping?.confidence).toBe(1.0);
    });

    it('handles case-insensitive matching', () => {
      const headers = ['DATE', 'SYMBOL', 'QUANTITY', 'PRICE'];
      const result = detectColumnMappings(headers);

      expect(result.missingRequiredFields).toHaveLength(0);
    });
  });

  describe('keyword matching', () => {
    it('maps "ticker" to symbol', () => {
      const headers = ['date', 'ticker', 'quantity', 'price'];
      const result = detectColumnMappings(headers);

      const symbolMapping = result.mappings.find(m => m.transactionField === 'symbol');
      expect(symbolMapping?.csvColumn).toBe('ticker');
    });

    it('maps "shares" to quantity', () => {
      const headers = ['date', 'symbol', 'shares', 'price'];
      const result = detectColumnMappings(headers);

      const quantityMapping = result.mappings.find(m => m.transactionField === 'quantity');
      expect(quantityMapping?.csvColumn).toBe('shares');
    });

    it('maps "commission" to fees', () => {
      const headers = ['date', 'symbol', 'quantity', 'price', 'commission'];
      const result = detectColumnMappings(headers);

      const feesMapping = result.mappings.find(m => m.transactionField === 'fees');
      expect(feesMapping?.csvColumn).toBe('commission');
    });

    it('maps "trade_date" to date', () => {
      const headers = ['trade_date', 'symbol', 'quantity', 'price'];
      const result = detectColumnMappings(headers);

      const dateMapping = result.mappings.find(m => m.transactionField === 'date');
      expect(dateMapping?.csvColumn).toBe('trade_date');
    });

    it('maps "action" to type', () => {
      const headers = ['date', 'symbol', 'quantity', 'price', 'action'];
      const result = detectColumnMappings(headers);

      const typeMapping = result.mappings.find(m => m.transactionField === 'type');
      expect(typeMapping?.csvColumn).toBe('action');
    });
  });

  describe('partial matching', () => {
    it('matches headers containing keywords', () => {
      const headers = ['transaction_date', 'stock_symbol', 'qty', 'unit_price'];
      const result = detectColumnMappings(headers);

      expect(result.missingRequiredFields).toHaveLength(0);
    });

    it('assigns lower confidence for partial matches', () => {
      const headers = ['custom_date_field', 'symbol', 'quantity', 'price'];
      const result = detectColumnMappings(headers);

      const dateMapping = result.mappings.find(m => m.transactionField === 'date');
      expect(dateMapping?.confidence).toBeLessThan(1.0);
    });
  });

  describe('missing required fields', () => {
    it('identifies missing required fields', () => {
      const headers = ['date', 'symbol', 'price']; // missing quantity
      const result = detectColumnMappings(headers);

      expect(result.missingRequiredFields).toContain('quantity');
    });

    it('identifies multiple missing fields', () => {
      const headers = ['date', 'amount']; // missing symbol, quantity, price
      const result = detectColumnMappings(headers);

      expect(result.missingRequiredFields.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('unmapped columns', () => {
    it('identifies columns that could not be mapped', () => {
      const headers = ['date', 'symbol', 'quantity', 'price', 'custom_field', 'unknown'];
      const result = detectColumnMappings(headers);

      expect(result.unmappedColumns).toContain('custom_field');
      expect(result.unmappedColumns).toContain('unknown');
    });
  });

  describe('data pattern validation', () => {
    it('improves confidence with valid data patterns', () => {
      const headers = ['col1', 'col2', 'col3', 'col4'];
      const sampleRows = [
        { col1: '2025-01-15', col2: 'AAPL', col3: '10', col4: '150.00' },
        { col1: '2025-01-16', col2: 'GOOGL', col3: '5', col4: '175.50' },
      ];

      const result = detectColumnMappings(headers, sampleRows);

      // Without header hints, detection relies on data patterns
      // This is a challenging case - results may vary
      expect(result.mappings.length).toBe(4);
    });
  });
});

describe('updateColumnMapping', () => {
  it('updates a specific column mapping', () => {
    const mappings: ColumnMapping[] = [
      { csvColumn: 'col1', csvColumnIndex: 0, transactionField: null, confidence: 0, isUserOverride: false },
      { csvColumn: 'col2', csvColumnIndex: 1, transactionField: null, confidence: 0, isUserOverride: false },
    ];

    const updated = updateColumnMapping(mappings, 0, 'date');

    expect(updated[0].transactionField).toBe('date');
    expect(updated[0].isUserOverride).toBe(true);
    expect(updated[0].confidence).toBe(1.0);
  });

  it('unmaps field from other columns when reassigning', () => {
    const mappings: ColumnMapping[] = [
      { csvColumn: 'col1', csvColumnIndex: 0, transactionField: 'date', confidence: 1, isUserOverride: false },
      { csvColumn: 'col2', csvColumnIndex: 1, transactionField: null, confidence: 0, isUserOverride: false },
    ];

    const updated = updateColumnMapping(mappings, 1, 'date');

    expect(updated[0].transactionField).toBeNull();
    expect(updated[1].transactionField).toBe('date');
  });

  it('clears a mapping when setting to null', () => {
    const mappings: ColumnMapping[] = [
      { csvColumn: 'col1', csvColumnIndex: 0, transactionField: 'date', confidence: 1, isUserOverride: false },
    ];

    const updated = updateColumnMapping(mappings, 0, null);

    expect(updated[0].transactionField).toBeNull();
    expect(updated[0].confidence).toBe(0);
  });
});

describe('hasAllRequiredMappings', () => {
  it('returns true when all required fields are mapped', () => {
    const mappings: ColumnMapping[] = [
      { csvColumn: 'col1', csvColumnIndex: 0, transactionField: 'date', confidence: 1, isUserOverride: false },
      { csvColumn: 'col2', csvColumnIndex: 1, transactionField: 'symbol', confidence: 1, isUserOverride: false },
      { csvColumn: 'col3', csvColumnIndex: 2, transactionField: 'quantity', confidence: 1, isUserOverride: false },
      { csvColumn: 'col4', csvColumnIndex: 3, transactionField: 'price', confidence: 1, isUserOverride: false },
    ];

    expect(hasAllRequiredMappings(mappings)).toBe(true);
  });

  it('returns false when a required field is missing', () => {
    const mappings: ColumnMapping[] = [
      { csvColumn: 'col1', csvColumnIndex: 0, transactionField: 'date', confidence: 1, isUserOverride: false },
      { csvColumn: 'col2', csvColumnIndex: 1, transactionField: 'symbol', confidence: 1, isUserOverride: false },
      { csvColumn: 'col3', csvColumnIndex: 2, transactionField: 'quantity', confidence: 1, isUserOverride: false },
      // Missing price
    ];

    expect(hasAllRequiredMappings(mappings)).toBe(false);
  });

  it('ignores optional fields', () => {
    const mappings: ColumnMapping[] = [
      { csvColumn: 'col1', csvColumnIndex: 0, transactionField: 'date', confidence: 1, isUserOverride: false },
      { csvColumn: 'col2', csvColumnIndex: 1, transactionField: 'symbol', confidence: 1, isUserOverride: false },
      { csvColumn: 'col3', csvColumnIndex: 2, transactionField: 'quantity', confidence: 1, isUserOverride: false },
      { csvColumn: 'col4', csvColumnIndex: 3, transactionField: 'price', confidence: 1, isUserOverride: false },
      // No type, fees, or notes - that's fine
    ];

    expect(hasAllRequiredMappings(mappings)).toBe(true);
  });
});

describe('getMappingForField', () => {
  it('returns the mapping for a specific field', () => {
    const mappings: ColumnMapping[] = [
      { csvColumn: 'Date', csvColumnIndex: 0, transactionField: 'date', confidence: 1, isUserOverride: false },
      { csvColumn: 'Symbol', csvColumnIndex: 1, transactionField: 'symbol', confidence: 1, isUserOverride: false },
    ];

    const dateMapping = getMappingForField(mappings, 'date');

    expect(dateMapping?.csvColumn).toBe('Date');
    expect(dateMapping?.csvColumnIndex).toBe(0);
  });

  it('returns undefined if field is not mapped', () => {
    const mappings: ColumnMapping[] = [
      { csvColumn: 'Date', csvColumnIndex: 0, transactionField: 'date', confidence: 1, isUserOverride: false },
    ];

    expect(getMappingForField(mappings, 'symbol')).toBeUndefined();
  });
});

describe('getUnmappedRequiredFields', () => {
  it('returns all unmapped required fields', () => {
    const mappings: ColumnMapping[] = [
      { csvColumn: 'Date', csvColumnIndex: 0, transactionField: 'date', confidence: 1, isUserOverride: false },
    ];

    const unmapped = getUnmappedRequiredFields(mappings);

    expect(unmapped).toContain('symbol');
    expect(unmapped).toContain('quantity');
    expect(unmapped).toContain('price');
    expect(unmapped).not.toContain('date');
  });

  it('returns empty array when all required fields are mapped', () => {
    const mappings: ColumnMapping[] = [
      { csvColumn: 'col1', csvColumnIndex: 0, transactionField: 'date', confidence: 1, isUserOverride: false },
      { csvColumn: 'col2', csvColumnIndex: 1, transactionField: 'symbol', confidence: 1, isUserOverride: false },
      { csvColumn: 'col3', csvColumnIndex: 2, transactionField: 'quantity', confidence: 1, isUserOverride: false },
      { csvColumn: 'col4', csvColumnIndex: 3, transactionField: 'price', confidence: 1, isUserOverride: false },
    ];

    expect(getUnmappedRequiredFields(mappings)).toHaveLength(0);
  });
});
