/**
 * Export Format Contracts for Tax Data
 * Feature: 013-tax-data-integration
 *
 * Defines interfaces for exporting tax-enhanced transaction and holding data.
 */

import { Decimal } from 'decimal.js';

// ============================================================================
// Transaction Export
// ============================================================================

/**
 * Extended transaction export row with tax columns
 */
export interface TaxAwareTransactionExportRow {
  // === EXISTING COLUMNS ===
  date: string;              // 'yyyy-MM-dd'
  type: string;              // 'Buy', 'Sell', 'Dividend', etc.
  symbol: string;
  name: string;
  quantity: string;          // '#,###.####'
  price: string;             // '#,###.##'
  fees: string;              // '#,###.##'
  total: string;             // '#,###.##'

  // === NEW TAX COLUMNS ===
  grantDate: string;         // 'yyyy-MM-dd' or empty
  vestDate: string;          // 'yyyy-MM-dd' or empty
  discountPercent: string;   // '##.##%' or empty
  sharesWithheld: string;    // '#,###.####' or empty
  ordinaryIncome: string;    // '$#,###.##' or empty
}

/**
 * Column order for CSV export
 */
export const TRANSACTION_EXPORT_COLUMNS: (keyof TaxAwareTransactionExportRow)[] = [
  'date',
  'type',
  'symbol',
  'name',
  'quantity',
  'price',
  'fees',
  'total',
  'grantDate',
  'vestDate',
  'discountPercent',
  'sharesWithheld',
  'ordinaryIncome',
];

/**
 * Column headers for CSV export (user-friendly names)
 */
export const TRANSACTION_EXPORT_HEADERS: Record<keyof TaxAwareTransactionExportRow, string> = {
  date: 'Date',
  type: 'Type',
  symbol: 'Symbol',
  name: 'Name',
  quantity: 'Quantity',
  price: 'Price',
  fees: 'Fees',
  total: 'Total',
  grantDate: 'Grant Date',
  vestDate: 'Vest Date',
  discountPercent: 'Discount %',
  sharesWithheld: 'Shares Withheld',
  ordinaryIncome: 'Ordinary Income',
};

// ============================================================================
// Holdings Export
// ============================================================================

/**
 * Extended holding export row with tax metrics
 */
export interface TaxAwareHoldingExportRow {
  // === EXISTING COLUMNS ===
  symbol: string;
  name: string;
  assetType: string;
  quantity: string;          // '#,###.####'
  costBasis: string;         // '$#,###.##'
  averageCost: string;       // '$#,###.##'
  currentPrice: string;      // '$#,###.##'
  marketValue: string;       // '$#,###.##'
  unrealizedGain: string;    // '$#,###.##'
  unrealizedGainPercent: string;  // '##.##%'

  // === NEW TAX COLUMNS ===
  holdingPeriod: string;     // 'ST', 'LT', or 'Mixed'
  shortTermGain: string;     // '$#,###.##'
  longTermGain: string;      // '$#,###.##'
  estimatedTax: string;      // '$#,###.##'
  basisAdjustment: string;   // '$#,###.##' (ESPP disqualifying disposition)
}

/**
 * Column order for holdings CSV export
 */
export const HOLDING_EXPORT_COLUMNS: (keyof TaxAwareHoldingExportRow)[] = [
  'symbol',
  'name',
  'assetType',
  'quantity',
  'costBasis',
  'averageCost',
  'currentPrice',
  'marketValue',
  'unrealizedGain',
  'unrealizedGainPercent',
  'holdingPeriod',
  'shortTermGain',
  'longTermGain',
  'estimatedTax',
  'basisAdjustment',
];

/**
 * Column headers for holdings CSV export
 */
