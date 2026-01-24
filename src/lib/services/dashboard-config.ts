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
  DashboardConfigurationSchema,
  WidgetId,
  TimePeriod,
  DEFAULT_DASHBOARD_CONFIG,
} from '@/types/dashboard';

const STORAGE_KEY = 'dashboard-config';

export const dashboardConfigService = {
  /**
   * Load the current dashboard configuration.
   * Returns default configuration if none exists or validation fails.
   */
  async getConfig(): Promise<DashboardConfiguration> {
    const stored = await settingsQueries.get(STORAGE_KEY);

    if (!stored) {
      return { ...DEFAULT_DASHBOARD_CONFIG };
    }

    const result = DashboardConfigurationSchema.safeParse(stored);

    if (!result.success) {
      console.warn('Invalid dashboard config, using default:', result.error);
      return { ...DEFAULT_DASHBOARD_CONFIG };
    }

    return result.data;
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
  async setWidgetVisibility(widgetId: WidgetId, visible: boolean): Promise<void> {
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
};
