'use client';

/**
 * Performance Analytics Page
 *
 * Main page for viewing portfolio performance with interactive charts,
 * summary statistics, and holding breakdown.
 *
 * @module app/(dashboard)/performance/page
 */

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PerformanceChart } from '@/components/charts/performance-chart';
import {
  PeriodSelector,
  SummaryStats,
  HoldingsBreakdown,
  ExportButton,
  BenchmarkSelector,
} from '@/components/performance';
import { usePerformanceStore } from '@/lib/stores/performance';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { getHoldingPerformance } from '@/lib/services/performance-analytics';
import { getSupportedBenchmarks } from '@/lib/services/benchmark-service';

export default function PerformancePage() {
  const {
    summary,
    chartData,
    holdingPerformance,
    benchmarkComparison,
    selectedPeriod,
    showBenchmark,
    selectedBenchmark,
    isLoading,
    error,
    setPeriod,
    toggleBenchmark,
    setBenchmark,
    loadPerformanceData,
    refresh,
  } = usePerformanceStore();

  const supportedBenchmarks = getSupportedBenchmarks();

  const { currentPortfolio } = usePortfolioStore();

  // Load performance data when portfolio changes
  useEffect(() => {
    if (currentPortfolio) {
      loadPerformanceData(currentPortfolio.id);
    }
  }, [currentPortfolio, loadPerformanceData]);

  // Load holding performance separately
  useEffect(() => {
    async function loadHoldings() {
      if (currentPortfolio) {
        const holdings = await getHoldingPerformance(currentPortfolio.id, selectedPeriod);
        usePerformanceStore.setState({ holdingPerformance: holdings });
      }
    }
    loadHoldings();
  }, [currentPortfolio, selectedPeriod]);

  const handleRefresh = () => {
    if (currentPortfolio) {
      refresh(currentPortfolio.id);
    }
  };

  // No portfolio selected state
  if (!currentPortfolio) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground">
            Select a portfolio to view performance analytics.
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No portfolio selected</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground">
            Track your portfolio performance with detailed metrics and analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={setPeriod}
            disabled={isLoading}
          />
          <BenchmarkSelector
            selectedBenchmark={selectedBenchmark}
            benchmarks={supportedBenchmarks}
            isEnabled={showBenchmark}
            onBenchmarkChange={setBenchmark}
            onToggle={toggleBenchmark}
            isLoading={isLoading}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ExportButton portfolioId={currentPortfolio.id} disabled={isLoading} />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Summary Statistics */}
      <SummaryStats
        summary={summary}
        benchmarkComparison={showBenchmark ? benchmarkComparison : null}
        isLoading={isLoading}
      />

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Value Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[400px] w-full" />
          ) : chartData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p>No performance data available</p>
                <p className="text-sm mt-1">
                  Add transactions to start tracking performance
                </p>
              </div>
            </div>
          ) : (
            <PerformanceChart
              data={chartData}
              period={selectedPeriod}
              height={400}
              showReferenceLine={true}
              showBenchmark={showBenchmark}
            />
          )}
        </CardContent>
      </Card>

      {/* Holdings Performance Table */}
      <HoldingsBreakdown holdings={holdingPerformance} isLoading={isLoading} />
    </div>
  );
}
