'use client';

/**
 * MarketStatusBadge Component
 *
 * Feature: 005-live-market-data
 *
 * Displays the current market state as a badge:
 * - PRE: Pre-market trading
 * - REGULAR: Regular trading hours
 * - POST: After-hours trading
 * - CLOSED: Market closed
 */

import { cn } from '@/lib/utils';
import { MarketState } from '@/types/market';

interface MarketStatusBadgeProps {
  state: MarketState;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const stateConfig: Record<
  MarketState,
  { label: string; shortLabel: string; color: string; bgColor: string }
> = {
  PRE: {
    label: 'Pre-Market',
    shortLabel: 'PRE',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  REGULAR: {
    label: 'Open',
    shortLabel: 'OPEN',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  POST: {
    label: 'After Hours',
    shortLabel: 'AH',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  CLOSED: {
    label: 'Closed',
    shortLabel: 'CLOSED',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-2.5 py-1',
};

export function MarketStatusBadge({
  state,
  size = 'sm',
  showLabel = true,
  className,
}: MarketStatusBadgeProps) {
  const config = stateConfig[state] || stateConfig.CLOSED;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        sizeClasses[size],
        config.bgColor,
        config.color,
        className
      )}
    >
      {showLabel ? config.label : config.shortLabel}
    </span>
  );
}

/**
 * MarketStatusDot Component
 *
 * A minimal dot indicator for market status.
 */
interface MarketStatusDotProps {
  state: MarketState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const dotSizeClasses = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

const dotColors: Record<MarketState, string> = {
  PRE: 'bg-amber-500',
  REGULAR: 'bg-green-500',
  POST: 'bg-blue-500',
  CLOSED: 'bg-gray-400',
};

export function MarketStatusDot({
  state,
  size = 'md',
  className,
}: MarketStatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full',
        dotSizeClasses[size],
        dotColors[state] || dotColors.CLOSED,
        className
      )}
      title={stateConfig[state]?.label || 'Unknown'}
    />
  );
}

export default MarketStatusBadge;
