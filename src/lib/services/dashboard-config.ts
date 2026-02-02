/**
 * Dashboard Configuration Service
 *
 * Handles CRUD operations for dashboard settings stored in IndexedDB.
 * Provides validation and default configuration management.
 *
 * @module services/dashboard-config
 */

import { settingsQueries } from '@/lib/db';
import { logger } from '@/lib/utils/logger';
import {
  DashboardConfiguration,
  DashboardConfigurationV1,
  DashboardConfigurationV2,
  DashboardConfigurationV3,
  DashboardConfigurationSchema,
  DashboardConfigurationSchemaV1,
  DashboardConfigurationSchemaV2,
  DashboardConfigurationSchemaV3,
  WidgetId,
  TimePeriod,
  LayoutMode,
  GridColumns,
  WidgetSpan,
  WidgetRowSpan,
  RGLLayout,
  RGLLayouts,
  DEFAULT_DASHBOARD_CONFIG,
  DEFAULT_WIDGET_SPANS,
  DEFAULT_WIDGET_ROW_SPANS,
  WIDGET_SIZE_CONSTRAINTS,
} from '@/types/dashboard';

const STORAGE_KEY = 'dashboard-config';

/** All widget IDs for ensuring complete visibility records */
const ALL_WIDGET_IDS: WidgetId[] = [
  'total-value',
  'gain-loss',
  'day-change',
  'category-breakdown',
  'growth-chart',
  'top-performers',
  'biggest-losers',
  'recent-activity',
  'tax-exposure',
];

/**
 * Ensure all widget IDs have visibility entries.
 * New widgets default to visible (true).
 */
function ensureCompleteVisibility(
  visibility: Record<WidgetId, boolean>
): Record<WidgetId, boolean> {
  const complete = { ...visibility };
  for (const widgetId of ALL_WIDGET_IDS) {
    if (!(widgetId in complete)) {
      complete[widgetId] = true; // New widgets default to visible
    }
  }
  return complete;
}

/**
 * Migrate a v1 configuration to v2.
 * Adds default layout settings while preserving existing config.
 */
function migrateV1ToV2(
  v1Config: DashboardConfigurationV1
): DashboardConfigurationV2 {
  return {
    ...v1Config,
    version: 2,
    layoutMode: 'grid',
    gridColumns: 4,
    widgetSpans: { ...DEFAULT_WIDGET_SPANS },
    widgetVisibility: ensureCompleteVisibility(v1Config.widgetVisibility),
  };
}

/**
 * Migrate a v2 configuration to v3.
 * Adds dense packing settings and widget settings while preserving existing config.
 */
function migrateV2ToV3(
  v2Config: DashboardConfigurationV2
): DashboardConfigurationV3 {
  return {
    ...v2Config,
    version: 3,
    densePacking: true,
    widgetRowSpans: { ...DEFAULT_WIDGET_ROW_SPANS },
    widgetSettings: {
      'category-breakdown': {
        showPieChart: false,
      },
    },
  };
}

/**
 * Generate react-grid-layout layouts from existing widget span configuration.
 * Converts CSS Grid spans into RGL position and size format.
 * Uses proper bin-packing to handle varying widget heights.
 *
 * @param widgetOrder - Ordered array of widget IDs
 * @param widgetSpans - Column span overrides (1 or 2 columns)
 * @param widgetRowSpans - Row span overrides (1-4 rows)
 * @param gridColumns - Total number of columns in the grid
 * @returns Responsive layouts for lg, md, and sm breakpoints
 */
