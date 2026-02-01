import { z } from 'zod';

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    // Return empty string instead of throwing to prevent 500s in batch processing
    return '';
  }

  // Remove potentially dangerous characters
  return input
    .replace(/[<>\"'&]/g, '') // Remove HTML/XML characters
    .replace(/[^a-zA-Z0-9\s\-\._]/g, '') // Allow only letters, numbers, spaces, hyphens, dots, and underscores
    .trim() // Trim leading/trailing whitespace
    .slice(0, 50) // Limit length (increased from 20 to allow for longer descriptions)
    .trim(); // Clean up any trailing space from truncation
}

export function sanitizeSymbol(input: string): string {
  if (typeof input !== 'string') return '';
  // Allow alphanumeric, dots, and caret (for indices)
  // Remove everything else
  return input
    .replace(/[^a-zA-Z0-9.\^]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, 15);
}

// Symbol validation (stocks, ETFs, crypto, indices)
export function validateSymbol(symbol: string): boolean {
  // Symbol should be 1-10 characters, alphanumeric
  // Also allows:
  // - .L suffix for UK market symbols (e.g., VOD.L, HSBA.L)
  // - ^ prefix for indices (e.g., ^GSPC, ^DJI)
  // - Dots in symbols (e.g., BRK.B)
  const symbolRegex = /^[\^]?[A-Z0-9.]{1,10}$/;
  return symbolRegex.test(symbol);
}

// Check if symbol is a benchmark/index symbol (starts with ^)
export function isIndexSymbol(symbol: string): boolean {
  return symbol.startsWith('^');
}

// Portfolio validation schemas
export const portfolioSchema = z.object({
  name: z
    .string()
    .min(1, 'Portfolio name is required')
    .max(100, 'Portfolio name too long')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Portfolio name contains invalid characters'),
  type: z.enum(['taxable', 'ira', '401k', 'roth']),
  currency: z
    .string()
    .length(3, 'Currency must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Invalid currency format'),
  description: z.string().max(500, 'Description too long').optional(),
});

// Transaction validation schema
export const transactionSchema = z.object({
  type: z.enum(['buy', 'sell', 'dividend', 'split', 'transfer']),
  assetSymbol: z
    .string()
    .min(1, 'Asset symbol is required')
    .max(10, 'Asset symbol too long')
    .regex(/^[A-Z0-9]+$/, 'Invalid asset symbol format'),
  assetName: z.string().max(200, 'Asset name too long').optional(),
  date: z
    .string()
    .datetime('Invalid date format')
    .refine((date) => {
      const d = new Date(date);
      const now = new Date();
      return d <= now && d >= new Date('1900-01-01');
    }, 'Date must be between 1900-01-01 and today'),
  quantity: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 1000000000;
  }, 'Quantity must be a positive number less than 1 billion'),
  price: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0 && num <= 1000000;
  }, 'Price must be a non-negative number less than 1 million'),
  fees: z
    .string()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100000;
    }, 'Fees must be a non-negative number less than 100,000')
    .optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
});

// Asset validation schema
export const assetSchema = z.object({
  symbol: z
    .string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol too long')
    .regex(/^[\^]?[A-Z0-9.]+$/, 'Invalid symbol format'),
  name: z
    .string()
    .min(1, 'Asset name is required')
    .max(200, 'Asset name too long'),
  type: z.enum([
    'stock',
    'etf',
    'crypto',
    'bond',
    'real_estate',
    'commodity',
    'index',
    'cash',
    'other',
  ]),
  exchange: z.string().max(50, 'Exchange name too long').optional(),
  currency: z
    .string()
    .length(3, 'Currency must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Invalid currency format'),
  sector: z.string().max(100, 'Sector name too long').optional(),
});

// CSV import validation
export const csvRowSchema = z.object({
  Date: z.string().min(1, 'Date is required'),
  Symbol: z.string().min(1, 'Symbol is required'),
  Type: z.enum(['Buy', 'Sell', 'Dividend', 'Split', 'Transfer']),
  Quantity: z.string().min(1, 'Quantity is required'),
  Price: z.string().min(1, 'Price is required'),
  Fees: z.string().optional(),
  Notes: z.string().optional(),
});

// User preferences validation
export const userPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  currency: z
    .string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .optional(),
  locale: z
    .string()
    .max(10)
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
    .optional(),
  notifications: z
    .object({
      priceAlerts: z.boolean().optional(),
      portfolioSummary: z.boolean().optional(),
      marketNews: z.boolean().optional(),
    })
    .optional(),
  privacy: z
    .object({
      analytics: z.boolean().optional(),
      crashReports: z.boolean().optional(),
    })
    .optional(),
});

// API response validation helpers
export function validateApiResponse<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(
        `Validation error: ${error.errors.map((e) => e.message).join(', ')}`
      );
    }
    throw error;
  }
}

// Security validations
export function validateFileUpload(file: File): boolean {
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size too large (max 5MB)');
  }

  // Check file type
  const allowedTypes = ['text/csv', 'application/json'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only CSV and JSON files are allowed');
  }

  // Check file extension
  const allowedExtensions = ['.csv', '.json'];
  const extension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    throw new Error('Invalid file extension');
  }

  return true;
}

