'use client';

import { ProjectionPoint, FireCalculation } from '@/types/planning';
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
  Label,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Calendar, DollarSign } from 'lucide-react';

interface FireProjectionChartProps {
  projection: ProjectionPoint[];
  fireCalculation: FireCalculation | null;
  className?: string;
}

export function FireProjectionChart({
  projection,
  fireCalculation,
  className,
}: FireProjectionChartProps) {
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatYear = (value: number) => {
    if (value === 0) return 'Now';
    return `+${value}Y`;
  };

  // Transform data for Recharts
  const chartData = projection.map((point) => ({
    year: point.year,
    yearLabel: formatYear(point.year),
    netWorth: point.netWorth,
    fireTarget: point.fireTarget,
    isProjected: point.isProjected,
  }));

  // Find crossover point
  const crossoverPoint = projection.find((p) => p.netWorth >= p.fireTarget);

  const formatMonthlyProgress = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Path to Financial Independence</CardTitle>
        {fireCalculation && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-2">
              <Calendar className="mt-1 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Years to FIRE</p>
                <p className="text-xl font-bold">
                  {fireCalculation.yearsToFire === Infinity
                    ? '∞'
                    : fireCalculation.yearsToFire.toFixed(1)}
                </p>
                {fireCalculation.projectedFireDate && (
                  <p className="text-xs text-muted-foreground">
                    {formatDate(fireCalculation.projectedFireDate)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <DollarSign className="mt-1 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">FIRE Target</p>
                <p className="text-xl font-bold">
                  {formatCurrency(fireCalculation.fireNumber)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <TrendingUp className="mt-1 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Monthly Progress
                </p>
                <p className="text-xl font-bold">
                  {formatMonthlyProgress(fireCalculation.monthlyProgress)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No projection data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="yearLabel"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                labelFormatter={(label) => `Year ${label}`}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'netWorth' ? 'Net Worth' : 'FIRE Target',
                ]}
              />
              <Legend />
              <ReferenceLine
                y={fireCalculation?.fireNumber || 0}
                stroke="hsl(var(--primary))"
                strokeDasharray="3 3"
                label={{
                  value: 'FIRE Target',
                  position: 'insideTopRight',
                  fill: 'hsl(var(--primary))',
                }}
              />
              {crossoverPoint && (
                <ReferenceLine
                  x={crossoverPoint.year}
                  stroke="hsl(var(--success))"
                  strokeDasharray="3 3"
                  label={{
                    value: 'Financial Independence',
                    position: 'top',
                    fill: 'hsl(var(--success))',
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorProjection)"
                name="Projected Net Worth"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {fireCalculation && fireCalculation.yearsToFire === Infinity && (
          <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              With current settings, you may not reach FIRE. Consider increasing
              your monthly savings or adjusting your target expenses.
            </p>
          </div>
        )}

        {fireCalculation && fireCalculation.yearsToFire === 0 && (
          <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
            <p className="text-sm text-green-800 dark:text-green-200">
              Congratulations! You&apos;ve reached Financial Independence! Your
              current net worth exceeds your FIRE target.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
