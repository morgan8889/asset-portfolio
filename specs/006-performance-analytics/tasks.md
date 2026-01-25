# Implementation Tasks: Portfolio Performance Analytics

**Feature Branch**: `006-performance-analytics` | **Generated**: 2025-01-25
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Task Legend

- `[TaskID]` - Unique identifier (e.g., T01, T02)
- `[P?]` - Priority (P1, P2, P3)
- `[Story?]` - User Story reference (US1-US5, or SETUP/POLISH)

## Phase 1: Setup

- [ ] T01 [P1] [SETUP] Create performance types file with PerformanceSnapshot, PerformanceSummary, TWRResult, ChartDataPoint interfaces `src/types/performance.ts`
- [ ] T02 [P1] [SETUP] Add Zod validation schemas for PerformanceSnapshot and PerformanceSummary `src/types/performance.ts`
- [ ] T03 [P1] [SETUP] Extend database schema to version 2 with performanceSnapshots table and composite index [portfolioId+date] `src/lib/db/schema.ts`
- [ ] T04 [P1] [SETUP] Add Decimal serialization/deserialization hooks for performanceSnapshots table `src/lib/db/schema.ts`
- [ ] T05 [P1] [SETUP] Extend AssetType to include 'index' type for benchmark assets `src/types/portfolio.ts`
- [ ] T06 [P1] [SETUP] Update symbol validation to allow ^ prefix for index symbols (^GSPC, ^DJI) `src/lib/utils/validation.ts`

## Phase 2: Foundational Services (Blocking Prerequisites)

- [ ] T07 [P1] [US1] Create TWR calculator service with calculateTWR and calculatePeriodReturn functions using Modified Dietz method `src/lib/services/twr-calculator.ts`
- [ ] T08 [P1] [US1] Add unit tests for TWR calculator covering single-period returns, multi-period compounding, cash flow timing `src/lib/services/__tests__/twr-calculator.test.ts`
- [ ] T09 [P1] [US1] Create snapshot service with getSnapshots, getLatestSnapshot, computeSnapshots, recomputeAll, deleteSnapshots methods `src/lib/services/snapshot-service.ts`
- [ ] T10 [P1] [US1] Add unit tests for snapshot service covering computation, persistence, date range queries `src/lib/services/__tests__/snapshot-service.test.ts`
- [ ] T11 [P1] [US1] Integrate snapshot computation trigger on transaction add/modify in transaction store `src/lib/stores/transaction.ts`

## Phase 3: User Story 1 - View Portfolio Performance Chart (P1)

- [ ] T12 [P1] [US1] Create Zustand performance store with state, loading, and actions for period/benchmark selection `src/lib/stores/performance.ts`
- [ ] T13 [P1] [US1] Create performance analytics service with getSummary, getChartData, getHoldingPerformance methods `src/lib/services/performance-analytics.ts`
- [ ] T14 [P1] [US1] Create period selector component with 1W, 1M, 3M, 1Y, ALL buttons `src/components/performance/period-selector.tsx`
- [ ] T15 [P1] [US1] Create performance chart component using Recharts AreaChart with tooltip showing date, value, change `src/components/charts/performance-chart.tsx`
- [ ] T16 [P1] [US1] Implement chart data aggregation (daily/weekly/monthly) based on selected time period for optimal rendering `src/lib/services/performance-analytics.ts`
- [ ] T17 [P1] [US1] Add green/red color coding for gains/losses in chart visualization `src/components/charts/performance-chart.tsx`
- [ ] T18 [P1] [US1] Create performance page with server component shell and client component integration `src/app/(dashboard)/performance/page.tsx`
- [ ] T19 [P1] [US1] Add performance page to dashboard navigation `src/components/layout/sidebar.tsx`
- [ ] T20 [P1] [US1] Implement empty state for portfolios with no transactions `src/app/(dashboard)/performance/page.tsx`
- [ ] T21 [P1] [US1] Add E2E test for performance chart display with time period switching `tests/e2e/performance-analytics.spec.ts`

## Phase 4: User Story 2 - Analyze Individual Holding Performance (P2)

- [ ] T22 [P2] [US2] Create holdings breakdown table component with sortable columns `src/components/performance/holdings-breakdown.tsx`
- [ ] T23 [P2] [US2] Implement getHoldingPerformance in analytics service returning cost basis, current value, gain/loss `src/lib/services/performance-analytics.ts`
- [ ] T24 [P2] [US2] Add sorting state and logic for holdings table (by gain amount, percentage, value, name) `src/components/performance/holdings-breakdown.tsx`
- [ ] T25 [P2] [US2] Apply green/red color coding to holding gain/loss values `src/components/performance/holdings-breakdown.tsx`
- [ ] T26 [P2] [US2] Update holdings performance calculation when time period changes `src/lib/stores/performance.ts`
- [ ] T27 [P2] [US2] Add unit tests for holding performance calculations `src/lib/services/__tests__/performance-analytics.test.ts`

## Phase 5: User Story 3 - View Performance Summary Statistics (P2)

