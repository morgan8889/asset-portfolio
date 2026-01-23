/**
 * Dashboard Configuration Contracts
 *
 * Type definitions for the configurable portfolio dashboard feature.
 * These types define the shape of data stored in IndexedDB and used throughout
 * the dashboard components.
 *
 * @module contracts/dashboard-config
 */

import { z } from 'zod';
import { Decimal } from 'decimal.js';

// =============================================================================
// Widget Types
// =============================================================================

/**
 * Unique identifiers for each dashboard widget.
 * Used for ordering, visibility toggling, and component rendering.
 */
export type WidgetId =
  | 'total-value'
  | 'gain-loss'
  | 'day-change'
  | 'category-breakdown'
  | 'growth-chart'
  | 'top-performers'
  | 'biggest-losers'
  | 'recent-activity';

/**
 * Static definition of a widget type.
 * Used for rendering widget settings and layout calculations.
 */
export interface WidgetDefinition {
  /** Unique identifier */
  readonly id: WidgetId;

  /** Human-readable display name shown in settings modal */
  readonly displayName: string;

  /** Short description for accessibility and tooltips */
  readonly description: string;

  /** Grid column span: 1 = quarter width, 2 = half width */
  readonly colSpan: 1 | 2;

  /** Minimum height in pixels for proper rendering */
  readonly minHeight: number;

  /** Whether the user can hide this widget (false for essential widgets) */
  readonly canHide: boolean;
}

// =============================================================================
// Time Period Types
// =============================================================================

/**
 * Time periods for gain/loss calculation windows.
 */
export type TimePeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';

/**
 * Configuration for a time period including helper methods.
 */
export interface TimePeriodConfig {
  /** Unique identifier */
  readonly id: TimePeriod;

  /** Full label (e.g., "This Month") */
  readonly label: string;

  /** Abbreviated label for buttons (e.g., "1M") */
  readonly shortLabel: string;

  /** Calculate start date for this period */
  getStartDate: () => Date;
}

// =============================================================================
// Dashboard Configuration
// =============================================================================

/**
 * User's personalized dashboard configuration.
 * Stored in IndexedDB userSettings table with key 'dashboard-config'.
 */
export interface DashboardConfiguration {
  /** Schema version for migrations (current: 1) */
  readonly version: 1;

  /** Ordered array of widget IDs determining display order */
  widgetOrder: WidgetId[];

  /** Visibility state for each widget */
  widgetVisibility: Record<WidgetId, boolean>;

  /** Default time period for gain/loss calculations */
  timePeriod: TimePeriod;

  /** Number of holdings to show in top/bottom performers (1-10) */
  performerCount: number;

  /** ISO 8601 timestamp of last configuration update */
  lastUpdated: string;
}

// =============================================================================
// Performance Metrics
// =============================================================================

/**
 * Performance data for a single holding over a time period.
 * Used for top performers and biggest losers widgets.
 */
export interface HoldingPerformance {
  /** Holding ID from the database */
  holdingId: string;

  /** Asset symbol for display (e.g., "AAPL") */
  symbol: string;

  /** Asset name (e.g., "Apple Inc.") */
  name: string;

  /** Asset type for categorization */
  assetType: string;

  /** Current market value (precision via decimal.js) */
  currentValue: Decimal;

  /** Value at start of selected period */
  periodStartValue: Decimal;

  /** Absolute gain/loss in currency */
  absoluteGain: Decimal;

  /** Percentage gain/loss as a number */
  percentGain: number;

  /** Time period this metric covers */
  period: TimePeriod;

  /** True if start value was estimated due to missing price data */
  isInterpolated: boolean;
}

/**
 * Single data point for portfolio value history chart.
 */
export interface HistoricalValuePoint {
  /** Date of this snapshot */
  date: Date;

  /** Total portfolio value */
  totalValue: Decimal;

  /** Change from previous data point */
  change: Decimal;

  /** True if any holding prices were interpolated */
  hasInterpolatedPrices: boolean;
}

/**
 * Portfolio allocation by asset category.
 */
export interface CategoryAllocation {
  /** Asset type category identifier */
  category: string;

  /** Human-readable label */
  label: string;

