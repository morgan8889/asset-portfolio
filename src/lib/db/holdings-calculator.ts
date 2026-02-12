import { Decimal } from 'decimal.js';
import { Transaction, Holding, TaxLot } from '@/types';
import { db } from './schema';
import { assetQueries, holdingQueries } from './queries';
import { logger } from '@/lib/utils/logger';

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
  static async recalculatePortfolioHoldings(
    portfolioId: string
  ): Promise<void> {
    const transactions = await db.getTransactionsByPortfolio(portfolioId);

    // Group transactions by asset
    const transactionsByAsset = transactions.reduce(
      (acc, transaction) => {
        if (!acc[transaction.assetId]) {
          acc[transaction.assetId] = [];
        }
        acc[transaction.assetId].push(transaction);
        return acc;
      },
      {} as Record<string, Transaction[]>
    );

    // Calculate holdings for each asset
    for (const [assetId, assetTransactions] of Object.entries(
      transactionsByAsset
    )) {
      await this.calculateAssetHolding(portfolioId, assetId, assetTransactions);
    }

    // Clean up holdings with zero quantity
    await this.cleanupZeroHoldings(portfolioId);
  }

  /**
   * Calculate holding for a specific asset based on its transactions
   */
  static async calculateAssetHolding(
    portfolioId: string,
    assetId: string,
    transactions: Transaction[]
  ): Promise<void> {
    // Sort transactions by date to ensure proper order
    const sortedTransactions = transactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const calculation = this.performHoldingCalculation(sortedTransactions);

    // Skip if zero quantity
    if (calculation.quantity.isZero()) {
      // Delete existing holding if it exists
      const existingHolding = await holdingQueries.getByPortfolioAndAsset(
        portfolioId,
        assetId
      );
      if (existingHolding) {
        await holdingQueries.delete(existingHolding.id);
      }
      return;
    }

    // Get or create asset record
    let asset = await assetQueries.getById(assetId);
    if (!asset) {
      // Validate asset ID before creation
      const cleanAssetId = assetId.trim().toUpperCase();
      if (!cleanAssetId || cleanAssetId.length === 0) {
        logger.error(
          `Invalid asset ID: "${assetId}". Skipping asset creation.`
        );
        return;
      }

      // Determine asset type based on common patterns
      let assetType:
        | 'stock'
        | 'etf'
        | 'crypto'
        | 'bond'
        | 'real_estate'
        | 'commodity'
        | 'cash'
        | 'other' = 'stock';
      let exchange = 'NASDAQ';
      let currency = 'USD';

      // Simple heuristics for asset type detection
      if (
        cleanAssetId.endsWith('USD') ||
        cleanAssetId.endsWith('USDT') ||
        cleanAssetId.includes('BTC') ||
        cleanAssetId.includes('ETH')
      ) {
        assetType = 'crypto';
        exchange = 'CRYPTO';
      } else if (
        cleanAssetId.includes('BOND') ||
        cleanAssetId.includes('TLT') ||
        cleanAssetId.includes('AGG')
      ) {
        assetType = 'bond';
        exchange = 'NYSE';
      } else if (
        cleanAssetId.includes('GLD') ||
        cleanAssetId.includes('SLV') ||
        cleanAssetId.includes('GOLD')
      ) {
        assetType = 'commodity';
        exchange = 'NYSE';
      }

      // Create asset record with validated data
      try {
        await assetQueries.create({
          symbol: cleanAssetId,
          name: cleanAssetId, // Will be updated when we fetch real data
          type: assetType,
          exchange,
          currency,
          currentPrice: 0,
          priceUpdatedAt: new Date(),
          metadata: {},
        });
        asset = await assetQueries.getById(cleanAssetId);
      } catch (err) {
        logger.error(`Failed to create asset "${cleanAssetId}":`, err);
        return;
      }
    }

    // Check if holding already exists
    const existingHolding = await holdingQueries.getByPortfolioAndAsset(
      portfolioId,
      assetId
    );

    const holdingData: Omit<Holding, 'id'> = {
      portfolioId,
      assetId,
      quantity: calculation.quantity,
      costBasis: calculation.costBasis,
      averageCost: calculation.averageCost,
      currentValue: calculation.currentValue,
      unrealizedGain: calculation.unrealizedGain,
      unrealizedGainPercent: calculation.unrealizedGainPercent,
      lots: this.buildTaxLotsFromTransactions(sortedTransactions),
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
  private static performHoldingCalculation(
    transactions: Transaction[]
  ): HoldingCalculation {
    let totalQuantity = new Decimal(0);
    let totalCostBasis = new Decimal(0);
    let totalShares = new Decimal(0); // For average cost calculation

    for (const transaction of transactions) {
      switch (transaction.type) {
        case 'buy':
        case 'transfer_in':
        case 'reinvestment':
        case 'espp_purchase':
        case 'rsu_vest':
          totalQuantity = totalQuantity.plus(transaction.quantity);
          totalCostBasis = totalCostBasis.plus(transaction.totalAmount);
          totalShares = totalShares.plus(transaction.quantity);
          break;

        case 'sell':
        case 'transfer_out':
          const sellQuantity = transaction.quantity;

          // Validate that we have enough quantity to sell
          if (totalQuantity.lessThan(sellQuantity)) {
            console.warn(
              `Warning: Attempting to sell ${sellQuantity.toString()} but only have ${totalQuantity.toString()} available.`,
              `Transaction date: ${transaction.date}, Asset: ${transaction.assetId}`
            );
            // Only sell what we have
            const actualSellQuantity = totalQuantity;
            const sellRatio = totalQuantity.isZero()
              ? new Decimal(0)
              : actualSellQuantity.dividedBy(totalQuantity);
            const costReduction = totalCostBasis.mul(sellRatio);

            totalQuantity = new Decimal(0);
            totalCostBasis = totalCostBasis.minus(costReduction);
          } else {
            // Normal sell - we have enough quantity
            const sellRatio = totalQuantity.isZero()
              ? new Decimal(0)
              : sellQuantity.dividedBy(totalQuantity);
            const costReduction = totalCostBasis.mul(sellRatio);

            totalQuantity = totalQuantity.minus(sellQuantity);
            totalCostBasis = totalCostBasis.minus(costReduction);
          }

          // Ensure we don't go negative (extra safety check)
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
    const averageCost = totalQuantity.isZero()
      ? new Decimal(0)
      : totalCostBasis.dividedBy(totalQuantity);

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
   * Build tax lots from purchase transactions
   */
  private static buildTaxLotsFromTransactions(
    transactions: Transaction[]
  ): TaxLot[] {
    const lots: TaxLot[] = [];

    for (const transaction of transactions) {
      // Only build lots for purchase transactions
      if (
        !['buy', 'espp_purchase', 'rsu_vest', 'transfer_in'].includes(
          transaction.type
        )
      ) {
        continue;
      }

      const lot: TaxLot = {
        id: transaction.id, // Use transaction ID as lot ID
        quantity: transaction.quantity,
        purchasePrice: transaction.price,
        purchaseDate: new Date(transaction.date),
        soldQuantity: new Decimal(0), // Will be updated by sell transactions in future
        remainingQuantity: transaction.quantity, // Initial = full quantity
        notes: transaction.notes,
      };

      // Detect lot type and extract metadata
      if (transaction.type === 'espp_purchase') {
        lot.lotType = 'espp';
        const metadata = transaction.metadata;
        if (metadata?.grantDate) {
          lot.grantDate = new Date(metadata.grantDate);
        }
        if (metadata?.bargainElement !== undefined) {
          lot.bargainElement = new Decimal(metadata.bargainElement);
        }
      } else if (transaction.type === 'rsu_vest') {
        lot.lotType = 'rsu';
        const metadata = transaction.metadata;
        if (metadata?.vestingDate) {
          lot.vestingDate = new Date(metadata.vestingDate);
        }
        if (metadata?.vestingPrice !== undefined) {
          lot.vestingPrice = new Decimal(metadata.vestingPrice);
        }
      } else {
        lot.lotType = 'standard';
      }

      lots.push(lot);
    }

    return lots;
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
  static async updateHoldingsForTransaction(
    transaction: Transaction
  ): Promise<void> {
    const transactions = await db.transactions
      .where('[portfolioId+assetId]')
      .equals([transaction.portfolioId, transaction.assetId])
      .toArray();

    const convertedTransactions = transactions.map((t) =>
      db.convertTransactionDecimals(t)
    );

    await this.calculateAssetHolding(
      transaction.portfolioId,
      transaction.assetId,
      convertedTransactions
    );
  }

  /**
   * Update current market values for all holdings using latest prices
   * Factors in ownershipPercentage for properties and fractional assets
   */
  static async updateMarketValues(portfolioId: string): Promise<void> {
    const holdings = await db.getHoldingsByPortfolio(portfolioId);

    for (const holding of holdings) {
      const asset = await assetQueries.getById(holding.assetId);
      if (!asset) continue;

      const currentPrice = new Decimal(asset.currentPrice || 0);
      const ownershipPercentage = holding.ownershipPercentage ?? 100;

      // Calculate market value factoring in ownership percentage
      const fullMarketValue = holding.quantity.mul(currentPrice);
      const currentValue = fullMarketValue.mul(ownershipPercentage).div(100);

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

// Debounce helper for batching recalculation requests
const debounceTimers = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_DELAY = 500; // 500ms delay

function debounceHoldingsUpdate(
  portfolioId: string,
  assetId: string,
  callback: () => Promise<void>
) {
  const key = `${portfolioId}-${assetId}`;

  // Clear existing timer
  const existingTimer = debounceTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = setTimeout(async () => {
    debounceTimers.delete(key);
    try {
      await callback();
    } catch (error) {
      logger.error('Error in debounced holdings update:', error);
    }
  }, DEBOUNCE_DELAY);

  debounceTimers.set(key, timer);
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
        // Use debouncing for batch operations
        debounceHoldingsUpdate(
          transaction.portfolioId,
          transaction.assetId,
          () => HoldingsCalculator.updateHoldingsForTransaction(transaction)
        );
      }
    });
  });

  db.transactions.hook(
    'updating',
    async (modifications, primKey, obj, trans) => {
      trans.on('complete', async () => {
        const transaction = await db.getTransactionWithDecimals(
          primKey as string
        );
        if (transaction) {
          // Use debouncing for batch operations
          debounceHoldingsUpdate(
            transaction.portfolioId,
            transaction.assetId,
            () => HoldingsCalculator.updateHoldingsForTransaction(transaction)
          );
        }
      });
    }
  );

  db.transactions.hook('deleting', async (primKey, obj, trans) => {
    // Convert storage type to domain type for processing
    const storageTransaction = obj as import('@/types').TransactionStorage;
    const transaction = db.convertTransactionDecimals(storageTransaction);
    trans.on('complete', async () => {
      // Use debouncing for batch operations
      debounceHoldingsUpdate(
        transaction.portfolioId,
        transaction.assetId,
        async () => {
          // Recalculate holdings for the affected asset
          const remainingTransactions = await db.transactions
            .where('[portfolioId+assetId]')
            .equals([transaction.portfolioId, transaction.assetId])
            .toArray();

          const convertedTransactions = remainingTransactions.map((t) =>
            db.convertTransactionDecimals(t)
          );

          await HoldingsCalculator.calculateAssetHolding(
            transaction.portfolioId,
            transaction.assetId,
            convertedTransactions
          );
        }
      );
    });
  });
};
