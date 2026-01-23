import Dexie, { Table } from 'dexie';
import { Decimal } from 'decimal.js';

import {
  Portfolio,
  Asset,
  Holding,
  Transaction,
  PriceHistory,
  PriceSnapshot,
  DividendRecord,
} from '@/types';

// User settings interface
export interface UserSettings {
  id?: number;
  key: string;
  value: any;
  updatedAt: Date;
}

// Extend Dexie with type information
export class PortfolioDatabase extends Dexie {
  // Declare tables
  portfolios!: Table<Portfolio>;
  assets!: Table<Asset>;
  holdings!: Table<Holding>;
  transactions!: Table<Transaction>;
  priceHistory!: Table<PriceHistory>;
  priceSnapshots!: Table<PriceSnapshot>;
  dividendRecords!: Table<DividendRecord>;
  userSettings!: Table<UserSettings>;

  constructor() {
    super('PortfolioTrackerDB');

    // Define schema
    this.version(1).stores({
      portfolios: '++id, name, type, createdAt, updatedAt',
      assets: '++id, symbol, name, type, exchange, currency',
      holdings:
        '++id, portfolioId, assetId, [portfolioId+assetId], lastUpdated',
      transactions:
        '++id, portfolioId, assetId, date, type, [portfolioId+date], [assetId+date]',
      priceHistory: '++id, assetId, date, [assetId+date], source',
      priceSnapshots: '++id, assetId, timestamp, [assetId+timestamp], source',
      dividendRecords:
        '++id, assetId, portfolioId, paymentDate, [assetId+paymentDate]',
      userSettings: '++id, key',
    });

    // Add hooks for data transformation
    this.portfolios.hook('creating', this.transformPortfolio);
    this.assets.hook('creating', this.transformAsset);
    this.holdings.hook('creating', this.transformHolding);
    this.transactions.hook('creating', this.transformTransaction);
    this.priceHistory.hook('creating', this.transformPriceHistory);
    this.priceSnapshots.hook('creating', this.transformPriceSnapshot);
    this.dividendRecords.hook('creating', this.transformDividendRecord);

    // Add updating hooks for tables with Decimal fields
    this.holdings.hook('updating', this.transformHoldingUpdates);
    this.transactions.hook('updating', this.transformTransactionUpdates);
  }

  // Transform updates for holdings (different signature than creating hook)
  private transformHoldingUpdates = (
    modifications: Partial<Holding>,
    _primKey: any,
    _obj: Holding,
    _trans: any
  ): Partial<Holding> | void => {
    if (modifications.quantity instanceof Decimal) {
      (modifications as any).quantity = modifications.quantity.toString();
    }
    if (modifications.costBasis instanceof Decimal) {
      (modifications as any).costBasis = modifications.costBasis.toString();
    }
    if (modifications.averageCost instanceof Decimal) {
      (modifications as any).averageCost = modifications.averageCost.toString();
    }
    if (modifications.currentValue instanceof Decimal) {
      (modifications as any).currentValue = modifications.currentValue.toString();
    }
    if (modifications.unrealizedGain instanceof Decimal) {
      (modifications as any).unrealizedGain = modifications.unrealizedGain.toString();
    }
  };

  // Transform updates for transactions
  private transformTransactionUpdates = (
    modifications: Partial<Transaction>,
    _primKey: any,
    _obj: Transaction,
    _trans: any
  ): Partial<Transaction> | void => {
    if (modifications.quantity instanceof Decimal) {
      (modifications as any).quantity = modifications.quantity.toString();
    }
    if (modifications.price instanceof Decimal) {
      (modifications as any).price = modifications.price.toString();
    }
    if (modifications.totalAmount instanceof Decimal) {
      (modifications as any).totalAmount = modifications.totalAmount.toString();
    }
    if (modifications.fees instanceof Decimal) {
      (modifications as any).fees = modifications.fees.toString();
    }
  }

  // Transform functions to handle Decimal.js serialization
  private transformPortfolio = (
    _primKey: any,
    obj: Portfolio,
    _trans: any
  ): void => {
    // Convert any Decimal fields to strings for storage
    // Portfolio doesn't have Decimal fields currently, but we include this for consistency
  };

