'use client';

/**
 * Gain/Loss Widget
 *
 * Displays total portfolio gain or loss with percentage.
 * Shows positive values in green and negative in red.
 *
 * @module components/dashboard/widgets/gain-loss-widget
 */

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Decimal } from 'decimal.js';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';
import { TimePeriod, TIME_PERIOD_CONFIGS } from '@/types/dashboard';

interface GainLossWidgetProps {
  /** Absolute gain/loss amount */
  gain: Decimal;
  /** Percentage gain/loss */
  gainPercent: number;
  /** Time period for the calculation */
  period?: TimePeriod;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Currency code for formatting */
  currency?: string;
}

function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-28 bg-muted animate-pulse rounded mt-2" />
      </CardContent>
    </Card>
  );
}

export const GainLossWidget = memo(function GainLossWidget({
  gain,
  gainPercent,
  period = 'ALL',
  isLoading = false,
  currency = 'USD',
}: GainLossWidgetProps) {
  if (isLoading) {
    return <WidgetSkeleton />;
  }

  const numericGain = gain.toNumber();
  const isPositive = numericGain >= 0;
  const periodLabel = TIME_PERIOD_CONFIGS[period].label;

  return (
    <Card data-testid="gain-loss-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'text-2xl font-bold',
            isPositive ? 'text-green-600' : 'text-red-600'
          )}
        >
          {isPositive ? '+' : ''}
          {formatCurrency(numericGain, currency)}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatPercentage(gainPercent, 2, true)} {period !== 'ALL' ? periodLabel.toLowerCase() : 'from cost basis'}
        </p>
      </CardContent>
    </Card>
  );
});

GainLossWidget.displayName = 'GainLossWidget';
