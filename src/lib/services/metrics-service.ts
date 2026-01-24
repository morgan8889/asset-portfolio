/**
 * Metrics Service
 *
 * Provides pure calculation functions for portfolio and holdings metrics.
 * All functions are stateless and operate on input data.
 */

import { Decimal } from 'decimal.js';
import {
  Holding,
  Asset,
  PortfolioMetrics,
  AllocationBreakdown,
  PerformanceMetrics,
  AssetType,
} from '@/types';

export interface HoldingWithAsset {
  holding: Holding;
  asset: Asset | undefined;
}

/**
 * Calculate total portfolio value from holdings
 */
export function calculateTotalValue(holdings: Holding[]): Decimal {
  return holdings.reduce(
    (sum, holding) => sum.plus(holding.currentValue),
    new Decimal(0)
  );
}

/**
 * Calculate total cost basis from holdings
 */
export function calculateTotalCost(holdings: Holding[]): Decimal {
  return holdings.reduce(
    (sum, holding) => sum.plus(holding.costBasis),
    new Decimal(0)
  );
}

/**
 * Calculate total unrealized gain/loss
 */
export function calculateTotalGain(holdings: Holding[]): Decimal {
  return holdings.reduce(
    (sum, holding) => sum.plus(holding.unrealizedGain),
    new Decimal(0)
  );
}

/**
 * Calculate gain percentage
 */
export function calculateGainPercent(totalGain: Decimal, totalCost: Decimal): number {
  if (totalCost.isZero()) return 0;
  return totalGain.dividedBy(totalCost).mul(100).toNumber();
}

/**
 * Calculate allocation breakdown by asset type
 */
export function calculateAllocationByType(
  holdingsWithAssets: HoldingWithAsset[],
  totalValue: Decimal
): AllocationBreakdown[] {
  const allocationMap = new Map<AssetType, Decimal>();

  for (const { holding, asset } of holdingsWithAssets) {
    const assetType = asset?.type || 'other';
    const currentValue = allocationMap.get(assetType) || new Decimal(0);
    allocationMap.set(assetType, currentValue.plus(holding.currentValue));
  }

  const allocations: AllocationBreakdown[] = [];
  for (const [type, value] of allocationMap) {
    const percent = totalValue.isZero()
      ? 0
      : value.dividedBy(totalValue).mul(100).toNumber();

    allocations.push({
      type,
      value,
      percent,
    });
  }

  // Sort by value descending
  return allocations.sort((a, b) => b.value.minus(a.value).toNumber());
}

/**
 * Calculate individual holding allocation
 */
export function calculateHoldingAllocation(
  holdings: Holding[],
  totalValue: Decimal
): Array<{ holdingId: string; percent: number }> {
  return holdings.map((holding) => ({
    holdingId: holding.id,
    percent: totalValue.isZero()
      ? 0
      : holding.currentValue.dividedBy(totalValue).mul(100).toNumber(),
  }));
}

/**
 * Calculate day change (requires previous day's values)
 */
export function calculateDayChange(
  currentValue: Decimal,
  previousValue: Decimal
): { change: Decimal; changePercent: number } {
  const change = currentValue.minus(previousValue);
  const changePercent = previousValue.isZero()
    ? 0
    : change.dividedBy(previousValue).mul(100).toNumber();

  return { change, changePercent };
}

/**
 * Calculate basic performance metrics
 * Note: Advanced metrics require historical price data
 */
export function calculateBasicPerformance(
  totalGainPercent: number,
  _holdings: Holding[]
): PerformanceMetrics {
  return {
    roi: totalGainPercent,
    annualizedReturn: 0, // Requires historical data
    volatility: 0, // Requires historical data
    sharpeRatio: 0, // Requires historical data and risk-free rate
    maxDrawdown: 0, // Requires historical data
  };
}

/**
 * Calculate full portfolio metrics
 */
export function calculatePortfolioMetrics(
  holdingsWithAssets: HoldingWithAsset[],
  previousTotalValue?: Decimal
): PortfolioMetrics {
  const holdings = holdingsWithAssets.map((h) => h.holding);

  const totalValue = calculateTotalValue(holdings);
  const totalCost = calculateTotalCost(holdings);
  const totalGain = calculateTotalGain(holdings);
  const totalGainPercent = calculateGainPercent(totalGain, totalCost);

  const allocation = calculateAllocationByType(holdingsWithAssets, totalValue);
  const performance = calculateBasicPerformance(totalGainPercent, holdings);

  let dayChange = new Decimal(0);
  let dayChangePercent = 0;
  if (previousTotalValue) {
    const dayChangeResult = calculateDayChange(totalValue, previousTotalValue);
    dayChange = dayChangeResult.change;
    dayChangePercent = dayChangeResult.changePercent;
  }

  return {
    totalValue,
    totalCost,
    totalGain,
    totalGainPercent,
    dayChange,
    dayChangePercent,
    allocation,
    performance,
  };
}

/**
 * Calculate rebalancing needs
 */
export function calculateRebalancingNeeds(
  allocation: AllocationBreakdown[],
  targetAllocations: Map<AssetType, number>,
  totalValue: Decimal
): Array<{
  type: AssetType;
  currentPercent: number;
  targetPercent: number;
  drift: number;
  adjustmentValue: Decimal;
}> {
  return allocation.map((item) => {
    const targetPercent = targetAllocations.get(item.type) || 0;
    const drift = item.percent - targetPercent;
    const adjustmentPercent = targetPercent - item.percent;
    const adjustmentValue = totalValue.mul(adjustmentPercent / 100);

    return {
      type: item.type,
      currentPercent: item.percent,
      targetPercent,
      drift,
      adjustmentValue,
    };
  });
}

/**
 * Calculate weighted average cost
 */
export function calculateWeightedAverageCost(
  quantity: Decimal,
  costBasis: Decimal
): Decimal {
  if (quantity.isZero()) return new Decimal(0);
  return costBasis.dividedBy(quantity);
}

/**
 * Calculate position weight in portfolio
 */
export function calculatePositionWeight(
  positionValue: Decimal,
  totalPortfolioValue: Decimal
): number {
  if (totalPortfolioValue.isZero()) return 0;
  return positionValue.dividedBy(totalPortfolioValue).mul(100).toNumber();
}

/**
 * Calculate gain/loss for a position
 */
export function calculatePositionGainLoss(
  currentValue: Decimal,
  costBasis: Decimal
): { gain: Decimal; gainPercent: number } {
  const gain = currentValue.minus(costBasis);
  const gainPercent = costBasis.isZero()
    ? 0
    : gain.dividedBy(costBasis).mul(100).toNumber();

  return { gain, gainPercent };
}

/**
 * Calculate dividend yield
 */
export function calculateDividendYield(
  annualDividend: Decimal,
  currentPrice: Decimal
): number {
  if (currentPrice.isZero()) return 0;
  return annualDividend.dividedBy(currentPrice).mul(100).toNumber();
}
