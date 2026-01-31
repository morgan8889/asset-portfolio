/**
 * Time-Weighted Return (TWR) Calculator Service
 *
 * Implements Modified Dietz TWR calculation for portfolio performance analytics.
 * Uses decimal.js for financial precision to avoid floating-point errors.
 *
 * TWR Formula:
 * TWR = [(1 + R1) × (1 + R2) × ... × (1 + Rn)] - 1
 *
 * Sub-period Return (Modified Dietz):
 * Ri = (EMV - BMV - CF) / (BMV + Σ(CFi × Wi))
 * Where:
 *   EMV = End Market Value
 *   BMV = Beginning Market Value
 *   CF = Sum of Cash Flows
 *   Wi = Weight = (days remaining) / (total days in sub-period)
 *
 * @module services/twr-calculator
 */

import { Decimal } from 'decimal.js';
import { differenceInDays, startOfDay, isSameDay } from 'date-fns';
import { CashFlowEvent, TWRResult, TWRSubPeriod } from '@/types/performance';

// =============================================================================
// Constants
// =============================================================================

/**
 * Number of trading days per year used for annualization calculations.
 * Standard market convention is 252 trading days (365 days - weekends - holidays).
 */
const TRADING_DAYS_PER_YEAR = 252;

/**
 * Number of calendar days per year for return calculations.
 */
const CALENDAR_DAYS_PER_YEAR = 365;

// =============================================================================
// Types
// =============================================================================

interface TWRInput {
  startDate: Date;
  endDate: Date;
  startValue: Decimal;
  endValue: Decimal;
  cashFlows: CashFlowEvent[];
}

interface DailyValuePoint {
  date: Date;
  value: Decimal;
}

// =============================================================================
// Pure Calculation Functions
// =============================================================================

/**
 * Calculate the Modified Dietz return for a single sub-period.
 *
 * Formula: R = (EMV - BMV - CF) / (BMV + Σ(CFi × Wi))
 *
 * @param startValue Beginning Market Value (BMV)
 * @param endValue End Market Value (EMV)
 * @param cashFlows Cash flow events in the period
 * @param startDate Period start date
 * @param endDate Period end date
 * @returns Period return as Decimal (-1 to infinity)
 */
export function calculatePeriodReturn(
  startValue: Decimal,
  endValue: Decimal,
  cashFlows: CashFlowEvent[],
  startDate: Date,
  endDate: Date
): Decimal {
  // Handle edge case: zero starting value
  if (startValue.isZero()) {
    // If starting from zero with cash flows, use simple return from cash flows
    const totalCashFlow = cashFlows.reduce(
      (sum, cf) => sum.plus(cf.amount),
      new Decimal(0)
    );
    if (totalCashFlow.isZero()) {
      return new Decimal(0);
    }
    // Return is (end value - total inflows) / total inflows
    return endValue.minus(totalCashFlow).div(totalCashFlow);
  }

  const totalDays = differenceInDays(endDate, startDate);
  if (totalDays === 0) {
    // Same day - calculate simple return
    if (startValue.isZero()) return new Decimal(0);
    return endValue.minus(startValue).div(startValue);
  }

  // Calculate total cash flows
  const totalCashFlow = cashFlows.reduce(
    (sum, cf) => sum.plus(cf.amount),
    new Decimal(0)
  );

  // Calculate weighted cash flows
  const weightedCashFlow = cashFlows.reduce((sum, cf) => {
    const daysRemaining = differenceInDays(endDate, cf.date);
    const weight = new Decimal(daysRemaining).div(totalDays);
    return sum.plus(cf.amount.mul(weight));
  }, new Decimal(0));

  // Denominator: BMV + weighted cash flows
  const denominator = startValue.plus(weightedCashFlow);

  // Avoid division by zero
  if (denominator.isZero()) {
    return new Decimal(0);
  }

  // Numerator: EMV - BMV - total cash flows
  const numerator = endValue.minus(startValue).minus(totalCashFlow);

  return numerator.div(denominator);
}

