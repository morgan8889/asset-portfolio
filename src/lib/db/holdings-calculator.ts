import { Decimal } from 'decimal.js';
import { Transaction, Holding, Asset } from '@/types';
import { db } from './schema';
import { assetQueries, holdingQueries } from './queries';

/**
 * Holdings Calculator
 *
 * This module automatically calculates and updates holdings based on transactions.
 * It handles all transaction types and maintains accurate position tracking.
 */

interface HoldingCalculation {
  quantity: Decimal;
  costBasis: Decimal;
  averageCost: Decimal;
  currentValue: Decimal;
  unrealizedGain: Decimal;
  unrealizedGainPercent: number;
}

export class HoldingsCalculator {
  /**
   * Recalculate all holdings for a portfolio based on its transactions
   */
  static async recalculatePortfolioHoldings(portfolioId: string): Promise<void> {
    const transactions = await db.getTransactionsByPortfolio(portfolioId);

    // Group transactions by asset
    const transactionsByAsset = transactions.reduce((acc, transaction) => {
      if (!acc[transaction.assetId]) {
        acc[transaction.assetId] = [];
      }
      acc[transaction.assetId].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);

    // Calculate holdings for each asset
    for (const [assetId, assetTransactions] of Object.entries(transactionsByAsset)) {
      await this.calculateAssetHolding(portfolioId, assetId, assetTransactions);
    }

    // Clean up holdings with zero quantity
    await this.cleanupZeroHoldings(portfolioId);
  }

  /**
   * Calculate holding for a specific asset based on its transactions
   */
  private static async calculateAssetHolding(
    portfolioId: string,
    assetId: string,
    transactions: Transaction[]
  ): Promise<void> {
    // Sort transactions by date to ensure proper order
    const sortedTransactions = transactions.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const calculation = this.performHoldingCalculation(sortedTransactions);

    // Skip if zero quantity
    if (calculation.quantity.isZero()) {
      // Delete existing holding if it exists
      const existingHolding = await holdingQueries.getByPortfolioAndAsset(portfolioId, assetId);
      if (existingHolding) {
        await holdingQueries.delete(existingHolding.id);
      }
      return;
    }

    // Get or create asset record
    let asset = await assetQueries.getById(assetId);
    if (!asset) {
      // Create asset record if it doesn't exist
      await assetQueries.create({
        symbol: assetId.toUpperCase(),
        name: assetId.toUpperCase(), // Will be updated when we fetch real data
        type: 'stock', // Default type
        exchange: 'NASDAQ', // Default exchange
        currency: 'USD',
        currentPrice: 0,
        sector: null,
        industry: null,
        marketCap: null,
        description: null,
        website: null,
        beta: null,
        peRatio: null,
        eps: null,
        dividend: null,
        dividendYield: null,
        priceUpdatedAt: new Date(),
      });
      asset = await assetQueries.getById(assetId);
    }

    // Check if holding already exists
    const existingHolding = await holdingQueries.getByPortfolioAndAsset(portfolioId, assetId);

    const holdingData: Omit<Holding, 'id'> = {
      portfolioId,
      assetId,
      quantity: calculation.quantity,
      costBasis: calculation.costBasis,
      averageCost: calculation.averageCost,
      currentValue: calculation.currentValue,
      unrealizedGain: calculation.unrealizedGain,
      unrealizedGainPercent: calculation.unrealizedGainPercent,
      lots: [], // TODO: Implement tax lot tracking
      lastUpdated: new Date(),
    };

    if (existingHolding) {
      await holdingQueries.update(existingHolding.id, holdingData);
    } else {
      await holdingQueries.create(holdingData);
    }
  }

  /**
   * Perform the actual calculation for a set of transactions
   */
  private static performHoldingCalculation(transactions: Transaction[]): HoldingCalculation {
    let totalQuantity = new Decimal(0);
    let totalCostBasis = new Decimal(0);
    let totalShares = new Decimal(0); // For average cost calculation

    for (const transaction of transactions) {
      switch (transaction.type) {
        case 'buy':
        case 'transfer_in':
        case 'reinvestment':
          totalQuantity = totalQuantity.plus(transaction.quantity);
          totalCostBasis = totalCostBasis.plus(transaction.totalAmount);
          totalShares = totalShares.plus(transaction.quantity);
          break;

        case 'sell':
        case 'transfer_out':
          const sellQuantity = transaction.quantity;
          const sellRatio = totalQuantity.isZero() ? new Decimal(0) : sellQuantity.dividedBy(totalQuantity);
          const costReduction = totalCostBasis.mul(sellRatio);

          totalQuantity = totalQuantity.minus(sellQuantity);
          totalCostBasis = totalCostBasis.minus(costReduction);

          // Ensure we don't go negative
          if (totalQuantity.isNegative()) totalQuantity = new Decimal(0);
          if (totalCostBasis.isNegative()) totalCostBasis = new Decimal(0);
          break;

        case 'split':
          // Stock splits multiply quantity but don't change cost basis
          const splitRatio = transaction.quantity; // Assume this represents the split ratio
          totalQuantity = totalQuantity.mul(splitRatio);
          break;

        case 'dividend':
        case 'interest':
          // Dividends don't affect quantity or cost basis
          break;

        case 'spinoff':
          // For spinoffs, we'd need additional data about the new security
          // For now, treat as no change to current holding
          break;

        case 'merger':
          // For mergers, we'd need additional data about the exchange ratio
          // For now, treat as no change
          break;

        case 'fee':
        case 'tax':
          // Fees and taxes reduce cost basis but don't affect quantity
          totalCostBasis = totalCostBasis.minus(transaction.totalAmount);
          if (totalCostBasis.isNegative()) totalCostBasis = new Decimal(0);
          break;
      }
    }

    // Calculate average cost
    const averageCost = totalQuantity.isZero() ? new Decimal(0) : totalCostBasis.dividedBy(totalQuantity);

    // For current value, we'll use the last known price * quantity
    // In a real app, this would be updated with current market prices
    const currentPrice = averageCost; // Placeholder - should be real-time price
    const currentValue = totalQuantity.mul(currentPrice);

    // Calculate unrealized gain
    const unrealizedGain = currentValue.minus(totalCostBasis);
    const unrealizedGainPercent = totalCostBasis.isZero()
      ? 0
      : unrealizedGain.dividedBy(totalCostBasis).mul(100).toNumber();

    return {
      quantity: totalQuantity,
      costBasis: totalCostBasis,
      averageCost,
      currentValue,
      unrealizedGain,
      unrealizedGainPercent,
    };
  }

  /**
   * Remove holdings with zero quantity
   */
  private static async cleanupZeroHoldings(portfolioId: string): Promise<void> {
    const holdings = await db.getHoldingsByPortfolio(portfolioId);

    for (const holding of holdings) {
      if (holding.quantity.isZero()) {
        await holdingQueries.delete(holding.id);
      }
    }
  }

  /**
   * Update holdings after a transaction is added/modified/deleted
   */
  static async updateHoldingsForTransaction(transaction: Transaction): Promise<void> {
    const transactions = await db.transactions
      .where('[portfolioId+assetId]')
      .equals([transaction.portfolioId, transaction.assetId])
      .toArray();

    const convertedTransactions = transactions.map(t => (db as any).convertTransactionDecimals(t));

    await this.calculateAssetHolding(
      transaction.portfolioId,
      transaction.assetId,
      convertedTransactions
    );
  }

  /**
   * Update current market values for all holdings using latest prices
   */
  static async updateMarketValues(portfolioId: string): Promise<void> {
    const holdings = await db.getHoldingsByPortfolio(portfolioId);

    for (const holding of holdings) {
      const asset = await assetQueries.getById(holding.assetId);
      if (!asset) continue;

      const currentPrice = new Decimal(asset.currentPrice || 0);
      const currentValue = holding.quantity.mul(currentPrice);
      const unrealizedGain = currentValue.minus(holding.costBasis);
      const unrealizedGainPercent = holding.costBasis.isZero()
        ? 0
        : unrealizedGain.dividedBy(holding.costBasis).mul(100).toNumber();

      await holdingQueries.update(holding.id, {
        currentValue,
        unrealizedGain,
        unrealizedGainPercent,
        lastUpdated: new Date(),
      });
    }
  }
}

/**
 * Hook into transaction operations to automatically update holdings
 */
export const setupHoldingsSync = () => {
  // This would be called when the database is initialized
  // to set up automatic holdings updates when transactions change

  db.transactions.hook('creating', async (primKey, obj, trans) => {
    // Update holdings after transaction is created
    trans.on('complete', async () => {
      const transaction = await db.getTransactionWithDecimals(obj.id);
      if (transaction) {
        await HoldingsCalculator.updateHoldingsForTransaction(transaction);
      }
    });
  });

  db.transactions.hook('updating', async (modifications, primKey, obj, trans) => {
    trans.on('complete', async () => {
      const transaction = await db.getTransactionWithDecimals(primKey as string);
      if (transaction) {
        await HoldingsCalculator.updateHoldingsForTransaction(transaction);
      }
    });
  });

  db.transactions.hook('deleting', async (primKey, obj, trans) => {
    const transaction = obj as Transaction;
    trans.on('complete', async () => {
      // Recalculate holdings for the affected asset
      const remainingTransactions = await db.transactions
        .where('[portfolioId+assetId]')
        .equals([transaction.portfolioId, transaction.assetId])
        .toArray();

      const convertedTransactions = remainingTransactions.map(t => (db as any).convertTransactionDecimals(t));

      await HoldingsCalculator.calculateAssetHolding(
        transaction.portfolioId,
        transaction.assetId,
        convertedTransactions
      );
    });
  });
};