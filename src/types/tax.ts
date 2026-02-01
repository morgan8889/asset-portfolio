/**
 * Tax-Related Type Definitions
 *
 * Types for tax optimization, lot aging detection, and tax exposure metrics.
 */

import { Decimal } from 'decimal.js';

/**
 * Holding Period Classification
 */
export type HoldingPeriod = 'short' | 'long' | 'mixed';

/**
 * Aging Lot
 *
 * Represents a tax lot approaching the 1-year long-term threshold.
 * Used for tax optimization recommendations.
 */
export interface AgingLot {
  holdingId: string;
  assetId: string;
  assetSymbol: string;
  lotId: string;
  remainingQuantity: Decimal;
  purchaseDate: Date;
  daysUntilLongTerm: number; // Days until 365-day threshold
  unrealizedGain: Decimal;
  unrealizedGainPercent: number;
  currentPrice: Decimal;
  currentValue: Decimal;
  holdingPeriod: 'short'; // Always 'short' for aging lots
}

/**
 * Tax Exposure Metrics
 *
 * Summary of short-term and long-term unrealized gains for dashboard widget.
 */
export interface TaxExposureMetrics {
  shortTermGains: Decimal;
  shortTermLosses: Decimal;
  longTermGains: Decimal;
  longTermLosses: Decimal;
  netShortTerm: Decimal;
  netLongTerm: Decimal;
  totalUnrealizedGain: Decimal;
  estimatedTaxLiability: Decimal;
  effectiveTaxRate: number; // Weighted avg of ST/LT rates
  agingLotsCount: number;
}

/**
 * Tax Recommendation Metadata
 *
 * Metadata for tax optimization recommendations.
 */
export interface TaxRecommendationMetadata {
  agingLotsCount: number;
  totalUnrealizedGain: string; // Serialized Decimal
  earliestLotDaysRemaining: number;
  affectedAssetIds: string[];
}

/**
 * Type guard to check if a transaction has tax metadata
 */
export function hasTaxMetadata(
  transaction: {
    grantDate?: Date;
    vestingDate?: Date;
    discountPercent?: Decimal;
    sharesWithheld?: Decimal;
    ordinaryIncomeAmount?: Decimal;
  }
): boolean {
  return !!(
    transaction.grantDate ||
    transaction.vestingDate ||
    transaction.discountPercent ||
    transaction.sharesWithheld ||
    transaction.ordinaryIncomeAmount
  );
}

/**
 * Type guard to check if a transaction is an ESPP transaction
 */
export function isEsppTransaction(transaction: {
  grantDate?: Date;
  discountPercent?: Decimal;
}): boolean {
  return !!(transaction.grantDate && transaction.discountPercent);
}

/**
 * Type guard to check if a transaction is an RSU transaction
 */
export function isRsuTransaction(transaction: {
  vestingDate?: Date;
  sharesWithheld?: Decimal;
}): boolean {
  return !!(transaction.vestingDate && transaction.sharesWithheld);
}

/**
 * Determine holding period for a single lot
 */
export function determineHoldingPeriod(
  purchaseDate: Date,
  currentDate: Date = new Date()
): HoldingPeriod {
  const daysHeld = Math.floor(
    (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysHeld >= 365 ? 'long' : 'short';
}

/**
 * Determine mixed holding period for multiple lots
 */
export function determineMixedHoldingPeriod(
  lots: Array<{ purchaseDate: Date }>,
  currentDate: Date = new Date()
): HoldingPeriod {
  if (lots.length === 0) return 'short';

  const periods = lots.map((lot) =>
    determineHoldingPeriod(lot.purchaseDate, currentDate)
  );
  const hasShort = periods.includes('short');
  const hasLong = periods.includes('long');

  if (hasShort && hasLong) return 'mixed';
  if (hasLong) return 'long';
  return 'short';
}
