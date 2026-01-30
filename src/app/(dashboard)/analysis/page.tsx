'use client';

import { useEffect } from 'react';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { useAnalysisStore } from '@/lib/stores/analysis';
import { HealthScoreCard } from '@/components/analysis/health-score-card';
import { MetricBreakdown } from '@/components/analysis/metric-breakdown';
import { ProfileSelector } from '@/components/analysis/profile-selector';
import { RecommendationList } from '@/components/analysis/recommendation-list';
import { AllocationChart } from '@/components/analysis/allocation-chart';
import { TargetModelSelector } from '@/components/analysis/target-model-selector';
import { RebalancingTable } from '@/components/analysis/rebalancing-table';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export default function AnalysisPage() {
  const { currentPortfolio } = usePortfolioStore();
  const {
    health,
    recommendations,
    rebalancingPlan,
    targetModels,
    activeProfile,
    activeTargetModelId,
    isCalculating,
    calculateHealth,
    generateRecommendations,
    calculateRebalancing,
    setActiveProfile,
    setActiveTargetModel,
    loadTargetModels,
  } = useAnalysisStore();

  useEffect(() => {
    // Load target models on mount
    loadTargetModels();

    // Calculate health and recommendations if portfolio is available
    if (currentPortfolio) {
      calculateHealth(currentPortfolio.id);
      generateRecommendations(currentPortfolio.id);
    }
  }, [currentPortfolio, loadTargetModels, calculateHealth, generateRecommendations]);

  const handleProfileChange = async (profileId: string) => {
    setActiveProfile(profileId);
    if (currentPortfolio) {
      await calculateHealth(currentPortfolio.id);
    }
  };

  const handleRefresh = async () => {
    if (currentPortfolio) {
      await calculateHealth(currentPortfolio.id);
      await generateRecommendations(currentPortfolio.id);
      if (activeTargetModelId) {
        await calculateRebalancing(currentPortfolio.id, activeTargetModelId);
      }
    }
  };

  const handleModelChange = async (modelId: string) => {
    setActiveTargetModel(modelId);
    if (currentPortfolio) {
      await calculateRebalancing(currentPortfolio.id, modelId);
    }
  };

  if (!currentPortfolio) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analysis</h1>
            <p className="text-muted-foreground">
              Portfolio health scoring and recommendations
            </p>
          </div>
        </div>
        <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <p className="text-lg font-semibold">No Portfolio Selected</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Select or create a portfolio to view analysis
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analysis</h1>
          <p className="text-muted-foreground">
            Portfolio health scoring and recommendations
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isCalculating}
          variant="outline"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isCalculating ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Profile Selector */}
      <ProfileSelector
        activeProfile={activeProfile}
        onProfileChange={handleProfileChange}
      />

      {/* Health Score and Metrics */}
      <div className="grid gap-6 md:grid-cols-2">
        <HealthScoreCard health={health} isCalculating={isCalculating} />
        <MetricBreakdown health={health} />
      </div>

      {/* Recommendations */}
      <RecommendationList
        recommendations={recommendations}
        isCalculating={isCalculating}
      />

      {/* Target Model Selection */}
      <TargetModelSelector
        targetModels={targetModels}
        activeTargetModelId={activeTargetModelId}
        onModelChange={handleModelChange}
      />

      {/* Allocation Analysis */}
      {activeTargetModelId && (
        <>
          <AllocationChart
            rebalancingPlan={rebalancingPlan}
            isCalculating={isCalculating}
          />
          <RebalancingTable
            rebalancingPlan={rebalancingPlan}
            isCalculating={isCalculating}
          />
        </>
      )}
    </div>
  );
}
