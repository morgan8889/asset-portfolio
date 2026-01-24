/**
 * Metrics Service
 *
 * Pure calculation functions for portfolio and holdings metrics.
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

// =============================================================================
// Core Calculation Helpers
// =============================================================================

/**
 * Sum a Decimal field across holdings.
 */
function sumHoldings(holdings: Holding[], field: keyof Pick<Holding, 'currentValue' | 'costBasis' | 'unrealizedGain'>): Decimal {
  return holdings.reduce((sum, h) => sum.plus(h[field]), new Decimal(0));
}

/**
 * Calculate percentage with division-by-zero safety.
 */
function safePercent(numerator: Decimal, denominator: Decimal): number {
  return denominator.isZero() ? 0 : numerator.dividedBy(denominator).mul(100).toNumber();
}

// =============================================================================
// Portfolio Totals
// =============================================================================

export function calculateTotalValue(holdings: Holding[]): Decimal {
  return sumHoldings(holdings, 'currentValue');
}

export function calculateTotalCost(holdings: Holding[]): Decimal {
  return sumHoldings(holdings, 'costBasis');
}

export function calculateTotalGain(holdings: Holding[]): Decimal {
  return sumHoldings(holdings, 'unrealizedGain');
}

export function calculateGainPercent(totalGain: Decimal, totalCost: Decimal): number {
  return safePercent(totalGain, totalCost);
}

// =============================================================================
// Allocation Calculations
// =============================================================================

export function calculateAllocationByType(
  holdingsWithAssets: HoldingWithAsset[],
  totalValue: Decimal
): AllocationBreakdown[] {
  const allocationMap = new Map<AssetType, Decimal>();

  for (const { holding, asset } of holdingsWithAssets) {
    const assetType = asset?.type || 'other';
    const current = allocationMap.get(assetType) || new Decimal(0);
    allocationMap.set(assetType, current.plus(holding.currentValue));
  }

  return Array.from(allocationMap.entries())
    .map(([type, value]) => ({
      type,
      value,
      percent: safePercent(value, totalValue),
    }))
    .sort((a, b) => b.value.minus(a.value).toNumber());
}

export function calculateHoldingAllocation(
  holdings: Holding[],
  totalValue: Decimal
): Array<{ holdingId: string; percent: number }> {
  return holdings.map((h) => ({
    holdingId: h.id,
    percent: safePercent(h.currentValue, totalValue),
  }));
}

// =============================================================================
// Change Calculations
// =============================================================================

export function calculateDayChange(
  currentValue: Decimal,
  previousValue: Decimal
): { change: Decimal; changePercent: number } {
  const change = currentValue.minus(previousValue);
  return { change, changePercent: safePercent(change, previousValue) };
}

// =============================================================================
// Performance Calculations
// =============================================================================

export function calculateBasicPerformance(
  totalGainPercent: number,
  _holdings: Holding[]
): PerformanceMetrics {
  // Advanced metrics require historical data
  return {
    roi: totalGainPercent,
    annualizedReturn: 0,
    volatility: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
  };
}

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

  const { change: dayChange, changePercent: dayChangePercent } = previousTotalValue
    ? calculateDayChange(totalValue, previousTotalValue)
    : { change: new Decimal(0), changePercent: 0 };

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

// =============================================================================
// Rebalancing
// =============================================================================

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
    const adjustmentValue = totalValue.mul((targetPercent - item.percent) / 100);

    return {
      type: item.type,
      currentPercent: item.percent,
      targetPercent,
      drift,
      adjustmentValue,
    };
  });
}

// =============================================================================
// Position-Level Calculations
// =============================================================================

export function calculateWeightedAverageCost(quantity: Decimal, costBasis: Decimal): Decimal {
  return quantity.isZero() ? new Decimal(0) : costBasis.dividedBy(quantity);
}

export function calculatePositionWeight(positionValue: Decimal, totalPortfolioValue: Decimal): number {
  return safePercent(positionValue, totalPortfolioValue);
}

export function calculatePositionGainLoss(
  currentValue: Decimal,
  costBasis: Decimal
): { gain: Decimal; gainPercent: number } {
  const gain = currentValue.minus(costBasis);
  return { gain, gainPercent: safePercent(gain, costBasis) };
}

export function calculateDividendYield(annualDividend: Decimal, currentPrice: Decimal): number {
  return safePercent(annualDividend, currentPrice);
}
