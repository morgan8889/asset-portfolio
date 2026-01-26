import { describe, it, expect } from 'vitest';
import {
  generateDailyPrices,
  calculatePriceStatistics,
} from '../price-algorithms';
import { getAssetVolatility, getAssetReturn } from '../market-scenarios';

describe('Historical Data Generator Utils', () => {
  describe('Price Algorithms', () => {
    it('should generate daily prices with positive starting price', () => {
      const prices = generateDailyPrices(100, 252, 0.1, 0.2);

      expect(prices).toHaveLength(252);
      expect(prices[0]).toBe(100);
      expect(prices.every((p) => p > 0)).toBe(true);
    });

    it('should calculate price statistics correctly', () => {
      const prices = [100, 105, 110, 108, 112];
      const stats = calculatePriceStatistics(prices);

      expect(stats.mean).toBeGreaterThan(0);
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(112);
      expect(stats.totalReturn).toBeCloseTo(12, 0);
    });
  });

  describe('Market Scenarios', () => {
    it('should apply asset-specific volatility multipliers', () => {
      const baseVolatility = 0.2;

      // Tech stocks have lower volatility
      expect(getAssetVolatility('AAPL', baseVolatility)).toBeLessThan(
        baseVolatility
      );

      // Crypto has higher volatility
      expect(getAssetVolatility('BTC', baseVolatility)).toBeGreaterThan(
        baseVolatility
      );

      // Unknown assets use base volatility
      expect(getAssetVolatility('UNKNOWN', baseVolatility)).toBe(
        baseVolatility
      );
    });

    it('should apply asset-specific return multipliers', () => {
      const baseReturn = 0.1;

      // Growth stocks outperform
      expect(getAssetReturn('NVDA', baseReturn)).toBeGreaterThan(baseReturn);

      // Bonds underperform
      expect(getAssetReturn('BND', baseReturn)).toBeLessThan(baseReturn);

      // Unknown assets use base return
      expect(getAssetReturn('UNKNOWN', baseReturn)).toBe(baseReturn);
    });
  });
});
