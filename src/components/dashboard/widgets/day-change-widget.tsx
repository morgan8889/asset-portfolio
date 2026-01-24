'use client';

/**
 * Day Change Widget
 *
 * Displays today's portfolio value change.
 */

import { memo } from 'react';
import { Activity } from 'lucide-react';
import { Decimal } from 'decimal.js';
import { formatPercentage } from '@/lib/utils';
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

  return (
    <WidgetCard title="Day Change" icon={Activity} testId="day-change-widget">
      <MetricValue value={change.toNumber()} currency={currency} />
      <p className="text-xs text-muted-foreground">
        {formatPercentage(changePercent, 2, true)} from yesterday
      </p>
    </WidgetCard>
  );
});

DayChangeWidget.displayName = 'DayChangeWidget';
