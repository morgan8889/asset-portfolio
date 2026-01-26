/**
 * Performance Analytics Service
 *
 * Provides high-level analytics functionality including summary statistics,
 * chart data aggregation, and holding performance calculations.
 *
 * @module services/performance-analytics
 */

import { Decimal } from 'decimal.js';
import { format, differenceInDays } from 'date-fns';

import { TimePeriod, TIME_PERIOD_CONFIGS } from '@/types/dashboard';
import {
  PerformanceSummary,
  ChartDataPoint,
  HoldingPerformanceData,
  PerformanceSnapshot,
  ExportOptions,
  DayPerformance,
} from '@/types/performance';
import { db } from '@/lib/db/schema';
import { getSnapshots, getAggregatedSnapshots } from './snapshot-service';
import {
  calculateVolatility,
  calculateSharpeRatio,
} from './twr-calculator';

// =============================================================================
// Summary Statistics
// =============================================================================

/**
 * Get performance summary for a time period.
 */
export async function getSummary(
  portfolioId: string,
  period: TimePeriod
): Promise<PerformanceSummary | null> {
  const periodConfig = TIME_PERIOD_CONFIGS[period];
  const startDate = periodConfig.getStartDate();
  const endDate = new Date();

  const snapshots = await getSnapshots(portfolioId, startDate, endDate);

  if (snapshots.length === 0) {
    return null;
  }

  const firstSnapshot = snapshots[0];
  const lastSnapshot = snapshots[snapshots.length - 1];

  // Find period high, low, best day, worst day
  let periodHigh = firstSnapshot;
  let periodLow = firstSnapshot;
  let bestDay = firstSnapshot;
  let worstDay = firstSnapshot;
  const dailyReturns: number[] = [];

  for (const snap of snapshots) {
    if (snap.totalValue.gt(periodHigh.totalValue)) periodHigh = snap;
    if (snap.totalValue.lt(periodLow.totalValue)) periodLow = snap;
    if (snap.dayChangePercent > bestDay.dayChangePercent) bestDay = snap;
    if (snap.dayChangePercent < worstDay.dayChangePercent) worstDay = snap;
    if (snap.dayChangePercent !== 0) {
      dailyReturns.push(snap.dayChangePercent / 100);
    }
  }

  const totalReturn = lastSnapshot.totalValue.minus(firstSnapshot.totalValue);
  const totalReturnPercent = firstSnapshot.totalValue.isZero()
    ? 0
    : totalReturn.div(firstSnapshot.totalValue).mul(100).toNumber();

  const volatility = calculateVolatility(dailyReturns);
  const twrReturn = lastSnapshot.twrReturn.toNumber() * 100;
  const sharpeRatio = calculateSharpeRatio(twrReturn, volatility);

  return {
    portfolioId,
    period,
    startDate,
    endDate,
    startValue: firstSnapshot.totalValue,
    endValue: lastSnapshot.totalValue,
    totalReturn,
    totalReturnPercent,
    twrReturn,
    periodHigh: periodHigh.totalValue,
    periodHighDate: periodHigh.date,
    periodLow: periodLow.totalValue,
    periodLowDate: periodLow.date,
    bestDay: {
      date: bestDay.date,
      change: bestDay.dayChange,
      changePercent: bestDay.dayChangePercent,
    },
    worstDay: {
      date: worstDay.date,
      change: worstDay.dayChange,
      changePercent: worstDay.dayChangePercent,
    },
    volatility,
    sharpeRatio,
  };
}

// =============================================================================
// Chart Data
// =============================================================================

/**
 * Get chart data points for visualization.
 * Aggregates data based on period for optimal rendering.
 */
export async function getChartData(
  portfolioId: string,
  period: TimePeriod,
  includeBenchmark: boolean = false,
  benchmarkSymbol: string = '^GSPC'
): Promise<ChartDataPoint[]> {
  const periodConfig = TIME_PERIOD_CONFIGS[period];
  const startDate = periodConfig.getStartDate();
  const endDate = new Date();

  const snapshots = await getAggregatedSnapshots(portfolioId, startDate, endDate);

  return snapshots.map((snap) => ({
    date: snap.date,
    value: snap.totalValue.toNumber(),
    change: snap.dayChange.toNumber(),
    changePercent: snap.dayChangePercent,
    hasInterpolatedPrices: snap.hasInterpolatedPrices,
    // Benchmark data would be added here if includeBenchmark is true
  }));
}

// =============================================================================
// Holding Performance
// =============================================================================

/**
 * Get individual holding performance for the period.
 */
