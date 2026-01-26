'use client';

/**
 * StalenessIndicator Component
 *
 * Feature: 005-live-market-data
 *
 * Visual indicator for price data staleness:
 * - Fresh: Green - data is current
 * - Aging: Yellow/Amber - data is getting old
 * - Stale: Red - data needs refresh
 */

import { cn } from '@/lib/utils';
import { StalenessLevel } from '@/types/market';

interface StalenessIndicatorProps {
  level: StalenessLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const levelConfig: Record<
  StalenessLevel,
  { label: string; color: string; bgColor: string; dotColor: string }
> = {
  fresh: {
    label: 'Fresh',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    dotColor: 'bg-green-500',
  },
  aging: {
    label: 'Aging',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    dotColor: 'bg-amber-500',
  },
  stale: {
    label: 'Stale',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    dotColor: 'bg-red-500',
  },
};

const sizeClasses = {
  sm: {
    badge: 'text-xs px-1.5 py-0.5',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    badge: 'text-xs px-2 py-1',
    dot: 'w-2 h-2',
  },
  lg: {
    badge: 'text-sm px-2.5 py-1',
    dot: 'w-2.5 h-2.5',
  },
};

/**
 * StalenessIndicator as a badge with optional label.
 */
export function StalenessIndicator({
  level,
  size = 'md',
  showLabel = false,
  className,
}: StalenessIndicatorProps) {
  const config = levelConfig[level] || levelConfig.fresh;
  const classes = sizeClasses[size];

  if (showLabel) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-medium',
          classes.badge,
          config.bgColor,
          config.color,
          className
        )}
      >
        <span className={cn('rounded-full', classes.dot, config.dotColor)} />
        {config.label}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        classes.dot,
        config.dotColor,
        className
      )}
      title={`Data is ${config.label.toLowerCase()}`}
    />
  );
}

/**
 * StalenessDot - A minimal dot indicator only.
 */
interface StalenessDotProps {
  level: StalenessLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StalenessDot({
  level,
  size = 'md',
  className,
}: StalenessDotProps) {
  const config = levelConfig[level] || levelConfig.fresh;
  const dotSize = sizeClasses[size].dot;

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        dotSize,
        config.dotColor,
        className
      )}
      title={`Data is ${config.label.toLowerCase()}`}
    />
  );
}

/**
 * StalenessText - Text indicator with color.
 */
interface StalenessTextProps {
  level: StalenessLevel;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const textSizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function StalenessText({
  level,
  size = 'sm',
  className,
}: StalenessTextProps) {
  const config = levelConfig[level] || levelConfig.fresh;

  return (
    <span className={cn(textSizeClasses[size], config.color, className)}>
      {config.label}
    </span>
  );
}

export default StalenessIndicator;
