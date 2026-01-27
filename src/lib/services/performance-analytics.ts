/**
 * Performance Analytics Service
 *
 * Provides high-level analytics functionality including summary statistics,
 * chart data aggregation, and holding performance calculations.
 *
 * @module services/performance-analytics
 */

import { Decimal } from 'decimal.js';
import {
  format,
  differenceInDays,
  startOfYear,
  endOfYear,
  subYears,
  isAfter,
  isBefore,
} from 'date-fns';

import { TimePeriod, TIME_PERIOD_CONFIGS } from '@/types/dashboard';
import {
  PerformanceSummary,
  ChartDataPoint,
  HoldingPerformanceData,
  PerformanceSnapshot,
  ExportOptions,
  DayPerformance,
  YearOverYearMetric,
} from '@/types/performance';
import { db } from '@/lib/db/schema';
import { getSnapshots, getAggregatedSnapshots } from './snapshot-service';
import {
  calculateVolatility,
  calculateSharpeRatio,
  annualizeReturn,
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

  const snapshots = await getAggregatedSnapshots(
    portfolioId,
    startDate,
    endDate
  );

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
    const currentValue = holding.quantity.mul(
      holding.averageCost || new Decimal(0)
    );
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
      holdingsSection +=
        'Symbol,Name,Quantity,Cost Basis,Current Value,Gain/Loss,Gain %,Weight %\n';
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
  if (days <= 1095) return 'monthly'; // 3 years = ~1095 days
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

// =============================================================================
// Year-over-Year Growth
// =============================================================================

/**
 * Calculate Year-over-Year CAGR metrics for the portfolio.
 * Returns metrics for each complete calendar year plus current YTD.
 *
 * @param portfolioId Portfolio ID to calculate metrics for
 * @returns Array of YearOverYearMetric objects, one per year
 */
export async function getYoYMetrics(
  portfolioId: string
): Promise<YearOverYearMetric[]> {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Get all available snapshots
  const allSnapshots = await getSnapshots(
    portfolioId,
    new Date(0), // From beginning
    now
  );

  if (allSnapshots.length === 0) {
    return [];
  }

  const firstSnapshot = allSnapshots[0];
  const firstYear = firstSnapshot.date.getFullYear();

  // If portfolio has less than 1 year of data, return empty
  const portfolioAgeDays = differenceInDays(now, firstSnapshot.date);
  if (portfolioAgeDays < 365) {
    return [];
  }

  const metrics: YearOverYearMetric[] = [];

  // Calculate metrics for each complete calendar year
  for (let year = firstYear; year <= currentYear; year++) {
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 11, 31));

    // Adjust boundaries if portfolio started mid-year or we're in current year
    const actualStart = isBefore(yearStart, firstSnapshot.date)
      ? firstSnapshot.date
      : yearStart;
    const actualEnd = isAfter(yearEnd, now) ? now : yearEnd;

    // Find snapshots closest to the start and end dates
    const startSnapshot = findClosestSnapshot(allSnapshots, actualStart);
    const endSnapshot = findClosestSnapshot(allSnapshots, actualEnd);

    if (!startSnapshot || !endSnapshot) {
      continue;
    }

    // Skip if start and end are the same day
    if (startSnapshot.date.getTime() === endSnapshot.date.getTime()) {
      continue;
    }

    const daysInPeriod = differenceInDays(endSnapshot.date, startSnapshot.date);
    const isPartialYear = daysInPeriod < 365 || year === currentYear;

    // Calculate simple return
    const simpleReturn = startSnapshot.totalValue.isZero()
      ? new Decimal(0)
      : endSnapshot.totalValue
          .minus(startSnapshot.totalValue)
          .div(startSnapshot.totalValue);

    // Annualize the return to get CAGR
    const cagr = annualizeReturn(simpleReturn, daysInPeriod);

    // Determine label
    let label: string;
    if (year === currentYear) {
      label = 'Current Year (YTD)';
    } else {
      label = year.toString();
    }

    metrics.push({
      label,
      startDate: startSnapshot.date,
      endDate: endSnapshot.date,
      startValue: startSnapshot.totalValue,
      endValue: endSnapshot.totalValue,
      cagr,
      daysInPeriod,
      isPartialYear,
    });
  }

  return metrics;
}

/**
 * Find the snapshot closest to a target date.
 * Prefers snapshots on or before the target date when possible.
 */
function findClosestSnapshot(
  snapshots: PerformanceSnapshot[],
  targetDate: Date
): PerformanceSnapshot | null {
  if (snapshots.length === 0) return null;

  // Find the closest snapshot on or before the target date
  let closest: PerformanceSnapshot | null = null;
  let minDiff = Infinity;

  for (const snap of snapshots) {
    const diff = Math.abs(differenceInDays(targetDate, snap.date));

    // Prefer snapshots on or before the target
    if (snap.date <= targetDate && diff < minDiff) {
      closest = snap;
      minDiff = diff;
    }
  }

  // If no snapshot before target, take the first one after
  if (!closest) {
    closest = snapshots.find((s) => s.date >= targetDate) || snapshots[0];
  }

  return closest;
}
