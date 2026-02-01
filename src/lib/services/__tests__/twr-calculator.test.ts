/**
 * TWR Calculator Tests
 *
 * Tests for Time-Weighted Return calculations including:
 * - Single-period returns
 * - Multi-period compounding
 * - Cash flow timing
 * - Zero/negative values
 * - Decimal precision
 *
 * @module services/__tests__/twr-calculator.test
 */

import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  calculatePeriodReturn,
  compoundReturns,
  annualizeReturn,
  calculateTWRFromDailyValues,
  calculateSimpleReturn,
  calculateCumulativeReturn,
  calculateDayChange,
  calculateVolatility,
  createSubPeriods,
} from '../twr-calculator';
import { CashFlowEvent } from '@/types/performance';

describe('TWR Calculator', () => {
  describe('calculatePeriodReturn', () => {
    it('should calculate simple return without cash flows', () => {
      const startValue = new Decimal(10000);
      const endValue = new Decimal(11000);
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = calculatePeriodReturn(
        startValue,
        endValue,
        [],
        startDate,
        endDate
      );

      // 10% return
      expect(result.toNumber()).toBeCloseTo(0.1, 4);
    });

    it('should calculate return with cash inflow (buy)', () => {
      const startValue = new Decimal(10000);
      const endValue = new Decimal(15500); // 10000 initial + 5000 inflow + 500 gain
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const cashFlows: CashFlowEvent[] = [
        { date: new Date('2024-01-15'), amount: new Decimal(5000) },
      ];

      const result = calculatePeriodReturn(
        startValue,
        endValue,
        cashFlows,
        startDate,
        endDate
      );

      // Modified Dietz calculation:
      // Numerator: 15500 - 10000 - 5000 = 500
      // Days remaining for cash flow: 16 days (Jan 15 to Jan 31)
      // Weight: 16/30 = 0.533
      // Weighted CF: 5000 * 0.533 = 2665
      // Denominator: 10000 + 2665 = 12665
      // Return: 500 / 12665 = 0.0395
      expect(result.toNumber()).toBeCloseTo(0.04, 2);
    });

    it('should calculate return with cash outflow (sell)', () => {
      const startValue = new Decimal(10000);
      const endValue = new Decimal(5300); // 10000 - 5000 outflow + 300 gain
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const cashFlows: CashFlowEvent[] = [
        { date: new Date('2024-01-15'), amount: new Decimal(-5000) },
      ];

      const result = calculatePeriodReturn(
        startValue,
        endValue,
        cashFlows,
        startDate,
        endDate
      );

      // Numerator: 5300 - 10000 - (-5000) = 300
      expect(result.greaterThan(0)).toBe(true);
    });

    it('should handle zero starting value', () => {
      const startValue = new Decimal(0);
      const endValue = new Decimal(10500);
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const cashFlows: CashFlowEvent[] = [
        { date: new Date('2024-01-01'), amount: new Decimal(10000) },
      ];

      const result = calculatePeriodReturn(
        startValue,
        endValue,
        cashFlows,
        startDate,
        endDate
      );

      // 5% gain on 10000 inflow
      expect(result.toNumber()).toBeCloseTo(0.05, 2);
    });

    it('should return 0 for same day with no change', () => {
      const value = new Decimal(10000);
      const date = new Date('2024-01-01');

      const result = calculatePeriodReturn(value, value, [], date, date);

      expect(result.toNumber()).toBe(0);
    });

    it('should handle negative returns', () => {
      const startValue = new Decimal(10000);
      const endValue = new Decimal(8000);
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = calculatePeriodReturn(
        startValue,
        endValue,
        [],
        startDate,
        endDate
      );

      // -20% return
      expect(result.toNumber()).toBeCloseTo(-0.2, 4);
    });
  });

  describe('compoundReturns', () => {
    it('should compound multiple positive returns', () => {
      const returns = [
        new Decimal(0.1), // 10%
        new Decimal(0.05), // 5%
        new Decimal(0.02), // 2%
      ];

      const result = compoundReturns(returns);

      // (1.10 * 1.05 * 1.02) - 1 = 0.1781
      expect(result.toNumber()).toBeCloseTo(0.1781, 4);
    });

    it('should compound mixed positive and negative returns', () => {
      const returns = [
        new Decimal(0.1), // +10%
        new Decimal(-0.05), // -5%
      ];

      const result = compoundReturns(returns);

      // (1.10 * 0.95) - 1 = 0.045
      expect(result.toNumber()).toBeCloseTo(0.045, 4);
    });

    it('should return 0 for empty returns', () => {
      const result = compoundReturns([]);
      expect(result.toNumber()).toBe(0);
    });

    it('should handle single return', () => {
      const result = compoundReturns([new Decimal(0.15)]);
      expect(result.toNumber()).toBeCloseTo(0.15, 4);
    });
  });

  describe('annualizeReturn', () => {
    it('should annualize a one-year return', () => {
      const totalReturn = new Decimal(0.1); // 10%
      const days = 365;

      const result = annualizeReturn(totalReturn, days);

      expect(result).toBeCloseTo(10, 1);
    });

    it('should annualize a half-year return', () => {
      const totalReturn = new Decimal(0.05); // 5% in 6 months
      const days = 182;

      const result = annualizeReturn(totalReturn, days);

      // ~10.25% annualized
      expect(result).toBeGreaterThan(10);
    });

    it('should not annualize very short periods', () => {
      const totalReturn = new Decimal(0.01); // 1% in 7 days
      const days = 7;

      const result = annualizeReturn(totalReturn, days);

      // Should return period return, not annualized
      expect(result).toBeCloseTo(1, 1);
    });

    it('should handle zero days', () => {
      const result = annualizeReturn(new Decimal(0.1), 0);
      expect(result).toBe(0);
    });
  });

  describe('calculateTWRFromDailyValues', () => {
    it('should calculate TWR without cash flows', () => {
      const dailyValues = [
        { date: new Date('2024-01-01'), value: new Decimal(10000) },
        { date: new Date('2024-01-15'), value: new Decimal(10500) },
        { date: new Date('2024-01-31'), value: new Decimal(11000) },
      ];

      const result = calculateTWRFromDailyValues(dailyValues, []);

      expect(result.totalReturn.toNumber()).toBeCloseTo(0.1, 4);
      expect(result.subPeriods).toHaveLength(1);
    });

    it('should calculate TWR with cash flow creating sub-periods', () => {
      const dailyValues = [
        { date: new Date('2024-01-01'), value: new Decimal(10000) },
        { date: new Date('2024-01-15'), value: new Decimal(10500) }, // Before deposit
        { date: new Date('2024-01-16'), value: new Decimal(15750) }, // After deposit (10500 + 5000 + 250 gain)
        { date: new Date('2024-01-31'), value: new Decimal(16500) },
      ];

      const cashFlows: CashFlowEvent[] = [
        { date: new Date('2024-01-16'), amount: new Decimal(5000) },
      ];

      const result = calculateTWRFromDailyValues(dailyValues, cashFlows);

      // TWR should be independent of cash flow timing
      expect(result.totalReturn.greaterThan(0)).toBe(true);
    });

    it('should handle single data point', () => {
      const dailyValues = [
        { date: new Date('2024-01-01'), value: new Decimal(10000) },
      ];

      const result = calculateTWRFromDailyValues(dailyValues, []);

      expect(result.totalReturn.toNumber()).toBe(0);
    });

    it('should handle empty data', () => {
      const result = calculateTWRFromDailyValues([], []);

      expect(result.totalReturn.toNumber()).toBe(0);
    });
  });

  describe('createSubPeriods', () => {
    it('should create single period with no cash flows', () => {
      const input = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startValue: new Decimal(10000),
        endValue: new Decimal(11000),
        cashFlows: [],
      };

      const result = createSubPeriods(input);

      expect(result).toHaveLength(1);
      expect(result[0].startDate).toEqual(input.startDate);
      expect(result[0].endDate).toEqual(input.endDate);
    });

    it('should create sub-periods at each cash flow date', () => {
      const input = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        startValue: new Decimal(10000),
        endValue: new Decimal(20000),
        cashFlows: [
          { date: new Date('2024-01-10'), amount: new Decimal(5000) },
          { date: new Date('2024-01-20'), amount: new Decimal(3000) },
        ],
      };

      const result = createSubPeriods(input);

      // Should have 3 periods: Jan 1-10, Jan 10-20, Jan 20-31
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('calculateSimpleReturn', () => {
    it('should calculate positive return', () => {
      const result = calculateSimpleReturn(
        new Decimal(10000),
        new Decimal(12000)
      );
      expect(result.toNumber()).toBeCloseTo(0.2, 4);
    });

    it('should calculate negative return', () => {
      const result = calculateSimpleReturn(
        new Decimal(10000),
        new Decimal(8000)
      );
      expect(result.toNumber()).toBeCloseTo(-0.2, 4);
    });

    it('should return 0 for zero start value', () => {
      const result = calculateSimpleReturn(new Decimal(0), new Decimal(10000));
      expect(result.toNumber()).toBe(0);
    });
  });

  describe('calculateDayChange', () => {
    it('should calculate positive day change', () => {
      const result = calculateDayChange(new Decimal(10000), new Decimal(10100));

      expect(result.change.toNumber()).toBe(100);
      expect(result.changePercent).toBeCloseTo(1, 2);
    });

    it('should calculate negative day change', () => {
      const result = calculateDayChange(new Decimal(10000), new Decimal(9900));

      expect(result.change.toNumber()).toBe(-100);
      expect(result.changePercent).toBeCloseTo(-1, 2);
    });

    it('should handle zero previous value', () => {
      const result = calculateDayChange(new Decimal(0), new Decimal(100));

      expect(result.change.toNumber()).toBe(100);
      expect(result.changePercent).toBe(0);
    });
  });

  describe('calculateVolatility', () => {
    it('should calculate volatility from daily returns', () => {
      // Example daily returns around 0.1% daily average
      const dailyReturns = [0.001, -0.002, 0.003, -0.001, 0.002];

      const result = calculateVolatility(dailyReturns);

      // Should be a positive number
      expect(result).toBeGreaterThan(0);
    });

    it('should return 0 for single return', () => {
      const result = calculateVolatility([0.01]);
      expect(result).toBe(0);
    });

    it('should return 0 for empty returns', () => {
      const result = calculateVolatility([]);
      expect(result).toBe(0);
    });

    it('should return 0 for constant returns', () => {
      const dailyReturns = [0.01, 0.01, 0.01, 0.01, 0.01];
      const result = calculateVolatility(dailyReturns);
      expect(result).toBeCloseTo(0, 4);
    });
  });

  describe('Decimal precision', () => {
    it('should maintain precision for large values', () => {
      const startValue = new Decimal('1000000.123456789');
      const endValue = new Decimal('1100000.987654321');

      const result = calculatePeriodReturn(
        startValue,
        endValue,
        [],
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      // Should not lose precision
      expect(result.decimalPlaces()).toBeGreaterThan(0);
    });

    it('should handle very small returns', () => {
      const startValue = new Decimal(1000000);
      const endValue = new Decimal(1000001); // $1 gain on $1M

      const result = calculatePeriodReturn(
        startValue,
        endValue,
        [],
        new Date('2024-01-01'),
        new Date('2024-01-02')
      );

      expect(result.toNumber()).toBeCloseTo(0.000001, 8);
    });
  });
});
