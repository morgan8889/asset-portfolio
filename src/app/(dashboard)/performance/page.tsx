'use client';

import { useMemo, useCallback, memo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendIndicator,
  getTrendColorClass,
} from '@/components/ui/trend-indicator';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  BarChart3,
  AlertTriangle,
  Wallet,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { usePerformanceData } from '@/hooks';
import {
  ChartTimePeriod,
  HistoricalPortfolioValue,
  HoldingPerformance,
} from '@/types/dashboard';
import Decimal from 'decimal.js';
import {
  YoYGrowthTable,
  ExportButton,
  HoldingsBreakdown,
} from '@/components/performance';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { usePriceStore } from '@/lib/stores/price';
import { HoldingPerformanceData } from '@/types/performance';

// Period configuration for chart display
const periodConfigs: Record<
  ChartTimePeriod,
  { label: string; description: string }
> = {
  '1M': { label: '1M', description: 'Past Month' },
  '3M': { label: '3M', description: 'Past 3 Months' },
  YTD: { label: 'YTD', description: 'Year to Date' },
  '1Y': { label: '1Y', description: 'Past Year' },
  '3Y': { label: '3Y', description: 'Past 3 Years' },
  ALL: { label: 'ALL', description: 'All Time' },
};

// Transform historical data for Recharts
interface ChartDataPoint {
  date: string;
  value: number;
  change: number;
  timestamp: number;
}

function transformHistoricalData(
  data: HistoricalPortfolioValue[]
): ChartDataPoint[] {
  if (data.length === 0) return [];

  return data.map((point, index) => {
    const previousValue = index > 0 ? data[index - 1].value : point.value;
    return {
      date: point.date.toISOString(),
      value: point.value.toNumber(),
      change: point.value.minus(previousValue).toNumber(),
      timestamp: point.date.getTime(),
    };
  });
}

// Format X-axis labels based on period
function formatXAxisLabel(tickItem: string, period: ChartTimePeriod): string {
  const date = new Date(tickItem);

  switch (period) {
    case '1M':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    case '3M':
    case 'YTD':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    case '1Y':
    case '3Y':
    case 'ALL':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
    default:
      return date.toLocaleDateString();
  }
}

// Chart tooltip component
interface ChartTooltipProps extends TooltipProps<number, string> {
  period: ChartTimePeriod;
}

const ChartTooltip = memo(function ChartTooltip({
  active,
  payload,
  period,
}: ChartTooltipProps) {
  if (active && payload && payload[0]) {
    const data = payload[0].payload as ChartDataPoint;
    const value = payload[0].value ?? 0;
    const date = new Date(data.date);

    return (
      <div className="min-w-[200px] rounded-lg border bg-background p-3 shadow-lg">
        <p className="mb-1 text-sm text-muted-foreground">
          {date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year:
              period === 'ALL' || period === '1Y' || period === '3Y'
                ? 'numeric'
                : undefined,
          })}
        </p>
        <p className="mb-1 text-lg font-bold">{formatCurrency(value)}</p>
        <p
          className={cn(
            'flex items-center gap-1 text-sm',
            getTrendColorClass(data.change)
          )}
        >
          <TrendIndicator value={data.change} size="xs" iconOnly />
          {data.change >= 0 ? '+' : ''}
          {formatCurrency(data.change)} change
        </p>
      </div>
    );
  }
  return null;
});

