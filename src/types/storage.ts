/**
 * Storage Types
 *
 * These types represent the serialized form of entities stored in IndexedDB.
 * Decimal fields are stored as strings for persistence.
 * Use these types for type-safe database operations.
 */

import {
  AssetType,
  PortfolioType,
  PortfolioSettings,
  TaxStrategy,
} from './portfolio';
import { TransactionType } from './transaction';
import { AssetMetadata } from './asset';

// =============================================================================
// Branded ID Types for Type Safety
// =============================================================================

declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

/** Branded type for Portfolio IDs */
export type PortfolioId = Brand<string, 'PortfolioId'>;

/** Branded type for Asset IDs */
export type AssetId = Brand<string, 'AssetId'>;

/** Branded type for Holding IDs */
export type HoldingId = Brand<string, 'HoldingId'>;

/** Branded type for Transaction IDs */
export type TransactionId = Brand<string, 'TransactionId'>;

/** Branded type for Tax Lot IDs */
export type TaxLotId = Brand<string, 'TaxLotId'>;

/** Branded type for Price History IDs */
export type PriceHistoryId = Brand<string, 'PriceHistoryId'>;

/** Branded type for Price Snapshot IDs */
export type PriceSnapshotId = Brand<string, 'PriceSnapshotId'>;

/** Branded type for Dividend Record IDs */
export type DividendRecordId = Brand<string, 'DividendRecordId'>;

// =============================================================================
// Type Guard Functions for Branded IDs
// =============================================================================

export function createPortfolioId(id: string): PortfolioId {
  return id as PortfolioId;
}

export function createAssetId(id: string): AssetId {
  return id as AssetId;
}

export function createHoldingId(id: string): HoldingId {
  return id as HoldingId;
}

export function createTransactionId(id: string): TransactionId {
  return id as TransactionId;
}

export function createTaxLotId(id: string): TaxLotId {
  return id as TaxLotId;
}

export function createPriceHistoryId(id: string): PriceHistoryId {
  return id as PriceHistoryId;
}

export function createPriceSnapshotId(id: string): PriceSnapshotId {
  return id as PriceSnapshotId;
}

export function createDividendRecordId(id: string): DividendRecordId {
  return id as DividendRecordId;
}

/** Generate a new UUID as a branded ID */
export function generatePortfolioId(): PortfolioId {
  return crypto.randomUUID() as PortfolioId;
}

export function generateAssetId(): AssetId {
  return crypto.randomUUID() as AssetId;
}

export function generateHoldingId(): HoldingId {
  return crypto.randomUUID() as HoldingId;
}

export function generateTransactionId(): TransactionId {
  return crypto.randomUUID() as TransactionId;
}

export function generateTaxLotId(): TaxLotId {
  return crypto.randomUUID() as TaxLotId;
}

export function generatePriceHistoryId(): PriceHistoryId {
  return crypto.randomUUID() as PriceHistoryId;
}

export function generatePriceSnapshotId(): PriceSnapshotId {
  return crypto.randomUUID() as PriceSnapshotId;
}

export function generateDividendRecordId(): DividendRecordId {
  return crypto.randomUUID() as DividendRecordId;
}

// =============================================================================
// Storage Types (Decimal fields as strings)
// =============================================================================

/**
 * Portfolio stored format
 */
export interface PortfolioStorage {
  id: PortfolioId;
  name: string;
  type: PortfolioType;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  settings: PortfolioSettings;
  metadata?: Record<string, unknown>;
}

/**
 * Asset stored format
 */
export interface AssetStorage {
  id: AssetId;
  symbol: string;
  name: string;
  type: AssetType;
  exchange?: string;
  currency: string;
  sector?: string;
  currentPrice?: number;
  priceUpdatedAt?: Date;
  metadata: AssetMetadata;
}

/**
 * Tax Lot stored format (Decimal fields as strings)
 */
export interface TaxLotStorage {
  id: TaxLotId;
  quantity: string;
  purchasePrice: string;
  purchaseDate: Date;
  soldQuantity: string;
  remainingQuantity: string;
  notes?: string;
}

/**
 * Holding stored format (Decimal fields as strings)
 */
export interface HoldingStorage {
  id: HoldingId;
  portfolioId: PortfolioId;
  assetId: AssetId;
  quantity: string;
  costBasis: string;
  averageCost: string;
  currentValue: string;
  unrealizedGain: string;
  unrealizedGainPercent: number;
  lots: TaxLotStorage[];
  lastUpdated: Date;
  ownershipPercentage?: number;
}

/**
 * Transaction stored format (Decimal fields as strings)
 */
export interface TransactionStorage {
  id: TransactionId;
  portfolioId: PortfolioId;
  assetId: AssetId;
  type: TransactionType;
  date: Date;
  quantity: string;
  price: string;
  totalAmount: string;
  fees: string;
  currency: string;
  taxLotId?: TaxLotId;
  notes?: string;
  importSource?: string;
  metadata?: Record<string, unknown>;
  
  // Tax-specific fields (Decimal → string serialization)
  grantDate?: Date;
  vestingDate?: Date;
  discountPercent?: string;
  sharesWithheld?: string;
  ordinaryIncomeAmount?: string;
}

/**
 * Price History stored format (Decimal fields as strings)
 */
export interface PriceHistoryStorage {
  id: PriceHistoryId;
  assetId: AssetId;
  date: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  adjustedClose: string;
  volume: number;
  source: string;
}

/**
 * Price Snapshot stored format (Decimal fields as strings)
 */
export interface PriceSnapshotStorage {
  id: PriceSnapshotId;
  assetId: AssetId;
  price: string;
  change: string;
  changePercent: number;
  timestamp: Date;
  source: string;
  marketState?: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
  volume?: number;
  bid?: string;
  ask?: string;
}

/**
 * Dividend Record stored format (Decimal fields as strings)
 */
export interface DividendRecordStorage {
  id: DividendRecordId;
  assetId: AssetId;
  portfolioId: PortfolioId;
  amount: string;
  perShare: string;
  paymentDate: Date;
  recordDate: Date;
  exDividendDate: Date;
  type: 'ordinary' | 'qualified' | 'special' | 'return_of_capital';
  reinvested: boolean;
  shares?: string;
  price?: string;
}

/**
 * User Settings stored format
 */
export interface UserSettingsStorage {
  id?: number;
  key: string;
  value: unknown;
  updatedAt: Date;
}

// =============================================================================
// Type Mapping Utilities
// =============================================================================

/**
 * Maps domain types to storage types
 */
export type DomainToStorage<T> = T extends import('./asset').Holding
  ? HoldingStorage
  : T extends import('./transaction').Transaction
    ? TransactionStorage
    : T extends import('./portfolio').Portfolio
      ? PortfolioStorage
      : T extends import('./asset').Asset
        ? AssetStorage
        : T extends import('./asset').PriceHistory
          ? PriceHistoryStorage
          : T extends import('./asset').PriceSnapshot
            ? PriceSnapshotStorage
            : T extends import('./asset').DividendRecord
              ? DividendRecordStorage
              : T extends import('./asset').TaxLot
                ? TaxLotStorage
                : never;
