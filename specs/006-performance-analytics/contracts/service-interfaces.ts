/**
 * Service Interface Contracts: Portfolio Performance Analytics
 *
 * These interfaces define the contracts between services.
 * Implementation files must conform to these signatures.
 *
 * @module contracts/service-interfaces
 */

import { Decimal } from 'decimal.js';
import { TimePeriod } from '@/types/dashboard';

// =============================================================================
// Core Types
// =============================================================================

export interface PerformanceSnapshot {
  id: string;
  portfolioId: string;
  date: Date;
  totalValue: Decimal;
  totalCost: Decimal;
  dayChange: Decimal;
  dayChangePercent: number;
  cumulativeReturn: Decimal;
  twrReturn: Decimal;
  holdingCount: number;
  hasInterpolatedPrices: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PerformanceSummary {
  portfolioId: string;
  period: TimePeriod;
  startDate: Date;
  endDate: Date;
  startValue: Decimal;
  endValue: Decimal;
  totalReturn: Decimal;
  totalReturnPercent: number;
  twrReturn: number;
  periodHigh: Decimal;
  periodHighDate: Date;
  periodLow: Decimal;
  periodLowDate: Date;
  bestDay: DayPerformance;
  worstDay: DayPerformance;
  volatility: number;
  sharpeRatio?: number;
}

export interface DayPerformance {
  date: Date;
  change: Decimal;
  changePercent: number;
}

export interface TWRResult {
  totalReturn: Decimal;
  annualizedReturn: number;
  startDate: Date;
  endDate: Date;
}

export interface BenchmarkComparison {
  portfolioReturn: number;
  benchmarkReturn: number;
  alpha: number; // Outperformance vs benchmark
  correlation: number;
  benchmarkSymbol: string;
  period: TimePeriod;
}

export interface ChartDataPoint {
  date: Date;
  value: number; // Converted from Decimal for Recharts
  change: number;
  changePercent: number;
  benchmarkValue?: number;
  hasInterpolatedPrices: boolean;
}

// =============================================================================
// Snapshot Service Interface
// =============================================================================

export interface ISnapshotService {
  /**
   * Get snapshots for a portfolio within a date range.
   */
  getSnapshots(
    portfolioId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PerformanceSnapshot[]>;

  /**
   * Get the latest snapshot for a portfolio.
   */
  getLatestSnapshot(portfolioId: string): Promise<PerformanceSnapshot | null>;

  /**
   * Compute and persist snapshots for affected date range.
   * Called when transactions are added/modified/deleted.
   */
  computeSnapshots(
    portfolioId: string,
    fromDate: Date,
    toDate?: Date // Defaults to today
  ): Promise<void>;

  /**
   * Invalidate and recompute all snapshots for a portfolio.
   * Used for manual refresh or data correction.
   */
  recomputeAll(portfolioId: string): Promise<void>;

  /**
   * Delete all snapshots for a portfolio.
   * Called when portfolio is deleted.
   */
  deleteSnapshots(portfolioId: string): Promise<void>;
}

// =============================================================================
// TWR Calculator Interface
// =============================================================================

export interface ITWRCalculator {
  /**
   * Calculate Time-Weighted Return for a date range.
   * Uses Modified Dietz method between cash flow events.
   */
  calculateTWR(
    portfolioId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TWRResult>;

  /**
   * Calculate simple period return (not time-weighted).
   * Used for single sub-periods between cash flows.
   */
  calculatePeriodReturn(
    startValue: Decimal,
    endValue: Decimal,
    cashFlows: CashFlowEvent[]
  ): Decimal;
}

export interface CashFlowEvent {
  date: Date;
  amount: Decimal; // Positive = inflow, Negative = outflow
}

// =============================================================================
// Benchmark Service Interface
// =============================================================================

export interface IBenchmarkService {
  /**
   * Get benchmark price data for a date range.
   */
  getBenchmarkData(
    symbol: string, // e.g., "^GSPC"
    startDate: Date,
    endDate: Date
  ): Promise<BenchmarkDataPoint[]>;

  /**
   * Calculate benchmark return for comparison.
   */
  calculateBenchmarkReturn(
    symbol: string,
    startDate: Date,
    endDate: Date
  ): Promise<number>;

  /**
   * Compare portfolio performance against benchmark.
   */
  compareWithBenchmark(
    portfolioId: string,
    benchmarkSymbol: string,
    period: TimePeriod
  ): Promise<BenchmarkComparison>;

  /**
   * Get supported benchmark indices.
   */
  getSupportedBenchmarks(): BenchmarkInfo[];
}

export interface BenchmarkDataPoint {
  date: Date;
  value: Decimal;
  changePercent: number;
}

export interface BenchmarkInfo {
  symbol: string;
  name: string;
  description: string;
}

// =============================================================================
// Performance Analytics Service Interface
// =============================================================================

export interface IPerformanceAnalyticsService {
  /**
   * Get performance summary for a time period.
   */
  getSummary(
    portfolioId: string,
    period: TimePeriod
  ): Promise<PerformanceSummary>;

  /**
   * Get chart data points for visualization.
   * Aggregates data based on period for optimal rendering.
   */
  getChartData(
    portfolioId: string,
    period: TimePeriod,
    includeBenchmark?: boolean,
    benchmarkSymbol?: string
  ): Promise<ChartDataPoint[]>;

  /**
   * Export performance data to CSV.
   */
  exportToCSV(
    portfolioId: string,
    period: TimePeriod,
    options?: ExportOptions
  ): Promise<string>; // CSV content

  /**
   * Get individual holding performance for the period.
   */
  getHoldingPerformance(
    portfolioId: string,
    period: TimePeriod
  ): Promise<HoldingPerformanceData[]>;
}

export interface ExportOptions {
  includeBenchmark?: boolean;
  benchmarkSymbol?: string;
  includeHoldings?: boolean;
  dateFormat?: string;
}

export interface HoldingPerformanceData {
  holdingId: string;
  symbol: string;
  name: string;
  assetType: string;
  quantity: Decimal;
  costBasis: Decimal;
  currentValue: Decimal;
  periodStartValue: Decimal;
  absoluteGain: Decimal;
  percentGain: number;
  weight: number; // Portfolio weight as percentage
  isInterpolated: boolean;
}

// =============================================================================
// Zustand Store Interface
// =============================================================================

export interface PerformanceState {
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
  setSorting: (by: string, direction: 'asc' | 'desc') => void;
  loadPerformanceData: (portfolioId: string) => Promise<void>;
  exportData: (portfolioId: string) => Promise<void>;
  refresh: (portfolioId: string) => Promise<void>;
}
