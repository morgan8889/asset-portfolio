/**
 * Portfolio Service
 *
 * Business logic for portfolio-level operations including
 * summary calculations, rebalancing suggestions, and portfolio analysis.
 */

import { Decimal } from 'decimal.js';
import {
  Portfolio,
  Holding,
  Asset,
  Transaction,
  PortfolioMetrics,
  RebalancingPlan,
  RebalancingSuggestion,
  TaxImplication,
  AllocationTarget,
  AssetType,
} from '@/types';
import {
  calculatePortfolioMetrics,
  calculateAllocationByType,
  calculateTotalValue,
  HoldingWithAsset,
} from './metrics-service';
import { calculateSaleAllocations } from './holdings-service';

/**
 * Portfolio summary for quick display
 */
export interface PortfolioSummary {
  totalValue: Decimal;
  totalCost: Decimal;
  totalGain: Decimal;
  totalGainPercent: number;
  holdingsCount: number;
  topHoldings: Array<{
    assetId: string;
    symbol: string;
    name: string;
    value: Decimal;
    percent: number;
  }>;
}

/**
 * Calculate portfolio summary
 */
export function calculatePortfolioSummary(
  holdings: Holding[],
  assets: Asset[],
  topCount: number = 5
): PortfolioSummary {
  const assetMap = new Map(assets.map((a) => [a.id, a]));

  const totalValue = holdings.reduce(
    (sum, h) => sum.plus(h.currentValue),
    new Decimal(0)
  );

  const totalCost = holdings.reduce(
    (sum, h) => sum.plus(h.costBasis),
    new Decimal(0)
  );

  const totalGain = totalValue.minus(totalCost);
  const totalGainPercent = totalCost.isZero()
    ? 0
    : totalGain.dividedBy(totalCost).mul(100).toNumber();

  // Sort holdings by value for top holdings
  const sortedHoldings = [...holdings]
    .sort((a, b) => b.currentValue.minus(a.currentValue).toNumber())
    .slice(0, topCount);

  const topHoldings = sortedHoldings.map((h) => {
    const asset = assetMap.get(h.assetId);
    return {
      assetId: h.assetId,
      symbol: asset?.symbol || 'Unknown',
      name: asset?.name || 'Unknown Asset',
      value: h.currentValue,
      percent: totalValue.isZero()
        ? 0
        : h.currentValue.dividedBy(totalValue).mul(100).toNumber(),
    };
  });

  return {
    totalValue,
    totalCost,
    totalGain,
    totalGainPercent,
    holdingsCount: holdings.length,
    topHoldings,
  };
}

/**
 * Generate full portfolio metrics
 */
export function generatePortfolioMetrics(
  holdings: Holding[],
  assets: Asset[],
  previousTotalValue?: Decimal
): PortfolioMetrics {
  const holdingsWithAssets: HoldingWithAsset[] = holdings.map((holding) => ({
    holding,
    asset: assets.find((a) => a.id === holding.assetId),
  }));

  return calculatePortfolioMetrics(holdingsWithAssets, previousTotalValue);
}

/**
 * Generate rebalancing plan
 */
