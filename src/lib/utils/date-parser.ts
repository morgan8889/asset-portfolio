/**
 * Date Parser Utility
 *
 * Multi-format date parsing with cascade approach.
 * Tries formats in order of specificity, starting with unambiguous ISO 8601.
 */

import { parse, isValid, format as formatDate } from 'date-fns';
import { DATE_FORMATS } from './validation';

/**
 * Parse a date string trying multiple formats.
 * Returns null if no format matches.
 *
 * @param value - The date string to parse
 * @returns Parsed Date object or null if unparseable
 */
export function parseDate(value: string): Date | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  // Try each format in priority order
  for (const dateFormat of DATE_FORMATS) {
    try {
      const parsed = parse(trimmed, dateFormat, new Date());
      if (isValid(parsed)) {
        // Verify the parsed date makes sense (not in far future or past)
        const year = parsed.getFullYear();
        if (year >= 1900 && year <= 2100) {
          return parsed;
        }
      }
    } catch {
      // Continue to next format
    }
  }

  // Try native Date parsing as fallback, but only for strings that look like dates
  // This prevents JavaScript's lenient parsing from accepting garbage like "bad-date-2" as a valid date
  // Only accept strings that start with numbers and contain date separators
  const looksLikeDate = /^\d{1,4}[-/]\d{1,2}[-/]\d{1,4}/.test(trimmed);

  if (looksLikeDate) {
    try {
      const nativeParsed = new Date(trimmed);
      if (isValid(nativeParsed)) {
        const year = nativeParsed.getFullYear();
        if (year >= 1900 && year <= 2100) {
          return nativeParsed;
        }
      }
    } catch {
      // Failed to parse
    }
  }

  return null;
}

/**
 * Detect the likely date format used in a set of date strings.
 * Useful for providing hints to users about their file's format.
 *
 * @param values - Array of date strings to analyze
 * @returns The most likely format string, or null if undetermined
 */
export function detectDateFormat(values: string[]): string | null {
  if (!values || values.length === 0) {
    return null;
  }

  // Count successful parses for each format
  const formatCounts: Record<string, number> = {};

  for (const dateFormat of DATE_FORMATS) {
    formatCounts[dateFormat] = 0;

    for (const value of values.slice(0, 10)) {
      // Check first 10 values
      if (!value || typeof value !== 'string') continue;

      try {
        const parsed = parse(value.trim(), dateFormat, new Date());
        if (isValid(parsed)) {
          const year = parsed.getFullYear();
          if (year >= 1900 && year <= 2100) {
            formatCounts[dateFormat]++;
          }
        }
      } catch {
        // Continue
      }
    }
  }

  // Find format with most successful parses
  let bestFormat: string | null = null;
  let bestCount = 0;

  for (const [format, count] of Object.entries(formatCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestFormat = format;
    }
  }

  // Only return if we had meaningful success (at least 50% of values parsed)
  const threshold = Math.ceil(Math.min(values.length, 10) * 0.5);
  return bestCount >= threshold ? bestFormat : null;
}

/**
 * Check if a date format might be ambiguous (could be US or EU).
 * Returns true for formats like "01/02/2025" where it's unclear
 * if this means Jan 2 or Feb 1.
 *
 * @param values - Array of date strings to check
 * @returns True if the format appears ambiguous
 */
export function isAmbiguousDateFormat(values: string[]): boolean {
  // Look for patterns like MM/DD/YYYY or DD/MM/YYYY
  const ambiguousPattern = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/;

  for (const value of values.slice(0, 10)) {
    if (!value || typeof value !== 'string') continue;

    const trimmed = value.trim();
    if (ambiguousPattern.test(trimmed)) {
      // Check if any value has day > 12 (clearly DD/MM format)
      const parts = trimmed.split(/[\/\-]/);
      if (parts.length >= 2) {
        const first = parseInt(parts[0], 10);
        const second = parseInt(parts[1], 10);

        // If first number > 12, it must be day (DD/MM format)
        if (first > 12 && second <= 12) {
          return false; // Clearly EU format
        }
        // If second number > 12, it must be day (MM/DD format)
        if (second > 12 && first <= 12) {
          return false; // Clearly US format
        }
      }
    }
  }

  // If we couldn't determine, assume ambiguous
  const hasAmbiguousValues = values.some((v) => {
    if (!v) return false;
    return ambiguousPattern.test(v.trim());
  });

  return hasAmbiguousValues;
}

/**
 * Format a Date object to ISO string for display or storage.
 *
 * @param date - Date object to format
 * @returns ISO formatted date string (YYYY-MM-DD)
 */
export function formatToIso(date: Date): string {
  return formatDate(date, 'yyyy-MM-dd');
}

/**
 * Format a Date object to a user-friendly string.
 *
 * @param date - Date object to format
 * @returns Formatted date string (e.g., "Jan 15, 2025")
 */
export function formatForDisplay(date: Date): string {
  return formatDate(date, 'MMM d, yyyy');
}

/**
 * Validate that a date is within acceptable range for financial transactions.
 *
 * @param date - Date to validate
 * @returns Object with isValid flag and optional error message
 */
export function validateTransactionDate(date: Date): {
  isValid: boolean;
  warning?: string;
} {
  const now = new Date();
  const year = date.getFullYear();

  // Check if date is in the future
  if (date > now) {
    return {
      isValid: true, // Allow but warn
      warning: 'Date is in the future',
    };
  }

  // Check if date is unreasonably old
  if (year < 1950) {
    return {
      isValid: false,
      warning: 'Date is before 1950, which seems unlikely for a transaction',
    };
  }

  return { isValid: true };
}
