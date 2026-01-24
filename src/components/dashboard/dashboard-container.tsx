'use client';

/**
 * Dashboard Container
 *
 * Main container for the configurable dashboard with drag-drop reordering.
 */

import { useEffect, useMemo, useCallback } from 'react';
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
 * Build category allocations from holdings.
 * TODO: In production, look up asset types instead of using placeholder.
 */
function buildCategoryAllocations(holdings: { currentValue: Decimal }[]): CategoryAllocation[] {
  if (holdings.length === 0) return [];

  const totalValue = holdings.reduce((sum, h) => sum.plus(h.currentValue), new Decimal(0));
  const category = 'stock'; // Placeholder - would look up real asset types

  return [{
    category,
    label: 'Stock',
    value: totalValue,
    percentage: 100,
    holdingCount: holdings.length,
    color: '',
  }];
}

export function DashboardContainer({ disableDragDrop = false }: DashboardContainerProps) {
  const { config, loading: configLoading, loadConfig, setWidgetOrder } = useDashboardStore();
  const { metrics, holdings, loading: portfolioLoading } = usePortfolioStore();

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
    () => buildCategoryAllocations(holdings || []),
    [holdings]
  );

  // Early returns for loading/empty states
  if (configLoading || portfolioLoading || !config) {
    return <DashboardSkeleton />;
  }

  if (!holdings || holdings.length === 0) {
    return <EmptyDashboard />;
  }

  const visibleWidgets = config.widgetOrder.filter((id) => config.widgetVisibility[id]);

  // Extract metrics with defaults
  const totalValue = metrics?.totalValue || new Decimal(0);
  const totalGain = metrics?.totalGain || new Decimal(0);
  const totalGainPercent = metrics?.totalGainPercent || 0;
  const dayChange = metrics?.dayChange || new Decimal(0);
  const dayChangePercent = metrics?.dayChangePercent || 0;

  const renderWidget = (widgetId: WidgetId) => {
    switch (widgetId) {
      case 'total-value':
        return <TotalValueWidget value={totalValue} />;
      case 'gain-loss':
        return (
          <GainLossWidget
            gain={totalGain}
            gainPercent={totalGainPercent}
            period={config.timePeriod}
          />
        );
      case 'day-change':
        return <DayChangeWidget change={dayChange} changePercent={dayChangePercent} />;
      case 'category-breakdown':
        return <CategoryBreakdownWidget allocations={categoryAllocations} />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {WIDGET_DEFINITIONS[widgetId].displayName} (Coming Soon)
          </div>
        );
    }
  };

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
}

DashboardContainer.displayName = 'DashboardContainer';
