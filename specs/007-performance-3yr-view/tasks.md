# Tasks: Performance Page 3-Year View & YoY Growth

**Branch**: `007-performance-3yr-view`
**Spec**: `specs/007-performance-3yr-view/spec.md`
**Status**: Generated

## Implementation Strategy

We will implement this feature in three phases. Phase 1 focuses on the 3-Year chart view extension, ensuring the existing chart can handle the new time period. Phase 2 focuses on the backend logic and tests for the new Year-over-Year TWR calculations. Phase 3 implements the UI for the YoY growth table and integrates it into the page.

## Dependencies

1.  **Phase 1 (Setup)** must be completed first to define types.
2.  **Phase 3 (US1)** depends on Phase 1 types.
3.  **Phase 4 (US2)** depends on Phase 1 types and ideally runs after US1, though the service logic (T007) is independent of the chart UI.

## Phase 1: Setup

*Goal: Define all new types and configuration constants required for the feature.*

- [ ] T001 [Setup] Update `src/types/dashboard.ts` to include `3Y` in `ChartTimePeriod` and `periodConfigs`
- [ ] T002 [Setup] Update `src/types/performance.ts` to include `YearOverYearMetric` interface
- [ ] T003 [Setup] Update `src/types/dashboard.ts` to include `3Y` in `TIME_PERIOD_CONFIGS` with correct start date calculation (3 years ago)

## Phase 2: Foundational

*Goal: Ensure core calculation services are ready.*

- [ ] T004 [Foundation] [P] Verify `twr-calculator.ts` exposes `calculateTWRFromDailyValues` and `annualizeReturn` correctly for use in new service methods (read-only verification or minor export tweaks) in `src/lib/services/twr-calculator.ts`

## Phase 3: User Story 1 - View 3-Year Performance History (P1)

*Goal: Enable the "3Y" button on the performance chart and ensure correct data fetching.*
*Test Criteria: Select "3Y" on the chart, verify x-axis spans 3 years, data points are aggregated monthly.*

- [ ] T005 [US1] Update `src/lib/services/performance-analytics.ts` to support `3Y` in `getMaxDataPoints` (set to ~36-40 points)
- [ ] T006 [US1] Update `src/hooks/usePerformanceData.ts` to accept `3Y` as a valid `selectedPeriod` and ensure it triggers the correct data fetch
- [ ] T007 [US1] Update `src/app/(dashboard)/performance/page.tsx` to add the "3Y" button to the period selector UI
- [ ] T008 [US1] Verify `getAggregationLevel` in `src/lib/services/performance-analytics.ts` correctly handles the 3-year date range (should return 'monthly')

## Phase 4: User Story 2 - View Year-over-Year Compound Growth Rate (P2)

*Goal: Calculate and display annual TWR growth.*
*Test Criteria: "Annual Growth" table appears below chart, showing 2023, 2024, YTD with correct TWR %.*

- [ ] T009 [US2] Create unit test `src/lib/services/__tests__/performance-analytics.yoy.test.ts` to verify `getYoYMetrics` calculation logic (mocking snapshots)
- [ ] T010 [US2] Implement `getYoYMetrics(portfolioId)` in `src/lib/services/performance-analytics.ts` to calculate annual TWR using `twr-calculator.ts`
- [ ] T011 [US2] Update `src/hooks/usePerformanceData.ts` to fetch `yoyMetrics` alongside other performance data
- [ ] T012 [US2] Create `src/components/performance/yoy-growth-table.tsx` to display the `YearOverYearMetric` data in a styled table (Red/Green indicators)
- [ ] T013 [US2] Integrate `<YoYGrowthTable />` into `src/app/(dashboard)/performance/page.tsx` below the main chart

## Final Phase: Polish

- [ ] T014 [Polish] Ensure responsive design for the new YoY table on mobile screens in `src/components/performance/yoy-growth-table.tsx`
- [ ] T015 [Polish] Verify color contrast for Red/Green indicators in the new table meets accessibility standards
