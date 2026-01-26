'use client';

/**
 * Gain/Loss Widget
 *
 * Displays total portfolio gain or loss with percentage.
 */

import { memo } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Decimal } from 'decimal.js';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { TimePeriod, TIME_PERIOD_CONFIGS } from '@/types/dashboard';
import {
  WidgetSkeleton,
  WidgetCard,
  MetricValue,
  getTrendDirection,
} from './shared';

interface GainLossWidgetProps {
  gain: Decimal;
  gainPercent: number;
  period?: TimePeriod;
  isLoading?: boolean;
  currency?: string;
}

export const GainLossWidget = memo(function GainLossWidget({
  gain,
  gainPercent,
  period = 'ALL',
  isLoading = false,
  currency = 'USD',
}: GainLossWidgetProps) {
  if (isLoading) {
    return <WidgetSkeleton title="Total Gain/Loss" icon={TrendingUp} />;
  }

  const numericGain = gain.toNumber();
  const isPositive = numericGain >= 0;
  const periodLabel = TIME_PERIOD_CONFIGS[period].label;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const iconColor = isPositive ? 'text-green-600' : 'text-red-600';

  const trendDescription = isPositive ? 'gain' : 'loss';
  const periodDescription =
    period !== 'ALL' ? periodLabel.toLowerCase() : 'from cost basis';

  return (
    <WidgetCard
      title="Total Gain/Loss"
      icon={Icon}
      iconColorClass={iconColor}
      testId="gain-loss-widget"
      ariaDescription={`Portfolio ${trendDescription} of ${formatPercentage(gainPercent, 2, true)} ${periodDescription}`}
    >
      <MetricValue
        value={numericGain}
        currency={currency}
        ariaLabel={`Total ${trendDescription}: ${formatCurrency(Math.abs(numericGain), currency)}`}
      />
      <p className="text-xs text-muted-foreground">
        {formatPercentage(gainPercent, 2, true)} {periodDescription}
      </p>
    </WidgetCard>
  );
});

GainLossWidget.displayName = 'GainLossWidget';
