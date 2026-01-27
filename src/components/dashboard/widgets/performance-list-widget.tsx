'use client';

/**
 * Performance List Widget
 *
 * Unified component for displaying top performers or biggest losers.
 * Supports two variants:
 * - 'gainers': Shows top performing holdings (green, ascending sort)
 * - 'losers': Shows worst performing holdings (red, descending sort)
 */

import { memo, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  Medal,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';
import {
  HoldingPerformance,
  TimePeriod,
  TIME_PERIOD_CONFIGS,
} from '@/types/dashboard';
import {
  getTopPerformers,
  getBiggestLosers,
} from '@/lib/services/performance-calculator';
import { useDashboardStore, usePortfolioStore } from '@/lib/stores';

// =============================================================================
// Type Definitions
// =============================================================================

export type PerformanceVariant = 'gainers' | 'losers';

interface PerformanceListWidgetProps {
  /** Widget variant: 'gainers' for top performers, 'losers' for biggest losers */
  variant: PerformanceVariant;
  portfolioId?: string;
  count?: number;
  isLoading?: boolean;
  /** Pre-calculated performance data. When provided, skips async fetch. */
  data?: HoldingPerformance[];
}

interface VariantConfig {
  title: string;
  icon: LucideIcon;
  iconColor: string;
  emptyIcon: LucideIcon;
  emptyMessage: string;
  valueColor: string;
  testId: string;
  formatValue: (value: number) => string;
  fetchData: (
    portfolioId: string,
    period: TimePeriod,
    count: number
  ) => Promise<HoldingPerformance[]>;
  renderRankIcon: (rank: number) => ReactNode;
}

// =============================================================================
// Variant Configurations
// =============================================================================

const VARIANT_CONFIGS: Record<PerformanceVariant, VariantConfig> = {
  gainers: {
    title: 'Top Performers',
    icon: TrendingUp,
    iconColor: 'text-green-600',
    emptyIcon: Medal,
    emptyMessage: 'No gainers in this period',
    valueColor: 'text-green-600',
    testId: 'top-performers-widget',
    formatValue: (value) => formatPercentage(value, 2, true),
    fetchData: getTopPerformers,
    renderRankIcon: (rank) => {
      const medalColors: Record<number, string> = {
        1: 'text-yellow-500',
        2: 'text-gray-400',
        3: 'text-amber-600',
      };
      if (rank <= 3) {
        return <Medal className={`h-4 w-4 ${medalColors[rank]}`} />;
      }
      return (
        <span className="text-xs font-medium text-muted-foreground">
          {rank}
        </span>
      );
    },
  },
  losers: {
    title: 'Biggest Losers',
    icon: TrendingDown,
    iconColor: 'text-red-600',
    emptyIcon: TrendingDown,
    emptyMessage: 'No losers in this period',
    valueColor: 'text-red-600',
    testId: 'biggest-losers-widget',
    formatValue: (value) => formatPercentage(value, 2),
    fetchData: getBiggestLosers,
    renderRankIcon: (rank) => {
      if (rank === 1) {
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      }
      return (
        <span className="text-xs font-medium text-muted-foreground">
          {rank}
        </span>
      );
    },
  },
};

// =============================================================================
// Sub-components
// =============================================================================

interface SkeletonProps {
  config: VariantConfig;
}

function PerformanceListSkeleton({ config }: SkeletonProps) {
  const Icon = config.icon;
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface EmptyProps {
  config: VariantConfig;
}

function PerformanceListEmpty({ config }: EmptyProps) {
  const Icon = config.icon;
  const EmptyIcon = config.emptyIcon;
  return (
    <Card data-testid={config.testId} className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
        <Icon className={`h-4 w-4 ${config.iconColor}`} />
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="flex h-full flex-col items-center justify-center text-center">
          <EmptyIcon className="mb-2 h-8 w-8 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">{config.emptyMessage}</p>
        </div>
      </CardContent>
    </Card>
  );
}

interface PerformanceRowProps {
  holding: HoldingPerformance;
  rank: number;
  currency: string;
  config: VariantConfig;
  onClick?: () => void;
}

const PerformanceRow = memo(function PerformanceRow({
  holding,
  rank,
  currency,
  config,
  onClick,
}: PerformanceRowProps) {
  const isGainer = config.valueColor === 'text-green-600';
  const currencyPrefix = isGainer ? '+' : '';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between py-1 text-left',
        '-mx-1 rounded px-1 transition-colors',
        'hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1'
      )}
      aria-label={`View details for ${holding.symbol}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center">
          {config.renderRankIcon(rank)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{holding.symbol}</div>
          <div className="truncate text-xs text-muted-foreground">
            {holding.name}
          </div>
        </div>
      </div>
      <div className="ml-2 flex-shrink-0 text-right">
        <div className={`text-sm font-medium ${config.valueColor}`}>
          {config.formatValue(holding.percentGain)}
        </div>
        <div className="text-xs text-muted-foreground">
          {currencyPrefix}
          {formatCurrency(holding.absoluteGain.toNumber(), currency)}
        </div>
      </div>
    </button>
  );
});

// =============================================================================
// Main Component
// =============================================================================

export const PerformanceListWidget = memo(function PerformanceListWidget({
  variant,
  portfolioId,
  count,
  isLoading: externalLoading = false,
  data: externalData,
}: PerformanceListWidgetProps) {
  const router = useRouter();
  const { config: dashboardConfig } = useDashboardStore();
  const { currentPortfolio } = usePortfolioStore();

  const variantConfig = VARIANT_CONFIGS[variant];
  const Icon = variantConfig.icon;

  const effectivePortfolioId = portfolioId || currentPortfolio?.id;
  const effectiveCount = count || dashboardConfig?.performerCount || 5;
  const period: TimePeriod = dashboardConfig?.timePeriod || 'ALL';
  const currency = currentPortfolio?.currency || 'USD';

  // Use external data if provided (live price data)
  const useExternalData = externalData !== undefined;

  const [fetchedData, setFetchedData] = useState<HoldingPerformance[]>([]);
  const [loading, setLoading] = useState(!useExternalData);

  const handleItemClick = (holdingId: string) => {
    router.push(`/holdings?highlight=${holdingId}`);
  };

  useEffect(() => {
    // Skip fetch if using external data
    if (useExternalData) {
      setLoading(false);
      return;
    }

    if (!effectivePortfolioId) {
      setFetchedData([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const result = await variantConfig.fetchData(
          effectivePortfolioId!,
          period,
          effectiveCount
        );
        if (!cancelled) setFetchedData(result);
      } catch (error) {
        console.error(
          `Failed to load ${variantConfig.title.toLowerCase()}:`,
          error
        );
        if (!cancelled) setFetchedData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [
    effectivePortfolioId,
    period,
    effectiveCount,
    useExternalData,
    variantConfig,
  ]);

  // Use external data if provided, otherwise use fetched data
  const displayData = useExternalData ? externalData : fetchedData;

  if (externalLoading || loading) {
    return <PerformanceListSkeleton config={variantConfig} />;
  }

  if (!effectivePortfolioId || displayData.length === 0) {
    return <PerformanceListEmpty config={variantConfig} />;
  }

  const periodLabel = TIME_PERIOD_CONFIGS[period].label;

  return (
    <Card data-testid={variantConfig.testId} className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {variantConfig.title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${variantConfig.iconColor}`} />
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
          {displayData.map((holding, index) => (
            <PerformanceRow
              key={holding.holdingId}
              holding={holding}
              rank={index + 1}
              currency={currency}
              config={variantConfig}
              onClick={() => handleItemClick(holding.holdingId)}
            />
          ))}
        </div>
        <div className="flex-shrink-0 mt-3 border-t pt-2 text-center text-xs text-muted-foreground">
          {periodLabel} performance
        </div>
      </CardContent>
    </Card>
  );
});