  private transformAsset = (_primKey: any, obj: Asset, _trans: any): void => {
    // Convert Date objects to ensure proper storage
    if (obj.priceUpdatedAt && !(obj.priceUpdatedAt instanceof Date)) {
      obj.priceUpdatedAt = new Date(obj.priceUpdatedAt);
    }
  };

  private transformHolding = (_primKey: any, obj: Holding, _trans: any): void => {
    // Convert Decimal fields to strings for storage
    if (obj.quantity instanceof Decimal) {
      (obj as any).quantity = obj.quantity.toString();
    }
    if (obj.costBasis instanceof Decimal) {
      (obj as any).costBasis = obj.costBasis.toString();
    }
    if (obj.averageCost instanceof Decimal) {
      (obj as any).averageCost = obj.averageCost.toString();
    }
    if (obj.currentValue instanceof Decimal) {
      (obj as any).currentValue = obj.currentValue.toString();
    }
    if (obj.unrealizedGain instanceof Decimal) {
      (obj as any).unrealizedGain = obj.unrealizedGain.toString();
    }

    // Transform tax lots
    if (obj.lots) {
      obj.lots = obj.lots.map((lot) => ({
        ...lot,
        quantity:
          lot.quantity instanceof Decimal
            ? lot.quantity.toString()
            : lot.quantity,
        purchasePrice:
          lot.purchasePrice instanceof Decimal
            ? lot.purchasePrice.toString()
            : lot.purchasePrice,
        soldQuantity:
          lot.soldQuantity instanceof Decimal
            ? lot.soldQuantity.toString()
            : lot.soldQuantity,
        remainingQuantity:
          lot.remainingQuantity instanceof Decimal
            ? lot.remainingQuantity.toString()
            : lot.remainingQuantity,
      })) as any;
    }

    // Ensure lastUpdated is a Date
    if (obj.lastUpdated && !(obj.lastUpdated instanceof Date)) {
      obj.lastUpdated = new Date(obj.lastUpdated);
    }
  };

  private transformTransaction = (
    _primKey: any,
    obj: Transaction,
    _trans: any
  ): void => {
    // Convert Decimal fields to strings for storage
    if (obj.quantity instanceof Decimal) {
      (obj as any).quantity = obj.quantity.toString();
    }
    if (obj.price instanceof Decimal) {
      (obj as any).price = obj.price.toString();
    }
    if (obj.totalAmount instanceof Decimal) {
      (obj as any).totalAmount = obj.totalAmount.toString();
    }
    if (obj.fees instanceof Decimal) {
      (obj as any).fees = obj.fees.toString();
    }

    // Ensure date is a Date object
    if (obj.date && !(obj.date instanceof Date)) {
      obj.date = new Date(obj.date);
    }
  };

  private transformPriceHistory = (
    _primKey: any,
    obj: PriceHistory,
    _trans: any
  ): void => {
    // Convert Decimal fields to strings for storage
    const decimalFields = ['open', 'high', 'low', 'close', 'adjustedClose'];
    decimalFields.forEach((field) => {
      if (obj[field as keyof PriceHistory] instanceof Decimal) {
        (obj as any)[field] = (
          obj[field as keyof PriceHistory] as Decimal
        ).toString();
      }
    });

    // Ensure date is a Date object
    if (obj.date && !(obj.date instanceof Date)) {
      obj.date = new Date(obj.date);
    }
  };

  private transformPriceSnapshot = (
    _primKey: any,
    obj: PriceSnapshot,
    _trans: any
  ): void => {
    // Convert Decimal fields to strings for storage
    if (obj.price instanceof Decimal) {
      (obj as any).price = obj.price.toString();
    }
    if (obj.change instanceof Decimal) {
      (obj as any).change = obj.change.toString();
    }

    // Ensure timestamp is a Date object
    if (obj.timestamp && !(obj.timestamp instanceof Date)) {
      obj.timestamp = new Date(obj.timestamp);
    }
  };

