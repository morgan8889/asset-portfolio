/**
 * CSV Importer Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import Decimal from 'decimal.js';
import {
  startImportSession,
  detectDuplicates,
  executeImport,
} from '../csv-importer';
import type { ParsedRow, ColumnMapping, ImportSession } from '@/types/csv-import';

// Mock the database module - correct path is @/lib/db/schema
vi.mock('@/lib/db/schema', () => {
  const mockAsset = { id: 'asset-1', symbol: 'AAPL', name: 'Apple', type: 'stock' };
  return {
    db: {
      transactions: {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            filter: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([]),
            }),
            toArray: vi.fn().mockResolvedValue([]),
            first: vi.fn().mockResolvedValue(null),
          }),
        }),
        add: vi.fn().mockResolvedValue('transaction-id'),
        bulkAdd: vi.fn().mockResolvedValue([1, 2, 3]),
      },
      assets: {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(mockAsset),
          }),
        }),
        add: vi.fn().mockResolvedValue('asset-id'),
        get: vi.fn().mockResolvedValue(mockAsset),
      },
    },
  };
});

// Mock parseCsvFile, generateCsv, and getPreviewData
vi.mock('../csv-parser', () => ({
  parseCsvFile: vi.fn().mockResolvedValue({
    headers: ['Date', 'Symbol', 'Quantity', 'Price', 'Type'],
    rows: [
      { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: 'buy' },
    ],
    delimiter: ',',
    rowCount: 1,
  }),
  generateCsv: vi.fn().mockReturnValue('Date,Symbol,Quantity,Price,Type\n2025-01-15,AAPL,10,150.00,buy'),
  getPreviewData: vi.fn().mockReturnValue([
    { Date: '2025-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00', Type: 'buy' },
  ]),
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
    const { db } = await import('@/lib/db/schema');
    const mockExisting = [
      {
        id: 'existing-1',
        portfolioId: 'portfolio-123',
        assetId: 'AAPL', // detectDuplicates uses assetId, not symbol
        date: new Date('2025-01-15'),
        quantity: 10,
        price: 150,
        type: 'buy',
      },
    ];

    vi.mocked(db.transactions.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        filter: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockExisting),
        }),
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
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the db mock for each test
    const { db } = await import('@/lib/db/schema');
    vi.mocked(db.transactions.add).mockResolvedValue('transaction-id');
    vi.mocked(db.assets.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue({ id: 'asset-1', symbol: 'AAPL', name: 'Apple', type: 'stock' }),
      }),
    } as any);
  });

  it('imports valid rows successfully', async () => {
    const { db } = await import('@/lib/db/schema');

    const session = createImportSession({ validRowCount: 3, errorRowCount: 0 });

    const validRows: ParsedRow[] = [
      createParsedRow({ rowNumber: 1 }),
      createParsedRow({ rowNumber: 2, symbol: 'GOOGL', price: new Decimal(175) }),
    ];

    const result = await executeImport(session, validRows, [], 'skip');

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(2);
    // Verify db.transactions.add was called for each row
    expect(db.transactions.add).toHaveBeenCalledTimes(2);
  });

  it('skips duplicates when handling is set to skip', async () => {
    const { db } = await import('@/lib/db/schema');

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
    // Only non-duplicate row should be imported
    expect(db.transactions.add).toHaveBeenCalledTimes(1);
  });

  it('calls progress callback during import', async () => {
    const session = createImportSession();

    const validRows: ParsedRow[] = [createParsedRow({})];

    const progressCallback = vi.fn();

    await executeImport(session, validRows, [], 'skip', progressCallback);

    expect(progressCallback).toHaveBeenCalled();
  });
});

// Note: revalidateWithMappings was removed as it was just a thin wrapper around validateRows.
// Direct usage of validateRows is preferred for simplicity.
