'use client';

/**
 * Total Value Widget
 *
 * Displays the current total market value of the portfolio.
 */

import { memo } from 'react';
import { DollarSign } from 'lucide-react';
import { Decimal } from 'decimal.js';
import { formatCurrency } from '@/lib/utils';
import { WidgetSkeleton, WidgetCard } from './shared';

interface TotalValueWidgetProps {
  value: Decimal;
  isLoading?: boolean;
  currency?: string;
}

export const TotalValueWidget = memo(function TotalValueWidget({
  value,
  isLoading = false,
  currency = 'USD',
}: TotalValueWidgetProps) {
  if (isLoading) {
    return <WidgetSkeleton title="Total Value" icon={DollarSign} />;
  }

  const formattedValue = formatCurrency(value.toNumber(), currency);

  return (
    <WidgetCard
      title="Total Portfolio Value"
      icon={DollarSign}
      testId="total-value-widget"
      ariaDescription={`Your portfolio is currently worth ${formattedValue}`}
    >
      <div
        className="text-2xl font-bold"
        aria-label={`Total value: ${formattedValue}`}
      >
        {formattedValue}
      </div>
      <p className="text-xs text-muted-foreground">Current market value</p>
    </WidgetCard>
  );
});

TotalValueWidget.displayName = 'TotalValueWidget';
