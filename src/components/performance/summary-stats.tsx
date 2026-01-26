'use client';

/**
 * Summary Stats Component
 *
 * Displays performance summary statistics including total return,
 * gain/loss, period high/low, and best/worst day.
 *
 * @module components/performance/summary-stats
 */

import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Calendar, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { PerformanceSummary, BenchmarkComparison } from '@/types/performance';

interface SummaryStatsProps {
  summary: PerformanceSummary | null;
  benchmarkComparison?: BenchmarkComparison | null;
  isLoading?: boolean;
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'positive' | 'negative' | 'neutral';
  isLoading?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend = 'neutral',
  isLoading,
}: StatCardProps) {
  const trendColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-foreground',
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-20 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn('text-2xl font-bold', trendColors[trend])}>
          {value}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function SummaryStats({
  summary,
  benchmarkComparison,
  isLoading = false,
  className,
}: SummaryStatsProps) {
  if (!summary && !isLoading) {
    return (
      <div
        className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}
      >
        <StatCard
          title="Total Return"
          value="—"
          subtitle="No data available"
          icon={TrendingUp}
        />
        <StatCard
          title="Period High"
          value="—"
          subtitle="No data available"
          icon={Calendar}
        />
        <StatCard
          title="Period Low"
          value="—"
          subtitle="No data available"
          icon={Calendar}
        />
        <StatCard
          title="Volatility"
          value="—"
          subtitle="No data available"
          icon={Activity}
        />
      </div>
    );
  }

  // Format return values
  const totalReturn = summary
    ? formatCurrency(summary.totalReturn.toNumber())
    : '—';
  const totalReturnPercent = summary
    ? `${summary.totalReturnPercent >= 0 ? '+' : ''}${summary.totalReturnPercent.toFixed(2)}%`
    : '—';
  const returnTrend: 'positive' | 'negative' | 'neutral' = summary
    ? summary.totalReturnPercent >= 0
      ? 'positive'
      : 'negative'
    : 'neutral';

  // Format period high/low
  const periodHigh = summary
    ? formatCurrency(summary.periodHigh.toNumber())
    : '—';
  const periodHighDate = summary
    ? format(summary.periodHighDate, 'MMM d, yyyy')
    : '';
  const periodLow = summary
    ? formatCurrency(summary.periodLow.toNumber())
    : '—';
  const periodLowDate = summary
    ? format(summary.periodLowDate, 'MMM d, yyyy')
    : '';

  // Format best/worst day
  const bestDayChange = summary
    ? `${summary.bestDay.changePercent >= 0 ? '+' : ''}${summary.bestDay.changePercent.toFixed(2)}%`
    : '—';
  const bestDayDate = summary ? format(summary.bestDay.date, 'MMM d') : '';
  const worstDayChange = summary
    ? `${summary.worstDay.changePercent >= 0 ? '+' : ''}${summary.worstDay.changePercent.toFixed(2)}%`
    : '—';
  const worstDayDate = summary ? format(summary.worstDay.date, 'MMM d') : '';

  // Format TWR and volatility
  const twrReturn = summary
    ? `${summary.twrReturn >= 0 ? '+' : ''}${summary.twrReturn.toFixed(2)}%`
    : '—';
  const volatility = summary ? `${summary.volatility.toFixed(2)}%` : '—';
  const sharpeRatio = summary?.sharpeRatio?.toFixed(2) || '—';

  // Format benchmark comparison (alpha)
  const alpha = benchmarkComparison
    ? `${benchmarkComparison.alpha >= 0 ? '+' : ''}${benchmarkComparison.alpha.toFixed(2)}%`
    : null;
  const alphaTrend: 'positive' | 'negative' | 'neutral' = benchmarkComparison
    ? benchmarkComparison.alpha >= 0
      ? 'positive'
      : 'negative'
    : 'neutral';
  const benchmarkReturn = benchmarkComparison
    ? `${benchmarkComparison.benchmarkReturn >= 0 ? '+' : ''}${benchmarkComparison.benchmarkReturn.toFixed(2)}%`
    : null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Primary metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Return"
          value={totalReturnPercent}
          subtitle={`${totalReturn} since period start`}
          icon={returnTrend === 'positive' ? TrendingUp : TrendingDown}
          trend={returnTrend}
          isLoading={isLoading}
        />
        <StatCard
          title="Time-Weighted Return"
          value={twrReturn}
          subtitle="Risk-adjusted performance"
          icon={Activity}
          trend={summary && summary.twrReturn >= 0 ? 'positive' : 'negative'}
          isLoading={isLoading}
        />
        <StatCard
          title="Period High"
          value={periodHigh}
          subtitle={periodHighDate}
          icon={TrendingUp}
          trend="positive"
          isLoading={isLoading}
        />
        <StatCard
          title="Period Low"
          value={periodLow}
          subtitle={periodLowDate}
          icon={TrendingDown}
          trend="negative"
          isLoading={isLoading}
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Best Day"
          value={bestDayChange}
          subtitle={bestDayDate}
          icon={TrendingUp}
          trend="positive"
          isLoading={isLoading}
        />
        <StatCard
          title="Worst Day"
          value={worstDayChange}
          subtitle={worstDayDate}
          icon={TrendingDown}
          trend="negative"
          isLoading={isLoading}
        />
        <StatCard
          title="Volatility"
          value={volatility}
          subtitle="Annualized std deviation"
          icon={Activity}
          isLoading={isLoading}
        />
        {benchmarkComparison ? (
          <StatCard
            title="Alpha (vs Benchmark)"
            value={alpha || '—'}
            subtitle={`Benchmark: ${benchmarkReturn || '—'}`}
            icon={alphaTrend === 'positive' ? TrendingUp : TrendingDown}
            trend={alphaTrend}
            isLoading={isLoading}
          />
        ) : (
          <StatCard
            title="Sharpe Ratio"
            value={sharpeRatio}
            subtitle="Risk-adjusted return"
            icon={Activity}
            trend={
              summary && summary.sharpeRatio && summary.sharpeRatio > 1
                ? 'positive'
                : 'neutral'
            }
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}

export default SummaryStats;
