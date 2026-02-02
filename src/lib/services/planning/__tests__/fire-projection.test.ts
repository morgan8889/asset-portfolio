import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  calculateFireNumber,
  calculateRealReturn,
  generateFireProjection,
  calculateFireMetrics,
  validateFireConfig,
  applyScenarios,
} from '../fire-projection';
import { FireConfig, Scenario, DEFAULT_FIRE_CONFIG } from '@/types/planning';

describe('FIRE Projection Calculations', () => {
  describe('calculateFireNumber', () => {
    it('should calculate FIRE number using 4% rule', () => {
      const fireNumber = calculateFireNumber(40000, 0.04);
      expect(fireNumber.toNumber()).toBe(1000000);
    });

    it('should calculate FIRE number with 3% withdrawal rate', () => {
      const fireNumber = calculateFireNumber(60000, 0.03);
      expect(fireNumber.toNumber()).toBeCloseTo(2000000, 0);
    });

    it('should handle decimal precision correctly', () => {
      const fireNumber = calculateFireNumber(45000, 0.04);
      expect(fireNumber.toNumber()).toBe(1125000);
    });
  });

  describe('calculateRealReturn', () => {
    it('should calculate real return adjusting for inflation', () => {
      const realReturn = calculateRealReturn(0.07, 0.03);
      // (1.07 / 1.03) - 1 ≈ 0.0388
      expect(realReturn).toBeCloseTo(0.0388, 4);
    });

    it('should handle zero inflation', () => {
      const realReturn = calculateRealReturn(0.07, 0.0);
      expect(realReturn).toBeCloseTo(0.07, 10);
    });

    it('should handle negative real returns', () => {
      const realReturn = calculateRealReturn(0.02, 0.05);
      // (1.02 / 1.05) - 1 ≈ -0.0286
      expect(realReturn).toBeCloseTo(-0.0286, 4);
    });
  });

  describe('validateFireConfig', () => {
    it('should validate correct configuration', () => {
      const result = validateFireConfig(DEFAULT_FIRE_CONFIG);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject withdrawal rate outside valid range', () => {
      const config: FireConfig = {
        ...DEFAULT_FIRE_CONFIG,
        withdrawalRate: 0.15, // 15% - too high
      };
      const result = validateFireConfig(config);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('Withdrawal rate must be between'))
      ).toBe(true);
    });

    it('should reject negative monthly savings', () => {
      const config: FireConfig = {
        ...DEFAULT_FIRE_CONFIG,
        monthlySavings: -500,
      };
      const result = validateFireConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Monthly savings cannot be negative');
    });

    it('should reject zero or negative annual expenses', () => {
      const config: FireConfig = {
        ...DEFAULT_FIRE_CONFIG,
        annualExpenses: 0,
      };
      const result = validateFireConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Annual expenses must be greater than 0');
    });

    it('should reject expected return outside valid range', () => {
      const config: FireConfig = {
        ...DEFAULT_FIRE_CONFIG,
        expectedReturn: 0.4, // 40% - unrealistic
      };
      const result = validateFireConfig(config);
      expect(result.valid).toBe(false);
      expect(
        result.errors.some((e) => e.includes('Expected return must be between'))
      ).toBe(true);
    });
  });

  describe('generateFireProjection', () => {
    it('should generate projection reaching FIRE goal', () => {
      const config: FireConfig = {
        annualExpenses: 40000,
        withdrawalRate: 0.04,
        monthlySavings: 2000,
        expectedReturn: 0.07,
        inflationRate: 0.03,
      };

      const projection = generateFireProjection(100000, config);

      expect(projection.length).toBeGreaterThan(1);
      expect(projection[0].netWorth).toBe(100000);
      expect(projection[0].isProjected).toBe(false);

      // Should have projected points
      const projectedPoints = projection.filter((p) => p.isProjected);
      expect(projectedPoints.length).toBeGreaterThan(0);

      // Last point should be at or above FIRE target
      const lastPoint = projection[projection.length - 1];
      expect(lastPoint.netWorth).toBeGreaterThanOrEqual(lastPoint.fireTarget);
    });

    it('should handle case where already at FIRE number', () => {
      const config: FireConfig = {
        annualExpenses: 40000,
        withdrawalRate: 0.04,
        monthlySavings: 1000,
        expectedReturn: 0.07,
        inflationRate: 0.03,
      };

      const projection = generateFireProjection(1000000, config); // Already at FIRE

      expect(projection.length).toBe(1);
      expect(projection[0].netWorth).toBe(1000000);
    });

    it('should project annual points correctly', () => {
      const config: FireConfig = {
        annualExpenses: 40000,
        withdrawalRate: 0.04,
        monthlySavings: 3000,
        expectedReturn: 0.08,
        inflationRate: 0.03,
      };

      const projection = generateFireProjection(50000, config);

      // Check that year values increment correctly
      const years = projection.map((p) => p.year);
      for (let i = 1; i < years.length; i++) {
        expect(years[i]).toBeGreaterThan(years[i - 1]);
      }
    });

    it('should compound returns correctly over time', () => {
      const config: FireConfig = {
        annualExpenses: 40000,
        withdrawalRate: 0.04,
        monthlySavings: 0, // No savings to isolate return calculation
        expectedReturn: 0.12, // 12% nominal
        inflationRate: 0.03, // 3% inflation
      };

      const projection = generateFireProjection(100000, config);

      // Real return should be ~8.74% annually
      // After 1 year, should be approximately $108,740
      const oneYearPoint = projection.find((p) => p.year === 1);
      expect(oneYearPoint).toBeDefined();
      expect(oneYearPoint!.netWorth).toBeGreaterThan(108000);
      expect(oneYearPoint!.netWorth).toBeLessThan(110000);
    });
  });

  describe('applyScenarios', () => {
    it('should apply market correction scenario', () => {
      const scenario: Scenario = {
        id: '1',
        name: 'Market Crash',
        type: 'market_correction',
        value: 20, // 20% drop
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const modified = applyScenarios(DEFAULT_FIRE_CONFIG, [scenario]);

      expect(modified.expectedReturn).toBe(
        DEFAULT_FIRE_CONFIG.expectedReturn - 0.2
      );
    });

    it('should apply expense increase scenario', () => {
      const scenario: Scenario = {
        id: '1',
        name: 'Lifestyle Inflation',
        type: 'expense_increase',
        value: 10, // 10% increase
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const modified = applyScenarios(DEFAULT_FIRE_CONFIG, [scenario]);

      expect(modified.annualExpenses).toBe(
        DEFAULT_FIRE_CONFIG.annualExpenses * 1.1
      );
    });

    it('should apply income change scenario', () => {
      const scenario: Scenario = {
        id: '1',
        name: 'Salary Increase',
        type: 'income_change',
        value: 15, // 15% increase
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const modified = applyScenarios(DEFAULT_FIRE_CONFIG, [scenario]);

      expect(modified.monthlySavings).toBe(
        DEFAULT_FIRE_CONFIG.monthlySavings * 1.15
      );
    });

    it('should ignore inactive scenarios', () => {
      const scenario: Scenario = {
        id: '1',
        name: 'Inactive Scenario',
        type: 'market_correction',
        value: 50,
        isActive: false,
        createdAt: new Date().toISOString(),
      };

      const modified = applyScenarios(DEFAULT_FIRE_CONFIG, [scenario]);

      expect(modified).toEqual(DEFAULT_FIRE_CONFIG);
    });

    it('should apply multiple scenarios cumulatively', () => {
      const scenarios: Scenario[] = [
        {
          id: '1',
          name: 'Market Correction',
          type: 'market_correction',
          value: 10,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Expense Increase',
          type: 'expense_increase',
          value: 5,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const modified = applyScenarios(DEFAULT_FIRE_CONFIG, scenarios);

      expect(modified.expectedReturn).toBe(
        DEFAULT_FIRE_CONFIG.expectedReturn - 0.1
      );
      expect(modified.annualExpenses).toBe(
        DEFAULT_FIRE_CONFIG.annualExpenses * 1.05
      );
    });
  });

  describe('calculateFireMetrics', () => {
    it('should calculate metrics for someone far from FIRE', () => {
      const config: FireConfig = {
        annualExpenses: 40000,
        withdrawalRate: 0.04,
        monthlySavings: 2000,
        expectedReturn: 0.07,
        inflationRate: 0.03,
      };

      const metrics = calculateFireMetrics(100000, config);

      expect(metrics.fireNumber).toBe(1000000);
      expect(metrics.currentNetWorth).toBe(100000);
      expect(metrics.yearsToFire).toBeGreaterThan(10);
      expect(metrics.yearsToFire).toBeLessThan(30);
      expect(metrics.projectedFireDate).not.toBeNull();
      expect(metrics.monthlyProgress).toBeGreaterThan(0);
    });

    it('should calculate metrics for someone already at FIRE', () => {
      const config: FireConfig = {
        annualExpenses: 40000,
        withdrawalRate: 0.04,
        monthlySavings: 1000,
        expectedReturn: 0.07,
        inflationRate: 0.03,
      };

      const metrics = calculateFireMetrics(1200000, config);

      expect(metrics.fireNumber).toBe(1000000);
      expect(metrics.currentNetWorth).toBe(1200000);
      expect(metrics.yearsToFire).toBe(0);
    });

    it('should calculate realistic monthly progress', () => {
      const config: FireConfig = {
        annualExpenses: 40000,
        withdrawalRate: 0.04,
        monthlySavings: 3000,
        expectedReturn: 0.07,
        inflationRate: 0.03,
      };

      const metrics = calculateFireMetrics(500000, config);

      // Monthly progress should be savings + investment growth
      // Real return ≈ 3.88% annually, ≈ 0.32% monthly
      // Growth on $500k ≈ $1,600/month
      // Total progress ≈ $3,000 + $1,600 = $4,600
      expect(metrics.monthlyProgress).toBeGreaterThan(4000);
      expect(metrics.monthlyProgress).toBeLessThan(5000);
    });

    it('should handle scenarios in metrics calculation', () => {
      const config: FireConfig = {
        annualExpenses: 40000,
        withdrawalRate: 0.04,
        monthlySavings: 2000,
        expectedReturn: 0.07,
        inflationRate: 0.03,
      };

      const scenario: Scenario = {
        id: '1',
        name: 'Market Crash',
        type: 'market_correction',
        value: 30, // 30% drop in returns
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const metricsWithScenario = calculateFireMetrics(100000, config, [
        scenario,
      ]);
      const metricsWithoutScenario = calculateFireMetrics(100000, config, []);

      // With worse returns, should take longer to reach FIRE
      expect(metricsWithScenario.yearsToFire).toBeGreaterThan(
        metricsWithoutScenario.yearsToFire
      );
    });
  });
});
