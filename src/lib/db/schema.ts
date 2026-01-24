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
  TaxLot,
  HoldingStorage,
  TransactionStorage,
  PriceHistoryStorage,
  PriceSnapshotStorage,
  DividendRecordStorage,
  TaxLotStorage,
  createHoldingId,
  createTransactionId,
  createPriceHistoryId,
  createPriceSnapshotId,
  createDividendRecordId,
} from '@/types';

import {
  serializeDecimalFields,
  deserializeDecimalFields,
  HOLDING_DECIMAL_FIELDS,
  TAX_LOT_DECIMAL_FIELDS,
  TRANSACTION_DECIMAL_FIELDS,
  PRICE_HISTORY_DECIMAL_FIELDS,
  PRICE_SNAPSHOT_DECIMAL_FIELDS,
  DIVIDEND_RECORD_DECIMAL_FIELDS,
  toDecimal,
} from '@/lib/utils/decimal-serialization';

// User settings interface
export interface UserSettings {
  id?: number;
  key: string;
  value: unknown;
  updatedAt: Date;
}

// Extend Dexie with type information
export class PortfolioDatabase extends Dexie {
  // Declare tables with storage types
  portfolios!: Table<Portfolio>;
  assets!: Table<Asset>;
  holdings!: Table<HoldingStorage>;
  transactions!: Table<TransactionStorage>;
  priceHistory!: Table<PriceHistoryStorage>;
  priceSnapshots!: Table<PriceSnapshotStorage>;
  dividendRecords!: Table<DividendRecordStorage>;
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
        '++id, portfolioId, assetId, date, type, [portfolioId+date], [assetId+date], [portfolioId+assetId]',
      priceHistory: '++id, assetId, date, [assetId+date], source',
      priceSnapshots: '++id, assetId, timestamp, [assetId+timestamp], source',
      dividendRecords:
        '++id, assetId, portfolioId, paymentDate, [assetId+paymentDate]',
      userSettings: '++id, key',
    });

    // Add hooks for data transformation
    this.holdings.hook('creating', this.transformHolding);
    this.transactions.hook('creating', this.transformTransaction);
    this.priceHistory.hook('creating', this.transformPriceHistory);
    this.priceSnapshots.hook('creating', this.transformPriceSnapshot);
    this.dividendRecords.hook('creating', this.transformDividendRecord);
    this.assets.hook('creating', this.transformAsset);
  }

  // Transform functions using generic serialization utility

  private transformAsset = (_primKey: unknown, obj: Asset, _trans: unknown): void => {
    // Convert Date objects to ensure proper storage
    if (obj.priceUpdatedAt && !(obj.priceUpdatedAt instanceof Date)) {
      obj.priceUpdatedAt = new Date(obj.priceUpdatedAt);
    }
  };

  private transformHolding = (
    _primKey: unknown,
    obj: Holding | HoldingStorage,
    _trans: unknown
  ): void => {
    // Serialize main decimal fields
    const serialized = serializeDecimalFields(obj, [...HOLDING_DECIMAL_FIELDS]);
    Object.assign(obj, serialized);

    // Transform tax lots
    if ((obj as Holding).lots) {
      (obj as HoldingStorage).lots = (obj as Holding).lots.map((lot) =>
        serializeDecimalFields(lot, [...TAX_LOT_DECIMAL_FIELDS]) as unknown as TaxLotStorage
      );
    }

    // Ensure lastUpdated is a Date
    if (obj.lastUpdated && !(obj.lastUpdated instanceof Date)) {
      obj.lastUpdated = new Date(obj.lastUpdated);
    }
  };

  private transformTransaction = (
    _primKey: unknown,
    obj: Transaction | TransactionStorage,
    _trans: unknown
  ): void => {
    // Serialize decimal fields
    const serialized = serializeDecimalFields(obj, [...TRANSACTION_DECIMAL_FIELDS]);
    Object.assign(obj, serialized);

    // Ensure date is a Date object
    if (obj.date && !(obj.date instanceof Date)) {
      obj.date = new Date(obj.date);
    }
  };

  private transformPriceHistory = (
    _primKey: unknown,
    obj: PriceHistory | PriceHistoryStorage,
    _trans: unknown
  ): void => {
    // Serialize decimal fields
    const serialized = serializeDecimalFields(obj, [...PRICE_HISTORY_DECIMAL_FIELDS]);
    Object.assign(obj, serialized);

    // Ensure date is a Date object
    if (obj.date && !(obj.date instanceof Date)) {
      obj.date = new Date(obj.date);
    }
  };

  private transformPriceSnapshot = (
    _primKey: unknown,
    obj: PriceSnapshot | PriceSnapshotStorage,
    _trans: unknown
  ): void => {
    // Serialize decimal fields
    const serialized = serializeDecimalFields(obj, [...PRICE_SNAPSHOT_DECIMAL_FIELDS]);
    Object.assign(obj, serialized);

    // Ensure timestamp is a Date object
    if (obj.timestamp && !(obj.timestamp instanceof Date)) {
      obj.timestamp = new Date(obj.timestamp);
    }
  };

  private transformDividendRecord = (
    _primKey: unknown,
    obj: DividendRecord | DividendRecordStorage,
    _trans: unknown
  ): void => {
    // Serialize decimal fields (handles undefined values gracefully)
    const fieldsToSerialize = DIVIDEND_RECORD_DECIMAL_FIELDS.filter(
      (field) => (obj as DividendRecord)[field] !== undefined
    );
    if (fieldsToSerialize.length > 0) {
      const serialized = serializeDecimalFields(obj, fieldsToSerialize);
      Object.assign(obj, serialized);
    }

    // Ensure dates are Date objects
    const dateFields = ['paymentDate', 'recordDate', 'exDividendDate'] as const;
    for (const field of dateFields) {
      const value = obj[field];
      if (value && !(value instanceof Date)) {
        (obj as DividendRecordStorage)[field] = new Date(value as unknown as string);
      }
    }
  };

  // ==========================================================================
  // Conversion Methods (Storage → Domain)
  // ==========================================================================

  convertHoldingDecimals(holding: HoldingStorage): Holding {
    const base = deserializeDecimalFields(holding, [...HOLDING_DECIMAL_FIELDS]);

    // Convert tax lots
    const lots: TaxLot[] = (holding.lots || []).map((lot) => ({
      ...deserializeDecimalFields(lot, [...TAX_LOT_DECIMAL_FIELDS]),
      id: lot.id,
      purchaseDate: lot.purchaseDate instanceof Date ? lot.purchaseDate : new Date(lot.purchaseDate),
      notes: lot.notes,
    }));

    return {
      ...base,
      id: holding.id,
      portfolioId: holding.portfolioId,
      assetId: holding.assetId,
      unrealizedGainPercent: holding.unrealizedGainPercent,
      lots,
      lastUpdated: holding.lastUpdated instanceof Date
        ? holding.lastUpdated
        : new Date(holding.lastUpdated),
    };
  }

  convertTransactionDecimals(transaction: TransactionStorage): Transaction {
    const base = deserializeDecimalFields(transaction, [...TRANSACTION_DECIMAL_FIELDS]);

    return {
      ...base,
      id: transaction.id,
      portfolioId: transaction.portfolioId,
      assetId: transaction.assetId,
      type: transaction.type,
      date: transaction.date instanceof Date ? transaction.date : new Date(transaction.date),
      currency: transaction.currency,
      taxLotId: transaction.taxLotId,
      notes: transaction.notes,
      importSource: transaction.importSource,
      metadata: transaction.metadata,
    };
  }

  convertPriceSnapshotDecimals(snapshot: PriceSnapshotStorage): PriceSnapshot {
    const base = deserializeDecimalFields(snapshot, [...PRICE_SNAPSHOT_DECIMAL_FIELDS]);

    return {
      ...base,
      assetId: snapshot.assetId,
      changePercent: snapshot.changePercent,
      timestamp: snapshot.timestamp instanceof Date
        ? snapshot.timestamp
        : new Date(snapshot.timestamp),
      source: snapshot.source,
      marketState: snapshot.marketState,
      volume: snapshot.volume,
      bid: snapshot.bid ? toDecimal(snapshot.bid) : undefined,
      ask: snapshot.ask ? toDecimal(snapshot.ask) : undefined,
    };
  }

  convertPriceHistoryDecimals(history: PriceHistoryStorage): PriceHistory {
    const base = deserializeDecimalFields(history, [...PRICE_HISTORY_DECIMAL_FIELDS]);

    return {
      ...base,
      id: history.id,
      assetId: history.assetId,
      date: history.date instanceof Date ? history.date : new Date(history.date),
      volume: history.volume,
      source: history.source,
    };
  }

  convertDividendRecordDecimals(record: DividendRecordStorage): DividendRecord {
    return {
      id: record.id,
      assetId: record.assetId,
      portfolioId: record.portfolioId,
      amount: toDecimal(record.amount),
      perShare: toDecimal(record.perShare),
      paymentDate: record.paymentDate instanceof Date
        ? record.paymentDate
        : new Date(record.paymentDate),
      recordDate: record.recordDate instanceof Date
        ? record.recordDate
        : new Date(record.recordDate),
      exDividendDate: record.exDividendDate instanceof Date
        ? record.exDividendDate
        : new Date(record.exDividendDate),
      type: record.type,
      reinvested: record.reinvested,
      shares: record.shares ? toDecimal(record.shares) : undefined,
      price: record.price ? toDecimal(record.price) : undefined,
    };
  }

  // ==========================================================================
  // Helper Methods for Data Retrieval with Proper Decimal Conversion
  // ==========================================================================

  async getHoldingWithDecimals(id: string): Promise<Holding | undefined> {
    const holding = await this.holdings.get(createHoldingId(id));
    if (!holding) return undefined;

    return this.convertHoldingDecimals(holding);
  }

  async getTransactionWithDecimals(id: string): Promise<Transaction | undefined> {
    const transaction = await this.transactions.get(createTransactionId(id));
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

  async getPriceHistoryByAsset(
    assetId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PriceHistory[]> {
    let collection = this.priceHistory
      .where('assetId')
      .equals(assetId);

    const results = await collection.toArray();

    // Filter by date range if provided
    let filtered = results;
    if (startDate) {
      filtered = filtered.filter((h) => new Date(h.date) >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((h) => new Date(h.date) <= endDate);
    }

    // Sort by date
    filtered.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return filtered.map((h) => this.convertPriceHistoryDecimals(h));
  }

  async getDividendRecordsByAsset(assetId: string): Promise<DividendRecord[]> {
    const records = await this.dividendRecords
      .where('assetId')
      .equals(assetId)
      .toArray();

    return records.map((r) => this.convertDividendRecordDecimals(r));
  }

  async getDividendRecordsByPortfolio(portfolioId: string): Promise<DividendRecord[]> {
    const records = await this.dividendRecords
      .where('portfolioId')
      .equals(portfolioId)
      .toArray();

    return records.map((r) => this.convertDividendRecordDecimals(r));
  }
}

// Create and export the database instance
export const db = new PortfolioDatabase();