/**
 * Calculate Time-Weighted Return by compounding sub-period returns.
 *
 * TWR = [(1 + R1) × (1 + R2) × ... × (1 + Rn)] - 1
 *
 * @param subPeriodReturns Array of sub-period returns
 * @returns Compounded TWR as Decimal
 */
export function compoundReturns(subPeriodReturns: Decimal[]): Decimal {
  if (subPeriodReturns.length === 0) {
    return new Decimal(0);
  }

  const compoundedValue = subPeriodReturns.reduce(
    (acc, r) => acc.mul(new Decimal(1).plus(r)),
    new Decimal(1)
  );

  return compoundedValue.minus(1);
}

/**
 * Calculate annualized return from total return and time period.
 *
 * Annualized = (1 + R) ^ (365 / days) - 1
 *
 * @param totalReturn Total return as Decimal
 * @param days Number of days in the period
 * @returns Annualized return as number (percentage)
 */
export function annualizeReturn(totalReturn: Decimal, days: number): number {
  if (days <= 0) return 0;
  if (days < 30) {
    // For very short periods, don't annualize - just return the period return
    return totalReturn.toNumber() * 100;
  }

  const yearsHeld = days / CALENDAR_DAYS_PER_YEAR;
  const annualized = Math.pow(1 + totalReturn.toNumber(), 1 / yearsHeld) - 1;
  return annualized * 100; // Convert to percentage
}

/**
 * Split a date range into sub-periods at each cash flow event.
 *
 * @param input TWR calculation input with cash flows
 * @returns Array of sub-periods for calculation
 */
export function createSubPeriods(input: TWRInput): TWRSubPeriod[] {
  const { startDate, endDate, cashFlows } = input;

  if (cashFlows.length === 0) {
    // No cash flows - single period
    return [
      {
        startDate,
        endDate,
        startValue: input.startValue,
        endValue: input.endValue,
        cashFlows: [],
        periodReturn: new Decimal(0), // Will be calculated
      },
    ];
  }

  // Sort cash flows by date
  const sortedFlows = [...cashFlows].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  // Get unique cash flow dates (normalized to start of day)
  const breakDates = new Set<number>();
  sortedFlows.forEach((cf) => {
    const dayStart = startOfDay(cf.date).getTime();
    if (dayStart > startDate.getTime() && dayStart < endDate.getTime()) {
      breakDates.add(dayStart);
    }
  });

  // Create sub-periods at each break date
  const breaks = Array.from(breakDates).sort((a, b) => a - b);
  const subPeriods: TWRSubPeriod[] = [];

  let periodStart = startDate;
  for (const breakTime of breaks) {
    const breakDate = new Date(breakTime);
    const periodFlows = sortedFlows.filter(
      (cf) => cf.date >= periodStart && cf.date < breakDate
    );

    subPeriods.push({
      startDate: periodStart,
      endDate: breakDate,
      startValue: new Decimal(0), // Will be filled by caller
      endValue: new Decimal(0), // Will be filled by caller
      cashFlows: periodFlows,
      periodReturn: new Decimal(0),
    });

    periodStart = breakDate;
  }

  // Final sub-period
  const finalFlows = sortedFlows.filter(
    (cf) => cf.date >= periodStart && cf.date <= endDate
  );
  subPeriods.push({
    startDate: periodStart,
    endDate,
    startValue: new Decimal(0),
    endValue: new Decimal(0),
    cashFlows: finalFlows,
    periodReturn: new Decimal(0),
  });

  return subPeriods;
}

/**
 * Calculate TWR from daily portfolio values and cash flows.
 *
 * @param dailyValues Array of daily value points (must include start and end dates)
 * @param cashFlows Cash flow events
 * @returns TWRResult with total return and sub-period breakdown
 */
