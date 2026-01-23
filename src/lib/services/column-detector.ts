/**
 * Column Detector Service
 *
 * Automatically detects column mappings from CSV headers using
 * keyword matching and data pattern validation.
 */

import type {
  ColumnMapping,
  ColumnDetectionResult,
  TransactionField,
} from '@/types/csv-import';
import { REQUIRED_FIELDS, OPTIONAL_FIELDS } from '@/types/csv-import';
import { HEADER_KEYWORDS } from '@/lib/utils/validation';
import { parseDate } from '@/lib/utils/date-parser';

/**
 * Detect column mappings from CSV headers.
 *
 * Uses a two-pass approach:
 * 1. Header name matching (case-insensitive)
 * 2. Data pattern validation for confidence scoring
 *
 * @param headers - Array of CSV column headers
 * @param sampleRows - Optional sample rows for data pattern validation
 * @returns Detection result with mappings and any issues
 */
export function detectColumnMappings(
  headers: string[],
  sampleRows?: Record<string, string>[]
): ColumnDetectionResult {
  const mappings: ColumnMapping[] = [];
  const usedFields = new Set<TransactionField>();

  // Pass 1: Header name matching
  for (let index = 0; index < headers.length; index++) {
    const header = headers[index];
    const normalizedHeader = header.toLowerCase().trim();

    let bestMatch: TransactionField | null = null;
    let confidence = 0;

    // Check each field's keywords
    for (const [field, keywords] of Object.entries(HEADER_KEYWORDS)) {
      const fieldName = field as TransactionField;

      // Skip if this field is already mapped
      if (usedFields.has(fieldName)) {
        continue;
      }

      for (const keyword of keywords) {
        // Exact match (highest confidence)
        if (normalizedHeader === keyword) {
          if (confidence < 1.0) {
            bestMatch = fieldName;
            confidence = 1.0;
          }
          break;
        }

        // Contains match (lower confidence)
        if (normalizedHeader.includes(keyword) && confidence < 0.8) {
          bestMatch = fieldName;
          confidence = 0.8;
        }

        // Starts with or ends with match
        if (
          (normalizedHeader.startsWith(keyword) ||
            normalizedHeader.endsWith(keyword)) &&
          confidence < 0.9
        ) {
          bestMatch = fieldName;
          confidence = 0.9;
        }
      }

      if (confidence === 1.0) break;
    }

    // Pass 2: Data pattern validation (if sample rows provided)
    if (sampleRows && sampleRows.length > 0 && bestMatch) {
      const dataConfidence = validateDataPattern(
        header,
        bestMatch,
        sampleRows
      );
      // Adjust confidence based on data validation
      confidence = Math.min(confidence, confidence * (0.5 + dataConfidence * 0.5));
    }

    if (bestMatch) {
      usedFields.add(bestMatch);
    }

    mappings.push({
      csvColumn: header,
      csvColumnIndex: index,
      transactionField: bestMatch,
      confidence,
      isUserOverride: false,
    });
  }

  // Determine unmapped columns and missing required fields
  const unmappedColumns = mappings
    .filter((m) => m.transactionField === null)
    .map((m) => m.csvColumn);

  const mappedFields = mappings
    .filter((m) => m.transactionField !== null)
    .map((m) => m.transactionField as TransactionField);

  const missingRequiredFields = REQUIRED_FIELDS.filter(
    (field) => !mappedFields.includes(field)
  );

  return {
    mappings,
    unmappedColumns,
    missingRequiredFields,
  };
}

/**
 * Validate data patterns match the expected field type.
 *
 * @param header - Column header name
 * @param field - Detected field type
 * @param rows - Sample rows to validate
 * @returns Confidence score 0-1
 */
