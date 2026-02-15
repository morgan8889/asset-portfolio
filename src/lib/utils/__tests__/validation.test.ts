import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  validateSymbol,
  portfolioSchema,
  transactionSchema,
  assetSchema,
  csvRowSchema,
  userPreferencesSchema,
  validateApiResponse,
  validateFileUpload,
  sanitizeForDisplay,
  validateExportRequest,
} from '../validation';

describe('Validation Utilities', () => {
  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      const input = 'Hello<script>alert("xss")</script>World';
      const result = sanitizeInput(input);
      // Removes HTML/XML characters and non-alphanumeric except spaces, hyphens, dots, underscores
      expect(result).toBe('HelloscriptalertxssscriptWorld');
    });

    it('should remove non-alphanumeric characters except spaces, hyphens, underscores, and dots', () => {
      const input = 'Valid-Name_123.txt!@#$%';
      const result = sanitizeInput(input);
      expect(result).toBe('Valid-Name_123.txt');
    });

    it('should trim whitespace and limit length', () => {
      const input =
        '  Very long portfolio name that exceeds fifty characters and keeps going  ';
      const result = sanitizeInput(input);
      // Length is capped at 50, may be less after final trim
      expect(result.length).toBeLessThanOrEqual(50);
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toMatch(/^\s|\s$/);
    });

    it('should return empty string for non-string input', () => {
      // Implementation returns empty string to prevent 500s in batch processing
      expect(sanitizeInput(123 as any)).toBe('');
    });
  });

  describe('validateSymbol', () => {
    it('should validate correct stock symbols', () => {
      expect(validateSymbol('AAPL')).toBe(true);
      expect(validateSymbol('MSFT')).toBe(true);
      expect(validateSymbol('GOOGL')).toBe(true);
      expect(validateSymbol('BRK.B')).toBe(true); // share class suffix allowed
    });

    it('should validate UK market symbols with .L suffix', () => {
      expect(validateSymbol('VOD.L')).toBe(true); // Vodafone (LSE)
      expect(validateSymbol('HSBA.L')).toBe(true); // HSBC (LSE)
      expect(validateSymbol('BP.L')).toBe(true); // BP (LSE)
    });

    it('should reject invalid symbols', () => {
      expect(validateSymbol('aapl')).toBe(false); // lowercase
      expect(validateSymbol('A-B')).toBe(false); // hyphen
      expect(validateSymbol('')).toBe(false); // empty
      expect(validateSymbol('TOOLONGSYMBOL')).toBe(false); // too long
    });

    it('should handle crypto symbols', () => {
      expect(validateSymbol('BTC')).toBe(true);
      expect(validateSymbol('ETH')).toBe(true);
      expect(validateSymbol('DOGE')).toBe(true);
    });
  });

  describe('portfolioSchema', () => {
    it('should validate correct portfolio data', () => {
      const validPortfolio = {
        name: 'My Portfolio',
        type: 'taxable' as const,
        currency: 'USD',
        description: 'Test portfolio',
      };

      const result = portfolioSchema.safeParse(validPortfolio);
      expect(result.success).toBe(true);
    });

    it('should reject invalid portfolio names', () => {
      const invalidPortfolio = {
        name: 'Portfolio<script>',
        type: 'taxable' as const,
        currency: 'USD',
      };

      const result = portfolioSchema.safeParse(invalidPortfolio);
      expect(result.success).toBe(false);
    });

    it('should reject invalid currency codes', () => {
      const invalidPortfolio = {
        name: 'My Portfolio',
        type: 'taxable' as const,
        currency: 'US', // should be 3 characters
      };

      const result = portfolioSchema.safeParse(invalidPortfolio);
      expect(result.success).toBe(false);
    });

    it('should reject invalid portfolio types', () => {
      const invalidPortfolio = {
        name: 'My Portfolio',
        type: 'invalid' as any,
        currency: 'USD',
      };

      const result = portfolioSchema.safeParse(invalidPortfolio);
      expect(result.success).toBe(false);
    });
  });

  describe('transactionSchema', () => {
    it('should validate correct transaction data', () => {
      const validTransaction = {
        type: 'buy' as const,
        assetSymbol: 'AAPL',
        assetName: 'Apple Inc.',
        date: new Date().toISOString(),
        quantity: '10',
        price: '150.50',
        fees: '1.00',
        notes: 'First purchase',
      };

      const result = transactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const invalidTransaction = {
        type: 'buy' as const,
        assetSymbol: 'AAPL',
        date: futureDate.toISOString(),
        quantity: '10',
        price: '150.50',
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('should reject negative quantities', () => {
      const invalidTransaction = {
        type: 'buy' as const,
        assetSymbol: 'AAPL',
        date: new Date().toISOString(),
        quantity: '-10',
        price: '150.50',
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('should reject negative prices', () => {
      const invalidTransaction = {
        type: 'buy' as const,
        assetSymbol: 'AAPL',
        date: new Date().toISOString(),
        quantity: '10',
        price: '-150.50',
      };

      const result = transactionSchema.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });
  });

  describe('validateApiResponse', () => {
    it('should validate correct API response', () => {
      const schema = portfolioSchema;
      const validData = {
        name: 'Test Portfolio',
        type: 'taxable' as const,
        currency: 'USD',
      };

      const result = validateApiResponse(schema, validData);
      expect(result).toEqual(validData);
    });

    it('should throw error for invalid API response', () => {
      const schema = portfolioSchema;
      const invalidData = {
        name: '', // empty name should fail
        type: 'taxable' as const,
        currency: 'USD',
      };

      expect(() => validateApiResponse(schema, invalidData)).toThrow(
        'Validation error'
      );
    });
  });

  describe('validateFileUpload', () => {
    it('should validate correct CSV file', () => {
      const file = new File(['data'], 'transactions.csv', { type: 'text/csv' });
      expect(validateFileUpload(file)).toBe(true);
    });

    it('should validate correct JSON file', () => {
      const file = new File(['{}'], 'data.json', { type: 'application/json' });
      expect(validateFileUpload(file)).toBe(true);
    });

    it('should reject large files', () => {
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
      const file = new File([largeContent], 'large.csv', { type: 'text/csv' });

      expect(() => validateFileUpload(file)).toThrow('File size too large');
    });

    it('should reject invalid file types', () => {
      const file = new File(['content'], 'file.txt', { type: 'text/plain' });

      expect(() => validateFileUpload(file)).toThrow('Invalid file type');
    });

    it('should reject invalid file extensions', () => {
      const file = new File(['content'], 'file.exe', { type: 'text/csv' });

      expect(() => validateFileUpload(file)).toThrow('Invalid file extension');
    });
  });

  describe('sanitizeForDisplay', () => {
    it('should escape HTML entities', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeForDisplay(input);
      expect(result).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('should escape quotes and ampersands', () => {
      const input = 'Tom & Jerry said "Hello"';
      const result = sanitizeForDisplay(input);
      expect(result).toBe('Tom &amp; Jerry said &quot;Hello&quot;');
    });
  });

  describe('validateExportRequest', () => {
    it('should validate correct export request', () => {
      const data = [{ id: 1, name: 'Test' }];
      expect(validateExportRequest('json', data)).toBe(true);
      expect(validateExportRequest('csv', data)).toBe(true);
    });

    it('should reject invalid formats', () => {
      const data = [{ id: 1 }];
      expect(() => validateExportRequest('xml', data)).toThrow(
        'Invalid export format'
      );
    });

    it('should reject non-array data', () => {
      expect(() =>
        validateExportRequest('json', 'not an array' as any)
      ).toThrow('Data must be an array');
    });

    it('should reject too much data', () => {
      const largeData = Array.from({ length: 10001 }, (_, i) => ({ id: i }));
      expect(() => validateExportRequest('json', largeData)).toThrow(
        'Too many records to export'
      );
    });

    it('should handle case insensitive formats', () => {
      const data = [{ id: 1 }];
      expect(validateExportRequest('JSON', data)).toBe(true);
      expect(validateExportRequest('CSV', data)).toBe(true);
    });
  });
});
