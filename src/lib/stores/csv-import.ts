/**
 * CSV Import Zustand Store
 *
 * Manages state for CSV import workflow including:
 * - Import session lifecycle
 * - Column mappings
 * - Validation results
 * - Duplicate handling
 * - Import progress
 */

import { create } from 'zustand';
import type {
  ImportSession,
  ImportResult,
  ParsedRow,
  ColumnMapping,
  DuplicateMatch,
  DuplicateHandling,
  TransactionField,
  CsvParserResult,
  ValidationResult,
} from '@/types/csv-import';
import {
  startImportSession,
  detectDuplicates,
  executeImport,
} from '@/lib/services/csv-importer';
import { parseCsvFile } from '@/lib/services/csv-parser';
import { updateColumnMapping, hasAllRequiredMappings } from '@/lib/services/column-detector';
import { validateRows } from '@/lib/services/csv-validator';
import { generateCsv } from '@/lib/services/csv-parser';
import {
  getBrokerageFormatById,
  getBrokerageColumnMappings,
} from '@/lib/services/brokerage-formats';

export interface CsvImportState {
  // Session state
  session: ImportSession | null;
  parseResult: CsvParserResult | null;
  isProcessing: boolean;
  progress: number;
  error: string | null;

  // Validation cache
  validationResult: ValidationResult | null;

  // Actions
  startImport: (file: File, portfolioId: string) => Promise<void>;
  updateColumnMapping: (columnIndex: number, field: TransactionField | null) => void;
  applyBrokeragePreset: (brokerageId: string) => void;
  setDuplicateHandling: (handling: DuplicateHandling) => void;
  confirmImport: () => Promise<ImportResult>;
  cancelImport: () => void;
  downloadFailedRows: () => void;
  reset: () => void;
}

const initialState = {
  session: null,
  parseResult: null,
  isProcessing: false,
  progress: 0,
  error: null,
  validationResult: null,
};

export const useCsvImportStore = create<CsvImportState>((set, get) => ({
  ...initialState,

  startImport: async (file: File, portfolioId: string) => {
    set({ isProcessing: true, error: null, progress: 0 });

    try {
      // Parse file first to get raw data
      const parseResult = await parseCsvFile(file);

      // Start import session
      const session = await startImportSession(file, portfolioId);

      // Full validation
      const validationResult = validateRows(parseResult.rows, session.columnMappings);

      // Check for duplicates
      const duplicates = await detectDuplicates(validationResult.valid, portfolioId);

      // Update session with validation results
      const updatedSession: ImportSession = {
        ...session,
        validRowCount: validationResult.validCount,
        errorRowCount: validationResult.errorCount,
        errors: validationResult.errors,
        previewRows: validationResult.valid.slice(0, 10),
        duplicateCount: duplicates.length,
        duplicates,
        status:
          session.status === 'mapping_review'
            ? 'mapping_review'
            : duplicates.length > 0
            ? 'preview'
            : 'preview',
      };

      set({
        session: updatedSession,
        parseResult,
        validationResult,
        isProcessing: false,
        progress: 100,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to parse CSV file',
        isProcessing: false,
      });
    }
  },

  updateColumnMapping: (columnIndex: number, field: TransactionField | null) => {
    const { session, parseResult } = get();
    if (!session || !parseResult) return;

    const updatedMappings = updateColumnMapping(
      session.columnMappings,
      columnIndex,
      field
    );

    const canValidate = hasAllRequiredMappings(updatedMappings);
    const validationResult = canValidate
      ? validateRows(parseResult.rows, updatedMappings)
      : null;

    set({
      session: {
        ...session,
        columnMappings: updatedMappings,
        ...(validationResult && {
          validRowCount: validationResult.validCount,
          errorRowCount: validationResult.errorCount,
          errors: validationResult.errors,
          previewRows: validationResult.valid.slice(0, 10),
        }),
        status: canValidate ? 'preview' : 'mapping_review',
      },
      validationResult,
    });
  },

  applyBrokeragePreset: (brokerageId: string) => {
    const { session, parseResult } = get();
    if (!session || !parseResult) return;

    const format = getBrokerageFormatById(brokerageId);
    if (!format) return;

    const brokerageColumnMap = getBrokerageColumnMappings(format, session.detectedHeaders);

    const updatedMappings: ColumnMapping[] = session.columnMappings.map((mapping, index) => {
      const field = brokerageColumnMap.get(index) ?? null;
      return {
        ...mapping,
        transactionField: field,
        confidence: field !== null ? 1.0 : 0,
        isUserOverride: true,
      };
    });

    const canValidate = hasAllRequiredMappings(updatedMappings);
    const validationResult = canValidate
      ? validateRows(parseResult.rows, updatedMappings)
      : null;

    const detectedBrokerage = { id: format.id, name: format.name, confidence: 1.0 };

    set({
      session: {
        ...session,
        columnMappings: updatedMappings,
        detectedBrokerage,
        ...(validationResult && {
          validRowCount: validationResult.validCount,
          errorRowCount: validationResult.errorCount,
          errors: validationResult.errors,
          previewRows: validationResult.valid.slice(0, 10),
        }),
        status: canValidate ? 'preview' : 'mapping_review',
      },
      validationResult,
    });
  },

  setDuplicateHandling: (handling: DuplicateHandling) => {
    const { session } = get();
    if (!session) return;

    set({
      session: {
        ...session,
        duplicateHandling: handling,
      },
    });
  },

  confirmImport: async () => {
    const { session, validationResult } = get();
    if (!session || !validationResult) {
      throw new Error('No active import session');
    }

    set({ isProcessing: true, progress: 0 });

    try {
      // Update session status
      set({
        session: {
          ...session,
          status: 'importing',
        },
      });

      const result = await executeImport(
        session,
        validationResult.valid,
        session.duplicates,
        session.duplicateHandling,
        (progress) => set({ progress })
      );

      // Update session with final results
      set({
        session: {
          ...session,
          status: result.success ? 'completed' : 'error',
          importedCount: result.importedCount,
          completedAt: new Date(),
        },
        isProcessing: false,
        progress: 100,
      });

      return result;
    } catch (error) {
      set({
        session: {
          ...session,
          status: 'error',
        },
        error: error instanceof Error ? error.message : 'Import failed',
        isProcessing: false,
      });
      throw error;
    }
  },

  cancelImport: () => {
    const { session } = get();
    if (session) {
      set({
        session: {
          ...session,
          status: 'cancelled',
        },
      });
    }
    // Don't reset state immediately - let UI handle transition
  },

  downloadFailedRows: () => {
    const { session, validationResult } = get();
    if (!session || !validationResult) return;

    // Collect failed rows from errors
    const failedRows = validationResult.errors.map((e) => e.originalData);

    if (failedRows.length === 0) return;

    // Generate CSV
    const csv = generateCsv(failedRows);

    // Create and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `failed_rows_${session.fileName}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  reset: () => {
    set(initialState);
  },
}));
