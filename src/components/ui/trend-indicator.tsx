'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrendIndicatorProps {
  /** The value to determine trend direction (positive = up, negative = down) */
  value: number;
  /** Size variant for the icon */
  size?: 'xs' | 'sm' | 'md';
  /** Whether to show the icon only (no wrapper styling) */
  iconOnly?: boolean;
  /** Additional className for the container */
  className?: string;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

/**
 * Shared component for displaying trend indicators (up/down arrows with color).
 * Reduces duplication across MetricsCards, portfolio-chart, and other components.
 */
export function TrendIndicator({
  value,
  size = 'sm',
  iconOnly = false,
  className,
}: TrendIndicatorProps) {
  const isPositive = value >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';

  if (iconOnly) {
    return <Icon className={cn(sizeClasses[size], colorClass, className)} />;
  }

  return (
    <span className={cn('inline-flex items-center', colorClass, className)}>
      <Icon className={sizeClasses[size]} />
    </span>
  );
}

/**
 * Returns just the color class for a given trend value.
 * Useful when you need to apply trend-based coloring to other elements.
 */
export function getTrendColorClass(value: number): string {
  return value >= 0 ? 'text-green-600' : 'text-red-600';
}
