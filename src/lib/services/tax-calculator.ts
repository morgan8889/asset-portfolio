/**
 * Tax Calculator Service
 *
 * Provides tax-related calculations including holding period determination,
 * lot aging detection, and tax exposure metrics.
 */

import { Decimal } from 'decimal.js';
import {
  AgingLot,
  TaxExposureMetrics,
  HoldingPeriod,
  determineHoldingPeriod as determineSingleLotPeriod,
} from '@/types/tax';
import { Holding, TaxLot } from '@/types/asset';
import { Asset } from '@/types';
import { TaxSettings } from '@/types/settings';

/**
 * Calculate holding period for a transaction/lot
 *
 * @param purchaseDate - Date of purchase
 * @param currentDate - Current date (defaults to now)
 * @returns 'short' if < 365 days, 'long' if >= 365 days
 */
export function calculateHoldingPeriod(
  purchaseDate: Date,
  currentDate: Date = new Date()
): HoldingPeriod {
  return determineSingleLotPeriod(purchaseDate, currentDate);
}

/**
 * Detect aging lots (approaching long-term status within lookback period)
 *
 * @param holdings - Array of holdings to analyze
 * @param assetMap - Map of asset IDs to asset details
 * @param lookbackDays - Number of days before LT threshold to flag lots (default: 30)
 * @param currentDate - Current date (defaults to now)
 * @returns Array of aging lots
 */
export function detectAgingLots(
  holdings: Holding[],
  assetMap: Map<string, Asset>,
  lookbackDays: number = 30,
  currentDate: Date = new Date()
): AgingLot[] {
  const agingLots: AgingLot[] = [];
  const currentTime = currentDate.getTime();
  const msPerDay = 1000 * 60 * 60 * 24;
  const longTermThresholdDays = 365;

  for (const holding of holdings) {
    const asset = assetMap.get(holding.assetId);
    if (!asset || !asset.currentPrice) {
      continue; // Skip holdings without price data
    }

    const currentPrice = new Decimal(asset.currentPrice);

    for (const lot of holding.lots) {
      if (lot.remainingQuantity.isZero() || lot.remainingQuantity.lessThan(0)) {
        continue; // Skip fully sold lots
      }

      const purchaseTime = lot.purchaseDate.getTime();
      const daysHeld = Math.floor((currentTime - purchaseTime) / msPerDay);
      const daysUntilLongTerm = longTermThresholdDays - daysHeld;

      // Only include lots that are:
      // 1. Still short-term (< 365 days)
      // 2. Within lookback window of becoming long-term
      if (daysHeld < longTermThresholdDays && daysUntilLongTerm <= lookbackDays) {
        const currentValue = lot.remainingQuantity.mul(currentPrice);
        const costBasis = lot.remainingQuantity.mul(lot.purchasePrice);
        const unrealizedGain = currentValue.sub(costBasis);
        // Handle zero or negative cost basis (e.g., after dividends exceed investment)
        const unrealizedGainPercent = costBasis.isZero() || costBasis.isNegative()
          ? 0
          : unrealizedGain.div(costBasis).mul(100).toNumber();

        agingLots.push({
          holdingId: holding.id,
          assetId: holding.assetId,
          assetSymbol: asset.symbol,
          lotId: lot.id,
          remainingQuantity: lot.remainingQuantity,
          purchaseDate: lot.purchaseDate,
          daysUntilLongTerm,
          unrealizedGain,
          unrealizedGainPercent,
          currentPrice,
          currentValue,
          holdingPeriod: 'short',
        });
      }
    }
  }

  // Sort by days until long-term (earliest first)
  agingLots.sort((a, b) => a.daysUntilLongTerm - b.daysUntilLongTerm);

  return agingLots;
}

/**
 * Calculate tax exposure metrics for a portfolio
 *
 * @param holdings - Array of holdings to analyze
 * @param assetMap - Map of asset IDs to asset details
 * @param taxSettings - User tax configuration
 * @param currentDate - Current date (defaults to now)
 * @returns Tax exposure metrics
 */
export function calculateTaxExposure(
  holdings: Holding[],
  assetMap: Map<string, Asset>,
  taxSettings: TaxSettings,
  currentDate: Date = new Date()
): TaxExposureMetrics {
  let shortTermGains = new Decimal(0);
  let shortTermLosses = new Decimal(0);
  let longTermGains = new Decimal(0);
  let longTermLosses = new Decimal(0);
  let agingLotsCount = 0;

  const msPerDay = 1000 * 60 * 60 * 24;
  const currentTime = currentDate.getTime();

  for (const holding of holdings) {
    const asset = assetMap.get(holding.assetId);
    if (!asset || !asset.currentPrice) {
      continue; // Skip holdings without price data
    }

    const currentPrice = new Decimal(asset.currentPrice);

    for (const lot of holding.lots) {
      if (lot.remainingQuantity.isZero() || lot.remainingQuantity.lessThan(0)) {
        continue; // Skip fully sold lots
      }

      const daysHeld = Math.floor(
        (currentTime - lot.purchaseDate.getTime()) / msPerDay
      );
      const isLongTerm = daysHeld >= 365;

      const currentValue = lot.remainingQuantity.mul(currentPrice);
      const costBasis = lot.remainingQuantity.mul(lot.purchasePrice);
      const unrealizedGain = currentValue.sub(costBasis);

      if (isLongTerm) {
        if (unrealizedGain.greaterThan(0)) {
          longTermGains = longTermGains.add(unrealizedGain);
        } else {
          longTermLosses = longTermLosses.add(unrealizedGain.abs());
        }
      } else {
        if (unrealizedGain.greaterThan(0)) {
          shortTermGains = shortTermGains.add(unrealizedGain);
        } else {
          shortTermLosses = shortTermLosses.add(unrealizedGain.abs());
        }

        // Count aging lots
        const daysUntilLongTerm = 365 - daysHeld;
        if (daysUntilLongTerm <= taxSettings.lookbackDays) {
          agingLotsCount++;
        }
      }
    }
  }

  const netShortTerm = shortTermGains.sub(shortTermLosses);
  const netLongTerm = longTermGains.sub(longTermLosses);
  const totalUnrealizedGain = netShortTerm.add(netLongTerm);

  // Calculate estimated tax liability (only on gains, not losses)
  const shortTermTax = shortTermGains.mul(
    taxSettings.shortTermTaxRate + taxSettings.stateRate
  );
  const longTermTax = longTermGains.mul(
    taxSettings.longTermTaxRate + taxSettings.stateRate
  );
  const estimatedTaxLiability = shortTermTax.add(longTermTax);

  // Calculate effective tax rate
  const totalGains = shortTermGains.add(longTermGains);
  const effectiveTaxRate = totalGains.isZero()
    ? 0
    : estimatedTaxLiability.div(totalGains).toNumber();

  return {
    shortTermGains,
    shortTermLosses,
    longTermGains,
    longTermLosses,
    netShortTerm,
    netLongTerm,
    totalUnrealizedGain,
    estimatedTaxLiability,
    effectiveTaxRate,
    agingLotsCount,
  };
}
