/**
 * Contracts for 3-Year View and YoY Growth Features
 */

import { Decimal } from 'decimal.js';

// =============================================================================
// Component Props
// =============================================================================

/**
 * Props for the new YoY Growth Table component
 */
export interface YoYGrowthTableProps {
  /** List of annual growth metrics sorted descending by year */
  metrics: YearOverYearMetric[];
  /** Loading state */
  isLoading: boolean;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Hook Updates (usePerformanceData)
// =============================================================================

/**
 * Updated return type for usePerformanceData hook
 */
export interface UsePerformanceDataReturn {
  // ... existing fields ...
  
  /** 
   * Array of Year-over-Year growth metrics
   * Calculated from historical snapshots
   */
  yoyMetrics: YearOverYearMetric[];

  /**
   * Selected time period including new '3Y' option
   */
  selectedPeriod: '1M' | '3M' | 'YTD' | '1Y' | '3Y' | 'ALL';
}

// =============================================================================
// Data Types
// =============================================================================

export interface YearOverYearMetric {
  /** Calendar year (e.g., 2024) */
  year: number;
  
  /** True if this is the current year (displayed as YTD) */
  isCurrentYear: boolean;
  
  /** Portfolio value at start of period */
  startValue: Decimal;
  
  /** Portfolio value at end of period */
  endValue: Decimal;
  
  /** TWR Percentage (e.g., 12.5 for 12.5%) */
  twrGrowth: number;
  
  /** True if data doesn't cover full year (e.g. inception mid-year) */
  isPartial: boolean;
}
