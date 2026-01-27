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
// Layout Types
// =============================================================================

/**
 * Layout mode for the dashboard.
 * - 'grid': Multi-column responsive grid layout
 * - 'stacking': Single-column stacked layout
 */
export type LayoutMode = 'grid' | 'stacking';

/**
 * Number of columns in grid layout mode.
 * Only applies when layoutMode is 'grid'.
 */
export type GridColumns = 2 | 3 | 4;

/**
 * Widget column span (1 = normal, 2 = double-width).
 * Spans are clamped to available columns on smaller screens.
 */
export type WidgetSpan = 1 | 2;

/**
 * Widget row span (1 = normal, 2 = double, 3 = triple, 4 = quadruple height).
 * Used for dense packing layout calculations.
 */
export type WidgetRowSpan = 1 | 2 | 3 | 4;

/**
 * Size constraints for a widget in react-grid-layout.
 * Defines min/max column and row spans for discrete snapping.
 */
export interface WidgetSizeConstraints {
  /** Minimum column span */
  minW: WidgetSpan;
  /** Maximum column span */
  maxW: WidgetSpan;
  /** Minimum row span */
  minH: WidgetRowSpan;
  /** Maximum row span */
  maxH: WidgetRowSpan;
}

/**
 * Per-widget size constraints for discrete grid snapping.
 * Prevents infinite free-form resizing by enforcing discrete sizes.
 */
export const WIDGET_SIZE_CONSTRAINTS: Record<WidgetId, WidgetSizeConstraints> = {
  'total-value': { minW: 1, maxW: 1, minH: 1, maxH: 1 },
  'gain-loss': { minW: 1, maxW: 1, minH: 1, maxH: 1 },
  'day-change': { minW: 1, maxW: 1, minH: 1, maxH: 1 },
  'category-breakdown': { minW: 1, maxW: 2, minH: 2, maxH: 4 },
  'growth-chart': { minW: 2, maxW: 2, minH: 2, maxH: 4 },
  'top-performers': { minW: 1, maxW: 2, minH: 2, maxH: 3 },
  'biggest-losers': { minW: 1, maxW: 2, minH: 2, maxH: 3 },
  'recent-activity': { minW: 1, maxW: 2, minH: 2, maxH: 3 },
};

/**
 * Settings for the Category Breakdown widget.
 */
export interface CategoryBreakdownSettings {
  /** Whether to show the pie chart visualization */
  showPieChart: boolean;
}

/**
 * Per-widget settings configuration.
 * Each widget can have its own specific settings.
 */
export interface WidgetSettings {
  'category-breakdown': CategoryBreakdownSettings;
}

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
export type TimePeriod =
  | 'TODAY'
  | 'WEEK'
  | 'MONTH'
  | 'QUARTER'
  | 'YEAR'
  | 'ALL';

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
 * Version 1 dashboard configuration (legacy).
 * Used for migration from older configurations.
 */
export interface DashboardConfigurationV1 {
  /** Schema version for migrations */
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

/**
 * User's personalized dashboard configuration (Version 2).
 * Used for migration from older configurations.
 */
export interface DashboardConfigurationV2 {
  /** Schema version for migrations */
  readonly version: 2;

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

  /** Layout mode: 'grid' for multi-column, 'stacking' for single column */
  layoutMode: LayoutMode;

  /** Number of columns in grid mode (2, 3, or 4) */
  gridColumns: GridColumns;

  /** Per-widget column span overrides (1 or 2 columns) */
  widgetSpans: Partial<Record<WidgetId, WidgetSpan>>;
}

/**
 * User's personalized dashboard configuration (Version 3).
 * Legacy configuration for migration to V4.
 */
export interface DashboardConfigurationV3 {
  /** Schema version for migrations */
  readonly version: 3;

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

  /** Layout mode: 'grid' for multi-column, 'stacking' for single column */
  layoutMode: LayoutMode;

  /** Number of columns in grid mode (2, 3, or 4) */
  gridColumns: GridColumns;

  /** Per-widget column span overrides (1 or 2 columns) */
  widgetSpans: Partial<Record<WidgetId, WidgetSpan>>;

  /** Whether dense packing mode is enabled */
  densePacking: boolean;

  /** Per-widget row span overrides (1, 2, or 3 rows) */
  widgetRowSpans: Partial<Record<WidgetId, WidgetRowSpan>>;

  /** Per-widget specific settings (e.g., pie chart toggle for category breakdown) */
  widgetSettings: WidgetSettings;
}

// =============================================================================
// React-Grid-Layout Types (Version 4)
// =============================================================================

/**
 * React-Grid-Layout item configuration.
 * Defines position and size of a widget in the grid.
 */
export interface RGLLayout {
  /** Widget identifier */
  i: WidgetId;

