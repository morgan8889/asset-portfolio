/**
 * Performance Calculator Service
 *
 * Calculates holding performance metrics over configurable time periods.
 * Uses Decimal.js for all financial calculations to avoid floating-point errors.
 *
 * @module services/performance-calculator
 */

import { Decimal } from 'decimal.js';
import {
  HoldingPerformance,
  TimePeriod,
  TIME_PERIOD_CONFIGS,
} from '@/types/dashboard';
import { holdingQueries, assetQueries, priceQueries } from '@/lib/db';
import { Holding, Asset } from '@/types';

/**
 * Calculate performance metrics between two values.
 * @param startValue - Value at the start of the period
 * @param currentValue - Current value
 * @returns Object with absolute and percentage gain
 */
export function calculatePerformance(
  startValue: Decimal,
  currentValue: Decimal
): { absoluteGain: Decimal; percentGain: number } {
  const absoluteGain = currentValue.minus(startValue);

  // Avoid division by zero
  const percentGain = startValue.isZero()
    ? 0
    : absoluteGain.dividedBy(startValue).mul(100).toNumber();

  return { absoluteGain, percentGain };
}

/**
 * Get the value of a holding at a specific date.
 * Uses price history or interpolates if exact data is not available.
 */
async function getHoldingValueAtDate(
  holding: Holding,
  asset: Asset,
  date: Date
): Promise<{ value: Decimal; isInterpolated: boolean }> {
  // Get price history for the asset
  const daysSinceDate = Math.ceil(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  const priceHistory = await priceQueries.getHistoryForAsset(
    holding.assetId,
    daysSinceDate + 30 // Get extra days for interpolation
  );

  if (priceHistory.length === 0) {
    // No price history, use current value as fallback
    return { value: holding.currentValue, isInterpolated: true };
  }

  // Find the closest price to the target date
  let closestPrice = priceHistory[0];
  let minDiff = Math.abs(new Date(priceHistory[0].timestamp).getTime() - date.getTime());

  for (const snapshot of priceHistory) {
    const diff = Math.abs(new Date(snapshot.timestamp).getTime() - date.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closestPrice = snapshot;
    }
  }

  // If the closest price is more than 3 days away, mark as interpolated
  const isInterpolated = minDiff > 3 * 24 * 60 * 60 * 1000;

  // Calculate value: quantity * price at date
  const priceAtDate = new Decimal(closestPrice.price.toString());
  const value = holding.quantity.mul(priceAtDate);

  return { value, isInterpolated };
}

/**
 * Calculate performance for all holdings in a portfolio over a time period.
 */
export async function calculateAllPerformance(
  portfolioId: string,
  period: TimePeriod
): Promise<HoldingPerformance[]> {
  const holdings = await holdingQueries.getByPortfolio(portfolioId);
  const assets = await assetQueries.getAll();
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  const periodConfig = TIME_PERIOD_CONFIGS[period];
  const startDate = periodConfig.getStartDate();

  const performances: HoldingPerformance[] = [];

  for (const holding of holdings) {
    const asset = assetMap.get(holding.assetId);
    if (!asset) continue;

    // Skip holdings with zero quantity
    if (holding.quantity.isZero()) continue;

    const { value: periodStartValue, isInterpolated } = await getHoldingValueAtDate(
      holding,
      asset,
      startDate
    );

    const { absoluteGain, percentGain } = calculatePerformance(
      periodStartValue,
      holding.currentValue
    );

    performances.push({
      holdingId: holding.id,
      symbol: asset.symbol,
      name: asset.name,
      assetType: asset.type,
      currentValue: holding.currentValue,
      periodStartValue,
      absoluteGain,
      percentGain,
      period,
      isInterpolated,
    });
  }

  return performances;
}

/**
 * Get the top N performing holdings sorted by percentage gain descending.
 */
export async function getTopPerformers(
  portfolioId: string,
  period: TimePeriod,
  count: number
): Promise<HoldingPerformance[]> {
  const allPerformances = await calculateAllPerformance(portfolioId, period);

  // Filter for positive gains and sort descending
  return allPerformances
    .filter((p) => p.percentGain > 0)
    .sort((a, b) => b.percentGain - a.percentGain)
    .slice(0, count);
}

/**
 * Get the bottom N performing holdings sorted by percentage gain ascending (worst first).
 */
export async function getBiggestLosers(
  portfolioId: string,
  period: TimePeriod,
  count: number
): Promise<HoldingPerformance[]> {
  const allPerformances = await calculateAllPerformance(portfolioId, period);

  // Filter for negative gains and sort ascending (worst first)
  return allPerformances
    .filter((p) => p.percentGain < 0)
    .sort((a, b) => a.percentGain - b.percentGain)
    .slice(0, count);
}
