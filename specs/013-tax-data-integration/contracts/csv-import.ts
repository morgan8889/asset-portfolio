/**
 * CSV Import Contracts for Tax Data
 * Feature: 013-tax-data-integration
 *
 * Defines interfaces for importing tax-specific transaction data via CSV.
 */

import { Decimal } from 'decimal.js';

// ============================================================================
// Column Mapping
// ============================================================================

/**
 * Extended CSV import mapping including tax-specific fields
 */
export interface CSVImportMapping {
  // === EXISTING REQUIRED FIELDS ===
  date: string;              // Maps to transaction.date
  symbol: string;            // Maps to transaction.assetId (via symbol lookup)
  type: string;              // Maps to transaction.type
  quantity: string;          // Maps to transaction.quantity
  price: string;             // Maps to transaction.price

  // === EXISTING OPTIONAL FIELDS ===
  fees?: string;             // Maps to transaction.fees
  notes?: string;            // Maps to transaction.notes
  currency?: string;         // Maps to transaction.currency

  // === NEW TAX FIELDS ===
  grantDate?: string;        // Maps to transaction.grantDate
  vestingDate?: string;      // Maps to transaction.vestingDate
  discountPercent?: string;  // Maps to transaction.discountPercent
  sharesWithheld?: string;   // Maps to transaction.sharesWithheld
  ordinaryIncomeAmount?: string;  // Maps to transaction.ordinaryIncomeAmount
  fmvAtVest?: string;        // Optional: Used to calculate ordinaryIncomeAmount
}

/**
 * Column detection result for tax fields
 */
export interface TaxColumnDetectionResult {
  /** Standard detection result */
  mappings: CSVImportMapping;

  /** Fields that were auto-detected */
  detectedFields: (keyof CSVImportMapping)[];

  /** Fields that require manual mapping */
  missingRequiredFields: (keyof CSVImportMapping)[];

  /** Tax-specific detection confidence */
  taxFieldConfidence: Record<string, number>;  // 0.0-1.0

  /** Detected import type (helps with validation) */
  detectedImportType?: 'espp' | 'rsu' | 'stock_option' | 'standard';

  /** Whether "Shares Withheld" column detected (indicates Gross Shares import) */
  isGrossSharesImport: boolean;
}

// ============================================================================
// Column Patterns
// ============================================================================

/**
 * Pattern definitions for detecting tax-related columns
 */
export interface TaxColumnPatterns {
  grantDate: string[];
  vestingDate: string[];
  discountPercent: string[];
  sharesWithheld: string[];
  ordinaryIncomeAmount: string[];
  fmvAtVest: string[];
}

/**
 * Default tax column patterns (case-insensitive matching)
 */
export const TAX_COLUMN_PATTERNS: TaxColumnPatterns = {
  grantDate: [
    'grant date',
    'award date',
    'date granted',
    'grant_date',
    'award_date',
    'purchase date',
    'acquisition date',
    'offering date',
    'issuance date',
    'grant dt',
  ],

  vestingDate: [
    'vest date',
    'vesting date',
    'vested date',
    'release date',
    'vest_date',
    'date vested',
    'settlement date',
    'delivery date',
  ],

  discountPercent: [
    'discount',
    'discount %',
    'discount percent',
    'discount_pct',
    'espp discount',
    'purchase discount',
    'discount rate',
  ],

  sharesWithheld: [
    'shares withheld',
    'withheld shares',
    'shares_withheld',
    'tax shares',
    'shares sold to cover',
    'shares for taxes',
    'withholding shares',
    'net shares withheld',
    'shares withheld for tax',
    'tax withholding qty',
  ],

  ordinaryIncomeAmount: [
    'ordinary income',
    'income',
    'compensation income',
    'taxable income',
    'income recognized',
    'ordinary_income',
    'w2 income',
    'income amount',
    'compensation',
    'bargain element',
    'income value',
  ],

  fmvAtVest: [
    'fmv',
    'fair market value',
    'fmv at vest',
    'fmv per share',
    'market price',
    'stock price',
    'vest price',
    'fmv_per_share',
  ],
};

// ============================================================================
// Validation
// ============================================================================

/**
 * Validation rules for tax-specific CSV fields
 */
