'use client';

/**
 * Dashboard Container
 *
 * Main container for the configurable dashboard with drag-drop reordering.
 */

import { useEffect, useMemo, useCallback, memo, useState } from 'react';
import {
  DndContext,
    DndContext,
  closestCorners,
  DragEndEvent,,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { Decimal } from 'decimal.js';
import { PieChart } from 'lucide-react';

import {
  useDashboardStore,
  usePortfolioStore,
  usePriceStore,
} from '@/lib/stores';
import { useLivePriceMetrics, LiveHolding } from '@/hooks';
import { WidgetId, WIDGET_DEFINITIONS, CategoryAllocation, LayoutMode, GridColumns, WidgetRowSpan, DEFAULT_WIDGET_ROW_SPANS } from '@/types/dashboard';
import { Holding, Asset } from '@/types';
import { cn } from '@/lib/utils';
import { WidgetWrapper } from './widget-wrapper';
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

interface DashboardContainerProps {
  disableDragDrop?: boolean;
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
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
 * Accepts either regular Holdings or LiveHoldings with live price data.
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

  // Calculate totals by category
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

    // Use liveValue if available (LiveHolding), otherwise currentValue
    const holdingValue =
      'liveValue' in holding ? holding.liveValue : holding.currentValue;
    current.value = current.value.plus(holdingValue);
    current.count += 1;
    categoryMap.set(category, current);
    totalValue = totalValue.plus(holdingValue);
  }

  // Convert to CategoryAllocation array with percentages
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
      color: '', // Will use default colors in widget
    });
  }

  return allocations;
}

/**
 * Format category labels for display.
 */
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

const MOBILE_BREAKPOINT = 768; // md breakpoint in Tailwind
const TABLET_BREAKPOINT = 1024; // lg breakpoint in Tailwind

/**
 * Grid column classes for each column count.
 * Responsive: 1 column on mobile, configured on larger screens.
 */
const GRID_CLASSES: Record<GridColumns, string> = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

const DashboardContainerComponent = ({
  disableDragDrop = false,
}: DashboardContainerProps) => {
  const {
    config,
    loading: configLoading,
    loadConfig,
    setWidgetOrder,
  } = useDashboardStore();
  const {
    metrics,
    holdings,
    assets,
    loading: portfolioLoading,
  } = usePortfolioStore();
  const { loading: priceLoading } = usePriceStore();
  const setSymbolAssetMappings = usePriceStore(
    (state) => state.setSymbolAssetMappings
  );

  // Get live price metrics - recalculates when prices update
  const liveMetrics = useLivePriceMetrics(holdings || [], assets || []);

  // Detect viewport size for responsive behavior
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    // Check initial viewport
    const checkViewport = () => {
      const width = window.innerWidth;
      setIsMobile(width < MOBILE_BREAKPOINT);
      setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);
    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Set up symbol-to-assetId mappings for price snapshot persistence
  // This enables the Growth Chart to access historical price data
  useEffect(() => {
    if (assets && assets.length > 0) {
      const mappings: Record<string, string> = {};
      assets.forEach((asset) => {
        mappings[asset.symbol] = asset.id;
      });
      setSymbolAssetMappings(mappings);
    }
  }, [assets, setSymbolAssetMappings]);

  // Disable drag-drop on mobile or when explicitly disabled
  const isDragDropDisabled = disableDragDrop || isMobile;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !config) return;

      const oldIndex = config.widgetOrder.indexOf(active.id as WidgetId);
      const newIndex = config.widgetOrder.indexOf(over.id as WidgetId);
      setWidgetOrder(arrayMove(config.widgetOrder, oldIndex, newIndex));
    },
    [config, setWidgetOrder]
  );

  // Use live holdings for category allocations when live prices are available
  const categoryAllocations = useMemo(
    () =>
      buildCategoryAllocations(
        liveMetrics.hasLivePrices ? liveMetrics.liveHoldings : holdings || [],
        assets || []
      ),
    [holdings, assets, liveMetrics.hasLivePrices, liveMetrics.liveHoldings]
  );

  // Extract metrics with defaults - prefer live metrics when available
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

  // Compute effective layout mode (force stacking on mobile)
  const effectiveLayoutMode: LayoutMode = isMobile
    ? 'stacking'
    : (config?.layoutMode ?? 'grid');

  // Compute effective grid columns (clamp to 2 on tablet)
  const effectiveGridColumns: GridColumns = useMemo(() => {
    const configColumns = config?.gridColumns ?? 4;
    if (isTablet && configColumns > 2) {
      return 2;
    }
    return configColumns;
  }, [config?.gridColumns, isTablet]);

  // Compute the grid class based on layout mode
  const gridClass = useMemo(() => {
    if (effectiveLayoutMode === 'stacking') {
      return 'grid-cols-1';
    }
    return GRID_CLASSES[effectiveGridColumns];
  }, [effectiveLayoutMode, effectiveGridColumns]);

  // Dense packing is disabled on mobile (FR-006)
  const effectiveDensePacking = !isMobile && config?.densePacking === true;

  // Compute effective row span for a widget
  const getEffectiveRowSpan = useCallback((widgetId: WidgetId): WidgetRowSpan => {
    // Dense packing row spans only apply when dense packing is enabled and in grid mode
    if (!effectiveDensePacking || effectiveLayoutMode !== 'grid') {
      return 1;
    }
    return config?.widgetRowSpans?.[widgetId] ?? DEFAULT_WIDGET_ROW_SPANS[widgetId] ?? 1;
  }, [config?.widgetRowSpans, effectiveDensePacking, effectiveLayoutMode]);

  // renderWidget must be defined before early returns (React hooks rules)
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
          // Exhaustive check - all widget types should be handled above
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

  // Early returns for loading/empty states (after all hooks)
  if (configLoading || portfolioLoading || !config) {
    return <DashboardSkeleton />;
  }

  if (!holdings || holdings.length === 0) {
    return <EmptyDashboard />;
  }

  const visibleWidgets = config.widgetOrder.filter(
    (id) => config.widgetVisibility[id]
  );

  return (
    <div className="space-y-4">
      <StaleDataBanner lastUpdated={null} thresholdMinutes={15} />

      {/* Loading indicator for price updates */}
      {priceLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span>Updating prices...</span>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets}
          strategy={rectSortingStrategy}
          disabled={isDragDropDisabled}
        >
          <div className={cn(
            'grid gap-4 transition-all duration-300',
            gridClass,
            effectiveDensePacking && effectiveLayoutMode === 'grid' && 'grid-flow-row-dense'
          )}>
            {visibleWidgets.map((widgetId) => (
              <WidgetWrapper
                key={widgetId}
                id={widgetId}
                disabled={isDragDropDisabled}
                span={config?.widgetSpans?.[widgetId] ?? 1}
                rowSpan={getEffectiveRowSpan(widgetId)}
                layoutMode={effectiveLayoutMode}
              >
                {renderWidget(widgetId)}
              </WidgetWrapper>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export const DashboardContainer = memo(DashboardContainerComponent);
DashboardContainer.displayName = 'DashboardContainer';
