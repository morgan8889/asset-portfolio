/**
 * Snapshot Service
 *
 * Manages pre-computed daily performance snapshots for fast chart rendering.
 * Snapshots are stored in IndexedDB and computed incrementally when transactions
 * are added/modified/deleted.
 *
 * @module services/snapshot-service
 */

import { Decimal } from 'decimal.js';
import {
  startOfDay,
  eachDayOfInterval,
  differenceInDays,
  isSameDay,
  subDays,
} from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/schema';
import { transactionQueries } from '@/lib/db';
import { Transaction } from '@/types';
import {
  PerformanceSnapshot,
  PerformanceSnapshotStorage,
  CashFlowEvent,
} from '@/types/performance';
import {
  calculatePeriodReturn,
  calculateDayChange,
  calculateCumulativeReturn,
  compoundReturns,
} from './twr-calculator';
import { getPriceAtDate, createPriceCache, PriceCache } from './price-lookup';

// =============================================================================
// Types
// =============================================================================

interface HoldingsAtDate {
  holdings: Map<string, Decimal>; // assetId -> quantity
  totalCost: Decimal;
}

interface ComputeSnapshotResult {
  totalValue: Decimal;
  totalCost: Decimal;
  holdingCount: number;
  hasInterpolatedPrices: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate holdings and cost basis at a given date from transactions.
 */
function calculateHoldingsAtDate(
  transactions: Transaction[],
  targetDate: Date
): HoldingsAtDate {
  const holdings = new Map<string, Decimal>();
  let totalCost = new Decimal(0);

  const relevantTx = transactions
    .filter((tx) => startOfDay(new Date(tx.date)) <= startOfDay(targetDate))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const tx of relevantTx) {
    const currentQty = holdings.get(tx.assetId) || new Decimal(0);

    switch (tx.type) {
      case 'buy':
      case 'transfer_in':
      case 'reinvestment':
        holdings.set(tx.assetId, currentQty.plus(tx.quantity));
        // Add to cost basis
        totalCost = totalCost.plus(tx.totalAmount);
        break;
      case 'sell':
      case 'transfer_out':
        holdings.set(tx.assetId, currentQty.minus(tx.quantity));
        // Reduce cost basis proportionally (simplified FIFO)
        if (!currentQty.isZero()) {
          const costPerShare = totalCost.div(currentQty);
          totalCost = totalCost.minus(costPerShare.mul(tx.quantity));
        }
        break;
      case 'split':
        holdings.set(tx.assetId, currentQty.mul(tx.quantity));
        // Cost basis unchanged for splits
        break;
    }
  }

  // Remove zero or negative quantities
  for (const [assetId, qty] of holdings.entries()) {
    if (qty.lte(0)) holdings.delete(assetId);
  }

  return { holdings, totalCost: totalCost.gt(0) ? totalCost : new Decimal(0) };
}

/**
 * Calculate portfolio value at a date.
 */
async function calculateValueAtDate(
  holdings: Map<string, Decimal>,
  date: Date,
  priceCache: PriceCache
): Promise<ComputeSnapshotResult> {
  let totalValue = new Decimal(0);
  let hasInterpolatedPrices = false;

  for (const [assetId, quantity] of holdings.entries()) {
    try {
      const { price, isInterpolated } = await getPriceAtDate(assetId, date, priceCache);
      totalValue = totalValue.plus(quantity.mul(price));
      if (isInterpolated) hasInterpolatedPrices = true;
    } catch (error) {
      console.error(`Error getting price for asset ${assetId} at ${date}:`, error);
      hasInterpolatedPrices = true;
    }
  }

  return {
    totalValue,
    totalCost: new Decimal(0), // Will be set by caller
    holdingCount: holdings.size,
    hasInterpolatedPrices,
  };
}

/**
 * Get cash flow events from transactions (for TWR calculation).
 */
function getCashFlowEvents(transactions: Transaction[]): CashFlowEvent[] {
  return transactions
    .filter((tx) => tx.type === 'buy' || tx.type === 'sell')
    .map((tx) => ({
      date: new Date(tx.date),
      amount: tx.type === 'buy'
        ? tx.totalAmount
        : tx.totalAmount.neg(),
    }));
}

// =============================================================================
// Snapshot Service
// =============================================================================

/**
 * Get all snapshots for a portfolio within a date range.
 */
export async function getSnapshots(
  portfolioId: string,
  startDate: Date,
  endDate: Date
): Promise<PerformanceSnapshot[]> {
  return db.getPerformanceSnapshotsByPortfolio(portfolioId, startDate, endDate);
}

/**
 * Get the latest snapshot for a portfolio.
 */
export async function getLatestSnapshot(
  portfolioId: string
): Promise<PerformanceSnapshot | null> {
  return db.getLatestPerformanceSnapshot(portfolioId);
}

/**
 * Compute and persist snapshots for a date range.
 * Called when transactions are added/modified/deleted.
 *
 * @param portfolioId Portfolio to compute snapshots for
 * @param fromDate Start computing from this date
 * @param toDate End date (defaults to today)
 */
