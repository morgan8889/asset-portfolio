/**
 * Dashboard Configuration Service
 *
 * Handles CRUD operations for dashboard settings stored in IndexedDB.
 * Provides validation and default configuration management.
 *
 * @module services/dashboard-config
 */

import { settingsQueries } from '@/lib/db';
import {
  DashboardConfiguration,
  DashboardConfigurationV1,
  DashboardConfigurationV2,
  DashboardConfigurationSchema,
  DashboardConfigurationSchemaV1,
  DashboardConfigurationSchemaV2,
  WidgetId,
  TimePeriod,
  LayoutMode,
  GridColumns,
  WidgetSpan,
  WidgetRowSpan,
  DEFAULT_DASHBOARD_CONFIG,
  DEFAULT_WIDGET_SPANS,
  DEFAULT_WIDGET_ROW_SPANS,
} from '@/types/dashboard';

const STORAGE_KEY = 'dashboard-config';

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
  };
}

/**
 * Migrate a v2 configuration to v3.
 * Adds dense packing settings while preserving existing config.
 */
function migrateV2ToV3(
  v2Config: DashboardConfigurationV2
): DashboardConfiguration {
  return {
    ...v2Config,
    version: 3,
    densePacking: false,
    widgetRowSpans: { ...DEFAULT_WIDGET_ROW_SPANS },
  };
}

export const dashboardConfigService = {
  /**
   * Load the current dashboard configuration.
   * Handles migration from v1 → v2 → v3 automatically.
   * Returns default configuration if none exists or validation fails.
   */
  async getConfig(): Promise<DashboardConfiguration> {
    const stored = await settingsQueries.get(STORAGE_KEY);

    if (!stored) {
      return { ...DEFAULT_DASHBOARD_CONFIG };
    }

    // Check if it's a valid v3 config
    const v3Result = DashboardConfigurationSchema.safeParse(stored);
    if (v3Result.success) {
      return v3Result.data;
    }

    // Try to migrate from v2
    const v2Result = DashboardConfigurationSchemaV2.safeParse(stored);
    if (v2Result.success) {
      console.info('Migrating dashboard config from v2 to v3');
      const migrated = migrateV2ToV3(v2Result.data);
      // Persist the migrated config
      await settingsQueries.set(STORAGE_KEY, migrated);
      return migrated;
    }

    // Try to migrate from v1
    const v1Result = DashboardConfigurationSchemaV1.safeParse(stored);
    if (v1Result.success) {
      console.info('Migrating dashboard config from v1 to v3');
      const v2Config = migrateV1ToV2(v1Result.data);
      const migrated = migrateV2ToV3(v2Config);
      // Persist the migrated config
      await settingsQueries.set(STORAGE_KEY, migrated);
      return migrated;
    }

    // Neither v1, v2, nor v3 valid - use defaults
    console.warn('Invalid dashboard config, using default:', v3Result.error);
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
};
