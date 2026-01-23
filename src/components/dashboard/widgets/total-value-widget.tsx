'use client';

/**
 * Total Value Widget
 *
 * Displays the current total market value of the portfolio.
 * This is a core widget that cannot be hidden.
 *
 * @module components/dashboard/widgets/total-value-widget
 */

import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { Decimal } from 'decimal.js';
import { formatCurrency } from '@/lib/utils';

interface TotalValueWidgetProps {
  /** Total portfolio value */
  value: Decimal;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Currency code for formatting */
  currency?: string;
}

function WidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Value</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-4 w-24 bg-muted animate-pulse rounded mt-2" />
      </CardContent>
    </Card>
  );
}

export const TotalValueWidget = memo(function TotalValueWidget({
  value,
  isLoading = false,
  currency = 'USD',
}: TotalValueWidgetProps) {
  if (isLoading) {
    return <WidgetSkeleton />;
  }

  const numericValue = value.toNumber();

  return (
    <Card data-testid="total-value-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(numericValue, currency)}</div>
        <p className="text-xs text-muted-foreground">Current market value</p>
      </CardContent>
    </Card>
  );
});

TotalValueWidget.displayName = 'TotalValueWidget';
