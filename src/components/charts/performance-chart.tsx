'use client';

/**
 * Performance Chart Component
 *
 * Interactive time-series area chart for portfolio performance visualization.
 * Supports multiple time periods, benchmark overlay, and green/red color coding.
 *
 * @module components/charts/performance-chart
 */

import { useMemo, memo, useCallback } from 'react';
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
import { format } from 'date-fns';
import { formatCurrency, formatNumber, cn } from '@/lib/utils';
import { ChartDataPoint } from '@/types/performance';
import { TimePeriod } from '@/types/dashboard';

// =============================================================================
// Types
// =============================================================================

export interface PerformanceChartProps {
  /** Chart data points */
  data: ChartDataPoint[];
  /** Selected time period for formatting */
  period: TimePeriod;
  /** Show benchmark comparison line */
  showBenchmark?: boolean;
  /** Chart height in pixels */
  height?: number;
  /** Loading state */
  isLoading?: boolean;
  /** Show reference line at starting value */
  showReferenceLine?: boolean;
  /** Optional className */
  className?: string;
}

interface ChartTooltipProps extends TooltipProps<number, string> {
  showBenchmark?: boolean;
}

// =============================================================================
// Chart Data Transformation
// =============================================================================

interface TransformedDataPoint {
  date: string;
  displayDate: string;
  value: number;
  change: number;
  changePercent: number;
  benchmarkValue?: number;
  hasInterpolatedPrices: boolean;
  timestamp: number;
}

function transformData(
  data: ChartDataPoint[],
  period: TimePeriod
): TransformedDataPoint[] {
  return data.map((point) => ({
    date: point.date.toISOString(),
    displayDate: formatDateForPeriod(point.date, period),
    value: point.value,
    change: point.change,
    changePercent: point.changePercent,
    benchmarkValue: point.benchmarkValue,
    hasInterpolatedPrices: point.hasInterpolatedPrices,
    timestamp: point.date.getTime(),
  }));
}

function formatDateForPeriod(date: Date, period: TimePeriod): string {
  switch (period) {
    case 'TODAY':
    case 'WEEK':
      return format(date, 'MMM d');
    case 'MONTH':
    case 'QUARTER':
      return format(date, 'MMM d');
    case 'YEAR':
      return format(date, 'MMM yyyy');
    case 'ALL':
      return format(date, 'MMM yyyy');
    default:
      return format(date, 'MMM d, yyyy');
  }
}

// =============================================================================
// Custom Tooltip
// =============================================================================