export const HOLDING_EXPORT_HEADERS: Record<keyof TaxAwareHoldingExportRow, string> = {
  symbol: 'Symbol',
  name: 'Name',
  assetType: 'Asset Type',
  quantity: 'Quantity',
  costBasis: 'Cost Basis',
  averageCost: 'Average Cost',
  currentPrice: 'Current Price',
  marketValue: 'Market Value',
  unrealizedGain: 'Unrealized Gain',
  unrealizedGainPercent: 'Unrealized Gain %',
  holdingPeriod: 'Holding Period',
  shortTermGain: 'Short-Term Gain',
  longTermGain: 'Long-Term Gain',
  estimatedTax: 'Estimated Tax',
  basisAdjustment: 'Basis Adjustment',
};

// ============================================================================
// Tax Report Export (PDF)
// ============================================================================

/**
 * Data structure for tax report PDF generation
 */
export interface TaxReportData {
  /** Portfolio information */
  portfolioName: string;
  generatedAt: Date;
  taxYear: number;

  /** Summary metrics */
  summary: TaxReportSummary;

  /** Lot-level details */
  lots: TaxLotReportRow[];

  /** Aging lots (approaching LT threshold) */
  agingLots: AgingLotReportRow[];

  /** ESPP/RSU specific data */
  stockCompensation?: StockCompensationSection;

  /** Tax optimization recommendations */
  recommendations: string[];
}

export interface TaxReportSummary {
  totalShortTermGains: string;      // '$#,###.##'
  totalShortTermLosses: string;
  totalLongTermGains: string;
  totalLongTermLosses: string;
  netShortTerm: string;
  netLongTerm: string;
  netCapitalGain: string;
  estimatedTaxLiability: string;
  effectiveTaxRate: string;         // '##.##%'
}

export interface TaxLotReportRow {
  symbol: string;
  purchaseDate: string;             // 'yyyy-MM-dd'
  quantity: string;                 // '#,###.####'
  costBasis: string;                // '$#,###.##'
  currentValue: string;             // '$#,###.##'
  unrealizedGain: string;           // '$#,###.##'
  holdingPeriod: 'ST' | 'LT';
  daysHeld: number;
}

export interface AgingLotReportRow {
  symbol: string;
  purchaseDate: string;
  quantity: string;
  unrealizedGain: string;
  daysUntilLongTerm: number;
  potentialTaxSavings: string;      // '$#,###.##'
}

export interface StockCompensationSection {
  esppTransactions: EsppReportRow[];
  rsuTransactions: RsuReportRow[];
  totalOrdinaryIncome: string;
  totalBargainElement: string;
  disqualifyingDispositions: number;
  qualifyingDispositions: number;
}

export interface EsppReportRow {
  symbol: string;
  purchaseDate: string;             // Grant/purchase date
  quantity: string;
  discountPercent: string;          // '##.##%'
  purchasePrice: string;
  fmv: string;
  bargainElement: string;           // '$#,###.##'
  ordinaryIncome: string;
  dispositionType: 'Qualifying' | 'Disqualifying' | 'Not Sold';
}

