'use client';

/**
 * Dashboard Container (React-Grid-Layout)
 *
 * Dashboard implementation using react-grid-layout for drag-drop and resizing.
 */

import React, { useEffect, useMemo, useCallback, memo } from 'react';
import {
  Responsive as ResponsiveGridLayout,
  useContainerWidth,
} from 'react-grid-layout';
import type ReactGridLayout from 'react-grid-layout';
import { Decimal } from 'decimal.js';
import { PieChart } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

type RGLLayoutType = ReactGridLayout.Layout;
type RGLLayoutsType = ReactGridLayout.Layouts;

import {
  useDashboardStore,
  usePortfolioStore,
  usePriceStore,
} from '@/lib/stores';
import { useLivePriceMetrics, LiveHolding } from '@/hooks';
import { WidgetId, CategoryAllocation, RGLLayout } from '@/types/dashboard';
import { Holding, Asset } from '@/types';
import { cn } from '@/lib/utils';
import { WidgetWrapperRGL } from './widget-wrapper-rgl';
import { StaleDataBanner } from './stale-data-banner';
import {
  TotalValueWidget,
  GainLossWidget,
  DayChangeWidget,
  CategoryBreakdownWidget,
  GrowthChartWidget,
  TopPerformersWidget,
  BiggestLosersWidget,
  RecentActivityWidget,
} from './widgets';

interface DashboardContainerRGLProps {
  disableDragDrop?: boolean;
}

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <PieChart className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
      <h3 className="mb-2 text-lg font-semibold">No Holdings Yet</h3>
      <p className="max-w-md text-muted-foreground">
        Add transactions to your portfolio to see your dashboard metrics.
      </p>
    </div>
  );
}

/**
 * Build category allocations from holdings and assets.
 */
function buildCategoryAllocations(
  holdings: (Holding | LiveHolding)[],
  assets: Asset[]
): CategoryAllocation[] {
  if (holdings.length === 0) return [];

  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const categoryMap = new Map<
    string,
    { value: Decimal; count: number; label: string }
  >();

  let totalValue = new Decimal(0);
  for (const holding of holdings) {
    const asset = assetMap.get(holding.assetId);
    if (!asset) continue;

    const category = asset.type;
    const current = categoryMap.get(category) || {
      value: new Decimal(0),
      count: 0,
      label: formatCategoryLabel(category),
    };

    const holdingValue =
      'liveValue' in holding ? holding.liveValue : holding.currentValue;
    current.value = current.value.plus(holdingValue);
    current.count += 1;
    categoryMap.set(category, current);
    totalValue = totalValue.plus(holdingValue);
  }

  const allocations: CategoryAllocation[] = [];
  for (const [category, data] of categoryMap.entries()) {
    const percentage = totalValue.isZero()
      ? 0
      : data.value.dividedBy(totalValue).mul(100).toNumber();

    allocations.push({
      category,
      label: data.label,
      value: data.value,
      percentage,
      holdingCount: data.count,
      color: '',
    });
  }

  return allocations;
}

function formatCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    stock: 'Stocks',
    etf: 'ETFs',
    crypto: 'Crypto',
    bond: 'Bonds',
    real_estate: 'Real Estate',
    commodity: 'Commodities',
    cash: 'Cash',
    other: 'Other',
  };
  return (
    labels[category] || category.charAt(0).toUpperCase() + category.slice(1)
  );
}

