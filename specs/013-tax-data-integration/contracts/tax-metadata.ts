/**
 * Tax Metadata Type Contracts
 * Feature: 013-tax-data-integration
 *
 * This file defines TypeScript interfaces for tax-related metadata
 * that extends the core Transaction and Holding models.
 */

import { Decimal } from 'decimal.js';

// ============================================================================
// Transaction Extensions
// ============================================================================

/**
 * Tax-specific metadata for ESPP and RSU transactions.
 * These fields extend the base Transaction interface.
 */
export interface TaxMetadata {
  /**
   * Grant date (ESPP: offering/purchase date, RSU: award date)
   * Must be <= vestingDate if both present
   */
  grantDate?: Date;

  /**
   * Vesting date (when shares became owned)
   * Must be >= grantDate and <= transaction date
   */
  vestingDate?: Date;

  /**
   * ESPP purchase discount as decimal (e.g., 0.15 for 15%)
   * Valid range: 0.0 - 0.5 (0% - 50%)
   */
  discountPercent?: Decimal;

  /**
   * Number of shares withheld for tax purposes
   * Must be <= transaction quantity
   * If present, quantity represents NET shares received
   */
  sharesWithheld?: Decimal;

  /**
   * Ordinary income amount reported on W-2
   * For RSU: FMV at vest × Gross Shares
   * For ESPP: Bargain element (varies by disposition type)
   */
  ordinaryIncomeAmount?: Decimal;
}

/**
 * Storage representation of tax metadata (Decimal fields serialized to strings)
 */
export interface TaxMetadataStorage {
  grantDate?: Date;
  vestingDate?: Date;
  discountPercent?: string;
  sharesWithheld?: string;
  ordinaryIncomeAmount?: string;
}

/**
 * Validation result for tax metadata
 */
export interface TaxMetadataValidation {
  isValid: boolean;
  errors: TaxMetadataError[];
  warnings: TaxMetadataWarning[];
}

export interface TaxMetadataError {
  field: keyof TaxMetadata;
  message: string;
  code: 'INVALID_RANGE' | 'INVALID_DATE' | 'MISSING_REQUIRED' | 'INCONSISTENT';
}

export interface TaxMetadataWarning {
  field: keyof TaxMetadata;
  message: string;
  code: 'RECOMMENDED_FIELD' | 'UNUSUAL_VALUE';
}

// ============================================================================
// Tax Lot Aging
// ============================================================================

/**
 * Represents a tax lot approaching the 1-year long-term threshold.
 * Used for tax optimization recommendations.
 */
export interface AgingLot {
  /** ID of the parent holding */
  holdingId: string;

  /** ID of the asset */
  assetId: string;

  /** Asset ticker symbol (for display) */
  assetSymbol: string;

  /** ID of the specific tax lot */
  lotId: string;

  /** Shares remaining in this lot */
  remainingQuantity: Decimal;

  /** Original purchase/acquisition date */
  purchaseDate: Date;

  /** Days until the lot reaches 365-day (LT) threshold */
  daysUntilLongTerm: number;

  /** Unrealized gain/loss for this lot */
  unrealizedGain: Decimal;

  /** Unrealized gain as percentage of cost basis */
  unrealizedGainPercent: number;

  /** Current market price per share */
  currentPrice: Decimal;

  /** Current market value of remaining quantity */
  currentValue: Decimal;

  /** Holding period classification (always 'short' for aging lots) */
  holdingPeriod: 'short';
}

/**
 * Input parameters for detecting aging lots
 */
export interface AgingLotDetectionInput {
  holdings: Holding[];
  currentPrices: Map<string, Decimal>;
  lookbackDays?: number;     // Default: 30
  currentDate?: Date;        // Default: new Date()
}

// ============================================================================
// Tax Exposure Metrics
// ============================================================================

/**
 * Aggregated tax exposure metrics for portfolio-level analysis
 */
export interface TaxExposureMetrics {
  /** Total unrealized short-term gains (< 365 days) */
  shortTermGains: Decimal;

  /** Total unrealized short-term losses (< 365 days) */
  shortTermLosses: Decimal;

  /** Total unrealized long-term gains (>= 365 days) */
  longTermGains: Decimal;

  /** Total unrealized long-term losses (>= 365 days) */
  longTermLosses: Decimal;

  /** Net short-term gain/loss (gains - losses) */
  netShortTerm: Decimal;

  /** Net long-term gain/loss (gains - losses) */
  netLongTerm: Decimal;

  /** Total unrealized gain/loss across all lots */
  totalUnrealizedGain: Decimal;

  /** Estimated tax liability if all positions sold today */
  estimatedTaxLiability: Decimal;

  /** Effective tax rate (weighted average of ST/LT rates) */
  effectiveTaxRate: number;

  /** Number of lots approaching long-term status */
  agingLotsCount: number;

  /** Last calculation timestamp */
  calculatedAt: Date;
}

/**
 * Input for calculating tax exposure
 */
export interface TaxExposureInput {
  holdings: Holding[];
  assets: Asset[];
  taxSettings: TaxSettings;
  currentDate?: Date;
}

// ============================================================================
// Tax Settings
// ============================================================================

/**
 * User-configurable tax rates and preferences
 */
