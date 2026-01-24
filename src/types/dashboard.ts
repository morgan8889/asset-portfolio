/**
 * Dashboard Configuration Types
 *
 * Type definitions for the configurable portfolio dashboard feature.
 * These types define the shape of data stored in IndexedDB and used throughout
 * the dashboard components.
 *
 * @module types/dashboard
 */

import { z } from 'zod';
import { Decimal } from 'decimal.js';
import { subDays, startOfDay } from 'date-fns';

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
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'Widget order must not contain duplicates',
    }),
  widgetVisibility: z.object({
    'total-value': z.boolean(),
    'gain-loss': z.boolean(),
    'day-change': z.boolean(),
    'category-breakdown': z.boolean(),
    'growth-chart': z.boolean(),
    'top-performers': z.boolean(),
    'biggest-losers': z.boolean(),
    'recent-activity': z.boolean(),
  }),
  timePeriod: TimePeriodSchema,
  performerCount: z
    .number()
    .int('Performer count must be an integer')
    .min(1, 'Must show at least 1 performer')
    .max(10, 'Cannot show more than 10 performers'),
  lastUpdated: z.string().datetime('Must be a valid ISO 8601 datetime'),
});

// =============================================================================
// Widget Definitions Registry
// =============================================================================

export const WIDGET_DEFINITIONS: Record<WidgetId, WidgetDefinition> = {
  'total-value': {
    id: 'total-value',
    displayName: 'Total Value',
    description: 'Current portfolio market value',
    colSpan: 1,
    minHeight: 120,
    canHide: false, // Core metric, always visible
  },
  'gain-loss': {
    id: 'gain-loss',
    displayName: 'Total Gain/Loss',
    description: 'Overall portfolio performance',
    colSpan: 1,
    minHeight: 120,
    canHide: true,
  },
  'day-change': {
    id: 'day-change',
    displayName: 'Day Change',
    description: "Today's portfolio movement",
    colSpan: 1,
    minHeight: 120,
    canHide: true,
  },
  'category-breakdown': {
    id: 'category-breakdown',
    displayName: 'Category Breakdown',
    description: 'Asset allocation by type',
    colSpan: 1,
    minHeight: 300,
    canHide: true,
  },
  'growth-chart': {
    id: 'growth-chart',
    displayName: 'Growth Chart',
    description: 'Portfolio value over time',
    colSpan: 2,
    minHeight: 400,
    canHide: true,
  },
  'top-performers': {
    id: 'top-performers',
    displayName: 'Top Performers',
    description: 'Best performing holdings',
    colSpan: 1,
    minHeight: 250,
    canHide: true,
  },
  'biggest-losers': {
    id: 'biggest-losers',
    displayName: 'Biggest Losers',
    description: 'Worst performing holdings',
    colSpan: 1,
    minHeight: 250,
    canHide: true,
  },
  'recent-activity': {
    id: 'recent-activity',
    displayName: 'Recent Activity',
    description: 'Latest transactions',
    colSpan: 2,
    minHeight: 300,
    canHide: true,
  },
};

// =============================================================================
// Time Period Configurations
// =============================================================================

export const TIME_PERIOD_CONFIGS: Record<TimePeriod, TimePeriodConfig> = {
  TODAY: {
    id: 'TODAY',
    label: 'Today',
    shortLabel: '1D',
    getStartDate: () => startOfDay(new Date()),
  },
  WEEK: {
    id: 'WEEK',
    label: 'This Week',
    shortLabel: '1W',
    getStartDate: () => subDays(new Date(), 7),
  },
  MONTH: {
    id: 'MONTH',
    label: 'This Month',
    shortLabel: '1M',
    getStartDate: () => subDays(new Date(), 30),
  },
  QUARTER: {
    id: 'QUARTER',
    label: 'This Quarter',
    shortLabel: '3M',
    getStartDate: () => subDays(new Date(), 90),
  },
  YEAR: {
    id: 'YEAR',
    label: 'This Year',
    shortLabel: '1Y',
    getStartDate: () => subDays(new Date(), 365),
  },
  ALL: {
    id: 'ALL',
    label: 'All Time',
    shortLabel: 'ALL',
    getStartDate: () => new Date(0),
  },
};

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfiguration = {
  version: 1,
  widgetOrder: [
    'total-value',
    'gain-loss',
    'day-change',
    'category-breakdown',
    'growth-chart',
    'top-performers',
    'biggest-losers',
    'recent-activity',
  ],
  widgetVisibility: {
    'total-value': true,
    'gain-loss': true,
    'day-change': true,
    'category-breakdown': true,
    'growth-chart': true,
    'top-performers': true,
    'biggest-losers': true,
    'recent-activity': true,
  },
  timePeriod: 'ALL',
  performerCount: 5,
  lastUpdated: new Date().toISOString(),
};
