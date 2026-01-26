import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Decimal } from 'decimal.js';
import type {
  ImportSession,
  ParsedRow,
  ColumnMapping,
  CsvParserResult,
  ValidationResult,
  ImportResult,
  DuplicateMatch,
} from '@/types/csv-import';

// Use vi.hoisted to define mocks
const {
  mockCsvImporter,
  mockCsvParser,
  mockColumnDetector,
  mockCsvValidator,
  mockBrokerageFormats,
} = vi.hoisted(() => ({
  mockCsvImporter: {
    startImportSession: vi.fn(),
    detectDuplicates: vi.fn(),
    executeImport: vi.fn(),
  },
  mockCsvParser: {
    parseCsvFile: vi.fn(),
    generateCsv: vi.fn(),
  },
  mockColumnDetector: {
    updateColumnMapping: vi.fn(),
    hasAllRequiredMappings: vi.fn(),
  },
  mockCsvValidator: {
    validateRows: vi.fn(),
  },
  mockBrokerageFormats: {
    getBrokerageFormatById: vi.fn(),
    getBrokerageColumnMappings: vi.fn(),
  },
}));

vi.mock('@/lib/services/csv-importer', () => ({
  startImportSession: mockCsvImporter.startImportSession,
  detectDuplicates: mockCsvImporter.detectDuplicates,
  executeImport: mockCsvImporter.executeImport,
}));

vi.mock('@/lib/services/csv-parser', () => ({
  parseCsvFile: mockCsvParser.parseCsvFile,
  generateCsv: mockCsvParser.generateCsv,
}));

vi.mock('@/lib/services/column-detector', () => ({
  updateColumnMapping: mockColumnDetector.updateColumnMapping,
  hasAllRequiredMappings: mockColumnDetector.hasAllRequiredMappings,
}));

vi.mock('@/lib/services/csv-validator', () => ({
  validateRows: mockCsvValidator.validateRows,
}));

vi.mock('@/lib/services/brokerage-formats', () => ({
  getBrokerageFormatById: mockBrokerageFormats.getBrokerageFormatById,
  getBrokerageColumnMappings: mockBrokerageFormats.getBrokerageColumnMappings,
}));

// Import after mocks
import { useCsvImportStore } from '../csv-import';

const createMockFile = (content: string, name = 'test.csv'): File => {
  return new File([content], name, { type: 'text/csv' });
};

const createMockColumnMapping = (
  overrides: Partial<ColumnMapping> = {}
): ColumnMapping => ({
  csvColumn: 'Date',
  csvColumnIndex: 0,
  transactionField: 'date',
  confidence: 0.9,
  isUserOverride: false,
  ...overrides,
});

const createMockParseResult = (
  overrides: Partial<CsvParserResult> = {}
): CsvParserResult => ({
  headers: ['Date', 'Symbol', 'Quantity', 'Price'],
  rows: [
    { Date: '2024-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00' },
    { Date: '2024-01-16', Symbol: 'GOOG', Quantity: '5', Price: '140.00' },
  ],
  delimiter: ',',
  rowCount: 2,
  ...overrides,
});

const createMockParsedRow = (
  overrides: Partial<ParsedRow> = {}
): ParsedRow => ({
  rowNumber: 1,
  raw: { Date: '2024-01-15', Symbol: 'AAPL', Quantity: '10', Price: '150.00' },
  parsed: {
    date: new Date('2024-01-15'),
    symbol: 'AAPL',
    type: 'buy',
    quantity: new Decimal(10),
    price: new Decimal(150),
    fees: null,
    notes: null,
  },
  isValid: true,
  errors: [],
  ...overrides,
});

