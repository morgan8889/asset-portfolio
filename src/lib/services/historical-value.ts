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
import {
  transactionQueries,
  priceQueries,
  holdingQueries,
  assetQueries,
} from '@/lib/db';
import { Transaction, Asset } from '@/types';
import { eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfDay } from 'date-fns';

type Resolution = 'daily' | 'weekly' | 'monthly';

/**
 * Determine the optimal resolution based on the time period.
 */
function getDefaultResolution(period: TimePeriod): Resolution {
  switch (period) {
    case 'TODAY':
    case 'WEEK':
      return 'daily';
    case 'MONTH':
    case 'QUARTER':
      return 'daily';
    case 'YEAR':
      return 'weekly';
    case 'ALL':
      return 'monthly';
    default:
      return 'daily';
  }
}

/**
 * Get date intervals for the given period and resolution.
 */
function getDateIntervals(startDate: Date, endDate: Date, resolution: Resolution): Date[] {
  const interval = { start: startDate, end: endDate };

  switch (resolution) {
    case 'daily':
      return eachDayOfInterval(interval);
    case 'weekly':
      return eachWeekOfInterval(interval);
    case 'monthly':
      return eachMonthOfInterval(interval);
    default:
      return eachDayOfInterval(interval);
  }
}

/**
 * Calculate holdings snapshot at a given date based on transactions up to that date.
 * Returns a map of assetId -> quantity.
 */
function calculateHoldingsAtDate(
  transactions: Transaction[],
  targetDate: Date
): Map<string, Decimal> {
  const holdings = new Map<string, Decimal>();

  // Filter transactions up to and including the target date
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
        // For stock splits, quantity is multiplied
        holdings.set(tx.assetId, currentQty.mul(tx.quantity));
        break;
      // dividend, interest, fee, tax don't affect quantity
    }
  }

  // Remove zero or negative quantities
  for (const [assetId, qty] of holdings.entries()) {
    if (qty.lte(0)) {
      holdings.delete(assetId);
    }
  }

  return holdings;
}

/**
 * Get price for an asset on a specific date.
 * Falls back to nearest available price if exact date not found.
 */
async function getPriceAtDate(
  assetId: string,
  date: Date,
  priceCache: Map<string, Map<string, { price: Decimal; isInterpolated: boolean }>>
): Promise<{ price: Decimal; isInterpolated: boolean }> {
  const dateKey = startOfDay(date).toISOString();
  const assetCache = priceCache.get(assetId);

  if (assetCache?.has(dateKey)) {
    return assetCache.get(dateKey)!;
  }

  // Get historical prices for the asset
  const daysSinceDate = Math.ceil((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  const priceHistory = await priceQueries.getHistoryForAsset(assetId, daysSinceDate + 30);

  if (priceHistory.length === 0) {
    // No price history available, use a default value
    return { price: new Decimal(0), isInterpolated: true };
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

  const isInterpolated = minDiff > 3 * 24 * 60 * 60 * 1000; // > 3 days

  const result = {
    price: new Decimal(closestPrice.price.toString()),
    isInterpolated,
  };

  // Cache the result
  if (!priceCache.has(assetId)) {
    priceCache.set(assetId, new Map());
  }
  priceCache.get(assetId)!.set(dateKey, result);

  return result;
}

/**
 * Get portfolio value history for chart display.
 *
 * @param portfolioId - Portfolio to analyze
 * @param period - Time period to fetch
 * @param resolution - Data point frequency (defaults based on period)
 */
export async function getHistoricalValues(
  portfolioId: string,
  period: TimePeriod,
  resolution?: Resolution
): Promise<HistoricalValuePoint[]> {
  const periodConfig = TIME_PERIOD_CONFIGS[period];
  const startDate = periodConfig.getStartDate();
  const endDate = new Date();

  // Get all transactions for the portfolio
  const transactions = await transactionQueries.getByPortfolio(portfolioId);

  // No transactions = no history
  if (transactions.length === 0) {
    return [];
  }

  // Determine resolution
  const effectiveResolution = resolution || getDefaultResolution(period);

  // Get date intervals
  const dates = getDateIntervals(startDate, endDate, effectiveResolution);

  // Price cache to avoid repeated queries
  const priceCache = new Map<string, Map<string, { price: Decimal; isInterpolated: boolean }>>();

  const points: HistoricalValuePoint[] = [];
  let previousValue = new Decimal(0);

  for (const date of dates) {
    // Calculate holdings at this date
    const holdingsAtDate = calculateHoldingsAtDate(transactions, date);

    let totalValue = new Decimal(0);
    let hasInterpolatedPrices = false;

    // Calculate total value for each holding
    for (const [assetId, quantity] of holdingsAtDate.entries()) {
      const { price, isInterpolated } = await getPriceAtDate(assetId, date, priceCache);
      totalValue = totalValue.plus(quantity.mul(price));
      if (isInterpolated) {
        hasInterpolatedPrices = true;
      }
    }

    const change = totalValue.minus(previousValue);

    points.push({
      date,
      totalValue,
      change,
      hasInterpolatedPrices,
    });

    previousValue = totalValue;
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

  if (transactions.length === 0) {
    return null;
  }

  const holdingsAtDate = calculateHoldingsAtDate(transactions, date);

  if (holdingsAtDate.size === 0) {
    return new Decimal(0);
  }

  const priceCache = new Map<string, Map<string, { price: Decimal; isInterpolated: boolean }>>();
  let totalValue = new Decimal(0);

  for (const [assetId, quantity] of holdingsAtDate.entries()) {
    const { price } = await getPriceAtDate(assetId, date, priceCache);
    totalValue = totalValue.plus(quantity.mul(price));
  }

  return totalValue;
}
