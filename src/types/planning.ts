import Decimal from 'decimal.js';

/**
 * Represents a debt or liability (mortgage, loan, etc.)
 */
export interface Liability {
  id: string;
  portfolioId: string;
  name: string;
  balance: number; // Stored as number, converted to Decimal in calculations
  interestRate: number; // Annual percentage (e.g., 0.045 for 4.5%)
  payment: number; // Monthly payment amount
  startDate: string; // ISO date string
  termMonths?: number; // Original term in months (optional)
  createdAt: string;
  updatedAt: string;
}

/**
 * FIRE (Financial Independence, Retire Early) configuration
 */
export interface FireConfig {
  annualExpenses: number; // Desired annual retirement income
  withdrawalRate: number; // Safe Withdrawal Rate (default 0.04 for 4%)
  monthlySavings: number; // Monthly contribution amount
  expectedReturn: number; // Expected annual return (default 0.07 for 7%)
  inflationRate: number; // Expected annual inflation (default 0.03 for 3%)
  retirementAge?: number; // Optional target retirement age
  currentAge?: number; // Optional current age for context
}

/**
 * Default FIRE configuration values
 */
export const DEFAULT_FIRE_CONFIG: FireConfig = {
  annualExpenses: 40000,
  withdrawalRate: 0.04,
  monthlySavings: 1000,
  expectedReturn: 0.07,
  inflationRate: 0.03,
};

/**
 * A point in a financial projection
 */
export interface ProjectionPoint {
  date: Date;
  year: number; // Years from now
  netWorth: number;
  fireTarget: number;
  isProjected: boolean;
  calendarYear?: number; // Actual year (2025, 2026, ...)
  userAge?: number; // User's age at this point (if currentAge provided)
  yearsToRetirement?: number; // Years until retirement (if retirementAge provided)
}

/**
 * A point in the net worth history
 */
export interface NetWorthPoint {
  date: Date;
  assets: number;
  liabilities: number;
  netWorth: number;
}

/**
 * "What-If" scenario type
 */
export type ScenarioType = 'market_correction' | 'expense_increase' | 'income_change' | 'one_time_expense';

/**
 * A financial planning scenario
 */
export interface Scenario {
  id: string;
  name: string;
  type: ScenarioType;
  value: number; // Percentage change or dollar amount
  durationMonths?: number; // How long the scenario lasts (optional for one-time events)
  isActive: boolean;
  createdAt: string;
}

/**
 * Result of FIRE calculation
 */
export interface FireCalculation {
  fireNumber: number; // Target net worth needed
  currentNetWorth: number;
  yearsToFire: number;
  projectedFireDate: Date | null;
  monthlyProgress: number; // How much closer to FIRE each month
  retirementAge?: number; // Target retirement age
  ageAtFire?: number; // User's age when reaching FIRE
  yearsBeforeRetirement?: number; // Years before retirement age (negative if after)
}

/**
 * Validation constraints for planning data
 */
export const PLANNING_CONSTRAINTS = {
  MIN_WITHDRAWAL_RATE: 0.01, // 1%
  MAX_WITHDRAWAL_RATE: 0.10, // 10%
  MIN_EXPECTED_RETURN: -0.20, // -20%
  MAX_EXPECTED_RETURN: 0.30, // 30%
  MIN_INFLATION_RATE: -0.05, // -5%
  MAX_INFLATION_RATE: 0.20, // 20%
  MAX_PROJECTION_YEARS: 50,
};
