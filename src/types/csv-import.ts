/**
 * CSV Import Types
 *
 * Type definitions for the CSV Transaction Import feature.
 * Supports automatic column detection, validation, duplicate detection,
 * and import orchestration.
 */

import type { Decimal } from 'decimal.js';
import type { TransactionType } from '@/types/transaction';

// ============================================================================
// Import Session
// ============================================================================

export type ImportSessionStatus =
  | 'file_selected'
  | 'parsing'
  | 'detecting'
  | 'mapping_review'
  | 'validating'
  | 'preview'
  | 'importing'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface ImportSession {
  id: string;
  portfolioId: string;
  status: ImportSessionStatus;
  fileName: string;
  fileSize: number;
  totalRows: number;
  createdAt: Date;

  detectedDelimiter: ',' | ';' | '\t';
  detectedHeaders: string[];
  columnMappings: ColumnMapping[];

  /** Detected brokerage format, if any */
  detectedBrokerage?: {
    id: string;
    name: string;
    confidence: number;
  };

  previewRows: ParsedRow[];

  validRowCount: number;
  errorRowCount: number;
  errors: ImportError[];

  duplicateCount: number;
  duplicates: DuplicateMatch[];
  duplicateHandling: DuplicateHandling;

  importedCount?: number;
  completedAt?: Date;
}

// ============================================================================
// Column Mapping
// ============================================================================

export type TransactionField =
  | 'date'
  | 'symbol'
  | 'type'
  | 'quantity'
  | 'price'
  | 'fees'
  | 'notes'
  | 'grantDate'
  | 'vestingDate'
  | 'discountPercent'
  | 'sharesWithheld'
  | 'ordinaryIncomeAmount';

export const REQUIRED_FIELDS: TransactionField[] = [
  'date',
  'symbol',
  'quantity',
  'price',
];

export const OPTIONAL_FIELDS: TransactionField[] = [
  'type',
  'fees',
  'notes',
  'grantDate',
  'vestingDate',
  'discountPercent',
  'sharesWithheld',
  'ordinaryIncomeAmount',
];

export const ALL_FIELDS: TransactionField[] = [
  ...REQUIRED_FIELDS,
  ...OPTIONAL_FIELDS,
];

/**
 * Field display labels for UI components.
 */
export const FIELD_LABELS: Record<TransactionField, string> = {
  date: 'Date',
  symbol: 'Symbol/Ticker',
  type: 'Transaction Type',
  quantity: 'Quantity',
  price: 'Price',
  fees: 'Fees/Commission',
  notes: 'Notes',
  grantDate: 'Grant Date',
  vestingDate: 'Vesting Date',
  discountPercent: 'Discount %',
  sharesWithheld: 'Shares Withheld',
  ordinaryIncomeAmount: 'Ordinary Income',
};

export interface ColumnMapping {
  csvColumn: string;
  csvColumnIndex: number;
  transactionField: TransactionField | null;
  confidence: number;
  isUserOverride: boolean;
}

// ============================================================================
// Parsed Row
// ============================================================================

export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, string>;
  parsed: {
    date: Date | null;
    symbol: string | null;
    type: TransactionType | null;
    quantity: Decimal | null;
    price: Decimal | null;
    fees: Decimal | null;
    notes: string | null;
    // Tax fields
    grantDate: Date | null;
    vestingDate: Date | null;
    discountPercent: Decimal | null;
    sharesWithheld: Decimal | null;
    ordinaryIncomeAmount: Decimal | null;
  };
  isValid: boolean;
  errors: FieldError[];
}

export interface FieldError {
  field: TransactionField;
  value: string;
  message: string;
}

// ============================================================================
// Import Error
// ============================================================================

export type ErrorSeverity = 'error' | 'warning';

export interface ImportError {
  rowNumber: number;
  originalData: Record<string, string>;
  field: TransactionField;
  value: string;
  message: string;
  severity: ErrorSeverity;
}

// ============================================================================
// Duplicate Detection
// ============================================================================

export type DuplicateHandling = 'skip' | 'import' | 'review';

export type MatchConfidence = 'exact' | 'likely';

export interface DuplicateMatch {
  importRowNumber: number;
  importData: ParsedRow;
  existingTransaction: {
    id: string;
    date: Date;
    symbol: string;
    type: TransactionType;
    quantity: Decimal;
    price: Decimal;
  };
  matchConfidence: MatchConfidence;
}

// ============================================================================
// Import Result
// ============================================================================

export interface ImportResult {
  sessionId: string;
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedDuplicates: number;
  errorCount: number;
  errors: ImportError[];
  transactionIds: string[];
  failedRowsCsv?: string;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface CsvParserResult {
  headers: string[];
  rows: Record<string, string>[];
  delimiter: ',' | ';' | '\t';
  rowCount: number;
}

export interface ColumnDetectionResult {
  mappings: ColumnMapping[];
  unmappedColumns: string[];
  missingRequiredFields: TransactionField[];
  /** Detected brokerage format, if any */
  detectedBrokerage?: {
    id: string;
    name: string;
    confidence: number;
  };
}

export interface ValidationResult {
  valid: ParsedRow[];
  errors: ImportError[];
  validCount: number;
  errorCount: number;
}

// ============================================================================
// Component Props
// ============================================================================

export interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  onImportComplete?: (result: ImportResult) => void;
}

export interface ColumnMappingEditorProps {
  mappings: ColumnMapping[];
  previewRows: ParsedRow[];
  onMappingChange: (
    columnIndex: number,
    field: TransactionField | null
  ) => void;
  requiredFieldsMissing: TransactionField[];
}

export interface ImportPreviewTableProps {
  rows: ParsedRow[];
  errors: ImportError[];
  maxRows?: number;
}

export interface ImportResultsProps {
  result: ImportResult;
  onClose: () => void;
  onDownloadFailed: () => void;
}
