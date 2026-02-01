import Decimal from 'decimal.js';
import { addYears, addMonths } from 'date-fns';
import {
  FireConfig,
  ProjectionPoint,
  FireCalculation,
  Scenario,
  PLANNING_CONSTRAINTS,
} from '@/types/planning';

/**
 * Calculates the FIRE target number using the Safe Withdrawal Rate
 */
export function calculateFireNumber(
  annualExpenses: number,
  withdrawalRate: number
): Decimal {
  const expenses = new Decimal(annualExpenses);
  const rate = new Decimal(withdrawalRate);

  // FIRE Number = Annual Expenses / Withdrawal Rate
  // e.g., $40,000 / 0.04 = $1,000,000
  return expenses.div(rate);
}

/**
 * Calculates the real (inflation-adjusted) rate of return
 */
export function calculateRealReturn(
  nominalReturn: number,
  inflationRate: number
): number {
  // Real Return = (1 + Nominal) / (1 + Inflation) - 1
  const real = (1 + nominalReturn) / (1 + inflationRate) - 1;
  return real;
}

/**
 * Applies active scenarios to modify projection parameters
 */
export function applyScenarios(
  config: FireConfig,
  scenarios: Scenario[]
): FireConfig {
  let modifiedConfig = { ...config };

  const activeScenarios = scenarios.filter((s) => s.isActive);

  for (const scenario of activeScenarios) {
    switch (scenario.type) {
      case 'market_correction':
        // Reduce expected return by the scenario value (percentage)
        modifiedConfig.expectedReturn -= scenario.value / 100;
        break;

      case 'expense_increase':
        // Increase annual expenses by the scenario value (percentage)
        modifiedConfig.annualExpenses *= 1 + scenario.value / 100;
        break;

      case 'income_change':
        // Adjust monthly savings by the scenario value (percentage)
        modifiedConfig.monthlySavings *= 1 + scenario.value / 100;
        break;

      // one_time_expense is handled differently in projection
      default:
        break;
    }
  }

  return modifiedConfig;
}

/**
 * Generates a projection of net worth growth towards FIRE goal
 */
export function generateFireProjection(
  currentNetWorth: number,
  config: FireConfig,
  scenarios: Scenario[] = []
): ProjectionPoint[] {
  // Apply scenarios to configuration
  const modifiedConfig = applyScenarios(config, scenarios);

  const fireTarget = calculateFireNumber(
    modifiedConfig.annualExpenses,
    modifiedConfig.withdrawalRate
  );

  // Calculate real return rate
  const realReturn = calculateRealReturn(
    modifiedConfig.expectedReturn,
    modifiedConfig.inflationRate
  );

  const monthlyReturn = realReturn / 12;

  let currentBalance = new Decimal(currentNetWorth);
  const monthlySavings = new Decimal(modifiedConfig.monthlySavings);

  const projection: ProjectionPoint[] = [];
  const startDate = new Date();

  // Add current point
  projection.push({
    date: startDate,
    year: 0,
    netWorth: currentBalance.toNumber(),
    fireTarget: fireTarget.toNumber(),
    isProjected: false,
  });

  // Project forward month by month
  let month = 0;
  const maxMonths = PLANNING_CONSTRAINTS.MAX_PROJECTION_YEARS * 12;

  while (month < maxMonths && currentBalance.lessThan(fireTarget)) {
    month++;

    // Add monthly contribution
    currentBalance = currentBalance.plus(monthlySavings);

    // Apply monthly return
    const returnAmount = currentBalance.mul(monthlyReturn);
    currentBalance = currentBalance.plus(returnAmount);

    // Apply one-time expenses if applicable
    const oneTimeExpenses = scenarios.filter(
      (s) => s.isActive && s.type === 'one_time_expense' && s.durationMonths === month
    );

    for (const expense of oneTimeExpenses) {
      currentBalance = currentBalance.minus(expense.value);
    }

    // Add annual data points (every 12 months)
    if (month % 12 === 0) {
      projection.push({
        date: addMonths(startDate, month),
        year: month / 12,
        netWorth: currentBalance.toNumber(),
        fireTarget: fireTarget.toNumber(),
        isProjected: true,
      });
    }
  }

  // Add final point if we reached FIRE
  if (currentBalance.greaterThanOrEqualTo(fireTarget) && month % 12 !== 0) {
    projection.push({
      date: addMonths(startDate, month),
      year: month / 12,
      netWorth: currentBalance.toNumber(),
      fireTarget: fireTarget.toNumber(),
      isProjected: true,
    });
  }

  return projection;
}

