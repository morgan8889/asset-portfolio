'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendIndicator, getTrendColorClass } from '@/components/ui/trend-indicator';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';
import { DollarSign, Activity, PieChart, BarChart3 } from 'lucide-react';
import { useDashboardContext } from './DashboardProvider';

export function MetricsCards() {
  const { metrics } = useDashboardContext();

  // Simplified Decimal → number conversion using Number()
  const totalValue = metrics?.totalValue ? Number(metrics.totalValue) : 0;
  const totalGain = metrics?.totalGain ? Number(metrics.totalGain) : 0;
  const totalGainPercent = metrics?.totalGainPercent || 0;
  const dayChange = metrics?.dayChange ? Number(metrics.dayChange) : 0;
  const dayChangePercent = metrics?.dayChangePercent || 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Value */}
      <Card data-testid="total-value-widget">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          <p className="text-xs text-muted-foreground">Current market value</p>
        </CardContent>
      </Card>

      {/* Total Gain/Loss */}
      <Card data-testid="gain-loss-widget">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
          <TrendIndicator value={totalGain} iconOnly />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', getTrendColorClass(totalGain))}>
            {totalGain >= 0 ? '+' : ''}
            {formatCurrency(totalGain)}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatPercentage(totalGainPercent)} from cost basis
          </p>
        </CardContent>
      </Card>

      {/* Day Change */}
      <Card data-testid="day-change-widget">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Day Change</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={cn('text-2xl font-bold', getTrendColorClass(dayChange))}>
            {dayChange >= 0 ? '+' : ''}
            {formatCurrency(dayChange)}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatPercentage(dayChangePercent)} from yesterday
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <Button size="sm" variant="outline" className="w-full justify-start">
            <TrendIndicator value={1} size="sm" iconOnly className="mr-2 text-muted-foreground" />
            View Analytics
          </Button>
          <Button size="sm" variant="outline" className="w-full justify-start">
            <PieChart className="h-4 w-4 mr-2" />
            Rebalance
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
