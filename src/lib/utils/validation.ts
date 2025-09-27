import { z } from 'zod';

// Input sanitization
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  // Remove potentially dangerous characters
  return input
    .replace(/[<>\"'&]/g, '') // Remove HTML/XML characters
    .replace(/[^\w\s\-\.]/g, '') // Allow only alphanumeric, spaces, hyphens, and dots
    .trim()
    .slice(0, 20); // Limit length
}

// Symbol validation (stocks, ETFs, crypto)
export function validateSymbol(symbol: string): boolean {
  // Symbol should be 1-10 characters, alphanumeric only
  const symbolRegex = /^[A-Z0-9]{1,10}$/;
  return symbolRegex.test(symbol);
}

// Portfolio validation schemas
export const portfolioSchema = z.object({
  name: z.string()
    .min(1, 'Portfolio name is required')
    .max(100, 'Portfolio name too long')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Portfolio name contains invalid characters'),
  type: z.enum(['taxable', 'ira', '401k', 'roth']),
  currency: z.string()
    .length(3, 'Currency must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Invalid currency format'),
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
});

// Transaction validation schema
export const transactionSchema = z.object({
  type: z.enum(['buy', 'sell', 'dividend', 'split', 'transfer']),
  assetSymbol: z.string()
    .min(1, 'Asset symbol is required')
    .max(10, 'Asset symbol too long')
    .regex(/^[A-Z0-9]+$/, 'Invalid asset symbol format'),
  assetName: z.string()
    .max(200, 'Asset name too long')
    .optional(),
  date: z.string()
    .datetime('Invalid date format')
    .refine((date) => {
      const d = new Date(date);
      const now = new Date();
      return d <= now && d >= new Date('1900-01-01');
    }, 'Date must be between 1900-01-01 and today'),
  quantity: z.string()
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0 && num <= 1000000000;
    }, 'Quantity must be a positive number less than 1 billion'),
  price: z.string()
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 1000000;
    }, 'Price must be a non-negative number less than 1 million'),
  fees: z.string()
    .refine((val) => {
      if (!val || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100000;
    }, 'Fees must be a non-negative number less than 100,000')
    .optional(),
  notes: z.string()
    .max(1000, 'Notes too long')
    .optional(),
});

// Asset validation schema
export const assetSchema = z.object({
  symbol: z.string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol too long')
    .regex(/^[A-Z0-9]+$/, 'Invalid symbol format'),
  name: z.string()
    .min(1, 'Asset name is required')
    .max(200, 'Asset name too long'),
  type: z.enum(['stock', 'etf', 'crypto', 'bond', 'real_estate', 'commodity']),
  exchange: z.string()
    .max(50, 'Exchange name too long')
    .optional(),
  currency: z.string()
    .length(3, 'Currency must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Invalid currency format'),
  sector: z.string()
    .max(100, 'Sector name too long')
    .optional(),
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
  currency: z.string()
    .length(3)
    .regex(/^[A-Z]{3}$/)
    .optional(),
  locale: z.string()
    .max(10)
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/)
    .optional(),
  notifications: z.object({
    priceAlerts: z.boolean().optional(),
    portfolioSummary: z.boolean().optional(),
    marketNews: z.boolean().optional(),
  }).optional(),
  privacy: z.object({
    analytics: z.boolean().optional(),
    crashReports: z.boolean().optional(),
  }).optional(),
});

// API response validation helpers
export function validateApiResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
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
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    throw new Error('Invalid file extension');
  }

  return true;
}

// SQL injection prevention (for any raw queries)
export function sanitizeSqlInput(input: string): string {
  return input
    .replace(/['"\\;]/g, '') // Remove quotes, backslashes, semicolons
    .replace(/--/g, '') // Remove SQL comments
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
    score: Math.min(score, 5),
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