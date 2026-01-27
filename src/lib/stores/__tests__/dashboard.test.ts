import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  DashboardConfiguration,
  DEFAULT_DASHBOARD_CONFIG,
  DEFAULT_WIDGET_ROW_SPANS,
  DashboardConfigurationSchema,
  WidgetRowSpanSchema,
} from '@/types/dashboard';

// Use vi.hoisted to define mocks that can be referenced by hoisted vi.mock
const { mockDashboardConfigService } = vi.hoisted(() => ({
  mockDashboardConfigService: {
    getConfig: vi.fn(),
    saveConfig: vi.fn(),
    resetToDefault: vi.fn(),
    setWidgetVisibility: vi.fn(),
    setWidgetOrder: vi.fn(),
    setTimePeriod: vi.fn(),
    setPerformerCount: vi.fn(),
    setLayoutMode: vi.fn(),
    setGridColumns: vi.fn(),
    setWidgetSpan: vi.fn(),
    setDensePacking: vi.fn(),
    setWidgetRowSpan: vi.fn(),
  },
}));

vi.mock('@/lib/services/dashboard-config', () => ({
  dashboardConfigService: mockDashboardConfigService,
}));

// Import after mock is set up
import { useDashboardStore } from '../dashboard';

describe('Dashboard Store', () => {
  const defaultV4Config: DashboardConfiguration = {
    ...DEFAULT_DASHBOARD_CONFIG,
    version: 4,
    densePacking: false,
    widgetRowSpans: { ...DEFAULT_WIDGET_ROW_SPANS },
    useReactGridLayout: false,
    rglLayouts: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useDashboardStore.setState({
      config: null,
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Type Schemas', () => {
    it('should validate WidgetRowSpan type for value 1', () => {
      expect(WidgetRowSpanSchema.safeParse(1).success).toBe(true);
    });

    it('should validate WidgetRowSpan type for value 2', () => {
      expect(WidgetRowSpanSchema.safeParse(2).success).toBe(true);
    });

    it('should validate WidgetRowSpan type for value 3', () => {
      expect(WidgetRowSpanSchema.safeParse(3).success).toBe(true);
    });

    it('should reject invalid WidgetRowSpan value 4', () => {
      expect(WidgetRowSpanSchema.safeParse(4).success).toBe(false);
    });

    it('should reject invalid WidgetRowSpan value 0', () => {
      expect(WidgetRowSpanSchema.safeParse(0).success).toBe(false);
    });

    it('should validate DashboardConfiguration v4 schema', () => {
      const result = DashboardConfigurationSchema.safeParse(defaultV4Config);
      expect(result.success).toBe(true);
    });

    it('should validate v4 config with densePacking true', () => {
      const config = { ...defaultV4Config, densePacking: true };
      const result = DashboardConfigurationSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate v4 config with widgetRowSpans', () => {
      const config = {
        ...defaultV4Config,
        widgetRowSpans: { 'growth-chart': 3, 'recent-activity': 2 },
      };
      const result = DashboardConfigurationSchema.safeParse(config);
      expect(result.success).toBe(true);
    });
  });

  describe('loadConfig', () => {
    it('should load v4 config from service', async () => {
      mockDashboardConfigService.getConfig.mockResolvedValue(defaultV4Config);

      await useDashboardStore.getState().loadConfig();

      const state = useDashboardStore.getState();
      expect(state.config).toEqual(defaultV4Config);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should return default config if service returns default', async () => {
      mockDashboardConfigService.getConfig.mockResolvedValue({
        ...DEFAULT_DASHBOARD_CONFIG,
      });

      await useDashboardStore.getState().loadConfig();

      const state = useDashboardStore.getState();
      expect(state.config?.version).toBe(4);
      expect(state.config?.densePacking).toBe(true);
      expect(state.loading).toBe(false);
    });
  });

  describe('setDensePacking', () => {
    beforeEach(() => {
      useDashboardStore.setState({ config: { ...defaultV4Config } });
      mockDashboardConfigService.setDensePacking.mockResolvedValue(undefined);
    });

    it('should enable dense packing', async () => {
      await useDashboardStore.getState().setDensePacking(true);

      const state = useDashboardStore.getState();
      expect(state.config?.densePacking).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should disable dense packing', async () => {
      // Start with dense packing enabled
useDashboardStore.setState({ config: { ...defaultV4Config, densePacking: true } });

      await useDashboardStore.getState().setDensePacking(false);

      const state = useDashboardStore.getState();
      expect(state.config?.densePacking).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should rollback on persistence error', async () => {
      const initialConfig = { ...defaultV4Config, densePacking: false };
      useDashboardStore.setState({ config: initialConfig });

      mockDashboardConfigService.setDensePacking.mockRejectedValue(
        new Error('DB error')
      );

      await useDashboardStore.getState().setDensePacking(true);

      const state = useDashboardStore.getState();
      // Should rollback to original value
      expect(state.config?.densePacking).toBe(false);
      expect(state.error).toContain('Failed to update dense packing');
    });
  });

  describe('setWidgetRowSpan', () => {
    beforeEach(() => {
      useDashboardStore.setState({ config: { ...defaultV4Config } });
      mockDashboardConfigService.setWidgetRowSpan.mockResolvedValue(undefined);
    });

    it('should set widget row span to 2', async () => {
      await useDashboardStore.getState().setWidgetRowSpan('growth-chart', 2);

      const state = useDashboardStore.getState();
      expect(state.config?.widgetRowSpans?.['growth-chart']).toBe(2);
      expect(state.error).toBeNull();
    });

    it('should set widget row span to 3', async () => {
      await useDashboardStore.getState().setWidgetRowSpan('growth-chart', 3);

      const state = useDashboardStore.getState();
      expect(state.config?.widgetRowSpans?.['growth-chart']).toBe(3);
      expect(state.error).toBeNull();
    });

    it('should set widget row span to 1', async () => {
      useDashboardStore.setState({
        config: { ...defaultV4Config, widgetRowSpans: { 'growth-chart': 3 } },
      });

      await useDashboardStore.getState().setWidgetRowSpan('growth-chart', 1);

      const state = useDashboardStore.getState();
      expect(state.config?.widgetRowSpans?.['growth-chart']).toBe(1);
    });

    it('should reject invalid row span value', async () => {
      await useDashboardStore
        .getState()
        .setWidgetRowSpan('growth-chart', 4 as any);

      const state = useDashboardStore.getState();
      expect(state.error).toContain('Row span must be 1, 2, or 3');
    });

    it('should rollback on persistence error', async () => {
      const initialRowSpans = { 'growth-chart': 2 as const };
const initialConfig = { ...defaultV4Config, widgetRowSpans: initialRowSpans };
      useDashboardStore.setState({ config: initialConfig });

      mockDashboardConfigService.setWidgetRowSpan.mockRejectedValue(
        new Error('DB error')
      );

      await useDashboardStore.getState().setWidgetRowSpan('growth-chart', 3);

      const state = useDashboardStore.getState();
      // Should rollback to original value
      expect(state.config?.widgetRowSpans?.['growth-chart']).toBe(2);
      expect(state.error).toContain('Failed to update widget row span');
    });
  });

  describe('Migration v2 to v3', () => {
    it('should migrate v2 config to v3 with defaults', async () => {
      // The service handles migration, so we mock it returning an already-migrated v3 config
      const migratedConfig = {
        ...defaultV4Config,
        version: 3,
        densePacking: false,
        widgetRowSpans: { ...DEFAULT_WIDGET_ROW_SPANS },
      };

      mockDashboardConfigService.getConfig.mockResolvedValue(migratedConfig);

      await useDashboardStore.getState().loadConfig();

      const state = useDashboardStore.getState();
      expect(state.config?.version).toBe(3);
      expect(state.config?.densePacking).toBe(false);
      expect(state.config?.widgetRowSpans).toEqual(DEFAULT_WIDGET_ROW_SPANS);
    });
  });

  describe('resetToDefault', () => {
    it('should reset to default v3 config including densePacking and widgetRowSpans', async () => {
      useDashboardStore.setState({
        config: {
          ...defaultV4Config,
          densePacking: true,
          widgetRowSpans: { 'growth-chart': 3 },
        },
      });

      mockDashboardConfigService.resetToDefault.mockResolvedValue({
        ...DEFAULT_DASHBOARD_CONFIG,
      });

      await useDashboardStore.getState().resetToDefault();

      const state = useDashboardStore.getState();
      expect(state.config?.version).toBe(3);
      expect(state.config?.densePacking).toBe(false);
      expect(state.config?.widgetRowSpans).toEqual(DEFAULT_WIDGET_ROW_SPANS);
      expect(state.loading).toBe(false);
    });
  });
});
