/**
 * Historical Value Service
 *
 * Reconstructs portfolio value over time from transaction history and price data.
 * Used for growth charts and historical performance analysis.
 *
 * @module services/historical-value
 */

import { Decimal } from 'decimal.js';
import {
  HistoricalValuePoint,
  TimePeriod,
  TIME_PERIOD_CONFIGS,
} from '@/types/dashboard';
import { transactionQueries } from '@/lib/db';
import { Transaction } from '@/types';
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from 'date-fns';
import { getPriceAtDate, createPriceCache, PriceCache } from './price-lookup';

type Resolution = 'daily' | 'weekly' | 'monthly';

/**
 * Determine optimal resolution based on time period.
 */
function getDefaultResolution(period: TimePeriod): Resolution {
  switch (period) {
    case 'TODAY':
    case 'WEEK':
    case 'MONTH':
    case 'QUARTER':
      return 'daily';
    case 'YEAR':
      return 'weekly';
    case 'ALL':
      return 'monthly';
  }
}

/**
 * Get date intervals for the given period and resolution.
 */
function getDateIntervals(
  startDate: Date,
  endDate: Date,
  resolution: Resolution
): Date[] {
  const interval = { start: startDate, end: endDate };

  switch (resolution) {
    case 'daily':
      return eachDayOfInterval(interval);
    case 'weekly':
      return eachWeekOfInterval(interval);
    case 'monthly':
      return eachMonthOfInterval(interval);
  }
}

/**
 * Calculate holdings snapshot at a given date based on transactions.
 * Returns a map of assetId -> quantity.
 */
function calculateHoldingsAtDate(
  transactions: Transaction[],
  targetDate: Date
): Map<string, Decimal> {
  const holdings = new Map<string, Decimal>();

  const relevantTx = transactions.filter(
    (tx) => new Date(tx.date) <= targetDate
  );

  for (const tx of relevantTx) {
    const currentQty = holdings.get(tx.assetId) || new Decimal(0);

    switch (tx.type) {
      case 'buy':
      case 'transfer_in':
      case 'reinvestment':
        holdings.set(tx.assetId, currentQty.plus(tx.quantity));
        break;
      case 'sell':
      case 'transfer_out':
        holdings.set(tx.assetId, currentQty.minus(tx.quantity));
        break;
      case 'split':
        holdings.set(tx.assetId, currentQty.mul(tx.quantity));
        break;
    }
  }

  // Remove zero or negative quantities
  for (const [assetId, qty] of holdings.entries()) {
    if (qty.lte(0)) holdings.delete(assetId);
  }

  return holdings;
}

/**
 * Calculate total portfolio value at a date given holdings.
 */
async function calculateValueAtDate(
  holdings: Map<string, Decimal>,
  date: Date,
  priceCache: PriceCache
): Promise<{ totalValue: Decimal; hasInterpolatedPrices: boolean }> {
  let totalValue = new Decimal(0);
  let hasInterpolatedPrices = false;

  for (const [assetId, quantity] of holdings.entries()) {
    try {
      const { price, isInterpolated } = await getPriceAtDate(
        assetId,
        date,
        priceCache
      );
      totalValue = totalValue.plus(quantity.mul(price));
      if (isInterpolated) hasInterpolatedPrices = true;
    } catch (error) {
      console.error(
        `Error calculating value for asset ${assetId} at ${date}:`,
        error
      );
      // Skip this asset and continue with others
      hasInterpolatedPrices = true;
    }
  }

  return { totalValue, hasInterpolatedPrices };
}

/**
 * Get portfolio value history for chart display.
 */
export async function getHistoricalValues(
  portfolioId: string,
  period: TimePeriod,
  resolution?: Resolution
): Promise<HistoricalValuePoint[]> {
  const transactions = await transactionQueries.getByPortfolio(portfolioId);
  if (transactions.length === 0) return [];

  const periodConfig = TIME_PERIOD_CONFIGS[period];
  let startDate = periodConfig.getStartDate();
  const endDate = new Date();

  // For ALL period, use earliest transaction date instead of Unix epoch
  if (period === 'ALL' && transactions.length > 0) {
    const earliestDate = transactions.reduce((min, tx) => {
      const txDate = new Date(tx.date);
      return txDate < min ? txDate : min;
    }, new Date());
    startDate = earliestDate;
  }

  const effectiveResolution = resolution || getDefaultResolution(period);
  const dates = getDateIntervals(startDate, endDate, effectiveResolution);
  const priceCache = createPriceCache();

  // Find the earliest transaction date to avoid calculating empty data points
  const earliestTxDate =
    transactions.length > 0
      ? transactions.reduce((min, tx) => {
          const txDate = new Date(tx.date);
          return txDate < min ? txDate : min;
        }, new Date(transactions[0].date))
      : new Date();

  const points: HistoricalValuePoint[] = [];
  let previousValue = new Decimal(0);

  for (const date of dates) {
    // Skip dates before the earliest transaction to avoid $0 data points
    if (date < earliestTxDate) {
      continue;
    }

    try {
      const holdingsAtDate = calculateHoldingsAtDate(transactions, date);
      const { totalValue, hasInterpolatedPrices } = await calculateValueAtDate(
        holdingsAtDate,
        date,
        priceCache
      );

      points.push({
        date,
        totalValue,
        change: totalValue.minus(previousValue),
        hasInterpolatedPrices,
      });

      previousValue = totalValue;
    } catch (error) {
      console.error(`Error calculating historical value for ${date}:`, error);
      // Skip this date point and continue
    }
  }

  return points;
}

/**
 * Get portfolio value at a specific point in time.
 */
export async function getValueAtDate(
  portfolioId: string,
  date: Date
): Promise<Decimal | null> {
  const transactions = await transactionQueries.getByPortfolio(portfolioId);
  if (transactions.length === 0) return null;

  const holdingsAtDate = calculateHoldingsAtDate(transactions, date);
  if (holdingsAtDate.size === 0) return new Decimal(0);

  const priceCache = createPriceCache();
  const { totalValue } = await calculateValueAtDate(
    holdingsAtDate,
    date,
    priceCache
  );

  return totalValue;
}