  /** Column position (0-based) */
  x: number;

  /** Row position (0-based) */
  y: number;

  /** Width in columns */
  w: number;

  /** Height in rows */
  h: number;

  /** Minimum width constraint */
  minW?: number;

  /** Maximum width constraint */
  maxW?: number;

  /** Minimum height constraint */
  minH?: number;

  /** Maximum height constraint */
  maxH?: number;

  /** Whether item is locked from dragging/resizing */
  static?: boolean;
}

/**
 * Responsive layouts for different breakpoints.
 */
export interface RGLLayouts {
  /** Desktop layout (>1024px) */
  lg: RGLLayout[];

  /** Tablet layout (768-1024px) */
  md: RGLLayout[];

  /** Mobile layout (<768px) */
  sm: RGLLayout[];
}

/**
 * User's personalized dashboard configuration (Version 4).
 * Stored in IndexedDB userSettings table with key 'dashboard-config'.
 * Adds react-grid-layout support while maintaining backward compatibility.
 */
export interface DashboardConfiguration {
  /** Schema version for migrations (current: 4) */
  readonly version: 4;

  // All V3 fields preserved for backward compatibility
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

  /** Layout mode: 'grid' for multi-column, 'stacking' for single column */
  layoutMode: LayoutMode;

  /** Number of columns in grid mode (2, 3, or 4) */
  gridColumns: GridColumns;

  /** Per-widget column span overrides (1 or 2 columns) */
  widgetSpans: Partial<Record<WidgetId, WidgetSpan>>;

  /** Whether dense packing mode is enabled */
  densePacking: boolean;

  /** Per-widget row span overrides (1, 2, or 3 rows) */
  widgetRowSpans: Partial<Record<WidgetId, WidgetRowSpan>>;

  // NEW: React-Grid-Layout layouts (optional for backward compatibility)
  /** React-Grid-Layout layouts for responsive breakpoints */
  rglLayouts?: RGLLayouts;

  /** Whether to use react-grid-layout (false = legacy CSS Grid + dnd-kit) */
  useReactGridLayout?: boolean;

