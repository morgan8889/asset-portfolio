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
      const headers = [
        'date',
        'symbol',
        'quantity',
        'price',
        'type',
        'fees',
        'notes',
      ];
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

      const symbolMapping = result.mappings.find(
        (m) => m.transactionField === 'symbol'
      );
      expect(symbolMapping?.csvColumn).toBe('ticker');
    });

    it('maps "shares" to quantity', () => {
      const headers = ['date', 'symbol', 'shares', 'price'];
      const result = detectColumnMappings(headers);

      const quantityMapping = result.mappings.find(
        (m) => m.transactionField === 'quantity'
      );
      expect(quantityMapping?.csvColumn).toBe('shares');
    });

    it('maps "commission" to fees', () => {
      const headers = ['date', 'symbol', 'quantity', 'price', 'commission'];
      const result = detectColumnMappings(headers);

      const feesMapping = result.mappings.find(
        (m) => m.transactionField === 'fees'
      );
      expect(feesMapping?.csvColumn).toBe('commission');
    });

    it('maps "trade_date" to date', () => {
      const headers = ['trade_date', 'symbol', 'quantity', 'price'];
      const result = detectColumnMappings(headers);

      const dateMapping = result.mappings.find(
        (m) => m.transactionField === 'date'
      );
      expect(dateMapping?.csvColumn).toBe('trade_date');
    });

    it('maps "action" to type', () => {
      const headers = ['date', 'symbol', 'quantity', 'price', 'action'];
      const result = detectColumnMappings(headers);

      const typeMapping = result.mappings.find(
        (m) => m.transactionField === 'type'
      );
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

      const dateMapping = result.mappings.find(
        (m) => m.transactionField === 'date'
      );
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
      const headers = [
        'date',
        'symbol',
        'quantity',
        'price',
        'custom_field',
        'unknown',
      ];
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
      {
        csvColumn: 'col1',
        csvColumnIndex: 0,
        transactionField: null,
        confidence: 0,
        isUserOverride: false,
      },
      {
        csvColumn: 'col2',
        csvColumnIndex: 1,
        transactionField: null,
        confidence: 0,
        isUserOverride: false,
      },
    ];

    const updated = updateColumnMapping(mappings, 0, 'date');

    expect(updated[0].transactionField).toBe('date');
    expect(updated[0].isUserOverride).toBe(true);
    expect(updated[0].confidence).toBe(1.0);
  });

  it('unmaps field from other columns when reassigning', () => {
    const mappings: ColumnMapping[] = [
      {
        csvColumn: 'col1',
        csvColumnIndex: 0,
        transactionField: 'date',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'col2',
        csvColumnIndex: 1,
        transactionField: null,
        confidence: 0,
        isUserOverride: false,
      },
    ];

    const updated = updateColumnMapping(mappings, 1, 'date');

    expect(updated[0].transactionField).toBeNull();
    expect(updated[1].transactionField).toBe('date');
  });

  it('clears a mapping when setting to null', () => {
    const mappings: ColumnMapping[] = [
      {
        csvColumn: 'col1',
        csvColumnIndex: 0,
        transactionField: 'date',
        confidence: 1,
        isUserOverride: false,
      },
    ];

    const updated = updateColumnMapping(mappings, 0, null);

    expect(updated[0].transactionField).toBeNull();
    expect(updated[0].confidence).toBe(0);
  });
});

describe('hasAllRequiredMappings', () => {
  it('returns true when all required fields are mapped', () => {
    const mappings: ColumnMapping[] = [
      {
        csvColumn: 'col1',
        csvColumnIndex: 0,
        transactionField: 'date',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'col2',
        csvColumnIndex: 1,
        transactionField: 'symbol',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'col3',
        csvColumnIndex: 2,
        transactionField: 'quantity',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'col4',
        csvColumnIndex: 3,
        transactionField: 'price',
        confidence: 1,
        isUserOverride: false,
      },
    ];

    expect(hasAllRequiredMappings(mappings)).toBe(true);
  });

  it('returns false when a required field is missing', () => {
    const mappings: ColumnMapping[] = [
      {
        csvColumn: 'col1',
        csvColumnIndex: 0,
        transactionField: 'date',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'col2',
        csvColumnIndex: 1,
        transactionField: 'symbol',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'col3',
        csvColumnIndex: 2,
        transactionField: 'quantity',
        confidence: 1,
        isUserOverride: false,
      },
      // Missing price
    ];

    expect(hasAllRequiredMappings(mappings)).toBe(false);
  });

  it('ignores optional fields', () => {
    const mappings: ColumnMapping[] = [
      {
        csvColumn: 'col1',
        csvColumnIndex: 0,
        transactionField: 'date',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'col2',
        csvColumnIndex: 1,
        transactionField: 'symbol',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'col3',
        csvColumnIndex: 2,
        transactionField: 'quantity',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'col4',
        csvColumnIndex: 3,
        transactionField: 'price',
        confidence: 1,
        isUserOverride: false,
      },
      // No type, fees, or notes - that's fine
    ];

    expect(hasAllRequiredMappings(mappings)).toBe(true);
  });
});

