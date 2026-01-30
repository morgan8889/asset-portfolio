import Decimal from 'decimal.js';
import { Holding, Asset, AssetType } from '@/types';
import {
  AllocationBreakdown,
  AllocationData,
  AllocationDimension,
  RebalancingPlan,
  RebalancingItem,
  RebalancingAction,
} from '@/types/allocation';

export interface HoldingWithAsset {
  holding: Holding;
  asset: Asset;
}

/**
 * Calculate current allocation breakdown by dimension
 */
export function calculateCurrentAllocation(
  holdingsWithAssets: HoldingWithAsset[],
  dimension: AllocationDimension,
  excludedPortfolioIds: string[] = []
): AllocationData {
  // Filter out excluded portfolios
  const includedHoldings = holdingsWithAssets.filter(
    (h) => !excludedPortfolioIds.includes(h.holding.portfolioId)
  );

  // Group holdings by category
  const categoryMap = new Map<string, { value: Decimal; count: number }>();

  for (const { holding, asset } of includedHoldings) {
    const category = getCategoryForDimension(asset, dimension);

    if (!categoryMap.has(category)) {
      categoryMap.set(category, { value: new Decimal(0), count: 0 });
    }

    const current = categoryMap.get(category)!;
    current.value = current.value.plus(holding.currentValue);
    current.count += 1;
  }

  // Calculate total value
  const totalValue = Array.from(categoryMap.values()).reduce(
    (sum, cat) => sum.plus(cat.value),
    new Decimal(0)
  );

  // Handle negative cash (margin) netting
  if (dimension === 'assetClass' && categoryMap.has('Cash')) {
    const cashData = categoryMap.get('Cash')!;
    // If cash value is negative, it represents margin
    if (cashData.value.isNegative()) {
      // For visualization, we can either:
      // 1. Show as separate "Margin" category
      // 2. Net it against total (reduce total value)
      // Per spec, we net it for clarity
      categoryMap.set('Cash', {
        value: cashData.value, // Keep negative for calculations
        count: cashData.count,
      });
    }
  }

  // Build breakdown
  const breakdown: AllocationBreakdown[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category,
      value: data.value.toString(),
      percentage: totalValue.isZero()
        ? 0
        : data.value.dividedBy(totalValue).mul(100).toNumber(),
      count: data.count,
    }))
    .sort((a, b) => new Decimal(b.value).minus(a.value).toNumber());

  // Check for unclassified assets
  const hasUnclassified = breakdown.some(
    (item) => item.category === 'Unclassified'
  );

  return {
    dimension,
    breakdown,
    totalValue: totalValue.toString(),
    hasUnclassified,
  };
}

/**
 * Get category value for an asset based on dimension
 */
function getCategoryForDimension(
  asset: Asset,
  dimension: AllocationDimension
): string {
  switch (dimension) {
    case 'assetClass':
      return asset.type || 'Unclassified';
    case 'sector':
      return asset.sector || 'Unclassified';
    case 'region':
      return asset.region || 'Unclassified';
    default:
      return 'Unclassified';
  }
}

/**
 * Calculate rebalancing plan based on target model
 */
export function calculateRebalancingPlan(
  holdingsWithAssets: HoldingWithAsset[],
  targetModelName: string,
  targets: Record<string, number>, // Category -> Target %
  dimension: AllocationDimension = 'assetClass',
  excludedPortfolioIds: string[] = []
): RebalancingPlan {
  // Get current allocation
  const currentAllocation = calculateCurrentAllocation(
    holdingsWithAssets,
    dimension,
    excludedPortfolioIds
  );

  const totalValue = new Decimal(currentAllocation.totalValue);

  // Validate targets sum to 100%
  const targetSum = Object.values(targets).reduce((sum, pct) => sum + pct, 0);
  if (Math.abs(targetSum - 100) > 0.01) {
    throw new Error(
      `Target percentages must sum to 100%. Current sum: ${targetSum.toFixed(2)}%`
    );
  }

  // Build rebalancing items
  const items: RebalancingItem[] = [];

  // Get all categories (union of current and target)
  const allCategories = new Set([
    ...currentAllocation.breakdown.map((b) => b.category),
    ...Object.keys(targets),
  ]);

  for (const category of allCategories) {
    const currentBreakdown = currentAllocation.breakdown.find(
      (b) => b.category === category
    );
    const currentValue = currentBreakdown
      ? new Decimal(currentBreakdown.value)
      : new Decimal(0);
    const currentPercent = currentBreakdown?.percentage || 0;
    const targetPercent = targets[category] || 0;

    // Calculate drift and amount
    const driftPercent = currentPercent - targetPercent;
    const targetValue = totalValue.mul(targetPercent).dividedBy(100);
    const amount = targetValue.minus(currentValue);

    // Determine action
    let action: RebalancingAction;
    if (amount.abs().lessThan(0.01)) {
      action = 'HOLD';
    } else if (amount.isPositive()) {
      action = 'BUY';
    } else {
      action = 'SELL';
    }

    items.push({
      category,
      currentValue: currentValue.toString(),
      currentPercent,
      targetPercent,
      driftPercent,
      action,
      amount: amount.abs().toString(),
    });
  }

  // Sort by absolute drift (largest first)
  items.sort((a, b) => Math.abs(b.driftPercent) - Math.abs(a.driftPercent));

  return {
    totalValue: totalValue.toString(),
    targetModelName,
    items,
  };
}

/**
 * Calculate tax-efficient rebalancing plan (uses available cash first)
 */
export function calculateTaxEfficientRebalancingPlan(
  holdingsWithAssets: HoldingWithAsset[],
  targetModelName: string,
  targets: Record<string, number>,
  dimension: AllocationDimension = 'assetClass',
  excludedPortfolioIds: string[] = []
): RebalancingPlan {
  // Get basic rebalancing plan
  const plan = calculateRebalancingPlan(
    holdingsWithAssets,
    targetModelName,
    targets,
    dimension,
    excludedPortfolioIds
  );

  // Calculate available cash
  const cashItem = plan.items.find((item) => item.category === 'Cash');
  const availableCash = cashItem
    ? new Decimal(cashItem.currentValue)
    : new Decimal(0);

  // If we have cash, prioritize using it to buy underweight assets
  if (availableCash.isPositive()) {
    let remainingCash = availableCash;

    // First, allocate cash to BUY items
    for (const item of plan.items) {
      if (item.action === 'BUY' && remainingCash.isPositive()) {
        const buyAmount = new Decimal(item.amount);
        const cashToUse = Decimal.min(buyAmount, remainingCash);

        // Update item (reduce buy amount needed from sales)
        item.amount = buyAmount.minus(cashToUse).toString();
        if (new Decimal(item.amount).lessThan(0.01)) {
          item.action = 'HOLD';
          item.amount = '0';
        }

        remainingCash = remainingCash.minus(cashToUse);
      }
    }

    // Update Cash item to reflect usage
    if (cashItem) {
      const cashUsed = availableCash.minus(remainingCash);
      cashItem.currentValue = remainingCash.toString();
      if (cashUsed.greaterThan(0)) {
        cashItem.action = 'SELL';
        cashItem.amount = cashUsed.toString();
      }
    }
  }

  return plan;
}
