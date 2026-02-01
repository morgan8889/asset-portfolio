/**
 * Export types for portfolio report functionality
 * @feature 011-export-functionality
 */

// Portfolio ID is just a string

// ============================================================================
// Core Types
// ============================================================================

/**
 * Available report types
 */
export type ReportType = 'performance' | 'transactions' | 'holdings';

/**
 * Date range presets for filtering exports
 */
export type DateRangePreset = 'YTD' | '1Y' | 'ALL';

/**
 * Export file formats
 */
export type ExportFormat = 'pdf' | 'csv';

/**
 * Configuration for generating a report
 */
export interface ReportConfig {
  type: ReportType;
  portfolioId: string;
  dateRange: DateRangePreset;
  format: ExportFormat;
  filename?: string;
}

/**
 * Progress tracking for export operations
 */
export interface ExportProgress {
  status: 'idle' | 'preparing' | 'generating' | 'complete' | 'error';
  progress: number; // 0-100
  message?: string;
  error?: string;
}

// ============================================================================
// Export Data Structures
// ============================================================================

/**
 * Transaction record formatted for CSV export
 */
export interface TransactionExportRow {
  date: string;
  type: string;
  symbol: string;
  name: string;
  quantity: string;
  price: string;
  fees: string;
  total: string;
  // Tax export columns (T036)
  grantDate: string;
  vestDate: string;
  discountPercent: string;
  sharesWithheld: string;
  ordinaryIncome: string;
}

/**
 * Holding record formatted for CSV export
 */
export interface HoldingExportRow {
  symbol: string;
  name: string;
  assetType: string;
  quantity: string;
  costBasis: string;
  averageCost: string;
  currentPrice: string;
  marketValue: string;
  unrealizedGain: string;
  unrealizedGainPercent: string;
  // Tax export columns (T037)
  holdingPeriod: string;
  shortTermGain: string;
  longTermGain: string;
  estimatedTax: string;
  basisAdjustment: string;
}

/**
 * Aggregate data for PDF performance report
 */
export interface PerformanceReportData {
  portfolioName: string;
  generatedAt: Date;
  dateRange: { start: Date; end: Date };

  summary: {
    totalValue: string;
    totalCost: string;
    totalGain: string;
    totalGainPercent: string;
    periodReturn: string;
    annualizedReturn: string;
  };

  valueHistory: Array<{
    date: string;
    value: number;
  }>;

  allocation: Array<{
    category: string;
    value: number;
    percentage: number;
  }>;

  topHoldings: Array<{
    symbol: string;
    name: string;
    value: string;
    weight: string;
    gain: string;
    gainPercent: string;
  }>;
}

// ============================================================================
// CSV Column Definitions
// ============================================================================

/**
 * Column configuration for transaction CSV export
 */
export const TRANSACTION_CSV_COLUMNS = [
  { key: 'date', header: 'Date' },
  { key: 'type', header: 'Type' },
  { key: 'symbol', header: 'Symbol' },
  { key: 'name', header: 'Name' },
  { key: 'quantity', header: 'Quantity' },
  { key: 'price', header: 'Price' },
  { key: 'fees', header: 'Fees' },
  { key: 'total', header: 'Total' },
  { key: 'grantDate', header: 'Grant Date' },
  { key: 'vestDate', header: 'Vest Date' },
  { key: 'discountPercent', header: 'Discount %' },
  { key: 'sharesWithheld', header: 'Shares Withheld' },
  { key: 'ordinaryIncome', header: 'Ordinary Income' },
] as const;

/**
 * Column configuration for holdings CSV export
 */
export const HOLDINGS_CSV_COLUMNS = [
  { key: 'symbol', header: 'Symbol' },
  { key: 'name', header: 'Name' },
  { key: 'assetType', header: 'Asset Type' },
  { key: 'quantity', header: 'Quantity' },
  { key: 'costBasis', header: 'Cost Basis' },
  { key: 'averageCost', header: 'Average Cost' },
  { key: 'currentPrice', header: 'Current Price' },
  { key: 'marketValue', header: 'Market Value' },
  { key: 'unrealizedGain', header: 'Unrealized Gain/Loss' },
  { key: 'unrealizedGainPercent', header: 'Gain/Loss %' },
  { key: 'holdingPeriod', header: 'Holding Period' },
  { key: 'shortTermGain', header: 'ST Gain' },
  { key: 'longTermGain', header: 'LT Gain' },
  { key: 'estimatedTax', header: 'Est. Tax' },
  { key: 'basisAdjustment', header: 'Basis Adj.' },
] as const;