function generateRGLLayoutsFromSpans(
  widgetOrder: WidgetId[],
  widgetSpans: Partial<Record<WidgetId, WidgetSpan>>,
  widgetRowSpans: Partial<Record<WidgetId, WidgetRowSpan>>,
  gridColumns: GridColumns
): RGLLayouts {
  const lgLayout: RGLLayout[] = [];

  // Track the bottom position (y + h) for each column
  const columnBottoms: number[] = new Array(gridColumns).fill(0);

  // Generate desktop layout with proper bin-packing
  widgetOrder.forEach((widgetId) => {
    const w = widgetSpans[widgetId] ?? DEFAULT_WIDGET_SPANS[widgetId] ?? 1;
    const h =
      widgetRowSpans[widgetId] ?? DEFAULT_WIDGET_ROW_SPANS[widgetId] ?? 1;
    const constraints = WIDGET_SIZE_CONSTRAINTS[widgetId];

    // Find the best position: leftmost x where all needed columns have minimum y
    let bestX = 0;
    let minY = Infinity;

    for (let x = 0; x <= gridColumns - w; x++) {
      // Find the maximum bottom position for the columns this widget would span
      let maxBottom = 0;
      for (let col = x; col < x + w; col++) {
        maxBottom = Math.max(maxBottom, columnBottoms[col]);
      }

      if (maxBottom < minY) {
        minY = maxBottom;
        bestX = x;
      }
    }

    lgLayout.push({
      i: widgetId,
      x: bestX,
      y: minY,
      w,
      h,
      minW: constraints.minW,
      maxW: constraints.maxW,
      minH: constraints.minH,
      maxH: constraints.maxH,
    });

    // Update column bottoms for the columns this widget occupies
    for (let col = bestX; col < bestX + w; col++) {
      columnBottoms[col] = minY + h;
    }
  });

  // Tablet layout: clamp width to 2 columns max, recalculate positions
  const mdColumnBottoms: number[] = [0, 0];
  const mdLayout: RGLLayout[] = widgetOrder.map((widgetId) => {
    const lgItem = lgLayout.find((item) => item.i === widgetId)!;
    const constraints = WIDGET_SIZE_CONSTRAINTS[widgetId];
    const w = Math.min(lgItem.w, 2);
    const h = lgItem.h;

    // Find best position in 2-column grid
    let bestX = 0;
    let minY = Infinity;

    for (let x = 0; x <= 2 - w; x++) {
      let maxBottom = 0;
      for (let col = x; col < x + w; col++) {
        maxBottom = Math.max(maxBottom, mdColumnBottoms[col]);
      }
      if (maxBottom < minY) {
        minY = maxBottom;
        bestX = x;
      }
    }

    // Update column bottoms
    for (let col = bestX; col < bestX + w; col++) {
      mdColumnBottoms[col] = minY + h;
    }

    return {
      ...lgItem,
      x: bestX,
      y: minY,
      w,
      minW: constraints.minW,
      maxW: Math.min(constraints.maxW, 2) as 1 | 2,
      minH: constraints.minH,
      maxH: constraints.maxH,
    };
  });

  // Mobile layout: all widgets full-width, stacked vertically, preserve heights
  let smY = 0;
  const smLayout: RGLLayout[] = widgetOrder.map((widgetId) => {
    const lgItem = lgLayout.find((item) => item.i === widgetId)!;
    const constraints = WIDGET_SIZE_CONSTRAINTS[widgetId];
    const y = smY;
    smY += lgItem.h;
    return {
      ...lgItem,
      x: 0,
      y,
      w: 1,
      minW: 1,
      maxW: 1,
      minH: constraints.minH,
      maxH: constraints.maxH,
    };
  });

  return { lg: lgLayout, md: mdLayout, sm: smLayout };
}

/**
 * Migrate a v3 configuration to v4.
 * Adds react-grid-layout support while preserving existing config.
 */
function migrateV3ToV4(
  v3Config: DashboardConfigurationV3
): DashboardConfiguration {
  return {
    ...v3Config,
    version: 4,
    useReactGridLayout: false, // Disabled by default, opt-in
    rglLayouts: generateRGLLayoutsFromSpans(
      v3Config.widgetOrder,
      v3Config.widgetSpans,
      v3Config.widgetRowSpans,
      v3Config.gridColumns
    ),
    widgetSettings: {
      'category-breakdown': {
        showPieChart: false, // Pie chart disabled by default
      },
    },
  };
}

/**
 * Generate RGL layouts from a dashboard configuration.
 * Exported for use by the store when toggling RGL mode.
 */
export function generateRGLLayoutsFromConfig(
  config: DashboardConfiguration | DashboardConfigurationV3
): RGLLayouts {
  return generateRGLLayoutsFromSpans(
    config.widgetOrder,
    config.widgetSpans,
    config.widgetRowSpans,
    config.gridColumns
  );
}

