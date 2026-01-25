/**
 * CSV Validator Service
 *
 * Validates parsed CSV rows against expected transaction format.
 * Converts raw string values to typed values using decimal.js for precision.
 */

import Decimal from 'decimal.js';
import type {
  ColumnMapping,
  ParsedRow,
  FieldError,
  ImportError,
  ValidationResult,
  TransactionField,
} from '@/types/csv-import';
import type { TransactionType } from '@/types/transaction';
import { parseDate, validateTransactionDate } from '@/lib/utils/date-parser';
import { TYPE_KEYWORDS, csvSymbolSchema } from '@/lib/utils/validation';
import { getMappingForField } from './column-detector';

/**
 * Validate all CSV rows and return parsed results.
 *
 * @param rows - Raw CSV rows (Record<header, value>)
 * @param mappings - Column mappings
 * @returns Validation result with valid rows and errors
 */
export function validateRows(
  rows: Record<string, string>[],
  mappings: ColumnMapping[]
): ValidationResult {
  const valid: ParsedRow[] = [];
  const errors: ImportError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // +2 for header row (1) and 0-index
    const row = rows[i];

    const parsedRow = validateRow(row, mappings, rowNumber);

    if (parsedRow.isValid) {
      valid.push(parsedRow);
    } else {
      // Convert field errors to import errors
      for (const fieldError of parsedRow.errors) {
        errors.push({
          rowNumber,
          originalData: row,
          field: fieldError.field,
          value: fieldError.value,
          message: fieldError.message,
          severity: 'error',
        });
      }
    }
  }

  return {
    valid,
    errors,
    validCount: valid.length,
    errorCount: errors.length,
  };
}

/**
 * Validate a single CSV row.
 *
 * @param row - Raw CSV row
 * @param mappings - Column mappings
 * @param rowNumber - Row number in original file
 * @returns Parsed row with validation status
 */