export async function computeSnapshots(
  portfolioId: string,
  fromDate: Date,
  toDate: Date = new Date()
): Promise<void> {
  const normalizedFrom = startOfDay(fromDate);
  const normalizedTo = startOfDay(toDate);

  // Get all transactions for this portfolio
  const transactions = await transactionQueries.getByPortfolio(portfolioId);
  if (transactions.length === 0) {
    // No transactions - delete any existing snapshots
    await db.deletePerformanceSnapshotsByPortfolio(portfolioId);
    return;
  }

  // Find earliest transaction date
  const earliestTxDate = transactions.reduce((min, tx) => {
    const txDate = startOfDay(new Date(tx.date));
    return txDate < min ? txDate : min;
  }, startOfDay(new Date(transactions[0].date)));

  // Effective start date is the later of fromDate and earliest transaction
  const effectiveFrom = normalizedFrom > earliestTxDate ? normalizedFrom : earliestTxDate;

  // Generate date range
  const dates = eachDayOfInterval({ start: effectiveFrom, end: normalizedTo });
  const priceCache = createPriceCache();

  // Get existing snapshots before this range (for TWR calculation)
  const previousSnapshots = await getSnapshots(
    portfolioId,
    subDays(effectiveFrom, 365),
    subDays(effectiveFrom, 1)
  );

  // Calculate initial TWR from previous snapshots
  let previousTwrReturn = new Decimal(0);
  if (previousSnapshots.length > 0) {
    const lastPrevSnapshot = previousSnapshots[previousSnapshots.length - 1];
    previousTwrReturn = lastPrevSnapshot.twrReturn;
  }

  let previousValue = new Decimal(0);
  let previousCumulativeReturn = new Decimal(0);

  // Get previous day's snapshot for day change calculation
  if (previousSnapshots.length > 0) {
    const lastPrevSnapshot = previousSnapshots[previousSnapshots.length - 1];
    previousValue = lastPrevSnapshot.totalValue;
    previousCumulativeReturn = lastPrevSnapshot.cumulativeReturn;
  }

  // Get cash flows for TWR calculation
  const cashFlows = getCashFlowEvents(transactions);

  for (let i = 0; i < dates.length; i++) {
    const date = dates[i];
    const { holdings, totalCost } = calculateHoldingsAtDate(transactions, date);

    if (holdings.size === 0) {
      // No holdings at this date - skip
      continue;
    }

    const valueResult = await calculateValueAtDate(holdings, date, priceCache);

    // Calculate day change
    const { change: dayChange, changePercent: dayChangePercent } =
      previousValue.isZero()
        ? { change: new Decimal(0), changePercent: 0 }
        : calculateDayChange(previousValue, valueResult.totalValue);

    // Calculate cumulative return from inception
    const cumulativeReturn = totalCost.isZero()
      ? new Decimal(0)
      : calculateCumulativeReturn(totalCost, valueResult.totalValue);

    // Calculate TWR return - simplified approach using daily returns
    // For proper TWR, we compound daily returns between cash flows
    const periodCashFlows = cashFlows.filter(
      (cf) => isSameDay(cf.date, date)
    );

    let twrReturn: Decimal;
    if (i === 0 && previousSnapshots.length === 0) {
      // First snapshot ever
      twrReturn = new Decimal(0);
    } else {
      // Calculate period return and compound with previous TWR
      const periodReturn = !previousValue.isZero()
        ? calculatePeriodReturn(
            previousValue,
            valueResult.totalValue,
            periodCashFlows,
            i > 0 ? dates[i - 1] : subDays(date, 1),
            date
          )
        : new Decimal(0);

      // Compound with previous TWR: (1 + prev) * (1 + period) - 1
      twrReturn = compoundReturns([previousTwrReturn, periodReturn]);
    }

    const now = new Date();
    const snapshot: PerformanceSnapshotStorage = {
      id: uuidv4(),
      portfolioId,
      date,
      totalValue: valueResult.totalValue.toString(),
      totalCost: totalCost.toString(),
      dayChange: dayChange.toString(),
      dayChangePercent,
      cumulativeReturn: cumulativeReturn.toString(),
      twrReturn: twrReturn.toString(),
      holdingCount: valueResult.holdingCount,
      hasInterpolatedPrices: valueResult.hasInterpolatedPrices,
      createdAt: now,
      updatedAt: now,
    };

    await db.upsertPerformanceSnapshot(snapshot);

    // Update previous values for next iteration
    previousValue = valueResult.totalValue;
    previousCumulativeReturn = cumulativeReturn;
    previousTwrReturn = twrReturn;
  }
}

/**
 * Invalidate and recompute all snapshots for a portfolio.
 * Used for manual refresh or data correction.
 */
