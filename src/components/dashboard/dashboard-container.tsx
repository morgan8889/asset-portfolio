'use client';

/**
 * Dashboard Container
 *
 * Main container for the configurable dashboard.
 * Handles widget layout, drag-drop reordering, and data loading.
 *
 * @module components/dashboard/dashboard-container
 */

import { useEffect, useMemo } from 'react';
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
import { RefreshCw, PieChart } from 'lucide-react';

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
  /** Disable drag-drop (e.g., on mobile) */
  disableDragDrop?: boolean;
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-32 bg-muted animate-pulse rounded-lg"
        />
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
        Add transactions to your portfolio to see your dashboard metrics and performance data.
      </p>
    </div>
  );
}

export function DashboardContainer({ disableDragDrop = false }: DashboardContainerProps) {
  const { config, loading: configLoading, loadConfig, setWidgetOrder } = useDashboardStore();
  const { metrics, holdings, loading: portfolioLoading } = usePortfolioStore();

  // Load dashboard config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Drag-drop sensors with keyboard support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end - reorder widgets
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && config) {
      const oldIndex = config.widgetOrder.indexOf(active.id as WidgetId);
      const newIndex = config.widgetOrder.indexOf(over.id as WidgetId);
      const newOrder = arrayMove(config.widgetOrder, oldIndex, newIndex);
      setWidgetOrder(newOrder);
    }
  };

  // Compute category allocations from holdings
  const categoryAllocations = useMemo((): CategoryAllocation[] => {
    if (!holdings || holdings.length === 0) return [];

    const categoryMap = new Map<string, { value: Decimal; count: number }>();
    let totalValue = new Decimal(0);

    // Group holdings by asset type (simplified - in real app would use asset lookup)
    holdings.forEach((holding) => {
      // For now, using a placeholder category based on assetId prefix
      // In production, this would look up the asset type
      const category = 'stock'; // Placeholder
      const existing = categoryMap.get(category) || { value: new Decimal(0), count: 0 };
      categoryMap.set(category, {
        value: existing.value.plus(holding.currentValue),
        count: existing.count + 1,
      });
      totalValue = totalValue.plus(holding.currentValue);
    });

    // Convert to CategoryAllocation array
    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      label: category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' '),
      value: data.value,
      percentage: totalValue.isZero() ? 0 : data.value.dividedBy(totalValue).mul(100).toNumber(),
      holdingCount: data.count,
      color: '', // Will use default colors
    }));
  }, [holdings]);

  // Loading state
  if (configLoading || portfolioLoading) {
    return <DashboardSkeleton />;
  }

  // No config loaded yet
  if (!config) {
    return <DashboardSkeleton />;
  }

  // Empty state - no holdings
  if (!holdings || holdings.length === 0) {
    return <EmptyDashboard />;
  }

  // Get visible widgets in order
  const visibleWidgets = config.widgetOrder.filter(
    (id) => config.widgetVisibility[id]
  );

  // Render individual widget based on ID
  const renderWidget = (widgetId: WidgetId) => {
    const totalValue = metrics?.totalValue || new Decimal(0);
    const totalGain = metrics?.totalGain || new Decimal(0);
    const totalGainPercent = metrics?.totalGainPercent || 0;
    const dayChange = metrics?.dayChange || new Decimal(0);
    const dayChangePercent = metrics?.dayChangePercent || 0;

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
      // Placeholder for future widgets
      case 'growth-chart':
      case 'top-performers':
      case 'biggest-losers':
      case 'recent-activity':
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <span>{WIDGET_DEFINITIONS[widgetId].displayName} (Coming Soon)</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <StaleDataBanner
        lastUpdated={null} // TODO: Get from price store
        thresholdMinutes={15}
      />

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
              <WidgetWrapper
                key={widgetId}
                id={widgetId}
                disabled={disableDragDrop}
              >
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
