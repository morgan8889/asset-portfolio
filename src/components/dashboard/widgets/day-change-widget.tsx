'use client';

/**
 * Day Change Widget
 *
 * Displays today's portfolio value change.
 * Shows positive values in green and negative in red.
 *
 * @module components/dashboard/widgets/day-change-widget
 */

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { Decimal } from 'decimal.js';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';

interface DayChangeWidgetProps {
  /** Absolute day change amount */
  change: Decimal;
  /** Percentage day change */
  changePercent: number;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Currency code for formatting */
  currency?: string;
}

function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Day Change</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded mt-2" />
      </CardContent>
    </Card>
  );
}

export const DayChangeWidget = memo(function DayChangeWidget({
  change,
  changePercent,
  isLoading = false,
  currency = 'USD',
}: DayChangeWidgetProps) {
  if (isLoading) {
    return <WidgetSkeleton />;
  }

  const numericChange = change.toNumber();
  const isPositive = numericChange >= 0;

  return (
    <Card data-testid="day-change-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Day Change</CardTitle>
        <Activity className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'text-2xl font-bold',
            isPositive ? 'text-green-600' : 'text-red-600'
          )}
        >
          {isPositive ? '+' : ''}
          {formatCurrency(numericChange, currency)}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatPercentage(changePercent, 2, true)} from yesterday
        </p>
      </CardContent>
    </Card>
  );
});

DayChangeWidget.displayName = 'DayChangeWidget';