export interface RsuReportRow {
  symbol: string;
  awardDate: string;                // Grant date
  vestDate: string;
  grossShares: string;
  sharesWithheld: string;
  netShares: string;
  fmvAtVest: string;
  ordinaryIncome: string;           // '$#,###.##'
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format a decimal value as currency
 */
export function formatCurrency(value: Decimal | number | string): string {
  const num = value instanceof Decimal ? value.toNumber() : typeof value === 'string' ? parseFloat(value) : value;
  return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format a decimal value as percentage
 */
export function formatPercent(value: Decimal | number | string, decimals: number = 2): string {
  const num = value instanceof Decimal ? value.toNumber() : typeof value === 'string' ? parseFloat(value) : value;
  return `${(num * 100).toFixed(decimals)}%`;
}

/**
 * Format a date as 'yyyy-MM-dd'
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a quantity with 4 decimal places
 */
export function formatQuantity(value: Decimal | number | string): string {
  const num = value instanceof Decimal ? value.toNumber() : typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

/**
 * Format holding period as 'ST', 'LT', or 'Mixed'
 */
export function formatHoldingPeriod(period: 'short' | 'long' | 'mixed'): string {
  const mapping: Record<'short' | 'long' | 'mixed', string> = {
    short: 'ST',
    long: 'LT',
    mixed: 'Mixed',
  };
  return mapping[period];
}

// ============================================================================
// Export Configuration
// ============================================================================

/**
 * Export options for tax-enhanced reports
 */
export interface TaxExportOptions {
  /** Include tax columns in standard exports */
  includeTaxColumns: boolean;

  /** Export format */
  format: 'csv' | 'pdf';

  /** Date range for transactions */
  dateRange?: {
    start: Date;
    end: Date;
  };

  /** Tax year for tax report */
  taxYear?: number;

  /** Include only tax-aware transactions */
  taxTransactionsOnly?: boolean;

  /** Include ESPP/RSU details section */
  includeStockCompensation?: boolean;

  /** Include aging lots section */
  includeAgingLots?: boolean;

  /** Include recommendations */
  includeRecommendations?: boolean;
}

/**
 * Default export options
 */
export const DEFAULT_TAX_EXPORT_OPTIONS: TaxExportOptions = {
  includeTaxColumns: true,
  format: 'csv',
  taxTransactionsOnly: false,
  includeStockCompensation: true,
  includeAgingLots: true,
  includeRecommendations: true,
};

// ============================================================================
// IRS Form 8949 / Schedule D Export
// ============================================================================

/**
 * IRS Form 8949 row (for future implementation)
 */
export interface Form8949Row {
  // Part I: Short-Term Capital Gains and Losses
  description: string;              // e.g., "100 sh. AAPL"
  dateAcquired: string;             // 'MM/DD/YYYY'
  dateSold: string;                 // 'MM/DD/YYYY'
  proceeds: string;                 // '$#,###.##'
  costBasis: string;                // '$#,###.##'
  adjustmentCode?: string;          // Wash sale, etc.
  adjustmentAmount?: string;        // '$#,###.##'
  gainOrLoss: string;               // '$#,###.##' (proceeds - basis)
}

/**
 * IRS Schedule D summary (for future implementation)
 */
export interface ScheduleDSummary {
  // Part I: Short-Term Capital Gains and Losses
  shortTermTotalProceeds: string;
  shortTermTotalBasis: string;
  shortTermTotalGainLoss: string;

  // Part II: Long-Term Capital Gains and Losses
  longTermTotalProceeds: string;
  longTermTotalBasis: string;
  longTermTotalGainLoss: string;

  // Part III: Summary
  netShortTermGainLoss: string;
  netLongTermGainLoss: string;
  capitalGainDeduction: string;
  capitalLossCarryover: string;
}

// ============================================================================
// TurboTax / H&R Block CSV Format (for future implementation)
// ============================================================================

/**
 * TurboTax-compatible CSV format
 */
export interface TurboTaxExportRow {
  SecurityName: string;
  Symbol: string;
  DateAcquired: string;             // 'MM/DD/YYYY'
  DateSold: string;                 // 'MM/DD/YYYY'
  SalesPrice: string;
  CostBasis: string;
  GainLoss: string;
  Type: 'Short' | 'Long';
  NonCovered: 'Yes' | 'No';
}

/**
 * H&R Block-compatible CSV format
 */
export interface HRBlockExportRow {
  Description: string;
  'Date Acquired': string;
  'Date Sold': string;
  Proceeds: string;
  'Cost Basis': string;
  'Gain/Loss': string;
  Term: 'Short-term' | 'Long-term';
}

// ============================================================================
// Export Progress Tracking
// ============================================================================

/**
 * Progress callback for export operations
 */
export interface ExportProgress {
  status: 'preparing' | 'generating' | 'complete' | 'error';
  progress: number;                 // 0-100
  message: string;
  error?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  filename: string;
  rowCount: number;
  fileSize?: number;                // bytes
  error?: string;
}

// ============================================================================
// Placeholder Types
// ============================================================================

// These would normally be imported from existing types:
type DateRangePreset = any;  // import from '@/types/export'
type ReportType = any;       // import from '@/types/export'