  /** Total value in this category */
  value: Decimal;

  /** Percentage of total portfolio (0-100) */
  percentage: number;

  /** Number of distinct holdings */
  holdingCount: number;

  /** Hex color for chart visualization */
  color: string;
}

// =============================================================================
// Zod Validation Schemas
// =============================================================================

export const WidgetIdSchema = z.enum([
  'total-value',
  'gain-loss',
  'day-change',
  'category-breakdown',
  'growth-chart',
  'top-performers',
  'biggest-losers',
  'recent-activity',
]);

export const TimePeriodSchema = z.enum([
  'TODAY',
  'WEEK',
  'MONTH',
  'QUARTER',
  'YEAR',
  'ALL',
]);

export const DashboardConfigurationSchema = z.object({
  version: z.literal(1),
  widgetOrder: z
    .array(WidgetIdSchema)
    .min(1, 'At least one widget must be in the order')
    .refine(
      (arr) => new Set(arr).size === arr.length,
      { message: 'Widget order must not contain duplicates' }
    ),
  widgetVisibility: z.record(WidgetIdSchema, z.boolean()),
  timePeriod: TimePeriodSchema,
  performerCount: z
    .number()
    .int('Performer count must be an integer')
    .min(1, 'Must show at least 1 performer')
    .max(10, 'Cannot show more than 10 performers'),
  lastUpdated: z.string().datetime('Must be a valid ISO 8601 datetime'),
});

// =============================================================================
// Service Interfaces
// =============================================================================

/**
 * Dashboard configuration service contract.
 * Handles CRUD operations for dashboard settings.
 */
export interface IDashboardConfigService {
  /**
   * Load the current dashboard configuration.
   * Returns default configuration if none exists.
   */
  getConfig(): Promise<DashboardConfiguration>;

  /**
   * Save updated dashboard configuration.
   * Validates input and updates lastUpdated timestamp.
   */
  saveConfig(config: DashboardConfiguration): Promise<void>;

  /**
   * Reset configuration to default values.
   * User's custom settings are deleted.
   */
  resetToDefault(): Promise<DashboardConfiguration>;

  /**
   * Update widget visibility.
   * Convenience method for toggling a single widget.
   */
  setWidgetVisibility(widgetId: WidgetId, visible: boolean): Promise<void>;

  /**
   * Update widget order.
   * Called after drag-and-drop reordering.
   */
  setWidgetOrder(order: WidgetId[]): Promise<void>;

  /**
   * Update the selected time period.
   * Triggers recalculation of performance metrics.
   */
  setTimePeriod(period: TimePeriod): Promise<void>;
}

/**
 * Performance calculation service contract.
 * Computes period-based performance metrics.
 */
export interface IPerformanceService {
  /**
   * Calculate performance for all holdings over a time period.
   */
  calculateAllPerformance(
    portfolioId: string,
    period: TimePeriod
  ): Promise<HoldingPerformance[]>;

  /**
   * Get top N performing holdings.
   * Sorted by percentage gain descending.
   */
  getTopPerformers(
    portfolioId: string,
    period: TimePeriod,
    count: number
  ): Promise<HoldingPerformance[]>;

  /**
   * Get bottom N performing holdings.
   * Sorted by percentage gain ascending (worst first).
   */
  getBiggestLosers(
    portfolioId: string,
    period: TimePeriod,
    count: number
  ): Promise<HoldingPerformance[]>;
}

/**
 * Historical value service contract.
 * Reconstructs portfolio value over time from transactions.
 */
export interface IHistoricalValueService {
  /**
   * Get portfolio value history for chart display.
   *
   * @param portfolioId - Portfolio to analyze
   * @param period - Time period to fetch
   * @param resolution - Data point frequency ('daily' | 'weekly' | 'monthly')
   */
  getHistoricalValues(
    portfolioId: string,
    period: TimePeriod,
    resolution?: 'daily' | 'weekly' | 'monthly'
  ): Promise<HistoricalValuePoint[]>;

  /**
   * Get portfolio value at a specific point in time.
   */
  getValueAtDate(portfolioId: string, date: Date): Promise<Decimal | null>;
}
