'use client';

/**
 * Dashboard Container
 *
 * Main container for the configurable dashboard with drag-drop reordering.
 */

import { useEffect, useMemo, useCallback, memo } from 'react';
import {
  DndContext,
  closestCenter,
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

import { useDashboardStore, usePortfolioStore } from '@/lib/stores';
import { WidgetId, WIDGET_DEFINITIONS, CategoryAllocation } from '@/types/dashboard';
import { Holding, Asset } from '@/types';
import { WidgetWrapper } from './widget-wrapper';
import { StaleDataBanner } from './stale-data-banner';
import {
  TotalValueWidget,
  GainLossWidget,
  DayChangeWidget,
  CategoryBreakdownWidget,
} from './widgets';

interface DashboardContainerProps {
  disableDragDrop?: boolean;
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
      ))}
    </div>
  );
}

function EmptyDashboard() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <PieChart className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
      <h3 className="text-lg font-semibold mb-2">No Holdings Yet</h3>
      <p className="text-muted-foreground max-w-md">
        Add transactions to your portfolio to see your dashboard metrics.
      </p>
    </div>
  );
}

/**
 * Build category allocations from holdings and assets.
 */
function buildCategoryAllocations(
  holdings: Holding[],
  assets: Asset[]
): CategoryAllocation[] {
  if (holdings.length === 0) return [];

  const assetMap = new Map(assets.map((a) => [a.id, a]));
  const categoryMap = new Map<string, { value: Decimal; count: number; label: string }>();

  // Calculate totals by category
  let totalValue = new Decimal(0);
  for (const holding of holdings) {
    const asset = assetMap.get(holding.assetId);
    if (!asset) continue;

    const category = asset.type;
    const current = categoryMap.get(category) || {
      value: new Decimal(0),
      count: 0,
      label: formatCategoryLabel(category)
    };

    current.value = current.value.plus(holding.currentValue);
    current.count += 1;
    categoryMap.set(category, current);
    totalValue = totalValue.plus(holding.currentValue);
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
  return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

const DashboardContainerComponent = ({ disableDragDrop = false }: DashboardContainerProps) => {
  const { config, loading: configLoading, loadConfig, setWidgetOrder } = useDashboardStore();
  const { metrics, holdings, assets, loading: portfolioLoading } = usePortfolioStore();

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !config) return;

    const oldIndex = config.widgetOrder.indexOf(active.id as WidgetId);
    const newIndex = config.widgetOrder.indexOf(over.id as WidgetId);
    setWidgetOrder(arrayMove(config.widgetOrder, oldIndex, newIndex));
  }, [config, setWidgetOrder]);

  const categoryAllocations = useMemo(
    () => buildCategoryAllocations(holdings || [], assets || []),
    [holdings, assets]
  );

  // Extract metrics with defaults - useMemo to avoid object recreation
  const derivedMetrics = useMemo(() => ({
    totalValue: metrics?.totalValue || new Decimal(0),
    totalGain: metrics?.totalGain || new Decimal(0),
    totalGainPercent: metrics?.totalGainPercent || 0,
    dayChange: metrics?.dayChange || new Decimal(0),
    dayChangePercent: metrics?.dayChangePercent || 0,
  }), [metrics]);

  // renderWidget must be defined before early returns (React hooks rules)
  const renderWidget = useCallback((widgetId: WidgetId) => {
    switch (widgetId) {
      case 'total-value':
        return <TotalValueWidget value={derivedMetrics.totalValue} />;
      case 'gain-loss':
        return (
          <GainLossWidget
            gain={derivedMetrics.totalGain}
            gainPercent={derivedMetrics.totalGainPercent}
            period={config?.timePeriod || '1M'}
          />
        );
      case 'day-change':
        return <DayChangeWidget change={derivedMetrics.dayChange} changePercent={derivedMetrics.dayChangePercent} />;
      case 'category-breakdown':
        return <CategoryBreakdownWidget allocations={categoryAllocations} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {WIDGET_DEFINITIONS[widgetId].displayName} (Coming Soon)
          </div>
        );
    }
  }, [derivedMetrics, categoryAllocations, config?.timePeriod]);

  // Early returns for loading/empty states (after all hooks)
  if (configLoading || portfolioLoading || !config) {
    return <DashboardSkeleton />;
  }

  if (!holdings || holdings.length === 0) {
    return <EmptyDashboard />;
  }

  const visibleWidgets = config.widgetOrder.filter((id) => config.widgetVisibility[id]);

  return (
    <div className="space-y-4">
      <StaleDataBanner lastUpdated={null} thresholdMinutes={15} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets}
          strategy={rectSortingStrategy}
          disabled={disableDragDrop}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {visibleWidgets.map((widgetId) => (
              <WidgetWrapper key={widgetId} id={widgetId} disabled={disableDragDrop}>
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