  /** Per-widget specific settings (e.g., pie chart toggle for category breakdown) */
  widgetSettings: WidgetSettings;
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

export const LayoutModeSchema = z.enum(['grid', 'stacking']);

export const GridColumnsSchema = z.union([
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const WidgetSpanSchema = z.union([z.literal(1), z.literal(2)]);

export const WidgetSpansSchema = z.record(WidgetIdSchema, WidgetSpanSchema);

export const WidgetRowSpanSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const WidgetRowSpansSchema = z.record(
  WidgetIdSchema,
  WidgetRowSpanSchema
);

export const CategoryBreakdownSettingsSchema = z.object({
  showPieChart: z.boolean(),
});

export const WidgetSettingsSchema = z.object({
  'category-breakdown': CategoryBreakdownSettingsSchema,
});

/**
 * Version 1 schema for migration validation.
 */
export const DashboardConfigurationSchemaV1 = z.object({
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

/**
 * Version 2 schema with layout configuration.
 * Used for migration from v2 to v3.
 */
export const DashboardConfigurationSchemaV2 = z.object({
  version: z.literal(2),
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
  layoutMode: LayoutModeSchema,
  gridColumns: GridColumnsSchema,
  widgetSpans: z
    .record(WidgetIdSchema, WidgetSpanSchema)
    .optional()
    .default({}),
});

/**
 * Version 3 schema with dense packing configuration.
 * Used for migration from v3 to v4.
 */
export const DashboardConfigurationSchemaV3 = z.object({
  version: z.literal(3),
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
  layoutMode: LayoutModeSchema,
  gridColumns: GridColumnsSchema,
  widgetSpans: z
    .record(WidgetIdSchema, WidgetSpanSchema)
    .optional()
    .default({}),
  densePacking: z.boolean(),
  widgetRowSpans: z
    .record(WidgetIdSchema, WidgetRowSpanSchema)
    .optional()
    .default({}),
  widgetSettings: WidgetSettingsSchema,
});

/**
 * React-Grid-Layout item schema.
 */
export const RGLLayoutSchema = z.object({
  i: WidgetIdSchema,
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1),
  h: z.number().int().min(1),
  minW: z.number().int().min(1).optional(),
  maxW: z.number().int().min(1).optional(),
  minH: z.number().int().min(1).optional(),
  maxH: z.number().int().min(1).optional(),
  static: z.boolean().optional(),
});

/**
 * Responsive layouts schema.
 */
export const RGLLayoutsSchema = z.object({
  lg: z.array(RGLLayoutSchema),
  md: z.array(RGLLayoutSchema),
  sm: z.array(RGLLayoutSchema),
});

/**
 * Version 4 schema with react-grid-layout support.
 */
export const DashboardConfigurationSchema = z.object({
  version: z.literal(4),
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
  layoutMode: LayoutModeSchema,
  gridColumns: GridColumnsSchema,
  widgetSpans: z.record(WidgetIdSchema, WidgetSpanSchema).optional().default({}),
  densePacking: z.boolean(),
  widgetRowSpans: z.record(WidgetIdSchema, WidgetRowSpanSchema).optional().default({}),
  rglLayouts: RGLLayoutsSchema.optional(),
  useReactGridLayout: z.boolean().optional().default(false),
  widgetSettings: WidgetSettingsSchema,
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

/**
 * Default widget spans based on WIDGET_DEFINITIONS.
 * Widgets with colSpan: 2 in their definition get span 2.
 */
export const DEFAULT_WIDGET_SPANS: Partial<Record<WidgetId, WidgetSpan>> = {
  'growth-chart': 2,
  'recent-activity': 2,
};

/**
 * Default row spans based on widget type:
 * - Growth chart: 4 rows (has header + stats + chart + footer)
 * - Tables/Lists: 3 rows (has header + rows + footer)
 * - Metrics cards: 1 row (compact, implicit default)
 */
export const DEFAULT_WIDGET_ROW_SPANS: Partial<Record<WidgetId, WidgetRowSpan>> = {
  'growth-chart': 4,
  'recent-activity': 3,
  'category-breakdown': 3,
  'top-performers': 3,
  'biggest-losers': 3,
  // Metrics widgets default to 1 (not explicitly set)
};

export const DEFAULT_DASHBOARD_CONFIG: DashboardConfiguration = {
  version: 4,
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
  layoutMode: 'grid',
  gridColumns: 4,
  widgetSpans: { ...DEFAULT_WIDGET_SPANS },
  densePacking: true,
  widgetRowSpans: { ...DEFAULT_WIDGET_ROW_SPANS },
rglLayouts: undefined, // Generated on demand during migration
  useReactGridLayout: false, // Disabled by default, opt-in
  widgetSettings: {
    'category-breakdown': {
      showPieChart: false, // Pie chart disabled by default
    },
  },
};

// =============================================================================
// Performance Page Types (User Story 6-8)
// =============================================================================

/**
 * Time periods for Performance page chart selection.
 */
export type ChartTimePeriod = '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

/**
 * Historical portfolio value data point for performance chart.
 */
export interface HistoricalPortfolioValue {
  /** Date of this snapshot */
  date: Date;
  /** Total portfolio value at date */
  value: Decimal;
  /** Total invested amount at date (cost basis) */
  costBasis?: Decimal;
}

/**
 * Calculated portfolio performance metrics for the Performance page.
 * All percentage values are stored as numbers (e.g., 12.5 for 12.5%).
 */
export interface PerformancePageMetrics {
  /** Total return on investment percentage */
  roi: number;
  /** Compound Annual Growth Rate (CAGR) percentage */
  annualizedReturn: number;
  /** Standard deviation of returns */
  volatility: number;
  /** Risk-adjusted return (0 if < 30 days data) */
  sharpeRatio: number;
  /** Largest peak-to-trough decline percentage (always non-negative) */
  maxDrawdown: number;
}

/**
 * Complete data structure for Performance page rendering.
 * Combines live metrics with calculated historical metrics.
 */
export interface PerformancePageData {
  // Live metrics (from useLivePriceMetrics)
  /** Current total portfolio value */
  totalValue: Decimal;
  /** Total gain/loss in currency */
  totalGain: Decimal;
  /** Total gain/loss as percentage */
  totalGainPercent: number;
  /** Today's change in currency */
  dayChange: Decimal;
  /** Today's change as percentage */
  dayChangePercent: number;
  /** Top 5 best performing holdings */
  topPerformers: HoldingPerformance[];
  /** Top 5 worst performing holdings */
  biggestLosers: HoldingPerformance[];

  // Calculated metrics (from historical data)
  /** Portfolio performance metrics (CAGR, Sharpe, Drawdown) */
  metrics: PerformancePageMetrics;

  // Chart data
  /** Historical portfolio values for chart */
  historicalData: HistoricalPortfolioValue[];
  /** Currently selected chart time period */
  selectedPeriod: ChartTimePeriod;

  // State
  /** True while initial data is loading */
  loading: boolean;
  /** Error message if calculation failed */
  error: string | null;

  // Actions
  /** Update the selected chart time period */
  setSelectedPeriod: (period: ChartTimePeriod) => void;
}
