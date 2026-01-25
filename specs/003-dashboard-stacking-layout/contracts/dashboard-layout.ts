/**
 * Dashboard Layout Contracts
 *
 * TypeScript interfaces for feature 003-dashboard-stacking-layout.
 * These contracts define the shape of data for layout configuration.
 *
 * NOTE: This is a design document. Copy to src/types/dashboard.ts during implementation.
 */

import { z } from 'zod';

// =============================================================================
// Layout Mode Types
// =============================================================================

/**
 * Available layout modes for the dashboard.
 */
export type LayoutMode = 'grid' | 'stacking';

/**
 * Valid column count options for grid layout.
 */
export type GridColumns = 2 | 3 | 4;

/**
 * Column span configuration for individual widgets.
 * - 1: Widget occupies one column
 * - 2: Widget spans two columns
 */
export type WidgetSpan = 1 | 2;

// =============================================================================
// Configuration Extensions
// =============================================================================

/**
 * Widget span configuration mapping.
 * Maps each widget ID to its column span setting.
 */
export type WidgetSpansConfiguration = Record<WidgetId, WidgetSpan>;

/**
 * Extended Dashboard Configuration (Version 2).
 * Adds layout mode, column count, and widget span settings.
 */
export interface DashboardConfigurationV2 {
  /** Schema version (2 for this feature) */
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

  // --- New fields for Feature 003 ---

  /** Current layout mode (grid or stacking) */
  layoutMode: LayoutMode;

  /** Number of columns in grid mode */
  gridColumns: GridColumns;

  /** Column span configuration per widget */
  widgetSpans: WidgetSpansConfiguration;
}

// =============================================================================
// Responsive Breakpoint Types
// =============================================================================

/**
 * Responsive breakpoint configuration.
 */
export interface ResponsiveBreakpoint {
  /** Breakpoint name for debugging */
  readonly name: 'mobile' | 'tablet' | 'desktop';

  /** Minimum width in pixels for this breakpoint */
  readonly minWidth: number;

  /** Maximum columns allowed at this breakpoint */
  readonly maxColumns: GridColumns | 1;
}

/**
 * Responsive breakpoint constants.
 */
export const RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoint[] = [
  { name: 'mobile', minWidth: 0, maxColumns: 1 },
  { name: 'tablet', minWidth: 768, maxColumns: 2 },
  { name: 'desktop', minWidth: 1024, maxColumns: 4 },
];

// =============================================================================
// Zod Validation Schemas
// =============================================================================

export const LayoutModeSchema = z.enum(['grid', 'stacking']);

export const GridColumnsSchema = z.union([z.literal(2), z.literal(3), z.literal(4)]);

export const WidgetSpanSchema = z.union([z.literal(1), z.literal(2)]);

export const WidgetSpansSchema = z.object({
  'total-value': WidgetSpanSchema,
  'gain-loss': WidgetSpanSchema,
  'day-change': WidgetSpanSchema,
  'category-breakdown': WidgetSpanSchema,
  'growth-chart': WidgetSpanSchema,
  'top-performers': WidgetSpanSchema,
  'biggest-losers': WidgetSpanSchema,
  'recent-activity': WidgetSpanSchema,
});

export const DashboardConfigurationSchemaV2 = z.object({
  version: z.literal(2),
  widgetOrder: z
    .array(WidgetIdSchema)
    .min(1, 'At least one widget must be in the order')
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'Widget order must not contain duplicates',
    }),
  widgetVisibility: WidgetVisibilitySchema,
  timePeriod: TimePeriodSchema,
  performerCount: z
    .number()
    .int('Performer count must be an integer')
    .min(1, 'Must show at least 1 performer')
    .max(10, 'Cannot show more than 10 performers'),
  lastUpdated: z.string().datetime('Must be a valid ISO 8601 datetime'),
  layoutMode: LayoutModeSchema,
  gridColumns: GridColumnsSchema,
  widgetSpans: WidgetSpansSchema,
});

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default widget span configuration.
 * Growth chart and recent activity span 2 columns by default.
 */
export const DEFAULT_WIDGET_SPANS: WidgetSpansConfiguration = {
  'total-value': 1,
  'gain-loss': 1,
  'day-change': 1,
  'category-breakdown': 1,
  'growth-chart': 2,
  'top-performers': 1,
  'biggest-losers': 1,
  'recent-activity': 2,
};

/**
 * Default dashboard configuration (Version 2).
 */
export const DEFAULT_DASHBOARD_CONFIG_V2: DashboardConfigurationV2 = {
  version: 2,
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
  widgetSpans: DEFAULT_WIDGET_SPANS,
};

// =============================================================================
// Store Action Types
// =============================================================================

/**
 * Dashboard store actions for layout configuration.
 */
export interface DashboardLayoutActions {
  /** Set the layout mode (grid or stacking) */
  setLayoutMode: (mode: LayoutMode) => Promise<void>;

  /** Set the grid column count */
  setGridColumns: (columns: GridColumns) => Promise<void>;

  /** Set the column span for a specific widget */
  setWidgetSpan: (widgetId: WidgetId, span: WidgetSpan) => Promise<void>;

  /** Reset layout settings to defaults (preserves other settings) */
  resetLayoutToDefault: () => Promise<void>;
}

// =============================================================================
// Service Interface
// =============================================================================

/**
 * Dashboard config service methods for layout configuration.
 */
export interface DashboardLayoutService {
  /** Persist layout mode to storage */
  setLayoutMode: (mode: LayoutMode) => Promise<void>;

  /** Persist grid columns to storage */
  setGridColumns: (columns: GridColumns) => Promise<void>;

  /** Persist widget span to storage */
  setWidgetSpan: (widgetId: WidgetId, span: WidgetSpan) => Promise<void>;

  /** Migrate v1 config to v2 */
  migrateToV2: (config: DashboardConfigurationV1) => DashboardConfigurationV2;
}

// =============================================================================
// Helper Types (referenced but defined elsewhere)
// =============================================================================

// These types are already defined in src/types/dashboard.ts
// Included here for contract completeness

type WidgetId =
  | 'total-value'
  | 'gain-loss'
  | 'day-change'
  | 'category-breakdown'
  | 'growth-chart'
  | 'top-performers'
  | 'biggest-losers'
  | 'recent-activity';

type TimePeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';

// Placeholder schemas (defined in existing codebase)
declare const WidgetIdSchema: z.ZodType<WidgetId>;
declare const TimePeriodSchema: z.ZodType<TimePeriod>;
declare const WidgetVisibilitySchema: z.ZodType<Record<WidgetId, boolean>>;

// V1 configuration for migration reference
interface DashboardConfigurationV1 {
  readonly version: 1;
  widgetOrder: WidgetId[];
  widgetVisibility: Record<WidgetId, boolean>;
  timePeriod: TimePeriod;
  performerCount: number;
  lastUpdated: string;
}
