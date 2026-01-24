/**
 * Validation Schemas Contract
 *
 * Zod schemas for CSV import validation.
 * These should be added to src/lib/utils/validation.ts during implementation.
 */

import { z } from 'zod';

// ============================================================================
// File Validation
// ============================================================================

export const csvFileSchema = z.object({
  name: z.string().regex(/\.csv$/i, 'File must have .csv extension'),
  size: z.number().max(10 * 1024 * 1024, 'File size exceeds 10MB limit'),
  type: z.string().refine(
    (type) => type === 'text/csv' || type === 'application/vnd.ms-excel' || type === '',
    'Invalid file type'
  ),
});

// ============================================================================
// Column Mapping Validation
// ============================================================================

export const transactionFieldSchema = z.enum([
  'date',
  'symbol',
  'type',
  'quantity',
  'price',
  'fees',
  'notes',
]);

export const columnMappingSchema = z.object({
  csvColumn: z.string(),
  csvColumnIndex: z.number().int().min(0),
  transactionField: transactionFieldSchema.nullable(),
  confidence: z.number().min(0).max(1),
  isUserOverride: z.boolean(),
});

export const columnMappingsSchema = z.array(columnMappingSchema).refine(
  (mappings) => {
    const requiredFields = ['date', 'symbol', 'quantity', 'price'];
    const mappedFields = mappings
      .filter((m) => m.transactionField !== null)
      .map((m) => m.transactionField);

    return requiredFields.every((field) => mappedFields.includes(field as any));
  },
  'All required fields (date, symbol, quantity, price) must be mapped'
);

// ============================================================================
// Row Data Validation
// ============================================================================

export const symbolSchema = z
  .string()
  .min(1, 'Symbol is required')
  .max(10, 'Symbol exceeds 10 character limit')
  .regex(/^[A-Za-z0-9.]+$/, 'Symbol contains invalid characters');

export const quantitySchema = z.string().refine(
  (val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num !== 0;
  },
  'Quantity must be a non-zero number'
);

export const priceSchema = z.string().refine(
  (val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  },
  'Price must be a non-negative number'
);

export const feesSchema = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    'Fees must be a non-negative number'
  );

export const notesSchema = z.string().max(1000, 'Notes exceed 1000 character limit').optional();

// Transaction type values we accept (case-insensitive matching handled in code)
export const transactionTypeSchema = z
  .string()
  .optional()
  .transform((val) => val?.toLowerCase().trim());

// ============================================================================
// CSV Row Schema (for validation after mapping)
// ============================================================================

export const csvRowSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  symbol: symbolSchema,
  type: transactionTypeSchema,
  quantity: quantitySchema,
  price: priceSchema,
  fees: feesSchema,
  notes: notesSchema,
});

// ============================================================================
// Import Session Schema
// ============================================================================

export const importSessionCreateSchema = z.object({
  portfolioId: z.string().uuid('Invalid portfolio ID'),
  fileName: z.string().regex(/\.csv$/i, 'File must have .csv extension'),
  fileSize: z.number().max(10 * 1024 * 1024, 'File size exceeds 10MB limit'),
});

export const duplicateHandlingSchema = z.enum(['skip', 'import', 'review']);

export const importSessionUpdateSchema = z.object({
  columnMappings: columnMappingsSchema.optional(),
  duplicateHandling: duplicateHandlingSchema.optional(),
});

// ============================================================================
// Date Format Patterns
// ============================================================================

/**
 * Supported date formats in order of parsing priority.
 * ISO 8601 formats are tried first as they are unambiguous.
 */
export const DATE_FORMATS = [
  'yyyy-MM-dd', // ISO 8601
  'yyyy/MM/dd', // ISO variant
  'MMMM d, yyyy', // January 15, 2025
  'MMMM dd, yyyy', // January 05, 2025
  'MMM d, yyyy', // Jan 15, 2025
  'MMM dd, yyyy', // Jan 05, 2025
  'MM/dd/yyyy', // US format
  'M/d/yyyy', // US short
  'dd/MM/yyyy', // EU format
  'd/M/yyyy', // EU short
  'MM-dd-yyyy', // US with dashes
  'dd-MM-yyyy', // EU with dashes
] as const;

// ============================================================================
// Transaction Type Keywords
// ============================================================================

/**
 * Mapping of keywords to transaction types.
 * Used for automatic type detection from CSV values.
 */
export const TYPE_KEYWORDS: Record<string, string> = {
  // Buy variants
  buy: 'buy',
  bought: 'buy',
  purchase: 'buy',
  long: 'buy',

  // Sell variants
  sell: 'sell',
  sold: 'sell',
  sale: 'sell',
  short: 'sell',

  // Dividend variants
  div: 'dividend',
  dividend: 'dividend',
  distribution: 'dividend',
  income: 'dividend',

  // Reinvestment variants
  reinvest: 'reinvestment',
  reinvestment: 'reinvestment',
  drip: 'reinvestment',

  // Split variants
  split: 'split',
  'stock split': 'split',

  // Transfer variants
  transfer: 'transfer_in',
  'transfer in': 'transfer_in',
  'transfer out': 'transfer_out',
  deposit: 'transfer_in',
  withdrawal: 'transfer_out',
};

// ============================================================================
// Header Keywords for Column Detection
// ============================================================================

/**
 * Keywords used to auto-detect column mappings from CSV headers.
 * Keys are lowercase for case-insensitive matching.
 */
export const HEADER_KEYWORDS: Record<string, string[]> = {
  date: [
    'date',
    'transaction_date',
    'trade_date',
    'settlement_date',
    'transactiondate',
    'tradedate',
    'settlementdate',
  ],
  symbol: [
    'symbol',
    'ticker',
    'asset',
    'stock',
    'security',
    'instrument',
  ],
  type: [
    'type',
    'action',
    'transaction_type',
    'transactiontype',
    'side',
    'activity',
  ],
  quantity: [
    'quantity',
    'qty',
    'shares',
    'units',
    'amount',
    'volume',
  ],
  price: [
    'price',
    'cost',
    'price_per_share',
    'unit_price',
    'pricepercharge',
    'unitprice',
    'rate',
  ],
  fees: [
    'fees',
    'fee',
    'commission',
    'commissions',
    'cost',
  ],
  notes: [
    'notes',
    'note',
    'description',
    'memo',
    'comments',
    'comment',
  ],
};

// ============================================================================
// Type Exports
// ============================================================================

export type CsvRowInput = z.input<typeof csvRowSchema>;
export type CsvRowOutput = z.output<typeof csvRowSchema>;
export type ImportSessionCreate = z.infer<typeof importSessionCreateSchema>;
export type ImportSessionUpdate = z.infer<typeof importSessionUpdateSchema>;
export type TransactionFieldType = z.infer<typeof transactionFieldSchema>;
export type DuplicateHandlingType = z.infer<typeof duplicateHandlingSchema>;
