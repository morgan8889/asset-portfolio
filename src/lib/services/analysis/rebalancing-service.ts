/**
 * Rebalancing Service
 *
 * Calculates target drift and generates rebalancing actions.
 */

import Decimal from 'decimal.js';

import {
  TargetModel,
  RebalanceAction,
  RebalancingPlan,
  RebalanceActionType,
} from '@/types/analysis';
import { AssetType } from '@/types/portfolio';
import { Holding, Asset } from '@/types';

interface RebalancingInput {
  holdings: Holding[];
  assets: Asset[];
  totalValue: Decimal;
  targetModel: TargetModel;
}

/**
 * Calculate rebalancing plan
 *
 * Compares current portfolio allocation with target model and generates
 * specific buy/sell/hold actions to rebalance the portfolio.
 *
 * @param input - Rebalancing input containing holdings, assets, and target model
 * @returns Rebalancing plan with actions sorted by drift magnitude
 * @throws Error if target model allocations don't sum to 100%
 */
export function calculateRebalancing(input: RebalancingInput): RebalancingPlan {
  const { holdings, assets, totalValue, targetModel } = input;

  // Validate target model first
  if (!validateTargetModel(targetModel)) {
    throw new Error('Invalid target model: allocations must sum to 100%');
  }

  // Calculate current allocation by asset type
  const currentAllocation = calculateCurrentAllocation(holdings, assets);

  // Generate rebalancing actions
  const actions: RebalanceAction[] = [];
  let totalBuyAmount = new Decimal(0);
  let totalSellAmount = new Decimal(0);

  // Iterate through all asset types in the target model
  const allAssetTypes = new Set([
    ...Object.keys(targetModel.allocations),
    ...Object.keys(currentAllocation),
  ]);

  for (const assetType of allAssetTypes) {
    const type = assetType as AssetType;
    const targetPercent = targetModel.allocations[type] || 0;
    const currentValue = currentAllocation[type] || new Decimal(0);
    const currentPercent = totalValue.isZero()
      ? 0
      : currentValue.div(totalValue).mul(100).toNumber();

    const differencePercent = targetPercent - currentPercent;
    const targetValue = totalValue.mul(targetPercent).div(100);
    const amount = targetValue.minus(currentValue).abs();

    let action: RebalanceActionType;
    if (Math.abs(differencePercent) < 0.5) {
      action = 'hold';
    } else if (differencePercent > 0) {
      action = 'buy';
      totalBuyAmount = totalBuyAmount.plus(amount);
    } else {
      action = 'sell';
      totalSellAmount = totalSellAmount.plus(amount);
    }

    actions.push({
      assetType: type,
      assetTypeName: getAssetTypeName(type),
      currentValue,
      currentPercent,
      targetPercent,
      differencePercent,
      action,
      amount,
    });
  }

  // Sort actions by absolute difference (largest drift first)
  actions.sort(
    (a, b) => Math.abs(b.differencePercent) - Math.abs(a.differencePercent)
  );

  return {
    targetModel,
    portfolioValue: totalValue,
    actions,
    totalBuyAmount,
    totalSellAmount,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate current allocation by asset type
 */
function calculateCurrentAllocation(
  holdings: Holding[],
  assets: Asset[]
): Partial<Record<AssetType, Decimal>> {
  const allocation: Partial<Record<AssetType, Decimal>> = {};
  const missingAssets: string[] = [];

  for (const holding of holdings) {
    const asset = assets.find((a) => a.id === holding.assetId);
    if (!asset) {
      missingAssets.push(holding.assetId);
      continue;
    }

    const type = asset.type;
    allocation[type] = (allocation[type] || new Decimal(0)).plus(
      holding.currentValue
    );
  }

  // Log warning if assets are missing
  if (missingAssets.length > 0) {
    console.warn(
      '[Rebalancing Service] Missing asset data for holdings:',
      missingAssets
    );
  }

  return allocation;
}

/**
 * Get human-readable asset type name
 */
function getAssetTypeName(type: AssetType): string {
  const names: Record<AssetType, string> = {
    stock: 'Stocks',
    etf: 'ETFs',
    crypto: 'Cryptocurrency',
    bond: 'Bonds',
    real_estate: 'Real Estate',
    commodity: 'Commodities',
    cash: 'Cash',
    index: 'Index Funds',
    other: 'Other',
  };
  return names[type] || type;
}

/**
 * Validate target model allocations sum to 100%
 *
 * @param model - Target model to validate
 * @returns true if allocations sum to 100% (within 0.01% tolerance for floating-point errors)
 */
export function validateTargetModel(model: TargetModel): boolean {
  const total = Object.values(model.allocations).reduce(
    (sum, percent) => sum + percent,
    0
  );

  // Allow small floating point errors
  return Math.abs(total - 100) < 0.01;
}

/**
 * Normalize target model to ensure allocations sum to exactly 100%
 *
 * Adjusts all allocations proportionally to sum to exactly 100%.
 * Useful for fixing rounding errors in custom target models.
 *
 * @param model - Target model to normalize
 * @returns Normalized target model with allocations summing to 100%
 */
export function normalizeTargetModel(model: TargetModel): TargetModel {
  const total = Object.values(model.allocations).reduce(
    (sum, percent) => sum + percent,
    0
  );

  if (Math.abs(total - 100) < 0.01) {
    return model;
  }

  const normalized = { ...model };
  const factor = 100 / total;

  normalized.allocations = Object.entries(model.allocations).reduce(
    (acc, [type, percent]) => {
      acc[type as AssetType] = percent * factor;
      return acc;
    },
    {} as Record<AssetType, number>
  );

  return normalized;
}
