'use client';

/**
 * Day Change Widget
 *
 * Displays today's portfolio value change.
 */

import { memo } from 'react';
import { Activity } from 'lucide-react';
import { Decimal } from 'decimal.js';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { WidgetSkeleton, WidgetCard, MetricValue } from './shared';

interface DayChangeWidgetProps {
  change: Decimal;
  changePercent: number;
  isLoading?: boolean;
  currency?: string;
}

export const DayChangeWidget = memo(function DayChangeWidget({
  change,
  changePercent,
  isLoading = false,
  currency = 'USD',
}: DayChangeWidgetProps) {
  if (isLoading) {
    return <WidgetSkeleton title="Day Change" icon={Activity} />;
  }

  const numericChange = change.toNumber();
  const trendDescription = numericChange >= 0 ? 'up' : 'down';

  return (
    <WidgetCard
      title="Day Change"
      icon={Activity}
      testId="day-change-widget"
      ariaDescription={`Portfolio is ${trendDescription} ${formatPercentage(Math.abs(changePercent), 2)} from yesterday`}
    >
      <MetricValue
        value={numericChange}
        currency={currency}
        ariaLabel={`Today's change: ${trendDescription} ${formatCurrency(Math.abs(numericChange), currency)}`}
      />
      <p className="text-xs text-muted-foreground">
        {formatPercentage(changePercent, 2, true)} from yesterday
      </p>
    </WidgetCard>
  );
});

DayChangeWidget.displayName = 'DayChangeWidget';