/**
 * Sync RGL layout constraints with current WIDGET_SIZE_CONSTRAINTS.
 * This ensures existing stored layouts pick up constraint changes (e.g., maxH updates).
 */
function syncLayoutConstraints(layouts: RGLLayouts): RGLLayouts {
  const syncBreakpoint = (items: RGLLayout[]): RGLLayout[] =>
    items.map((item) => {
      const widgetId = item.i as WidgetId;
      const constraints = WIDGET_SIZE_CONSTRAINTS[widgetId];
      if (!constraints) return item;
      return {
        ...item,
        minW: constraints.minW,
        maxW: constraints.maxW,
        minH: constraints.minH,
        maxH: constraints.maxH,
      };
    });

  return {
    lg: syncBreakpoint(layouts.lg),
    md: syncBreakpoint(layouts.md),
    sm: syncBreakpoint(layouts.sm),
  };
}

export const dashboardConfigService = {
  /**
   * Load the current dashboard configuration.
   * Handles migration from v1 → v2 → v3 → v4 automatically.
   * Returns default configuration if none exists or validation fails.
   */
  async getConfig(): Promise<DashboardConfiguration> {
    const stored = await settingsQueries.get(STORAGE_KEY);

    if (!stored) {
      return { ...DEFAULT_DASHBOARD_CONFIG };
    }

    // Check if it's a valid v4 config
    const v4Result = DashboardConfigurationSchema.safeParse(stored);
    if (v4Result.success) {
      const config = v4Result.data;
      // Sync constraints with current WIDGET_SIZE_CONSTRAINTS
      // This ensures existing layouts pick up constraint changes (e.g., maxH updates)
      if (config.rglLayouts) {
        config.rglLayouts = syncLayoutConstraints(config.rglLayouts);
      }
      return config;
    }

    // Try to migrate from v3
    const v3Result = DashboardConfigurationSchemaV3.safeParse(stored);
    if (v3Result.success) {
      logger.info('Migrating dashboard config from v3 to v4', { component: 'DashboardConfig', operation: 'migration' });
      const migrated = migrateV3ToV4(v3Result.data);
      // Persist the migrated config
      await settingsQueries.set(STORAGE_KEY, migrated);
      return migrated;
    }

    // Try to migrate from v2
    const v2Result = DashboardConfigurationSchemaV2.safeParse(stored);
    if (v2Result.success) {
      logger.info('Migrating dashboard config from v2 to v4', { component: 'DashboardConfig', operation: 'migration' });
      const v3Config = migrateV2ToV3(v2Result.data);
      const migrated = migrateV3ToV4(v3Config);
      // Persist the migrated config
      await settingsQueries.set(STORAGE_KEY, migrated);
      return migrated;
    }

    // Try to migrate from v1
    const v1Result = DashboardConfigurationSchemaV1.safeParse(stored);
    if (v1Result.success) {
      logger.info('Migrating dashboard config from v1 to v4', { component: 'DashboardConfig', operation: 'migration' });
      const v2Config = migrateV1ToV2(v1Result.data);
      const v3Config = migrateV2ToV3(v2Config);
      const migrated = migrateV3ToV4(v3Config);
      // Persist the migrated config
      await settingsQueries.set(STORAGE_KEY, migrated);
      return migrated;
    }

    // None of the versions valid - use defaults
    logger.warn('Invalid dashboard config, using default', { component: 'DashboardConfig', error: v4Result.error });
    return { ...DEFAULT_DASHBOARD_CONFIG };
  },

  /**
   * Save updated dashboard configuration.
   * Validates input and updates lastUpdated timestamp.
   */
  async saveConfig(config: DashboardConfiguration): Promise<void> {
    const validated = DashboardConfigurationSchema.parse(config);
    const updated = {
      ...validated,
      lastUpdated: new Date().toISOString(),
    };

    await settingsQueries.set(STORAGE_KEY, updated);
  },

  /**
   * Reset configuration to default values.
   * User's custom settings are deleted.
   */
  async resetToDefault(): Promise<DashboardConfiguration> {
    await settingsQueries.delete(STORAGE_KEY);
    return { ...DEFAULT_DASHBOARD_CONFIG };
  },

  /**
   * Update widget visibility.
   * Convenience method for toggling a single widget.
   */
  async setWidgetVisibility(
    widgetId: WidgetId,
    visible: boolean
  ): Promise<void> {
    const config = await this.getConfig();
    config.widgetVisibility[widgetId] = visible;
    await this.saveConfig(config);
  },

  /**
   * Update widget order.
   * Called after drag-and-drop reordering.
   */
  async setWidgetOrder(order: WidgetId[]): Promise<void> {
    const config = await this.getConfig();
    config.widgetOrder = order;
    await this.saveConfig(config);
  },

  /**
   * Update the selected time period.
   * Affects all period-dependent metrics calculations.
   */
  async setTimePeriod(period: TimePeriod): Promise<void> {
    const config = await this.getConfig();
    config.timePeriod = period;
    await this.saveConfig(config);
  },

  /**
   * Update the number of performers to display.
   */
  async setPerformerCount(count: number): Promise<void> {
    const config = await this.getConfig();
    config.performerCount = count;
    await this.saveConfig(config);
  },

  /**
   * Update the layout mode (grid or stacking).
   */
  async setLayoutMode(mode: LayoutMode): Promise<void> {
    const config = await this.getConfig();
    config.layoutMode = mode;
    await this.saveConfig(config);
  },

  /**
   * Update the number of grid columns.
   * Only affects display when layoutMode is 'grid'.
   */
  async setGridColumns(columns: GridColumns): Promise<void> {
    const config = await this.getConfig();
    config.gridColumns = columns;
    await this.saveConfig(config);
  },

  /**
   * Update the column span for a specific widget.
   */
  async setWidgetSpan(widgetId: WidgetId, span: WidgetSpan): Promise<void> {
    const config = await this.getConfig();
    config.widgetSpans = { ...config.widgetSpans, [widgetId]: span };
    await this.saveConfig(config);
  },

  /**
   * Enable or disable dense packing mode.
   * Only affects display when layoutMode is 'grid'.
   */
  async setDensePacking(enabled: boolean): Promise<void> {
    const config = await this.getConfig();
    config.densePacking = enabled;
    await this.saveConfig(config);
  },

  /**
   * Update the row span for a specific widget.
   * Only affects display when densePacking is enabled.
   */
  async setWidgetRowSpan(
    widgetId: WidgetId,
    rowSpan: WidgetRowSpan
  ): Promise<void> {
    const config = await this.getConfig();
    config.widgetRowSpans = { ...config.widgetRowSpans, [widgetId]: rowSpan };
    await this.saveConfig(config);
  },

  /**
   * Update react-grid-layout layouts and widget order.
   * Called when RGL layout changes (drag/drop or resize).
   */
  async setRGLLayouts(
    layouts: RGLLayouts,
    newOrder: WidgetId[]
  ): Promise<void> {
    const config = await this.getConfig();
    config.rglLayouts = layouts;
    config.widgetOrder = newOrder;
    await this.saveConfig(config);
  },

  /**
   * Enable or disable react-grid-layout mode.
   * When disabled, falls back to legacy CSS Grid + dnd-kit implementation.
   */
  async setUseReactGridLayout(enabled: boolean): Promise<void> {
    const config = await this.getConfig();
    config.useReactGridLayout = enabled;

    // If enabling RGL and no layouts exist, generate them from current config
    if (enabled && !config.rglLayouts) {
      config.rglLayouts = generateRGLLayoutsFromSpans(
        config.widgetOrder,
        config.widgetSpans,
        config.widgetRowSpans,
        config.gridColumns
      );
    }

    await this.saveConfig(config);
  },

  /**
   * Enable or disable the pie chart for category breakdown widget.
   */
  async setCategoryBreakdownPieChart(enabled: boolean): Promise<void> {
    const config = await this.getConfig();
    config.widgetSettings = {
      ...config.widgetSettings,
      'category-breakdown': {
        ...config.widgetSettings['category-breakdown'],
        showPieChart: enabled,
      },
    };
    await this.saveConfig(config);
  },
};