export function validateRow(
  row: Record<string, string>,
  mappings: ColumnMapping[],
  rowNumber: number
): ParsedRow {
  const errors: FieldError[] = [];
  const parsed: ParsedRow['parsed'] = {
    date: null,
    symbol: null,
    type: null,
    quantity: null,
    price: null,
    fees: null,
    notes: null,
  };

  // Extract values based on mappings
  const getValue = (field: TransactionField): string => {
    const mapping = getMappingForField(mappings, field);
    if (!mapping) return '';
    return row[mapping.csvColumn]?.trim() || '';
  };

  // Validate date (required)
  const dateValue = getValue('date');
  if (!dateValue) {
    errors.push({
      field: 'date',
      value: '',
      message: 'Date is required',
    });
  } else {
    const parsedDate = parseDate(dateValue);
    if (!parsedDate) {
      errors.push({
        field: 'date',
        value: dateValue,
        message: `Could not parse date '${dateValue}'. Expected formats: YYYY-MM-DD, MM/DD/YYYY, etc.`,
      });
    } else {
      const dateValidation = validateTransactionDate(parsedDate);
      if (!dateValidation.isValid) {
        errors.push({
          field: 'date',
          value: dateValue,
          message: dateValidation.warning || 'Invalid date',
        });
      } else {
        parsed.date = parsedDate;
        // Note: warnings are not blocking, but could be tracked separately
      }
    }
  }

  // Validate symbol (required)
  const symbolValue = getValue('symbol');
  if (!symbolValue) {
    errors.push({
      field: 'symbol',
      value: '',
      message: 'Symbol is required',
    });
  } else {
    const symbolResult = csvSymbolSchema.safeParse(symbolValue.toUpperCase());
    if (!symbolResult.success) {
      errors.push({
        field: 'symbol',
        value: symbolValue,
        message: symbolResult.error.errors[0]?.message || 'Invalid symbol',
      });
    } else {
      parsed.symbol = symbolValue.toUpperCase();
    }
  }

  // Validate quantity (required)
  const quantityValue = getValue('quantity');
  if (!quantityValue) {
    errors.push({
      field: 'quantity',
      value: '',
      message: 'Quantity is required',
    });
  } else {
    const parsedQuantity = parseNumericValue(quantityValue);
    if (parsedQuantity === null) {
      errors.push({
        field: 'quantity',
        value: quantityValue,
        message: `Quantity '${quantityValue}' is not a valid number`,
      });
    } else if (parsedQuantity.isZero()) {
      errors.push({
        field: 'quantity',
        value: quantityValue,
        message: 'Quantity cannot be zero',
      });
    } else {
      parsed.quantity = parsedQuantity;
    }
  }

  // Validate price (required)
  const priceValue = getValue('price');
  if (!priceValue) {
    errors.push({
      field: 'price',
      value: '',
      message: 'Price is required',
    });
  } else {
    const parsedPrice = parseNumericValue(priceValue);
    if (parsedPrice === null) {
      errors.push({
        field: 'price',
        value: priceValue,
        message: `Price '${priceValue}' is not a valid number`,
      });
    } else if (parsedPrice.isNegative()) {
      errors.push({
        field: 'price',
        value: priceValue,
        message: 'Price cannot be negative',
      });
    } else {
      parsed.price = parsedPrice;
    }
  }

  // Validate type (optional, inferred from quantity if not provided)
  const typeValue = getValue('type');
  if (typeValue) {
    const mappedType = mapTransactionType(typeValue);
    if (mappedType) {
      parsed.type = mappedType;
    }
    // Don't error if type is unknown - we can infer it
  }

  // Infer type from quantity if not provided
  if (!parsed.type && parsed.quantity) {
    parsed.type = parsed.quantity.isPositive() ? 'buy' : 'sell';
  }

  // Validate fees (optional)
  const feesValue = getValue('fees');
  if (feesValue) {
    const parsedFees = parseNumericValue(feesValue);
    if (parsedFees === null) {
      // Non-blocking: warn but don't fail the row
      parsed.fees = new Decimal(0);
    } else if (parsedFees.isNegative()) {
      parsed.fees = new Decimal(0);
    } else {
      parsed.fees = parsedFees;
    }
  } else {
    parsed.fees = new Decimal(0);
  }

  // Notes (optional, no validation needed)
  const notesValue = getValue('notes');
  if (notesValue) {
    parsed.notes = notesValue.slice(0, 1000); // Truncate if too long
  }

  return {
    rowNumber,
    raw: row,
    parsed,
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Parse a numeric value, handling common formats like currency symbols.
 *
 * @param value - String value to parse
 * @returns Decimal value or null if unparseable
 */
export function parseNumericValue(value: string): Decimal | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  // Remove currency symbols, commas, and whitespace
  const cleaned = value
    .replace(/[$€£¥,\s]/g, '')
    .replace(/\(([^)]+)\)/, '-$1') // Handle (100) as -100
    .trim();

  if (!cleaned) {
    return null;
  }

  try {
    const decimal = new Decimal(cleaned);
    if (decimal.isNaN()) {
      return null;
    }
    return decimal;
  } catch {
    return null;
  }
}

/**
 * Map a CSV type value to a TransactionType.
 *
 * @param value - Raw type value from CSV
 * @returns Mapped transaction type or null
 */
export function mapTransactionType(value: string): TransactionType | null {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().trim();

  // Check direct mapping
  if (normalized in TYPE_KEYWORDS) {
    return TYPE_KEYWORDS[normalized] as TransactionType;
  }

  // Check if value contains a keyword
  for (const [keyword, type] of Object.entries(TYPE_KEYWORDS)) {
    if (normalized.includes(keyword)) {
      return type as TransactionType;
    }
  }

  return null;
}

/**
 * Get validation summary for a set of rows.
 *
 * @param result - Validation result
 * @returns Human-readable summary
 */
export function getValidationSummary(result: ValidationResult): string {
  const total = result.validCount + result.errorCount;
  const successRate = total > 0 ? ((result.validCount / total) * 100).toFixed(1) : '0';

  if (result.errorCount === 0) {
    return `All ${result.validCount} rows are valid and ready to import.`;
  }

  return `${result.validCount} of ${total} rows are valid (${successRate}%). ${result.errorCount} rows have errors.`;
}

/**
 * Group errors by field for summary display.
 *
 * @param errors - Array of import errors
 * @returns Errors grouped by field
 */
export function groupErrorsByField(
  errors: ImportError[]
): Record<TransactionField, ImportError[]> {
  const grouped: Record<TransactionField, ImportError[]> = {
    date: [],
    symbol: [],
    type: [],
    quantity: [],
    price: [],
    fees: [],
    notes: [],
  };

  for (const error of errors) {
    if (error.field in grouped) {
      grouped[error.field].push(error);
    }
  }

  return grouped;
}
