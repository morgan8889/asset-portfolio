/**
 * Performance Analytics Store
 *
 * Zustand store for managing performance analytics state including
 * summary statistics, chart data, and holding performance.
 *
 * @module stores/performance
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Decimal } from 'decimal.js';

import { TimePeriod, TIME_PERIOD_CONFIGS } from '@/types/dashboard';
import {
  PerformanceSummary,
  ChartDataPoint,
  HoldingPerformanceData,
  BenchmarkComparison,
  DayPerformance,
} from '@/types/performance';
import {
  getSnapshots,
  getAggregatedSnapshots,
  needsComputation,
  recomputeAll,
} from '@/lib/services/snapshot-service';
import {
  compareWithBenchmark,
  getBenchmarkChartData,
} from '@/lib/services/benchmark-service';
import { usePortfolioStore } from './portfolio';

// =============================================================================
// Constants
// =============================================================================

/**
 * Number of trading days per year used for volatility annualization.
 * Standard market convention is 252 trading days (365 days - weekends - holidays).
 */
const TRADING_DAYS_PER_YEAR = 252;

// =============================================================================
// Types
// =============================================================================

interface PerformanceState {
  // Data
  summary: PerformanceSummary | null;
  chartData: ChartDataPoint[];
  holdingPerformance: HoldingPerformanceData[];
  benchmarkComparison: BenchmarkComparison | null;

  // UI State
  selectedPeriod: TimePeriod;
  showBenchmark: boolean;
  selectedBenchmark: string;
  sortBy: 'gain' | 'percent' | 'value' | 'name';
  sortDirection: 'asc' | 'desc';

  // Loading States
  isLoading: boolean;
  isExporting: boolean;
  error: string | null;

