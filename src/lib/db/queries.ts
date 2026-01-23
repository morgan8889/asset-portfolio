import { Decimal } from 'decimal.js';

import { db } from './schema';
import {
  Portfolio,
  Asset,
  Holding,
  Transaction,
  PriceSnapshot,
  TransactionFilter,
  TransactionSummary,
} from '@/types';

// Portfolio queries
export const portfolioQueries = {
  async getAll(): Promise<Portfolio[]> {
    return await db.portfolios.orderBy('name').toArray();
  },

  async getById(id: string): Promise<Portfolio | undefined> {
    return await db.portfolios.get(id);
  },

  async create(portfolio: Omit<Portfolio, 'id'>): Promise<string> {
    const id = await db.portfolios.add({
      ...portfolio,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Portfolio);
    return id as string;
  },

  async update(id: string, updates: Partial<Portfolio>): Promise<void> {
    await db.portfolios.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  },

  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.portfolios, db.holdings, db.transactions, async () => {
      // Delete related holdings and transactions first
      await db.holdings.where('portfolioId').equals(id).delete();
      await db.transactions.where('portfolioId').equals(id).delete();
      await db.portfolios.delete(id);
    });
  },
};

// Asset queries
export const assetQueries = {
  async getAll(): Promise<Asset[]> {
    return await db.assets.orderBy('symbol').toArray();
  },

  async getById(id: string): Promise<Asset | undefined> {
    return await db.assets.get(id);
  },

  async getBySymbol(symbol: string): Promise<Asset | undefined> {
    return await db.assets.where('symbol').equalsIgnoreCase(symbol).first();
  },

  async search(query: string, limit: number = 50): Promise<Asset[]> {
    const lowerQuery = query.toLowerCase();
    return await db.assets
      .filter(
        (asset) =>
          asset.symbol.toLowerCase().includes(lowerQuery) ||
          asset.name.toLowerCase().includes(lowerQuery)
      )
      .limit(limit)
      .toArray();
  },

  async create(asset: Omit<Asset, 'id'>): Promise<string> {
    const existing = await this.getBySymbol(asset.symbol);
    if (existing) {
      throw new Error(`Asset with symbol ${asset.symbol} already exists`);
    }

    const id = await db.assets.add({
      ...asset,
      id: crypto.randomUUID(),
    } as Asset);
    return id as string;
  },

  async update(id: string, updates: Partial<Asset>): Promise<void> {
    await db.assets.update(id, updates);
  },

  async updatePrice(id: string, price: number): Promise<void> {
    await db.assets.update(id, {
      currentPrice: price,
      priceUpdatedAt: new Date(),
    });
  },

  async delete(id: string): Promise<void> {
    await db.transaction(
      'rw',
      db.assets,
      db.holdings,
      db.transactions,
      db.priceHistory,
      db.priceSnapshots,
      db.dividendRecords,
      async () => {
        // Check if asset is used in any holdings
        const holdingsCount = await db.holdings.where('assetId').equals(id).count();
        if (holdingsCount > 0) {
          throw new Error('Cannot delete asset that is used in holdings');
        }

        // Delete related data
        await db.transactions.where('assetId').equals(id).delete();
        await db.priceHistory.where('assetId').equals(id).delete();
        await db.priceSnapshots.where('assetId').equals(id).delete();
        await db.dividendRecords.where('assetId').equals(id).delete();
        await db.assets.delete(id);
      }
    );
  },
};

