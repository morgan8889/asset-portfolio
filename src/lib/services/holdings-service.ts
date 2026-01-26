/**
 * Holdings Service
 *
 * Business logic for holdings calculations including tax lot tracking,
 * cost basis methods (FIFO, LIFO, average), and position management.
 * All functions are pure and operate on input data.
 */

import { Decimal } from 'decimal.js';
import { Transaction, Holding, TaxLot, TaxStrategy } from '@/types';
import { generateTaxLotId } from '@/types/storage';

export interface HoldingCalculationResult {
  quantity: Decimal;
  costBasis: Decimal;
  averageCost: Decimal;
  lots: TaxLot[];
}

export interface SaleAllocation {
  lotId: string;
  quantity: Decimal;
  costBasis: Decimal;
  purchaseDate: Date;
  realizedGain: Decimal;
  holdingPeriod: 'short' | 'long';
}

/**
 * Calculate holding from transactions using specified tax strategy
 */
export function calculateHoldingFromTransactions(
  transactions: Transaction[],
  taxStrategy: TaxStrategy = 'fifo'
): HoldingCalculationResult {
  // Sort transactions by date
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const lots: TaxLot[] = [];
  let nextLotNumber = 1;

  for (const transaction of sortedTransactions) {
    switch (transaction.type) {
      case 'buy':
      case 'transfer_in':
      case 'reinvestment':
        // Create a new tax lot
        lots.push({
          id: generateTaxLotId(),
          quantity: transaction.quantity,
          purchasePrice: transaction.price,
          purchaseDate: transaction.date,
          soldQuantity: new Decimal(0),
          remainingQuantity: transaction.quantity,
          notes: `Lot #${nextLotNumber++}`,
        });
        break;

      case 'sell':
      case 'transfer_out':
        // Allocate sales to lots based on tax strategy
        allocateSaleToLots(lots, transaction.quantity, taxStrategy);
        break;

      case 'split':
        // Stock splits multiply all lot quantities
        const splitRatio = transaction.quantity;
        for (const lot of lots) {
          lot.quantity = lot.quantity.mul(splitRatio);
          lot.remainingQuantity = lot.remainingQuantity.mul(splitRatio);
          lot.purchasePrice = lot.purchasePrice.dividedBy(splitRatio);
        }
        break;

      // Other transaction types don't affect lots directly
      default:
        break;
    }
  }

  // Calculate totals from lots
  const quantity = lots.reduce(
    (sum, lot) => sum.plus(lot.remainingQuantity),
    new Decimal(0)
  );

  const costBasis = lots.reduce(
    (sum, lot) => sum.plus(lot.remainingQuantity.mul(lot.purchasePrice)),
    new Decimal(0)
  );

  const averageCost = quantity.isZero()
    ? new Decimal(0)
    : costBasis.dividedBy(quantity);

  // Filter out fully sold lots
  const activeLots = lots.filter((lot) => lot.remainingQuantity.greaterThan(0));

  return {
    quantity,
    costBasis,
    averageCost,
    lots: activeLots,
  };
}

/**
 * Allocate a sale to tax lots based on tax strategy
 */
function allocateSaleToLots(
  lots: TaxLot[],
  saleQuantity: Decimal,
  taxStrategy: TaxStrategy
): void {
  let remaining = saleQuantity;

  // Sort lots based on strategy
  const sortedLots = sortLotsForStrategy(lots, taxStrategy);

  for (const lot of sortedLots) {
    if (remaining.isZero()) break;
    if (lot.remainingQuantity.isZero()) continue;

    const sellFromLot = Decimal.min(remaining, lot.remainingQuantity);
    lot.soldQuantity = lot.soldQuantity.plus(sellFromLot);
    lot.remainingQuantity = lot.remainingQuantity.minus(sellFromLot);
    remaining = remaining.minus(sellFromLot);
  }

  if (remaining.greaterThan(0)) {
    console.warn(
      `Sale quantity exceeds available quantity by ${remaining.toString()}`
    );
  }
}

/**
 * Sort lots based on tax strategy
 */
function sortLotsForStrategy(lots: TaxLot[], strategy: TaxStrategy): TaxLot[] {
  const lotsWithRemaining = lots.filter((lot) =>
    lot.remainingQuantity.greaterThan(0)
  );

  switch (strategy) {
    case 'fifo':
      // First In, First Out - oldest lots first
      return lotsWithRemaining.sort(
        (a, b) =>
          new Date(a.purchaseDate).getTime() -
          new Date(b.purchaseDate).getTime()
      );

    case 'lifo':
      // Last In, First Out - newest lots first
      return lotsWithRemaining.sort(
        (a, b) =>
          new Date(b.purchaseDate).getTime() -
          new Date(a.purchaseDate).getTime()
      );

    case 'hifo':
      // Highest In, First Out - highest cost basis first (minimizes gains)
      return lotsWithRemaining.sort((a, b) =>
        b.purchasePrice.minus(a.purchasePrice).toNumber()
      );

    case 'specific':
      // For specific lot selection, return as-is (UI should handle selection)
      return lotsWithRemaining;

    default:
      return lotsWithRemaining;
  }
}

/**
 * Calculate sale allocations for tax reporting
 */
