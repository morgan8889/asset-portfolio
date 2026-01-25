/**
 * Brokerage Format Presets
 *
 * Defines known brokerage CSV export formats with their header patterns
 * and column mappings for automatic detection.
 */

import type { TransactionField } from '@/types/csv-import';

/**
 * Represents a known brokerage export format.
 */
export interface BrokerageFormat {
  /** Unique identifier for the brokerage */
  id: string;
  /** Display name of the brokerage */
  name: string;
  /** Description of the export type */
  description: string;
  /** Headers that uniquely identify this format (case-insensitive) */
  signatureHeaders: string[];
  /** Minimum number of signature headers that must match */
  minSignatureMatch: number;
  /** Complete column mappings for this format */
  columnMappings: BrokerageColumnMapping[];
}

/**
 * Column mapping for a specific brokerage format.
 */
export interface BrokerageColumnMapping {
  /** Exact header name (case-insensitive) */
  header: string;
  /** Transaction field this column maps to */
  field: TransactionField;
  /** Transform function for value normalization (optional) */
  transform?: (value: string) => string;
}

/**
 * Result of brokerage format detection.
 */
export interface BrokerageDetectionResult {
  /** Detected brokerage format, or null if no match */
  format: BrokerageFormat | null;
  /** Confidence score 0-1 */
  confidence: number;
  /** Number of signature headers matched */
  matchedHeaders: number;
  /** Total signature headers in format */
  totalSignatureHeaders: number;
}

/**
 * Fidelity Investments export format.
 * Source: Fidelity.com Activity & Orders → Export to CSV
 */
const FIDELITY_FORMAT: BrokerageFormat = {
  id: 'fidelity',
  name: 'Fidelity Investments',
  description: 'Fidelity Activity & Orders export',
  signatureHeaders: [
    'run date',
    'account',
    'action',
    'symbol',
    'security description',
    'quantity',
    'price ($)',
    'commission ($)',
    'fees ($)',
    'amount ($)',
  ],
  minSignatureMatch: 6,
  columnMappings: [
    { header: 'run date', field: 'date' },
    { header: 'symbol', field: 'symbol' },
    { header: 'action', field: 'type' },
    { header: 'quantity', field: 'quantity' },
    { header: 'price ($)', field: 'price' },
    {
      header: 'commission ($)',
      field: 'fees',
      transform: (v) => {
        // Combine commission and fees if both present
        const num = parseFloat(v.replace(/[$,]/g, '')) || 0;
        return num.toString();
      },
    },
    { header: 'security description', field: 'notes' },
  ],
};

/**
 * Charles Schwab export format.
 * Source: Schwab.com Accounts → History → Export
 */
const SCHWAB_FORMAT: BrokerageFormat = {
  id: 'schwab',
  name: 'Charles Schwab',
  description: 'Schwab Transaction History export',
  signatureHeaders: [
    'date',
    'action',
    'symbol',
    'description',
    'quantity',
    'price',
    'fees & comm',
    'amount',
  ],
  minSignatureMatch: 5,
  columnMappings: [
    { header: 'date', field: 'date' },
    { header: 'symbol', field: 'symbol' },
    { header: 'action', field: 'type' },
    { header: 'quantity', field: 'quantity' },
    { header: 'price', field: 'price' },
    { header: 'fees & comm', field: 'fees' },
    { header: 'description', field: 'notes' },
  ],
};

/**
 * Robinhood export format.
 * Source: Robinhood app → Statements & History → Account Statements
 */
const ROBINHOOD_FORMAT: BrokerageFormat = {
  id: 'robinhood',
  name: 'Robinhood',
  description: 'Robinhood Account Statement export',
  signatureHeaders: [
    'activity date',
    'process date',
    'settle date',
    'instrument',
    'description',
    'trans code',
    'quantity',
    'price',
    'amount',
  ],
  minSignatureMatch: 5,
  columnMappings: [
    { header: 'activity date', field: 'date' },
    { header: 'instrument', field: 'symbol' },
    { header: 'trans code', field: 'type' },
    { header: 'quantity', field: 'quantity' },
    { header: 'price', field: 'price' },
    { header: 'description', field: 'notes' },
  ],
};

/**
 * TD Ameritrade export format.
 * Source: TD Ameritrade → My Account → History & Statements
 */
const TD_AMERITRADE_FORMAT: BrokerageFormat = {
  id: 'td_ameritrade',
  name: 'TD Ameritrade',
  description: 'TD Ameritrade Transaction History export',
  signatureHeaders: [
    'date',
    'transaction id',
    'description',
    'symbol',
    'quantity',
    'price',
    'commission',
    'reg fee',
    'net amount',
  ],
  minSignatureMatch: 5,
  columnMappings: [
    { header: 'date', field: 'date' },
    { header: 'symbol', field: 'symbol' },
    { header: 'description', field: 'type' },
    { header: 'quantity', field: 'quantity' },
    { header: 'price', field: 'price' },
    { header: 'commission', field: 'fees' },
  ],
};

/**
 * E*TRADE export format.
 * Source: E*TRADE → Accounts → Transactions → Download
 */