export interface TaxSettings {
  /** User ID (always 'default' for single-user app) */
  userId: string;

  /** Short-term capital gains tax rate (ordinary income rate) */
  shortTermTaxRate: number;  // 0.0 - 0.5 (e.g., 0.24 for 24%)

  /** Long-term capital gains tax rate */
  longTermTaxRate: number;   // 0.0 - 0.3 (e.g., 0.15 for 15%)

  /** State tax rate (if applicable) */
  stateRate: number;         // 0.0 - 0.15 (e.g., 0.05 for 5%)

  /** Enable/disable tax optimization recommendations */
  enableTaxOptimization: boolean;

  /** Days before LT threshold to show aging alerts */
  lookbackDays: number;      // Default: 30

  /** Tax jurisdiction (for future multi-region support) */
  jurisdiction: 'US' | 'UK' | 'EU' | 'Other';

  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Default tax settings for new users
 */
export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  userId: 'default',
  shortTermTaxRate: 0.24,    // US 24% bracket
  longTermTaxRate: 0.15,     // US 15% LTCG
  stateRate: 0.05,           // 5% state estimate
  enableTaxOptimization: true,
  lookbackDays: 30,
  jurisdiction: 'US',
  updatedAt: new Date(),
};

// ============================================================================
// Tax Recommendations
// ============================================================================

/**
 * Tax-specific recommendation extending the base Recommendation type
 */
export interface TaxRecommendation {
  id: string;
  type: 'tax_lot_aging';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  actionLabel: string;
  actionUrl: string;
  relatedAssetIds: string[];
  metadata: TaxRecommendationMetadata;
  createdAt: Date;
}

export interface TaxRecommendationMetadata {
  /** Number of lots approaching LT threshold */
  agingLotsCount: number;

  /** Total unrealized gain in aging lots */
  totalUnrealizedGain: string;  // Serialized Decimal

  /** Days until earliest lot reaches LT */
  earliestLotDaysRemaining: number;

  /** Asset IDs with aging lots */
  affectedAssetIds: string[];
}

// ============================================================================
// Lot-Level Analysis
// ============================================================================

/**
 * Detailed analysis for a single tax lot
 */
export interface TaxLotAnalysis {
  lotId: string;
  assetSymbol: string;
  purchaseDate: Date;
  holdingDays: number;
  holdingPeriod: 'short' | 'long';
  quantity: Decimal;
  costBasis: Decimal;
  currentValue: Decimal;
  unrealizedGain: Decimal;
  unrealizedGainPercent: number;

  /** Tax implications if sold today */
  taxIfSoldToday: {
    applicableRate: number;
    estimatedTax: Decimal;
    netProceeds: Decimal;
  };

  /** Tax implications if held until long-term */
  taxIfHeldLongTerm?: {
    daysToWait: number;
    applicableRate: number;
    estimatedTax: Decimal;
    netProceeds: Decimal;
    potentialSavings: Decimal;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Helper type for holding period calculation
 */
export type HoldingPeriod = 'short' | 'long';

/**
 * Helper type for determining holding period from days held
 */
export function determineHoldingPeriod(holdingDays: number): HoldingPeriod {
  return holdingDays >= 365 ? 'long' : 'short';
}

/**
 * Helper type for mixed holding periods (some lots ST, some LT)
 */
export type MixedHoldingPeriod = 'short' | 'long' | 'mixed';

/**
 * Calculate holding period for a holding with multiple lots
 */
export function determineMixedHoldingPeriod(
  lots: TaxLot[],
  currentDate: Date = new Date()
): MixedHoldingPeriod {
  const periods = lots
    .filter(lot => lot.remainingQuantity.greaterThan(0))
    .map(lot => {
      const holdingDays = Math.floor(
        (currentDate.getTime() - lot.purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      return determineHoldingPeriod(holdingDays);
    });

  const hasShort = periods.includes('short');
  const hasLong = periods.includes('long');

  if (hasShort && hasLong) return 'mixed';
  if (hasLong) return 'long';
  return 'short';
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a transaction has tax metadata
 */
export function hasTaxMetadata(transaction: any): transaction is Transaction & TaxMetadata {
  return (
    transaction.grantDate !== undefined ||
    transaction.vestingDate !== undefined ||
    transaction.discountPercent !== undefined ||
    transaction.sharesWithheld !== undefined ||
    transaction.ordinaryIncomeAmount !== undefined
  );
}

/**
 * Type guard to check if a transaction is an ESPP purchase
 */
export function isEsppTransaction(transaction: any): boolean {
  return (
    transaction.discountPercent !== undefined &&
    transaction.grantDate !== undefined
  );
}

/**
 * Type guard to check if a transaction is an RSU vest
 */
export function isRsuTransaction(transaction: any): boolean {
  return (
    transaction.vestingDate !== undefined &&
    transaction.sharesWithheld !== undefined
  );
}

// ============================================================================
// Placeholder imports (resolve to actual types from main codebase)
// ============================================================================

// These would normally be imported from the main type definitions:
type Transaction = any;  // import from '@/types/transaction'
type Holding = any;      // import from '@/types/asset'
type TaxLot = any;       // import from '@/types/asset'
type Asset = any;        // import from '@/types/asset'
