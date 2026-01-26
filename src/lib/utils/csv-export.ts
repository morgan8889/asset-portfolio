/**
 * CSV Export Utility
 *
 * Utilities for generating CSV files from data, primarily for
 * exporting failed import rows for user review and correction.
 */

import { generateCsv } from '@/lib/services/csv-parser';
import type { ImportError, ParsedRow } from '@/types/csv-import';

export interface CsvExportOptions {
  includeRowNumbers?: boolean;
  includeErrorMessages?: boolean;
  fileName?: string;
}

/**
 * Generate CSV content from failed rows with optional row numbers and error messages.
 */
export function generateFailedRowsCsv(
  errors: ImportError[],
  {
    includeRowNumbers = true,
    includeErrorMessages = true,
  }: CsvExportOptions = {}
): string {
  // Group errors by row number
  const rowsMap = new Map<
    number,
    { data: Record<string, string>; errors: string[] }
  >();

  for (const error of errors) {
    const existing = rowsMap.get(error.rowNumber);
    const errorMsg = `${error.field}: ${error.message}`;
    if (existing) {
      existing.errors.push(errorMsg);
    } else {
      rowsMap.set(error.rowNumber, {
        data: { ...error.originalData },
        errors: [errorMsg],
      });
    }
  }

  // Convert to sorted array with optional columns
  const rows = Array.from(rowsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([rowNumber, { data, errors: rowErrors }]) => ({
      ...(includeRowNumbers && { 'Original Row': String(rowNumber) }),
      ...data,
      ...(includeErrorMessages && { 'Error Messages': rowErrors.join('; ') }),
    }));

  return generateCsv(rows);
}

/**
 * Generate CSV from parsed rows (for valid or all rows)
 */
export function generateParsedRowsCsv(rows: ParsedRow[]): string {
  const data = rows.map((row) => row.raw);
  return generateCsv(data);
}

/**
 * Trigger browser download of CSV content
 */
export function downloadCsv(
  csvContent: string,
  fileName: string = 'export.csv'
): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export failed rows to CSV and trigger download
 */
export function exportFailedRows(
  errors: ImportError[],
  originalFileName: string = 'import.csv',
  options: CsvExportOptions = {}
): void {
  const csvContent = generateFailedRowsCsv(errors, options);

  // Generate download filename
  const baseName = originalFileName.replace(/\.csv$/i, '');
  const fileName = options.fileName ?? `${baseName}_failed_rows.csv`;

  downloadCsv(csvContent, fileName);
}

/**
 * Format error summary for display or export
 */
export function formatErrorSummary(errors: ImportError[]): string {
  const grouped = new Map<string, number>();

  for (const error of errors) {
    const key = `${error.field}: ${error.message}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  const lines: string[] = [];
  for (const [message, count] of grouped.entries()) {
    lines.push(`${message} (${count} occurrence${count > 1 ? 's' : ''})`);
  }

  return lines.join('\n');
}

/**
 * Calculate error statistics
 */
export function getErrorStatistics(errors: ImportError[]): {
  totalErrors: number;
  errorsByField: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  affectedRows: number;
} {
  const errorsByField: Record<string, number> = {};
  const errorsBySeverity: Record<string, number> = {};
  const affectedRowNumbers = new Set<number>();

  for (const error of errors) {
    errorsByField[error.field] = (errorsByField[error.field] ?? 0) + 1;
    errorsBySeverity[error.severity] =
      (errorsBySeverity[error.severity] ?? 0) + 1;
    affectedRowNumbers.add(error.rowNumber);
  }

  return {
    totalErrors: errors.length,
    errorsByField,
    errorsBySeverity,
    affectedRows: affectedRowNumbers.size,
  };
}
