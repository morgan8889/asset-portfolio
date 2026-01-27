/**
 * Metrics Service
 *
 * Pure calculation functions for portfolio and holdings metrics.
 * All functions are stateless and operate on input data.
 */

import { Decimal } from 'decimal.js';
import {
  Holding,
  Asset,
  PortfolioMetrics,
  AllocationBreakdown,
  PerformanceMetrics,
  AssetType,
} from '@/types';

export interface HoldingWithAsset {
  holding: Holding;
  asset: Asset | undefined;
}

// =============================================================================
// Core Calculation Helpers
// =============================================================================

/**
 * Sum a Decimal field across holdings.
 */
function sumHoldings(
  holdings: Holding[],
  field: keyof Pick<Holding, 'currentValue' | 'costBasis' | 'unrealizedGain'>
): Decimal {
  return holdings.reduce((sum, h) => sum.plus(h[field]), new Decimal(0));
}

/**
 * Calculate percentage with division-by-zero safety.
 */
function safePercent(numerator: Decimal, denominator: Decimal): number {
  return denominator.isZero()
    ? 0
    : numerator.dividedBy(denominator).mul(100).toNumber();
}

// =============================================================================
// Portfolio Totals
// =============================================================================

export function calculateTotalValue(holdings: Holding[]): Decimal {
  return sumHoldings(holdings, 'currentValue');
}

export function calculateTotalCost(holdings: Holding[]): Decimal {
  return sumHoldings(holdings, 'costBasis');
}

export function calculateTotalGain(holdings: Holding[]): Decimal {
  return sumHoldings(holdings, 'unrealizedGain');
}

export function calculateGainPercent(
  totalGain: Decimal,
  totalCost: Decimal
): number {
  return safePercent(totalGain, totalCost);
}

// =============================================================================
// Allocation Calculations
// =============================================================================

export function calculateAllocationByType(
  holdingsWithAssets: HoldingWithAsset[],
  totalValue: Decimal
): AllocationBreakdown[] {
  const allocationMap = new Map<AssetType, Decimal>();

  for (const { holding, asset } of holdingsWithAssets) {
    const assetType = asset?.type || 'other';
    const current = allocationMap.get(assetType) || new Decimal(0);
    allocationMap.set(assetType, current.plus(holding.currentValue));
  }

  return Array.from(allocationMap.entries())
    .map(([type, value]) => ({
      type,
      value,
      percent: safePercent(value, totalValue),
    }))
    .sort((a, b) => b.value.minus(a.value).toNumber());
}

export function calculateHoldingAllocation(
  holdings: Holding[],
  totalValue: Decimal
): Array<{ holdingId: string; percent: number }> {
  return holdings.map((h) => ({
    holdingId: h.id,
    percent: safePercent(h.currentValue, totalValue),
  }));
}

// =============================================================================
// Change Calculations
// =============================================================================

export function calculateDayChange(
  currentValue: Decimal,
  previousValue: Decimal
): { change: Decimal; changePercent: number } {
  const change = currentValue.minus(previousValue);
  return { change, changePercent: safePercent(change, previousValue) };
}

// =============================================================================
// Performance Calculations
// =============================================================================

export function calculateBasicPerformance(
  totalGainPercent: number,
  _holdings: Holding[]
): PerformanceMetrics {
  // Advanced metrics require historical data
  return {
    roi: totalGainPercent,
    annualizedReturn: 0,
    volatility: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
  };
}

export function calculatePortfolioMetrics(
  holdingsWithAssets: HoldingWithAsset[],
  previousTotalValue?: Decimal
): PortfolioMetrics {
  const holdings = holdingsWithAssets.map((h) => h.holding);

  const totalValue = calculateTotalValue(holdings);
  const totalCost = calculateTotalCost(holdings);
  const totalGain = calculateTotalGain(holdings);
  const totalGainPercent = calculateGainPercent(totalGain, totalCost);

  const allocation = calculateAllocationByType(holdingsWithAssets, totalValue);
  const performance = calculateBasicPerformance(totalGainPercent, holdings);

  const { change: dayChange, changePercent: dayChangePercent } =
    previousTotalValue
      ? calculateDayChange(totalValue, previousTotalValue)
      : { change: new Decimal(0), changePercent: 0 };

  return {
    totalValue,
    totalCost,
    totalGain,
    totalGainPercent,
    dayChange,
    dayChangePercent,
    allocation,
    performance,
  };
}

// =============================================================================
// Rebalancing
// =============================================================================

export function calculateRebalancingNeeds(
  allocation: AllocationBreakdown[],
  targetAllocations: Map<AssetType, number>,
  totalValue: Decimal
): Array<{
  type: AssetType;
  currentPercent: number;
  targetPercent: number;
  drift: number;
  adjustmentValue: Decimal;
}> {
  return allocation.map((item) => {
    const targetPercent = targetAllocations.get(item.type) || 0;
    const drift = item.percent - targetPercent;
    const adjustmentValue = totalValue.mul(
      (targetPercent - item.percent) / 100
    );

    return {
      type: item.type,
      currentPercent: item.percent,
      targetPercent,
      drift,
      adjustmentValue,
    };
  });
}

// =============================================================================
// Position-Level Calculations
// =============================================================================

export function calculateWeightedAverageCost(
  quantity: Decimal,
  costBasis: Decimal
): Decimal {
  return quantity.isZero() ? new Decimal(0) : costBasis.dividedBy(quantity);
}