function validateDataPattern(
  header: string,
  field: TransactionField,
  rows: Record<string, string>[]
): number {
  const values = rows
    .map((row) => row[header])
    .filter((v) => v !== undefined && v !== null && v !== '');

  if (values.length === 0) {
    return 0.5; // Neutral if no data
  }

  let validCount = 0;
  const checkCount = Math.min(values.length, 10);

  switch (field) {
    case 'date':
      for (let i = 0; i < checkCount; i++) {
        if (parseDate(values[i]) !== null) {
          validCount++;
        }
      }
      break;

    case 'symbol':
      for (let i = 0; i < checkCount; i++) {
        // Symbols are typically 1-10 uppercase alphanumeric
        const symbolPattern = /^[A-Za-z0-9.]{1,10}$/;
        if (symbolPattern.test(values[i].trim())) {
          validCount++;
        }
      }
      break;

    case 'quantity':
    case 'price':
    case 'fees':
      for (let i = 0; i < checkCount; i++) {
        // Should be parseable as number
        const cleaned = values[i].replace(/[$,]/g, '').trim();
        const num = parseFloat(cleaned);
        if (!isNaN(num)) {
          validCount++;
        }
      }
      break;

    case 'type':
      const typeKeywords = [
        'buy',
        'sell',
        'dividend',
        'transfer',
        'split',
        'reinvest',
      ];
      for (let i = 0; i < checkCount; i++) {
        const lower = values[i].toLowerCase().trim();
        if (typeKeywords.some((k) => lower.includes(k))) {
          validCount++;
        }
      }
      break;

    case 'notes':
      // Notes can be anything, so check it's text-like
      for (let i = 0; i < checkCount; i++) {
        if (typeof values[i] === 'string' && values[i].length > 0) {
          validCount++;
        }
      }
      break;
  }

  return validCount / checkCount;
}

/**
 * Update a single column mapping.
 *
 * @param mappings - Current mappings array
 * @param columnIndex - Index of column to update
 * @param newField - New field assignment (or null to unmap)
 * @returns Updated mappings array
 */
export function updateColumnMapping(
  mappings: ColumnMapping[],
  columnIndex: number,
  newField: TransactionField | null
): ColumnMapping[] {
  // If assigning a field, first unmap it from any other column
  const updatedMappings = mappings.map((mapping, index) => {
    if (
      newField !== null &&
      mapping.transactionField === newField &&
      index !== columnIndex
    ) {
      return {
        ...mapping,
        transactionField: null,
        confidence: 0,
        isUserOverride: true,
      };
    }
    return mapping;
  });

  // Update the target column
  return updatedMappings.map((mapping, index) => {
    if (index === columnIndex) {
      return {
        ...mapping,
        transactionField: newField,
        confidence: newField !== null ? 1.0 : 0,
        isUserOverride: true,
      };
    }
    return mapping;
  });
}

/**
 * Check if all required fields are mapped.
 *
 * @param mappings - Current column mappings
 * @returns True if all required fields have mappings
 */
export function hasAllRequiredMappings(mappings: ColumnMapping[]): boolean {
  const mappedFields = new Set(
    mappings
      .filter((m) => m.transactionField !== null)
      .map((m) => m.transactionField)
  );

  return REQUIRED_FIELDS.every((field) => mappedFields.has(field));
}

/**
 * Get the mapping for a specific field.
 *
 * @param mappings - Column mappings
 * @param field - Field to find
 * @returns Column mapping for the field, or undefined
 */
export function getMappingForField(
  mappings: ColumnMapping[],
  field: TransactionField
): ColumnMapping | undefined {
  return mappings.find((m) => m.transactionField === field);
}

/**
 * Get all unmapped required fields.
 *
 * @param mappings - Current column mappings
 * @returns Array of required fields that are not mapped
 */
export function getUnmappedRequiredFields(
  mappings: ColumnMapping[]
): TransactionField[] {
  const mappedFields = new Set(
    mappings
      .filter((m) => m.transactionField !== null)
      .map((m) => m.transactionField)
  );

  return REQUIRED_FIELDS.filter((field) => !mappedFields.has(field));
}