export async function recomputeAll(portfolioId: string): Promise<void> {
  // Delete all existing snapshots
  await db.deletePerformanceSnapshotsByPortfolio(portfolioId);

  // Get all transactions
  const transactions = await transactionQueries.getByPortfolio(portfolioId);
  if (transactions.length === 0) return;

  // Find earliest transaction date
  const earliestDate = transactions.reduce((min, tx) => {
    const txDate = new Date(tx.date);
    return txDate < min ? txDate : min;
  }, new Date(transactions[0].date));

  // Recompute from earliest transaction to today
  await computeSnapshots(portfolioId, earliestDate, new Date());
}

/**
 * Delete all snapshots for a portfolio.
 * Called when portfolio is deleted.
 */
export async function deleteSnapshots(portfolioId: string): Promise<void> {
  await db.deletePerformanceSnapshotsByPortfolio(portfolioId);
}

/**
 * Handle snapshot computation trigger event.
 * Called from transaction store when transactions change.
 */
export async function handleSnapshotTrigger(
  event: {
    type: 'TRANSACTION_ADDED' | 'TRANSACTION_MODIFIED' | 'TRANSACTION_DELETED' | 'MANUAL_REFRESH';
    portfolioId: string;
    date?: Date;
    oldDate?: Date;
    newDate?: Date;
  }
): Promise<void> {
  const { type, portfolioId } = event;

  switch (type) {
    case 'TRANSACTION_ADDED':
      if (event.date) {
        await computeSnapshots(portfolioId, event.date);
      }
      break;

    case 'TRANSACTION_MODIFIED':
      if (event.oldDate && event.newDate) {
        // Recompute from the earlier of old and new dates
        const fromDate = event.oldDate < event.newDate ? event.oldDate : event.newDate;
        await computeSnapshots(portfolioId, fromDate);
      }
      break;

    case 'TRANSACTION_DELETED':
      if (event.date) {
        await computeSnapshots(portfolioId, event.date);
      }
      break;

    case 'MANUAL_REFRESH':
      await recomputeAll(portfolioId);
      break;
  }
}

/**
 * Check if snapshots need to be computed for a portfolio.
 * Returns true if there are transactions but no snapshots.
 */
export async function needsComputation(portfolioId: string): Promise<boolean> {
  const transactions = await transactionQueries.getByPortfolio(portfolioId);
  if (transactions.length === 0) return false;

  const latestSnapshot = await getLatestSnapshot(portfolioId);
  if (!latestSnapshot) return true;

  // Check if latest snapshot is more than 1 day old
  const daysSinceSnapshot = differenceInDays(new Date(), latestSnapshot.date);
  return daysSinceSnapshot > 1;
}

/**
 * Get snapshots with aggregation for chart display.
 * Aggregates to weekly/monthly for long time periods.
 */
export async function getAggregatedSnapshots(
  portfolioId: string,
  startDate: Date,
  endDate: Date
): Promise<PerformanceSnapshot[]> {
  const snapshots = await getSnapshots(portfolioId, startDate, endDate);
  const days = differenceInDays(endDate, startDate);

  // No aggregation needed for short periods
  if (days <= 90 || snapshots.length <= 90) {
    return snapshots;
  }

  // Aggregate to weekly for 90-365 days
  if (days <= 365) {
    return aggregateToWeekly(snapshots);
  }

  // Aggregate to monthly for > 365 days
  return aggregateToMonthly(snapshots);
}

function aggregateToWeekly(snapshots: PerformanceSnapshot[]): PerformanceSnapshot[] {
  if (snapshots.length === 0) return [];

  const result: PerformanceSnapshot[] = [];
  let currentWeek: PerformanceSnapshot[] = [];
  let currentWeekStart = startOfDay(snapshots[0].date);

  for (const snapshot of snapshots) {
    const daysSinceWeekStart = differenceInDays(snapshot.date, currentWeekStart);

    if (daysSinceWeekStart >= 7) {
      // End of week - take last snapshot
      if (currentWeek.length > 0) {
        result.push(currentWeek[currentWeek.length - 1]);
      }
      currentWeek = [snapshot];
      currentWeekStart = startOfDay(snapshot.date);
    } else {
      currentWeek.push(snapshot);
    }
  }

  // Don't forget the last week
  if (currentWeek.length > 0) {
    result.push(currentWeek[currentWeek.length - 1]);
  }

  return result;
}

function aggregateToMonthly(snapshots: PerformanceSnapshot[]): PerformanceSnapshot[] {
  if (snapshots.length === 0) return [];

  const result: PerformanceSnapshot[] = [];
  let currentMonth = snapshots[0].date.getMonth();
  let currentMonthSnapshots: PerformanceSnapshot[] = [];

  for (const snapshot of snapshots) {
    const month = snapshot.date.getMonth();

    if (month !== currentMonth) {
      // End of month - take last snapshot
      if (currentMonthSnapshots.length > 0) {
        result.push(currentMonthSnapshots[currentMonthSnapshots.length - 1]);
      }
      currentMonthSnapshots = [snapshot];
      currentMonth = month;
    } else {
      currentMonthSnapshots.push(snapshot);
    }
  }

  // Don't forget the last month
  if (currentMonthSnapshots.length > 0) {
    result.push(currentMonthSnapshots[currentMonthSnapshots.length - 1]);
  }

  return result;
}