PerformanceListWidget.displayName = 'PerformanceListWidget';

// =============================================================================
// Convenience Exports (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use PerformanceListWidget with variant="gainers" instead.
 * This wrapper will be removed in v2.0.0
 */
export interface TopPerformersWidgetProps {
  portfolioId?: string;
  count?: number;
  isLoading?: boolean;
  performers?: HoldingPerformance[];
}

/**
 * @deprecated Use PerformanceListWidget with variant="gainers" instead.
 * This wrapper will be removed in v2.0.0
 *
 * @example
 * // Instead of:
 * // <TopPerformersWidget portfolioId={id} />
 * // Use:
 * // <PerformanceListWidget variant="gainers" portfolioId={id} />
 */
export const TopPerformersWidget = memo(function TopPerformersWidget({
  portfolioId,
  count,
  isLoading,
  performers,
}: TopPerformersWidgetProps) {
  return (
    <PerformanceListWidget
      variant="gainers"
      portfolioId={portfolioId}
      count={count}
      isLoading={isLoading}
      data={performers}
    />
  );
});

TopPerformersWidget.displayName = 'TopPerformersWidget';

/**
 * @deprecated Use PerformanceListWidget with variant="losers" instead.
 * This wrapper will be removed in v2.0.0
 */
export interface BiggestLosersWidgetProps {
  portfolioId?: string;
  count?: number;
  isLoading?: boolean;
  losers?: HoldingPerformance[];
}

/**
 * @deprecated Use PerformanceListWidget with variant="losers" instead.
 * This wrapper will be removed in v2.0.0
 *
 * @example
 * // Instead of:
 * // <BiggestLosersWidget portfolioId={id} />
 * // Use:
 * // <PerformanceListWidget variant="losers" portfolioId={id} />
 */
export const BiggestLosersWidget = memo(function BiggestLosersWidget({
  portfolioId,
  count,
  isLoading,
  losers,
}: BiggestLosersWidgetProps) {
  return (
    <PerformanceListWidget
      variant="losers"
      portfolioId={portfolioId}
      count={count}
      isLoading={isLoading}
      data={losers}
    />
  );
});

BiggestLosersWidget.displayName = 'BiggestLosersWidget';
