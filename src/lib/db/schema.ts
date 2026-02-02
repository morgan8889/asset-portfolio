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
  PerformanceSnapshot,
  PerformanceSnapshotStorage,
  PERFORMANCE_SNAPSHOT_DECIMAL_FIELDS,
} from '@/types/performance';

import { Liability } from '@/types/planning';

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

// Liability payment interface for tracking loan/mortgage payments
export interface LiabilityPayment {
  id?: number;
  liabilityId: string;
  date: Date;
  principalPaid: string; // Stored as string for Decimal precision
  interestPaid: string;
  remainingBalance: string;
  createdAt: Date;
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
  performanceSnapshots!: Table<PerformanceSnapshotStorage>;
  liabilities!: Table<Liability>;
  liabilityPayments!: Table<LiabilityPayment>;

  constructor() {
    super('PortfolioTrackerDB');

    // Define schema version 1
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

    // Define schema version 2 - add performanceSnapshots table
    this.version(2).stores({
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
      performanceSnapshots: '++id, portfolioId, date, [portfolioId+date]',
    });

    // Define schema version 3 - add liabilities table
    this.version(3).stores({
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
      performanceSnapshots: '++id, portfolioId, date, [portfolioId+date]',
      liabilities: '++id, portfolioId, name, startDate',
    });

    // Define schema version 4 - add liabilityPayments table
    this.version(4).stores({
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
      performanceSnapshots: '++id, portfolioId, date, [portfolioId+date]',
      liabilities: '++id, portfolioId, name, startDate',
      liabilityPayments: '++id, liabilityId, date, [liabilityId+date]',
    });

    // Add hooks for data transformation
    this.holdings.hook('creating', this.transformHolding);
    this.transactions.hook('creating', this.transformTransaction);
    this.priceHistory.hook('creating', this.transformPriceHistory);
    this.priceSnapshots.hook('creating', this.transformPriceSnapshot);
    this.dividendRecords.hook('creating', this.transformDividendRecord);
    this.assets.hook('creating', this.transformAsset);
    this.assets.hook('updating', this.transformAssetUpdate);
    this.performanceSnapshots.hook(
      'creating',
      this.transformPerformanceSnapshot
    );
  }

  // Transform functions using generic serialization utility

  private transformAsset = (
    _primKey: unknown,
    obj: Asset,
    _trans: unknown
  ): void => {
    // Convert Date objects to ensure proper storage
    if (obj.priceUpdatedAt && !(obj.priceUpdatedAt instanceof Date)) {
      obj.priceUpdatedAt = new Date(obj.priceUpdatedAt);
    }

    // Handle RentalInfo decimal fields
    if (obj.rentalInfo && obj.rentalInfo.monthlyRent instanceof Decimal) {
      obj.rentalInfo.monthlyRent = obj.rentalInfo.monthlyRent.toString() as any;
    }

    // Set default valuationMethod if not present
    if (!obj.valuationMethod) {
      obj.valuationMethod = 'AUTO';
    }
  };

  private transformAssetUpdate = (
    modifications: Partial<Asset>,
    _primKey: unknown,
    _obj: Asset,
    _trans: unknown
  ): void => {
    // Handle RentalInfo decimal fields on update
    if (
      modifications.rentalInfo &&
      modifications.rentalInfo.monthlyRent instanceof Decimal
    ) {
      modifications.rentalInfo.monthlyRent =
        modifications.rentalInfo.monthlyRent.toString() as any;
    }

    // Ensure priceUpdatedAt is a Date if modified
    if (
      modifications.priceUpdatedAt &&
      !(modifications.priceUpdatedAt instanceof Date)
    ) {
      modifications.priceUpdatedAt = new Date(modifications.priceUpdatedAt);
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
      (obj as HoldingStorage).lots = (obj as Holding).lots.map(
        (lot) =>
          serializeDecimalFields(lot, [
            ...TAX_LOT_DECIMAL_FIELDS,
          ]) as unknown as TaxLotStorage
      );
    }

    // Ensure lastUpdated is a Date
    if (obj.lastUpdated && !(obj.lastUpdated instanceof Date)) {
      obj.lastUpdated = new Date(obj.lastUpdated);
    }

    // Set default ownershipPercentage if not present
    if (obj.ownershipPercentage === undefined) {
      obj.ownershipPercentage = 100;
    }
  };