export interface TaxFieldValidationRules {
  grantDate: DateValidationRule;
  vestingDate: DateValidationRule;
  discountPercent: NumericValidationRule;
  sharesWithheld: NumericValidationRule;
  ordinaryIncomeAmount: NumericValidationRule;
}

export interface DateValidationRule {
  required: boolean;
  mustBePast: boolean;
  maxDate?: Date;
  minDate?: Date;
  relatedField?: {
    field: string;
    relation: 'before' | 'after' | 'equal';
  };
}

export interface NumericValidationRule {
  required: boolean;
  min: number;
  max: number;
  allowNegative: boolean;
  relatedField?: {
    field: string;
    relation: 'less_than' | 'greater_than' | 'equal';
  };
}

/**
 * Default validation rules for tax fields
 */
export const TAX_FIELD_VALIDATION: TaxFieldValidationRules = {
  grantDate: {
    required: false,
    mustBePast: true,
    relatedField: {
      field: 'vestingDate',
      relation: 'before',  // grantDate must be before vestingDate
    },
  },

  vestingDate: {
    required: false,
    mustBePast: true,
    relatedField: {
      field: 'date',
      relation: 'before',  // vestingDate must be before transaction date
    },
  },

  discountPercent: {
    required: false,
    min: 0,
    max: 0.5,  // 50% maximum (regulatory limit typically 15%)
    allowNegative: false,
  },

  sharesWithheld: {
    required: false,
    min: 0,
    max: Infinity,
    allowNegative: false,
    relatedField: {
      field: 'quantity',
      relation: 'less_than',  // sharesWithheld must be <= quantity
    },
  },

  ordinaryIncomeAmount: {
    required: false,
    min: 0,
    max: Infinity,
    allowNegative: false,
  },
};

// ============================================================================
// Import Session Extensions
// ============================================================================

/**
 * Extended import session with tax-specific metadata
 */
export interface TaxAwareImportSession {
  /** Base import session fields */
  id: string;
  portfolioId: string;
  status: ImportSessionStatus;
  fileName: string;
  fileSize: number;
  totalRows: number;
  createdAt: Date;

  /** CSV parsing results */
  detectedDelimiter: string;
  detectedHeaders: string[];
  columnMappings: CSVImportMapping;

  /** Tax-specific detection */
  taxDetection: {
    hasTaxFields: boolean;
    detectedImportType?: 'espp' | 'rsu' | 'stock_option' | 'standard';
    isGrossSharesImport: boolean;
    taxFieldConfidence: Record<string, number>;
  };

  /** Validation results */
  previewRows: ParsedRow[];
  validRowCount: number;
  errorRowCount: number;
  errors: ImportError[];

  /** Duplicate detection */
  duplicateCount: number;
  duplicates: DuplicateMatch[];
  duplicateHandling: DuplicateHandling;
}

export type ImportSessionStatus =
  | 'detecting'
  | 'mapping_review'
  | 'preview'
  | 'validating'
  | 'duplicate_review'
  | 'importing'
  | 'complete'
  | 'error';

// ============================================================================
// Parsed Row Extensions
// ============================================================================

/**
 * Extended parsed row with tax metadata
 */
export interface TaxAwareParsedRow {
  /** Row metadata */
  rowNumber: number;
  raw: Record<string, string>;

  /** Parsed standard fields */
  parsed: {
    date?: Date;
    symbol?: string;
    type?: TransactionType;
    quantity?: Decimal;
    price?: Decimal;
    fees?: Decimal;
    notes?: string;
    currency?: string;

    // Tax fields
    grantDate?: Date;
    vestingDate?: Date;
    discountPercent?: Decimal;
    sharesWithheld?: Decimal;
    ordinaryIncomeAmount?: Decimal;
  };

  /** Validation status */
  isValid: boolean;
  errors: string[];
  warnings: string[];

  /** Tax-specific flags */
  taxFlags?: {
    isEspp: boolean;
    isRsu: boolean;
    isGrossShares: boolean;
    hasWithholding: boolean;
  };
}

// ============================================================================
// Conflict Resolution
// ============================================================================

/**
 * Strategies for resolving column mapping conflicts
 */