  private transformDividendRecord = (
    _primKey: any,
    obj: DividendRecord,
    _trans: any
  ): void => {
    // Convert Decimal fields to strings for storage
    if (obj.amount instanceof Decimal) {
      (obj as any).amount = obj.amount.toString();
    }
    if (obj.perShare instanceof Decimal) {
      (obj as any).perShare = obj.perShare.toString();
    }
    if (obj.shares instanceof Decimal) {
      (obj as any).shares = obj.shares.toString();
    }
    if (obj.price instanceof Decimal) {
      (obj as any).price = obj.price.toString();
    }

    // Ensure dates are Date objects
    const dateFields = ['paymentDate', 'recordDate', 'exDividendDate'];
    dateFields.forEach((field) => {
      if (
        obj[field as keyof DividendRecord] &&
        !(obj[field as keyof DividendRecord] instanceof Date)
      ) {
        (obj as any)[field] = new Date(obj[field as keyof DividendRecord] as any);
      }
    });
  };

  // Helper methods for data retrieval with proper Decimal conversion
  async getHoldingWithDecimals(id: string): Promise<Holding | undefined> {
    const holding = await this.holdings.get(id);
    if (!holding) return undefined;

    return this.convertHoldingDecimals(holding);
  }

  async getTransactionWithDecimals(id: string): Promise<Transaction | undefined> {
    const transaction = await this.transactions.get(id);
    if (!transaction) return undefined;

    return this.convertTransactionDecimals(transaction);
  }

  async getHoldingsByPortfolio(portfolioId: string): Promise<Holding[]> {
    const holdings = await this.holdings
      .where('portfolioId')
      .equals(portfolioId)
      .toArray();

    return holdings.map((holding) => this.convertHoldingDecimals(holding));
  }

  async getTransactionsByPortfolio(portfolioId: string): Promise<Transaction[]> {
    const transactions = await this.transactions
      .where('portfolioId')
      .equals(portfolioId)
      .toArray();

    return transactions.map((transaction) =>
      this.convertTransactionDecimals(transaction)
    );
  }

  async getLatestPriceSnapshot(assetId: string): Promise<PriceSnapshot | undefined> {
    const snapshots = await this.priceSnapshots
      .where('assetId')
      .equals(assetId)
      .toArray();

    if (snapshots.length === 0) return undefined;

    // Sort by timestamp manually since orderBy doesn't work on filtered collections
    const latestSnapshot = snapshots.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    return this.convertPriceSnapshotDecimals(latestSnapshot);
  }

  // Conversion helper methods
  private convertHoldingDecimals(holding: any): Holding {
    return {
      ...holding,
      quantity: new Decimal(holding.quantity || 0),
      costBasis: new Decimal(holding.costBasis || 0),
      averageCost: new Decimal(holding.averageCost || 0),
      currentValue: new Decimal(holding.currentValue || 0),
      unrealizedGain: new Decimal(holding.unrealizedGain || 0),
      lots: holding.lots?.map((lot: any) => ({
        ...lot,
        quantity: new Decimal(lot.quantity || 0),
        purchasePrice: new Decimal(lot.purchasePrice || 0),
        soldQuantity: new Decimal(lot.soldQuantity || 0),
        remainingQuantity: new Decimal(lot.remainingQuantity || 0),
      })) || [],
    };
  }

  private convertTransactionDecimals(transaction: any): Transaction {
    return {
      ...transaction,
      quantity: new Decimal(transaction.quantity || 0),
      price: new Decimal(transaction.price || 0),
      totalAmount: new Decimal(transaction.totalAmount || 0),
      fees: new Decimal(transaction.fees || 0),
    };
  }

  private convertPriceSnapshotDecimals(snapshot: any): PriceSnapshot {
    return {
      ...snapshot,
      price: new Decimal(snapshot.price || 0),
      change: new Decimal(snapshot.change || 0),
    };
  }

  private convertPriceHistoryDecimals(history: any): PriceHistory {
    return {
      ...history,
      open: new Decimal(history.open || 0),
      high: new Decimal(history.high || 0),
      low: new Decimal(history.low || 0),
      close: new Decimal(history.close || 0),
      adjustedClose: new Decimal(history.adjustedClose || 0),
    };
  }

  private convertDividendRecordDecimals(record: any): DividendRecord {
    return {
      ...record,
      amount: new Decimal(record.amount || 0),
      perShare: new Decimal(record.perShare || 0),
      shares: record.shares ? new Decimal(record.shares) : undefined,
      price: record.price ? new Decimal(record.price) : undefined,
    };
  }
}

// Create and export the database instance
export const db = new PortfolioDatabase();