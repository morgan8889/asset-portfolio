# Data Model: Portfolio Performance Analytics

**Phase**: 1 - Design | **Date**: 2025-01-25

## Entity Definitions

### PerformanceSnapshot (NEW)

Pre-computed daily portfolio value snapshot for fast chart rendering.

```typescript
interface PerformanceSnapshot {
  id: string;                    // UUID
  portfolioId: string;           // FK to Portfolio
  date: Date;                    // Snapshot date (start of day)
  totalValue: Decimal;           // Portfolio value at end of day
  totalCost: Decimal;            // Total cost basis at this date
  dayChange: Decimal;            // Change from previous day
  dayChangePercent: number;      // Percentage change from previous day
  cumulativeReturn: Decimal;     // Cumulative return since inception
  twrReturn: Decimal;            // Time-weighted return since inception
  holdingCount: number;          // Number of holdings at this date
  hasInterpolatedPrices: boolean; // True if any prices were estimated
  createdAt: Date;               // Record creation timestamp
  updatedAt: Date;               // Last update timestamp
}

// Storage type for IndexedDB (Decimal → string)
interface PerformanceSnapshotStorage {
  id: string;
  portfolioId: string;
  date: Date;
  totalValue: string;            // Serialized Decimal
  totalCost: string;             // Serialized Decimal
  dayChange: string;             // Serialized Decimal
  dayChangePercent: number;
  cumulativeReturn: string;      // Serialized Decimal
  twrReturn: string;             // Serialized Decimal
  holdingCount: number;
  hasInterpolatedPrices: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- Primary: `++id`
- Composite: `[portfolioId+date]` (unique, for upserts)
- Secondary: `portfolioId` (for portfolio queries)
- Secondary: `date` (for date range queries)

**Validation Rules**:
- `portfolioId` must reference existing Portfolio
- `date` must be start of day (00:00:00)
- `totalValue` must be non-negative
- `dayChangePercent` capped at ±100% for sanity check
- One snapshot per portfolio per day (upsert on conflict)

### PerformanceSummary (Computed, not stored)

Aggregated statistics for a time period, calculated from snapshots.

```typescript
interface PerformanceSummary {
  portfolioId: string;
  period: TimePeriod;
  startDate: Date;
  endDate: Date;
  startValue: Decimal;           // Value at period start
  endValue: Decimal;             // Value at period end
  totalReturn: Decimal;          // Absolute return
  totalReturnPercent: number;    // Percentage return
  twrReturn: number;             // Time-weighted return for period
  periodHigh: Decimal;           // Highest value in period
  periodHighDate: Date;          // Date of highest value
  periodLow: Decimal;            // Lowest value in period
  periodLowDate: Date;           // Date of lowest value
  bestDay: DayPerformance;       // Best single day
  worstDay: DayPerformance;      // Worst single day
  volatility: number;            // Standard deviation of daily returns
  sharpeRatio: number;           // Risk-adjusted return (if benchmark available)
}

interface DayPerformance {
  date: Date;
  change: Decimal;
  changePercent: number;
}
```

### BenchmarkData (Stored in priceHistory)

Benchmark index data reuses existing price infrastructure.

```typescript
// Stored as Asset with special type
interface BenchmarkAsset extends Asset {
  id: string;                    // e.g., "benchmark-sp500"
  symbol: string;                // e.g., "^GSPC"
  name: string;                  // e.g., "S&P 500 Index"
  type: 'index';                 // New asset type
  exchange: string;              // e.g., "INDEXSP"
  currency: string;              // "USD"
}

// Price data stored in existing priceHistory table
// No schema changes needed - just add index asset entries
```

### TWRCalculation (Intermediate, not stored)

Intermediate structures for TWR computation.

```typescript
interface TWRSubPeriod {
  startDate: Date;
  endDate: Date;
  startValue: Decimal;
  endValue: Decimal;
  cashFlows: CashFlowEvent[];
  periodReturn: Decimal;         // (EMV - BMV - CF) / (BMV + weighted CF)
}

interface CashFlowEvent {
  date: Date;
  amount: Decimal;               // Positive = inflow (buy), Negative = outflow (sell)
  weight: number;                // Days remaining / total days in sub-period
}

interface TWRResult {
  totalReturn: Decimal;          // Compounded TWR
  subPeriods: TWRSubPeriod[];    // Breakdown for debugging
  startDate: Date;
  endDate: Date;
}
```

## Schema Changes

### Dexie Schema Update

```typescript
// In src/lib/db/schema.ts

// Add to version upgrade chain
this.version(2).stores({
  // ... existing tables unchanged ...
  performanceSnapshots: '++id, portfolioId, date, [portfolioId+date]',
});

// Add table declaration
performanceSnapshots!: Table<PerformanceSnapshotStorage>;

