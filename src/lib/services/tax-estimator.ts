import { Decimal } from 'decimal.js';
import { Holding, TaxLot } from '@/types/asset';
import { TaxSettings, TaxAnalysis, TaxLotAnalysis } from '@/types/tax';
import { calculateHoldingPeriod, calculateHoldingDays } from './holding-period';

/**
 * Tax Estimator Service
 *
 * Calculates unrealized capital gains tax liability estimates using FIFO lot selection
 * and user-configured tax rates.
 */

/**
 * Calculates detailed tax liability estimates for a portfolio's holdings.
 *
 * @param holdings Array of holdings to analyze
 * @param currentPrices Map of assetId → current market price
 * @param taxSettings User's tax rate preferences (ST and LT rates)
 * @returns TaxAnalysis object with complete breakdown
 *
 * Algorithm:
 * 1. For each holding:
 *    a. Get current price from map
 *    b. For each lot in holding.lots where remainingQuantity > 0:
 *       - Calculate unrealized gain = (currentPrice - lot.purchasePrice) × lot.remainingQuantity
 *       - Classify as ST or LT using holding period calculator
 *       - Accumulate into ST or LT buckets
 * 2. Apply tax rates:
 *    - estimatedSTTax = shortTermGains × shortTermRate
 *    - estimatedLTTax = longTermGains × longTermRate
 * 3. Build lot-level details array
 * 4. Return TaxAnalysis object
 */
export function estimateTaxLiability(
  holdings: Holding[],
  currentPrices: Map<string, Decimal>,
  taxSettings: TaxSettings,
  assetSymbolMap?: Map<string, string>
): TaxAnalysis {
  let totalUnrealizedGain = new Decimal(0);
  let totalUnrealizedLoss = new Decimal(0);
  let shortTermGains = new Decimal(0);
  let longTermGains = new Decimal(0);
  let shortTermLosses = new Decimal(0);
  let longTermLosses = new Decimal(0);
  const lots: TaxLotAnalysis[] = [];

  const now = new Date();

  for (const holding of holdings) {
    const currentPrice = currentPrices.get(holding.assetId);
    if (!currentPrice) {
      // Log skipped holdings for debugging - helps identify missing price data
      console.warn(
        `Tax estimator: Skipping ${holding.assetId} - no price available`
      );
      continue;
    }

    // Look up the actual ticker symbol, fall back to assetId if not found
    const assetSymbol = assetSymbolMap?.get(holding.assetId) ?? holding.assetId;

    for (const lot of holding.lots) {
      // Skip fully sold lots
      if (lot.remainingQuantity.lessThanOrEqualTo(0)) {
        continue;
      }

      const lotAnalysis = calculateLotAnalysis(
        lot,
        assetSymbol,
        currentPrice,
        now
      );
      lots.push(lotAnalysis);

      // Accumulate gains/losses
      if (lotAnalysis.unrealizedGain.greaterThan(0)) {
        totalUnrealizedGain = totalUnrealizedGain.plus(
          lotAnalysis.unrealizedGain
        );
        if (lotAnalysis.holdingPeriod === 'short') {
          shortTermGains = shortTermGains.plus(lotAnalysis.unrealizedGain);
        } else {
          longTermGains = longTermGains.plus(lotAnalysis.unrealizedGain);
        }
      } else if (lotAnalysis.unrealizedGain.lessThan(0)) {
        const loss = lotAnalysis.unrealizedGain.abs();
        totalUnrealizedLoss = totalUnrealizedLoss.plus(loss);
        if (lotAnalysis.holdingPeriod === 'short') {
          shortTermLosses = shortTermLosses.plus(loss);
        } else {
          longTermLosses = longTermLosses.plus(loss);
        }
      }
    }
  }

  // Calculate tax estimates (only on gains, not losses)
  const estimatedSTTax = shortTermGains.mul(taxSettings.shortTermRate).toDP(2);
  const estimatedLTTax = longTermGains.mul(taxSettings.longTermRate).toDP(2);
  const totalEstimatedTax = estimatedSTTax.plus(estimatedLTTax);

  const netUnrealizedGain = totalUnrealizedGain.minus(totalUnrealizedLoss);

  return {
    totalUnrealizedGain,
    totalUnrealizedLoss,
    netUnrealizedGain,
    shortTermGains,
    longTermGains,
    shortTermLosses,
    longTermLosses,
    estimatedSTTax,
    estimatedLTTax,
    totalEstimatedTax,
    lots,
  };
}

/**
 * Calculates tax liability for a single holding (useful for detail views).
 *
 * @param holding Single holding to analyze
 * @param currentPrice Current market price for the asset
 * @param taxSettings User's tax rate preferences
 * @returns TaxAnalysis object for this holding only
 */
export function estimateForHolding(
  holding: Holding,
  currentPrice: Decimal,
  taxSettings: TaxSettings
): TaxAnalysis {
  const priceMap = new Map<string, Decimal>();
  priceMap.set(holding.assetId, currentPrice);
  return estimateTaxLiability([holding], priceMap, taxSettings);
}

/**
 * Low-level function to analyze a single tax lot.
 *
 * @param lot Tax lot to analyze
 * @param assetSymbol Asset symbol (for display)
 * @param currentPrice Current market price
 * @param referenceDate Date for holding period calculation (defaults to now)
 * @returns TaxLotAnalysis object with per-lot details
 */
export function calculateLotAnalysis(
  lot: TaxLot,
  assetSymbol: string,
  currentPrice: Decimal,
  referenceDate: Date = new Date()
): TaxLotAnalysis {
  const quantity = lot.remainingQuantity;
  const costBasis = lot.purchasePrice.mul(quantity);
  const currentValue = currentPrice.mul(quantity);
  const unrealizedGain = currentValue.minus(costBasis);
  const holdingPeriod = calculateHoldingPeriod(lot.purchaseDate, referenceDate);
  const holdingDays = calculateHoldingDays(lot.purchaseDate, referenceDate);
  const lotType = lot.lotType || 'standard';

  const analysis: TaxLotAnalysis = {
    lotId: lot.id,
    assetSymbol,
    purchaseDate: lot.purchaseDate,
    quantity,
    costBasis,
    currentValue,
    unrealizedGain,
    holdingPeriod,
    holdingDays,
    lotType,
  };

  // Add ESPP-specific fields if applicable
  if (lotType === 'espp') {
    if (lot.grantDate) {
      analysis.grantDate = lot.grantDate;
    }
    if (lot.bargainElement) {
      analysis.bargainElement = lot.bargainElement;
      analysis.adjustedCostBasis = costBasis.plus(
        lot.bargainElement.mul(quantity)
      );
    }
  }

  return analysis;
}
