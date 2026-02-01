'use client';

/**
 * Tax Exposure Widget
 *
 * Displays tax exposure metrics including short-term/long-term gains
 * and estimated tax liability.
 */

import { memo } from 'react';
import { Receipt, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { Decimal } from 'decimal.js';
import { formatCurrency } from '@/lib/utils';
import { TaxExposureMetrics } from '@/types/tax';
import {
  WidgetSkeleton,
  WidgetCard,
  MetricValue,
} from './shared';

interface TaxExposureWidgetProps {
  metrics: TaxExposureMetrics;
  isLoading?: boolean;
  currency?: string;
}

export const TaxExposureWidget = memo(function TaxExposureWidget({
  metrics,
  isLoading = false,
  currency = 'USD',
}: TaxExposureWidgetProps) {
  if (isLoading) {
    return <WidgetSkeleton title="Tax Exposure" icon={Receipt} />;
  }

  const taxLiability = metrics.estimatedTaxLiability.toNumber();
  const hasAgingLots = metrics.agingLotsCount > 0;
  const netSTGain = metrics.netShortTerm.toNumber();
  const netLTGain = metrics.netLongTerm.toNumber();

  return (
    <WidgetCard
      title="Tax Exposure"
      icon={Receipt}
      iconColorClass="text-orange-600"
      testId="tax-exposure-widget"
      ariaDescription={`Estimated tax liability of ${formatCurrency(taxLiability, currency)} with ${metrics.agingLotsCount} aging lots`}
    >
      <MetricValue
        value={taxLiability}
        currency={currency}
        ariaLabel={`Estimated tax liability: ${formatCurrency(taxLiability, currency)}`}
      />

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Short-Term:</span>
          <span className={netSTGain >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(Math.abs(netSTGain), currency)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span>Long-Term:</span>
          <span className={netLTGain >= 0 ? 'text-green-600' : 'text-red-600'}>
            {formatCurrency(Math.abs(netLTGain), currency)}
          </span>
        </div>
        {hasAgingLots && (
          <div className="flex items-center gap-1 pt-1 text-amber-600" role="alert">
            <AlertCircle className="h-3 w-3" />
            <span>{metrics.agingLotsCount} lot(s) aging</span>
          </div>
        )}
      </div>
    </WidgetCard>
  );
});

TaxExposureWidget.displayName = 'TaxExposureWidget';

/**
 * Empty state for when portfolio has no tax lots
 */
export const TaxExposureEmptyState = memo(function TaxExposureEmptyState() {
  return (
    <WidgetCard
      title="Tax Exposure"
      icon={Receipt}
      iconColorClass="text-gray-400"
      testId="tax-exposure-empty"
      ariaDescription="No tax exposure data available"
    >
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <p className="text-sm text-muted-foreground">
          No tax lots to analyze
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Add holdings with transactions to see tax exposure
        </p>
      </div>
    </WidgetCard>
  );
});

TaxExposureEmptyState.displayName = 'TaxExposureEmptyState';
