# Data Model: Performance Page 3-Year View

## Existing Entities (Reused)

### PerformanceSnapshot
*Source: `src/types/performance.ts`*
*Storage: IndexedDB `performanceSnapshots` table*

| Field | Type | Description |
|-------|------|-------------|
| date | Date | Snapshot date |
| totalValue | Decimal | Portfolio value at end of day |
| twrReturn | Decimal | Time-Weighted Return for the day |
| cashFlow | Decimal | Net deposits/withdrawals (derived from transactions) |

## New UI Types

### YearOverYearMetric
*Usage: Displaying annual growth in the new YoY table*

```typescript
export interface YearOverYearMetric {
  year: number;              // Calendar year (e.g., 2024)
  isCurrentYear: boolean;    // True for YTD
  startValue: Decimal;       // Value at Jan 1 (or inception)
  endValue: Decimal;         // Value at Dec 31 (or current date)
  twrGrowth: number;         // TWR Percentage (e.g., 12.5 for 12.5%)
  isPartial: boolean;        // True if year has < 12 months data
}
```

### ChartTimePeriod (Update)
*Source: `src/types/dashboard.ts`*

Updated union type to include '3Y':
```typescript
export type ChartTimePeriod = '1M' | '3M' | 'YTD' | '1Y' | '3Y' | 'ALL';
```

## Validation Rules

1. **YoY Calculation**:
   - Must use `calculateTWRFromDailyValues` for each year year block.
   - For Current Year (YTD): Range is `Jan 1` to `Today`.
   - For Past Years: Range is `Jan 1` to `Dec 31`.
   - If portfolio started mid-year, start date is inception date.

2. **3Y Chart Data**:
   - Query Range: `Today` minus 3 Years to `Today`.
   - Aggregation: Monthly data points (handled by `getAggregationLevel`).