- [ ] T28 [P2] [US3] Create summary stats component displaying total return, gain/loss, period high/low, best/worst day `src/components/performance/summary-stats.tsx`
- [ ] T29 [P2] [US3] Implement getSummary in analytics service calculating all summary statistics `src/lib/services/performance-analytics.ts`
- [ ] T30 [P2] [US3] Calculate volatility (standard deviation of daily returns) for period `src/lib/services/performance-analytics.ts`
- [ ] T31 [P2] [US3] Apply green/red color coding to summary statistics based on positive/negative values `src/components/performance/summary-stats.tsx`
- [ ] T32 [P2] [US3] Add unit tests for summary statistics calculations `src/lib/services/__tests__/performance-analytics.test.ts`

## Phase 6: User Story 4 - Compare Performance Across Time Periods (P3)

- [ ] T33 [P3] [US4] Create benchmark service with getBenchmarkData, calculateBenchmarkReturn, compareWithBenchmark methods `src/lib/services/benchmark-service.ts`
- [ ] T34 [P3] [US4] Extend price API route to accept index symbols (^GSPC) for benchmark data `src/app/api/prices/[symbol]/route.ts`
- [ ] T35 [P3] [US4] Create benchmark overlay component for chart with toggle control `src/components/charts/benchmark-overlay.tsx`
- [ ] T36 [P3] [US4] Add benchmark selection dropdown (S&P 500, Dow Jones, NASDAQ) `src/components/performance/benchmark-selector.tsx`
- [ ] T37 [P3] [US4] Integrate benchmark overlay with performance chart `src/components/charts/performance-chart.tsx`
- [ ] T38 [P3] [US4] Calculate alpha (portfolio return - benchmark return) and display in summary `src/components/performance/summary-stats.tsx`
- [ ] T39 [P3] [US4] Add unit tests for benchmark service `src/lib/services/__tests__/benchmark-service.test.ts`
- [ ] T40 [P3] [US4] Add E2E test for benchmark comparison toggle and display `tests/e2e/performance-analytics.spec.ts`

## Phase 7: User Story 5 - Export Performance Report (P3)

- [ ] T41 [P3] [US5] Implement exportToCSV method in analytics service `src/lib/services/performance-analytics.ts`
- [ ] T42 [P3] [US5] Create export button component with time period selection `src/components/performance/export-button.tsx`
- [ ] T43 [P3] [US5] Generate CSV with columns: Date, Portfolio Value, Daily Change, Daily Change %, Cumulative Return `src/lib/services/performance-analytics.ts`
- [ ] T44 [P3] [US5] Add option to include benchmark data in export `src/lib/services/performance-analytics.ts`
- [ ] T45 [P3] [US5] Add option to include individual holding performance in export `src/lib/services/performance-analytics.ts`
- [ ] T46 [P3] [US5] Add E2E test for CSV export functionality `tests/e2e/performance-analytics.spec.ts`

## Phase 8: Polish

- [ ] T47 [P1] [POLISH] Add loading states for chart and data fetching `src/components/performance/loading-skeleton.tsx`
- [ ] T48 [P1] [POLISH] Add error handling for missing price data with user-friendly messages `src/components/performance/error-boundary.tsx`
- [ ] T49 [P2] [POLISH] Optimize chart rendering for large datasets (5 years × 50 holdings) to meet SC-005 `src/components/charts/performance-chart.tsx`
- [ ] T50 [P2] [POLISH] Add indicator for interpolated/estimated prices in chart tooltip `src/components/charts/performance-chart.tsx`
- [ ] T51 [P2] [POLISH] Ensure responsive design for mobile viewports `src/app/(dashboard)/performance/page.tsx`
- [ ] T52 [P3] [POLISH] Add keyboard navigation for chart and period selector `src/components/charts/performance-chart.tsx`

## Task Dependencies

```
T01-T06 (Setup) → T07-T11 (Foundation)
T07-T11 → T12-T21 (US1 - Chart)
T12-T21 → T22-T27 (US2 - Holdings) [can start after T12-T13]
T12-T21 → T28-T32 (US3 - Summary) [can start after T12-T13]
T12-T21 → T33-T40 (US4 - Benchmark) [can start after T15]
T12-T21 → T41-T46 (US5 - Export) [can start after T13]
All → T47-T52 (Polish)
```

## Verification Checklist

After completing each phase:

- [ ] All TypeScript types compile without errors (`npm run type-check`)
- [ ] All unit tests pass (`npm run test`)
- [ ] Lint checks pass (`npm run lint`)
- [ ] Performance targets met (chart < 2s, period change < 500ms)
- [ ] Decimal precision verified (no floating-point errors)

## Success Criteria Mapping

| Criterion | Tasks |
|-----------|-------|
| SC-001: Chart loads < 2s | T15, T16, T49 |
| SC-002: Period change < 500ms | T14, T16 |
| SC-003: 99.99% calculation accuracy | T07, T08, T10 |
| SC-004: Identify best/worst holdings < 10s | T22, T24 |
| SC-005: 5yr × 50 holdings no lag | T16, T49 |
| SC-006: Export 10yr data < 5s | T41, T43 |
| SC-007: Clear visual hierarchy | T17, T25, T31 |
| SC-008: Offline capability | T03, T09 |