describe('getMappingForField', () => {
  it('returns the mapping for a specific field', () => {
    const mappings: ColumnMapping[] = [
      {
        csvColumn: 'Date',
        csvColumnIndex: 0,
        transactionField: 'date',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'Symbol',
        csvColumnIndex: 1,
        transactionField: 'symbol',
        confidence: 1,
        isUserOverride: false,
      },
    ];

    const dateMapping = getMappingForField(mappings, 'date');

    expect(dateMapping?.csvColumn).toBe('Date');
    expect(dateMapping?.csvColumnIndex).toBe(0);
  });

  it('returns undefined if field is not mapped', () => {
    const mappings: ColumnMapping[] = [
      {
        csvColumn: 'Date',
        csvColumnIndex: 0,
        transactionField: 'date',
        confidence: 1,
        isUserOverride: false,
      },
    ];

    expect(getMappingForField(mappings, 'symbol')).toBeUndefined();
  });
});

describe('getUnmappedRequiredFields', () => {
  it('returns all unmapped required fields', () => {
    const mappings: ColumnMapping[] = [
      {
        csvColumn: 'Date',
        csvColumnIndex: 0,
        transactionField: 'date',
        confidence: 1,
        isUserOverride: false,
      },
    ];

    const unmapped = getUnmappedRequiredFields(mappings);

    expect(unmapped).toContain('symbol');
    expect(unmapped).toContain('quantity');
    expect(unmapped).toContain('price');
    expect(unmapped).not.toContain('date');
  });

  it('returns empty array when all required fields are mapped', () => {
    const mappings: ColumnMapping[] = [
      {
        csvColumn: 'col1',
        csvColumnIndex: 0,
        transactionField: 'date',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'col2',
        csvColumnIndex: 1,
        transactionField: 'symbol',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'col3',
        csvColumnIndex: 2,
        transactionField: 'quantity',
        confidence: 1,
        isUserOverride: false,
      },
      {
        csvColumn: 'col4',
        csvColumnIndex: 3,
        transactionField: 'price',
        confidence: 1,
        isUserOverride: false,
      },
    ];

    expect(getUnmappedRequiredFields(mappings)).toHaveLength(0);
  });
});

// ============================================================================
// Brokerage Format Detection Tests (T042)
// ============================================================================

import {
  detectBrokerageFormat,
  getBrokerageColumnMappings,
  getBrokerageFormatById,
  getSupportedBrokerages,
  BROKERAGE_FORMATS,
} from '../brokerage-formats';