// SQL injection prevention (for any raw queries)
export function sanitizeSqlInput(input: string): string {
  return input
    .replace(/['"\\;]/g, '') // Remove quotes, backslashes, semicolons
    .replace(/\s*--\s*/g, ' ') // Replace SQL line comments with single space
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove SQL block comments
    .trim();
}

// XSS prevention for display values
export function sanitizeForDisplay(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Email validation (for future features)
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// Password strength validation (for future features)
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score += 1;
  }

  if (!/[0-9]/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else {
    score += 1;
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    feedback.push('Password must contain at least one special character');
  } else {
    score += 1;
  }

  if (password.length >= 12) {
    score += 1;
  }

  return {
    isValid: feedback.length === 0,
    score: Math.min(score, 6), // Cap at 6: 5 base requirements + 1 length bonus
    feedback,
  };
}

// Rate limiting key generation
export function generateRateLimitKey(ip: string, endpoint: string): string {
  return `rate_limit:${endpoint}:${ip}`;
}

// Data export validation
export function validateExportRequest(format: string, data: any[]): boolean {
  const allowedFormats = ['json', 'csv'];
  if (!allowedFormats.includes(format.toLowerCase())) {
    throw new Error('Invalid export format');
  }

  if (!Array.isArray(data)) {
    throw new Error('Data must be an array');
  }

  if (data.length > 10000) {
    throw new Error('Too many records to export (max 10,000)');
  }

  return true;
}

// ============================================================================
// CSV Import Validation Schemas
// ============================================================================

// File Validation
export const csvFileSchema = z.object({
  name: z.string().regex(/\.csv$/i, 'File must have .csv extension'),
  size: z.number().max(10 * 1024 * 1024, 'File size exceeds 10MB limit'),
  type: z
    .string()
    .refine(
      (type) =>
        type === 'text/csv' ||
        type === 'application/vnd.ms-excel' ||
        type === '',
      'Invalid file type'
    ),
});

// Column Mapping Validation
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

export const columnMappingsSchema = z
  .array(columnMappingSchema)
  .refine((mappings) => {
    const requiredFields = ['date', 'symbol', 'quantity', 'price'];
    const mappedFields = mappings
      .filter((m) => m.transactionField !== null)
      .map((m) => m.transactionField);

    return requiredFields.every((field) => mappedFields.includes(field as any));
  }, 'All required fields (date, symbol, quantity, price) must be mapped');

// Row Data Validation
export const csvSymbolSchema = z
  .string()
  .min(1, 'Symbol is required')
  .max(10, 'Symbol exceeds 10 character limit')
  .regex(/^[A-Za-z0-9.]+$/, 'Symbol contains invalid characters');

export const csvQuantitySchema = z.string().refine((val) => {
  const num = parseFloat(val);
  return !isNaN(num) && num !== 0;
}, 'Quantity must be a non-zero number');

export const csvPriceSchema = z.string().refine((val) => {
  const num = parseFloat(val);
  return !isNaN(num) && num >= 0;
}, 'Price must be a non-negative number');

export const csvFeesSchema = z
  .string()
  .optional()
  .refine((val) => {
    if (!val || val === '') return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, 'Fees must be a non-negative number');

export const csvNotesSchema = z
  .string()
  .max(1000, 'Notes exceed 1000 character limit')
  .optional();

// Transaction type values (case-insensitive matching handled in code)
export const csvTransactionTypeSchema = z
  .string()
  .optional()
  .transform((val) => val?.toLowerCase().trim());

// CSV Row Schema (for validation after mapping)
export const csvImportRowSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  symbol: csvSymbolSchema,
  type: csvTransactionTypeSchema,
  quantity: csvQuantitySchema,
  price: csvPriceSchema,
  fees: csvFeesSchema,
  notes: csvNotesSchema,
});

// Import Session Schema
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
  symbol: ['symbol', 'ticker', 'asset', 'stock', 'security', 'instrument'],
  type: [
    'type',
    'action',
    'transaction_type',
    'transactiontype',
    'side',
    'activity',
  ],
  quantity: ['quantity', 'qty', 'shares', 'units', 'amount', 'volume'],
  price: [
    'price',
    'cost',
    'price_per_share',
    'unit_price',
    'pricepershare',
    'unitprice',
    'rate',
  ],
  fees: ['fees', 'fee', 'commission', 'commissions'],
  notes: ['notes', 'note', 'description', 'memo', 'comments', 'comment'],
  
  // Tax-specific fields (T015-T019)
  grantDate: [
    'grant_date',
    'grantdate',
    'award_date',
    'awarddate',
    'purchase_date',
    'purchasedate',
    'option_date',
    'optiondate',
    'grant',
    'award',
  ],
  vestingDate: [
    'vesting_date',
    'vestingdate',
    'vest_date',
    'vestdate',
    'release_date',
    'releasedate',
    'vested_date',
    'vest',
  ],
  discountPercent: [
    'discount',
    'discount_percent',
    'discount%',
    'espp_discount',
    'esppdiscount',
    'discount_rate',
    'discountrate',
  ],
  sharesWithheld: [
    'shares_withheld',
    'shareswithheld',
    'tax_shares',
    'taxshares',
    'shares_sold_to_cover',
    'withheld',
    'withheld_shares',
    'shares_for_tax',
    'net_shares',
    'netshares',
  ],
  ordinaryIncomeAmount: [
    'ordinary_income',
    'ordinaryincome',
    'w2_income',
    'w2income',
    'compensation_income',
    'compensationincome',
    'taxable_income',
    'taxableincome',
    'income',
    'bargain_element',
    'bargainelement',
    'fmv',
    'fair_market_value',
  ],
};

// ============================================================================
// CSV Import Type Exports
// ============================================================================

export type CsvRowInput = z.input<typeof csvImportRowSchema>;
export type CsvRowOutput = z.output<typeof csvImportRowSchema>;
export type ImportSessionCreate = z.infer<typeof importSessionCreateSchema>;
export type ImportSessionUpdate = z.infer<typeof importSessionUpdateSchema>;
export type TransactionFieldType = z.infer<typeof transactionFieldSchema>;
export type DuplicateHandlingType = z.infer<typeof duplicateHandlingSchema>;
