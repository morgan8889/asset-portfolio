'use client';

/**
 * Biggest Losers Widget
 *
 * Displays worst performing holdings by percentage loss over the selected time period.
 */

import { memo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { HoldingPerformance, TimePeriod, TIME_PERIOD_CONFIGS } from '@/types/dashboard';
import { getBiggestLosers } from '@/lib/services/performance-calculator';
import { useDashboardStore, usePortfolioStore } from '@/lib/stores';

interface BiggestLosersWidgetProps {
  portfolioId?: string;
  count?: number;
  isLoading?: boolean;
}

function LosersSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Biggest Losers</CardTitle>
        <TrendingDown className="h-4 w-4 text-red-600" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 bg-muted animate-pulse rounded-full" />
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-4 w-12 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function LosersEmpty() {
  return (
    <Card data-testid="biggest-losers-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Biggest Losers</CardTitle>
        <TrendingDown className="h-4 w-4 text-red-600" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <TrendingDown className="h-8 w-8 text-muted-foreground opacity-50 mb-2" />
          <p className="text-sm text-muted-foreground">No losers in this period</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface LoserRowProps {
  loser: HoldingPerformance;
  rank: number;
  currency: string;
}

function LoserRow({ loser, rank, currency }: LoserRowProps) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
          {rank === 1 ? (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          ) : (
            <span className="text-xs text-muted-foreground font-medium">{rank}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{loser.symbol}</div>
          <div className="text-xs text-muted-foreground truncate">{loser.name}</div>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <div className="text-sm font-medium text-red-600">
          {formatPercentage(loser.percentGain, 2)}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatCurrency(loser.absoluteGain.toNumber(), currency)}
        </div>
      </div>
    </div>
  );
}

export const BiggestLosersWidget = memo(function BiggestLosersWidget({
  portfolioId,
  count,
  isLoading: externalLoading = false,
}: BiggestLosersWidgetProps) {
  const { config } = useDashboardStore();
  const { currentPortfolio } = usePortfolioStore();
  const effectivePortfolioId = portfolioId || currentPortfolio?.id;
  const effectiveCount = count || config?.performerCount || 5;
  const period: TimePeriod = config?.timePeriod || 'ALL';
  const currency = currentPortfolio?.currency || 'USD';

  const [losers, setLosers] = useState<HoldingPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectivePortfolioId) {
      setLosers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchLosers() {
      setLoading(true);
      try {
        const data = await getBiggestLosers(effectivePortfolioId!, period, effectiveCount);
        if (!cancelled) setLosers(data);
      } catch (error) {
        console.error('Failed to load biggest losers:', error);
        if (!cancelled) setLosers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLosers();

    return () => {
      cancelled = true;
    };
  }, [effectivePortfolioId, period, effectiveCount]);

  if (externalLoading || loading) {
    return <LosersSkeleton />;
  }

  if (!effectivePortfolioId || losers.length === 0) {
    return <LosersEmpty />;
  }

  const periodLabel = TIME_PERIOD_CONFIGS[period].label;

  return (
    <Card data-testid="biggest-losers-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Biggest Losers</CardTitle>
        <TrendingDown className="h-4 w-4 text-red-600" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {losers.map((loser, index) => (
            <LoserRow
              key={loser.holdingId}
              loser={loser}
              rank={index + 1}
              currency={currency}
            />
          ))}
        </div>
        <div className="mt-3 pt-2 border-t text-xs text-muted-foreground text-center">
          {periodLabel} performance
        </div>
      </CardContent>
    </Card>
  );
});

BiggestLosersWidget.displayName = 'BiggestLosersWidget';
