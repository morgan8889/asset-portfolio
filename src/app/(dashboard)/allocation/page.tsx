'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { useAllocationStore } from '@/lib/stores/allocation';
import { AllocationChartTabs } from '@/components/allocation/allocation-chart-tabs';
import { AllocationDonutChart } from '@/components/allocation/allocation-donut-chart';
import { UnclassifiedAlert } from '@/components/allocation/unclassified-alert';
import { TargetModelEditor } from '@/components/allocation/target-model-editor';
import { RebalancingTable } from '@/components/allocation/rebalancing-table';
import { ExclusionToggle } from '@/components/allocation/exclusion-toggle';
import { calculateCurrentAllocation } from '@/lib/services/allocation/rebalancing-service';
import { AllocationDimension } from '@/types/allocation';

export default function AllocationPage() {
  const {
    currentPortfolio,
    portfolios,
    holdings,
    assets,
    loadHoldings,
  } = usePortfolioStore();

  const {
    targetModels,
    activeTargetModel,
    excludedPortfolioIds,
    rebalancingPlan,
    selectedDimension,
    loadTargetModels,
    setActiveTargetModel,
    createTarget,
    loadExclusions,
    togglePortfolioExclusion,
    setSelectedDimension,
    calculateRebalancing,
  } = useAllocationStore();

  const [showTargetEditor, setShowTargetEditor] = useState(false);
  const [showExclusions, setShowExclusions] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadTargetModels();
    loadExclusions();
  }, [loadTargetModels, loadExclusions]);

  // Load holdings when portfolio changes
  useEffect(() => {
    if (currentPortfolio) {
      loadHoldings(currentPortfolio.id);
    }
  }, [currentPortfolio, loadHoldings]);

  // Combine holdings with assets
  const holdingsWithAssets = useMemo(() => {
    return holdings
      .map((holding) => {
        const asset = assets.find((a) => a.id === holding.assetId);
        if (!asset) return null;
        return { holding, asset };
      })
      .filter((item): item is { holding: typeof holdings[0]; asset: typeof assets[0] } => item !== null);
  }, [holdings, assets]);

  // Calculate current allocation for each dimension
  const assetClassAllocation = useMemo(() => {
    if (holdingsWithAssets.length === 0) return null;
    return calculateCurrentAllocation(
      holdingsWithAssets,
      'assetClass',
      excludedPortfolioIds
    );
  }, [holdingsWithAssets, excludedPortfolioIds]);

  const sectorAllocation = useMemo(() => {
    if (holdingsWithAssets.length === 0) return null;
    return calculateCurrentAllocation(
      holdingsWithAssets,
      'sector',
      excludedPortfolioIds
    );
  }, [holdingsWithAssets, excludedPortfolioIds]);

  const regionAllocation = useMemo(() => {
    if (holdingsWithAssets.length === 0) return null;
    return calculateCurrentAllocation(
      holdingsWithAssets,
      'region',
      excludedPortfolioIds
    );
  }, [holdingsWithAssets, excludedPortfolioIds]);

  // Get current allocation based on selected dimension
  const currentAllocation = useMemo(() => {
    switch (selectedDimension) {
      case 'assetClass':
        return assetClassAllocation;
      case 'sector':
        return sectorAllocation;
      case 'region':
        return regionAllocation;
      default:
        return assetClassAllocation;
    }
  }, [selectedDimension, assetClassAllocation, sectorAllocation, regionAllocation]);

  // Get unclassified count for current dimension
  const unclassifiedCount = useMemo(() => {
    if (!currentAllocation) return 0;
    const unclassified = currentAllocation.breakdown.find(
      (b) => b.category === 'Unclassified'
    );
    return unclassified?.count || 0;
  }, [currentAllocation]);

  // Available categories for target editor
  const availableCategories = useMemo(() => {
    if (!currentAllocation) return [];
    return currentAllocation.breakdown
      .filter((b) => b.category !== 'Unclassified')
      .map((b) => b.category);
  }, [currentAllocation]);

  // Recalculate rebalancing when inputs change
  useEffect(() => {
    if (activeTargetModel && holdingsWithAssets.length > 0) {
      calculateRebalancing(holdingsWithAssets, selectedDimension);
    }
  }, [activeTargetModel, holdingsWithAssets, selectedDimension, excludedPortfolioIds, calculateRebalancing]);

  // Handle dimension change
  const handleDimensionChange = (dimension: AllocationDimension) => {
    setSelectedDimension(dimension);
  };

  // Handle target model save
  const handleSaveTarget = async (name: string, targets: Record<string, number>) => {
    await createTarget(name, targets);
    setShowTargetEditor(false);
  };

  // Handle drill-down (T016)
  const handleCategoryClick = (category: string) => {
    // For now, just log - in the future this could drill down to show sector breakdown
    console.log('Category clicked:', category);
    // TODO: Implement hierarchical drill-down
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Asset Allocation</h1>
          <p className="text-muted-foreground">
            View and manage your portfolio allocation and rebalancing strategy.
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={showExclusions} onOpenChange={setShowExclusions}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Exclusions
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Portfolio Exclusions</DialogTitle>
              </DialogHeader>
              <ExclusionToggle
                portfolios={portfolios}
                excludedPortfolioIds={excludedPortfolioIds}
                onToggle={togglePortfolioExclusion}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showTargetEditor} onOpenChange={setShowTargetEditor}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Target
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Target Model</DialogTitle>
              </DialogHeader>
              <TargetModelEditor
                availableCategories={availableCategories}
                onSave={handleSaveTarget}
                onCancel={() => setShowTargetEditor(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Unclassified Alert */}
      {currentAllocation?.hasUnclassified && (
        <UnclassifiedAlert count={unclassifiedCount} dimension={selectedDimension} />
      )}

      {/* Target Model Selector */}
      {targetModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Target Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={activeTargetModel?.id || ''}
              onValueChange={(value) => {
                const model = targetModels.find((m) => m.id === value);
                setActiveTargetModel(model || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a target model" />
              </SelectTrigger>
              <SelectContent>
                {targetModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Current Allocation Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Current Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          <AllocationChartTabs
            selectedDimension={selectedDimension}
            onDimensionChange={handleDimensionChange}
            assetClassChart={
              assetClassAllocation ? (
                <AllocationDonutChart
                  data={assetClassAllocation}
                  onCategoryClick={handleCategoryClick}
                />
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No asset class data available
                </div>
              )
            }
            sectorChart={
              sectorAllocation ? (
                <AllocationDonutChart
                  data={sectorAllocation}
                  onCategoryClick={handleCategoryClick}
                />
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No sector data available
                </div>
              )
            }
            regionChart={
              regionAllocation ? (
                <AllocationDonutChart
                  data={regionAllocation}
                  onCategoryClick={handleCategoryClick}
                />
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No region data available
                </div>
              )
            }
          />
        </CardContent>
      </Card>

      {/* Rebalancing Plan */}
      <RebalancingTable plan={rebalancingPlan} />
    </div>
  );
}