const ETRADE_FORMAT: BrokerageFormat = {
  id: 'etrade',
  name: 'E*TRADE',
  description: 'E*TRADE Transaction export',
  signatureHeaders: [
    'transaction date',
    'transaction type',
    'security type',
    'symbol',
    'quantity',
    'amount',
    'price',
    'commission',
  ],
  minSignatureMatch: 5,
  columnMappings: [
    { header: 'transaction date', field: 'date' },
    { header: 'symbol', field: 'symbol' },
    { header: 'transaction type', field: 'type' },
    { header: 'quantity', field: 'quantity' },
    { header: 'price', field: 'price' },
    { header: 'commission', field: 'fees' },
  ],
};

/**
 * Vanguard export format.
 * Source: Vanguard → Transaction history → Download
 */
const VANGUARD_FORMAT: BrokerageFormat = {
  id: 'vanguard',
  name: 'Vanguard',
  description: 'Vanguard Transaction History export',
  signatureHeaders: [
    'trade date',
    'settlement date',
    'transaction type',
    'transaction description',
    'investment name',
    'symbol',
    'shares',
    'share price',
    'principal amount',
  ],
  minSignatureMatch: 5,
  columnMappings: [
    { header: 'trade date', field: 'date' },
    { header: 'symbol', field: 'symbol' },
    { header: 'transaction type', field: 'type' },
    { header: 'shares', field: 'quantity' },
    { header: 'share price', field: 'price' },
    { header: 'transaction description', field: 'notes' },
  ],
};

/**
 * Interactive Brokers export format.
 * Source: IBKR Account Management → Reports → Flex Queries
 */
const INTERACTIVE_BROKERS_FORMAT: BrokerageFormat = {
  id: 'interactive_brokers',
  name: 'Interactive Brokers',
  description: 'IBKR Flex Query Trade export',
  signatureHeaders: [
    'tradeid',
    'accountid',
    'symbol',
    'datetime',
    'exchange',
    'quantity',
    'tradeprice',
    'ibcommission',
    'netcash',
  ],
  minSignatureMatch: 5,
  columnMappings: [
    { header: 'datetime', field: 'date' },
    { header: 'symbol', field: 'symbol' },
    { header: 'quantity', field: 'quantity' },
    { header: 'tradeprice', field: 'price' },
    { header: 'ibcommission', field: 'fees' },
  ],
};

/**
 * All supported brokerage formats.
 */
export const BROKERAGE_FORMATS: BrokerageFormat[] = [
  FIDELITY_FORMAT,
  SCHWAB_FORMAT,
  ROBINHOOD_FORMAT,
  TD_AMERITRADE_FORMAT,
  ETRADE_FORMAT,
  VANGUARD_FORMAT,
  INTERACTIVE_BROKERS_FORMAT,
];

/**
 * Detect if CSV headers match a known brokerage format.
 *
 * @param headers - Array of CSV column headers
 * @returns Detection result with matched format and confidence
 */
export function detectBrokerageFormat(
  headers: string[]
): BrokerageDetectionResult {
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  let bestMatch: BrokerageFormat | null = null;
  let bestMatchedCount = 0;
  let bestTotalSignature = 0;
  let bestConfidence = 0;

  for (const format of BROKERAGE_FORMATS) {
    const normalizedSignature = format.signatureHeaders.map((h) =>
      h.toLowerCase().trim()
    );

    // Count how many signature headers are present
    let matchedCount = 0;
    for (const sig of normalizedSignature) {
      if (normalizedHeaders.includes(sig)) {
        matchedCount++;
      }
    }

    // Calculate confidence based on match ratio and minimum threshold
    if (matchedCount >= format.minSignatureMatch) {
      const confidence = matchedCount / normalizedSignature.length;

      // Prefer formats with more matches
      if (
        confidence > bestConfidence ||
        (confidence === bestConfidence && matchedCount > bestMatchedCount)
      ) {
        bestMatch = format;
        bestMatchedCount = matchedCount;
        bestTotalSignature = normalizedSignature.length;
        bestConfidence = confidence;
      }
    }
  }

  return {
    format: bestMatch,
    confidence: bestConfidence,
    matchedHeaders: bestMatchedCount,
    totalSignatureHeaders: bestTotalSignature,
  };
}

/**
 * Get column mappings for a detected brokerage format.
 *
 * @param format - Brokerage format
 * @param headers - Actual CSV headers
 * @returns Column index to field mappings
 */
export function getBrokerageColumnMappings(
  format: BrokerageFormat,
  headers: string[]
): Map<number, TransactionField> {
  const mappings = new Map<number, TransactionField>();
  const normalizedHeaders = headers.map((h) => h.toLowerCase().trim());

  for (const mapping of format.columnMappings) {
    const normalizedMappingHeader = mapping.header.toLowerCase().trim();
    const columnIndex = normalizedHeaders.indexOf(normalizedMappingHeader);

    if (columnIndex !== -1) {
      mappings.set(columnIndex, mapping.field);
    }
  }

  return mappings;
}

/**
 * Get a brokerage format by ID.
 *
 * @param id - Brokerage format ID
 * @returns Format definition or undefined
 */
export function getBrokerageFormatById(
  id: string
): BrokerageFormat | undefined {
  return BROKERAGE_FORMATS.find((f) => f.id === id);
}

/**
 * Get all supported brokerage format names for display.
 *
 * @returns Array of { id, name } objects
 */
export function getSupportedBrokerages(): Array<{ id: string; name: string }> {
  return BROKERAGE_FORMATS.map((f) => ({ id: f.id, name: f.name }));
}
