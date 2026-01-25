import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  isUKSymbol,
  isCryptoSymbol,
  getExchange,
  getMarket,
  convertPenceToPounds,
  formatPrice,
  normalizeSymbol,
  getBaseSymbol,
  getMarketTimezone,
} from '../market-utils';

describe('Market Utilities', () => {
  describe('isUKSymbol', () => {
    it('should return true for symbols ending with .L (uppercase)', () => {
      expect(isUKSymbol('VOD.L')).toBe(true);
      expect(isUKSymbol('HSBA.L')).toBe(true);
      expect(isUKSymbol('BP.L')).toBe(true);
    });

    it('should return true for symbols ending with .l (lowercase)', () => {
      expect(isUKSymbol('VOD.l')).toBe(true);
      expect(isUKSymbol('hsba.l')).toBe(true);
    });

    it('should return false for US symbols', () => {
      expect(isUKSymbol('AAPL')).toBe(false);
      expect(isUKSymbol('MSFT')).toBe(false);
      expect(isUKSymbol('GOOGL')).toBe(false);
    });

    it('should return false for crypto symbols', () => {
      expect(isUKSymbol('BTC')).toBe(false);
      expect(isUKSymbol('ETH')).toBe(false);
    });

    it('should return false for symbols with .L in the middle', () => {
      expect(isUKSymbol('.LABC')).toBe(false);
      expect(isUKSymbol('AB.LCD')).toBe(false);
    });
  });

  describe('isCryptoSymbol', () => {
    it('should return true for known crypto symbols', () => {
      expect(isCryptoSymbol('BTC')).toBe(true);
      expect(isCryptoSymbol('ETH')).toBe(true);
      expect(isCryptoSymbol('SOL')).toBe(true);
      expect(isCryptoSymbol('XRP')).toBe(true);
      expect(isCryptoSymbol('ADA')).toBe(true);
      expect(isCryptoSymbol('DOT')).toBe(true);
      expect(isCryptoSymbol('MATIC')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isCryptoSymbol('btc')).toBe(true);
      expect(isCryptoSymbol('Eth')).toBe(true);
    });

    it('should return false for stock symbols', () => {
      expect(isCryptoSymbol('AAPL')).toBe(false);
      expect(isCryptoSymbol('MSFT')).toBe(false);
      expect(isCryptoSymbol('VOD.L')).toBe(false);
    });
  });

  describe('getExchange', () => {
    it('should return LSE for UK symbols', () => {
      expect(getExchange('VOD.L')).toBe('LSE');
      expect(getExchange('BP.L')).toBe('LSE');
      expect(getExchange('HSBA.l')).toBe('LSE');
    });

    it('should return CRYPTO for known crypto symbols', () => {
      expect(getExchange('BTC')).toBe('CRYPTO');
      expect(getExchange('ETH')).toBe('CRYPTO');
    });

    it('should return UNKNOWN for US symbols (need API to determine exact exchange)', () => {
      expect(getExchange('AAPL')).toBe('UNKNOWN');
      expect(getExchange('MSFT')).toBe('UNKNOWN');
      expect(getExchange('GOOGL')).toBe('UNKNOWN');
    });
  });

  describe('getMarket', () => {
    it('should return market data for known exchanges', () => {
      const nyse = getMarket('NYSE');
      expect(nyse).toBeDefined();
      expect(nyse?.name).toBe('New York Stock Exchange');
      expect(nyse?.timezone).toBe('America/New_York');

      const lse = getMarket('LSE');
      expect(lse).toBeDefined();
      expect(lse?.name).toBe('London Stock Exchange');
      expect(lse?.timezone).toBe('Europe/London');
    });

    it('should return undefined for unknown exchanges', () => {
      expect(getMarket('UNKNOWN')).toBeUndefined();
      expect(getMarket('CRYPTO')).toBeUndefined();
    });
  });

  describe('convertPenceToPounds', () => {
    it('should convert pence (GBp) to pounds (GBP)', () => {
      const price = new Decimal(15000); // 15000 pence = £150.00
      const result = convertPenceToPounds(price, 'GBp');

      expect(result.displayPrice.equals(new Decimal(150))).toBe(true);
      expect(result.displayCurrency).toBe('GBP');
    });

    it('should preserve precision in conversion', () => {
      const price = new Decimal(12345); // 12345 pence = £123.45
      const result = convertPenceToPounds(price, 'GBp');

      expect(result.displayPrice.equals(new Decimal('123.45'))).toBe(true);
    });

    it('should not convert GBP (already in pounds)', () => {
      const price = new Decimal(150);
      const result = convertPenceToPounds(price, 'GBP');

      expect(result.displayPrice.equals(price)).toBe(true);
      expect(result.displayCurrency).toBe('GBP');
    });

    it('should not convert USD', () => {
      const price = new Decimal(150);
      const result = convertPenceToPounds(price, 'USD');

      expect(result.displayPrice.equals(price)).toBe(true);
      expect(result.displayCurrency).toBe('USD');
    });
  });

  describe('formatPrice', () => {
    it('should format USD prices with dollar sign', () => {
      const price = new Decimal('123.45');
      expect(formatPrice(price, 'USD')).toBe('$123.45');
    });

    it('should format GBP prices with pound sign', () => {
      const price = new Decimal('123.45');
      expect(formatPrice(price, 'GBP')).toBe('£123.45');
    });

    it('should format EUR prices with euro sign', () => {
      const price = new Decimal('123.45');
      expect(formatPrice(price, 'EUR')).toBe('€123.45');
    });

    it('should use currency code for unknown currencies', () => {
      const price = new Decimal('123.45');
      expect(formatPrice(price, 'JPY')).toBe('JPY 123.45');
    });

    it('should respect decimal places parameter', () => {
      const price = new Decimal('123.456789');
      expect(formatPrice(price, 'USD', 4)).toBe('$123.4568');
      expect(formatPrice(price, 'USD', 0)).toBe('$123');
    });
  });

  describe('normalizeSymbol', () => {
    it('should convert to uppercase', () => {
      expect(normalizeSymbol('aapl')).toBe('AAPL');
      expect(normalizeSymbol('vod.l')).toBe('VOD.L');
    });

    it('should trim whitespace', () => {
      expect(normalizeSymbol('  AAPL  ')).toBe('AAPL');
      expect(normalizeSymbol('\tMSFT\n')).toBe('MSFT');
    });
  });

  describe('getBaseSymbol', () => {
    it('should remove .L suffix from UK symbols', () => {
      expect(getBaseSymbol('VOD.L')).toBe('VOD');
      expect(getBaseSymbol('BP.L')).toBe('BP');
      expect(getBaseSymbol('HSBA.l')).toBe('HSBA');
    });

    it('should return unchanged for non-UK symbols', () => {
      expect(getBaseSymbol('AAPL')).toBe('AAPL');
      expect(getBaseSymbol('BTC')).toBe('BTC');
    });
  });

  describe('getMarketTimezone', () => {
    it('should return Europe/London for UK symbols', () => {
      expect(getMarketTimezone('VOD.L')).toBe('Europe/London');
      expect(getMarketTimezone('BP.L')).toBe('Europe/London');
    });

    it('should return America/New_York for US and other symbols', () => {
      expect(getMarketTimezone('AAPL')).toBe('America/New_York');
      expect(getMarketTimezone('BTC')).toBe('America/New_York');
    });
  });
});
