'use client';

/**
 * Category Breakdown Widget
 *
 * Displays portfolio allocation by asset category with progress bars.
 * Optionally shows a pie chart visualization when:
 * - showPieChart setting is enabled
 * - NOT in compact view
 * - Widget width >= 150px
 *
 * View modes:
 * - Compact (1-col < 4 rows, or 2-col < 2 rows): Progress bars only
 * - Stacked (1-col, 4+ rows): Pie chart below progress bars, with legend
 * - Side-by-side (2+ cols, 2+ rows): Progress bars left, pie chart right, no legend
 */

import { memo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PieChart as PieChartIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from 'recharts';
import { CategoryAllocation } from '@/types/dashboard';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { useDashboardStore } from '@/lib/stores/dashboard';
import {
  useWidgetSize,
  CATEGORY_BREAKDOWN_THRESHOLDS,
} from '@/hooks/useWidgetSize';

interface CategoryBreakdownWidgetProps {
  allocations: CategoryAllocation[];
  isLoading?: boolean;
  currency?: string;
}

// Default colors for asset types
const CATEGORY_COLORS: Record<string, string> = {
  stock: '#3b82f6',
  etf: '#22c55e',
  crypto: '#f97316',
  bond: '#8b5cf6',
  real_estate: '#06b6d4',
  commodity: '#eab308',
  cash: '#64748b',
  other: '#6b7280',
};

function CategorySkeleton() {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-shrink-0 flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Category Breakdown
        </CardTitle>
        <PieChartIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-3 overflow-y-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CategoryEmpty() {
  return (
    <Card
      data-testid="category-breakdown-widget"
      className="flex h-full flex-col"
    >
      <CardHeader className="flex flex-shrink-0 flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Category Breakdown
        </CardTitle>
        <PieChartIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="py-4 text-center text-muted-foreground">
          <PieChartIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">No holdings to display</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface CategoryRowProps {
  allocation: CategoryAllocation;
  currency: string;
}

const CategoryRow = memo(function CategoryRow({
  allocation,
  currency,
}: CategoryRowProps) {
  const color =
    allocation.color ||
    CATEGORY_COLORS[allocation.category] ||
    CATEGORY_COLORS.other;
  const holdingLabel = allocation.holdingCount === 1 ? 'holding' : 'holdings';
  const ariaLabel = `${allocation.label}: ${formatPercentage(allocation.percentage)} allocation, ${formatCurrency(allocation.value.toNumber(), currency)}, ${allocation.holdingCount} ${holdingLabel}`;

  return (
    <div className="space-y-1" role="group" aria-label={ariaLabel}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: color }}
            role="img"
            aria-label={`${allocation.label} category indicator`}
          />
          <span className="font-medium capitalize">{allocation.label}</span>
        </div>
        <span className="text-muted-foreground">
          {formatPercentage(allocation.percentage)}
        </span>
      </div>
      <Progress
        value={allocation.percentage}
        className="h-2"
        style={{ '--progress-foreground': color } as React.CSSProperties}
        aria-label={`${allocation.label} allocation: ${formatPercentage(allocation.percentage)}`}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatCurrency(allocation.value.toNumber(), currency)}</span>
        <span>
          {allocation.holdingCount} {holdingLabel}
        </span>
      </div>
    </div>
  );
});

interface PieChartVisualizationProps {
  allocations: CategoryAllocation[];
  /** Whether to show legend (hide in side-by-side mode since categories shown in progress bars) */
  showLegend?: boolean;
  /** Use smaller radii for constrained layouts */
  compact?: boolean;
}

const PieChartVisualization = memo(function PieChartVisualization({
  allocations,
  showLegend = true,
  compact = false,
}: PieChartVisualizationProps) {
  const chartData = allocations.map((allocation) => ({
    name: allocation.label,
    value: allocation.percentage,
    color:
      allocation.color ||
      CATEGORY_COLORS[allocation.category] ||
      CATEGORY_COLORS.other,
  }));

  // Use smaller radii for side-by-side layout where space is constrained
  const innerRadius = compact ? 30 : 45;
  const outerRadius = compact ? 55 : 75;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart data-testid="pie-chart">
        <Pie
          data={chartData}
          cx="50%"
          cy={showLegend ? '42%' : '50%'}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Allocation']}
        />
        {showLegend && (
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingTop: '8px' }}
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
});

export const CategoryBreakdownWidget = memo(function CategoryBreakdownWidget({
  allocations,
  isLoading = false,
  currency = 'USD',
}: CategoryBreakdownWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width } = useWidgetSize(containerRef);

  // Get widget settings and config from dashboard store
  const config = useDashboardStore((state) => state.config);

  // Extract settings with defaults
  const showPieChartSetting =
    config?.widgetSettings?.['category-breakdown']?.showPieChart ?? false;

  // Use widgetSpans/widgetRowSpans as source of truth
  // These are synced from RGL on every resize via handleResizeStop -> syncLayoutToSpans
  const rowSpan = config?.widgetRowSpans?.['category-breakdown'] ?? 1;
  const columnSpan = config?.widgetSpans?.['category-breakdown'] ?? 1;

  // Compact view: not enough space for pie chart
  // - 1-column widgets need 4+ rows for stacked layout
  // - 2+ column widgets need 2+ rows for side-by-side layout
  const isCompactView = columnSpan === 1 ? rowSpan < 4 : rowSpan < 2;

  // Determine if pie chart should be shown
  // Requirements: setting enabled, NOT compact view, and enough width for chart
  const showPieChart =
    showPieChartSetting &&
    !isCompactView &&
    width >= CATEGORY_BREAKDOWN_THRESHOLDS.minWidthForChart;

  // Determine layout mode based on column span
  // 2x column span = side-by-side (45%/55% split)
  // 1x column span = stacked (chart below progress bars)
  const useSideBySideLayout = columnSpan >= 2;

  if (isLoading) return <CategorySkeleton />;
  if (allocations.length === 0) return <CategoryEmpty />;

  const sortedAllocations = [...allocations].sort(
    (a, b) => b.percentage - a.percentage
  );

  return (
    <Card
      data-testid="category-breakdown-widget"
      ref={containerRef}
      className="flex h-full flex-col"
    >
      <CardHeader className="flex flex-shrink-0 flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Category Breakdown
        </CardTitle>
        <PieChartIcon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden">
        {showPieChart ? (
          <div
            className={`flex h-full ${useSideBySideLayout ? 'flex-row items-center gap-4' : 'flex-col gap-4'}`}
          >
            {/* Progress Bars Section */}
            <div
              className={`space-y-3 overflow-y-auto ${useSideBySideLayout ? 'w-[55%]' : 'w-full flex-shrink-0'}`}
            >
              {sortedAllocations.map((allocation) => (
                <CategoryRow
                  key={allocation.category}
                  allocation={allocation}
                  currency={currency}
                />
              ))}
            </div>
            {/* Pie Chart Section */}
            <div
              className={`flex items-center justify-center ${useSideBySideLayout ? 'h-[120px] w-[45%]' : 'min-h-[200px] w-full flex-1'}`}
            >
              <PieChartVisualization
                allocations={sortedAllocations}
                showLegend={!useSideBySideLayout}
                compact={useSideBySideLayout}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAllocations.map((allocation) => (
              <CategoryRow
                key={allocation.category}
                allocation={allocation}
                currency={currency}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

CategoryBreakdownWidget.displayName = 'CategoryBreakdownWidget';
