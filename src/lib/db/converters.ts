/**
 * Database Converters
 *
 * Type-safe conversion functions between Domain types and Storage types.
 * Domain types use Decimal.js for precision, Storage types use strings for IndexedDB.
 */

import type { Decimal } from 'decimal.js';
import type {
  Asset,
  Holding,
  PriceSnapshot,
  PriceHistory,
  DividendRecord,
  TaxLot,
} from '@/types/asset';
import type { Transaction } from '@/types/transaction';
import type {
  AssetStorage,
  HoldingStorage,
  TransactionStorage,
  PriceSnapshotStorage,
  PriceHistoryStorage,
  DividendRecordStorage,
  TaxLotStorage,
  AssetId,
  PortfolioId,
  TransactionId,
  HoldingId,
  TaxLotId,
  PriceHistoryId,
  PriceSnapshotId,
  DividendRecordId,
} from '@/types/storage';
import type { TransactionType } from '@/types/transaction';
import type { AssetType } from '@/types/portfolio';
import {
  serializeDecimalFields,
  HOLDING_DECIMAL_FIELDS,
  TRANSACTION_DECIMAL_FIELDS,
  PRICE_HISTORY_DECIMAL_FIELDS,
  PRICE_SNAPSHOT_DECIMAL_FIELDS,
  DIVIDEND_RECORD_DECIMAL_FIELDS,
  TAX_LOT_DECIMAL_FIELDS,
} from '@/lib/utils/decimal-serialization';

// =============================================================================
// Asset Converters
// =============================================================================

/**
 * Input type for creating a new asset (minimal required fields)
 */
