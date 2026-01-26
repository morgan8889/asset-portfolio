'use client';

/**
 * Category Breakdown Widget
 *
 * Displays portfolio allocation by asset category with progress bars.
 */

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { PieChart } from 'lucide-react';
import { CategoryAllocation } from '@/types/dashboard';
import { formatCurrency, formatPercentage } from '@/lib/utils';

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Category Breakdown
        </CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
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
    <Card data-testid="category-breakdown-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Category Breakdown
        </CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="py-4 text-center text-muted-foreground">
          <PieChart className="mx-auto mb-2 h-8 w-8 opacity-50" />
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

function CategoryRow({ allocation, currency }: CategoryRowProps) {
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
}

export const CategoryBreakdownWidget = memo(function CategoryBreakdownWidget({
  allocations,
  isLoading = false,
  currency = 'USD',
}: CategoryBreakdownWidgetProps) {
  if (isLoading) return <CategorySkeleton />;
  if (allocations.length === 0) return <CategoryEmpty />;

  const sortedAllocations = [...allocations].sort(
    (a, b) => b.percentage - a.percentage
  );

  return (
    <Card data-testid="category-breakdown-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Category Breakdown
        </CardTitle>
        <PieChart className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedAllocations.map((allocation) => (
          <CategoryRow
            key={allocation.category}
            allocation={allocation}
            currency={currency}
          />
        ))}
      </CardContent>
    </Card>
  );
});

CategoryBreakdownWidget.displayName = 'CategoryBreakdownWidget';
