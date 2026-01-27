# Research: Performance Page 3-Year View & YoY Growth

## Technical Context
**Feature**: 007-performance-3yr-view
**Goal**: Enhance performance page with 3-year history and year-over-year TWR growth.

## Decisions

### 1. Data Source Strategy
**Decision**: Use existing `PerformanceSnapshot` table in IndexedDB via `snapshot-service.ts`.
**Rationale**:
- `PerformanceSnapshot` already pre-computes daily portfolio values and stores them locally.
- 3 years = ~1095 records, which is efficient to query from IndexedDB.
- Avoids expensive on-the-fly calculation from raw transactions.
**Alternatives Considered**:
- **On-the-fly Calculation**: Rejected due to performance latency on 3 years of data.
- **Server-side Aggregation**: Rejected as this is a local-first application.

### 2. Growth Calculation Methodology
**Decision**: Use Time-Weighted Return (TWR) using `calculateTWRFromDailyValues` from `twr-calculator.ts`.
**Rationale**:
- TWR eliminates the distortion of cash flows (deposits/withdrawals) which is critical for accurate long-term performance comparison.
- Consistent with Feature 006 requirements.
- Existing service `twr-calculator.ts` already implements Modified Dietz method.
**Alternatives Considered**:
- **Simple Return**: Rejected because it's sensitive to deposit timing (e.g., a large deposit can artificially lower percentage return).
- **Internal Rate of Return (IRR)**: More complex to calculate and harder for average users to interpret than TWR.

### 3. Chart Integration
**Decision**: Extend `PerformanceChart` component to accept a "3Y" period.
**Rationale**:
- Recharts handles large datasets well (1000+ points might need downsampling, but `getChartData` already has aggregation logic).
- `getAggregationLevel` in `performance-analytics.ts` already switches to 'weekly' or 'monthly' for longer periods.
- 3 Years -> `differenceInDays` > 365, so it will default to 'monthly' aggregation, which is perfect (36 data points).

### 4. Year-over-Year UI Structure
**Decision**: Add a new `YoYGrowthTable` component below the chart.
**Rationale**:
- Clear separation from the main chart.
- Allows tabular presentation of specific years (2023, 2024, YTD).
- Easy to style with existing `Table` components.

## Unknowns Resolved
- **TWR Availability**: Confirmed `src/lib/services/twr-calculator.ts` exists and is robust.
- **Data Persistence**: Confirmed `PerformanceSnapshot` covers the required historical data fields.
- **UI Framework**: Confirmed usage of Recharts and Tailwind CSS.
