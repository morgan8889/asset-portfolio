'use client';

/**
 * Top Performers Widget
 *
 * Displays top performing holdings by percentage gain over the selected time period.
 */

import { memo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Medal } from 'lucide-react';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';
import { HoldingPerformance, TimePeriod, TIME_PERIOD_CONFIGS } from '@/types/dashboard';
import { getTopPerformers } from '@/lib/services/performance-calculator';
import { useDashboardStore, usePortfolioStore } from '@/lib/stores';

interface TopPerformersWidgetProps {
  portfolioId?: string;
  count?: number;
  isLoading?: boolean;
}

function PerformersSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
        <TrendingUp className="h-4 w-4 text-green-600" />
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

function PerformersEmpty() {
  return (
    <Card data-testid="top-performers-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
        <TrendingUp className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Medal className="h-8 w-8 text-muted-foreground opacity-50 mb-2" />
          <p className="text-sm text-muted-foreground">No gainers in this period</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface PerformerRowProps {
  performer: HoldingPerformance;
  rank: number;
  currency: string;
  onClick?: () => void;
}

function PerformerRow({ performer, rank, currency, onClick }: PerformerRowProps) {
  const medalColors: Record<number, string> = {
    1: 'text-yellow-500',
    2: 'text-gray-400',
    3: 'text-amber-600',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-between py-1 w-full text-left',
        'rounded px-1 -mx-1 transition-colors',
        'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1'
      )}
      aria-label={`View details for ${performer.symbol}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
          {rank <= 3 ? (
            <Medal className={`h-4 w-4 ${medalColors[rank]}`} />
          ) : (
            <span className="text-xs text-muted-foreground font-medium">{rank}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="font-medium text-sm truncate">{performer.symbol}</div>
          <div className="text-xs text-muted-foreground truncate">{performer.name}</div>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <div className="text-sm font-medium text-green-600">
          +{formatPercentage(performer.percentGain, 2)}
        </div>
        <div className="text-xs text-muted-foreground">
          +{formatCurrency(performer.absoluteGain.toNumber(), currency)}
        </div>
      </div>
    </button>
  );
}

export const TopPerformersWidget = memo(function TopPerformersWidget({
  portfolioId,
  count,
  isLoading: externalLoading = false,
}: TopPerformersWidgetProps) {
  const router = useRouter();
  const { config } = useDashboardStore();
  const { currentPortfolio } = usePortfolioStore();
  const effectivePortfolioId = portfolioId || currentPortfolio?.id;
  const effectiveCount = count || config?.performerCount || 5;
  const period: TimePeriod = config?.timePeriod || 'ALL';
  const currency = currentPortfolio?.currency || 'USD';

  const [performers, setPerformers] = useState<HoldingPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  const handlePerformerClick = (holdingId: string) => {
    // Navigate to holdings page with the holding ID as query param
    // A future holdings/[id] route can be created for detailed view
    router.push(`/holdings?highlight=${holdingId}`);
  };

  useEffect(() => {
    if (!effectivePortfolioId) {
      setPerformers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchPerformers() {
      setLoading(true);
      try {
        const data = await getTopPerformers(effectivePortfolioId!, period, effectiveCount);
        if (!cancelled) setPerformers(data);
      } catch (error) {
        console.error('Failed to load top performers:', error);
        if (!cancelled) setPerformers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPerformers();

    return () => {
      cancelled = true;
    };
  }, [effectivePortfolioId, period, effectiveCount]);

  if (externalLoading || loading) {
    return <PerformersSkeleton />;
  }

  if (!effectivePortfolioId || performers.length === 0) {
    return <PerformersEmpty />;
  }

  const periodLabel = TIME_PERIOD_CONFIGS[period].label;

  return (
    <Card data-testid="top-performers-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
        <TrendingUp className="h-4 w-4 text-green-600" />
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {performers.map((performer, index) => (
            <PerformerRow
              key={performer.holdingId}
              performer={performer}
              rank={index + 1}
              currency={currency}
              onClick={() => handlePerformerClick(performer.holdingId)}
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

TopPerformersWidget.displayName = 'TopPerformersWidget';
