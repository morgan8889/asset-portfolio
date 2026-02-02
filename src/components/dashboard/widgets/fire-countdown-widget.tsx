'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, TrendingUp, Calendar } from 'lucide-react';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { usePlanningStore } from '@/lib/stores/planning';
import { getCurrentNetWorth } from '@/lib/services/planning/net-worth-service';
import { calculateFireMetrics } from '@/lib/services/planning/fire-projection';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function FireCountdownWidget() {
  const { currentPortfolio } = usePortfolioStore();
  const { fireConfig, scenarios } = usePlanningStore();
  const [currentNetWorth, setCurrentNetWorth] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentPortfolio) {
      loadData();
    }
  }, [currentPortfolio]);

  const loadData = async () => {
    if (!currentPortfolio) return;

    setIsLoading(true);
    try {
      const netWorth = await getCurrentNetWorth(currentPortfolio.id);
      setCurrentNetWorth(netWorth);
    } catch (error) {
      console.error('Failed to load net worth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fireCalculation = calculateFireMetrics(
    currentNetWorth,
    fireConfig,
    scenarios.filter((s) => s.isActive)
  );

  const progressPercent = Math.min(
    (currentNetWorth / fireCalculation.fireNumber) * 100,
    100
  );

  const formatCurrency = (value: number) => {
    const currency = currentPortfolio?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Target className="h-4 w-4" />
            Path to FIRE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-20 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Target className="h-4 w-4" />
          Path to FIRE
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">
              {fireCalculation.yearsToFire === Infinity
                ? '∞'
                : fireCalculation.yearsToFire.toFixed(1)}
            </span>
            <span className="text-sm text-muted-foreground">years</span>
          </div>
          {fireCalculation.projectedFireDate && (
            <p className="text-sm text-muted-foreground">
              <Calendar className="mr-1 inline h-3 w-3" />
              {formatDate(fireCalculation.projectedFireDate)}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progressPercent.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Current</p>
            <p className="font-semibold">{formatCurrency(currentNetWorth)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Target</p>
            <p className="font-semibold">
              {formatCurrency(fireCalculation.fireNumber)}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Monthly Progress</p>
              <p className="font-semibold">
                {formatCurrency(fireCalculation.monthlyProgress)}
              </p>
            </div>
          </div>
        </div>

        <Link href="/planning" className="block">
          <Button variant="outline" className="w-full" size="sm">
            View Full Plan
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