const DashboardContainerRGLComponent = ({
  disableDragDrop = false,
}: DashboardContainerRGLProps) => {
  // Get container width for react-grid-layout v2.x
  const { containerRef, width: measuredWidth } = useContainerWidth();

  const { config, setRGLLayouts, setWidgetSpan, setWidgetRowSpan } =
    useDashboardStore();

  // Account for RGL horizontal margins to prevent overflow
  // RGL applies margins between and around grid items
  // For N columns with margin=16px: (N+1) * 16px total horizontal margins
  // lg breakpoint (4 cols): 5 * 16 = 80px, md (2 cols): 3 * 16 = 48px, sm (1 col): 2 * 16 = 32px
  const determineColumnCount = (viewportWidth: number) => {
    if (viewportWidth >= 1024) return config?.gridColumns || 4; // lg
    if (viewportWidth >= 768) return 2; // md
    return 1; // sm
  };

  const MARGIN_SIZE = 16;
  const cols = determineColumnCount(measuredWidth);
  const totalHorizontalMargins = (cols + 1) * MARGIN_SIZE;
  const width = Math.max(0, measuredWidth - totalHorizontalMargins);
  const { metrics, holdings, assets } = usePortfolioStore();
  const { loading: priceLoading } = usePriceStore();
  const setSymbolAssetMappings = usePriceStore(
    (state) => state.setSymbolAssetMappings
  );

  const liveMetrics = useLivePriceMetrics(holdings || [], assets || []);

  useEffect(() => {
    if (assets && assets.length > 0) {
      const mappings: Record<string, string> = {};
      assets.forEach((asset) => {
        mappings[asset.symbol] = asset.id;
      });
      setSymbolAssetMappings(mappings);
    }
  }, [assets, setSymbolAssetMappings]);

  const visibleWidgets = useMemo(
    () =>
      config
        ? config.widgetOrder.filter((id) => config.widgetVisibility[id])
        : [],
    [config]
  );

  // Generate or use existing RGL layouts
  const layouts = useMemo(() => {
    if (!config || !config.rglLayouts) {
      return { lg: [], md: [], sm: [] };
    }

    // Filter to visible widgets only
    return {
      lg: config.rglLayouts.lg.filter((l) => visibleWidgets.includes(l.i)),
      md: config.rglLayouts.md.filter((l) => visibleWidgets.includes(l.i)),
      sm: config.rglLayouts.sm.filter((l) => visibleWidgets.includes(l.i)),
    };
  }, [config, visibleWidgets]);

  const handleLayoutChange = useCallback(
    (currentLayout: RGLLayoutType[], allLayouts: RGLLayoutsType) => {
      if (!config) return;

      // Sort by position to get new order (top-to-bottom, left-to-right)
      const sorted = [...currentLayout].sort((a, b) =>
        a.y !== b.y ? a.y - b.y : a.x - b.x
      );
      const newOrder = sorted.map((item) => item.i as WidgetId);

      // Extract layouts for each breakpoint, defaulting to empty arrays
      const lg = allLayouts?.lg || [];
      const md = allLayouts?.md || [];
      const sm = allLayouts?.sm || [];

      // Persist changes (cast to RGLLayout[] as react-grid-layout uses string for 'i')
      setRGLLayouts(
        {
          lg: lg as RGLLayout[],
          md: md as RGLLayout[],
          sm: sm as RGLLayout[],
        },
        newOrder
      );
    },
    [config, setRGLLayouts]
  );

  /**
   * Sync RGL layout dimensions to widgetSpans and widgetRowSpans.
   * Called after resize completes to update span settings.
   */
  const syncLayoutToSpans = useCallback(
    async (widgetId: WidgetId, w: number, h: number) => {
      // Clamp to valid span values (WidgetSpan: 1|2, WidgetRowSpan: 1|2|3|4)
      const colSpan = Math.max(1, Math.min(2, w)) as 1 | 2;
      const rowSpan = Math.max(1, Math.min(4, h)) as 1 | 2 | 3 | 4;

      // Update store (persists to IndexedDB)
      await setWidgetSpan(widgetId, colSpan);
      await setWidgetRowSpan(widgetId, rowSpan);
    },
    [setWidgetSpan, setWidgetRowSpan]
  );

  /**
   * Handle resize stop - sync final dimensions to span settings.
   * onResizeStop provides: (layout, oldItem, newItem, placeholder, e, element)
   */
  const handleResizeStop = useCallback(
    (
      layout: RGLLayoutType[],
      oldItem: RGLLayoutType,
      newItem: RGLLayoutType
    ) => {
      if (!config) return;

      const widgetId = newItem.i as WidgetId;
      syncLayoutToSpans(widgetId, newItem.w, newItem.h);
    },
    [config, syncLayoutToSpans]
  );

  const categoryAllocations = useMemo(
    () =>
      buildCategoryAllocations(
        liveMetrics.hasLivePrices ? liveMetrics.liveHoldings : holdings || [],
        assets || []
      ),
    [holdings, assets, liveMetrics.hasLivePrices, liveMetrics.liveHoldings]
  );

  const derivedMetrics = useMemo(
    () => ({
      totalValue: liveMetrics.hasLivePrices
        ? liveMetrics.totalValue
        : metrics?.totalValue || new Decimal(0),
      totalGain: liveMetrics.hasLivePrices
        ? liveMetrics.totalGain
        : metrics?.totalGain || new Decimal(0),
      totalGainPercent: liveMetrics.hasLivePrices
        ? liveMetrics.totalGainPercent
        : metrics?.totalGainPercent || 0,
      dayChange: liveMetrics.dayChange,
      dayChangePercent: liveMetrics.dayChangePercent,
    }),
    [metrics, liveMetrics]
  );

  const renderWidget = useCallback(
    (widgetId: WidgetId) => {
      switch (widgetId) {
        case 'total-value':
          return <TotalValueWidget value={derivedMetrics.totalValue} />;
        case 'gain-loss':
          return (
            <GainLossWidget
              gain={derivedMetrics.totalGain}
              gainPercent={derivedMetrics.totalGainPercent}
              period={config?.timePeriod || 'ALL'}
            />
          );
        case 'day-change':
          return (
            <DayChangeWidget
              change={derivedMetrics.dayChange}
              changePercent={derivedMetrics.dayChangePercent}
            />
          );
        case 'category-breakdown':
          return <CategoryBreakdownWidget allocations={categoryAllocations} />;
        case 'growth-chart':
          return <GrowthChartWidget />;
        case 'top-performers':
          return (
            <TopPerformersWidget
              performers={
                liveMetrics.hasLivePrices
                  ? liveMetrics.topPerformers
                  : undefined
              }
            />
          );
        case 'biggest-losers':
          return (
            <BiggestLosersWidget
              losers={
                liveMetrics.hasLivePrices
                  ? liveMetrics.biggestLosers
                  : undefined
              }
            />
          );
        case 'recent-activity':
          return <RecentActivityWidget />;
        default: {
          const _exhaustiveCheck: never = widgetId;
          return (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Unknown widget
            </div>
          );
        }
      }
    },
    [derivedMetrics, categoryAllocations, config?.timePeriod, liveMetrics]
  );

  if (!config || !holdings || holdings.length === 0) {
    return <EmptyDashboard />;
  }

  return (
    <div ref={containerRef as React.LegacyRef<HTMLDivElement>} className="space-y-4">
      <StaleDataBanner lastUpdated={null} thresholdMinutes={15} />

      {priceLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Updating prices...</span>
        </div>
      )}

      {/* Only render grid when width is available (v2.x requirement) */}
      {width > 0 && (
        <ResponsiveGridLayout
          {...({
            layouts,
            breakpoints: { lg: 1024, md: 768, sm: 0 },
            cols: { lg: config.gridColumns, md: 2, sm: 1 },
            rowHeight: 120,
            width,
            isDraggable: !disableDragDrop,
            isResizable: !disableDragDrop,
            compactType: config.densePacking ? 'vertical' : null,
            onLayoutChange: handleLayoutChange,
            onResizeStop: handleResizeStop,
            margin: [16, 16],
            draggableHandle: '.drag-handle',
            className: cn('transition-all duration-300'),
          } as any)}
        >
          {visibleWidgets.map((widgetId) => (
            <div key={widgetId} className="h-full">
              <WidgetWrapperRGL id={widgetId} disabled={disableDragDrop}>
                {renderWidget(widgetId)}
              </WidgetWrapperRGL>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
};

export const DashboardContainerRGL = memo(DashboardContainerRGLComponent);
DashboardContainerRGL.displayName = 'DashboardContainerRGL';
