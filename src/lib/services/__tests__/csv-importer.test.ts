/**
 * CSV Importer Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Decimal from 'decimal.js';
import {
  startImportSession,
  detectDuplicates,
  executeImport,
  revalidateWithMappings,
} from '../csv-importer';
import type { ParsedRow, DuplicateHandling, ColumnMapping, ImportSession } from '@/types/csv-import';

// Mock the database module
vi.mock('@/lib/db', () => ({
  db: {
    transactions: {
      where: vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      bulkAdd: vi.fn().mockResolvedValue([1, 2, 3]),
    },
  },
}));

// Mock parseCsvFile
vi.mock('../csv-parser', () => ({
  parseCsvFile: vi.fn().mockResolvedValue({
    headers: ['Date', 'Symbol', 'Quantity', 'Price', 'Type'],
    rows: [
      { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: 'buy' },
    ],
    delimiter: ',',
    rowCount: 1,
  }),
}));

// Mock column detector
vi.mock('../column-detector', () => ({
  detectColumnMappings: vi.fn().mockReturnValue({
    mappings: [
      { csvColumn: 'Date', csvColumnIndex: 0, transactionField: 'date', confidence: 1, isUserOverride: false },
      { csvColumn: 'Symbol', csvColumnIndex: 1, transactionField: 'symbol', confidence: 1, isUserOverride: false },
      { csvColumn: 'Quantity', csvColumnIndex: 2, transactionField: 'quantity', confidence: 1, isUserOverride: false },
      { csvColumn: 'Price', csvColumnIndex: 3, transactionField: 'price', confidence: 1, isUserOverride: false },
      { csvColumn: 'Type', csvColumnIndex: 4, transactionField: 'type', confidence: 1, isUserOverride: false },
    ],
    unmappedColumns: [],
    missingRequiredFields: [],
  }),
  hasAllRequiredMappings: vi.fn().mockReturnValue(true),
}));

// Mock csv-validator
vi.mock('../csv-validator', () => ({
  validateRows: vi.fn().mockReturnValue({
    valid: [],
    errors: [],
    validCount: 0,
    errorCount: 0,
  }),
}));

// Helper to create a valid parsed row for tests
function createParsedRow(overrides: Partial<{
  rowNumber: number;
  date: Date;
  symbol: string;
  quantity: Decimal;
  price: Decimal;
  type: string;
  raw: Record<string, string>;
}>): ParsedRow {
  return {
    rowNumber: overrides.rowNumber ?? 1,
    raw: overrides.raw ?? {},
    parsed: {
      date: overrides.date ?? new Date('2025-01-15'),
      symbol: overrides.symbol ?? 'AAPL',
      quantity: overrides.quantity ?? new Decimal(10),
      price: overrides.price ?? new Decimal(150),
      type: (overrides.type as any) ?? 'buy',
      fees: new Decimal(0),
      notes: '',
    },
    isValid: true,
    errors: [],
  };
}

// Helper to create a valid import session for tests
function createImportSession(overrides: Partial<ImportSession> = {}): ImportSession {
  return {
    id: 'session-123',
    portfolioId: 'portfolio-123',
    status: 'importing',
    fileName: 'test.csv',
    fileSize: 100,
    totalRows: 2,
    createdAt: new Date(),
    detectedDelimiter: ',',
    detectedHeaders: ['Date', 'Symbol', 'Quantity', 'Price'],
    columnMappings: [],
    previewRows: [],
    validRowCount: 2,
    errorRowCount: 0,
    errors: [],
    duplicateCount: 0,
    duplicates: [],
    duplicateHandling: 'skip',
    ...overrides,
  };
}

describe('startImportSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an import session with correct initial state', async () => {
    const mockFile = new File(['test'], 'transactions.csv', { type: 'text/csv' });
    const portfolioId = 'portfolio-123';

    const session = await startImportSession(mockFile, portfolioId);

    expect(session.id).toBeDefined();
    expect(session.portfolioId).toBe(portfolioId);
    expect(session.fileName).toBe('transactions.csv');
    expect(session.fileSize).toBe(4); // 'test'.length
    expect(session.status).toBe('preview');
  });

  it('populates column mappings from detection', async () => {
    const mockFile = new File(['test'], 'transactions.csv', { type: 'text/csv' });

    const session = await startImportSession(mockFile, 'portfolio-123');

    expect(session.columnMappings).toBeDefined();
    expect(session.columnMappings.length).toBeGreaterThan(0);
  });
});

describe('detectDuplicates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when no existing transactions', async () => {
    const validRows: ParsedRow[] = [createParsedRow({})];

    const duplicates = await detectDuplicates(validRows, 'portfolio-123');

    expect(duplicates).toEqual([]);
  });

  it('detects duplicates when matching transactions exist', async () => {
    const { db } = await import('@/lib/db');
    const mockExisting = [
      {
        id: 'existing-1',
        portfolioId: 'portfolio-123',
        date: new Date('2025-01-15'),
        symbol: 'AAPL',
        quantity: 10,
        price: 150,
        type: 'buy',
      },
    ];

    vi.mocked(db.transactions.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockExisting),
      }),
    } as any);

    const validRows: ParsedRow[] = [
      createParsedRow({
        raw: { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150' },
      }),
    ];

    const duplicates = await detectDuplicates(validRows, 'portfolio-123');

    expect(duplicates.length).toBe(1);
    expect(duplicates[0].importData.parsed.symbol).toBe('AAPL');
    expect(duplicates[0].existingTransaction.id).toBe('existing-1');
  });
});

describe('executeImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('imports valid rows successfully', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.transactions.bulkAdd).mockResolvedValue([1, 2, 3] as any);

    const session = createImportSession({ validRowCount: 3, errorRowCount: 0 });

    const validRows: ParsedRow[] = [
      createParsedRow({ rowNumber: 1 }),
      createParsedRow({ rowNumber: 2, symbol: 'GOOGL', price: new Decimal(175) }),
    ];

    const result = await executeImport(session, validRows, [], 'skip');

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(2);
    expect(db.transactions.bulkAdd).toHaveBeenCalled();
  });

  it('skips duplicates when handling is set to skip', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.transactions.bulkAdd).mockResolvedValue([1] as any);

    const session = createImportSession();

    const validRows: ParsedRow[] = [
      createParsedRow({ rowNumber: 1 }),
      createParsedRow({ rowNumber: 2, symbol: 'GOOGL' }),
    ];

    const duplicates = [
      {
        importRowNumber: 1,
        importData: validRows[0],
        existingTransaction: {
          id: 'existing-1',
          date: new Date('2025-01-15'),
          symbol: 'AAPL',
          type: 'buy' as const,
          quantity: new Decimal(10),
          price: new Decimal(150),
        },
        matchConfidence: 'exact' as const,
      },
    ];

    const result = await executeImport(session, validRows, duplicates, 'skip');

    expect(result.success).toBe(true);
    expect(result.skippedDuplicates).toBe(1);
    expect(result.importedCount).toBe(1);
  });

  it('calls progress callback during import', async () => {
    const { db } = await import('@/lib/db');
    vi.mocked(db.transactions.bulkAdd).mockResolvedValue([1, 2] as any);

    const session = createImportSession();

    const validRows: ParsedRow[] = [createParsedRow({})];

    const progressCallback = vi.fn();

    await executeImport(session, validRows, [], 'skip', progressCallback);

    expect(progressCallback).toHaveBeenCalled();
  });
});

describe('revalidateWithMappings', () => {
  it('revalidates rows with updated mappings', async () => {
    const { validateRows } = await import('../csv-validator');
    vi.mocked(validateRows).mockReturnValue({
      valid: [],
      errors: [],
      validCount: 5,
      errorCount: 0,
    });

    const parseResult = {
      headers: ['Date', 'Symbol'],
      rows: [{ Date: '2025-01-15', Symbol: 'AAPL' }],
      delimiter: ',' as const,
      rowCount: 1,
    };
    const mappings: ColumnMapping[] = [
      { csvColumn: 'Date', csvColumnIndex: 0, transactionField: 'date', confidence: 1, isUserOverride: true },
      { csvColumn: 'Symbol', csvColumnIndex: 1, transactionField: 'symbol', confidence: 1, isUserOverride: true },
    ];

    const result = revalidateWithMappings(parseResult, mappings);

    expect(validateRows).toHaveBeenCalledWith(parseResult.rows, mappings);
    expect(result.validCount).toBe(5);
  });
});
