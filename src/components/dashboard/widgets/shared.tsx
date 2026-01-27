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
import { formatCurrency, cn } from '@/lib/utils';

// =============================================================================
// Trend Utilities
// =============================================================================

export type TrendDirection = 'positive' | 'negative' | 'neutral';

const TREND_COLORS: Record<TrendDirection, string> = {
  positive: 'text-green-600',
  negative: 'text-red-600',
  neutral: 'text-muted-foreground',
};

const TREND_LABELS: Record<TrendDirection, string> = {
  positive: 'gain',
  negative: 'loss',
  neutral: 'no change',
};

export function getTrendDirection(value: number): TrendDirection {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

export function getTrendColorClass(direction: TrendDirection): string {
  return TREND_COLORS[direction];
}

// =============================================================================
// Widget Card Wrapper
// =============================================================================

interface WidgetCardProps {
  title: string;
  icon: LucideIcon;
  iconColorClass?: string;
  testId?: string;
  ariaDescription?: string;
  children: ReactNode;
}

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
      className="h-full flex flex-col"
      data-testid={testId}
      role="region"
      aria-label={ariaDescription ? `${title}: ${ariaDescription}` : title}
    >
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon
          className={cn('h-4 w-4', iconColorClass || 'text-muted-foreground')}
          aria-hidden="true"
        />
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
});

WidgetCard.displayName = 'WidgetCard';

// =============================================================================
// Widget Skeleton (uses WidgetCard internally)
// =============================================================================

interface WidgetSkeletonProps {
  title: string;
  icon: LucideIcon;
}

export const WidgetSkeleton = memo(function WidgetSkeleton({
  title,
  icon,
}: WidgetSkeletonProps) {
  return (
    <WidgetCard title={title} icon={icon}>
      <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-24 animate-pulse rounded bg-muted" />
    </WidgetCard>
  );
});

WidgetSkeleton.displayName = 'WidgetSkeleton';

// =============================================================================
// Metric Value Display
// =============================================================================

interface MetricValueProps {
  value: number;
  showSign?: boolean;
  currency?: string;
  className?: string;
  ariaLabel?: string;
}

export const MetricValue = memo(function MetricValue({
  value,
  showSign = true,
  currency = 'USD',
  className,
  ariaLabel,
}: MetricValueProps) {
  const direction = getTrendDirection(value);
  const sign = showSign && value >= 0 ? '+' : '';

  const computedAriaLabel =
    ariaLabel ?? `${formatCurrency(Math.abs(value), currency)} ${TREND_LABELS[direction]}`;

  return (
    <div
      className={cn('text-2xl font-bold', TREND_COLORS[direction], className)}
      aria-label={computedAriaLabel}
      role="status"
    >
      {sign}
      {formatCurrency(value, currency)}
    </div>
  );
});

MetricValue.displayName = 'MetricValue';