/**
 * Calculates complete FIRE metrics
 */
export function calculateFireMetrics(
  currentNetWorth: number,
  config: FireConfig,
  scenarios: Scenario[] = []
): FireCalculation {
  const modifiedConfig = applyScenarios(config, scenarios);

  const fireNumber = calculateFireNumber(
    modifiedConfig.annualExpenses,
    modifiedConfig.withdrawalRate
  );

  const shortfall = fireNumber.minus(currentNetWorth);

  // If already at or above FIRE number
  if (shortfall.lessThanOrEqualTo(0)) {
    return {
      fireNumber: fireNumber.toNumber(),
      currentNetWorth,
      yearsToFire: 0,
      projectedFireDate: new Date(),
      monthlyProgress: 0,
    };
  }

  // Calculate years to FIRE using projection
  const projection = generateFireProjection(currentNetWorth, config, scenarios);

  // Find when we cross the FIRE number
  const firePoint = projection.find((p) => p.netWorth >= p.fireTarget);

  const yearsToFire = firePoint ? firePoint.year : Infinity;
  const projectedFireDate = firePoint ? firePoint.date : null;

  // Calculate monthly progress
  const realReturn = calculateRealReturn(
    modifiedConfig.expectedReturn,
    modifiedConfig.inflationRate
  );
  const monthlyReturn = realReturn / 12;

  const currentBalanceDecimal = new Decimal(currentNetWorth);
  const monthlySavings = new Decimal(modifiedConfig.monthlySavings);

  // Monthly progress = savings + (current balance * monthly return)
  const investmentGrowth = currentBalanceDecimal.mul(monthlyReturn);
  const monthlyProgress = monthlySavings.plus(investmentGrowth);

  return {
    fireNumber: fireNumber.toNumber(),
    currentNetWorth,
    yearsToFire,
    projectedFireDate,
    monthlyProgress: monthlyProgress.toNumber(),
  };
}

/**
 * Validates FIRE configuration parameters
 */
export function validateFireConfig(config: FireConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    config.withdrawalRate < PLANNING_CONSTRAINTS.MIN_WITHDRAWAL_RATE ||
    config.withdrawalRate > PLANNING_CONSTRAINTS.MAX_WITHDRAWAL_RATE
  ) {
    errors.push(
      `Withdrawal rate must be between ${PLANNING_CONSTRAINTS.MIN_WITHDRAWAL_RATE * 100}% and ${PLANNING_CONSTRAINTS.MAX_WITHDRAWAL_RATE * 100}%`
    );
  }

  if (
    config.expectedReturn < PLANNING_CONSTRAINTS.MIN_EXPECTED_RETURN ||
    config.expectedReturn > PLANNING_CONSTRAINTS.MAX_EXPECTED_RETURN
  ) {
    errors.push(
      `Expected return must be between ${PLANNING_CONSTRAINTS.MIN_EXPECTED_RETURN * 100}% and ${PLANNING_CONSTRAINTS.MAX_EXPECTED_RETURN * 100}%`
    );
  }

  if (
    config.inflationRate < PLANNING_CONSTRAINTS.MIN_INFLATION_RATE ||
    config.inflationRate > PLANNING_CONSTRAINTS.MAX_INFLATION_RATE
  ) {
    errors.push(
      `Inflation rate must be between ${PLANNING_CONSTRAINTS.MIN_INFLATION_RATE * 100}% and ${PLANNING_CONSTRAINTS.MAX_INFLATION_RATE * 100}%`
    );
  }

  if (config.annualExpenses <= 0) {
    errors.push('Annual expenses must be greater than 0');
  }

  if (config.monthlySavings < 0) {
    errors.push('Monthly savings cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