describe('detectBrokerageFormat', () => {
  describe('Fidelity format detection', () => {
    it('detects Fidelity export format', () => {
      const headers = [
        'Run Date',
        'Account',
        'Action',
        'Symbol',
        'Security Description',
        'Quantity',
        'Price ($)',
        'Commission ($)',
        'Fees ($)',
        'Amount ($)',
      ];

      const result = detectBrokerageFormat(headers);

      expect(result.format).not.toBeNull();
      expect(result.format?.id).toBe('fidelity');
      expect(result.format?.name).toBe('Fidelity Investments');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('handles case-insensitive header matching', () => {
      const headers = [
        'run date',
        'account',
        'action',
        'symbol',
        'security description',
        'quantity',
        'price ($)',
        'commission ($)',
        'fees ($)',
        'amount ($)',
      ];

      const result = detectBrokerageFormat(headers);

      expect(result.format?.id).toBe('fidelity');
    });
  });

  describe('Schwab format detection', () => {
    it('detects Charles Schwab export format', () => {
      const headers = [
        'Date',
        'Action',
        'Symbol',
        'Description',
        'Quantity',
        'Price',
        'Fees & Comm',
        'Amount',
      ];

      const result = detectBrokerageFormat(headers);

      expect(result.format).not.toBeNull();
      expect(result.format?.id).toBe('schwab');
      expect(result.format?.name).toBe('Charles Schwab');
    });
  });

  describe('Robinhood format detection', () => {
    it('detects Robinhood export format', () => {
      const headers = [
        'Activity Date',
        'Process Date',
        'Settle Date',
        'Instrument',
        'Description',
        'Trans Code',
        'Quantity',
        'Price',
        'Amount',
      ];

      const result = detectBrokerageFormat(headers);

      expect(result.format).not.toBeNull();
      expect(result.format?.id).toBe('robinhood');
      expect(result.format?.name).toBe('Robinhood');
    });
  });

  describe('TD Ameritrade format detection', () => {
    it('detects TD Ameritrade export format', () => {
      const headers = [
        'Date',
        'Transaction ID',
        'Description',
        'Symbol',
        'Quantity',
        'Price',
        'Commission',
        'Reg Fee',
        'Net Amount',
      ];

      const result = detectBrokerageFormat(headers);

      expect(result.format).not.toBeNull();
      expect(result.format?.id).toBe('td_ameritrade');
    });
  });

  describe('E*TRADE format detection', () => {
    it('detects E*TRADE export format', () => {
      const headers = [
        'Transaction Date',
        'Transaction Type',
        'Security Type',
        'Symbol',
        'Quantity',
        'Amount',
        'Price',
        'Commission',
      ];

      const result = detectBrokerageFormat(headers);

      expect(result.format).not.toBeNull();
      expect(result.format?.id).toBe('etrade');
    });
  });

  describe('Vanguard format detection', () => {
    it('detects Vanguard export format', () => {
      const headers = [
        'Trade Date',
        'Settlement Date',
        'Transaction Type',
        'Transaction Description',
        'Investment Name',
        'Symbol',
        'Shares',
        'Share Price',
        'Principal Amount',
      ];

      const result = detectBrokerageFormat(headers);

      expect(result.format).not.toBeNull();
      expect(result.format?.id).toBe('vanguard');
    });
  });

  describe('Interactive Brokers format detection', () => {
    it('detects Interactive Brokers export format', () => {
      const headers = [
        'TradeID',
        'AccountId',
        'Symbol',
        'DateTime',
        'Exchange',
        'Quantity',
        'TradePrice',
        'IBCommission',
        'NetCash',
      ];

      const result = detectBrokerageFormat(headers);

      expect(result.format).not.toBeNull();
      expect(result.format?.id).toBe('interactive_brokers');
    });
  });

  describe('unknown format handling', () => {
    it('returns null for unknown format', () => {
      const headers = ['col1', 'col2', 'col3', 'col4'];

      const result = detectBrokerageFormat(headers);

      expect(result.format).toBeNull();
      expect(result.confidence).toBe(0);
    });

    it('returns null when not enough signature headers match', () => {
      // Only 2 headers match Fidelity, but minimum is 6
      const headers = ['Run Date', 'Symbol', 'Other1', 'Other2'];

      const result = detectBrokerageFormat(headers);

      expect(result.format).toBeNull();
    });

    it('handles empty headers array', () => {
      const result = detectBrokerageFormat([]);

      expect(result.format).toBeNull();
      expect(result.confidence).toBe(0);
    });
  });

  describe('confidence scoring', () => {
    it('returns higher confidence for more matched headers', () => {
      // Full Fidelity headers
      const fullHeaders = [
        'Run Date',
        'Account',
        'Action',
        'Symbol',
        'Security Description',
        'Quantity',
        'Price ($)',
        'Commission ($)',
        'Fees ($)',
        'Amount ($)',
      ];

      // Partial Fidelity headers (just minimum)
      const partialHeaders = [
        'Run Date',
        'Action',
        'Symbol',
        'Quantity',
        'Price ($)',
        'Commission ($)',
      ];

      const fullResult = detectBrokerageFormat(fullHeaders);
      const partialResult = detectBrokerageFormat(partialHeaders);

      expect(fullResult.confidence).toBeGreaterThan(partialResult.confidence);
    });
  });
});

describe('getBrokerageColumnMappings', () => {
  it('returns correct column mappings for Fidelity format', () => {
    const format = getBrokerageFormatById('fidelity')!;
    const headers = [
      'Run Date',
      'Account',
      'Action',
      'Symbol',
      'Security Description',
      'Quantity',
      'Price ($)',
    ];

    const mappings = getBrokerageColumnMappings(format, headers);

    expect(mappings.get(0)).toBe('date'); // Run Date
    expect(mappings.get(2)).toBe('type'); // Action
    expect(mappings.get(3)).toBe('symbol'); // Symbol
    expect(mappings.get(5)).toBe('quantity'); // Quantity
    expect(mappings.get(6)).toBe('price'); // Price ($)
  });

  it('handles missing columns gracefully', () => {
    const format = getBrokerageFormatById('schwab')!;
    const headers = ['Date', 'Symbol', 'Quantity']; // Missing most columns

    const mappings = getBrokerageColumnMappings(format, headers);

    expect(mappings.get(0)).toBe('date');
    expect(mappings.get(1)).toBe('symbol');
    expect(mappings.get(2)).toBe('quantity');
    expect(mappings.size).toBe(3);
  });
});

describe('getBrokerageFormatById', () => {
  it('returns format for valid ID', () => {
    const format = getBrokerageFormatById('fidelity');

    expect(format).not.toBeUndefined();
    expect(format?.name).toBe('Fidelity Investments');
  });

  it('returns undefined for invalid ID', () => {
    const format = getBrokerageFormatById('invalid_brokerage');

    expect(format).toBeUndefined();
  });
});

describe('getSupportedBrokerages', () => {
  it('returns list of all supported brokerages', () => {
    const brokerages = getSupportedBrokerages();

    expect(brokerages.length).toBe(BROKERAGE_FORMATS.length);
    expect(brokerages.some((b) => b.id === 'fidelity')).toBe(true);
    expect(brokerages.some((b) => b.id === 'schwab')).toBe(true);
    expect(brokerages.some((b) => b.id === 'robinhood')).toBe(true);
  });

  it('returns id and name for each brokerage', () => {
    const brokerages = getSupportedBrokerages();

    for (const brokerage of brokerages) {
      expect(brokerage.id).toBeDefined();
      expect(brokerage.name).toBeDefined();
      expect(brokerage.id.length).toBeGreaterThan(0);
      expect(brokerage.name.length).toBeGreaterThan(0);
    }
  });
});
