'use client';

import { useState, useMemo, memo, useCallback } from 'react';
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
import { TrendIndicator, getTrendColorClass } from '@/components/ui/trend-indicator';
import { Activity } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

type TimePeriod = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface ChartDataPoint {
  date: string;
  value: number;
  change: number;
  timestamp: number;
}

const periodConfigs = {
  '1D': { days: 1, label: 'Today', format: 'HH:mm' },
  '1W': { days: 7, label: 'Past Week', format: 'MMM dd' },
  '1M': { days: 30, label: 'Past Month', format: 'MMM dd' },
  '3M': { days: 90, label: 'Past 3 Months', format: 'MMM dd' },
  '1Y': { days: 365, label: 'Past Year', format: 'MMM yyyy' },
  'ALL': { days: 365 * 3, label: 'All Time', format: 'MMM yyyy' },
};

// Generate mock data for demonstration
const generateMockData = (days: number): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const baseValue = 125000;
  const today = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    // Generate realistic portfolio movement with slight upward trend
    const volatility = 0.015; // 1.5% daily volatility
    const trend = 0.0002; // Small upward trend
    const randomChange = (Math.random() - 0.48) * volatility + trend;

    const previousValue = i === days ? baseValue : data[data.length - 1]?.value || baseValue;
    const value = previousValue * (1 + randomChange);
    const change = value - previousValue;

    data.push({
      date: date.toISOString(),
      value: Math.round(value),
      change: Math.round(change),
      timestamp: date.getTime(),
    });
  }

  return data;
};

// Simple X-axis label formatter - no useCallback needed for simple formatting
const formatXAxisLabel = (tickItem: string, period: TimePeriod): string => {
  const date = new Date(tickItem);

  switch (period) {
    case '1D':
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    case '1W':
    case '1M':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case '3M':
    case '1Y':
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    case 'ALL':
      return date.toLocaleDateString('en-US', { year: 'numeric' });
    default:
      return date.toLocaleDateString();
  }
};

// Extracted tooltip component using TrendIndicator
interface ChartTooltipProps extends TooltipProps<number, string> {
  period: TimePeriod;
}

const ChartTooltip = memo(function ChartTooltip({ active, payload, period }: ChartTooltipProps) {
  if (active && payload && payload[0]) {
    const data = payload[0].payload as ChartDataPoint;
    const value = payload[0].value ?? 0;
    const date = new Date(data.date);

    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="text-sm text-muted-foreground mb-1">
          {period === '1D'
            ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            : date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: period === 'ALL' || period === '1Y' ? 'numeric' : undefined,
              })}
        </p>
        <p className="text-lg font-bold mb-1">{formatCurrency(value)}</p>
        <p className={cn('text-sm flex items-center gap-1', getTrendColorClass(data.change))}>
          <TrendIndicator value={data.change} size="xs" iconOnly />
          {data.change >= 0 ? '+' : ''}
          {formatCurrency(data.change)} change
        </p>
      </div>
    );
  }
  return null;
});

const PortfolioChartComponent = () => {
  const [period, setPeriod] = useState<TimePeriod>('1M');

  const data = useMemo(() => {
    const config = periodConfigs[period];
    return generateMockData(config.days);
  }, [period]);

  const chartStats = useMemo(() => {
    if (data.length === 0) return null;

    const firstValue = data[0].value;
    const lastValue = data[data.length - 1].value;
    const totalChange = lastValue - firstValue;
    const percentChange = (totalChange / firstValue) * 100;

    const highValue = Math.max(...data.map(d => d.value));
    const lowValue = Math.min(...data.map(d => d.value));

    return {
      currentValue: lastValue,
      totalChange,
      percentChange,
      highValue,
      lowValue,
      isPositive: totalChange >= 0,
    };
  }, [data]);

  // Memoized tooltip with period closure
  const renderTooltip = useCallback(
    (props: TooltipProps<number, string>) => <ChartTooltip {...props} period={period} />,
    [period]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Portfolio Performance
            </CardTitle>
            {chartStats && (
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Current: </span>
                  <span className="font-medium">{formatCurrency(chartStats.currentValue)}</span>
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

          <div className="flex gap-1">
            {(Object.keys(periodConfigs) as TimePeriod[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
                className="h-8 px-3"
              >
                {p}
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
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor={chartStats?.isPositive ? '#10b981' : '#ef4444'}
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor={chartStats?.isPositive ? '#10b981' : '#ef4444'}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" className="stroke-muted opacity-30" />

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
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                domain={['dataMin - 1000', 'dataMax + 1000']}
              />

              {/* Reference line for initial value */}
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
                stroke={chartStats?.isPositive ? '#10b981' : '#ef4444'}
                strokeWidth={2}
                fill="url(#colorValue)"
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

        <div className="mt-4 text-xs text-muted-foreground text-center">
          {periodConfigs[period].label} • Prices delayed by 15 minutes
        </div>
      </CardContent>
    </Card>
  );
};

export const PortfolioChart = memo(PortfolioChartComponent);