  // Actions
  setPeriod: (period: TimePeriod) => void;
  toggleBenchmark: () => void;
  setBenchmark: (symbol: string) => void;
  setSorting: (by: 'gain' | 'percent' | 'value' | 'name', direction: 'asc' | 'desc') => void;
  loadPerformanceData: (portfolioId: string) => Promise<void>;
  loadBenchmarkData: (portfolioId: string) => Promise<void>;
  exportData: (portfolioId: string) => Promise<string>;
  refresh: (portfolioId: string) => Promise<void>;
  clearError: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateVolatility(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce(
    (sum, r) => sum + Math.pow(r - mean, 2),
    0
  ) / (dailyReturns.length - 1);
  const stdDev = Math.sqrt(variance);

  // Annualize: multiply by sqrt(TRADING_DAYS_PER_YEAR)
  // Standard deviation scales with the square root of time
  return stdDev * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
}

// =============================================================================
// Store
// =============================================================================

export const usePerformanceStore = create<PerformanceState>()(
  devtools(
    (set, get) => ({
      // Initial state
      summary: null,
      chartData: [],
      holdingPerformance: [],
      benchmarkComparison: null,
      selectedPeriod: 'MONTH',
      showBenchmark: false,
      selectedBenchmark: '^GSPC',
      sortBy: 'percent',
      sortDirection: 'desc',
      isLoading: false,
      isExporting: false,
      error: null,

      // Actions
      setPeriod: (period) => {
        set({ selectedPeriod: period });
        // Get current portfolio and reload data
        const portfolioState = usePortfolioStore.getState();
        if (portfolioState.currentPortfolio) {
          get().loadPerformanceData(portfolioState.currentPortfolio.id);
        }
      },

      toggleBenchmark: () => {
        const newShowBenchmark = !get().showBenchmark;
        set({ showBenchmark: newShowBenchmark });

        // Reload data with benchmark if enabled
        const portfolioState = usePortfolioStore.getState();
        if (portfolioState.currentPortfolio && newShowBenchmark) {
          get().loadBenchmarkData(portfolioState.currentPortfolio.id);
        } else if (!newShowBenchmark) {
          // Clear benchmark data from chart
          const chartData = get().chartData.map((point) => ({
            ...point,
            benchmarkValue: undefined,
            benchmarkChangePercent: undefined,
          }));
          set({ chartData, benchmarkComparison: null });
        }
      },

      setBenchmark: (symbol) => {
        set({ selectedBenchmark: symbol });

        // Reload benchmark data with new symbol
        const portfolioState = usePortfolioStore.getState();
        if (portfolioState.currentPortfolio && get().showBenchmark) {
          get().loadBenchmarkData(portfolioState.currentPortfolio.id);
        }
      },

      setSorting: (by, direction) => {
        set({ sortBy: by, sortDirection: direction });
      },

      loadPerformanceData: async (portfolioId) => {
        set({ isLoading: true, error: null });

        try {
          const { selectedPeriod } = get();
          const periodConfig = TIME_PERIOD_CONFIGS[selectedPeriod];
          const startDate = periodConfig.getStartDate();
          const endDate = new Date();

          // Check if snapshots need computation
          const needsRecompute = await needsComputation(portfolioId);
          if (needsRecompute) {
            await recomputeAll(portfolioId);
          }

          // Get aggregated snapshots for chart
          const snapshots = await getAggregatedSnapshots(portfolioId, startDate, endDate);

          if (snapshots.length === 0) {
            set({
              summary: null,
              chartData: [],
              holdingPerformance: [],
              isLoading: false,
            });
            return;
          }

          // Convert snapshots to chart data
          const chartData: ChartDataPoint[] = snapshots.map((snap) => ({
            date: snap.date,
            value: snap.totalValue.toNumber(),
            change: snap.dayChange.toNumber(),
            changePercent: snap.dayChangePercent,
            hasInterpolatedPrices: snap.hasInterpolatedPrices,
          }));

          // Calculate summary statistics
          const firstSnapshot = snapshots[0];
          const lastSnapshot = snapshots[snapshots.length - 1];

          // Find period high and low
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

          const summary: PerformanceSummary = {
            portfolioId,
            period: selectedPeriod,
            startDate,
            endDate,
            startValue: firstSnapshot.totalValue,
            endValue: lastSnapshot.totalValue,
            totalReturn,
            totalReturnPercent,
            twrReturn: lastSnapshot.twrReturn.toNumber() * 100,
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
            volatility: calculateVolatility(dailyReturns),
          };

          set({
            summary,
            chartData,
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to load performance data:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load performance data',
            isLoading: false,
          });
        }
      },

      exportData: async (portfolioId) => {
        set({ isExporting: true, error: null });

        try {
          const { chartData, summary, selectedPeriod } = get();

          if (chartData.length === 0) {
            throw new Error('No data to export');
          }

          // Generate CSV content
          const headers = ['Date', 'Portfolio Value', 'Daily Change', 'Daily Change %', 'Cumulative Return %'];
          const rows = chartData.map((point) => {
            const dateStr = point.date.toISOString().split('T')[0];
            return [
              dateStr,
              point.value.toFixed(2),
              point.change.toFixed(2),
              point.changePercent.toFixed(2),
              summary ? ((point.value / summary.startValue.toNumber() - 1) * 100).toFixed(2) : '0.00',
            ].join(',');
          });

          const csv = [headers.join(','), ...rows].join('\n');

          set({ isExporting: false });
          return csv;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to export data',
            isExporting: false,
          });
          throw error;
        }
      },

      refresh: async (portfolioId) => {
        set({ isLoading: true, error: null });
        try {
          await recomputeAll(portfolioId);
          await get().loadPerformanceData(portfolioId);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to refresh data',
            isLoading: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },

      loadBenchmarkData: async (portfolioId: string) => {
        const { selectedPeriod, selectedBenchmark, chartData } = get();

        try {
          // Get benchmark comparison statistics
          const comparison = await compareWithBenchmark(
            portfolioId,
            selectedBenchmark,
            selectedPeriod
          );

          // Get benchmark chart data
          const benchmarkChartData = await getBenchmarkChartData(
            portfolioId,
            selectedBenchmark,
            selectedPeriod
          );

          // Merge benchmark data into chart data
          const benchmarkMap = new Map(
            benchmarkChartData.map((bp) => [
              bp.date.toISOString().split('T')[0],
              bp.normalizedValue,
            ])
          );

          const updatedChartData = chartData.map((point) => {
            const dateKey = point.date.toISOString().split('T')[0];
            const benchmarkValue = benchmarkMap.get(dateKey);

            return {
              ...point,
              benchmarkValue,
            };
          });

          set({
            chartData: updatedChartData,
            benchmarkComparison: comparison,
          });
        } catch (error) {
          console.error('Failed to load benchmark data:', error);
          // Don't set error state for benchmark - it's optional
        }
      },
    }),
    {
      name: 'performance-store',
    }
  )
);
