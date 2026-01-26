'use client';

/**
 * Period Selector Component
 *
 * Button group for selecting time periods (1W, 1M, 3M, 1Y, ALL)
 * for performance analysis. Supports keyboard navigation with
 * arrow keys for accessibility.
 *
 * @module components/performance/period-selector
 */

import { useCallback, useRef, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TimePeriod, TIME_PERIOD_CONFIGS } from '@/types/dashboard';

interface PeriodSelectorProps {
  selectedPeriod: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  disabled?: boolean;
  className?: string;
}

const DISPLAY_PERIODS: TimePeriod[] = ['WEEK', 'MONTH', 'QUARTER', 'YEAR', 'ALL'];

export function PeriodSelector({
  selectedPeriod,
  onPeriodChange,
  disabled = false,
  className,
}: PeriodSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      const currentIndex = DISPLAY_PERIODS.indexOf(selectedPeriod);
      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : DISPLAY_PERIODS.length - 1;
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          newIndex = currentIndex < DISPLAY_PERIODS.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = DISPLAY_PERIODS.length - 1;
          break;
        default:
          return;
      }

      if (newIndex !== currentIndex) {
        onPeriodChange(DISPLAY_PERIODS[newIndex]);

        // Focus the new button
        const buttons = containerRef.current?.querySelectorAll('button');
        if (buttons && buttons[newIndex]) {
          (buttons[newIndex] as HTMLButtonElement).focus();
        }
      }
    },
    [selectedPeriod, onPeriodChange, disabled]
  );

  return (
    <div
      ref={containerRef}
      className={cn('flex gap-1', className)}
      role="tablist"
      aria-label="Time period selector"
      onKeyDown={handleKeyDown}
    >
      {DISPLAY_PERIODS.map((period, index) => {
        const config = TIME_PERIOD_CONFIGS[period];
        const isSelected = selectedPeriod === period;

        return (
          <Button
            key={period}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onPeriodChange(period)}
            disabled={disabled}
            className={cn(
              'min-w-[48px] px-3',
              isSelected && 'pointer-events-none'
            )}
            role="tab"
            aria-selected={isSelected}
            aria-controls={`performance-panel-${period.toLowerCase()}`}
            tabIndex={isSelected ? 0 : -1}
            aria-label={`View ${config.label} performance`}
          >
            {config.shortLabel}
          </Button>
        );
      })}
    </div>
  );
}

export default PeriodSelector;
