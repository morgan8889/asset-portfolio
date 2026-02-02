import { Decimal } from 'decimal.js';
import { z } from 'zod';

/**
 * Tax Settings
 * User preferences for Short-Term and Long-Term capital gains tax rates
 */
export interface TaxSettings {
  shortTermRate: Decimal;        // Ordinary income tax rate (0.00 - 1.00, e.g., 0.24 for 24%)
  longTermRate: Decimal;         // Long-term capital gains rate (0.00 - 1.00, e.g., 0.15 for 15%)
  updatedAt: Date;               // Last update timestamp
}

/**
 * Default tax rates (typical US rates)
 */
export const DEFAULT_TAX_RATES: TaxSettings = {
  shortTermRate: new Decimal(0.24),  // 24% (typical US marginal rate)
  longTermRate: new Decimal(0.15),   // 15% (typical US capital gains rate)
  updatedAt: new Date(),
};

/**
 * Tax Analysis
 * Calculated result for tax liability estimation (not persisted, computed on-demand)
 */
export interface TaxAnalysis {
  // Holdings-level analysis
  totalUnrealizedGain: Decimal;       // Sum of all unrealized gains
  totalUnrealizedLoss: Decimal;       // Sum of all unrealized losses (as positive number)
  netUnrealizedGain: Decimal;         // totalUnrealizedGain - totalUnrealizedLoss

  // Holding period breakdown
  shortTermGains: Decimal;            // Unrealized gains from ST lots
  longTermGains: Decimal;             // Unrealized gains from LT lots
  shortTermLosses: Decimal;           // Unrealized losses from ST lots
  longTermLosses: Decimal;            // Unrealized losses from LT lots

  // Tax liability estimates
  estimatedSTTax: Decimal;            // shortTermGains × shortTermRate
  estimatedLTTax: Decimal;            // longTermGains × longTermRate
  totalEstimatedTax: Decimal;         // estimatedSTTax + estimatedLTTax

  // Lot-level details
  lots: TaxLotAnalysis[];             // Per-lot breakdown
}

/**
 * Tax Lot Analysis
 * Per-lot breakdown for tax analysis display
 */
export interface TaxLotAnalysis {
  lotId: string;
  assetSymbol: string;
  purchaseDate: Date;
  quantity: Decimal;                  // remainingQuantity
  costBasis: Decimal;                 // purchasePrice × quantity
  currentValue: Decimal;              // currentPrice × quantity
  unrealizedGain: Decimal;            // currentValue - costBasis (can be negative)
  holdingPeriod: 'short' | 'long';    // Based on current date
  holdingDays: number;                // Days held (for display)
  lotType: 'standard' | 'espp' | 'rsu';

  // ESPP-specific (if applicable)
  grantDate?: Date;                   // For disqualifying disposition checks
  bargainElement?: Decimal;
  adjustedCostBasis?: Decimal;        // costBasis + (bargainElement × quantity)
}

/**
 * Disqualifying Disposition Check
 * Result from ESPP holding period validation
 */
export interface DisqualifyingDispositionCheck {
  grantDate: Date;
  purchaseDate: Date;
  sellDate: Date;
  twoYearsFromGrant: Date;            // grantDate + 2 years
  oneYearFromPurchase: Date;          // purchaseDate + 1 year
  meetsGrantRequirement: boolean;     // sellDate >= twoYearsFromGrant
  meetsPurchaseRequirement: boolean;  // sellDate >= oneYearFromPurchase
  isQualifying: boolean;              // Both requirements met
}

/**
 * Disqualifying Disposition Reasons
 */
export type DisqualifyingReason =
  | 'sold_before_2yr_from_grant'      // Sold < 2 years from grant date
  | 'sold_before_1yr_from_purchase'   // Sold < 1 year from purchase date
  | 'both_requirements_not_met'       // Both conditions violated
  | 'qualifying';                     // Neither condition violated (not disqualifying)

/**
 * Disqualifying Disposition
 * Flag ESPP sales that don't meet IRS holding requirements (computed, not persisted)
 */
export interface DisqualifyingDisposition {
  transactionId: string;              // Sell transaction ID
  assetSymbol: string;
  lotId: string;                      // ESPP lot that was sold
  grantDate: Date;
  purchaseDate: Date;
  sellDate: Date;
  isDisqualifying: boolean;           // True if either requirement not met
  reason: DisqualifyingReason;
  taxImplication: string;             // Human-readable explanation
}

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
 * Tax Aging Lots Metadata
 *
 * Portfolio-level summary metadata for tax lots approaching long-term status.
 */
export interface TaxAgingLotsMetadata {
  agingLotsCount: number;
  totalUnrealizedGain: string; // Serialized Decimal
  earliestLotDaysRemaining: number;
  affectedAssetIds: string[];
}

// ==================== Zod Validation Schemas ====================

/**
 * Decimal schema for Zod validation
 */
export const DecimalSchema = z.instanceof(Decimal);

/**
 * Decimal string schema (for serialized Decimals)
 */
export const DecimalStringSchema = z.string().refine(
  (val) => {
    try {
      new Decimal(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid decimal string' }
);

/**
 * Tax Lot Schema
 */
export const TaxLotSchema = z.object({
  id: z.string().uuid(),
  quantity: DecimalSchema,
  purchasePrice: DecimalSchema,
  purchaseDate: z.date(),
  soldQuantity: DecimalSchema,
  remainingQuantity: DecimalSchema,
  notes: z.string().optional(),
  lotType: z.enum(['standard', 'espp', 'rsu']).default('standard'),
  grantDate: z.date().optional(),
  bargainElement: DecimalSchema.optional(),
  vestingDate: z.date().optional(),
  vestingPrice: DecimalSchema.optional(),
}).refine(
  (data) => data.remainingQuantity.equals(data.quantity.minus(data.soldQuantity)),
  { message: 'remainingQuantity must equal quantity - soldQuantity' }
).refine(
  (data) => data.lotType !== 'espp' || (data.grantDate && data.bargainElement),
  { message: 'ESPP lots must have grantDate and bargainElement' }
).refine(
  (data) => data.lotType !== 'rsu' || (data.vestingDate && data.vestingPrice),
  { message: 'RSU lots must have vestingDate and vestingPrice' }
);

/**
 * Tax Settings Schema
 */
export const TaxSettingsSchema = z.object({
  shortTermRate: z.number().min(0).max(1),
  longTermRate: z.number().min(0).max(1),
  updatedAt: z.date(),
});

// ==================== Type Guards and Helper Functions ====================

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
