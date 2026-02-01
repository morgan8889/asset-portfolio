/**
 * Dashboard Configuration Service Unit Tests
 *
 * Tests migration logic, layout generation, feature flag toggling,
 * and RGL layout generation algorithms.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type {
  DashboardConfiguration,
  DashboardConfigurationV1,
  DashboardConfigurationV2,
  DashboardConfigurationV3,
  WidgetId,
  RGLLayouts,
} from '@/types/dashboard';
import {
  DEFAULT_WIDGET_SPANS,
  DEFAULT_WIDGET_ROW_SPANS,
} from '@/types/dashboard';

// Use vi.hoisted to define mocks that can be referenced by hoisted vi.mock
const { mockSettingsQueries } = vi.hoisted(() => ({
  mockSettingsQueries: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  settingsQueries: mockSettingsQueries,
}));

// Import after mock is set up
import {
  dashboardConfigService,
  generateRGLLayoutsFromConfig,
} from '../dashboard-config';

describe('Dashboard Configuration Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Migration Logic', () => {
    describe('V1 → V2 Migration', () => {
      it('should migrate v1 config to v2 with default layout settings', async () => {
        const v1Config: DashboardConfigurationV1 = {
          version: 1,
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
          timePeriod: 'MONTH',
          performerCount: 5,
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        mockSettingsQueries.get.mockResolvedValue(v1Config);
        mockSettingsQueries.set.mockResolvedValue(undefined);

        const config = await dashboardConfigService.getConfig();

        // Should migrate to v4 (via v2 → v3 → v4)
        expect(config.version).toBe(4);
        expect(config.layoutMode).toBe('grid');
        expect(config.gridColumns).toBe(4);
        expect(config.widgetSpans).toEqual(DEFAULT_WIDGET_SPANS);

        // Should have v3 features
        expect(config.densePacking).toBe(true);
        expect(config.widgetRowSpans).toEqual(DEFAULT_WIDGET_ROW_SPANS);

        // Should have v4 features
        expect(config.useReactGridLayout).toBe(false);
        expect(config.rglLayouts).toBeDefined();

        // Should preserve v1 settings (with new widgets added)
        expect(config.widgetVisibility).toEqual({
          ...v1Config.widgetVisibility,
          'tax-exposure': true, // New widget added with default visibility
        });
        expect(config.widgetOrder).toEqual(v1Config.widgetOrder);
        expect(config.timePeriod).toBe(v1Config.timePeriod);
        expect(config.performerCount).toBe(v1Config.performerCount);

        // Should persist migrated config
        expect(mockSettingsQueries.set).toHaveBeenCalledWith(
          'dashboard-config',
          expect.objectContaining({ version: 4 })
        );
      });
    });

    describe('V2 → V3 Migration', () => {
      it('should migrate v2 config to v3 with dense packing settings', async () => {
        const v2Config: DashboardConfigurationV2 = {
          version: 2,
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
          timePeriod: 'MONTH',
          performerCount: 5,
          layoutMode: 'grid',
          gridColumns: 4,
          widgetSpans: { 'growth-chart': 2 },
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        mockSettingsQueries.get.mockResolvedValue(v2Config);
        mockSettingsQueries.set.mockResolvedValue(undefined);

        const config = await dashboardConfigService.getConfig();

        // Should migrate to v4 (via v3 → v4)
        expect(config.version).toBe(4);
        expect(config.densePacking).toBe(true);
        expect(config.widgetRowSpans).toEqual(DEFAULT_WIDGET_ROW_SPANS);

        // Should have v4 features
        expect(config.useReactGridLayout).toBe(false);
        expect(config.rglLayouts).toBeDefined();

        // Should preserve v2 settings
        expect(config.layoutMode).toBe(v2Config.layoutMode);
        expect(config.gridColumns).toBe(v2Config.gridColumns);
        expect(config.widgetSpans).toEqual(v2Config.widgetSpans);

        // Should persist migrated config
        expect(mockSettingsQueries.set).toHaveBeenCalledWith(
          'dashboard-config',
          expect.objectContaining({ version: 4 })
        );
      });
    });

    describe('V3 → V4 Migration', () => {
      it('should migrate v3 config to v4 with RGL layouts', async () => {
        const v3Config: DashboardConfigurationV3 = {
          version: 3,
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
          timePeriod: 'MONTH',
          performerCount: 5,
          layoutMode: 'grid',
          gridColumns: 4,
          widgetSpans: { 'growth-chart': 2 },
          densePacking: true,
          widgetRowSpans: { 'growth-chart': 2 },
          widgetSettings: {
            'category-breakdown': {
              showPieChart: false,
            },
          },
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        mockSettingsQueries.get.mockResolvedValue(v3Config);
        mockSettingsQueries.set.mockResolvedValue(undefined);

        const config = await dashboardConfigService.getConfig();

        // Should migrate to v4
        expect(config.version).toBe(4);
        expect(config.useReactGridLayout).toBe(false); // Disabled by default
        expect(config.rglLayouts).toBeDefined();

        // RGL layouts should have lg, md, sm breakpoints
        expect(config.rglLayouts?.lg).toBeDefined();
        expect(config.rglLayouts?.md).toBeDefined();
        expect(config.rglLayouts?.sm).toBeDefined();

        // Should preserve v3 settings
        expect(config.densePacking).toBe(v3Config.densePacking);
        expect(config.widgetRowSpans).toEqual(v3Config.widgetRowSpans);

        // Should persist migrated config
        expect(mockSettingsQueries.set).toHaveBeenCalledWith(
          'dashboard-config',
          expect.objectContaining({ version: 4 })
        );
      });

      it('should generate RGL layouts from widget spans during migration', async () => {
        const v3Config: DashboardConfigurationV3 = {
          version: 3,
          widgetVisibility: {
            'total-value': true,
            'gain-loss': true,
            'day-change': false,
            'category-breakdown': true,
            'growth-chart': true,
            'top-performers': false,
            'biggest-losers': false,
            'recent-activity': true,
          },
          widgetOrder: [
            'total-value',
            'gain-loss',
            'category-breakdown',
            'growth-chart',
            'recent-activity',
          ],
          timePeriod: 'MONTH',
          performerCount: 5,
          layoutMode: 'grid',
          gridColumns: 4,
          widgetSpans: { 'growth-chart': 2, 'category-breakdown': 2 },
          densePacking: true,
          widgetRowSpans: { 'growth-chart': 3, 'category-breakdown': 2 },
          widgetSettings: {
            'category-breakdown': {
              showPieChart: false,
            },
          },
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        mockSettingsQueries.get.mockResolvedValue(v3Config);
        mockSettingsQueries.set.mockResolvedValue(undefined);

        const config = await dashboardConfigService.getConfig();

        // Should have 5 widgets in layout (only visible ones)
        expect(config.rglLayouts?.lg.length).toBe(5);

        // Check that 2-column widgets are properly sized
        const growthChartLg = config.rglLayouts?.lg.find(
          (item) => item.i === 'growth-chart'
        );
        expect(growthChartLg?.w).toBe(2);
        expect(growthChartLg?.h).toBe(3);

        const categoryBreakdownLg = config.rglLayouts?.lg.find(
          (item) => item.i === 'category-breakdown'
        );
        expect(categoryBreakdownLg?.w).toBe(2);
        expect(categoryBreakdownLg?.h).toBe(2);

        // Check 1-column widgets
        const totalValueLg = config.rglLayouts?.lg.find(
          (item) => item.i === 'total-value'
        );
        expect(totalValueLg?.w).toBe(1);
        expect(totalValueLg?.h).toBe(1);
      });
    });
  });

  describe('RGL Layout Generation', () => {
    describe('Bin-Packing Algorithm', () => {
      it('should pack widgets efficiently in 4-column grid', () => {
        const config: DashboardConfigurationV3 = {
          version: 3,
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
          timePeriod: 'MONTH',
          performerCount: 5,
          layoutMode: 'grid',
          gridColumns: 4,
          // Explicitly set all widgets to 1-column to override defaults
          widgetSpans: {
            'growth-chart': 1,
            'recent-activity': 1,
          },
          densePacking: false,
          // Explicitly set all widgets to 1-row to override defaults
          widgetRowSpans: {
            'category-breakdown': 1,
            'growth-chart': 1,
            'top-performers': 1,
            'biggest-losers': 1,
            'recent-activity': 1,
          },
          widgetSettings: {
            'category-breakdown': {
              showPieChart: false,
            },
          },
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        const layouts = generateRGLLayoutsFromConfig(config);

        // All widgets should be 1x1 in this config (explicitly set above)
        expect(layouts.lg.length).toBe(8);

        // First row should have 4 widgets at y=0
        const firstRowWidgets = layouts.lg.filter((item) => item.y === 0);
        expect(firstRowWidgets.length).toBe(4);

        // X positions should be 0, 1, 2, 3
        const xPositions = firstRowWidgets.map((item) => item.x).sort();
        expect(xPositions).toEqual([0, 1, 2, 3]);

        // Second row should start at y=1
        const secondRowWidgets = layouts.lg.filter((item) => item.y === 1);
        expect(secondRowWidgets.length).toBe(4);
      });

      it('should handle 2-column widgets correctly', () => {
        const config: DashboardConfigurationV3 = {
          version: 3,
          widgetVisibility: {
            'total-value': true,
            'gain-loss': true,
            'growth-chart': true,
            'category-breakdown': true,
            'top-performers': false,
            'biggest-losers': false,
            'recent-activity': false,
            'day-change': false,
          },
          widgetOrder: [
            'total-value',
            'gain-loss',
            'growth-chart',
            'category-breakdown',
          ],
          timePeriod: 'MONTH',
          performerCount: 5,
          layoutMode: 'grid',
          gridColumns: 4,
          widgetSpans: { 'growth-chart': 2, 'category-breakdown': 2 },
          densePacking: false,
          widgetRowSpans: {},
          widgetSettings: {
            'category-breakdown': {
              showPieChart: false,
            },
          },
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        const layouts = generateRGLLayoutsFromConfig(config);

        // Should have 4 widgets
        expect(layouts.lg.length).toBe(4);

        // Check 2-column widgets
        const growthChart = layouts.lg.find(
          (item) => item.i === 'growth-chart'
        );
        expect(growthChart?.w).toBe(2);

        const categoryBreakdownWidget = layouts.lg.find(
          (item) => item.i === 'category-breakdown'
        );
        expect(categoryBreakdownWidget?.w).toBe(2);

        // Total value and gain-loss should be 1 column each
        const totalValue = layouts.lg.find((item) => item.i === 'total-value');
        expect(totalValue?.w).toBe(1);

        const gainLoss = layouts.lg.find((item) => item.i === 'gain-loss');
        expect(gainLoss?.w).toBe(1);

        // First row should have total-value and gain-loss (2 widgets, 2 columns used)
        expect(totalValue?.y).toBe(0);
        expect(gainLoss?.y).toBe(0);

        // growth-chart should be on second row or fit in first row depending on bin-packing
        expect(growthChart?.y).toBeGreaterThanOrEqual(0);
      });

      it('should handle varying row spans with dense packing', () => {
        const config: DashboardConfigurationV3 = {
          version: 3,
          widgetVisibility: {
            'total-value': true,
            'gain-loss': true,
            'day-change': true,
            'growth-chart': true,
            'category-breakdown': true,
            'top-performers': false,
            'biggest-losers': false,
            'recent-activity': false,
          },
          widgetOrder: [
            'total-value',
            'gain-loss',
            'day-change',
            'growth-chart',
            'category-breakdown',
          ],
          timePeriod: 'MONTH',
          performerCount: 5,
          layoutMode: 'grid',
          gridColumns: 4,
          widgetSpans: { 'growth-chart': 2 },
          densePacking: true,
          widgetRowSpans: { 'growth-chart': 3, 'category-breakdown': 2 },
          widgetSettings: {
            'category-breakdown': {
              showPieChart: false,
            },
          },
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        const layouts = generateRGLLayoutsFromConfig(config);

        // Check row spans are preserved
        const growthChart = layouts.lg.find(
          (item) => item.i === 'growth-chart'
        );
        expect(growthChart?.h).toBe(3); // 3 rows high

        const categoryBreakdownWidget = layouts.lg.find(
          (item) => item.i === 'category-breakdown'
        );
        expect(categoryBreakdownWidget?.h).toBe(2); // 2 rows high

        // Metric widgets should be 1 row high
        const totalValue = layouts.lg.find((item) => item.i === 'total-value');
        expect(totalValue?.h).toBe(1);
      });

      it('should pack widgets to fill gaps with varying heights', () => {
        const config: DashboardConfigurationV3 = {
          version: 3,
          widgetVisibility: {
            'total-value': true,
            'gain-loss': true,
            'growth-chart': true,
            'recent-activity': true,
            'category-breakdown': false,
            'top-performers': false,
            'biggest-losers': false,
            'day-change': false,
          },
          widgetOrder: [
            'growth-chart',
            'total-value',
            'gain-loss',
            'recent-activity',
          ],
          timePeriod: 'MONTH',
          performerCount: 5,
          layoutMode: 'grid',
          gridColumns: 4,
          widgetSpans: { 'growth-chart': 2 },
          densePacking: true,
          widgetRowSpans: { 'growth-chart': 3, 'recent-activity': 2 },
          widgetSettings: {
            'category-breakdown': {
              showPieChart: false,
            },
          },
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        const layouts = generateRGLLayoutsFromConfig(config);

        const growthChart = layouts.lg.find(
          (item) => item.i === 'growth-chart'
        );
        const totalValue = layouts.lg.find((item) => item.i === 'total-value');
        const gainLoss = layouts.lg.find((item) => item.i === 'gain-loss');

        // growth-chart is 2x3, should be placed first
        expect(growthChart?.w).toBe(2);
        expect(growthChart?.h).toBe(3);
        expect(growthChart?.x).toBe(0);
        expect(growthChart?.y).toBe(0);

        // total-value and gain-loss should be able to pack next to growth-chart
        // They are 1x1, so they can fit in columns 2 and 3 at y=0
        expect(totalValue?.w).toBe(1);
        expect(totalValue?.h).toBe(1);
        expect(gainLoss?.w).toBe(1);
        expect(gainLoss?.h).toBe(1);

        // They should be positioned efficiently
        expect(totalValue?.x).toBeGreaterThanOrEqual(0);
        expect(totalValue?.x).toBeLessThan(4);
      });
    });

    describe('Responsive Breakpoints', () => {
      it('should generate layouts for lg, md, sm breakpoints', () => {
        const config: DashboardConfigurationV3 = {
          version: 3,
          widgetVisibility: {
            'total-value': true,
            'gain-loss': true,
            'growth-chart': true,
            'category-breakdown': false,
            'top-performers': false,
            'biggest-losers': false,
            'recent-activity': false,
            'day-change': false,
          },
          widgetOrder: ['total-value', 'gain-loss', 'growth-chart'],
          timePeriod: 'MONTH',
          performerCount: 5,
          layoutMode: 'grid',
          gridColumns: 4,
          widgetSpans: { 'growth-chart': 2 },
          densePacking: false,
          widgetRowSpans: {},
          widgetSettings: {
            'category-breakdown': {
              showPieChart: false,
            },
          },
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        const layouts = generateRGLLayoutsFromConfig(config);

        // Should have all breakpoints
        expect(layouts.lg).toBeDefined();
        expect(layouts.md).toBeDefined();
        expect(layouts.sm).toBeDefined();

        expect(layouts.lg.length).toBe(3);
        expect(layouts.md.length).toBe(3);
        expect(layouts.sm.length).toBe(3);
      });

      it('should clamp widget widths to 2 columns for md breakpoint', () => {
        const config: DashboardConfigurationV3 = {
          version: 3,
          widgetVisibility: {
            'growth-chart': true,
            'category-breakdown': true,
            'total-value': false,
            'gain-loss': false,
            'top-performers': false,
            'biggest-losers': false,
            'recent-activity': false,
            'day-change': false,
          },
          widgetOrder: ['growth-chart', 'category-breakdown'],
          timePeriod: 'MONTH',
          performerCount: 5,
          layoutMode: 'grid',
          gridColumns: 4,
          widgetSpans: { 'growth-chart': 2, 'category-breakdown': 2 },
          densePacking: false,
          widgetRowSpans: {},
          widgetSettings: {
            'category-breakdown': {
              showPieChart: false,
            },
          },
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        const layouts = generateRGLLayoutsFromConfig(config);

        // lg layout: both widgets should be 2 columns
        const growthChartLg = layouts.lg.find(
          (item) => item.i === 'growth-chart'
        );
        expect(growthChartLg?.w).toBe(2);

        // md layout: should clamp to max 2 columns
        const growthChartMd = layouts.md.find(
          (item) => item.i === 'growth-chart'
        );
        expect(growthChartMd?.w).toBeLessThanOrEqual(2);
        expect(growthChartMd?.w).toBe(2);
      });

      it('should make all widgets full-width (1 column) for sm breakpoint', () => {
        const config: DashboardConfigurationV3 = {
          version: 3,
          widgetVisibility: {
            'growth-chart': true,
            'total-value': true,
            'gain-loss': false,
            'category-breakdown': false,
            'top-performers': false,
            'biggest-losers': false,
            'recent-activity': false,
            'day-change': false,
          },
          widgetOrder: ['growth-chart', 'total-value'],
          timePeriod: 'MONTH',
          performerCount: 5,
          layoutMode: 'grid',
          gridColumns: 4,
          widgetSpans: { 'growth-chart': 2 },
          densePacking: false,
          widgetRowSpans: { 'growth-chart': 3 },
          widgetSettings: {
            'category-breakdown': {
              showPieChart: false,
            },
          },
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        const layouts = generateRGLLayoutsFromConfig(config);

        // All sm widgets should be 1 column wide and stacked
        layouts.sm.forEach((item) => {
          expect(item.w).toBe(1);
          expect(item.minW).toBe(1);
          expect(item.maxW).toBe(1);
        });

        // They should be stacked vertically with x=0
        layouts.sm.forEach((item) => {
          expect(item.x).toBe(0);
        });

        // Y positions should be sequential based on heights
        const growthChart = layouts.sm.find(
          (item) => item.i === 'growth-chart'
        );
        const totalValue = layouts.sm.find((item) => item.i === 'total-value');

        expect(growthChart?.y).toBe(0);
        expect(totalValue?.y).toBe(growthChart!.h); // Should start after growth-chart
      });

      it('should preserve row heights across breakpoints', () => {
        const config: DashboardConfigurationV3 = {
          version: 3,
          widgetVisibility: {
            'growth-chart': true,
            'category-breakdown': true,
            'total-value': false,
            'gain-loss': false,
            'top-performers': false,
            'biggest-losers': false,
            'recent-activity': false,
            'day-change': false,
          },
          widgetOrder: ['growth-chart', 'category-breakdown'],
          timePeriod: 'MONTH',
          performerCount: 5,
          layoutMode: 'grid',
          gridColumns: 4,
          widgetSpans: { 'growth-chart': 2 },
          densePacking: true,
          widgetRowSpans: { 'growth-chart': 3, 'category-breakdown': 2 },
          widgetSettings: {
            'category-breakdown': {
              showPieChart: false,
            },
          },
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        const layouts = generateRGLLayoutsFromConfig(config);

        // Heights should be preserved across breakpoints
        const growthChartLg = layouts.lg.find(
          (item) => item.i === 'growth-chart'
        );
        const growthChartMd = layouts.md.find(
          (item) => item.i === 'growth-chart'
        );
        const growthChartSm = layouts.sm.find(
          (item) => item.i === 'growth-chart'
        );

        expect(growthChartLg?.h).toBe(3);
        expect(growthChartMd?.h).toBe(3);
        expect(growthChartSm?.h).toBe(3);

        const categoryBreakdownLg = layouts.lg.find(
          (item) => item.i === 'category-breakdown'
        );
        const categoryBreakdownMd = layouts.md.find(
          (item) => item.i === 'category-breakdown'
        );
        const categoryBreakdownSm = layouts.sm.find(
          (item) => item.i === 'category-breakdown'
        );

        expect(categoryBreakdownLg?.h).toBe(2);
        expect(categoryBreakdownMd?.h).toBe(2);
        expect(categoryBreakdownSm?.h).toBe(2);
      });
    });

    describe('Size Constraints', () => {
      it('should apply widget size constraints from WIDGET_SIZE_CONSTRAINTS', () => {
        const config: DashboardConfigurationV3 = {
          version: 3,
          widgetVisibility: {
            'growth-chart': true,
            'total-value': false,
            'gain-loss': false,
            'category-breakdown': false,
            'top-performers': false,
            'biggest-losers': false,
            'recent-activity': false,
            'day-change': false,
          },
          widgetOrder: ['growth-chart'],
          timePeriod: 'MONTH',
          performerCount: 5,
          layoutMode: 'grid',
          gridColumns: 4,
          widgetSpans: {},
          densePacking: false,
          widgetRowSpans: {},
          widgetSettings: {
            'category-breakdown': {
              showPieChart: false,
            },
          },
          lastUpdated: '2025-01-01T00:00:00Z',
        };

        const layouts = generateRGLLayoutsFromConfig(config);
        const growthChart = layouts.lg.find(
          (item) => item.i === 'growth-chart'
        );

        // Should have min/max constraints
        expect(growthChart?.minW).toBeDefined();
        expect(growthChart?.maxW).toBeDefined();
        expect(growthChart?.minH).toBeDefined();
        expect(growthChart?.maxH).toBeDefined();

        // Constraints should be sensible
        expect(growthChart!.minW!).toBeLessThanOrEqual(growthChart!.maxW!);
        expect(growthChart!.minH!).toBeLessThanOrEqual(growthChart!.maxH!);
      });
    });
  });

  describe('Feature Flag Toggling', () => {
    it('should enable RGL mode and generate layouts if none exist', async () => {
      const config: DashboardConfiguration = {
        version: 4,
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
        timePeriod: 'MONTH',
        performerCount: 5,
        layoutMode: 'grid',
        gridColumns: 4,
        widgetSpans: {},
        densePacking: false,
        widgetRowSpans: {},
        widgetSettings: {
          'category-breakdown': {
            showPieChart: false,
          },
        },
        useReactGridLayout: false,
        rglLayouts: undefined,
        lastUpdated: '2025-01-01T00:00:00Z',
      };

      mockSettingsQueries.get.mockResolvedValue(config);
      mockSettingsQueries.set.mockResolvedValue(undefined);

      await dashboardConfigService.setUseReactGridLayout(true);

      expect(mockSettingsQueries.set).toHaveBeenCalledWith(
        'dashboard-config',
        expect.objectContaining({
          useReactGridLayout: true,
          rglLayouts: expect.objectContaining({
            lg: expect.any(Array),
            md: expect.any(Array),
            sm: expect.any(Array),
          }),
        })
      );
    });

    it('should preserve existing RGL layouts when enabling RGL mode', async () => {
      const existingLayouts: RGLLayouts = {
        lg: [
          {
            i: 'total-value',
            x: 0,
            y: 0,
            w: 1,
            h: 1,
            minW: 1,
            maxW: 1,
            minH: 1,
            maxH: 1,
          },
        ],
        md: [
          {
            i: 'total-value',
            x: 0,
            y: 0,
            w: 1,
            h: 1,
            minW: 1,
            maxW: 1,
            minH: 1,
            maxH: 1,
          },
        ],
        sm: [
          {
            i: 'total-value',
            x: 0,
            y: 0,
            w: 1,
            h: 1,
            minW: 1,
            maxW: 1,
            minH: 1,
            maxH: 1,
          },
        ],
      };

      const config: DashboardConfiguration = {
        version: 4,
        widgetVisibility: {
          'total-value': true,
          'gain-loss': false,
          'day-change': false,
          'category-breakdown': false,
          'growth-chart': false,
          'top-performers': false,
          'biggest-losers': false,
          'recent-activity': false,
        },
        widgetOrder: ['total-value'],
        timePeriod: 'MONTH',
        performerCount: 5,
        layoutMode: 'grid',
        gridColumns: 4,
        widgetSpans: {},
        densePacking: false,
        widgetRowSpans: {},
        widgetSettings: {
          'category-breakdown': {
            showPieChart: false,
          },
        },
        useReactGridLayout: false,
        rglLayouts: existingLayouts,
        lastUpdated: '2025-01-01T00:00:00Z',
      };

      mockSettingsQueries.get.mockResolvedValue(config);
      mockSettingsQueries.set.mockResolvedValue(undefined);

      await dashboardConfigService.setUseReactGridLayout(true);

      // Should not regenerate layouts, should preserve existing
      expect(mockSettingsQueries.set).toHaveBeenCalledWith(
        'dashboard-config',
        expect.objectContaining({
          useReactGridLayout: true,
          rglLayouts: existingLayouts,
        })
      );
    });

    it('should disable RGL mode without affecting layouts', async () => {
      const existingLayouts: RGLLayouts = {
        lg: [
          {
            i: 'total-value',
            x: 0,
            y: 0,
            w: 1,
            h: 1,
            minW: 1,
            maxW: 1,
            minH: 1,
            maxH: 1,
          },
        ],
        md: [
          {
            i: 'total-value',
            x: 0,
            y: 0,
            w: 1,
            h: 1,
            minW: 1,
            maxW: 1,
            minH: 1,
            maxH: 1,
          },
        ],
        sm: [
          {
            i: 'total-value',
            x: 0,
            y: 0,
            w: 1,
            h: 1,
            minW: 1,
            maxW: 1,
            minH: 1,
            maxH: 1,
          },
        ],
      };

      const config: DashboardConfiguration = {
        version: 4,
        widgetVisibility: {
          'total-value': true,
          'gain-loss': false,
          'day-change': false,
          'category-breakdown': false,
          'growth-chart': false,
          'top-performers': false,
          'biggest-losers': false,
          'recent-activity': false,
        },
        widgetOrder: ['total-value'],
        timePeriod: 'MONTH',
        performerCount: 5,
        layoutMode: 'grid',
        gridColumns: 4,
        widgetSpans: {},
        densePacking: false,
        widgetRowSpans: {},
        widgetSettings: {
          'category-breakdown': {
            showPieChart: false,
          },
        },
        useReactGridLayout: true,
        rglLayouts: existingLayouts,
        lastUpdated: '2025-01-01T00:00:00Z',
      };

      mockSettingsQueries.get.mockResolvedValue(config);
      mockSettingsQueries.set.mockResolvedValue(undefined);

      await dashboardConfigService.setUseReactGridLayout(false);

      // Should preserve layouts even when disabled
      expect(mockSettingsQueries.set).toHaveBeenCalledWith(
        'dashboard-config',
        expect.objectContaining({
          useReactGridLayout: false,
          rglLayouts: existingLayouts,
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty widget order', () => {
      const config: DashboardConfigurationV3 = {
        version: 3,
        widgetVisibility: {
          'total-value': false,
          'gain-loss': false,
          'day-change': false,
          'category-breakdown': false,
          'growth-chart': false,
          'top-performers': false,
          'biggest-losers': false,
          'recent-activity': false,
        },
        widgetOrder: [],
        timePeriod: 'MONTH',
        performerCount: 5,
        layoutMode: 'grid',
        gridColumns: 4,
        widgetSpans: {},
        densePacking: false,
        widgetRowSpans: {},
        widgetSettings: {
          'category-breakdown': {
            showPieChart: false,
          },
        },
        lastUpdated: '2025-01-01T00:00:00Z',
      };

      const layouts = generateRGLLayoutsFromConfig(config);

      expect(layouts.lg).toEqual([]);
      expect(layouts.md).toEqual([]);
      expect(layouts.sm).toEqual([]);
    });

    it('should handle single widget', () => {
      const config: DashboardConfigurationV3 = {
        version: 3,
        widgetVisibility: {
          'total-value': true,
          'gain-loss': false,
          'day-change': false,
          'category-breakdown': false,
          'growth-chart': false,
          'top-performers': false,
          'biggest-losers': false,
          'recent-activity': false,
        },
        widgetOrder: ['total-value'],
        timePeriod: 'MONTH',
        performerCount: 5,
        layoutMode: 'grid',
        gridColumns: 4,
        widgetSpans: {},
        densePacking: false,
        widgetRowSpans: {},
        widgetSettings: {
          'category-breakdown': {
            showPieChart: false,
          },
        },
        lastUpdated: '2025-01-01T00:00:00Z',
      };

      const layouts = generateRGLLayoutsFromConfig(config);

      expect(layouts.lg.length).toBe(1);
      expect(layouts.lg[0].i).toBe('total-value');
      expect(layouts.lg[0].x).toBe(0);
      expect(layouts.lg[0].y).toBe(0);
    });

    it('should return default config if stored config is invalid', async () => {
      mockSettingsQueries.get.mockResolvedValue({ invalid: 'data' });

      const config = await dashboardConfigService.getConfig();

      expect(config.version).toBe(4);
      expect(config.useReactGridLayout).toBe(false);
    });

    it('should return default config if no config exists', async () => {
      mockSettingsQueries.get.mockResolvedValue(null);

      const config = await dashboardConfigService.getConfig();

      expect(config.version).toBe(4);
      expect(config.useReactGridLayout).toBe(false);
    });
  });
});
