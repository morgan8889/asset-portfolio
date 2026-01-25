'use client';

/**
 * Shared Widget Components
 *
 * Reusable components for dashboard widgets to reduce duplication.
 *
 * @module components/dashboard/widgets/shared
 */

import { memo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';

// =============================================================================
// Widget Skeleton
// =============================================================================

interface WidgetSkeletonProps {
  /** Widget title */
  title: string;
  /** Icon component */
  icon: LucideIcon;
}

export const WidgetSkeleton = memo(function WidgetSkeleton({
  title,
  icon: Icon,
}: WidgetSkeletonProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded mt-2" />
      </CardContent>
    </Card>
  );
});

WidgetSkeleton.displayName = 'WidgetSkeleton';

// =============================================================================
// Metric Value Display
// =============================================================================

export type TrendDirection = 'positive' | 'negative' | 'neutral';

/**
 * Get trend direction from a numeric value
 */
export function getTrendDirection(value: number): TrendDirection {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

/**
 * Get CSS class for trend color
 */
export function getTrendColorClass(direction: TrendDirection): string {
  switch (direction) {
    case 'positive':
      return 'text-green-600';
    case 'negative':
      return 'text-red-600';
    default:
      return 'text-muted-foreground';
  }
}

interface MetricValueProps {
  /** Numeric value to display */
  value: number;
  /** Whether to show sign prefix (+/-) */
  showSign?: boolean;
  /** Currency code for formatting */
  currency?: string;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  ariaLabel?: string;
}

/**
 * Display a currency value with appropriate trend coloring
 */
export const MetricValue = memo(function MetricValue({
  value,
  showSign = true,
  currency = 'USD',
  className,
  ariaLabel,
}: MetricValueProps) {
  const direction = getTrendDirection(value);
  const colorClass = getTrendColorClass(direction);
  const sign = showSign && value >= 0 ? '+' : '';
  const trendText = direction === 'positive' ? 'gain' : direction === 'negative' ? 'loss' : 'no change';
  const defaultAriaLabel = `${formatCurrency(Math.abs(value), currency)} ${trendText}`;

  return (
    <div
      className={cn('text-2xl font-bold', colorClass, className)}
      aria-label={ariaLabel || defaultAriaLabel}
      role="status"
    >
      {sign}
      {formatCurrency(value, currency)}
    </div>
  );
});

MetricValue.displayName = 'MetricValue';

// =============================================================================
// Widget Card Wrapper
// =============================================================================

interface WidgetCardProps {
  /** Widget title */
  title: string;
  /** Icon component */
  icon: LucideIcon;
  /** Icon color class (overrides default) */
  iconColorClass?: string;
  /** Test ID for e2e testing */
  testId?: string;
  /** Accessible description for screen readers */
  ariaDescription?: string;
  /** Children to render in card content */
  children: ReactNode;
}

/**
 * Standard widget card layout with consistent header styling
 */
export const WidgetCard = memo(function WidgetCard({
  title,
  icon: Icon,
  iconColorClass,
  testId,
  ariaDescription,
  children,
}: WidgetCardProps) {
  return (
    <Card
      data-testid={testId}
      role="region"
      aria-label={ariaDescription ? `${title}: ${ariaDescription}` : title}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon
          className={cn('h-4 w-4', iconColorClass || 'text-muted-foreground')}
          aria-hidden="true"
        />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
});

WidgetCard.displayName = 'WidgetCard';
