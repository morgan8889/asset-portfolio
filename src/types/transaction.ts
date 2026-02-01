import { Decimal } from 'decimal.js';

export type TransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'interest'
  | 'split'
  | 'transfer_in'
  | 'transfer_out'
  | 'fee'
  | 'tax'
  | 'spinoff'
  | 'merger'
  | 'reinvestment';

export interface Transaction {
  id: string; // UUID
  portfolioId: string;
  assetId: string;
  type: TransactionType;
  date: Date;
  quantity: Decimal;
  price: Decimal; // Price per unit
  totalAmount: Decimal; // Total transaction value
  fees: Decimal; // Commission and fees
  currency: string;
  taxLotId?: string; // For sells - specific lot
  notes?: string;
  importSource?: string; // CSV import tracking
  metadata?: Record<string, any>;
  
  // Tax-specific fields (optional, for ESPP/RSU transactions)
  grantDate?: Date; // ESPP: Purchase date | RSU: Award date
  vestingDate?: Date; // When shares became owned
  discountPercent?: Decimal; // ESPP discount (0.0-0.5 range)
  sharesWithheld?: Decimal; // Shares withheld for taxes
  ordinaryIncomeAmount?: Decimal; // W-2 taxable compensation
}

export interface TaxReport {
  year: number;
  portfolioId: string;
  shortTermGains: Decimal;
  longTermGains: Decimal;
  shortTermLosses: Decimal;
  longTermLosses: Decimal;
  netGain: Decimal;
  taxableAmount: Decimal;
  dividendIncome: Decimal;
  interestIncome: Decimal;
  capitalGainDistributions: Decimal;
  transactions: TaxTransaction[];
}

export interface TaxTransaction {
  transactionId: string;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: Decimal;
  buyDate: Date;
  sellDate?: Date;
  buyPrice: Decimal;
  sellPrice?: Decimal;
  costBasis: Decimal;
  proceeds?: Decimal;
  gain?: Decimal;
  holdingPeriod: 'short' | 'long';
  washSale?: boolean;
}

export interface HarvestingOpportunity {
  holdingId: string;
  symbol: string;
  unrealizedLoss: Decimal;
  quantity: Decimal;
  suggestedAction: 'sell_all' | 'sell_partial';
  taxSavings: Decimal;
  replacementSuggestions?: string[]; // Similar assets
  washSaleRisk: boolean;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  successfulImports: number;
  errors: ImportError[];
  transactions: Transaction[];
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data: Record<string, any>;
}

/**
 * Transaction import error (alias for ImportError with stricter typing)
 * Used by CSV importer and other import services.
 */
export type TransactionImportError = ImportError;

export interface CSVImportMapping {
  date: string;
  symbol: string;
  type: string;
  quantity: string;
  price: string;
  fees?: string;
  notes?: string;
}

export interface TransactionFilter {
  portfolioId?: string;
  assetId?: string;
  type?: TransactionType[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: Decimal;
  maxAmount?: Decimal;
  search?: string;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalBuys: number;
  totalSells: number;
  totalDividends: number;
  totalInvested: Decimal;
  totalDividendIncome: Decimal;
  totalFees: Decimal;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
}
