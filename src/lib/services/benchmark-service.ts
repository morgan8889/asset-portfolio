/**
 * Benchmark Service
 *
 * Provides benchmark data fetching, caching, and comparison functionality.
 * Supports S&P 500, Dow Jones, NASDAQ, and other major indices.
 *
 * @module services/benchmark-service
 */

import { Decimal } from 'decimal.js';
import { differenceInDays, startOfDay, format, addDays } from 'date-fns';

import { db } from '@/lib/db/schema';
import { TimePeriod, TIME_PERIOD_CONFIGS } from '@/types/dashboard';
import {
  BenchmarkDataPoint,
  BenchmarkInfo,
  BenchmarkComparison,
} from '@/types/performance';
import { createPriceHistoryId, createAssetId } from '@/types/storage';
import { getSnapshots } from './snapshot-service';

// =============================================================================
// Constants
// =============================================================================

/**
 * Supported benchmark indices with their metadata.
 */
export const SUPPORTED_BENCHMARKS: BenchmarkInfo[] = [
  {
    symbol: '^GSPC',
    name: 'S&P 500',
    description: 'Standard & Poor\'s 500 Index - Large-cap US equities',
  },
  {
    symbol: '^DJI',
    name: 'Dow Jones',
    description: 'Dow Jones Industrial Average - 30 blue-chip US companies',
  },
  {
    symbol: '^IXIC',
    name: 'NASDAQ Composite',
    description: 'NASDAQ Composite Index - Tech-heavy US equities',
  },
];

const BENCHMARK_CACHE_KEY_PREFIX = 'benchmark_';
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

// =============================================================================
// Benchmark Data Fetching
// =============================================================================

/**
 * Fetch benchmark price data from the API.
 */
