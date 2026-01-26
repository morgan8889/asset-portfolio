/**
 * Performance Analytics Types
 *
 * Type definitions for portfolio performance analytics feature.
 * Includes pre-computed snapshots, TWR calculations, and chart data.
 *
 * @module types/performance
 */

import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { TimePeriod, TimePeriodSchema } from './dashboard';

// =============================================================================
// Performance Snapshot Types
// =============================================================================

/**
 * Pre-computed daily portfolio value snapshot for fast chart rendering.
 * Domain type with Decimal values for calculations.
 */
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

/**
 * Storage type for IndexedDB (Decimal fields serialized as strings).
 */
export interface PerformanceSnapshotStorage {
  id: string;
  portfolioId: string;
  date: Date;
  totalValue: string;
  totalCost: string;
  dayChange: string;
  dayChangePercent: number;
  cumulativeReturn: string;
  twrReturn: string;
  holdingCount: number;
  hasInterpolatedPrices: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// Performance Summary Types
// =============================================================================

/**
 * Performance data for a single day (used in summary statistics).
 */
export interface DayPerformance {
  date: Date;
  change: Decimal;
  changePercent: number;
}

/**
 * Aggregated performance statistics for a time period.
 * Calculated from snapshots, not stored.
 */
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

// =============================================================================
// TWR Calculation Types
// =============================================================================

/**
 * Cash flow event for TWR calculation.
 */
export interface CashFlowEvent {
  date: Date;
  amount: Decimal; // Positive = inflow (buy), Negative = outflow (sell)
}

/**
 * Sub-period for TWR calculation (between cash flows).
 */
export interface TWRSubPeriod {
  startDate: Date;
  endDate: Date;
  startValue: Decimal;
  endValue: Decimal;
  cashFlows: CashFlowEvent[];
  periodReturn: Decimal;
}

/**
 * Result of TWR calculation.
 */
export interface TWRResult {
  totalReturn: Decimal;
  annualizedReturn: number;
  startDate: Date;
  endDate: Date;
  subPeriods?: TWRSubPeriod[];
}

// =============================================================================
// Chart Data Types
// =============================================================================

/**
 * Single data point for performance chart.
 * Uses number instead of Decimal for Recharts compatibility.
 */
export interface ChartDataPoint {
  date: Date;
  value: number;
  change: number;
  changePercent: number;
  benchmarkValue?: number;
  benchmarkChangePercent?: number;
  hasInterpolatedPrices: boolean;
}

// =============================================================================
// Benchmark Types
// =============================================================================

/**
 * Benchmark price data point.
 */
export interface BenchmarkDataPoint {
  date: Date;
  value: Decimal;
  changePercent: number;
}

/**
 * Information about a supported benchmark index.
 */
export interface BenchmarkInfo {
  symbol: string;
  name: string;
  description: string;
}

/**
 * Comparison between portfolio and benchmark performance.
 */
export interface BenchmarkComparison {
  portfolioReturn: number;
  benchmarkReturn: number;
  alpha: number; // Outperformance vs benchmark
  correlation: number;
  benchmarkSymbol: string;
  period: TimePeriod;
}

// =============================================================================
// Holding Performance Types
// =============================================================================

/**
 * Performance data for an individual holding.
 */
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
// Export Options
// =============================================================================

/**
 * Options for exporting performance data to CSV.
 */
export interface ExportOptions {
  includeBenchmark?: boolean;
  benchmarkSymbol?: string;
  includeHoldings?: boolean;
  dateFormat?: string;
}

// =============================================================================
// Snapshot Trigger Events
// =============================================================================

/**
 * Events that trigger snapshot computation.
 */
export type SnapshotTriggerEvent =
  | { type: 'TRANSACTION_ADDED'; transactionId: string; portfolioId: string; date: Date }
  | { type: 'TRANSACTION_MODIFIED'; transactionId: string; portfolioId: string; oldDate: Date; newDate: Date }
  | { type: 'TRANSACTION_DELETED'; transactionId: string; portfolioId: string; date: Date }
  | { type: 'PRICE_UPDATED'; assetId: string; date: Date }
  | { type: 'MANUAL_REFRESH'; portfolioId: string };

// =============================================================================
// Zod Validation Schemas
// =============================================================================

export const PerformanceSnapshotSchema = z.object({
  id: z.string().uuid(),
  portfolioId: z.string().uuid(),
  date: z.coerce.date(),
  totalValue: z.string().refine((s) => !isNaN(parseFloat(s)), 'Invalid decimal'),
  totalCost: z.string().refine((s) => !isNaN(parseFloat(s)), 'Invalid decimal'),
  dayChange: z.string().refine((s) => !isNaN(parseFloat(s)), 'Invalid decimal'),
  dayChangePercent: z.number().min(-100).max(1000),
  cumulativeReturn: z.string().refine((s) => !isNaN(parseFloat(s)), 'Invalid decimal'),
  twrReturn: z.string().refine((s) => !isNaN(parseFloat(s)), 'Invalid decimal'),
  holdingCount: z.number().int().min(0),
  hasInterpolatedPrices: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const PerformanceSummaryRequestSchema = z.object({
  portfolioId: z.string().uuid(),
  period: TimePeriodSchema,
  includeBenchmark: z.boolean().optional().default(false),
  benchmarkSymbol: z.string().optional().default('^GSPC'),
});

export const ExportOptionsSchema = z.object({
  includeBenchmark: z.boolean().optional().default(false),
  benchmarkSymbol: z.string().optional().default('^GSPC'),
  includeHoldings: z.boolean().optional().default(false),
  dateFormat: z.string().optional().default('yyyy-MM-dd'),
});

// =============================================================================
// Supported Benchmarks
// =============================================================================

export const SUPPORTED_BENCHMARKS: BenchmarkInfo[] = [
  { symbol: '^GSPC', name: 'S&P 500', description: 'US Large Cap' },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', description: 'US 30 Blue Chips' },
  { symbol: '^IXIC', name: 'NASDAQ Composite', description: 'US Tech-Heavy' },
  { symbol: '^RUT', name: 'Russell 2000', description: 'US Small Cap' },
  { symbol: '^VIX', name: 'CBOE Volatility Index', description: 'Market Volatility' },
];

// =============================================================================
// Decimal Fields for Serialization
// =============================================================================

export const PERFORMANCE_SNAPSHOT_DECIMAL_FIELDS = [
  'totalValue',
  'totalCost',
  'dayChange',
  'cumulativeReturn',
  'twrReturn',
] as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate unique ID for a performance snapshot.
 * Format: perf-snap-{portfolioId}-{date}
 */
export function createPerformanceSnapshotId(portfolioId: string, date: Date): string {
  const dateStr = date.toISOString().split('T')[0];
  return `perf-snap-${portfolioId}-${dateStr}`;
}
