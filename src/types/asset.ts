import { Decimal } from 'decimal.js';
import { AssetType } from './portfolio';

export interface AssetMetadata {
  isin?: string; // International Securities ID
  cusip?: string; // CUSIP for US securities
  description?: string;
  website?: string;
  logo?: string;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  beta?: number;
  eps?: number; // Earnings per share
  bookValue?: number;
  priceToBook?: number;
  debtToEquity?: number;
  industry?: string;
  country?: string;
}

// Region classification for geographic analysis
export type Region = 'US' | 'UK' | 'EU' | 'APAC' | 'EMERGING' | 'CA' | 'OTHER';

// Valuation method determines how price updates are obtained
export type ValuationMethod = 'LIVE' | 'MANUAL';

export interface Asset {
  id: string; // UUID
  symbol: string; // Ticker or identifier
  name: string; // Full name
  type: AssetType;
  exchange?: string; // "NYSE", "NASDAQ", etc.
  currency: string; // Trading currency
  sector?: string; // GICS sector
  currentPrice?: number; // Latest known price
  priceUpdatedAt?: Date; // Last price update
  metadata: AssetMetadata;
  region?: Region; // Geographic region for analysis
  valuationMethod?: ValuationMethod; // LIVE (ticker-based) or MANUAL (user-entered)
}

export interface PriceHistory {
  id: string;
  assetId: string;
  date: Date;
  open: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  adjustedClose: Decimal;
  volume: number;
  source: string; // API source
}

export interface PriceSnapshot {
  assetId: string;
  price: Decimal;
  change: Decimal;
  changePercent: number;
  timestamp: Date;
  source: string;
  marketState?: 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';
  volume?: number;
  bid?: Decimal;
  ask?: Decimal;
}

export interface Holding {
  id: string; // UUID
  portfolioId: string; // Reference to Portfolio
  assetId: string; // Reference to Asset
  quantity: Decimal; // Current shares/units owned
  costBasis: Decimal; // Total cost basis
  averageCost: Decimal; // Average cost per share
  currentValue: Decimal; // Current market value
  unrealizedGain: Decimal; // Current value - cost basis
  unrealizedGainPercent: number;
  lots: TaxLot[]; // Individual purchase lots
  lastUpdated: Date;
}

export interface TaxLot {
  id: string;
  quantity: Decimal;
  purchasePrice: Decimal;
  purchaseDate: Date;
  soldQuantity: Decimal; // Partial sales tracking
  remainingQuantity: Decimal; // Calculated field
  notes?: string;
}

export interface DividendRecord {
  id: string;
  assetId: string;
  portfolioId: string;
  amount: Decimal;
  perShare: Decimal;
  paymentDate: Date;
  recordDate: Date;
  exDividendDate: Date;
  type: 'ordinary' | 'qualified' | 'special' | 'return_of_capital';
  reinvested: boolean;
  shares?: Decimal; // If reinvested
  price?: Decimal; // Reinvestment price
}
