/**
 * Dashboard Zustand Store
 *
 * Manages dashboard configuration state with persistence via dashboard-config service.
 * Follows the same patterns as portfolio.ts for consistency.
 *
 * @module stores/dashboard
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  DashboardConfiguration,
  WidgetId,
  TimePeriod,
  DEFAULT_DASHBOARD_CONFIG,
} from '@/types/dashboard';
import { dashboardConfigService } from '@/lib/services/dashboard-config';

interface DashboardState {
  // State
  config: DashboardConfiguration | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadConfig: () => Promise<void>;
  setWidgetVisibility: (widgetId: WidgetId, visible: boolean) => Promise<void>;
  setWidgetOrder: (order: WidgetId[]) => Promise<void>;
  setTimePeriod: (period: TimePeriod) => Promise<void>;
  setPerformerCount: (count: number) => Promise<void>;
  resetToDefault: () => Promise<void>;
  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      // Initial state
      config: null,
      loading: false,
      error: null,

      // Actions
      loadConfig: async () => {
        set({ loading: true, error: null });
        try {
          const config = await dashboardConfigService.getConfig();
          set({ config, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load dashboard config',
            loading: false,
            // Fall back to default config on error
            config: { ...DEFAULT_DASHBOARD_CONFIG },
          });
        }
      },

      setWidgetVisibility: async (widgetId, visible) => {
        const { config } = get();
        if (!config) return;

        // Optimistic update
        const updatedConfig = {
          ...config,
          widgetVisibility: {
            ...config.widgetVisibility,
            [widgetId]: visible,
          },
        };
        set({ config: updatedConfig });

        try {
          await dashboardConfigService.setWidgetVisibility(widgetId, visible);
        } catch (error) {
          // Revert on failure
          set({ config, error: 'Failed to update widget visibility' });
        }
      },

      setWidgetOrder: async (order) => {
        const { config } = get();
        if (!config) return;

        // Optimistic update
        const updatedConfig = {
          ...config,
          widgetOrder: order,
        };
        set({ config: updatedConfig });

        try {
          await dashboardConfigService.setWidgetOrder(order);
        } catch (error) {
          // Revert on failure
          set({ config, error: 'Failed to update widget order' });
        }
      },

      setTimePeriod: async (period) => {
        const { config } = get();
        if (!config) return;

        // Optimistic update
        const updatedConfig = {
          ...config,
          timePeriod: period,
        };
        set({ config: updatedConfig });

        try {
          await dashboardConfigService.setTimePeriod(period);
        } catch (error) {
          // Revert on failure
          set({ config, error: 'Failed to update time period' });
        }
      },

      setPerformerCount: async (count) => {
        const { config } = get();
        if (!config) return;

        // Optimistic update
        const updatedConfig = {
          ...config,
          performerCount: count,
        };
        set({ config: updatedConfig });

        try {
          await dashboardConfigService.setPerformerCount(count);
        } catch (error) {
          // Revert on failure
          set({ config, error: 'Failed to update performer count' });
        }
      },

      resetToDefault: async () => {
        set({ loading: true, error: null });
        try {
          const config = await dashboardConfigService.resetToDefault();
          set({ config, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to reset dashboard config',
            loading: false,
          });
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'dashboard-store',
    }
  )
);
