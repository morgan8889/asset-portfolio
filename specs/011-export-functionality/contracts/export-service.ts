/**
 * Export Service Contract
 *
 * This file defines the TypeScript interfaces and function signatures
 * for the portfolio export functionality. No API routes are needed
 * as all operations run client-side per FR-006.
 *
 * @feature 011-export-functionality
 */

import type { PortfolioId } from '@/types/portfolio';

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
  portfolioId: PortfolioId;
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
// Service Interface
// ============================================================================

/**
 * Export service interface
 *
 * All methods operate entirely client-side with no network requests.
 */
export interface IExportService {
  /**
   * Generate and download a PDF performance report
   *
   * @param portfolioId - Target portfolio
   * @param dateRange - Date range for the report
   * @param onProgress - Progress callback
   * @throws Error if portfolio not found or generation fails
   */
  generatePerformancePdf(
    portfolioId: PortfolioId,
    dateRange: DateRangePreset,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void>;

  /**
   * Generate and download a CSV of transaction history
   *
   * @param portfolioId - Target portfolio
   * @param dateRange - Date range filter
   * @param onProgress - Progress callback
   * @throws Error if portfolio not found or no transactions in range
   */
  exportTransactionsCsv(
    portfolioId: PortfolioId,
    dateRange: DateRangePreset,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void>;

  /**
   * Generate and download a CSV of current holdings
   *
   * @param portfolioId - Target portfolio
   * @param onProgress - Progress callback
   * @throws Error if portfolio not found or no holdings
   */
  exportHoldingsCsv(
    portfolioId: PortfolioId,
    onProgress?: (progress: ExportProgress) => void
  ): Promise<void>;

  /**
   * Prepare transaction data for export (without triggering download)
   *
   * @param portfolioId - Target portfolio
   * @param dateRange - Date range filter
   * @returns Formatted transaction rows
   */
  prepareTransactionData(
    portfolioId: PortfolioId,
    dateRange: DateRangePreset
  ): Promise<TransactionExportRow[]>;

  /**
   * Prepare holdings data for export (without triggering download)
   *
   * @param portfolioId - Target portfolio
   * @returns Formatted holding rows
   */
  prepareHoldingsData(
    portfolioId: PortfolioId
  ): Promise<HoldingExportRow[]>;

  /**
   * Prepare performance report data (without generating PDF)
   *
   * @param portfolioId - Target portfolio
   * @param dateRange - Date range for the report
   * @returns Report data structure
   */
  preparePerformanceData(
    portfolioId: PortfolioId,
    dateRange: DateRangePreset
  ): Promise<PerformanceReportData>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a standardized filename for exports
 *
 * @param reportType - Type of report
 * @param portfolioName - Name of the portfolio
 * @param format - File format extension
 * @returns Sanitized filename with date
 */
export function generateExportFilename(
  reportType: ReportType,
  portfolioName: string,
  format: ExportFormat
): string {
  const typeMap: Record<ReportType, string> = {
    performance: 'portfolio_performance',
    transactions: 'transaction_history',
    holdings: 'holdings_snapshot',
  };

  const sanitizedName = portfolioName
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  const date = new Date().toISOString().split('T')[0];

  return `${typeMap[reportType]}_${sanitizedName}_${date}.${format}`;
}

/**
 * Calculate date range bounds from preset
 *
 * @param preset - Date range preset
 * @returns Start and end dates
 */
export function getDateRangeBounds(
  preset: DateRangePreset
): { start: Date; end: Date } {
  const end = new Date();
  let start: Date;

  switch (preset) {
    case 'YTD':
      start = new Date(end.getFullYear(), 0, 1);
      break;
    case '1Y':
      start = new Date(end);
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'ALL':
      start = new Date(0); // Beginning of time
      break;
  }

  return { start, end };
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
] as const;
