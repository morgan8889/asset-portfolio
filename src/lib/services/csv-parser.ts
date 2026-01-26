/**
 * CSV Parser Service
 *
 * Parses CSV files using papaparse with automatic delimiter detection.
 * Handles header normalization and basic preprocessing.
 */

import Papa from 'papaparse';
import type { CsvParserResult } from '@/types/csv-import';
import { csvFileSchema } from '@/lib/utils/validation';

/** Common Papa.parse configuration */
const PAPA_CONFIG = {
  header: true,
  skipEmptyLines: true,
  transformHeader: (header: string) => header.trim(),
  dynamicTyping: false, // Keep as strings, we'll convert with decimal.js
} as const;

/**
 * Process parsed results and return structured result or throw on error.
 */
function processParseResults(
  results: Papa.ParseResult<Record<string, string>>,
  source: string
): CsvParserResult {
  // Check for critical parsing errors
  const criticalError = results.errors.find(
    (e) => e.type === 'Delimiter' || e.type === 'FieldMismatch'
  );
  if (criticalError) {
    throw new Error(`CSV parsing error: ${criticalError.message}`);
  }

  const headers = results.meta.fields || [];
  if (headers.length === 0) {
    throw new Error(`CSV ${source} has no headers`);
  }

  const rows = results.data;
  if (rows.length === 0) {
    throw new Error(`CSV ${source} has no data rows`);
  }

  return {
    headers,
    rows,
    delimiter: results.meta.delimiter as ',' | ';' | '\t',
    rowCount: rows.length,
  };
}

/**
 * Parse a CSV file and return structured result.
 */
export async function parseCsvFile(file: File): Promise<CsvParserResult> {
  const validation = csvFileSchema.safeParse({
    name: file.name,
    size: file.size,
    type: file.type,
  });

  if (!validation.success) {
    throw new Error(validation.error.errors[0]?.message || 'Invalid file');
  }

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      ...PAPA_CONFIG,
      complete: (results) => {
        try {
          resolve(processParseResults(results, 'file'));
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(new Error(`Failed to parse CSV: ${error.message}`));
      },
    });
  });
}

/**
 * Parse CSV content from a string (useful for testing).
 */
export function parseCsvString(content: string): CsvParserResult {
  const results = Papa.parse(content, PAPA_CONFIG) as Papa.ParseResult<
    Record<string, string>
  >;
  return processParseResults(results, 'content');
}

/**
 * Generate CSV content from an array of objects.
 * Used for exporting failed rows.
 *
 * @param data - Array of objects to convert to CSV
 * @param columns - Optional specific columns to include (in order)
 * @returns CSV content as string
 */
export function generateCsv(
  data: Record<string, string>[],
  columns?: string[]
): string {
  if (data.length === 0) {
    return '';
  }

  // Use provided columns or extract from first row
  const headers = columns || Object.keys(data[0]);

  return Papa.unparse(data, {
    columns: headers,
    header: true,
  });
}

/**
 * Get a preview of the CSV data (first N rows).
 *
 * @param result - Full CSV parser result
 * @param maxRows - Maximum number of rows to return (default 10)
 * @returns Subset of the parser result with limited rows
 */
export function getPreviewData(
  result: CsvParserResult,
  maxRows: number = 10
): CsvParserResult {
  return {
    ...result,
    rows: result.rows.slice(0, maxRows),
    rowCount: Math.min(result.rowCount, maxRows),
  };
}

/**
 * Validate that the CSV has minimum required structure.
 *
 * @param result - CSV parser result to validate
 * @returns Object with isValid flag and optional error messages
 */
export function validateCsvStructure(result: CsvParserResult): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check minimum headers
  if (result.headers.length < 4) {
    errors.push(
      'CSV must have at least 4 columns (date, symbol, quantity, price)'
    );
  }

  // Check for data
  if (result.rowCount === 0) {
    errors.push('CSV has no data rows');
  }

  // Check for empty headers
  const emptyHeaders = result.headers.filter((h) => !h || h.trim() === '');
  if (emptyHeaders.length > 0) {
    errors.push('CSV contains empty column headers');
  }

  // Check for duplicate headers
  const uniqueHeaders = new Set(result.headers.map((h) => h.toLowerCase()));
  if (uniqueHeaders.size !== result.headers.length) {
    errors.push('CSV contains duplicate column headers');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