export function calculatePositionWeight(
  positionValue: Decimal,
  totalPortfolioValue: Decimal
): number {
  return safePercent(positionValue, totalPortfolioValue);
}

export function calculatePositionGainLoss(
  currentValue: Decimal,
  costBasis: Decimal
): { gain: Decimal; gainPercent: number } {
  const gain = currentValue.minus(costBasis);
  return { gain, gainPercent: safePercent(gain, costBasis) };
}

export function calculateDividendYield(
  annualDividend: Decimal,
  currentPrice: Decimal
): number {
  return safePercent(annualDividend, currentPrice);
}

// =============================================================================
// Advanced Performance Calculations (User Story 6)
// =============================================================================

// Constants for risk calculations
const MIN_SHARPE_RATIO_DATA_POINTS = 30;
const DEFAULT_RISK_FREE_RATE = 0.04; // 4% annual risk-free rate
const TRADING_DAYS_PER_YEAR = 252;

/**
 * Calculate Compound Annual Growth Rate (CAGR).
 *
 * Formula: ((endValue / startValue) ^ (1 / years)) - 1
 *
 * @param startValue - Initial portfolio value
 * @param endValue - Final portfolio value
 * @param daysHeld - Number of days between start and end
 * @returns Annualized return as percentage (e.g., 12.5 for 12.5%)
 */
export function calculateAnnualizedReturn(
  startValue: Decimal,
  endValue: Decimal,
  daysHeld: number
): number {
  if (daysHeld <= 0 || startValue.isZero() || startValue.isNegative()) {
    return 0;
  }

  const years = daysHeld / 365;
  const ratio = endValue.div(startValue).toNumber();

  // Handle negative returns (ratio < 1) and edge cases
  if (ratio <= 0) {
    return -100; // Complete loss
  }

  return (Math.pow(ratio, 1 / years) - 1) * 100;
}

/**
 * Calculate Maximum Drawdown - the largest peak-to-trough decline.
 *
 * Measures the worst percentage loss from a peak before a new peak is reached.
 * This is a key risk metric showing the worst case scenario an investor would face.
 *
 * @param historicalValues - Array of portfolio values over time, sorted chronologically
 * @returns Maximum drawdown as percentage (e.g., 25.0 for 25% drawdown)
 */
export function calculateMaxDrawdown(
  historicalValues: { date: Date; value: Decimal }[]
): number {
  if (historicalValues.length < 2) {
    return 0;
  }

  let maxDrawdown = 0;
  let peak = new Decimal(0);

  for (const point of historicalValues) {
    // Skip zero or negative values
    if (point.value.isZero() || point.value.isNegative()) {
      continue;
    }

    // Update peak if current value is higher
    if (point.value.gt(peak)) {
      peak = point.value;
    }

    // Calculate drawdown from peak
    if (peak.gt(0)) {
      const drawdown = peak.minus(point.value).div(peak).toNumber();
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }

  return maxDrawdown * 100; // Convert to percentage
}

/**
 * Calculate Sharpe Ratio - risk-adjusted return measure.
 *
 * Formula: (Average Return - Risk-Free Rate) / Standard Deviation
 * Uses annualized returns assuming daily data (252 trading days per year).
 *
 * @param returns - Array of period returns (e.g., daily percentage returns)
 * @param riskFreeRate - Annual risk-free rate (default 4% = 0.04)
 * @returns Sharpe ratio, or 0 if insufficient data (< 30 data points)
 */
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = DEFAULT_RISK_FREE_RATE
): number {
  // Require minimum data points for meaningful calculation
  if (returns.length < MIN_SHARPE_RATIO_DATA_POINTS) {
    return 0;
  }

  // Calculate mean return
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

  // Calculate variance
  const variance =
    returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
    returns.length;

  // Standard deviation
  const stdDev = Math.sqrt(variance);

  // No volatility (all same returns) means undefined Sharpe ratio
  // Use a small epsilon for floating point comparison
  if (stdDev < 1e-10) {
    return 0;
  }

  // Daily risk-free rate
  const dailyRiskFreeRate = riskFreeRate / TRADING_DAYS_PER_YEAR;

  // Annualized Sharpe ratio
  return (
    ((avgReturn - dailyRiskFreeRate) / stdDev) *
    Math.sqrt(TRADING_DAYS_PER_YEAR)
  );
}

/**
 * Calculate daily returns from historical portfolio values.
 * Skips data points where previous value is zero or negative (invalid denominator).
 * When a zero/negative value is encountered, the next return is calculated
 * from the last valid value.
 *
 * @param historicalValues - Array of portfolio values over time
 * @returns Array of daily percentage returns
 */
export function calculateDailyReturns(
  historicalValues: { date: Date; value: Decimal }[]
): number[] {
  if (historicalValues.length < 2) {
    return [];
  }

  const returns: number[] = [];
  let lastValidValue: Decimal | null = null;

  for (let i = 0; i < historicalValues.length; i++) {
    const current = historicalValues[i].value;

    // Skip current value if it's zero or negative
    if (current.isZero() || current.isNegative()) {
      continue;
    }

    // If we have a valid previous value, calculate return
    if (lastValidValue !== null) {
      const dailyReturn = current
        .minus(lastValidValue)
        .div(lastValidValue)
        .toNumber();
      returns.push(dailyReturn);
    }

    // Update last valid value
    lastValidValue = current;
  }

  return returns;
}
