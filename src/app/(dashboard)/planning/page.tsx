'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { usePlanningStore } from '@/lib/stores/planning';
import { LiabilityManager } from '@/components/planning/liability-manager';
import { NetWorthChart } from '@/components/planning/net-worth-chart';
import { GoalInputForm } from '@/components/planning/goal-input-form';
import { FireProjectionChart } from '@/components/planning/fire-projection-chart';
import { ScenarioControls } from '@/components/planning/scenario-controls';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  getNetWorthHistory,
  getCurrentNetWorth,
} from '@/lib/services/planning/net-worth-service';
import {
  generateFireProjection,
  calculateFireMetrics,
} from '@/lib/services/planning/fire-projection';
import { subYears } from 'date-fns';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function PlanningPage() {
  const { currentPortfolio } = usePortfolioStore();
  const {
    fireConfig,
    scenarios,
    netWorthHistory,
    setNetWorthHistory,
    fireProjection,
    setFireProjection,
    fireCalculation,
    setFireCalculation,
    loadLiabilities,
  } = usePlanningStore();

  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1Y' | '3Y' | '5Y' | 'ALL'>('5Y');

  const loadNetWorthHistory = useCallback(async () => {
    if (!currentPortfolio) return;

    try {
      const endDate = new Date();
      let startDate: Date;

      switch (timeRange) {
        case '1Y':
          startDate = subYears(endDate, 1);
          break;
        case '3Y':
          startDate = subYears(endDate, 3);
          break;
        case '5Y':
          startDate = subYears(endDate, 5);
          break;
        case 'ALL':
          // Go back 10 years for "ALL"
          startDate = subYears(endDate, 10);
          break;
        default:
          startDate = subYears(endDate, 5);
      }

      const history = await getNetWorthHistory(
        currentPortfolio.id,
        startDate,
        endDate
      );
      setNetWorthHistory(history);
    } catch (error) {
      console.error('Failed to load net worth history:', error);
    }
  }, [currentPortfolio, timeRange, setNetWorthHistory]);

  const updateProjection = useCallback(async () => {
    if (!currentPortfolio) return;

    try {
      const currentNetWorth = await getCurrentNetWorth(currentPortfolio.id);

      const projection = generateFireProjection(
        currentNetWorth,
        fireConfig,
        scenarios
      );
      setFireProjection(projection);

      const calculation = calculateFireMetrics(
        currentNetWorth,
        fireConfig,
        scenarios
      );
      setFireCalculation(calculation);
    } catch (error) {
      console.error('Failed to update projection:', error);
    }
  }, [currentPortfolio, fireConfig, scenarios, setFireProjection, setFireCalculation]);

  const loadData = useCallback(async () => {
    if (!currentPortfolio) return;

    setIsLoading(true);
    try {
      await loadLiabilities(currentPortfolio.id);
      await loadNetWorthHistory();
    } catch (error) {
      console.error('Failed to load planning data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPortfolio, loadLiabilities, loadNetWorthHistory]);

  useEffect(() => {
    if (currentPortfolio) {
      loadData();
    }
  }, [currentPortfolio, loadData]);

  useEffect(() => {
    if (currentPortfolio) {
      loadNetWorthHistory();
    }
  }, [currentPortfolio, timeRange, loadNetWorthHistory]);

  useEffect(() => {
    if (currentPortfolio && netWorthHistory.length > 0) {
      updateProjection();
    }
  }, [currentPortfolio, fireConfig, scenarios, netWorthHistory, updateProjection]);

  if (!currentPortfolio) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold">No Active Portfolio</p>
          <p className="text-sm text-muted-foreground">
            Please select a portfolio to view planning features
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Financial Planning</h1>
            <p className="text-muted-foreground">
              Track your net worth and plan your path to Financial Independence
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="timeRange" className="text-sm">
              Time Range:
            </Label>
            <Select
              value={timeRange}
              onValueChange={(value: '1Y' | '3Y' | '5Y' | 'ALL') =>
                setTimeRange(value)
              }
            >
              <SelectTrigger id="timeRange" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1Y">1 Year</SelectItem>
                <SelectItem value="3Y">3 Years</SelectItem>
                <SelectItem value="5Y">5 Years</SelectItem>
                <SelectItem value="ALL">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Net Worth Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Net Worth History</h2>
          <div className="grid gap-6">
            <NetWorthChart data={netWorthHistory} />
            <LiabilityManager portfolioId={currentPortfolio.id} />
          </div>
        </section>

        {/* FIRE Planning Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">FIRE Planning</h2>
          <div className="grid gap-6">
            <GoalInputForm />
            <FireProjectionChart
              projection={fireProjection}
              fireCalculation={fireCalculation}
            />
          </div>
        </section>

        {/* Scenarios Section */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">What-If Analysis</h2>
          <ScenarioControls />
        </section>
      </div>
    </ErrorBoundary>
  );
}
