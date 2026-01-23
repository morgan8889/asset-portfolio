'use client';

/**
 * Category Breakdown Widget
 *
 * Displays portfolio allocation by asset category.
 * Shows a compact view with progress bars for each category.
 *
 * @module components/dashboard/widgets/category-breakdown-widget
 */

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PieChart } from 'lucide-react';
import { CategoryAllocation } from '@/types/dashboard';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';

interface CategoryBreakdownWidgetProps {
  /** Array of category allocations */
  allocations: CategoryAllocation[];
  /** Whether data is loading */
  isLoading?: boolean;
  /** Currency code for formatting */
  currency?: string;
}

function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Category Breakdown</CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="flex justify-between">
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              <div className="h-4 w-12 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-2 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Default colors for asset types
const DEFAULT_COLORS: Record<string, string> = {
  stock: '#3b82f6', // blue-500
  etf: '#22c55e', // green-500
  crypto: '#f97316', // orange-500
  bond: '#8b5cf6', // purple-500
  real_estate: '#06b6d4', // cyan-500
  commodity: '#eab308', // yellow-500
  cash: '#64748b', // slate-500
  other: '#6b7280', // gray-500
};

export const CategoryBreakdownWidget = memo(function CategoryBreakdownWidget({
  allocations,
  isLoading = false,
  currency = 'USD',
}: CategoryBreakdownWidgetProps) {
  if (isLoading) {
    return <WidgetSkeleton />;
  }

  // Sort by percentage descending
  const sortedAllocations = [...allocations].sort(
    (a, b) => b.percentage - a.percentage
  );

  // Handle empty state
  if (sortedAllocations.length === 0) {
    return (
      <Card data-testid="category-breakdown-widget">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Category Breakdown</CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            <PieChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No holdings to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="category-breakdown-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Category Breakdown</CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedAllocations.map((allocation) => {
          const color = allocation.color || DEFAULT_COLORS[allocation.category] || DEFAULT_COLORS.other;

          return (
            <div key={allocation.category} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color }}
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
                style={
                  {
                    '--progress-foreground': color,
                  } as React.CSSProperties
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(allocation.value.toNumber(), currency)}</span>
                <span>
                  {allocation.holdingCount} {allocation.holdingCount === 1 ? 'holding' : 'holdings'}
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});

CategoryBreakdownWidget.displayName = 'CategoryBreakdownWidget';
