# Data Model: Portfolio Export Functionality

**Feature**: 011-export-functionality
**Date**: 2026-01-30

## Overview

This feature introduces export configuration types and standardized data structures for generating PDF and CSV reports. No new database tables are required - all data is sourced from existing holdings, transactions, and performance stores.

## New Types

### ReportType

Enumeration of available report types.

```typescript
type ReportType =
  | 'performance'      // PDF: Portfolio performance with charts
  | 'transactions'     // CSV: Transaction history
  | 'holdings';        // CSV: Current holdings snapshot
```

### DateRangePreset

Predefined date range options for filtering exports.

```typescript
type DateRangePreset =
  | 'YTD'    // Year to date
  | '1Y'     // Last 12 months
  | 'ALL';   // All available data
```

### ReportConfig

Configuration object for initiating a report generation request.

```typescript
interface ReportConfig {
  type: ReportType;
  portfolioId: PortfolioId;
  dateRange: DateRangePreset;
  format: 'pdf' | 'csv';
  filename?: string;          // Optional custom filename (auto-generated if omitted)
}
```

**Validation Rules**:
- `portfolioId` must reference an existing portfolio
- `format: 'pdf'` only valid for `type: 'performance'`
- `format: 'csv'` valid for `type: 'transactions'` and `type: 'holdings'`
- `dateRange` only applicable for `type: 'transactions'`

### ExportProgress

Progress tracking for long-running exports.

```typescript
interface ExportProgress {
  status: 'idle' | 'preparing' | 'generating' | 'complete' | 'error';
  progress: number;           // 0-100
  message?: string;           // Current step description
  error?: string;             // Error message if status is 'error'
}
```

## Export Data Structures

These are the normalized data structures passed to generators, decoupled from storage format.

### TransactionExportRow

Flattened transaction record for CSV export.

```typescript
interface TransactionExportRow {
  date: string;               // Formatted: 'yyyy-MM-dd'
  type: string;               // 'Buy' | 'Sell' | 'Dividend' | etc.
  symbol: string;             // Asset ticker
  name: string;               // Asset name
  quantity: string;           // Formatted decimal
  price: string;              // Formatted currency
  fees: string;               // Formatted currency
  total: string;              // Formatted currency (quantity * price + fees)
}
```

**Source Mapping**:
| Export Field | Source | Transform |
|--------------|--------|-----------|
| date | `Transaction.date` | `format(date, 'yyyy-MM-dd')` |
| type | `Transaction.type` | Capitalize first letter |
| symbol | `Asset.symbol` | Direct |
| name | `Asset.name` | Direct |
| quantity | `Transaction.quantity` | `Decimal.toFixed(4)` |
| price | `Transaction.price` | `Decimal.toFixed(2)` |
| fees | `Transaction.fees` | `Decimal.toFixed(2)` |
| total | `Transaction.totalAmount` | `Decimal.toFixed(2)` |

### HoldingExportRow

Flattened holding record for CSV export.

```typescript
interface HoldingExportRow {
  symbol: string;             // Asset ticker
  name: string;               // Asset name
  assetType: string;          // 'Stock' | 'ETF' | 'Crypto' | etc.
  quantity: string;           // Formatted decimal
  costBasis: string;          // Formatted currency (total cost)
  averageCost: string;        // Formatted currency (per share)
  currentPrice: string;       // Formatted currency
  marketValue: string;        // Formatted currency
  unrealizedGain: string;     // Formatted currency (can be negative)
  unrealizedGainPercent: string; // Formatted percentage
}
```

**Source Mapping**:
| Export Field | Source | Transform |
|--------------|--------|-----------|
| symbol | `Asset.symbol` | Direct |
| name | `Asset.name` | Direct |
| assetType | `Asset.type` | Capitalize |
| quantity | `Holding.quantity` | `Decimal.toFixed(4)` |
| costBasis | `Holding.costBasis` | `Decimal.toFixed(2)` |
| averageCost | `Holding.averageCost` | `Decimal.toFixed(2)` |
| currentPrice | `Asset.currentPrice` | `Decimal.toFixed(2)` |
| marketValue | `Holding.currentValue` | `Decimal.toFixed(2)` |
| unrealizedGain | `Holding.unrealizedGain` | `Decimal.toFixed(2)` |
| unrealizedGainPercent | `Holding.unrealizedGainPercent` | `toFixed(2) + '%'` |

### PerformanceReportData

Aggregate data structure for PDF performance report.

```typescript
interface PerformanceReportData {
  // Header
  portfolioName: string;
  generatedAt: Date;
  dateRange: { start: Date; end: Date };

  // Summary Metrics
  summary: {
    totalValue: string;           // Current portfolio value
    totalCost: string;            // Total invested
    totalGain: string;            // Unrealized gain/loss
    totalGainPercent: string;     // Gain percentage
    periodReturn: string;         // Return for selected period
    annualizedReturn: string;     // Annualized return
  };

  // Chart Data (for rendering)
  valueHistory: Array<{
    date: string;
    value: number;
  }>;

  allocation: Array<{
    category: string;
    value: number;
    percentage: number;
  }>;

  // Top Holdings
  topHoldings: Array<{
    symbol: string;
    name: string;
    value: string;
    weight: string;
    gain: string;
    gainPercent: string;
  }>;
}
```

## Filename Convention

All exported files follow the pattern defined in FR-007:

```
{report_type}_{portfolio_name}_{date}.{extension}
```

**Examples**:
- `portfolio_performance_MyPortfolio_2026-01-30.pdf`
- `transaction_history_MyPortfolio_2026-01-30.csv`
- `holdings_snapshot_MyPortfolio_2026-01-30.csv`

**Sanitization Rules**:
- Portfolio name: Replace spaces with underscores, remove special characters
- Date: ISO format `yyyy-MM-dd`
- Lowercase report type

## Relationships to Existing Entities

```
┌─────────────────┐
│   ReportConfig  │
└────────┬────────┘
         │ references
         ▼
┌─────────────────┐       ┌─────────────────┐
│    Portfolio    │◄──────│     Holding     │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │ contains                │ references
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│   Transaction   │───────►│      Asset      │
└─────────────────┘        └─────────────────┘
```

## Validation Schema (Zod)

```typescript
import { z } from 'zod';

export const ReportConfigSchema = z.object({
  type: z.enum(['performance', 'transactions', 'holdings']),
  portfolioId: z.string().min(1),
  dateRange: z.enum(['YTD', '1Y', 'ALL']),
  format: z.enum(['pdf', 'csv']),
  filename: z.string().optional(),
}).refine(
  (data) => {
    if (data.type === 'performance') return data.format === 'pdf';
    return data.format === 'csv';
  },
  { message: 'Performance reports must be PDF; others must be CSV' }
);

export const DateRangePresetSchema = z.enum(['YTD', '1Y', 'ALL']);

export const ExportProgressSchema = z.object({
  status: z.enum(['idle', 'preparing', 'generating', 'complete', 'error']),
  progress: z.number().min(0).max(100),
  message: z.string().optional(),
  error: z.string().optional(),
});
```

## State Management

Export state will be managed via a new Zustand store slice or standalone store:

```typescript
interface ExportState {
  // Current export status
  progress: ExportProgress;

  // Actions
  startExport: (config: ReportConfig) => Promise<void>;
  cancelExport: () => void;
  resetProgress: () => void;
}
```

No database persistence needed - export state is transient and resets on page navigation.