export async function getHoldingPerformance(
  portfolioId: string,
  period: TimePeriod
): Promise<HoldingPerformanceData[]> {
  const periodConfig = TIME_PERIOD_CONFIGS[period];
  const startDate = periodConfig.getStartDate();

  // Get holdings for the portfolio
  const holdings = await db.getHoldingsByPortfolio(portfolioId);

  // Get assets for naming
  const assets = await db.assets.toArray();
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  const result: HoldingPerformanceData[] = [];

  for (const holding of holdings) {
    const asset = assetMap.get(holding.assetId);
    if (!asset) continue;

    // Calculate performance based on cost basis and current value
    const currentValue = holding.quantity.mul(holding.averageCost || new Decimal(0));
    const costBasis = holding.costBasis;
    const absoluteGain = currentValue.minus(costBasis);
    const percentGain = costBasis.isZero()
      ? 0
      : absoluteGain.div(costBasis).mul(100).toNumber();

    // Calculate portfolio weight
    const totalPortfolioValue = holdings.reduce(
      (sum, h) => sum.plus(h.quantity.mul(h.averageCost || new Decimal(0))),
      new Decimal(0)
    );
    const weight = totalPortfolioValue.isZero()
      ? 0
      : currentValue.div(totalPortfolioValue).mul(100).toNumber();

    result.push({
      holdingId: holding.id,
      symbol: asset.symbol,
      name: asset.name,
      assetType: asset.type,
      quantity: holding.quantity,
      costBasis,
      currentValue,
      periodStartValue: costBasis, // Simplified - would need historical snapshot
      absoluteGain,
      percentGain,
      weight,
      isInterpolated: false,
    });
  }

  return result;
}

// =============================================================================
// Export Functions
// =============================================================================

/**
 * Export performance data to CSV.
 */
export async function exportToCSV(
  portfolioId: string,
  period: TimePeriod,
  options: ExportOptions = {}
): Promise<string> {
  const {
    includeBenchmark = false,
    benchmarkSymbol = '^GSPC',
    includeHoldings = false,
    dateFormat = 'yyyy-MM-dd',
  } = options;

  const periodConfig = TIME_PERIOD_CONFIGS[period];
  const startDate = periodConfig.getStartDate();
  const endDate = new Date();

  const snapshots = await getSnapshots(portfolioId, startDate, endDate);

  if (snapshots.length === 0) {
    return '';
  }

  // Build CSV headers
  const headers = [
    'Date',
    'Portfolio Value',
    'Daily Change',
    'Daily Change %',
    'Cumulative Return %',
  ];

  if (includeBenchmark) {
    headers.push('Benchmark Value', 'Benchmark Change %');
  }

  // Build CSV rows
  const firstValue = snapshots[0].totalValue;
  const rows = snapshots.map((snap) => {
    const cumReturn = firstValue.isZero()
      ? '0.00'
      : snap.totalValue.minus(firstValue).div(firstValue).mul(100).toFixed(2);

    const row = [
      format(snap.date, dateFormat),
      snap.totalValue.toFixed(2),
      snap.dayChange.toFixed(2),
      snap.dayChangePercent.toFixed(2),
      cumReturn,
    ];

    if (includeBenchmark) {
      // Benchmark data would be added here
      row.push('', '');
    }

    return row.join(',');
  });

  // Add holdings section if requested
  let holdingsSection = '';
  if (includeHoldings) {
    const holdings = await getHoldingPerformance(portfolioId, period);

    if (holdings.length > 0) {
      holdingsSection = '\n\nHoldings Performance\n';
      holdingsSection += 'Symbol,Name,Quantity,Cost Basis,Current Value,Gain/Loss,Gain %,Weight %\n';
      holdingsSection += holdings
        .map((h) =>
          [
            h.symbol,
            `"${h.name}"`,
            h.quantity.toFixed(4),
            h.costBasis.toFixed(2),
            h.currentValue.toFixed(2),
            h.absoluteGain.toFixed(2),
            h.percentGain.toFixed(2),
            h.weight.toFixed(2),
          ].join(',')
        )
        .join('\n');
    }
  }

  return headers.join(',') + '\n' + rows.join('\n') + holdingsSection;
}

// =============================================================================
// Data Aggregation Helpers
// =============================================================================

/**
 * Determine aggregation level based on date range.
 * Returns: 'daily' | 'weekly' | 'monthly'
 */
export function getAggregationLevel(
  startDate: Date,
  endDate: Date
): 'daily' | 'weekly' | 'monthly' {
  const days = differenceInDays(endDate, startDate);

  if (days <= 90) return 'daily';
  if (days <= 365) return 'weekly';
  return 'monthly';
}

/**
 * Get maximum data points for a time period.
 * Used to prevent chart performance issues.
 */
export function getMaxDataPoints(period: TimePeriod): number {
  switch (period) {
    case 'TODAY':
    case 'WEEK':
      return 7;
    case 'MONTH':
      return 30;
    case 'QUARTER':
      return 90;
    case 'YEAR':
      return 52; // Weekly
    case 'ALL':
      return 120; // Monthly
    default:
      return 100;
  }
}
