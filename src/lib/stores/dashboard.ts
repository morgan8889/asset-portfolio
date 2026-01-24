/**
 * Dashboard Zustand Store
 *
 * Manages dashboard configuration state with persistence.
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
  config: DashboardConfiguration | null;
  loading: boolean;
  error: string | null;

  loadConfig: () => Promise<void>;
  setWidgetVisibility: (widgetId: WidgetId, visible: boolean) => Promise<void>;
  setWidgetOrder: (order: WidgetId[]) => Promise<void>;
  setTimePeriod: (period: TimePeriod) => Promise<void>;
  setPerformerCount: (count: number) => Promise<void>;
  resetToDefault: () => Promise<void>;
  clearError: () => void;
}

/**
 * Helper for optimistic updates with rollback on error.
 */
async function optimisticUpdate<T extends keyof DashboardConfiguration>(
  get: () => DashboardState,
  set: (partial: Partial<DashboardState>) => void,
  field: T,
  value: DashboardConfiguration[T],
  persistFn: () => Promise<void>,
  errorMessage: string
) {
  const { config } = get();
  if (!config) return;

  const updatedConfig = { ...config, [field]: value };
  set({ config: updatedConfig });

  try {
    await persistFn();
  } catch {
    set({ config, error: errorMessage });
  }
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set, get) => ({
      config: null,
      loading: false,
      error: null,

      loadConfig: async () => {
        set({ loading: true, error: null });
        try {
          const config = await dashboardConfigService.getConfig();
          set({ config, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load dashboard config',
            loading: false,
            config: { ...DEFAULT_DASHBOARD_CONFIG },
          });
        }
      },

      setWidgetVisibility: async (widgetId, visible) => {
        const { config } = get();
        if (!config) return;

        await optimisticUpdate(
          get,
          set,
          'widgetVisibility',
          { ...config.widgetVisibility, [widgetId]: visible },
          () => dashboardConfigService.setWidgetVisibility(widgetId, visible),
          'Failed to update widget visibility'
        );
      },

      setWidgetOrder: async (order) => {
        await optimisticUpdate(
          get,
          set,
          'widgetOrder',
          order,
          () => dashboardConfigService.setWidgetOrder(order),
          'Failed to update widget order'
        );
      },

      setTimePeriod: async (period) => {
        await optimisticUpdate(
          get,
          set,
          'timePeriod',
          period,
          () => dashboardConfigService.setTimePeriod(period),
          'Failed to update time period'
        );
      },

      setPerformerCount: async (count) => {
        await optimisticUpdate(
          get,
          set,
          'performerCount',
          count,
          () => dashboardConfigService.setPerformerCount(count),
          'Failed to update performer count'
        );
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

      clearError: () => set({ error: null }),
    }),
    { name: 'dashboard-store' }
  )
);
