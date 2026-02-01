/**
 * Recommendation Engine
 *
 * Generates actionable recommendations based on portfolio analysis.
 */

import Decimal from 'decimal.js';

import {
  Recommendation,
  RecommendationThresholds,
  DEFAULT_RECOMMENDATION_THRESHOLDS,
  TaxRecommendationMetadata,
} from '@/types/analysis';
import { AssetType } from '@/types/portfolio';
import { Holding, Asset } from '@/types';
import { detectAgingLots } from '@/lib/services/tax-calculator';
import { useTaxSettingsStore } from '@/lib/stores/tax-settings';

interface RecommendationInput {
  holdings: Holding[];
  assets: Asset[];
  totalValue: Decimal;
  thresholds?: Partial<RecommendationThresholds>;
}

/**
 * Generate all recommendations for a portfolio
 *
 * Analyzes portfolio composition and generates actionable recommendations
 * based on predefined rules for cash drag, concentration, and diversification.
 *
 * @param input - Recommendation input containing holdings, assets, and thresholds
 * @returns Array of recommendations sorted by severity
 */
export function generateRecommendations(
  input: RecommendationInput
): Recommendation[] {
  const thresholds = {
    ...DEFAULT_RECOMMENDATION_THRESHOLDS,
    ...input.thresholds,
  };
  const recommendations: Recommendation[] = [];

  // Check each rule
  const cashDrag = checkCashDrag(input, thresholds);
  if (cashDrag) recommendations.push(cashDrag);

  const concentration = checkAssetTypeConcentration(input, thresholds);
  if (concentration) recommendations.push(concentration);

  const regionConc = checkRegionConcentration(input, thresholds);
  if (regionConc) recommendations.push(regionConc);

  const sectorConc = checkSectorConcentration(input, thresholds);
  if (sectorConc) recommendations.push(sectorConc);

  const taxLotAging = checkTaxLotAging(input);
  if (taxLotAging) recommendations.push(taxLotAging);

  return recommendations;
}

/**
 * Check for cash drag (excess cash holdings)
 */
function checkCashDrag(
  input: RecommendationInput,
  thresholds: RecommendationThresholds
): Recommendation | null {
  const cashHoldings = input.holdings.filter((h) => {
    const asset = input.assets.find((a) => a.id === h.assetId);
    return asset?.type === 'cash';
  });

  const cashValue = cashHoldings.reduce(
    (sum, h) => sum.plus(h.currentValue),
    new Decimal(0)
  );

  const cashPercent = input.totalValue.isZero()
    ? 0
    : cashValue.div(input.totalValue).mul(100).toNumber();

  if (cashPercent > thresholds.cashDragPercent) {
    return {
      id: 'cash-drag',
      type: 'cash_drag',
      title: 'High Cash Allocation',
      description: `Your portfolio has ${cashPercent.toFixed(1)}% in cash, which may be dragging down returns. Consider investing excess cash to improve long-term performance.`,
      severity: cashPercent > 25 ? 'high' : 'medium',
      actionLabel: 'Review Allocation',
      actionUrl: '/allocation',
      metadata: { cashPercent, threshold: thresholds.cashDragPercent },
    };
  }

  return null;
}

/**
 * Check for asset type concentration
 */
function checkAssetTypeConcentration(
  input: RecommendationInput,
  thresholds: RecommendationThresholds
): Recommendation | null {
  const typeValues: Partial<Record<AssetType, Decimal>> = {};
  const missingAssets: string[] = [];

  for (const holding of input.holdings) {
    const asset = input.assets.find((a) => a.id === holding.assetId);
    if (!asset) {
      missingAssets.push(holding.assetId);
      continue;
    }

    typeValues[asset.type] = (typeValues[asset.type] || new Decimal(0)).plus(
      holding.currentValue
    );
  }

  // Log warning if assets are missing
  if (missingAssets.length > 0) {
    console.warn(
      '[Recommendation Engine] Missing asset data for holdings:',
      missingAssets
    );
  }

  // Find the most concentrated asset type
  let maxType: AssetType | null = null;
  let maxPercent = 0;

  for (const [type, value] of Object.entries(typeValues)) {
    const percent = input.totalValue.isZero()
      ? 0
      : value.div(input.totalValue).mul(100).toNumber();

    if (percent > maxPercent) {
      maxPercent = percent;
      maxType = type as AssetType;
    }
  }

  if (maxType && maxPercent > thresholds.concentrationPercent) {
    return {
      id: 'asset-concentration',
      type: 'concentration',
      title: 'Asset Type Concentration Risk',
      description: `Your portfolio is heavily concentrated in ${maxType} (${maxPercent.toFixed(1)}%). Consider diversifying across different asset types to reduce risk.`,
      severity: maxPercent > 60 ? 'high' : 'medium',
      actionLabel: 'Diversify Portfolio',
      actionUrl: '/analysis',
      metadata: {
        assetType: maxType,
        percent: maxPercent,
        threshold: thresholds.concentrationPercent,
      },
    };
  }

  return null;
}

/**
 * Check for regional concentration
 */
