'use client';

/**
 * Time Period Selector
 *
 * Segmented button group for selecting dashboard time periods.
 * Updates all period-dependent widgets when changed.
 */

import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/lib/stores';
import { TimePeriod, TIME_PERIOD_CONFIGS } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface TimePeriodSelectorProps {
  /** Available periods to show (defaults to all) */
  periods?: TimePeriod[];
  /** Custom class name */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'default';
}

const DEFAULT_PERIODS: TimePeriod[] = ['TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR', 'ALL'];

export const TimePeriodSelector = memo(function TimePeriodSelector({
  periods = DEFAULT_PERIODS,
  className,
  size = 'sm',
}: TimePeriodSelectorProps) {
  const { config, setTimePeriod } = useDashboardStore();
  const currentPeriod = config?.timePeriod || 'ALL';

  const handlePeriodChange = useCallback(
    async (period: TimePeriod) => {
      await setTimePeriod(period);
    },
    [setTimePeriod]
  );

  return (
    <div
      className={cn('inline-flex rounded-md shadow-sm', className)}
      role="group"
      aria-label="Select time period"
    >
      {periods.map((period, index) => {
        const config = TIME_PERIOD_CONFIGS[period];
        const isActive = currentPeriod === period;
        const isFirst = index === 0;
        const isLast = index === periods.length - 1;

        return (
          <Button
            key={period}
            variant={isActive ? 'default' : 'outline'}
            size={size}
            onClick={() => handlePeriodChange(period)}
            className={cn(
              'relative',
              // Remove inner borders for segmented look
              !isFirst && '-ml-px',
              // Rounded corners only on ends
              isFirst && 'rounded-r-none',
              isLast && 'rounded-l-none',
              !isFirst && !isLast && 'rounded-none',
              // Bring active button to front
              isActive && 'z-10'
            )}
            aria-pressed={isActive}
            aria-label={config.label}
          >
            {config.shortLabel}
          </Button>
        );
      })}
    </div>
  );
});

TimePeriodSelector.displayName = 'TimePeriodSelector';

/**
 * Compact version for use in widget headers
 */
export const TimePeriodSelectorCompact = memo(function TimePeriodSelectorCompact({
  periods = ['WEEK', 'MONTH', 'QUARTER', 'YEAR', 'ALL'],
  className,
}: Omit<TimePeriodSelectorProps, 'size'>) {
  const { config, setTimePeriod } = useDashboardStore();
  const currentPeriod = config?.timePeriod || 'ALL';

  const handlePeriodChange = useCallback(
    async (period: TimePeriod) => {
      await setTimePeriod(period);
    },
    [setTimePeriod]
  );

  return (
    <div className={cn('flex gap-1', className)} role="group" aria-label="Select time period">
      {periods.map((period) => {
        const config = TIME_PERIOD_CONFIGS[period];
        const isActive = currentPeriod === period;

        return (
          <Button
            key={period}
            variant={isActive ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handlePeriodChange(period)}
            className="h-7 px-2 text-xs"
            aria-pressed={isActive}
            aria-label={config.label}
          >
            {config.shortLabel}
          </Button>
        );
      })}
    </div>
  );
});

TimePeriodSelectorCompact.displayName = 'TimePeriodSelectorCompact';
