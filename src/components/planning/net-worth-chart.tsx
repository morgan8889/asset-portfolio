'use client';

import { memo, useMemo } from 'react';
import { NetWorthPoint } from '@/types/planning';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCompactCurrency } from '@/lib/utils/currency';

interface NetWorthChartProps {
  data: NetWorthPoint[];
  className?: string;
}

export const NetWorthChart = memo(function NetWorthChart({
  data,
  className,
}: NetWorthChartProps) {
  const formatDate = (date: Date) => {
    return format(date, 'MMM yyyy');
  };

  // Memoize chart data transformation to prevent recalculation on every render
  const chartData = useMemo(
    () =>
      data.map((point) => ({
        date: point.date,
        dateLabel: formatDate(point.date),
        assets: point.assets,
        liabilities: point.liabilities,
        netWorth: point.netWorth,
      })),
    [data]
  );

  // Memoize Y-axis domain calculation
  const yDomain = useMemo(() => {
    const allValues = data.flatMap((d) => [
      d.assets,
      d.liabilities,
      d.netWorth,
    ]);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const padding = (maxValue - minValue) * 0.1;
    return [
      Math.floor((minValue - padding) / 1000) * 1000,
      Math.ceil((maxValue + padding) / 1000) * 1000,
    ];
  }, [data]);

  // Memoize min value check for reference line
  const minValue = useMemo(() => {
    const allValues = data.flatMap((d) => [
      d.assets,
      d.liabilities,
      d.netWorth,
    ]);
    return Math.min(...allValues);
  }, [data]);

  const latestPoint = data[data.length - 1];
  const isNegativeNetWorth = latestPoint && latestPoint.netWorth < 0;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Net Worth History</CardTitle>
        {latestPoint && (
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Current Net Worth</p>
              <p
                className={`text-xl font-bold ${
                  isNegativeNetWorth ? 'text-destructive' : 'text-foreground'
                }`}
              >
                {formatCompactCurrency(latestPoint.netWorth)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Assets</p>
              <p className="text-xl font-bold">
                {formatCompactCurrency(latestPoint.assets)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Liabilities</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCompactCurrency(latestPoint.liabilities)}
              </p>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No historical data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="colorLiabilities"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="dateLabel"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                domain={yDomain}
                tickFormatter={(value) => formatCompactCurrency(value)}
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                labelFormatter={(label) => label}
                formatter={(value: number) => [
                  formatCompactCurrency(value),
                  '',
                ]}
              />
              <Legend />
              {/* Add reference line at zero if there are negative values */}
              {minValue < 0 && (
                <ReferenceLine
                  y={0}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="3 3"
                />
              )}
              <Area
                type="monotone"
                dataKey="assets"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorAssets)"
                name="Assets"
              />
              <Area
                type="monotone"
                dataKey="liabilities"
                stroke="#f97316"
                fillOpacity={1}
                fill="url(#colorLiabilities)"
                name="Liabilities"
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorNetWorth)"
                name="Net Worth"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
});
