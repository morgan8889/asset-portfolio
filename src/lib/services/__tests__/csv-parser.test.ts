/**
 * CSV Parser Service Unit Tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseCsvString,
  generateCsv,
  getPreviewData,
  validateCsvStructure,
} from '../csv-parser';
import type { CsvParserResult } from '@/types/csv-import';

describe('parseCsvString', () => {
  it('parses basic CSV with headers', () => {
    const csv = `Date,Symbol,Quantity,Price
2025-01-15,AAPL,10,150.00
2025-01-16,GOOGL,5,175.50`;

    const result = parseCsvString(csv);

    expect(result.headers).toEqual(['Date', 'Symbol', 'Quantity', 'Price']);
    expect(result.rowCount).toBe(2);
    expect(result.rows[0]).toEqual({
      Date: '2025-01-15',
      Symbol: 'AAPL',
      Quantity: '10',
      Price: '150.00',
    });
  });

  it('auto-detects comma delimiter', () => {
    const csv = `Date,Symbol,Quantity
2025-01-15,AAPL,10`;

    const result = parseCsvString(csv);
    expect(result.delimiter).toBe(',');
  });

  it('auto-detects semicolon delimiter', () => {
    const csv = `Date;Symbol;Quantity
2025-01-15;AAPL;10`;

    const result = parseCsvString(csv);
    expect(result.delimiter).toBe(';');
  });

  it('auto-detects tab delimiter', () => {
    const csv = `Date\tSymbol\tQuantity
2025-01-15\tAAPL\t10`;

    const result = parseCsvString(csv);
    expect(result.delimiter).toBe('\t');
  });

  it('trims header whitespace', () => {
    const csv = `  Date  ,  Symbol  ,  Quantity
2025-01-15,AAPL,10`;

    const result = parseCsvString(csv);
    expect(result.headers).toEqual(['Date', 'Symbol', 'Quantity']);
  });

  it('skips empty lines', () => {
    const csv = `Date,Symbol,Quantity

2025-01-15,AAPL,10

2025-01-16,GOOGL,5`;

    const result = parseCsvString(csv);
    expect(result.rowCount).toBe(2);
  });

  it('handles quoted fields with commas', () => {
    const csv = `Date,Symbol,Notes
2025-01-15,AAPL,"Note with, comma"`;

    const result = parseCsvString(csv);
    expect(result.rows[0].Notes).toBe('Note with, comma');
  });

  it('throws error for empty CSV', () => {
    expect(() => parseCsvString('')).toThrow();
  });

  it('throws error for CSV with only headers', () => {
    const csv = 'Date,Symbol,Quantity';
    expect(() => parseCsvString(csv)).toThrow('no data rows');
  });
});

describe('generateCsv', () => {
  it('generates CSV from array of objects', () => {
    const data = [
      { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10' },
      { Date: '2025-01-16', Symbol: 'GOOGL', Quantity: '5' },
    ];

    const csv = generateCsv(data);

    expect(csv).toContain('Date,Symbol,Quantity');
    expect(csv).toContain('2025-01-15,AAPL,10');
    expect(csv).toContain('2025-01-16,GOOGL,5');
  });

  it('respects column order when specified', () => {
    const data = [{ Symbol: 'AAPL', Date: '2025-01-15', Quantity: '10' }];

    const csv = generateCsv(data, ['Date', 'Symbol', 'Quantity']);

    const lines = csv.split(/\r?\n/);
    expect(lines[0]).toBe('Date,Symbol,Quantity');
  });

  it('returns empty string for empty array', () => {
    expect(generateCsv([])).toBe('');
  });

  it('handles values with special characters', () => {
    const data = [{ Notes: 'Quote "test"', Symbol: 'AAPL' }];

    const csv = generateCsv(data);
    expect(csv).toContain('AAPL');
  });
});

describe('getPreviewData', () => {
  it('returns first N rows', () => {
    const result: CsvParserResult = {
      headers: ['Date', 'Symbol'],
      rows: [
        { Date: '2025-01-01', Symbol: 'AAPL' },
        { Date: '2025-01-02', Symbol: 'GOOGL' },
        { Date: '2025-01-03', Symbol: 'MSFT' },
        { Date: '2025-01-04', Symbol: 'AMZN' },
        { Date: '2025-01-05', Symbol: 'META' },
      ],
      delimiter: ',',
      rowCount: 5,
    };

    const preview = getPreviewData(result, 3);

    expect(preview.rowCount).toBe(3);
    expect(preview.rows.length).toBe(3);
    expect(preview.rows[0].Symbol).toBe('AAPL');
    expect(preview.rows[2].Symbol).toBe('MSFT');
  });

  it('returns all rows if less than maxRows', () => {
    const result: CsvParserResult = {
      headers: ['Date', 'Symbol'],
      rows: [
        { Date: '2025-01-01', Symbol: 'AAPL' },
        { Date: '2025-01-02', Symbol: 'GOOGL' },
      ],
      delimiter: ',',
      rowCount: 2,
    };

    const preview = getPreviewData(result, 10);

    expect(preview.rowCount).toBe(2);
    expect(preview.rows.length).toBe(2);
  });

  it('defaults to 10 rows', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      Date: `2025-01-${i + 1}`,
      Symbol: 'TEST',
    }));

    const result: CsvParserResult = {
      headers: ['Date', 'Symbol'],
      rows,
      delimiter: ',',
      rowCount: 20,
    };

    const preview = getPreviewData(result);

    expect(preview.rowCount).toBe(10);
    expect(preview.rows.length).toBe(10);
  });
});

describe('validateCsvStructure', () => {
  it('validates valid CSV structure', () => {
    const result: CsvParserResult = {
      headers: ['Date', 'Symbol', 'Quantity', 'Price'],
      rows: [
        { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150' },
      ],
      delimiter: ',',
      rowCount: 1,
    };

    const validation = validateCsvStructure(result);

    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('rejects CSV with too few columns', () => {
    const result: CsvParserResult = {
      headers: ['Date', 'Symbol'],
      rows: [{ Date: '2025-01-15', Symbol: 'AAPL' }],
      delimiter: ',',
      rowCount: 1,
    };

    const validation = validateCsvStructure(result);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain(
      'CSV must have at least 4 columns (date, symbol, quantity, price)'
    );
  });

  it('rejects CSV with no data rows', () => {
    const result: CsvParserResult = {
      headers: ['Date', 'Symbol', 'Quantity', 'Price'],
      rows: [],
      delimiter: ',',
      rowCount: 0,
    };

    const validation = validateCsvStructure(result);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('CSV has no data rows');
  });

  it('rejects CSV with empty headers', () => {
    const result: CsvParserResult = {
      headers: ['Date', '', 'Quantity', 'Price'],
      rows: [{ Date: '2025-01-15', '': 'AAPL', Quantity: '10', Price: '150' }],
      delimiter: ',',
      rowCount: 1,
    };

    const validation = validateCsvStructure(result);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('CSV contains empty column headers');
  });

  it('rejects CSV with duplicate headers', () => {
    const result: CsvParserResult = {
      headers: ['Date', 'Symbol', 'Symbol', 'Price'],
      rows: [{ Date: '2025-01-15', Symbol: 'AAPL', Price: '150' }],
      delimiter: ',',
      rowCount: 1,
    };

    const validation = validateCsvStructure(result);

    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain(
      'CSV contains duplicate column headers'
    );
  });
});
