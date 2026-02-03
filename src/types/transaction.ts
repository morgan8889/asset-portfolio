import { Decimal } from 'decimal.js';
import { z } from 'zod';

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
  | 'reinvestment'
  | 'espp_purchase'
  | 'rsu_vest'
  | 'deposit'
  | 'withdrawal'
  | 'liability_payment';

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

/**
 * ESPP Transaction Metadata
 * Stored in Transaction.metadata field for espp_purchase transactions
 */
export interface ESPPTransactionMetadata {
  grantDate: string; // ISO date string
  purchaseDate: string; // ISO date string (same as transaction.date)
  marketPriceAtGrant: string; // Decimal as string
  marketPriceAtPurchase: string; // Decimal as string
  discountPercent: number; // 0-100 (e.g., 15 for 15%)
  bargainElement: string; // Decimal as string (calculated)
}

/**
 * RSU Transaction Metadata
 * Stored in Transaction.metadata field for rsu_vest transactions
 */
export interface RSUTransactionMetadata {
  vestingDate: string; // ISO date string (same as transaction.date)
  grossSharesVested: string; // Decimal as string
  sharesWithheld: string; // Decimal as string (for taxes)
  netShares: string; // Decimal as string (grossSharesVested - sharesWithheld)
  vestingPrice: string; // Decimal as string (FMV at vesting)
  taxWithheldAmount?: string; // Decimal as string (optional, for record-keeping)
}

// ==================== Zod Validation Schemas ====================

/**
 * Decimal string schema (for serialized Decimals)
 */
export const DecimalStringSchema = z.string().refine(
  (val) => {
    try {
      new Decimal(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid decimal string' }
);

/**
 * ESPP Transaction Schema
 * Validates espp_purchase transactions with metadata
 */
export const ESPPTransactionMetadataSchema = z
  .object({
    grantDate: z.string().datetime(),
    purchaseDate: z.string().datetime(),
    marketPriceAtGrant: DecimalStringSchema,
    marketPriceAtPurchase: DecimalStringSchema,
    discountPercent: z.number().min(0).max(100),
    bargainElement: DecimalStringSchema,
  })
  .refine((data) => new Date(data.grantDate) < new Date(data.purchaseDate), {
    message: 'Grant date must be before purchase date',
  });

/**
 * RSU Transaction Schema
 * Validates rsu_vest transactions with metadata
 */
export const RSUTransactionMetadataSchema = z
  .object({
    vestingDate: z.string().datetime(),
    grossSharesVested: DecimalStringSchema,
    sharesWithheld: DecimalStringSchema,
    netShares: DecimalStringSchema,
    vestingPrice: DecimalStringSchema,
    taxWithheldAmount: DecimalStringSchema.optional(),
  })
  .refine(
    (data) => {
      const gross = new Decimal(data.grossSharesVested);
      const withheld = new Decimal(data.sharesWithheld);
      const net = new Decimal(data.netShares);
      return net.equals(gross.minus(withheld));
    },
    { message: 'Net shares must equal gross shares - shares withheld' }
  );

/**
 * Pagination Options for transaction queries
 */
export interface PaginationOptions {
  page: number; // 1-indexed page number
  pageSize: number; // Transactions per page
  portfolioId: string; // Required: which portfolio
  sortBy?: 'date' | 'totalAmount' | 'assetId'; // Default: 'date'
  sortOrder?: 'asc' | 'desc'; // Default: 'desc'
  filterType?: TransactionType[]; // Optional: type filter
  searchTerm?: string; // Optional: search filter
}

/**
 * Paginated query result
 */
export interface PaginatedTransactionsResult {
  data: Transaction[]; // Page of transactions
  totalCount: number; // Total matching transactions
  page: number; // Current page (1-indexed)
  pageSize: number; // Items per page
  totalPages: number; // Calculated: ceil(totalCount / pageSize)
}