  private transformTransaction = (
    _primKey: unknown,
    obj: Transaction | TransactionStorage,
    _trans: unknown
  ): void => {
    // Serialize decimal fields
    const serialized = serializeDecimalFields(obj, [
      ...TRANSACTION_DECIMAL_FIELDS,
    ]);
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
    const serialized = serializeDecimalFields(obj, [
      ...PRICE_HISTORY_DECIMAL_FIELDS,
    ]);
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
    const serialized = serializeDecimalFields(obj, [
      ...PRICE_SNAPSHOT_DECIMAL_FIELDS,
    ]);
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
        (obj as DividendRecordStorage)[field] = new Date(
          value as unknown as string
        );
      }
    }
  };

  private transformPerformanceSnapshot = (
    _primKey: unknown,
    obj: PerformanceSnapshot | PerformanceSnapshotStorage,
    _trans: unknown
  ): void => {
    // Serialize decimal fields
    const serialized = serializeDecimalFields(obj, [
      ...PERFORMANCE_SNAPSHOT_DECIMAL_FIELDS,
    ]);
    Object.assign(obj, serialized);

    // Ensure dates are Date objects
    const dateFields = ['date', 'createdAt', 'updatedAt'] as const;
    for (const field of dateFields) {
      const value = obj[field];
      if (value && !(value instanceof Date)) {
        (obj as PerformanceSnapshotStorage)[field] = new Date(
          value as unknown as string
        );
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
      purchaseDate:
        lot.purchaseDate instanceof Date
          ? lot.purchaseDate
          : new Date(lot.purchaseDate),
      notes: lot.notes,
    }));

    return {
      ...base,
      id: holding.id,
      portfolioId: holding.portfolioId,
      assetId: holding.assetId,
      unrealizedGainPercent: holding.unrealizedGainPercent,
      lots,
      lastUpdated:
        holding.lastUpdated instanceof Date
          ? holding.lastUpdated
          : new Date(holding.lastUpdated),
      ownershipPercentage: holding.ownershipPercentage ?? 100,
    };
  }

  convertTransactionDecimals(transaction: TransactionStorage): Transaction {
    const base = deserializeDecimalFields(transaction, [
      ...TRANSACTION_DECIMAL_FIELDS,
    ]);

    return {
      ...base,
      id: transaction.id,
      portfolioId: transaction.portfolioId,
      assetId: transaction.assetId,
      type: transaction.type,
      date:
        transaction.date instanceof Date
          ? transaction.date
          : new Date(transaction.date),
      currency: transaction.currency,
      taxLotId: transaction.taxLotId,
      notes: transaction.notes,
      importSource: transaction.importSource,
      metadata: transaction.metadata,
    };
  }

  convertPriceSnapshotDecimals(snapshot: PriceSnapshotStorage): PriceSnapshot {
    const base = deserializeDecimalFields(snapshot, [
      ...PRICE_SNAPSHOT_DECIMAL_FIELDS,
    ]);

    return {
      ...base,
      assetId: snapshot.assetId,
      changePercent: snapshot.changePercent,
      timestamp:
        snapshot.timestamp instanceof Date
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
    const base = deserializeDecimalFields(history, [
      ...PRICE_HISTORY_DECIMAL_FIELDS,
    ]);

    return {
      ...base,
      id: history.id,
      assetId: history.assetId,
      date:
        history.date instanceof Date ? history.date : new Date(history.date),
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
      paymentDate:
        record.paymentDate instanceof Date
          ? record.paymentDate
          : new Date(record.paymentDate),
      recordDate:
        record.recordDate instanceof Date
          ? record.recordDate
          : new Date(record.recordDate),
      exDividendDate:
        record.exDividendDate instanceof Date
          ? record.exDividendDate
          : new Date(record.exDividendDate),
      type: record.type,
      reinvested: record.reinvested,
      shares: record.shares ? toDecimal(record.shares) : undefined,
      price: record.price ? toDecimal(record.price) : undefined,
    };
  }

  convertPerformanceSnapshotDecimals(
    snapshot: PerformanceSnapshotStorage
  ): PerformanceSnapshot {
    const base = deserializeDecimalFields(snapshot, [
      ...PERFORMANCE_SNAPSHOT_DECIMAL_FIELDS,
    ]);

    return {
      ...base,
      id: snapshot.id,
      portfolioId: snapshot.portfolioId,
      date:
        snapshot.date instanceof Date ? snapshot.date : new Date(snapshot.date),
      dayChangePercent: snapshot.dayChangePercent,
      holdingCount: snapshot.holdingCount,
      hasInterpolatedPrices: snapshot.hasInterpolatedPrices,
      createdAt:
        snapshot.createdAt instanceof Date
          ? snapshot.createdAt
          : new Date(snapshot.createdAt),
      updatedAt:
        snapshot.updatedAt instanceof Date
          ? snapshot.updatedAt
          : new Date(snapshot.updatedAt),
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

  async getTransactionWithDecimals(
    id: string
  ): Promise<Transaction | undefined> {
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

  async getTransactionsByPortfolio(
    portfolioId: string
  ): Promise<Transaction[]> {
    const transactions = await this.transactions
      .where('portfolioId')
      .equals(portfolioId)
      .toArray();

    return transactions.map((transaction) =>
      this.convertTransactionDecimals(transaction)
    );
  }

  async getLatestPriceSnapshot(
    assetId: string
  ): Promise<PriceSnapshot | undefined> {
    const snapshots = await this.priceSnapshots
      .where('assetId')
      .equals(assetId)
      .toArray();

    if (snapshots.length === 0) return undefined;

    // Sort by timestamp manually since orderBy doesn't work on filtered collections
    const latestSnapshot = snapshots.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];

    return this.convertPriceSnapshotDecimals(latestSnapshot);
  }

  async getPriceHistoryByAsset(
    assetId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PriceHistory[]> {
    let collection = this.priceHistory.where('assetId').equals(assetId);

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
    filtered.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
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

  async getDividendRecordsByPortfolio(
    portfolioId: string
  ): Promise<DividendRecord[]> {
    const records = await this.dividendRecords
      .where('portfolioId')
      .equals(portfolioId)
      .toArray();

    return records.map((r) => this.convertDividendRecordDecimals(r));
  }

  // ==========================================================================
  // Performance Snapshot Helper Methods
  // ==========================================================================

  async getPerformanceSnapshotsByPortfolio(
    portfolioId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PerformanceSnapshot[]> {
    const snapshots = await this.performanceSnapshots
      .where('portfolioId')
      .equals(portfolioId)
      .toArray();

    // Filter by date range if provided
    let filtered = snapshots;
    if (startDate) {
      filtered = filtered.filter((s) => new Date(s.date) >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((s) => new Date(s.date) <= endDate);
    }

    // Sort by date
    filtered.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return filtered.map((s) => this.convertPerformanceSnapshotDecimals(s));
  }

  async getLatestPerformanceSnapshot(
    portfolioId: string
  ): Promise<PerformanceSnapshot | null> {
    const snapshots = await this.performanceSnapshots
      .where('portfolioId')
      .equals(portfolioId)
      .toArray();

    if (snapshots.length === 0) return null;

    // Sort by date descending and get the first
    const latestSnapshot = snapshots.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];

    return this.convertPerformanceSnapshotDecimals(latestSnapshot);
  }

  async upsertPerformanceSnapshot(
    snapshot: PerformanceSnapshotStorage
  ): Promise<void> {
    // Find existing snapshot by portfolioId + date
    const existing = await this.performanceSnapshots
      .where('[portfolioId+date]')
      .equals([snapshot.portfolioId, snapshot.date])
      .first();

    if (existing) {
      // Update existing
      await this.performanceSnapshots.update(existing.id, {
        ...snapshot,
        id: existing.id,
        updatedAt: new Date(),
      });
    } else {
      // Add new
      await this.performanceSnapshots.add({
        ...snapshot,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  async deletePerformanceSnapshotsByPortfolio(
    portfolioId: string
  ): Promise<number> {
    return this.performanceSnapshots
      .where('portfolioId')
      .equals(portfolioId)
      .delete();
  }

  async deletePerformanceSnapshotsFromDate(
    portfolioId: string,
    fromDate: Date
  ): Promise<number> {
    const snapshots = await this.performanceSnapshots
      .where('portfolioId')
      .equals(portfolioId)
      .toArray();

    const toDelete = snapshots.filter((s) => new Date(s.date) >= fromDate);

    await this.performanceSnapshots.bulkDelete(toDelete.map((s) => s.id));
    return toDelete.length;
  }

  // ==========================================================================
  // Liability Helper Methods
  // ==========================================================================

  async getLiabilitiesByPortfolio(portfolioId: string): Promise<Liability[]> {
    return this.liabilities.where('portfolioId').equals(portfolioId).toArray();
  }

  async getLiability(id: string): Promise<Liability | undefined> {
    return this.liabilities.get(id);
  }

  async addLiability(
    liability: Omit<Liability, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    const now = new Date().toISOString();
    const id = await this.liabilities.add({
      ...liability,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as Liability);
    return id as string;
  }

  async updateLiability(
    id: string,
    updates: Partial<Omit<Liability, 'id' | 'createdAt'>>
  ): Promise<void> {
    await this.liabilities.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteLiability(id: string): Promise<void> {
    await this.liabilities.delete(id);
  }

  // ==========================================================================
  // Liability Payment Helper Methods
  // ==========================================================================

  async getLiabilityPayments(liabilityId: string): Promise<LiabilityPayment[]> {
    const payments = await this.liabilityPayments
      .where('liabilityId')
      .equals(liabilityId)
      .toArray();

    // Sort by date ascending
    return payments.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  async addLiabilityPayment(
    liabilityId: string,
    date: Date,
    principalPaid: Decimal,
    interestPaid: Decimal,
    remainingBalance: Decimal
  ): Promise<string> {
    const id = await this.liabilityPayments.add({
      liabilityId,
      date,
      principalPaid: principalPaid.toString(),
      interestPaid: interestPaid.toString(),
      remainingBalance: remainingBalance.toString(),
      createdAt: new Date(),
    });
    return id.toString();
  }

  async deleteLiabilityPaymentsByLiability(
    liabilityId: string
  ): Promise<number> {
    return this.liabilityPayments
      .where('liabilityId')
      .equals(liabilityId)
      .delete();
  }
}

// Create and export the database instance
export const db = new PortfolioDatabase();