export interface CreateAssetInput {
  id: string;
  symbol: string;
  name: string;
  type: AssetType;
  currency: string;
  exchange?: string;
  sector?: string;
  currentPrice?: number;
  priceUpdatedAt?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Convert asset input to storage format
 */
export function toAssetStorage(input: CreateAssetInput): AssetStorage {
  return {
    id: input.id as AssetId,
    symbol: input.symbol,
    name: input.name,
    type: input.type,
    currency: input.currency,
    exchange: input.exchange,
    sector: input.sector,
    currentPrice: input.currentPrice,
    priceUpdatedAt: input.priceUpdatedAt,
    metadata: input.metadata ?? {},
  };
}

// =============================================================================
// Transaction Converters
// =============================================================================

/**
 * Input type for creating a new transaction (domain type)
 */
export interface CreateTransactionInput {
  id: string;
  portfolioId: string;
  assetId: string;
  type: TransactionType;
  date: Date;
  quantity: Decimal;
  price: Decimal;
  totalAmount: Decimal;
  fees: Decimal;
  currency: string;
  taxLotId?: string;
  notes?: string;
  importSource?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Convert transaction domain type to storage format
 */
export function toTransactionStorage(
  input: CreateTransactionInput
): TransactionStorage {
  // Create a partial object with only the decimal fields for serialization
  const decimalData = {
    quantity: input.quantity,
    price: input.price,
    totalAmount: input.totalAmount,
    fees: input.fees,
  };

  const serialized = serializeDecimalFields(decimalData, [
    'quantity',
    'price',
    'totalAmount',
    'fees',
  ]);

  return {
    id: input.id as TransactionId,
    portfolioId: input.portfolioId as PortfolioId,
    assetId: input.assetId as AssetId,
    type: input.type,
    date: input.date,
    quantity: serialized.quantity as string,
    price: serialized.price as string,
    totalAmount: serialized.totalAmount as string,
    fees: serialized.fees as string,
    currency: input.currency,
    taxLotId: input.taxLotId as TaxLotId | undefined,
    notes: input.notes,
    importSource: input.importSource,
    metadata: input.metadata,
  };
}

/**
 * Convert a full Transaction domain type to storage format
 */
export function transactionToStorage(
  transaction: Transaction
): TransactionStorage {
  return toTransactionStorage({
    id: transaction.id,
    portfolioId: transaction.portfolioId,
    assetId: transaction.assetId,
    type: transaction.type,
    date: transaction.date,
    quantity: transaction.quantity,
    price: transaction.price,
    totalAmount: transaction.totalAmount,
    fees: transaction.fees,
    currency: transaction.currency,
    taxLotId: transaction.taxLotId,
    notes: transaction.notes,
    importSource: transaction.importSource,
    metadata: transaction.metadata,
  });
}

// =============================================================================
// Holding Converters
// =============================================================================

/**
 * Convert a full Holding domain type to storage format
 */
export function holdingToStorage(holding: Holding): HoldingStorage {
  const serialized = serializeDecimalFields(holding, [
    ...HOLDING_DECIMAL_FIELDS,
  ]);

  const lotsStorage: TaxLotStorage[] = (holding.lots || []).map((lot) => {
    const lotSerialized = serializeDecimalFields(lot, [
      ...TAX_LOT_DECIMAL_FIELDS,
    ]);
    return {
      id: lot.id as TaxLotId,
      quantity: lotSerialized.quantity as string,
      purchasePrice: lotSerialized.purchasePrice as string,
      purchaseDate: lot.purchaseDate,
      soldQuantity: lotSerialized.soldQuantity as string,
      remainingQuantity: lotSerialized.remainingQuantity as string,
      notes: lot.notes,
    };
  });

  return {
    id: holding.id as HoldingId,
    portfolioId: holding.portfolioId as PortfolioId,
    assetId: holding.assetId as AssetId,
    quantity: serialized.quantity as string,
    costBasis: serialized.costBasis as string,
    averageCost: serialized.averageCost as string,
    currentValue: serialized.currentValue as string,
    unrealizedGain: serialized.unrealizedGain as string,
    unrealizedGainPercent: holding.unrealizedGainPercent,
    lots: lotsStorage,
    lastUpdated: holding.lastUpdated,
  };
}

// =============================================================================
// Price Snapshot Converters
// =============================================================================

/**
 * Convert a full PriceSnapshot domain type to storage format
 */
export function priceSnapshotToStorage(
  snapshot: PriceSnapshot
): PriceSnapshotStorage {
  const serialized = serializeDecimalFields(snapshot, [
    ...PRICE_SNAPSHOT_DECIMAL_FIELDS,
  ]);

  return {
    id: (snapshot as PriceSnapshot & { id?: string }).id as PriceSnapshotId,
    assetId: snapshot.assetId as AssetId,
    price: serialized.price as string,
    change: serialized.change as string,
    changePercent: snapshot.changePercent,
    timestamp: snapshot.timestamp,
    source: snapshot.source,
    marketState: snapshot.marketState,
    volume: snapshot.volume,
    bid: snapshot.bid ? String(snapshot.bid) : undefined,
    ask: snapshot.ask ? String(snapshot.ask) : undefined,
  };
}

// =============================================================================
// Price History Converters
// =============================================================================

/**
 * Convert a full PriceHistory domain type to storage format
 */
export function priceHistoryToStorage(
  history: PriceHistory
): PriceHistoryStorage {
  const serialized = serializeDecimalFields(history, [
    ...PRICE_HISTORY_DECIMAL_FIELDS,
  ]);

  return {
    id: history.id as PriceHistoryId,
    assetId: history.assetId as AssetId,
    date: history.date,
    open: serialized.open as string,
    high: serialized.high as string,
    low: serialized.low as string,
    close: serialized.close as string,
    adjustedClose: serialized.adjustedClose as string,
    volume: history.volume,
    source: history.source,
  };
}

// =============================================================================
// Dividend Record Converters
// =============================================================================

/**
 * Convert a full DividendRecord domain type to storage format
 */
export function dividendRecordToStorage(
  record: DividendRecord
): DividendRecordStorage {
  const fieldsToSerialize = DIVIDEND_RECORD_DECIMAL_FIELDS.filter(
    (field) => record[field as keyof DividendRecord] !== undefined
  );
  const serialized = serializeDecimalFields(
    record,
    fieldsToSerialize as (keyof DividendRecord)[]
  );

  return {
    id: record.id as DividendRecordId,
    assetId: record.assetId as AssetId,
    portfolioId: record.portfolioId as PortfolioId,
    amount: serialized.amount as string,
    perShare: serialized.perShare as string,
    paymentDate: record.paymentDate,
    recordDate: record.recordDate,
    exDividendDate: record.exDividendDate,
    type: record.type,
    reinvested: record.reinvested,
    shares: record.shares ? String(record.shares) : undefined,
    price: record.price ? String(record.price) : undefined,
  };
}

// =============================================================================
// Settings Type Definitions
// =============================================================================

/**
 * Known settings keys and their types for type-safe settings access
 */
export interface SettingsTypeMap {
  dashboardConfig: import('@/types/dashboard').DashboardConfiguration;
  priceUpdateInterval: 'realtime' | 'frequent' | 'standard' | 'manual';
  showLastUpdated: boolean;
  showStalenessIndicator: boolean;
  autoRefreshEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  currency: string;
  dateFormat: string;
  // Add more settings keys as needed
}

/**
 * Type-safe settings getter result
 */
export type SettingsValue<K extends keyof SettingsTypeMap> = SettingsTypeMap[K];

// =============================================================================
// Import Error Types
// =============================================================================

/**
 * Error that occurs during transaction import
 */
export interface TransactionImportError {
  row: number;
  message: string;
  data: Record<string, unknown>;
}

/**
 * Result of a transaction import operation
 */
export interface TransactionImportResult {
  success: boolean;
  totalRows: number;
  successfulImports: number;
  errors: TransactionImportError[];
  transactions: Transaction[];
}