// Add decimal field configuration
const PERFORMANCE_SNAPSHOT_DECIMAL_FIELDS = [
  'totalValue',
  'totalCost',
  'dayChange',
  'cumulativeReturn',
  'twrReturn',
] as const;
```

### Asset Type Extension

```typescript
// In src/types/portfolio.ts

export type AssetType =
  | 'stock'
  | 'etf'
  | 'crypto'
  | 'bond'
  | 'real_estate'
  | 'commodity'
  | 'cash'
  | 'index'     // NEW: For benchmark indices
  | 'other';
```

## Relationships

```
┌─────────────────┐       ┌──────────────────────┐
│    Portfolio    │ 1───* │ PerformanceSnapshot  │
│                 │       │                      │
│  id (PK)        │       │  id (PK)             │
│  name           │       │  portfolioId (FK)    │
│  settings       │       │  date                │
└─────────────────┘       │  totalValue          │
        │                 │  twrReturn           │
        │                 └──────────────────────┘
        │
        │ 1
        │
        *
┌─────────────────┐       ┌──────────────────────┐
│   Transaction   │       │    PriceHistory      │
│                 │       │                      │
│  id (PK)        │       │  id (PK)             │
│  portfolioId    │       │  assetId (FK)        │
│  assetId        │       │  date                │
│  type           │       │  close               │
│  quantity       │       └──────────────────────┘
│  price          │               │
└─────────────────┘               │
        │                         │
        *                         * (for ^GSPC)
        │                         │
┌─────────────────┐       ┌──────────────────────┐
│     Asset       │       │   BenchmarkAsset     │
│                 │       │   (type: 'index')    │
│  id (PK)        │       │                      │
│  symbol         │       │  symbol: ^GSPC       │
│  type           │       │  type: index         │
└─────────────────┘       └──────────────────────┘
```

## State Transitions

### PerformanceSnapshot Lifecycle

```
                    ┌──────────────┐
                    │   PENDING    │
                    │  (computed)  │
                    └──────┬───────┘
                           │
                           │ save to IndexedDB
                           ▼
                    ┌──────────────┐
                    │   STORED     │
                    │  (persisted) │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
    transaction    transaction    snapshot
      added        modified        stale
              │            │            │
              ▼            ▼            ▼
        ┌──────────────────────────────────┐
        │          INVALIDATED             │
        │  (needs recomputation)           │
        └──────────────┬───────────────────┘
                       │
                       │ recompute from date
                       ▼
                ┌──────────────┐
                │   UPDATED    │
                │  (re-stored) │
                └──────────────┘
```

### Snapshot Computation Triggers

| Event | Action | Affected Range |
|-------|--------|----------------|
| Transaction added | Compute new snapshots | [tx.date, today] |
| Transaction modified | Recompute snapshots | [min(old.date, new.date), today] |
| Transaction deleted | Recompute snapshots | [tx.date, today] |
| Price data updated | Recompute if newer | [price.date, today] |
| Portfolio created | Initialize empty | None (wait for first tx) |
| Manual refresh | Full recompute | [first tx date, today] |

## Data Volume Estimates

| Scenario | Snapshots/Portfolio | Storage Est. |
|----------|---------------------|--------------|
| 1 year, active trading | 365 | ~50 KB |
| 5 years, moderate activity | 1,825 | ~250 KB |
| 10 years, full history | 3,650 | ~500 KB |
| MAX (15 years) | 5,475 | ~750 KB |

**Storage Format**: ~140 bytes per snapshot (JSON serialized)
- UUID id: 36 bytes
- portfolioId: 36 bytes
- date: 24 bytes (ISO string)
- Decimal fields (5): ~50 bytes
- Other fields: ~20 bytes

**IndexedDB Impact**: Negligible. Browser IndexedDB typically supports 50MB+ before prompting user.

## Zod Validation Schemas

```typescript
// In src/types/performance.ts

import { z } from 'zod';

export const PerformanceSnapshotSchema = z.object({
  id: z.string().uuid(),
  portfolioId: z.string().uuid(),
  date: z.date(),
  totalValue: z.string().refine(s => !isNaN(parseFloat(s)), 'Invalid decimal'),
  totalCost: z.string().refine(s => !isNaN(parseFloat(s)), 'Invalid decimal'),
  dayChange: z.string(),
  dayChangePercent: z.number().min(-100).max(1000),
  cumulativeReturn: z.string(),
  twrReturn: z.string(),
  holdingCount: z.number().int().min(0),
  hasInterpolatedPrices: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const TimePeriodSchema = z.enum([
  'TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR', 'ALL'
]);

export const PerformanceSummaryRequestSchema = z.object({
  portfolioId: z.string().uuid(),
  period: TimePeriodSchema,
  includeBenchmark: z.boolean().optional().default(false),
  benchmarkSymbol: z.string().optional().default('^GSPC'),
});
```