// Metric card component for consistency
interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
  loading?: boolean;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend = 'neutral',
  loading,
}: MetricCardProps) {
  const trendColor =
    trend === 'positive'
      ? 'text-green-600'
      : trend === 'negative'
        ? 'text-red-600'
        : 'text-foreground';

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-1 h-8 w-20" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', trendColor)}>{value}</div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

// Top performers / losers table component
interface PerformersTableProps {
  performers: HoldingPerformance[];
  title: string;
  icon: React.ReactNode;
  emptyMessage: string;
  loading?: boolean;
}

function PerformersTable({
  performers,
  title,
  icon,
  emptyMessage,
  loading,
}: PerformersTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {performers.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        ) : (
          <div className="space-y-3">
            {performers.map((performer) => (
              <div
                key={performer.holdingId}
                className="flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <div className="font-medium">{performer.symbol}</div>
                  <div className="max-w-[150px] truncate text-xs text-muted-foreground">
                    {performer.name}
                  </div>
                </div>
                <div
                  className={cn(
                    'text-sm font-medium',
                    performer.percentGain >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  )}
                >
                  {performer.percentGain >= 0 ? '+' : ''}
                  {performer.percentGain.toFixed(2)}%
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Empty state component
function EmptyState() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
        <p className="text-muted-foreground">
          Track your portfolio performance over time with detailed metrics and
          benchmarks.
        </p>
      </div>

      <Card className="py-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <Wallet className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No Holdings Yet</h3>
          <p className="max-w-md text-muted-foreground">
            Add some holdings to your portfolio to see performance metrics,
            charts, and analysis.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Error state component
function ErrorState({ error }: { error: string }) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
        <p className="text-muted-foreground">
          Track your portfolio performance over time with detailed metrics and
          benchmarks.
        </p>
      </div>

      <Card className="border-destructive py-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="mb-2 text-lg font-semibold">
            Error Loading Performance Data
          </h3>
          <p className="max-w-md text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PerformancePage() {
  const {
    totalValue,
    totalGain,
    totalGainPercent,
    dayChange,
    dayChangePercent,
    topPerformers,
    biggestLosers,
    metrics,
    yoyMetrics,
    historicalData,
    selectedPeriod,
    loading,
    error,
    setSelectedPeriod,
  } = usePerformanceData();

  const { currentPortfolio, holdings: portfolioHoldings } = usePortfolioStore();
  const { refreshAllPrices } = usePriceStore();

  const handleRefresh = async () => {
    if (currentPortfolio?.id) {
      await refreshAllPrices();
    }
  };

  // Transform holdings for the breakdown table
  const holdingsPerformanceData = useMemo((): HoldingPerformanceData[] => {
    // Combine top performers and losers to get all holdings
    const allPerformers = [...topPerformers, ...biggestLosers];

    return allPerformers.map((perf) => ({
      holdingId: perf.holdingId,
      symbol: perf.symbol,
      name: perf.name,
      assetType: perf.assetType,
      quantity: new Decimal(0), // Not critical for display
      costBasis: new Decimal(0), // Not critical for display
      currentValue: perf.currentValue,
      periodStartValue: perf.periodStartValue,
      absoluteGain: perf.absoluteGain,
      percentGain: perf.percentGain,
      weight: 0, // Not critical for display
      isInterpolated: false,
    }));
  }, [topPerformers, biggestLosers]);

  // Transform historical data for chart
  const chartData = useMemo(
    () => transformHistoricalData(historicalData),
    [historicalData]
  );

  // Calculate chart stats
  const chartStats = useMemo(() => {
    if (chartData.length === 0) return null;

    const firstValue = chartData[0].value;
    const lastValue = chartData[chartData.length - 1].value;
    const totalChange = lastValue - firstValue;
    const percentChange = firstValue > 0 ? (totalChange / firstValue) * 100 : 0;

    return {
      currentValue: lastValue,
      totalChange,
      percentChange,
      highValue: Math.max(...chartData.map((d) => d.value)),
      lowValue: Math.min(...chartData.map((d) => d.value)),
      isPositive: totalChange >= 0,
    };
  }, [chartData]);

  // Memoized tooltip renderer
  const renderTooltip = useCallback(
    (props: TooltipProps<number, string>) => (
      <ChartTooltip {...props} period={selectedPeriod} />
    ),
    [selectedPeriod]
  );

  // Memoized Y-axis formatter
  const yAxisFormatter = useCallback(
    (value: number) => `$${(value / 1000).toFixed(0)}k`,
    []
  );

  // Handle error state
  if (error) {
    return <ErrorState error={error} />;
  }

  // Handle empty portfolio
  const hasData = historicalData.length > 0 || !totalValue.isZero();
  if (!loading && !hasData) {
    return <EmptyState />;
  }

  // Format metrics for display
  const formatPercent = (value: number): string => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(2)}%`;
  };

  const formatRatio = (value: number): string => {
    return value.toFixed(2);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground">
            Track your portfolio performance over time with detailed metrics and
            benchmarks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || !currentPortfolio}
            aria-label="Refresh prices"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {currentPortfolio && (
            <ExportButton
              portfolioId={currentPortfolio.id}
              disabled={loading}
            />
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          title="Total Return"
          value={formatPercent(metrics.roi)}
          subtitle="Since inception"
          icon={<TrendingUp className="h-4 w-4" />}
          trend={metrics.roi >= 0 ? 'positive' : 'negative'}
          loading={loading}
        />

        <MetricCard
          title="Time-Weighted Return"
          value={formatPercent(metrics.annualizedReturn)}
          subtitle="CAGR"
          icon={<Activity className="h-4 w-4" />}
          trend={metrics.annualizedReturn >= 0 ? 'positive' : 'negative'}
          loading={loading}
        />

        <MetricCard
          title="Annual Return"
          value={formatPercent(metrics.annualizedReturn)}
          subtitle="CAGR"
          icon={<Calendar className="h-4 w-4" />}
          trend={metrics.annualizedReturn >= 0 ? 'positive' : 'negative'}
          loading={loading}
        />

        <MetricCard
          title="Max Drawdown"
          value={`-${metrics.maxDrawdown.toFixed(2)}%`}
          subtitle="Largest decline"
          icon={<TrendingDown className="h-4 w-4" />}
          trend={metrics.maxDrawdown > 20 ? 'negative' : 'neutral'}
          loading={loading}
        />

        <MetricCard
          title="Sharpe Ratio"
          value={formatRatio(metrics.sharpeRatio)}
          subtitle="Risk-adjusted return"
          icon={<BarChart3 className="h-4 w-4" />}
          trend={
            metrics.sharpeRatio > 1
              ? 'positive'
              : metrics.sharpeRatio < 0
                ? 'negative'
                : 'neutral'
          }
          loading={loading}
        />
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Portfolio Performance
              </CardTitle>
              {chartStats && !loading && (
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Current: </span>
                    <span className="font-medium">
                      {formatCurrency(chartStats.currentValue)}
                    </span>
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      getTrendColorClass(chartStats.totalChange)
                    )}
                  >
                    <TrendIndicator value={chartStats.totalChange} iconOnly />
                    <span className="font-medium">
                      {chartStats.isPositive ? '+' : ''}
                      {formatCurrency(chartStats.totalChange)}
                    </span>
                    <span>({chartStats.percentChange.toFixed(2)}%)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Period Selector */}
            <div className="flex gap-1">
              {(Object.keys(periodConfigs) as ChartTimePeriod[]).map(
                (period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod(period)}
                    className="h-8 px-3"
                    aria-pressed={selectedPeriod === period}
                  >
                    {periodConfigs[period].label}
                  </Button>
                )
              )}
            </div>
          </div>

          {chartStats && !loading && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Period High</div>
                <div className="text-sm font-medium text-green-600">
                  {formatCurrency(chartStats.highValue)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Period Low</div>
                <div className="text-sm font-medium text-red-600">
                  {formatCurrency(chartStats.lowValue)}
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="h-[400px] w-full animate-pulse rounded bg-muted" />
          ) : chartData.length === 0 ? (
            <div className="flex h-[400px] items-center justify-center text-muted-foreground">
              No historical data available for this period
            </div>
          ) : (
            <>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorPerformance"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={
                            chartStats?.isPositive ? '#10b981' : '#ef4444'
                          }
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={
                            chartStats?.isPositive ? '#10b981' : '#ef4444'
                          }
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted opacity-30"
                    />

                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(tick) =>
                        formatXAxisLabel(tick, selectedPeriod)
                      }
                      interval="preserveStartEnd"
                      minTickGap={50}
                    />

                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={yAxisFormatter}
                      domain={['dataMin - 1000', 'dataMax + 1000']}
                    />

                    {/* Reference line for initial value */}
                    {chartData.length > 0 && (
                      <ReferenceLine
                        y={chartData[0].value}
                        stroke="#6b7280"
                        strokeDasharray="2 2"
                        strokeOpacity={0.5}
                      />
                    )}

                    <Tooltip content={renderTooltip} />

                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={chartStats?.isPositive ? '#10b981' : '#ef4444'}
                      strokeWidth={2}
                      fill="url(#colorPerformance)"
                      dot={false}
                      activeDot={{
                        r: 4,
                        stroke: chartStats?.isPositive ? '#10b981' : '#ef4444',
                        strokeWidth: 2,
                        fill: 'white',
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 text-center text-xs text-muted-foreground">
                {periodConfigs[selectedPeriod].description} • Prices delayed by
                15 minutes
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Year-over-Year Growth */}
      {!loading && <YoYGrowthTable metrics={yoyMetrics} />}

      {/* Holdings Performance Table */}
      {!loading && holdingsPerformanceData.length > 0 && (
        <HoldingsBreakdown
          holdings={holdingsPerformanceData}
          isLoading={loading}
        />
      )}

      {/* Top Performers / Biggest Losers */}
      <div className="grid gap-6 md:grid-cols-2">
        <PerformersTable
          performers={topPerformers}
          title="Top Performers"
          icon={<TrendingUp className="h-4 w-4 text-green-600" />}
          emptyMessage="No performers to display"
          loading={loading}
        />

        <PerformersTable
          performers={biggestLosers}
          title="Biggest Losers"
          icon={<TrendingDown className="h-4 w-4 text-red-600" />}
          emptyMessage="No losers to display"
          loading={loading}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid gap-6 md:grid-cols-3">
        <MetricCard
          title="Today's Change"
          value={formatPercent(dayChangePercent)}
          subtitle={formatCurrency(dayChange.toNumber())}
          icon={<Activity className="h-4 w-4" />}
          trend={dayChangePercent >= 0 ? 'positive' : 'negative'}
          loading={loading}
        />

        <MetricCard
          title="Total Value"
          value={formatCurrency(totalValue.toNumber())}
          subtitle="Current portfolio value"
          icon={<Wallet className="h-4 w-4" />}
          trend="neutral"
          loading={loading}
        />

        <MetricCard
          title="Total Gain/Loss"
          value={formatCurrency(totalGain.toNumber())}
          subtitle={formatPercent(totalGainPercent)}
          icon={
            totalGain.gte(0) ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )
          }
          trend={totalGain.gte(0) ? 'positive' : 'negative'}
          loading={loading}
        />
      </div>
    </div>
  );
}