async function fetchBenchmarkPrice(symbol: string): Promise<{
  price: number;
  timestamp: Date;
} | null> {
  try {
    const response = await fetch(`/api/prices/${encodeURIComponent(symbol)}`);

    if (!response.ok) {
      console.warn(`Failed to fetch benchmark price for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    return {
      price: data.price,
      timestamp: new Date(data.timestamp),
    };
  } catch (error) {
    console.error(`Error fetching benchmark price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch historical benchmark data from the API.
 * Falls back to cached data if API fails.
 */
async function fetchHistoricalBenchmarkData(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<BenchmarkDataPoint[]> {
  // Check cache first
  const cachedData = await getCachedBenchmarkData(symbol, startDate, endDate);
  if (cachedData.length > 0) {
    return cachedData;
  }

  // Fetch from API (Yahoo Finance via proxy)
  try {
    const period1 = Math.floor(startDate.getTime() / 1000);
    const period2 = Math.floor(endDate.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Portfolio-Tracker/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch historical benchmark data for ${symbol}`);
      return [];
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result?.timestamp || !result?.indicators?.quote?.[0]?.close) {
      return [];
    }

    const timestamps = result.timestamp as number[];
    const closes = result.indicators.quote[0].close as (number | null)[];

    const dataPoints: BenchmarkDataPoint[] = [];
    let prevValue: number | null = null;

    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close === null) continue;

      const date = new Date(timestamps[i] * 1000);
      const changePercent = prevValue !== null
        ? ((close - prevValue) / prevValue) * 100
        : 0;

      dataPoints.push({
        date: startOfDay(date),
        value: new Decimal(close),
        changePercent,
      });

      prevValue = close;
    }

    // Cache the data
    await cacheBenchmarkData(symbol, dataPoints);

    return dataPoints;
  } catch (error) {
    console.error(`Error fetching historical benchmark data for ${symbol}:`, error);
    return [];
  }
}

// =============================================================================
// Caching
// =============================================================================

/**
 * Get cached benchmark data from IndexedDB.
 */
async function getCachedBenchmarkData(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<BenchmarkDataPoint[]> {
  try {
    // Use the priceHistory table with special benchmark asset ID
    const benchmarkAssetId = `benchmark-${symbol.replace('^', '')}`;

    const prices = await db.priceHistory
      .where('[assetId+date]')
      .between(
        [benchmarkAssetId, startDate],
        [benchmarkAssetId, endDate],
        true,
        true
      )
      .toArray();

    if (prices.length === 0) return [];

    const dataPoints: BenchmarkDataPoint[] = [];
    let prevClose: Decimal | null = null;

    for (const price of prices) {
      // price.close is stored as string in PriceHistoryStorage
      const closeValue = new Decimal(price.close);
      const changePercent = prevClose !== null
        ? closeValue.minus(prevClose).div(prevClose).mul(100).toNumber()
        : 0;

      dataPoints.push({
        date: price.date,
        value: closeValue,
        changePercent,
      });

      prevClose = closeValue;
    }

    return dataPoints;
  } catch (error) {
    console.error('Error reading cached benchmark data:', error);
    return [];
  }
}

/**
 * Cache benchmark data in IndexedDB.
 */
async function cacheBenchmarkData(
  symbol: string,
  dataPoints: BenchmarkDataPoint[]
): Promise<void> {
  try {
    const benchmarkAssetId = `benchmark-${symbol.replace('^', '')}`;

    // Ensure benchmark asset exists
    const existingAsset = await db.assets.get(benchmarkAssetId);
    if (!existingAsset) {
      const benchmarkInfo = SUPPORTED_BENCHMARKS.find(b => b.symbol === symbol);
      await db.assets.put({
        id: benchmarkAssetId,
        symbol,
        name: benchmarkInfo?.name || symbol,
        type: 'index',
        exchange: 'INDEX',
        currency: 'USD',
        metadata: {},
      });
    }

    // Store price data
    const priceRecords = dataPoints.map((dp) => ({
      id: createPriceHistoryId(`${benchmarkAssetId}-${format(dp.date, 'yyyy-MM-dd')}`),
      assetId: createAssetId(benchmarkAssetId),
      date: dp.date,
      open: dp.value.toString(),
      high: dp.value.toString(),
      low: dp.value.toString(),
      close: dp.value.toString(),
      adjustedClose: dp.value.toString(),
      volume: 0,
      source: 'yahoo',
    }));

    await db.priceHistory.bulkPut(priceRecords);
  } catch (error) {
    console.error('Error caching benchmark data:', error);
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get benchmark price data for a date range.
 */
export async function getBenchmarkData(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<BenchmarkDataPoint[]> {
  return fetchHistoricalBenchmarkData(symbol, startDate, endDate);
}

/**
 * Calculate benchmark return for a period.
 */
export async function calculateBenchmarkReturn(
  symbol: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const data = await getBenchmarkData(symbol, startDate, endDate);

  if (data.length < 2) {
    return 0;
  }

  const startValue = data[0].value;
  const endValue = data[data.length - 1].value;

  if (startValue.isZero()) {
    return 0;
  }

  return endValue.minus(startValue).div(startValue).mul(100).toNumber();
}

/**
 * Compare portfolio performance against a benchmark.
 */
export async function compareWithBenchmark(
  portfolioId: string,
  benchmarkSymbol: string,
  period: TimePeriod
): Promise<BenchmarkComparison | null> {
  const periodConfig = TIME_PERIOD_CONFIGS[period];
  const startDate = periodConfig.getStartDate();
  const endDate = new Date();

  // Get portfolio snapshots
  const snapshots = await getSnapshots(portfolioId, startDate, endDate);

  if (snapshots.length < 2) {
    return null;
  }

  // Calculate portfolio return
  const portfolioStartValue = snapshots[0].totalValue;
  const portfolioEndValue = snapshots[snapshots.length - 1].totalValue;
  const portfolioReturn = portfolioStartValue.isZero()
    ? 0
    : portfolioEndValue.minus(portfolioStartValue).div(portfolioStartValue).mul(100).toNumber();

  // Get benchmark return
  const benchmarkReturn = await calculateBenchmarkReturn(
    benchmarkSymbol,
    startDate,
    endDate
  );

  // Calculate alpha (outperformance)
  const alpha = portfolioReturn - benchmarkReturn;

  // Calculate correlation (simplified - using daily returns)
  const correlation = await calculateCorrelation(
    portfolioId,
    benchmarkSymbol,
    startDate,
    endDate
  );

  return {
    portfolioReturn,
    benchmarkReturn,
    alpha,
    correlation,
    benchmarkSymbol,
    period,
  };
}

/**
 * Get list of supported benchmark indices.
 */
export function getSupportedBenchmarks(): BenchmarkInfo[] {
  return SUPPORTED_BENCHMARKS;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate correlation between portfolio and benchmark returns.
 */
async function calculateCorrelation(
  portfolioId: string,
  benchmarkSymbol: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  try {
    const snapshots = await getSnapshots(portfolioId, startDate, endDate);
    const benchmarkData = await getBenchmarkData(benchmarkSymbol, startDate, endDate);

    if (snapshots.length < 10 || benchmarkData.length < 10) {
      return 0; // Not enough data for meaningful correlation
    }

    // Get daily returns for portfolio
    const portfolioReturns: number[] = [];
    for (let i = 1; i < snapshots.length; i++) {
      portfolioReturns.push(snapshots[i].dayChangePercent / 100);
    }

    // Get daily returns for benchmark
    const benchmarkReturns: number[] = [];
    for (let i = 1; i < benchmarkData.length; i++) {
      benchmarkReturns.push(benchmarkData[i].changePercent / 100);
    }

    // Align arrays (use minimum length)
    const minLength = Math.min(portfolioReturns.length, benchmarkReturns.length);
    const pReturns = portfolioReturns.slice(0, minLength);
    const bReturns = benchmarkReturns.slice(0, minLength);

    // Calculate Pearson correlation coefficient
    const n = minLength;
    const sumP = pReturns.reduce((a, b) => a + b, 0);
    const sumB = bReturns.reduce((a, b) => a + b, 0);
    const sumPB = pReturns.reduce((sum, p, i) => sum + p * bReturns[i], 0);
    const sumP2 = pReturns.reduce((sum, p) => sum + p * p, 0);
    const sumB2 = bReturns.reduce((sum, b) => sum + b * b, 0);

    const numerator = n * sumPB - sumP * sumB;
    const denominator = Math.sqrt(
      (n * sumP2 - sumP * sumP) * (n * sumB2 - sumB * sumB)
    );

    if (denominator === 0) return 0;

    return Math.round((numerator / denominator) * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating correlation:', error);
    return 0;
  }
}

/**
 * Get benchmark data points aligned with portfolio snapshots for chart overlay.
 */
export async function getBenchmarkChartData(
  portfolioId: string,
  benchmarkSymbol: string,
  period: TimePeriod
): Promise<{ date: Date; benchmarkValue: number; normalizedValue: number }[]> {
  const periodConfig = TIME_PERIOD_CONFIGS[period];
  const startDate = periodConfig.getStartDate();
  const endDate = new Date();

  // Get portfolio snapshots for reference
  const snapshots = await getSnapshots(portfolioId, startDate, endDate);

  if (snapshots.length === 0) {
    return [];
  }

  // Get benchmark data
  const benchmarkData = await getBenchmarkData(benchmarkSymbol, startDate, endDate);

  if (benchmarkData.length === 0) {
    return [];
  }

  // Normalize benchmark to portfolio starting value for visual comparison
  const portfolioStartValue = snapshots[0].totalValue.toNumber();
  const benchmarkStartValue = benchmarkData[0].value.toNumber();
  const normalizationFactor = benchmarkStartValue > 0
    ? portfolioStartValue / benchmarkStartValue
    : 1;

  // Create benchmark data points aligned with portfolio dates
  const benchmarkMap = new Map(
    benchmarkData.map(bp => [
      format(bp.date, 'yyyy-MM-dd'),
      bp.value.toNumber(),
    ])
  );

  return snapshots
    .map(snap => {
      const dateKey = format(snap.date, 'yyyy-MM-dd');
      const benchmarkValue = benchmarkMap.get(dateKey);

      if (benchmarkValue === undefined) {
        return null;
      }

      return {
        date: snap.date,
        benchmarkValue,
        normalizedValue: benchmarkValue * normalizationFactor,
      };
    })
    .filter((dp): dp is NonNullable<typeof dp> => dp !== null);
}
