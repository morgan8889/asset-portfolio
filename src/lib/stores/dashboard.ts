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
  LayoutMode,
  GridColumns,
  WidgetSpan,
  WidgetRowSpan,
  RGLLayouts,
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
  setLayoutMode: (mode: LayoutMode) => Promise<void>;
  setGridColumns: (columns: GridColumns) => Promise<void>;
  setWidgetSpan: (widgetId: WidgetId, span: WidgetSpan) => Promise<void>;
  setDensePacking: (enabled: boolean) => Promise<void>;
setWidgetRowSpan: (widgetId: WidgetId, rowSpan: WidgetRowSpan) => Promise<void>;
  setRGLLayouts: (layouts: RGLLayouts, newOrder: WidgetId[]) => Promise<void>;
  toggleUseReactGridLayout: (enabled: boolean) => Promise<void>;
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
  } catch (error) {
    // Log the actual error for debugging while showing user-friendly message
    console.error('Dashboard config update failed:', error);
    const detailedMessage =
      error instanceof Error
        ? `${errorMessage}: ${error.message}`
        : errorMessage;
    set({ config, error: detailedMessage });
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
            error:
              error instanceof Error
                ? error.message
                : 'Failed to load dashboard config',
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

      setLayoutMode: async (mode) => {
        await optimisticUpdate(
          get,
          set,
          'layoutMode',
          mode,
          () => dashboardConfigService.setLayoutMode(mode),
          'Failed to update layout mode'
        );
      },

      setGridColumns: async (columns) => {
        await optimisticUpdate(
          get,
          set,
          'gridColumns',
          columns,
          () => dashboardConfigService.setGridColumns(columns),
          'Failed to update grid columns'
        );
      },

      setWidgetSpan: async (widgetId, span) => {
        const { config } = get();
        if (!config) return;

        const updatedSpans = { ...config.widgetSpans, [widgetId]: span };
        await optimisticUpdate(
          get,
          set,
          'widgetSpans',
          updatedSpans,
          () => dashboardConfigService.setWidgetSpan(widgetId, span),
          'Failed to update widget span'
        );
      },

      setDensePacking: async (enabled) => {
        await optimisticUpdate(
          get,
          set,
          'densePacking',
          enabled,
          () => dashboardConfigService.setDensePacking(enabled),
          'Failed to update dense packing setting'
        );
      },

      setWidgetRowSpan: async (widgetId, rowSpan) => {
        const { config } = get();
        if (!config) return;

        // Validate rowSpan is 1, 2, or 3
        if (![1, 2, 3].includes(rowSpan)) {
          set({ error: 'Row span must be 1, 2, or 3' });
          return;
        }

        const updatedRowSpans = {
          ...config.widgetRowSpans,
          [widgetId]: rowSpan,
        };
        await optimisticUpdate(
          get,
          set,
          'widgetRowSpans',
          updatedRowSpans,
          () => dashboardConfigService.setWidgetRowSpan(widgetId, rowSpan),
          'Failed to update widget row span'
        );
      },

      setRGLLayouts: async (layouts, newOrder) => {
        const { config } = get();
        if (!config) return;

        const updatedConfig = {
          ...config,
          rglLayouts: layouts,
          widgetOrder: newOrder,
        };

        set({ config: updatedConfig });

        try {
          await dashboardConfigService.setRGLLayouts(layouts, newOrder);
        } catch (error) {
          console.error('Failed to save RGL layouts:', error);
          set({ config, error: 'Failed to save layout changes' });
        }
      },

      toggleUseReactGridLayout: async (enabled) => {
        const { config } = get();
        if (!config) return;

        // When enabling RGL, we need to generate layouts if they don't exist
        // and sync them to the store (not just to the service)
        let rglLayouts = config.rglLayouts;
        if (enabled && !rglLayouts) {
          // Import the layout generation function dynamically to avoid circular deps
          const { generateRGLLayoutsFromConfig } = await import(
            '@/lib/services/dashboard-config'
          );
          rglLayouts = generateRGLLayoutsFromConfig(config);
        }

        const updatedConfig = {
          ...config,
          useReactGridLayout: enabled,
          rglLayouts,
        };

        set({ config: updatedConfig });

        try {
          await dashboardConfigService.setUseReactGridLayout(enabled);
        } catch (error) {
          console.error('Failed to toggle layout system:', error);
          set({ config, error: 'Failed to toggle layout system' });
        }
      },

      resetToDefault: async () => {
        set({ loading: true, error: null });
        try {
          const config = await dashboardConfigService.resetToDefault();
          set({ config, loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to reset dashboard config',
            loading: false,
          });
        }
      },

      clearError: () => set({ error: null }),
    }),
    { name: 'dashboard-store' }
  )
);