// Holding queries
export const holdingQueries = {
  async getByPortfolio(portfolioId: string): Promise<Holding[]> {
    return await db.getHoldingsByPortfolio(portfolioId);
  },

  async getById(id: string): Promise<Holding | undefined> {
    return await db.getHoldingWithDecimals(id);
  },

  async getByPortfolioAndAsset(
    portfolioId: string,
    assetId: string
  ): Promise<Holding | undefined> {
    const holding = await db.holdings
      .where(['portfolioId', 'assetId'])
      .equals([portfolioId, assetId])
      .first();

    if (!holding) return undefined;
    return db.getHoldingWithDecimals(holding.id);
  },

  async create(holding: Omit<Holding, 'id'>): Promise<string> {
    // Check if holding already exists for this portfolio/asset combination
    const existing = await this.getByPortfolioAndAsset(
      holding.portfolioId,
      holding.assetId
    );
    if (existing) {
      throw new Error('Holding already exists for this portfolio and asset');
    }

    const id = await db.holdings.add({
      ...holding,
      id: crypto.randomUUID(),
      lastUpdated: new Date(),
    } as Holding);
    return id as string;
  },

  async update(id: string, updates: Partial<Holding>): Promise<void> {
    // Convert Decimal values to strings for IndexedDB storage
    const serializedUpdates: any = { ...updates };
    if (serializedUpdates.quantity instanceof Decimal) {
      serializedUpdates.quantity = serializedUpdates.quantity.toString();
    }
    if (serializedUpdates.costBasis instanceof Decimal) {
      serializedUpdates.costBasis = serializedUpdates.costBasis.toString();
    }
    if (serializedUpdates.averageCost instanceof Decimal) {
      serializedUpdates.averageCost = serializedUpdates.averageCost.toString();
    }
    if (serializedUpdates.currentValue instanceof Decimal) {
      serializedUpdates.currentValue = serializedUpdates.currentValue.toString();
    }
    if (serializedUpdates.unrealizedGain instanceof Decimal) {
      serializedUpdates.unrealizedGain = serializedUpdates.unrealizedGain.toString();
    }
    await db.holdings.update(id, {
      ...serializedUpdates,
      lastUpdated: new Date(),
    });
  },

  async delete(id: string): Promise<void> {
    await db.holdings.delete(id);
  },

  async updateQuantityAndValue(
    id: string,
    quantity: Decimal,
    currentValue: Decimal
  ): Promise<void> {
    const holding = await this.getById(id);
    if (!holding) throw new Error('Holding not found');

    const unrealizedGain = currentValue.minus(holding.costBasis);
    const unrealizedGainPercent = holding.costBasis.isZero()
      ? 0
      : unrealizedGain.dividedBy(holding.costBasis).mul(100).toNumber();

    await this.update(id, {
      quantity,
      currentValue,
      unrealizedGain,
      unrealizedGainPercent,
    });
  },
};

