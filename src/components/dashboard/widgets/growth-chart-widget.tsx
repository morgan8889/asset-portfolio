'use client';

/**
 * Growth Chart Widget
 *
 * Displays portfolio value over time with interactive time range selector.
 * Uses real historical data from the historical-value service.
 */

import { memo, useState, useEffect, useMemo, useCallback } from 'react';
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
import { TrendingUp, TrendingDown, LineChart } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import {
  TimePeriod,
  TIME_PERIOD_CONFIGS,
  HistoricalValuePoint,
} from '@/types/dashboard';
import { getHistoricalValues } from '@/lib/services/historical-value';
import { useDashboardStore, usePortfolioStore } from '@/lib/stores';

interface ChartDataPoint {
  date: string;
  value: number;
  change: number;
  timestamp: number;
}

interface GrowthChartWidgetProps {
  portfolioId?: string;
  isLoading?: boolean;
}

const AVAILABLE_PERIODS: TimePeriod[] = [
  'WEEK',
  'MONTH',
  'QUARTER',
  'YEAR',
  'ALL',
];

function GrowthChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Portfolio Growth
          </CardTitle>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-8 w-10 animate-pulse rounded bg-muted"
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

function GrowthChartEmpty() {
  return (
    <Card data-testid="growth-chart-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <LineChart className="h-4 w-4" />
          Portfolio Growth
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-[300px] flex-col items-center justify-center text-center">
          <LineChart className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No historical data available</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add transactions to see portfolio growth over time
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ChartTooltipProps extends TooltipProps<number, string> {
  period: TimePeriod;
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

    const showYear = period === 'ALL' || period === 'YEAR';

    return (
      <div className="min-w-[180px] rounded-lg border bg-background p-3 shadow-lg">
        <p className="mb-1 text-sm text-muted-foreground">
          {date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: showYear ? 'numeric' : undefined,
          })}
        </p>
        <p className="mb-1 text-lg font-bold">{formatCurrency(value)}</p>
        <p
          className={cn(
            'text-sm',
            data.change >= 0 ? 'text-green-600' : 'text-red-600'
          )}
        >
          {data.change >= 0 ? '+' : ''}
          {formatCurrency(data.change)} change
        </p>
      </div>
    );
  }
  return null;
});

function formatXAxisLabel(tickItem: string, period: TimePeriod): string {
  const date = new Date(tickItem);

  switch (period) {
    case 'TODAY':
    case 'WEEK':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    case 'MONTH':
    case 'QUARTER':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    case 'YEAR':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
      });
    case 'ALL':
      return date.toLocaleDateString('en-US', { year: 'numeric' });
    default:
      return date.toLocaleDateString();
  }
}

export const GrowthChartWidget = memo(function GrowthChartWidget({
  portfolioId,
  isLoading: externalLoading = false,
}: GrowthChartWidgetProps) {
  const { config } = useDashboardStore();
  const { currentPortfolio } = usePortfolioStore();
  const effectivePortfolioId = portfolioId || currentPortfolio?.id;

  const [period, setPeriod] = useState<TimePeriod>(
    config?.timePeriod || 'MONTH'
  );
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectivePortfolioId) {
      setData([]);
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        // Check cancelled before starting async work
        if (cancelled) return;

        const historicalData = await getHistoricalValues(
          effectivePortfolioId!,
          period
        );

        // Check cancelled after each await to prevent state updates on unmounted component
        if (cancelled || abortController.signal.aborted) return;

        const chartData: ChartDataPoint[] = historicalData.map(
          (point: HistoricalValuePoint) => ({
            date: point.date.toISOString(),
            value: point.totalValue.toNumber(),
            change: point.change.toNumber(),
            timestamp: point.date.getTime(),
          })
        );

        if (!cancelled) {
          setData(chartData);
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Failed to load historical data:', error);
        if (!cancelled) setData([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [effectivePortfolioId, period]);

  const chartStats = useMemo(() => {
    if (data.length === 0) return null;

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const totalChange = lastValue - firstValue;
    const percentChange = firstValue > 0 ? (totalChange / firstValue) * 100 : 0;

    const highValue = Math.max(...data.map((d) => d.value));
    const lowValue = Math.min(...data.map((d) => d.value));

    return {
      currentValue: lastValue,
      totalChange,
      percentChange,
      highValue,
      lowValue,
      isPositive: totalChange >= 0,
    };
  }, [data]);

  const renderTooltip = useCallback(
    (props: TooltipProps<number, string>) => (
      <ChartTooltip {...props} period={period} />
    ),
    [period]
  );

  if (externalLoading || loading) {
    return <GrowthChartSkeleton />;
  }

  if (!effectivePortfolioId || data.length === 0) {
    return <GrowthChartEmpty />;
  }

  const TrendIcon = chartStats?.isPositive ? TrendingUp : TrendingDown;
  const trendColor = chartStats?.isPositive ? 'text-green-600' : 'text-red-600';
  const chartColor = chartStats?.isPositive ? '#10b981' : '#ef4444';

  return (
    <Card data-testid="growth-chart-widget">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Portfolio Growth
            </CardTitle>
            {chartStats && (
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Current: </span>
                  <span className="font-medium">
                    {formatCurrency(chartStats.currentValue)}
                  </span>
                </div>
                <div className={cn('flex items-center gap-1', trendColor)}>
                  <TrendIcon className="h-4 w-4" />
                  <span className="font-medium">
                    {chartStats.isPositive ? '+' : ''}
                    {formatCurrency(chartStats.totalChange)}
                  </span>
                  <span>({chartStats.percentChange.toFixed(2)}%)</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-1">
            {AVAILABLE_PERIODS.map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
                className="h-8 px-3"
              >
                {TIME_PERIOD_CONFIGS[p].shortLabel}
              </Button>
            ))}
          </div>
        </div>

        {chartStats && (
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
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
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
                tickFormatter={(tick) => formatXAxisLabel(tick, period)}
                interval="preserveStartEnd"
                minTickGap={50}
              />

              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  if (value >= 1_000_000) {
                    return `$${(value / 1_000_000).toFixed(1)}M`;
                  } else if (value >= 1_000) {
                    return `$${(value / 1_000).toFixed(0)}k`;
                  }
                  return `$${value.toFixed(0)}`;
                }}
                domain={['dataMin - 1000', 'dataMax + 1000']}
              />

              {data.length > 0 && (
                <ReferenceLine
                  y={data[0].value}
                  stroke="#6b7280"
                  strokeDasharray="2 2"
                  strokeOpacity={0.5}
                />
              )}

              <Tooltip content={renderTooltip} />

              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColor}
                strokeWidth={2}
                fill="url(#colorGrowth)"
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: chartColor,
                  strokeWidth: 2,
                  fill: 'white',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          {TIME_PERIOD_CONFIGS[period].label} performance
        </div>
      </CardContent>
    </Card>
  );
});

GrowthChartWidget.displayName = 'GrowthChartWidget';