export type ColumnMappingConflict =
  | 'ambiguous_date'        // Multiple date columns without qualifiers
  | 'ambiguous_income'      // "Income" without "ordinary" qualifier
  | 'ambiguous_shares'      // "Shares" without "gross"/"net"/"withheld"
  | 'missing_qualifier';

export interface ConflictResolutionStrategy {
  conflict: ColumnMappingConflict;
  detectedColumns: string[];
  suggestedMapping?: Record<string, string>;
  requiresUserInput: boolean;
  resolution?: 'auto' | 'manual' | 'skip';
}

/**
 * Auto-resolution rules for common conflicts
 */
export const AUTO_RESOLUTION_RULES: Record<ColumnMappingConflict, (columns: string[]) => string | null> = {
  ambiguous_date: (columns) => {
    // Prioritize columns with "grant" or "vest" qualifier
    const grantCol = columns.find(c => /grant|award/i.test(c));
    if (grantCol) return grantCol;
    return null;  // Require user input
  },

  ambiguous_income: (columns) => {
    // Only auto-map if "ordinary" or "compensation" present
    const ordinaryCol = columns.find(c => /ordinary|compensation|w2/i.test(c));
    return ordinaryCol || null;
  },

  ambiguous_shares: (columns) => {
    // Check for explicit "gross" or "withheld"
    const withheldCol = columns.find(c => /withheld|tax.*share/i.test(c));
    if (withheldCol) return withheldCol;
    return null;
  },

  missing_qualifier: (_columns) => null,  // Always require user input
};

// ============================================================================
// Import Type Detection
// ============================================================================

/**
 * Heuristics for detecting import type based on mapped columns
 */
export function detectImportType(mappings: CSVImportMapping): 'espp' | 'rsu' | 'stock_option' | 'standard' {
  const hasDiscount = !!mappings.discountPercent;
  const hasGrant = !!mappings.grantDate;
  const hasVest = !!mappings.vestingDate;
  const hasWithheld = !!mappings.sharesWithheld;

  // ESPP: Has discount and grant date
  if (hasDiscount && hasGrant) {
    return 'espp';
  }

  // RSU: Has vesting date and withholding
  if (hasVest && hasWithheld) {
    return 'rsu';
  }

  // Stock option: Has grant and vest but no discount
  if (hasGrant && hasVest && !hasDiscount) {
    return 'stock_option';
  }

  return 'standard';
}

/**
 * Determine if import represents Gross Shares (before withholding)
 */
export function isGrossSharesImport(mappings: CSVImportMapping): boolean {
  return !!mappings.sharesWithheld;
}

// ============================================================================
// Gross/Net Share Calculation
// ============================================================================

/**
 * Calculate gross and net shares based on import type
 */
export interface SharesCalculation {
  grossShares: Decimal;
  netShares: Decimal;
  sharesWithheld: Decimal;
}

export function calculateShares(
  quantity: Decimal,
  sharesWithheld?: Decimal
): SharesCalculation {
  if (sharesWithheld && sharesWithheld.greaterThan(0)) {
    // Gross shares import: quantity is NET, calculate GROSS
    return {
      grossShares: quantity.plus(sharesWithheld),
      netShares: quantity,
      sharesWithheld: sharesWithheld,
    };
  } else {
    // Net shares import or no withholding
    return {
      grossShares: quantity,
      netShares: quantity,
      sharesWithheld: new Decimal(0),
    };
  }
}

// ============================================================================
// Discount Normalization
// ============================================================================

/**
 * Normalize discount percent to decimal format (0.0-0.5)
 */
export function normalizeDiscountPercent(value: string | number): Decimal {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // If value > 1, assume percentage format (e.g., 15 = 15%)
  if (numValue > 1) {
    return new Decimal(numValue).dividedBy(100);
  }

  // Otherwise, already in decimal format (e.g., 0.15 = 15%)
  return new Decimal(numValue);
}

// ============================================================================
// Placeholder Types
// ============================================================================

// These would normally be imported from existing types:
type TransactionType = any;  // import from '@/types/transaction'
type ImportError = any;      // import from '@/types/csv-import'
type DuplicateMatch = any;   // import from '@/types/csv-import'
type DuplicateHandling = any; // import from '@/types/csv-import'
type ParsedRow = any;        // import from '@/types/csv-import'