// Transaction queries
export const transactionQueries = {
  async getByPortfolio(portfolioId: string): Promise<Transaction[]> {
    return await db.getTransactionsByPortfolio(portfolioId);
  },

  async getById(id: string): Promise<Transaction | undefined> {
    return await db.getTransactionWithDecimals(id);
  },

  async getByAsset(assetId: string): Promise<Transaction[]> {
    const transactions = await db.transactions
      .where('assetId')
      .equals(assetId)
      .toArray();

    return transactions.map((t) => (db as any).convertTransactionDecimals(t));
  },

  async getFiltered(filter: TransactionFilter): Promise<Transaction[]> {
    let query = db.transactions.toCollection();

    if (filter.portfolioId) {
      query = query.filter((t) => t.portfolioId === filter.portfolioId);
    }

    if (filter.assetId) {
      query = query.filter((t) => t.assetId === filter.assetId);
    }

    if (filter.type && filter.type.length > 0) {
      query = query.filter((t) => filter.type!.includes(t.type));
    }

    if (filter.dateFrom) {
      query = query.filter((t) => t.date >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      query = query.filter((t) => t.date <= filter.dateTo!);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      query = query.filter(
        (t) =>
          (t.notes?.toLowerCase().includes(searchLower) ?? false) ||
          (t.importSource?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    const transactions = await query.toArray();
    return transactions.map((t) => (db as any).convertTransactionDecimals(t));
  },

  async create(transaction: Omit<Transaction, 'id'>): Promise<string> {
    const id = await db.transactions.add({
      ...transaction,
      id: crypto.randomUUID(),
    } as Transaction);
    return id as string;
  },

  async createMany(transactions: Omit<Transaction, 'id'>[]): Promise<string[]> {
    const transactionsWithIds = transactions.map((t) => ({
      ...t,
      id: crypto.randomUUID(),
    }));

    await db.transactions.bulkAdd(transactionsWithIds as Transaction[]);
    return transactionsWithIds.map((t) => t.id);
  },

  async update(id: string, updates: Partial<Transaction>): Promise<void> {
    await db.transactions.update(id, updates);
  },

  async delete(id: string): Promise<void> {
    await db.transactions.delete(id);
  },

  async getSummary(portfolioId?: string): Promise<TransactionSummary> {
    let query = db.transactions.toCollection();

    if (portfolioId) {
      query = query.filter((t) => t.portfolioId === portfolioId);
    }

    const transactions = await query.toArray();
    const convertedTransactions = transactions.map((t) =>
      (db as any).convertTransactionDecimals(t)
    );

    const totalTransactions = convertedTransactions.length;
    const totalBuys = convertedTransactions.filter((t) => t.type === 'buy').length;
    const totalSells = convertedTransactions.filter((t) => t.type === 'sell').length;
    const totalDividends = convertedTransactions.filter(
      (t) => t.type === 'dividend'
    ).length;

    const totalInvested = convertedTransactions
      .filter((t) => t.type === 'buy')
      .reduce((sum, t) => sum.plus(t.totalAmount), new Decimal(0));

    const totalDividendIncome = convertedTransactions
      .filter((t) => t.type === 'dividend')
      .reduce((sum, t) => sum.plus(t.totalAmount), new Decimal(0));

    const totalFees = convertedTransactions.reduce(
      (sum, t) => sum.plus(t.fees),
      new Decimal(0)
    );

    const dates = convertedTransactions.map((t) => t.date).sort();
    const dateRange = {
      earliest: dates[0] || new Date(),
      latest: dates[dates.length - 1] || new Date(),
    };

    return {
      totalTransactions,
      totalBuys,
      totalSells,
      totalDividends,
      totalInvested,
      totalDividendIncome,
      totalFees,
      dateRange,
    };
  },
};

// Price queries
export const priceQueries = {
  async getLatestSnapshot(assetId: string): Promise<PriceSnapshot | undefined> {
    return await db.getLatestPriceSnapshot(assetId);
  },

  async saveSnapshot(snapshot: Omit<PriceSnapshot, 'id'>): Promise<void> {
    await db.priceSnapshots.add({
      ...snapshot,
      id: crypto.randomUUID(),
    } as any);
  },

  async saveBatchSnapshots(snapshots: Omit<PriceSnapshot, 'id'>[]): Promise<void> {
    const snapshotsWithIds = snapshots.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
    }));

    await db.priceSnapshots.bulkAdd(snapshotsWithIds as any[]);
  },

  async getHistoryForAsset(
    assetId: string,
    days: number = 30
  ): Promise<PriceSnapshot[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const snapshots = await db.priceSnapshots
      .where('assetId')
      .equals(assetId)
      .filter((snapshot) => snapshot.timestamp >= cutoffDate)
      .toArray();

    // Sort manually by timestamp
    const sortedSnapshots = snapshots.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sortedSnapshots.map((s) => (db as any).convertPriceSnapshotDecimals(s));
  },

  async cleanOldSnapshots(daysToKeep: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await db.priceSnapshots.where('timestamp').below(cutoffDate).delete();
  },
};

// Settings queries
export const settingsQueries = {
  async get(key: string): Promise<any> {
    const setting = await db.userSettings.where('key').equals(key).first();
    return setting?.value;
  },

  async set(key: string, value: any): Promise<void> {
    const existing = await db.userSettings.where('key').equals(key).first();

    if (existing) {
      await db.userSettings.update(existing.id!, {
        value,
        updatedAt: new Date(),
      });
    } else {
      await db.userSettings.add({
        key,
        value,
        updatedAt: new Date(),
      });
    }
  },

  async delete(key: string): Promise<void> {
    await db.userSettings.where('key').equals(key).delete();
  },

  async getAll(): Promise<Record<string, any>> {
    const settings = await db.userSettings.toArray();
    return settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, any>
    );
  },
};