export function generateRebalancingPlan(
  portfolio: Portfolio,
  holdings: Holding[],
  assets: Asset[],
  currentPrices: Map<string, Decimal>
): RebalancingPlan {
  const targetAllocations = portfolio.settings.targetAllocations || [];
  const threshold = portfolio.settings.rebalanceThreshold;

  const holdingsWithAssets: HoldingWithAsset[] = holdings.map((holding) => ({
    holding,
    asset: assets.find((a) => a.id === holding.assetId),
  }));

  const totalValue = calculateTotalValue(holdings);
  const currentAllocation = calculateAllocationByType(
    holdingsWithAssets,
    totalValue
  );

  const suggestions: RebalancingSuggestion[] = [];
  const taxImplications: TaxImplication[] = [];

  // Build target allocation map
  const targetMap = new Map<AssetType, AllocationTarget>(
    targetAllocations.map((t) => [t.type, t])
  );

  // Calculate rebalancing needs by asset type
  for (const current of currentAllocation) {
    const target = targetMap.get(current.type);
    if (!target) continue;

    const drift = current.percent - target.targetPercent;
    const needsRebalance = Math.abs(drift) > threshold;

    if (!needsRebalance) continue;

    // Find holdings of this type
    const typeHoldings = holdingsWithAssets.filter(
      (h) => h.asset?.type === current.type
    );

    if (typeHoldings.length === 0) continue;

    // Calculate target value for this asset type
    const targetValue = totalValue.mul(target.targetPercent / 100);
    const currentTypeValue = current.value;
    const adjustmentNeeded = targetValue.minus(currentTypeValue);

    // Distribute adjustment across holdings of this type
    for (const { holding, asset } of typeHoldings) {
      if (!asset) continue;

      const holdingWeight = currentTypeValue.isZero()
        ? new Decimal(1).dividedBy(typeHoldings.length)
        : holding.currentValue.dividedBy(currentTypeValue);

      const holdingAdjustment = adjustmentNeeded.mul(holdingWeight);
      const currentPrice =
        currentPrices.get(asset.id) || new Decimal(asset.currentPrice || 0);

      if (currentPrice.isZero()) continue;

      const quantity = holdingAdjustment.dividedBy(currentPrice).abs();

      if (quantity.lessThan(0.01)) continue; // Skip tiny adjustments

      const action: 'buy' | 'sell' = holdingAdjustment.greaterThan(0)
        ? 'buy'
        : 'sell';

      suggestions.push({
        holdingId: holding.id,
        symbol: asset.symbol,
        currentPercent: current.percent,
        targetPercent: target.targetPercent,
        action,
        quantity,
        estimatedValue: holdingAdjustment.abs(),
      });

      // Calculate tax implications for sells
      if (action === 'sell' && holding.lots.length > 0) {
        const saleAllocations = calculateSaleAllocations(
          holding.lots,
          quantity,
          currentPrice,
          new Date(),
          portfolio.settings.taxStrategy
        );

        for (const allocation of saleAllocations) {
          taxImplications.push({
            holdingId: holding.id,
            symbol: asset.symbol,
            realizedGain: allocation.realizedGain,
            taxableAmount: allocation.realizedGain.greaterThan(0)
              ? allocation.realizedGain
              : new Decimal(0),
            holdingPeriod: allocation.holdingPeriod,
          });
        }
      }
    }
  }

  // Calculate total trades and estimated cost (assume small fee per trade)
  const totalTrades = suggestions.length;
  const estimatedCost = new Decimal(totalTrades * 5); // $5 per trade estimate

  return {
    portfolioId: portfolio.id,
    suggestions,
    totalTrades,
    estimatedCost,
    taxImplications,
  };
}

/**
 * Calculate portfolio diversification score
 */
export function calculateDiversificationScore(
  holdings: Holding[],
  assets: Asset[]
): {
  score: number;
  assetTypeCount: number;
  sectorCount: number;
  concentrationRisk: number;
} {
  const holdingsWithAssets: HoldingWithAsset[] = holdings.map((holding) => ({
    holding,
    asset: assets.find((a) => a.id === holding.assetId),
  }));

  const totalValue = calculateTotalValue(holdings);
  const allocation = calculateAllocationByType(holdingsWithAssets, totalValue);

  // Count unique asset types
  const assetTypes = new Set(allocation.map((a) => a.type));
  const assetTypeCount = assetTypes.size;

  // Count unique sectors
  const sectors = new Set(
    holdingsWithAssets
      .filter((h) => h.asset?.sector)
      .map((h) => h.asset!.sector)
  );
  const sectorCount = sectors.size;

  // Calculate concentration risk (Herfindahl-Hirschman Index)
  // Lower is better - score between 0 and 10000
  let hhi = 0;
  for (const holding of holdings) {
    const weight = totalValue.isZero()
      ? 0
      : holding.currentValue.dividedBy(totalValue).mul(100).toNumber();
    hhi += weight * weight;
  }

  // Normalize HHI to a 0-100 score (inverted, so higher is better)
  const concentrationRisk = Math.min(100, hhi / 100);
  const diversificationFromConcentration = 100 - concentrationRisk;

  // Calculate overall diversification score
  // Weight: 40% asset types, 30% sectors, 30% concentration
  const assetTypeScore = Math.min(100, (assetTypeCount / 5) * 100); // 5 types = max
  const sectorScore = Math.min(100, (sectorCount / 10) * 100); // 10 sectors = max

  const score =
    assetTypeScore * 0.4 +
    sectorScore * 0.3 +
    diversificationFromConcentration * 0.3;

  return {
    score: Math.round(score),
    assetTypeCount,
    sectorCount,
    concentrationRisk: Math.round(concentrationRisk),
  };
}