export function calculateTWRFromDailyValues(
  dailyValues: DailyValuePoint[],
  cashFlows: CashFlowEvent[]
): TWRResult {
  if (dailyValues.length < 2) {
    return {
      totalReturn: new Decimal(0),
      annualizedReturn: 0,
      startDate: dailyValues[0]?.date ?? new Date(),
      endDate: dailyValues[0]?.date ?? new Date(),
    };
  }

  // Sort by date
  const sorted = [...dailyValues].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  const startDate = sorted[0].date;
  const endDate = sorted[sorted.length - 1].date;
  const startValue = sorted[0].value;
  const endValue = sorted[sorted.length - 1].value;

  // Filter cash flows to the date range
  const relevantFlows = cashFlows.filter(
    (cf) => cf.date >= startDate && cf.date <= endDate
  );

  // If no cash flows, calculate simple period return
  if (relevantFlows.length === 0) {
    const periodReturn = calculatePeriodReturn(
      startValue,
      endValue,
      [],
      startDate,
      endDate
    );

    const days = differenceInDays(endDate, startDate);

    return {
      totalReturn: periodReturn,
      annualizedReturn: annualizeReturn(periodReturn, days),
      startDate,
      endDate,
      subPeriods: [
        {
          startDate,
          endDate,
          startValue,
          endValue,
          cashFlows: [],
          periodReturn,
        },
      ],
    };
  }

  // Create sub-periods at each cash flow date
  const input: TWRInput = {
    startDate,
    endDate,
    startValue,
    endValue,
    cashFlows: relevantFlows,
  };

  const subPeriods = createSubPeriods(input);

  // Find daily value for each sub-period boundary
  const getValue = (targetDate: Date): Decimal => {
    // Find exact match first
    const exact = sorted.find((v) => isSameDay(v.date, targetDate));
    if (exact) return exact.value;

    // Find closest earlier date
    const earlier = sorted
      .filter((v) => v.date <= targetDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    if (earlier) return earlier.value;

    // Fallback to first value
    return sorted[0].value;
  };

  // Calculate return for each sub-period
  const subPeriodReturns: Decimal[] = [];
  for (let i = 0; i < subPeriods.length; i++) {
    const period = subPeriods[i];
    period.startValue = i === 0 ? startValue : getValue(period.startDate);
    period.endValue =
      i === subPeriods.length - 1 ? endValue : getValue(period.endDate);

    period.periodReturn = calculatePeriodReturn(
      period.startValue,
      period.endValue,
      period.cashFlows,
      period.startDate,
      period.endDate
    );

    subPeriodReturns.push(period.periodReturn);
  }

  // Compound all sub-period returns
  const totalReturn = compoundReturns(subPeriodReturns);
  const days = differenceInDays(endDate, startDate);

  return {
    totalReturn,
    annualizedReturn: annualizeReturn(totalReturn, days),
    startDate,
    endDate,
    subPeriods,
  };
}

/**
 * Calculate simple return (not time-weighted).
 * Used for display purposes when TWR is not needed.
 *
 * @param startValue Beginning value
 * @param endValue Ending value
 * @returns Simple return as Decimal
 */
export function calculateSimpleReturn(
  startValue: Decimal,
  endValue: Decimal
): Decimal {
  if (startValue.isZero()) {
    return new Decimal(0);
  }
  return endValue.minus(startValue).div(startValue);
}

/**
 * Calculate cumulative return from start value to current value.
 *
 * @param startValue Beginning value
 * @param currentValue Current value
 * @returns Cumulative return as Decimal
 */
export function calculateCumulativeReturn(
  startValue: Decimal,
  currentValue: Decimal
): Decimal {
  return calculateSimpleReturn(startValue, currentValue);
}

/**
 * Calculate day-over-day change.
 *
 * @param previousValue Previous day's value
 * @param currentValue Current day's value
 * @returns Object with absolute change and percentage change
 */
export function calculateDayChange(
  previousValue: Decimal,
  currentValue: Decimal
): { change: Decimal; changePercent: number } {
  const change = currentValue.minus(previousValue);
  const changePercent = previousValue.isZero()
    ? 0
    : change.div(previousValue).mul(100).toNumber();

  return { change, changePercent };
}

/**
 * Calculate volatility (standard deviation of daily returns).
 *
 * @param dailyReturns Array of daily returns as numbers
 * @returns Annualized volatility as number (percentage)
 */
export function calculateVolatility(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
    (dailyReturns.length - 1);
  const stdDev = Math.sqrt(variance);

  // Annualize: multiply by sqrt(TRADING_DAYS_PER_YEAR)
  // Standard deviation scales with the square root of time
  return stdDev * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
}