export function calculateSaleAllocations(
  lots: TaxLot[],
  saleQuantity: Decimal,
  salePrice: Decimal,
  saleDate: Date,
  taxStrategy: TaxStrategy
): SaleAllocation[] {
  const allocations: SaleAllocation[] = [];
  let remaining = saleQuantity;
  const sortedLots = sortLotsForStrategy(lots, taxStrategy);

  for (const lot of sortedLots) {
    if (remaining.isZero()) break;
    if (lot.remainingQuantity.isZero()) continue;

    const sellQuantity = Decimal.min(remaining, lot.remainingQuantity);
    const costBasis = sellQuantity.mul(lot.purchasePrice);
    const proceeds = sellQuantity.mul(salePrice);
    const realizedGain = proceeds.minus(costBasis);

    // Determine holding period (1 year threshold for long-term)
    const holdingDays = Math.floor(
      (saleDate.getTime() - new Date(lot.purchaseDate).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const holdingPeriod: 'short' | 'long' =
      holdingDays >= 365 ? 'long' : 'short';

    allocations.push({
      lotId: lot.id,
      quantity: sellQuantity,
      costBasis,
      purchaseDate: lot.purchaseDate,
      realizedGain,
      holdingPeriod,
    });

    remaining = remaining.minus(sellQuantity);
  }

  return allocations;
}

/**
 * Calculate unrealized gains by lot
 */
export function calculateUnrealizedGainsByLot(
  lots: TaxLot[],
  currentPrice: Decimal,
  currentDate: Date = new Date()
): Array<{
  lotId: string;
  quantity: Decimal;
  costBasis: Decimal;
  currentValue: Decimal;
  unrealizedGain: Decimal;
  unrealizedGainPercent: number;
  holdingPeriod: 'short' | 'long';
}> {
  return lots
    .filter((lot) => lot.remainingQuantity.greaterThan(0))
    .map((lot) => {
      const quantity = lot.remainingQuantity;
      const costBasis = quantity.mul(lot.purchasePrice);
      const currentValue = quantity.mul(currentPrice);
      const unrealizedGain = currentValue.minus(costBasis);
      const unrealizedGainPercent = costBasis.isZero()
        ? 0
        : unrealizedGain.dividedBy(costBasis).mul(100).toNumber();

      const holdingDays = Math.floor(
        (currentDate.getTime() - new Date(lot.purchaseDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const holdingPeriod: 'short' | 'long' =
        holdingDays >= 365 ? 'long' : 'short';

      return {
        lotId: lot.id,
        quantity,
        costBasis,
        currentValue,
        unrealizedGain,
        unrealizedGainPercent,
        holdingPeriod,
      };
    });
}

/**
 * Find tax loss harvesting opportunities
 */
export function findTaxLossHarvestingOpportunities(
  holdings: Holding[],
  currentPrices: Map<string, Decimal>,
  minimumLoss: Decimal = new Decimal(100)
): Array<{
  holdingId: string;
  assetId: string;
  unrealizedLoss: Decimal;
  shortTermLoss: Decimal;
  longTermLoss: Decimal;
}> {
  const opportunities: Array<{
    holdingId: string;
    assetId: string;
    unrealizedLoss: Decimal;
    shortTermLoss: Decimal;
    longTermLoss: Decimal;
  }> = [];

  const currentDate = new Date();

  for (const holding of holdings) {
    const currentPrice = currentPrices.get(holding.assetId);
    if (!currentPrice) continue;

    const lotAnalysis = calculateUnrealizedGainsByLot(
      holding.lots,
      currentPrice,
      currentDate
    );

    let shortTermLoss = new Decimal(0);
    let longTermLoss = new Decimal(0);

    for (const lot of lotAnalysis) {
      if (lot.unrealizedGain.lessThan(0)) {
        if (lot.holdingPeriod === 'short') {
          shortTermLoss = shortTermLoss.plus(lot.unrealizedGain.abs());
        } else {
          longTermLoss = longTermLoss.plus(lot.unrealizedGain.abs());
        }
      }
    }

    const totalLoss = shortTermLoss.plus(longTermLoss);
    if (totalLoss.greaterThanOrEqualTo(minimumLoss)) {
      opportunities.push({
        holdingId: holding.id,
        assetId: holding.assetId,
        unrealizedLoss: totalLoss.negated(),
        shortTermLoss: shortTermLoss.negated(),
        longTermLoss: longTermLoss.negated(),
      });
    }
  }

  // Sort by total loss (most loss first)
  return opportunities.sort((a, b) =>
    a.unrealizedLoss.minus(b.unrealizedLoss).toNumber()
  );
}

/**
 * Update holding with current market price
 */
export function updateHoldingMarketValue(
  holding: Holding,
  currentPrice: Decimal
): {
  currentValue: Decimal;
  unrealizedGain: Decimal;
  unrealizedGainPercent: number;
} {
  const currentValue = holding.quantity.mul(currentPrice);
  const unrealizedGain = currentValue.minus(holding.costBasis);
  const unrealizedGainPercent = holding.costBasis.isZero()
    ? 0
    : unrealizedGain.dividedBy(holding.costBasis).mul(100).toNumber();

  return {
    currentValue,
    unrealizedGain,
    unrealizedGainPercent,
  };
}

/**
 * Merge multiple holdings (e.g., after corporate action)
 */
export function mergeHoldings(
  holdings: Holding[],
  newAssetId: string,
  portfolioId: string
): Omit<Holding, 'id'> {
  const allLots: TaxLot[] = [];
  let totalQuantity = new Decimal(0);
  let totalCostBasis = new Decimal(0);

  for (const holding of holdings) {
    totalQuantity = totalQuantity.plus(holding.quantity);
    totalCostBasis = totalCostBasis.plus(holding.costBasis);
    allLots.push(...holding.lots);
  }

  const averageCost = totalQuantity.isZero()
    ? new Decimal(0)
    : totalCostBasis.dividedBy(totalQuantity);

  return {
    portfolioId,
    assetId: newAssetId,
    quantity: totalQuantity,
    costBasis: totalCostBasis,
    averageCost,
    currentValue: new Decimal(0), // Should be updated with current price
    unrealizedGain: new Decimal(0),
    unrealizedGainPercent: 0,
    lots: allLots,
    lastUpdated: new Date(),
  };
}