/**
 * Calculate portfolio risk metrics
 */
export function calculateRiskMetrics(
  holdings: Holding[],
  assets: Asset[]
): {
  singleStockRisk: boolean;
  concentratedPosition: string | null;
  volatileHoldings: string[];
} {
  const totalValue = calculateTotalValue(holdings);

  let maxWeight = 0;
  let concentratedPosition: string | null = null;
  const volatileHoldings: string[] = [];

  for (const holding of holdings) {
    const weight = totalValue.isZero()
      ? 0
      : holding.currentValue.dividedBy(totalValue).mul(100).toNumber();

    if (weight > maxWeight) {
      maxWeight = weight;
      const asset = assets.find((a) => a.id === holding.assetId);
      concentratedPosition =
        weight > 25 ? asset?.symbol || holding.assetId : null;
    }

    // Check for volatile assets (beta > 1.5 or crypto)
    const asset = assets.find((a) => a.id === holding.assetId);
    if (asset) {
      const beta = asset.metadata.beta || 1;
      if (beta > 1.5 || asset.type === 'crypto') {
        volatileHoldings.push(asset.symbol);
      }
    }
  }

  return {
    singleStockRisk: maxWeight > 50,
    concentratedPosition,
    volatileHoldings,
  };
}

/**
 * Calculate income from holdings (dividends)
 */
export function calculateProjectedIncome(
  holdings: Holding[],
  assets: Asset[]
): {
  annualIncome: Decimal;
  yield: number;
  incomeByAsset: Array<{ symbol: string; income: Decimal }>;
} {
  let totalIncome = new Decimal(0);
  const incomeByAsset: Array<{ symbol: string; income: Decimal }> = [];
  const totalValue = calculateTotalValue(holdings);

  for (const holding of holdings) {
    const asset = assets.find((a) => a.id === holding.assetId);
    if (!asset) continue;

    const dividendYield = asset.metadata.dividendYield || 0;
    const annualDividend = holding.currentValue.mul(dividendYield / 100);

    if (annualDividend.greaterThan(0)) {
      totalIncome = totalIncome.plus(annualDividend);
      incomeByAsset.push({
        symbol: asset.symbol,
        income: annualDividend,
      });
    }
  }

  const portfolioYield = totalValue.isZero()
    ? 0
    : totalIncome.dividedBy(totalValue).mul(100).toNumber();

  return {
    annualIncome: totalIncome,
    yield: portfolioYield,
    incomeByAsset: incomeByAsset.sort((a, b) =>
      b.income.minus(a.income).toNumber()
    ),
  };
}

/**
 * Compare portfolio performance to benchmark
 */
export function compareToBenchmark(
  portfolioReturn: number,
  benchmarkReturn: number
): {
  alpha: number;
  outperforming: boolean;
  difference: number;
} {
  const alpha = portfolioReturn - benchmarkReturn;

  return {
    alpha,
    outperforming: alpha > 0,
    difference: alpha,
  };
}
