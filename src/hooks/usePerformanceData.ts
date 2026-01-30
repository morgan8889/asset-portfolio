/**
 * usePerformanceData Hook
 *
 * Combines live price metrics with historical performance calculations
 * for the Performance page. Provides CAGR, Max Drawdown, Sharpe Ratio,
 * and historical data for charting.
 *
 * @module hooks/usePerformanceData
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Decimal } from 'decimal.js';
import { differenceInDays } from 'date-fns';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { useLivePriceMetrics } from './useLivePriceMetrics';
import {
  getHistoricalValues,
  calculateAnnualizedReturn,
  calculateMaxDrawdown,
  calculateSharpeRatio,
  calculateDailyReturns,
  getYoYMetrics,
} from '@/lib/services';
import {
  PerformancePageData,
  PerformancePageMetrics,
  HistoricalPortfolioValue,
  ChartTimePeriod,
} from '@/types/dashboard';
import type { YearOverYearMetric } from '@/types/performance';

/**
 * Map ChartTimePeriod to the TimePeriod used by getHistoricalValues.
 */
function mapToTimePeriod(
  period: ChartTimePeriod
): 'MONTH' | 'QUARTER' | 'YEAR' | 'THREE_YEAR' | 'ALL' {
  switch (period) {
    case '1M':
      return 'MONTH';
    case '3M':
      return 'QUARTER';
    case 'YTD':
    case '1Y':
      return 'YEAR';
    case '3Y':
      return 'THREE_YEAR';
    case 'ALL':
      return 'ALL';
  }
}

/**
 * Hook that provides complete data for the Performance page.
 *
 * Combines:
 * - Live metrics from useLivePriceMetrics (totalValue, totalGain, topPerformers)
 * - Historical calculations (CAGR, Max Drawdown, Sharpe Ratio)
 * - Time-series data for chart display
 *
 * @returns PerformancePageData with all metrics and state
 */
export function usePerformanceData(): PerformancePageData {
  const { holdings, assets, currentPortfolio, metrics } = usePortfolioStore();
  const liveMetrics = useLivePriceMetrics(holdings, assets);

  const [selectedPeriod, setSelectedPeriod] = useState<ChartTimePeriod>('ALL');
  const [historicalData, setHistoricalData] = useState<
    HistoricalPortfolioValue[]
  >([]);
  const [advancedMetrics, setAdvancedMetrics] =
    useState<PerformancePageMetrics>({
      roi: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
    });
  const [yoyMetrics, setYoyMetrics] = useState<YearOverYearMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Calculate advanced metrics from historical data.
   */
  const calculateMetrics = useCallback(
    async (portfolioId: string, signal?: AbortSignal) => {
      try {
        setLoading(true);
        setError(null);

        // Get historical values for the selected period
        const timePeriod = mapToTimePeriod(selectedPeriod);
        const history = await getHistoricalValues(portfolioId, timePeriod);

        // Check if operation was aborted
        if (signal?.aborted) {
          return;
        }

        if (history.length === 0) {
          setHistoricalData([]);
          setAdvancedMetrics({
            roi: 0,
            annualizedReturn: 0,
            volatility: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
          });
          setYoyMetrics([]);
          setLoading(false);
          return;
        }

        // Transform to HistoricalPortfolioValue format
        const chartData: HistoricalPortfolioValue[] = history.map((point) => ({
          date: point.date,
          value: point.totalValue,
        }));
        setHistoricalData(chartData);

        // Calculate ROI (total return)
        const startValue = history[0].totalValue;
        const endValue = history[history.length - 1].totalValue;
        const roi = startValue.isZero()
          ? 0
          : endValue.minus(startValue).div(startValue).mul(100).toNumber();

        // Calculate CAGR
        const daysHeld = differenceInDays(
          history[history.length - 1].date,
          history[0].date
        );
        const annualizedReturn = calculateAnnualizedReturn(
          startValue,
          endValue,
          daysHeld
        );

        // Calculate Max Drawdown
        const maxDrawdown = calculateMaxDrawdown(chartData);

        // Calculate Sharpe Ratio from daily returns
        const dailyReturns = calculateDailyReturns(chartData);
        const sharpeRatio = calculateSharpeRatio(dailyReturns);

        // Calculate volatility (annualized standard deviation)
        let volatility = 0;
        if (dailyReturns.length >= 2) {
          const avgReturn =
            dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
          const variance =
            dailyReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) /
            dailyReturns.length;
          volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
        }

        setAdvancedMetrics({
          roi,
          annualizedReturn,
          volatility,
          sharpeRatio,
          maxDrawdown,
        });

        // Calculate Year-over-Year metrics (independent of selected period)
        const yoyData = await getYoYMetrics(portfolioId);
        setYoyMetrics(yoyData);
      } catch (err) {
        console.error('Error calculating performance metrics:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to calculate metrics'
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedPeriod]
  );

  // Extract totalValue as string for dependency tracking to avoid complex expressions
  const totalValueStr = liveMetrics.totalValue.toString();

  // Recalculate when portfolio, period, or live prices change
  useEffect(() => {
    const abortController = new AbortController();

    if (currentPortfolio?.id) {
      calculateMetrics(currentPortfolio.id, abortController.signal);
    } else {
      setLoading(false);
      setHistoricalData([]);
      setAdvancedMetrics({
        roi: 0,
        annualizedReturn: 0,
        volatility: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
      });
      setYoyMetrics([]);
    }

    return () => {
      abortController.abort();
    };
  }, [currentPortfolio?.id, selectedPeriod, totalValueStr, calculateMetrics]);

  // Combine live metrics with calculated metrics
  const result = useMemo(
    (): PerformancePageData => ({
      // Live metrics from useLivePriceMetrics
      totalValue: liveMetrics.hasLivePrices
        ? liveMetrics.totalValue
        : new Decimal(metrics?.totalValue || 0),
      totalGain: liveMetrics.hasLivePrices
        ? liveMetrics.totalGain
        : new Decimal(metrics?.totalGain || 0),
      totalGainPercent: liveMetrics.hasLivePrices
        ? liveMetrics.totalGainPercent
        : metrics?.totalGainPercent || 0,
      dayChange: liveMetrics.dayChange,
      dayChangePercent: liveMetrics.dayChangePercent,
      topPerformers: liveMetrics.topPerformers,
      biggestLosers: liveMetrics.biggestLosers,

      // Calculated metrics from historical data
      metrics: advancedMetrics,
      yoyMetrics,

      // Chart data
      historicalData,
      selectedPeriod,

      // State
      loading,
      error,

      // Actions
      setSelectedPeriod,
    }),
    [
      liveMetrics,
      metrics,
      advancedMetrics,
      yoyMetrics,
      historicalData,
      selectedPeriod,
      loading,
      error,
    ]
  );

  return result;
}
