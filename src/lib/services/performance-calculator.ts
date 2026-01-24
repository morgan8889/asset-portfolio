/**
 * Performance Calculator Service
 *
 * Calculates holding performance metrics over configurable time periods.
 * Uses Decimal.js for financial precision.
 *
 * @module services/performance-calculator
 */

import { Decimal } from 'decimal.js';
import {
  HoldingPerformance,
  TimePeriod,
  TIME_PERIOD_CONFIGS,
} from '@/types/dashboard';
import { holdingQueries, assetQueries } from '@/lib/db';
import { Holding, Asset } from '@/types';
import { getPriceAtDate, createPriceCache } from './price-lookup';

/**
 * Calculate performance metrics between two values.
 */
export function calculatePerformance(
  startValue: Decimal,
  currentValue: Decimal
): { absoluteGain: Decimal; percentGain: number } {
  const absoluteGain = currentValue.minus(startValue);
  const percentGain = startValue.isZero()
    ? 0
    : absoluteGain.dividedBy(startValue).mul(100).toNumber();

  return { absoluteGain, percentGain };
}

/**
 * Get the value of a holding at a specific date.
 */
async function getHoldingValueAtDate(
  holding: Holding,
  date: Date,
  priceCache = createPriceCache()
): Promise<{ value: Decimal; isInterpolated: boolean }> {
  const { price, isInterpolated } = await getPriceAtDate(holding.assetId, date, priceCache);

  if (price.isZero()) {
    // No price history, use current value as fallback
    return { value: holding.currentValue, isInterpolated: true };
  }

  return {
    value: holding.quantity.mul(price),
    isInterpolated,
  };
}

/**
 * Calculate performance for all holdings in a portfolio over a time period.
 */
export async function calculateAllPerformance(
  portfolioId: string,
  period: TimePeriod
): Promise<HoldingPerformance[]> {
  const [holdings, assets] = await Promise.all([
    holdingQueries.getByPortfolio(portfolioId),
    assetQueries.getAll(),
  ]);

  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const startDate = TIME_PERIOD_CONFIGS[period].getStartDate();
  const priceCache = createPriceCache();

  const performances: HoldingPerformance[] = [];

  for (const holding of holdings) {
    const asset = assetMap.get(holding.assetId);
    if (!asset || holding.quantity.isZero()) continue;

    const { value: periodStartValue, isInterpolated } = await getHoldingValueAtDate(
      holding,
      startDate,
      priceCache
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

  return allPerformances
    .filter((p) => p.percentGain > 0)
    .sort((a, b) => b.percentGain - a.percentGain)
    .slice(0, count);
}

/**
 * Get the bottom N performing holdings sorted by percentage gain ascending.
 */
export async function getBiggestLosers(
  portfolioId: string,
  period: TimePeriod,
  count: number
): Promise<HoldingPerformance[]> {
  const allPerformances = await calculateAllPerformance(portfolioId, period);

  return allPerformances
    .filter((p) => p.percentGain < 0)
    .sort((a, b) => a.percentGain - b.percentGain)
    .slice(0, count);
}
