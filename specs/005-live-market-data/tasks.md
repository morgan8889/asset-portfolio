# Tasks: Live Market Data for US and UK Markets

**Input**: Design documents from `/specs/005-live-market-data/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Unit tests included for core utilities; E2E test for price refresh workflow.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, types, and core utilities

- [X] T001 Create market types from contracts in src/types/market.ts
- [X] T002 [P] Create market utilities (isUKSymbol, getExchange, convertPenceToPounds) in src/lib/utils/market-utils.ts
- [X] T003 [P] Create staleness calculation utility in src/lib/utils/staleness.ts
- [X] T004 [P] Create unit tests for market utilities in src/lib/utils/__tests__/market-utils.test.ts
- [X] T005 [P] Create unit tests for staleness utility in src/lib/utils/__tests__/staleness.test.ts

**Checkpoint**: Core types and utilities ready; unit tests pass

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Create market hours service with getMarketState() in src/lib/services/market-hours.ts
- [X] T007 [P] Create unit tests for market hours service in src/lib/services/__tests__/market-hours.test.ts
- [X] T008 Create price store (Zustand) with polling infrastructure in src/lib/stores/price.ts
- [X] T009 Create price service orchestrating updates in src/lib/services/price-service.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Real-Time Portfolio Value (Priority: P1) 🎯 MVP

**Goal**: Users see portfolio value update with live market prices for US and UK stocks

**Independent Test**: Add AAPL (US) and VOD.L (UK) to portfolio, verify prices display with timestamps and auto-refresh

### Implementation for User Story 1

- [X] T010 [US1] Extend price API route for UK symbol handling in src/app/api/prices/[symbol]/route.ts
- [X] T011 [US1] Add pence-to-pounds conversion in API response for GBp currencies in src/app/api/prices/[symbol]/route.ts
- [X] T012 [US1] Create PriceDisplay component showing price with timestamp in src/components/dashboard/price-display.tsx
- [X] T013 [US1] Add "Updated X ago" relative timestamp display in src/components/dashboard/price-display.tsx
- [X] T014 [US1] Integrate PriceDisplay into holdings table in src/components/dashboard/holdings-table.tsx
- [X] T015 [US1] Connect price store polling to dashboard lifecycle in src/app/(dashboard)/page.tsx
- [X] T016 [US1] Add visibility-aware polling (pause when tab hidden) in src/lib/stores/price.ts

**Checkpoint**: US and UK prices display with timestamps; auto-refresh works when tab visible

---

## Phase 4: User Story 2 - UK Market Symbol Recognition (Priority: P2)

**Goal**: Users can search for and add UK securities using .L suffix format

**Independent Test**: Search for "VOD.L" or "Vodafone", add to portfolio with correct exchange identification

### Implementation for User Story 2

- [X] T017 [US2] Update asset search to recognize UK symbols (.L suffix) in src/lib/services/asset-search.ts
- [X] T018 [US2] Display exchange badge (LSE/AIM) in search results in src/components/forms/asset-search.tsx
- [X] T019 [US2] Auto-populate exchange field when adding UK assets in src/lib/stores/asset.ts
- [X] T020 [US2] Show exchange indicator in holdings list for UK stocks in src/components/dashboard/holdings-table.tsx

**Checkpoint**: UK symbols searchable; exchange displayed correctly

---

## Phase 5: User Story 3 - Price Update Frequency Control (Priority: P2)

**Goal**: Users can configure how often prices update (realtime/frequent/standard/manual)

**Independent Test**: Change update frequency in settings, verify prices update at new interval

### Implementation for User Story 3

- [X] T021 [US3] Create PriceSettings component with frequency selector in src/components/settings/price-settings.tsx
- [X] T022 [US3] Add price preferences to userSettings persistence in src/lib/db/queries.ts
- [X] T023 [US3] Load saved preferences on app initialization in src/lib/stores/price.ts
- [X] T024 [US3] Update polling interval when preference changes in src/lib/stores/price.ts
- [X] T025 [US3] Add settings page or modal for price preferences in src/app/(dashboard)/settings/page.tsx

**Checkpoint**: Users can change refresh frequency; setting persists across sessions

---

## Phase 6: User Story 4 - Market Hours Awareness (Priority: P3)

**Goal**: Users see market status (pre/regular/post/closed) for each holding

**Independent Test**: View portfolio outside market hours; see "Closed" indicator for US stocks

### Implementation for User Story 4

- [X] T026 [US4] Add market state display to PriceDisplay component in src/components/dashboard/price-display.tsx
- [X] T027 [US4] Create MarketStatusBadge component (PRE/REGULAR/POST/CLOSED) in src/components/ui/market-status-badge.tsx
- [X] T028 [US4] Fetch marketState from Yahoo Finance response in src/app/api/prices/[symbol]/route.ts
- [X] T029 [US4] Fall back to calculated market state when API unavailable in src/lib/services/market-hours.ts
- [X] T030 [US4] Show per-holding market status in holdings table in src/components/dashboard/holdings-table.tsx

**Checkpoint**: Market status visible for each holding; shows correct state based on timezone

---

## Phase 7: User Story 5 - Graceful Degradation (Priority: P3)

**Goal**: App handles API outages gracefully; shows cached prices with staleness warnings

**Independent Test**: Disconnect network; verify cached prices display with stale indicator

### Implementation for User Story 5

- [X] T031 [US5] Add staleness indicator (fresh/aging/stale) to PriceDisplay in src/components/dashboard/price-display.tsx
- [X] T032 [US5] Create StalenessIndicator component with visual states in src/components/ui/staleness-indicator.tsx
- [X] T033 [US5] Handle API errors gracefully in price store (use cached data) in src/lib/stores/price.ts
- [X] T034 [US5] Show offline indicator when network unavailable in src/components/layout/header.tsx
- [X] T035 [US5] Auto-resume polling when connection restored in src/lib/stores/price.ts
- [X] T036 [US5] Persist price cache to IndexedDB for offline resilience in src/lib/stores/price.ts

**Checkpoint**: App remains functional offline; staleness clearly indicated

---

## Phase 8: User Story 6 - Performance Page with Live Data (Priority: P2)

**Goal**: Performance page displays real-time calculated metrics (Total Return, CAGR, Max Drawdown, Sharpe Ratio) using live prices

**Independent Test**: Navigate to /performance with holdings, verify metrics show calculated values (not hardcoded "+12.5%", "+8.2%", etc.)

### Implementation for User Story 6

- [ ] T037 [US6] Add PerformancePageData and PerformanceMetrics types in src/types/dashboard.ts
- [ ] T038 [P] [US6] Implement calculateAnnualizedReturn (CAGR) in src/lib/services/metrics-service.ts
- [ ] T039 [P] [US6] Implement calculateMaxDrawdown in src/lib/services/metrics-service.ts
- [ ] T040 [P] [US6] Implement calculateSharpeRatio in src/lib/services/metrics-service.ts
- [ ] T041 [P] [US6] Add unit tests for CAGR, MaxDrawdown, SharpeRatio in src/lib/services/__tests__/metrics-service.test.ts
- [ ] T042 [US6] Export new calculation functions in src/lib/services/index.ts
- [ ] T043 [US6] Create usePerformanceData hook in src/hooks/usePerformanceData.ts
- [ ] T044 [US6] Export usePerformanceData hook in src/hooks/index.ts
- [ ] T045 [US6] Rewrite Performance page to use hook data in src/app/(dashboard)/performance/page.tsx
- [ ] T046 [US6] Add empty state handling for portfolios without holdings in src/app/(dashboard)/performance/page.tsx

**Checkpoint**: Performance page shows calculated metrics (Total Return, CAGR, Max Drawdown, Sharpe) from real data

---

## Phase 9: User Story 7 - Performance Chart with Live Data (Priority: P3)

**Goal**: Performance page displays a line chart of portfolio value over time with period selection

**Independent Test**: View Performance page with holdings, verify chart shows historical values; select different periods (1M, 3M, YTD, 1Y, ALL)

### Implementation for User Story 7

- [ ] T047 [US7] Create PerformanceChart component in src/components/charts/performance-chart.tsx
- [ ] T048 [US7] Add time period selector (1M, 3M, YTD, 1Y, ALL) to PerformanceChart in src/components/charts/performance-chart.tsx
- [ ] T049 [US7] Integrate chart into Performance page in src/app/(dashboard)/performance/page.tsx
- [ ] T050 [US7] Ensure chart endpoint reflects current live value in src/hooks/usePerformanceData.ts

**Checkpoint**: Performance chart displays with period selection; most recent point reflects live value

---

## Phase 10: User Story 8 - Top Performers and Losers (Priority: P3)

**Goal**: Performance page shows top 5 best and worst performing holdings

**Independent Test**: View Performance page with multiple holdings, verify top performers and biggest losers lists are displayed with return percentages

### Implementation for User Story 8

- [ ] T051 [US8] Add top performers table to Performance page in src/app/(dashboard)/performance/page.tsx
- [ ] T052 [US8] Add biggest losers table to Performance page in src/app/(dashboard)/performance/page.tsx
- [ ] T053 [US8] Connect lists to useLivePriceMetrics topPerformers/biggestLosers in src/app/(dashboard)/performance/page.tsx

**Checkpoint**: Performance page shows top 5 performers and bottom 5 losers with return percentages

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final testing, integration, and cleanup

- [X] T054 Create E2E test for price refresh workflow in tests/e2e/price-refresh.spec.ts
- [X] T055 [P] Add loading states for price fetching in src/components/dashboard/price-display.tsx
- [X] T056 [P] Add error states for failed price fetches in src/components/dashboard/price-display.tsx
- [X] T057 Run full test suite and fix any failures (71 market data tests pass; pre-existing portfolio store test failures unrelated to feature)
- [ ] T058 Create E2E test for Performance page in tests/e2e/performance-page.spec.ts
- [ ] T059 Manual testing per quickstart.md validation scenarios
- [X] T060 Update CLAUDE.md with feature documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately ✅ COMPLETE
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories ✅ COMPLETE
- **User Stories (Phase 3-7)**: Dashboard live data features ✅ COMPLETE
- **User Stories (Phase 8-10)**: Performance page features - Can start immediately
  - US6 (Performance Metrics) should be completed first
  - US7 (Chart) and US8 (Top Performers) can run in parallel after US6
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: ✅ COMPLETE - Live prices with timestamps
- **User Story 2 (P2)**: ✅ COMPLETE - UK symbol recognition
- **User Story 3 (P2)**: ✅ COMPLETE - Price update frequency control
- **User Story 4 (P3)**: ✅ COMPLETE - Market hours awareness
- **User Story 5 (P3)**: ✅ COMPLETE - Graceful degradation
- **User Story 6 (P2)**: Can start after Foundational - Reuses useLivePriceMetrics hook
- **User Story 7 (P3)**: Depends on US6 (usePerformanceData hook)
- **User Story 8 (P3)**: Can start after Foundational - Reuses useLivePriceMetrics

### Within Each User Story

- Types before services/calculations
- Services/calculations before hooks
- Hooks before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel ✅ COMPLETE
- T038, T039, T040 (CAGR, MaxDrawdown, SharpeRatio implementations) can run in parallel
- T041 (unit tests) can run in parallel with implementations
- US7 and US8 can run in parallel once US6 is complete

---

## Parallel Example: Performance Page Calculations

```bash
# Launch parallel calculation implementations together:
Task: "Implement calculateAnnualizedReturn (CAGR) in src/lib/services/metrics-service.ts"
Task: "Implement calculateMaxDrawdown in src/lib/services/metrics-service.ts"
Task: "Implement calculateSharpeRatio in src/lib/services/metrics-service.ts"
Task: "Add unit tests for CAGR, MaxDrawdown, SharpeRatio in src/lib/services/__tests__/metrics-service.test.ts"
```

---

## Implementation Strategy

### Dashboard MVP (User Stories 1-5) ✅ COMPLETE

1. ✅ Complete Phase 1: Setup (types, utilities)
2. ✅ Complete Phase 2: Foundational (market hours, price store)
3. ✅ Complete Phase 3-7: User Stories 1-5 (live prices on dashboard)
4. **Dashboard live data is fully functional**

### Performance Page Extension (User Stories 6-8) 🎯 CURRENT

1. Complete Phase 8: User Story 6 (core Performance page metrics)
   - Implement CAGR, MaxDrawdown, SharpeRatio calculations
   - Create usePerformanceData hook
   - Rewrite Performance page with real data
2. **STOP and VALIDATE**: Verify metrics display calculated values
3. Complete Phase 9: User Story 7 (Performance chart)
4. Complete Phase 10: User Story 8 (Top performers)
5. Complete Phase 11: Polish (E2E test, manual validation)

### Parallel Team Strategy

With multiple developers after Phase 8:

- Developer A: User Story 7 (Performance chart)
- Developer B: User Story 8 (Top performers)
- Both can work in parallel once US6 (hook + page rewrite) is complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No new dependencies required - uses existing date-fns, decimal.js, Zustand, Dexie.js