function checkRegionConcentration(
  input: RecommendationInput,
  thresholds: RecommendationThresholds
): Recommendation | null {
  const regionValues: Record<string, Decimal> = {};
  const missingAssets: string[] = [];

  for (const holding of input.holdings) {
    const asset = input.assets.find((a) => a.id === holding.assetId);
    if (!asset) {
      missingAssets.push(holding.assetId);
      continue;
    }

    const region = asset.region || 'US';
    regionValues[region] = (regionValues[region] || new Decimal(0)).plus(
      holding.currentValue
    );
  }

  // Log warning if assets are missing
  if (missingAssets.length > 0) {
    console.warn(
      '[Recommendation Engine] Missing asset data for holdings in region check:',
      missingAssets
    );
  }

  // Find most concentrated region
  let maxRegion: string | null = null;
  let maxPercent = 0;

  for (const [region, value] of Object.entries(regionValues)) {
    const percent = input.totalValue.isZero()
      ? 0
      : value.div(input.totalValue).mul(100).toNumber();

    if (percent > maxPercent) {
      maxPercent = percent;
      maxRegion = region;
    }
  }

  if (maxRegion && maxPercent > thresholds.regionConcentrationPercent) {
    return {
      id: 'region-concentration',
      type: 'region_concentration',
      title: 'Geographic Concentration Risk',
      description: `Your portfolio is heavily concentrated in ${maxRegion} (${maxPercent.toFixed(1)}%). Consider adding international exposure for better diversification.`,
      severity: maxPercent > 90 ? 'high' : 'medium',
      actionLabel: 'View Regional Breakdown',
      actionUrl: '/analysis',
      metadata: {
        region: maxRegion,
        percent: maxPercent,
        threshold: thresholds.regionConcentrationPercent,
      },
    };
  }

  return null;
}

/**
 * Check for sector concentration
 */
function checkSectorConcentration(
  input: RecommendationInput,
  thresholds: RecommendationThresholds
): Recommendation | null {
  const sectorValues: Record<string, Decimal> = {};
  const missingAssets: string[] = [];

  for (const holding of input.holdings) {
    const asset = input.assets.find((a) => a.id === holding.assetId);
    if (!asset) {
      missingAssets.push(holding.assetId);
      continue;
    }
    if (!asset.sector) continue;

    const sector = asset.sector;
    sectorValues[sector] = (sectorValues[sector] || new Decimal(0)).plus(
      holding.currentValue
    );
  }

  // Log warning if assets are missing
  if (missingAssets.length > 0) {
    console.warn(
      '[Recommendation Engine] Missing asset data for holdings in sector check:',
      missingAssets
    );
  }

  // Find most concentrated sector
  let maxSector: string | null = null;
  let maxPercent = 0;

  for (const [sector, value] of Object.entries(sectorValues)) {
    const percent = input.totalValue.isZero()
      ? 0
      : value.div(input.totalValue).mul(100).toNumber();

    if (percent > maxPercent) {
      maxPercent = percent;
      maxSector = sector;
    }
  }

  if (maxSector && maxPercent > thresholds.sectorConcentrationPercent) {
    return {
      id: 'sector-concentration',
      type: 'sector_concentration',
      title: 'Sector Concentration Risk',
      description: `Your portfolio is heavily concentrated in ${maxSector} (${maxPercent.toFixed(1)}%). Consider diversifying across different sectors.`,
      severity: maxPercent > 70 ? 'high' : 'medium',
      actionLabel: 'View Sector Breakdown',
      actionUrl: '/analysis',
      metadata: {
        sector: maxSector,
        percent: maxPercent,
        threshold: thresholds.sectorConcentrationPercent,
      },
    };
  }

  return null;
}

/**
 * Check for tax lots approaching long-term capital gains status
 *
 * Detects holdings with lots that will become long-term (held >365 days) within the next 30 days.
 * Recommends holding these positions to benefit from lower long-term capital gains tax rates.
 */
function checkTaxLotAging(
  input: RecommendationInput
): Recommendation | null {
  // Create asset map for detectAgingLots
  const assetMap = new Map(input.assets.map(asset => [asset.id, asset]));

  const agingLots = detectAgingLots(input.holdings, assetMap);

  if (agingLots.length === 0) {
    return null;
  }

  // Get tax settings for calculating potential savings
  const taxSettings = useTaxSettingsStore.getState().settings;
  const shortTermRate = taxSettings.shortTermTaxRate;
  const longTermRate = taxSettings.longTermTaxRate;
  const rateDiff = shortTermRate - longTermRate;

  // Find the lot closest to becoming long-term
  const nearestLot = agingLots.reduce((nearest, lot) =>
    lot.daysUntilLongTerm < nearest.daysUntilLongTerm ? lot : nearest
  );

  // Calculate potential savings on unrealized gains
  const totalUnrealizedGains = agingLots.reduce(
    (sum, lot) => sum.plus(lot.unrealizedGain),
    new Decimal(0)
  );
  const potentialSavings = totalUnrealizedGains.mul(rateDiff).toNumber();

  const metadata: TaxRecommendationMetadata = {
    agingLotsCount: agingLots.length,
    totalUnrealizedGain: totalUnrealizedGains.toString(),
    earliestLotDaysRemaining: nearestLot.daysUntilLongTerm,
    affectedAssetIds: [...new Set(agingLots.map(lot => lot.assetId))],
  };

  const daysText = nearestLot.daysUntilLongTerm === 1 ? 'day' : 'days';
  const lotsText = agingLots.length === 1 ? 'lot' : 'lots';

  return {
    id: 'tax-lot-aging',
    type: 'tax_lot_aging',
    title: 'Tax Lots Approaching Long-Term Status',
    description: `You have ${agingLots.length} ${lotsText} that will qualify for lower long-term capital gains rates within 30 days. The nearest lot (${nearestLot.assetSymbol}) becomes long-term in ${nearestLot.daysUntilLongTerm} ${daysText}. Holding until then could save approximately $${potentialSavings.toFixed(2)} in taxes.`,
    severity: nearestLot.daysUntilLongTerm <= 7 ? 'high' : 'medium',
    actionLabel: 'View Tax Exposure',
    actionUrl: '/analysis',
    metadata,
  };
}