const CustomTooltip = memo(function CustomTooltip({
  active,
  payload,
  showBenchmark,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload as TransformedDataPoint;
  const isPositive = data.change >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <div className="mb-1 text-sm text-muted-foreground">
        {format(new Date(data.date), 'EEEE, MMMM d, yyyy')}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">Portfolio Value</span>
          <span className="font-bold">{formatCurrency(data.value)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">Daily Change</span>
          <span className={cn('font-medium', changeColor)}>
            {isPositive ? '+' : ''}
            {formatCurrency(data.change)} ({isPositive ? '+' : ''}
            {data.changePercent.toFixed(2)}%)
          </span>
        </div>
        {showBenchmark && data.benchmarkValue !== undefined && (
          <div className="mt-1 flex items-center justify-between gap-4 border-t pt-1">
            <span className="text-sm font-medium">Benchmark</span>
            <span className="font-medium">
              {formatCurrency(data.benchmarkValue)}
            </span>
          </div>
        )}
        {data.hasInterpolatedPrices && (
          <div className="mt-2 text-xs italic text-muted-foreground">
            * Some prices were estimated
          </div>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// Loading Skeleton
// =============================================================================

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-muted"
      style={{ height }}
      role="status"
      aria-label="Loading chart"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState({ height }: { height: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed text-muted-foreground"
      style={{ height }}
    >
      <div className="text-center">
        <p className="text-sm">No performance data available</p>
        <p className="mt-1 text-xs">
          Add transactions to see your portfolio performance
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export const PerformanceChart = memo(function PerformanceChart({
  data,
  period,
  showBenchmark = false,
  height = 400,
  isLoading = false,
  showReferenceLine = true,
  className,
}: PerformanceChartProps) {
  // Transform data for the chart
  const chartData = useMemo(() => transformData(data, period), [data, period]);

  // Calculate chart metrics
  const { minValue, maxValue, startValue, isPositive, strokeColor, fillColor } =
    useMemo(() => {
      if (chartData.length === 0) {
        return {
          minValue: 0,
          maxValue: 100,
          startValue: 0,
          isPositive: true,
          strokeColor: '#22c55e',
          fillColor: 'url(#positiveGradient)',
        };
      }

      const values = chartData.map((d) => d.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const start = chartData[0].value;
      const end = chartData[chartData.length - 1].value;
      const positive = end >= start;

      return {
        minValue: min * 0.995, // Add 0.5% padding
        maxValue: max * 1.005,
        startValue: start,
        isPositive: positive,
        strokeColor: positive ? '#22c55e' : '#ef4444',
        fillColor: positive
          ? 'url(#positiveGradient)'
          : 'url(#negativeGradient)',
      };
    }, [chartData]);

  // Calculate X-axis ticks
  const xAxisTicks = useMemo(() => {
    if (chartData.length <= 5) return undefined; // Let Recharts auto-calculate

    const tickCount = Math.min(6, chartData.length);
    const step = Math.floor(chartData.length / (tickCount - 1));
    const ticks: number[] = [];

    for (let i = 0; i < tickCount - 1; i++) {
      ticks.push(chartData[i * step].timestamp);
    }
    ticks.push(chartData[chartData.length - 1].timestamp);

    return ticks;
  }, [chartData]);

  // Generate accessible summary for screen readers
  const accessibleSummary = useMemo(() => {
    if (chartData.length === 0) return '';

    const firstPoint = chartData[0];
    const lastPoint = chartData[chartData.length - 1];
    const totalChange = lastPoint.value - firstPoint.value;
    const percentChange = ((totalChange / firstPoint.value) * 100).toFixed(2);
    const trend = totalChange >= 0 ? 'increased' : 'decreased';

    return `Portfolio performance chart showing data from ${formatDateForPeriod(new Date(firstPoint.date), period)} to ${formatDateForPeriod(new Date(lastPoint.date), period)}. Portfolio value ${trend} from ${formatCurrency(firstPoint.value)} to ${formatCurrency(lastPoint.value)}, a change of ${percentChange}%.`;
  }, [chartData, period]);

  if (isLoading) {
    return <ChartSkeleton height={height} />;
  }

  if (data.length === 0) {
    return <EmptyState height={height} />;
  }

  return (
    <div
      className={cn('w-full', className)}
      style={{ height }}
      role="img"
      aria-label={accessibleSummary}
      tabIndex={0}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="benchmarkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            vertical={false}
          />

          <XAxis
            dataKey="timestamp"
            type="number"
            domain={['dataMin', 'dataMax']}
            ticks={xAxisTicks}
            tickFormatter={(value) => {
              const date = new Date(value);
              return formatDateForPeriod(date, period);
            }}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
          />

          <YAxis
            domain={[minValue, maxValue]}
            tickFormatter={(value) => `$${formatNumber(value, 0)}`}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={70}
          />

          <Tooltip
            content={<CustomTooltip showBenchmark={showBenchmark} />}
            cursor={{
              stroke: 'hsl(var(--muted-foreground))',
              strokeWidth: 1,
              strokeDasharray: '3 3',
            }}
          />

          {showReferenceLine && startValue > 0 && (
            <ReferenceLine
              y={startValue}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              strokeWidth={1}
            />
          )}

          {/* Benchmark line (if enabled) */}
          {showBenchmark && (
            <Area
              type="monotone"
              dataKey="benchmarkValue"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#benchmarkGradient)"
              fillOpacity={0.3}
              strokeDasharray="5 5"
              dot={false}
              activeDot={false}
            />
          )}

          {/* Portfolio value line */}
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            fill={fillColor}
            fillOpacity={1}
            dot={false}
            activeDot={{
              r: 6,
              fill: strokeColor,
              stroke: 'hsl(var(--background))',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

export default PerformanceChart;