const createMockSession = (
  overrides: Partial<ImportSession> = {}
): ImportSession => ({
  id: 'session-1',
  portfolioId: 'portfolio-1',
  status: 'preview',
  fileName: 'test.csv',
  fileSize: 1024,
  totalRows: 2,
  createdAt: new Date(),
  detectedDelimiter: ',',
  detectedHeaders: ['Date', 'Symbol', 'Quantity', 'Price'],
  columnMappings: [
    createMockColumnMapping({
      csvColumn: 'Date',
      csvColumnIndex: 0,
      transactionField: 'date',
    }),
    createMockColumnMapping({
      csvColumn: 'Symbol',
      csvColumnIndex: 1,
      transactionField: 'symbol',
    }),
    createMockColumnMapping({
      csvColumn: 'Quantity',
      csvColumnIndex: 2,
      transactionField: 'quantity',
    }),
    createMockColumnMapping({
      csvColumn: 'Price',
      csvColumnIndex: 3,
      transactionField: 'price',
    }),
  ],
  previewRows: [],
  validRowCount: 2,
  errorRowCount: 0,
  errors: [],
  duplicateCount: 0,
  duplicates: [],
  duplicateHandling: 'skip',
  ...overrides,
});

const createMockValidationResult = (
  overrides: Partial<ValidationResult> = {}
): ValidationResult => ({
  valid: [createMockParsedRow()],
  errors: [],
  validCount: 1,
  errorCount: 0,
  ...overrides,
});

describe('CSV Import Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useCsvImportStore.setState({
      session: null,
      parseResult: null,
      isProcessing: false,
      progress: 0,
      error: null,
      validationResult: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useCsvImportStore.getState();

      expect(state.session).toBeNull();
      expect(state.parseResult).toBeNull();
      expect(state.isProcessing).toBe(false);
      expect(state.progress).toBe(0);
      expect(state.error).toBeNull();
      expect(state.validationResult).toBeNull();
    });
  });

  describe('startImport', () => {
    it('should set processing state while importing', async () => {
      const mockFile = createMockFile(
        'Date,Symbol,Quantity,Price\n2024-01-15,AAPL,10,150'
      );
      const mockSession = createMockSession();
      const mockParseResult = createMockParseResult();
      const mockValidationResult = createMockValidationResult();

      mockCsvParser.parseCsvFile.mockResolvedValue(mockParseResult);
      mockCsvImporter.startImportSession.mockResolvedValue(mockSession);
      mockCsvValidator.validateRows.mockReturnValue(mockValidationResult);
      mockCsvImporter.detectDuplicates.mockResolvedValue([]);

      const promise = useCsvImportStore
        .getState()
        .startImport(mockFile, 'portfolio-1');

      // Check processing state is set
      expect(useCsvImportStore.getState().isProcessing).toBe(true);

      await promise;

      expect(useCsvImportStore.getState().isProcessing).toBe(false);
    });

    it('should parse file and create session', async () => {
      const mockFile = createMockFile(
        'Date,Symbol,Quantity,Price\n2024-01-15,AAPL,10,150'
      );
      const mockSession = createMockSession();
      const mockParseResult = createMockParseResult();
      const mockValidationResult = createMockValidationResult();

      mockCsvParser.parseCsvFile.mockResolvedValue(mockParseResult);
      mockCsvImporter.startImportSession.mockResolvedValue(mockSession);
      mockCsvValidator.validateRows.mockReturnValue(mockValidationResult);
      mockCsvImporter.detectDuplicates.mockResolvedValue([]);

      await useCsvImportStore.getState().startImport(mockFile, 'portfolio-1');

      expect(mockCsvParser.parseCsvFile).toHaveBeenCalledWith(mockFile);
      expect(mockCsvImporter.startImportSession).toHaveBeenCalledWith(
        mockFile,
        'portfolio-1'
      );

      const state = useCsvImportStore.getState();
      expect(state.session).not.toBeNull();
      expect(state.parseResult).toEqual(mockParseResult);
      expect(state.progress).toBe(100);
    });

    it('should detect duplicates during import', async () => {
      const mockFile = createMockFile(
        'Date,Symbol,Quantity,Price\n2024-01-15,AAPL,10,150'
      );
      const mockSession = createMockSession();
      const mockParseResult = createMockParseResult();
      const mockValidationResult = createMockValidationResult();
      const mockDuplicates: DuplicateMatch[] = [
        {
          importRowNumber: 1,
          importData: createMockParsedRow(),
          existingTransaction: {
            id: 'existing-1',
            date: new Date('2024-01-15'),
            symbol: 'AAPL',
            type: 'buy',
            quantity: new Decimal(10),
            price: new Decimal(150),
          },
          matchConfidence: 'exact',
        },
      ];

      mockCsvParser.parseCsvFile.mockResolvedValue(mockParseResult);
      mockCsvImporter.startImportSession.mockResolvedValue(mockSession);
      mockCsvValidator.validateRows.mockReturnValue(mockValidationResult);
      mockCsvImporter.detectDuplicates.mockResolvedValue(mockDuplicates);

      await useCsvImportStore.getState().startImport(mockFile, 'portfolio-1');

      const state = useCsvImportStore.getState();
      expect(state.session!.duplicateCount).toBe(1);
      expect(state.session!.duplicates).toHaveLength(1);
    });

    it('should handle parse errors', async () => {
      const mockFile = createMockFile('invalid content');
      const errorMessage = 'Failed to parse CSV';

      mockCsvParser.parseCsvFile.mockRejectedValue(new Error(errorMessage));

      await useCsvImportStore.getState().startImport(mockFile, 'portfolio-1');

      const state = useCsvImportStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isProcessing).toBe(false);
      expect(state.session).toBeNull();
    });

    it('should handle non-Error exceptions', async () => {
      const mockFile = createMockFile('invalid content');

      mockCsvParser.parseCsvFile.mockRejectedValue('string error');

      await useCsvImportStore.getState().startImport(mockFile, 'portfolio-1');

      const state = useCsvImportStore.getState();
      expect(state.error).toBe('Failed to parse CSV file');
      expect(state.isProcessing).toBe(false);
    });

    it('should update session with validation results', async () => {
      const mockFile = createMockFile(
        'Date,Symbol,Quantity,Price\n2024-01-15,AAPL,10,150'
      );
      const mockSession = createMockSession({
        validRowCount: 0,
        errorRowCount: 0,
      });
      const mockParseResult = createMockParseResult();
      const mockValidationResult = createMockValidationResult({
        validCount: 5,
        errorCount: 2,
        errors: [
          {
            rowNumber: 3,
            originalData: { Date: 'invalid' },
            field: 'date',
            value: 'invalid',
            message: 'Invalid date format',
            severity: 'error',
          },
        ],
      });

      mockCsvParser.parseCsvFile.mockResolvedValue(mockParseResult);
      mockCsvImporter.startImportSession.mockResolvedValue(mockSession);
      mockCsvValidator.validateRows.mockReturnValue(mockValidationResult);
      mockCsvImporter.detectDuplicates.mockResolvedValue([]);

      await useCsvImportStore.getState().startImport(mockFile, 'portfolio-1');

      const state = useCsvImportStore.getState();
      expect(state.session!.validRowCount).toBe(5);
      expect(state.session!.errorRowCount).toBe(2);
    });
  });

  describe('updateColumnMapping', () => {
    it('should do nothing if no session exists', () => {
      useCsvImportStore.getState().updateColumnMapping(0, 'date');

      expect(mockColumnDetector.updateColumnMapping).not.toHaveBeenCalled();
    });

    it('should update column mapping', () => {
      const mockSession = createMockSession();
      const mockParseResult = createMockParseResult();
      const updatedMappings = [
        ...mockSession.columnMappings.slice(0, 1),
        {
          ...mockSession.columnMappings[1],
          transactionField: 'notes' as const,
        },
        ...mockSession.columnMappings.slice(2),
      ];

      useCsvImportStore.setState({
        session: mockSession,
        parseResult: mockParseResult,
      });

      mockColumnDetector.updateColumnMapping.mockReturnValue(updatedMappings);
      mockColumnDetector.hasAllRequiredMappings.mockReturnValue(true);
      mockCsvValidator.validateRows.mockReturnValue(
        createMockValidationResult()
      );

      useCsvImportStore.getState().updateColumnMapping(1, 'notes');

      expect(mockColumnDetector.updateColumnMapping).toHaveBeenCalledWith(
        mockSession.columnMappings,
        1,
        'notes'
      );
    });

    it('should re-validate when all required mappings are present', () => {
      const mockSession = createMockSession();
      const mockParseResult = createMockParseResult();

      useCsvImportStore.setState({
        session: mockSession,
        parseResult: mockParseResult,
      });

      mockColumnDetector.updateColumnMapping.mockReturnValue(
        mockSession.columnMappings
      );
      mockColumnDetector.hasAllRequiredMappings.mockReturnValue(true);
      mockCsvValidator.validateRows.mockReturnValue(
        createMockValidationResult()
      );

      useCsvImportStore.getState().updateColumnMapping(0, 'date');

      expect(mockCsvValidator.validateRows).toHaveBeenCalled();
      expect(useCsvImportStore.getState().session!.status).toBe('preview');
    });

    it('should not validate when required mappings are missing', () => {
      const mockSession = createMockSession({ status: 'mapping_review' });
      const mockParseResult = createMockParseResult();

      useCsvImportStore.setState({
        session: mockSession,
        parseResult: mockParseResult,
      });

      mockColumnDetector.updateColumnMapping.mockReturnValue(
        mockSession.columnMappings
      );
      mockColumnDetector.hasAllRequiredMappings.mockReturnValue(false);

      useCsvImportStore.getState().updateColumnMapping(0, null);

      expect(mockCsvValidator.validateRows).not.toHaveBeenCalled();
      expect(useCsvImportStore.getState().session!.status).toBe(
        'mapping_review'
      );
    });

    it('should set status to mapping_review when missing required fields', () => {
      const mockSession = createMockSession({ status: 'preview' });
      const mockParseResult = createMockParseResult();

      useCsvImportStore.setState({
        session: mockSession,
        parseResult: mockParseResult,
      });

      mockColumnDetector.updateColumnMapping.mockReturnValue([
        ...mockSession.columnMappings.map((m) => ({
          ...m,
          transactionField: null,
        })),
      ]);
      mockColumnDetector.hasAllRequiredMappings.mockReturnValue(false);

      useCsvImportStore.getState().updateColumnMapping(0, null);

      expect(useCsvImportStore.getState().session!.status).toBe(
        'mapping_review'
      );
    });
  });

  describe('applyBrokeragePreset', () => {
    it('should do nothing if no session exists', () => {
      useCsvImportStore.getState().applyBrokeragePreset('fidelity');

      expect(
        mockBrokerageFormats.getBrokerageFormatById
      ).not.toHaveBeenCalled();
    });

    it('should do nothing if brokerage format not found', () => {
      const mockSession = createMockSession();

      useCsvImportStore.setState({
        session: mockSession,
        parseResult: createMockParseResult(),
      });

      mockBrokerageFormats.getBrokerageFormatById.mockReturnValue(null);

      useCsvImportStore.getState().applyBrokeragePreset('unknown-brokerage');

      // State should remain unchanged
      expect(useCsvImportStore.getState().session).toEqual(mockSession);
    });

    it('should apply brokerage preset mappings', () => {
      const mockSession = createMockSession();
      const mockParseResult = createMockParseResult();
      const mockFormat = {
        id: 'fidelity',
        name: 'Fidelity',
        columns: [],
      };
      const columnMap = new Map<number, string>([
        [0, 'date'],
        [1, 'symbol'],
        [2, 'quantity'],
        [3, 'price'],
      ]);

      useCsvImportStore.setState({
        session: mockSession,
        parseResult: mockParseResult,
      });

      mockBrokerageFormats.getBrokerageFormatById.mockReturnValue(mockFormat);
      mockBrokerageFormats.getBrokerageColumnMappings.mockReturnValue(
        columnMap
      );
      mockColumnDetector.hasAllRequiredMappings.mockReturnValue(true);
      mockCsvValidator.validateRows.mockReturnValue(
        createMockValidationResult()
      );

      useCsvImportStore.getState().applyBrokeragePreset('fidelity');

      const state = useCsvImportStore.getState();
      expect(state.session!.detectedBrokerage).toEqual({
        id: 'fidelity',
        name: 'Fidelity',
        confidence: 1.0,
      });
      expect(state.session!.columnMappings[0].isUserOverride).toBe(true);
    });

    it('should set status to preview when all required mappings are present', () => {
      const mockSession = createMockSession({ status: 'mapping_review' });
      const mockParseResult = createMockParseResult();
      const mockFormat = {
        id: 'fidelity',
        name: 'Fidelity',
        columns: [],
      };

      useCsvImportStore.setState({
        session: mockSession,
        parseResult: mockParseResult,
      });

      mockBrokerageFormats.getBrokerageFormatById.mockReturnValue(mockFormat);
      mockBrokerageFormats.getBrokerageColumnMappings.mockReturnValue(
        new Map()
      );
      mockColumnDetector.hasAllRequiredMappings.mockReturnValue(true);
      mockCsvValidator.validateRows.mockReturnValue(
        createMockValidationResult()
      );

      useCsvImportStore.getState().applyBrokeragePreset('fidelity');

      expect(useCsvImportStore.getState().session!.status).toBe('preview');
    });
  });

  describe('setDuplicateHandling', () => {
    it('should do nothing if no session exists', () => {
      const initialState = useCsvImportStore.getState();

      useCsvImportStore.getState().setDuplicateHandling('import');

      expect(useCsvImportStore.getState()).toEqual(initialState);
    });

    it('should update duplicate handling setting', () => {
      useCsvImportStore.setState({
        session: createMockSession({ duplicateHandling: 'skip' }),
      });

      useCsvImportStore.getState().setDuplicateHandling('import');

      expect(useCsvImportStore.getState().session!.duplicateHandling).toBe(
        'import'
      );
    });

    it('should handle all duplicate handling options', () => {
      const options: Array<'skip' | 'import' | 'review'> = [
        'skip',
        'import',
        'review',
      ];

      for (const option of options) {
        useCsvImportStore.setState({
          session: createMockSession({ duplicateHandling: 'skip' }),
        });

        useCsvImportStore.getState().setDuplicateHandling(option);

        expect(useCsvImportStore.getState().session!.duplicateHandling).toBe(
          option
        );
      }
    });
  });

  describe('confirmImport', () => {
    it('should throw error if no session exists', async () => {
      await expect(
        useCsvImportStore.getState().confirmImport()
      ).rejects.toThrow('No active import session');
    });

    it('should throw error if no validation result exists', async () => {
      useCsvImportStore.setState({
        session: createMockSession(),
        validationResult: null,
      });

      await expect(
        useCsvImportStore.getState().confirmImport()
      ).rejects.toThrow('No active import session');
    });

    it('should execute import and update progress', async () => {
      const mockSession = createMockSession();
      const mockValidationResult = createMockValidationResult();
      const mockResult: ImportResult = {
        sessionId: 'session-1',
        success: true,
        totalRows: 2,
        importedCount: 2,
        skippedDuplicates: 0,
        errorCount: 0,
        errors: [],
        transactionIds: ['tx-1', 'tx-2'],
      };

      useCsvImportStore.setState({
        session: mockSession,
        validationResult: mockValidationResult,
      });

      mockCsvImporter.executeImport.mockImplementation(
        async (session, rows, dupes, handling, onProgress) => {
          onProgress(50);
          onProgress(100);
          return mockResult;
        }
      );

      const result = await useCsvImportStore.getState().confirmImport();

      expect(result).toEqual(mockResult);
      expect(mockCsvImporter.executeImport).toHaveBeenCalled();
      expect(useCsvImportStore.getState().session!.status).toBe('completed');
      expect(useCsvImportStore.getState().session!.importedCount).toBe(2);
    });

    it('should set status to importing during import', async () => {
      const mockSession = createMockSession({ status: 'preview' });
      const mockValidationResult = createMockValidationResult();

      useCsvImportStore.setState({
        session: mockSession,
        validationResult: mockValidationResult,
      });

      let importingStatus: string | null = null;
      mockCsvImporter.executeImport.mockImplementation(async () => {
        importingStatus = useCsvImportStore.getState().session!.status;
        return {
          sessionId: 'session-1',
          success: true,
          totalRows: 1,
          importedCount: 1,
          skippedDuplicates: 0,
          errorCount: 0,
          errors: [],
          transactionIds: ['tx-1'],
        };
      });

      await useCsvImportStore.getState().confirmImport();

      expect(importingStatus).toBe('importing');
    });

    it('should handle import errors', async () => {
      const mockSession = createMockSession();
      const mockValidationResult = createMockValidationResult();
      const errorMessage = 'Database error';

      useCsvImportStore.setState({
        session: mockSession,
        validationResult: mockValidationResult,
      });

      mockCsvImporter.executeImport.mockRejectedValue(new Error(errorMessage));

      await expect(
        useCsvImportStore.getState().confirmImport()
      ).rejects.toThrow(errorMessage);

      const state = useCsvImportStore.getState();
      expect(state.session!.status).toBe('error');
      expect(state.error).toBe(errorMessage);
      expect(state.isProcessing).toBe(false);
    });

    it('should set status to error when import fails', async () => {
      const mockSession = createMockSession();
      const mockValidationResult = createMockValidationResult();
      const mockResult: ImportResult = {
        sessionId: 'session-1',
        success: false,
        totalRows: 2,
        importedCount: 0,
        skippedDuplicates: 0,
        errorCount: 2,
        errors: [],
        transactionIds: [],
      };

      useCsvImportStore.setState({
        session: mockSession,
        validationResult: mockValidationResult,
      });

      mockCsvImporter.executeImport.mockResolvedValue(mockResult);

      await useCsvImportStore.getState().confirmImport();

      expect(useCsvImportStore.getState().session!.status).toBe('error');
    });
  });

  describe('cancelImport', () => {
    it('should do nothing if no session exists', () => {
      useCsvImportStore.getState().cancelImport();

      expect(useCsvImportStore.getState().session).toBeNull();
    });

    it('should set session status to cancelled', () => {
      useCsvImportStore.setState({
        session: createMockSession({ status: 'preview' }),
      });

      useCsvImportStore.getState().cancelImport();

      expect(useCsvImportStore.getState().session!.status).toBe('cancelled');
    });
  });

  describe('downloadFailedRows', () => {
    beforeEach(() => {
      // Mock DOM methods
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn(() => 'blob:test'),
        revokeObjectURL: vi.fn(),
      });

      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(
        mockLink as unknown as HTMLElement
      );
      vi.spyOn(document.body, 'appendChild').mockImplementation(
        () => mockLink as unknown as Node
      );
      vi.spyOn(document.body, 'removeChild').mockImplementation(
        () => mockLink as unknown as Node
      );
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should do nothing if no session exists', () => {
      useCsvImportStore.getState().downloadFailedRows();

      expect(mockCsvParser.generateCsv).not.toHaveBeenCalled();
    });

    it('should do nothing if no validation result exists', () => {
      useCsvImportStore.setState({
        session: createMockSession(),
        validationResult: null,
      });

      useCsvImportStore.getState().downloadFailedRows();

      expect(mockCsvParser.generateCsv).not.toHaveBeenCalled();
    });

    it('should do nothing if no failed rows', () => {
      useCsvImportStore.setState({
        session: createMockSession(),
        validationResult: createMockValidationResult({ errors: [] }),
      });

      useCsvImportStore.getState().downloadFailedRows();

      expect(mockCsvParser.generateCsv).not.toHaveBeenCalled();
    });

    it('should generate and download CSV for failed rows', () => {
      const failedRowData = {
        Date: 'invalid',
        Symbol: 'AAPL',
        Quantity: '10',
        Price: '150',
      };
      const mockSession = createMockSession({ fileName: 'transactions.csv' });
      const mockValidationResult = createMockValidationResult({
        errors: [
          {
            rowNumber: 2,
            originalData: failedRowData,
            field: 'date',
            value: 'invalid',
            message: 'Invalid date',
            severity: 'error',
          },
        ],
      });

      useCsvImportStore.setState({
        session: mockSession,
        validationResult: mockValidationResult,
      });

      mockCsvParser.generateCsv.mockReturnValue(
        'Date,Symbol,Quantity,Price\ninvalid,AAPL,10,150'
      );

      useCsvImportStore.getState().downloadFailedRows();

      expect(mockCsvParser.generateCsv).toHaveBeenCalledWith([failedRowData]);
      expect(document.createElement).toHaveBeenCalledWith('a');
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      useCsvImportStore.setState({
        session: createMockSession(),
        parseResult: createMockParseResult(),
        isProcessing: true,
        progress: 50,
        error: 'Some error',
        validationResult: createMockValidationResult(),
      });

      useCsvImportStore.getState().reset();

      const state = useCsvImportStore.getState();
      expect(state.session).toBeNull();
      expect(state.parseResult).toBeNull();
      expect(state.isProcessing).toBe(false);
      expect(state.progress).toBe(0);
      expect(state.error).toBeNull();
      expect(state.validationResult).toBeNull();
    });
  });

  describe('State Transitions', () => {
    it('should transition from file_selected through parsing to preview', async () => {
      const mockFile = createMockFile(
        'Date,Symbol,Quantity,Price\n2024-01-15,AAPL,10,150'
      );
      const mockSession = createMockSession({ status: 'preview' });
      const mockParseResult = createMockParseResult();
      const mockValidationResult = createMockValidationResult();

      mockCsvParser.parseCsvFile.mockResolvedValue(mockParseResult);
      mockCsvImporter.startImportSession.mockResolvedValue(mockSession);
      mockCsvValidator.validateRows.mockReturnValue(mockValidationResult);
      mockCsvImporter.detectDuplicates.mockResolvedValue([]);

      await useCsvImportStore.getState().startImport(mockFile, 'portfolio-1');

      expect(useCsvImportStore.getState().session!.status).toBe('preview');
    });

    it('should transition to mapping_review when missing required mappings', async () => {
      const mockFile = createMockFile('Col1,Col2\ndata1,data2');
      const mockSession = createMockSession({ status: 'mapping_review' });
      const mockParseResult = createMockParseResult();
      const mockValidationResult = createMockValidationResult();

      mockCsvParser.parseCsvFile.mockResolvedValue(mockParseResult);
      mockCsvImporter.startImportSession.mockResolvedValue(mockSession);
      mockCsvValidator.validateRows.mockReturnValue(mockValidationResult);
      mockCsvImporter.detectDuplicates.mockResolvedValue([]);

      await useCsvImportStore.getState().startImport(mockFile, 'portfolio-1');

      // Status should match what session returned
      expect(useCsvImportStore.getState().session!.status).toBe(
        'mapping_review'
      );
    });
  });

  describe('Progress Tracking', () => {
    it('should track progress during import', async () => {
      const mockSession = createMockSession();
      const mockValidationResult = createMockValidationResult();
      const progressValues: number[] = [];

      useCsvImportStore.setState({
        session: mockSession,
        validationResult: mockValidationResult,
      });

      mockCsvImporter.executeImport.mockImplementation(
        async (session, rows, dupes, handling, onProgress) => {
          onProgress(25);
          progressValues.push(useCsvImportStore.getState().progress);
          onProgress(50);
          progressValues.push(useCsvImportStore.getState().progress);
          onProgress(75);
          progressValues.push(useCsvImportStore.getState().progress);
          return {
            sessionId: 'session-1',
            success: true,
            totalRows: 1,
            importedCount: 1,
            skippedDuplicates: 0,
            errorCount: 0,
            errors: [],
            transactionIds: ['tx-1'],
          };
        }
      );

      await useCsvImportStore.getState().confirmImport();

      expect(progressValues).toEqual([25, 50, 75]);
    });
  });
});
