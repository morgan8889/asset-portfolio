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

- [ ] T001 Create market types from contracts in src/types/market.ts
- [ ] T002 [P] Create market utilities (isUKSymbol, getExchange, convertPenceToPounds) in src/lib/utils/market-utils.ts
- [ ] T003 [P] Create staleness calculation utility in src/lib/utils/staleness.ts
- [ ] T004 [P] Create unit tests for market utilities in src/lib/utils/__tests__/market-utils.test.ts
- [ ] T005 [P] Create unit tests for staleness utility in src/lib/utils/__tests__/staleness.test.ts

**Checkpoint**: Core types and utilities ready; unit tests pass

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Create market hours service with getMarketState() in src/lib/services/market-hours.ts
- [ ] T007 [P] Create unit tests for market hours service in src/lib/services/__tests__/market-hours.test.ts
- [ ] T008 Create price store (Zustand) with polling infrastructure in src/lib/stores/price.ts
- [ ] T009 Create price service orchestrating updates in src/lib/services/price-service.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - View Real-Time Portfolio Value (Priority: P1) 🎯 MVP

**Goal**: Users see portfolio value update with live market prices for US and UK stocks

**Independent Test**: Add AAPL (US) and VOD.L (UK) to portfolio, verify prices display with timestamps and auto-refresh

### Implementation for User Story 1

- [ ] T010 [US1] Extend price API route for UK symbol handling in src/app/api/prices/[symbol]/route.ts
- [ ] T011 [US1] Add pence-to-pounds conversion in API response for GBp currencies in src/app/api/prices/[symbol]/route.ts
- [ ] T012 [US1] Create PriceDisplay component showing price with timestamp in src/components/dashboard/price-display.tsx
- [ ] T013 [US1] Add "Updated X ago" relative timestamp display in src/components/dashboard/price-display.tsx
- [ ] T014 [US1] Integrate PriceDisplay into holdings table in src/components/dashboard/holdings-table.tsx
- [ ] T015 [US1] Connect price store polling to dashboard lifecycle in src/app/(dashboard)/page.tsx
- [ ] T016 [US1] Add visibility-aware polling (pause when tab hidden) in src/lib/stores/price.ts

**Checkpoint**: US and UK prices display with timestamps; auto-refresh works when tab visible

---

## Phase 4: User Story 2 - UK Market Symbol Recognition (Priority: P2)

**Goal**: Users can search for and add UK securities using .L suffix format

**Independent Test**: Search for "VOD.L" or "Vodafone", add to portfolio with correct exchange identification

### Implementation for User Story 2

- [ ] T017 [US2] Update asset search to recognize UK symbols (.L suffix) in src/lib/services/asset-search.ts
- [ ] T018 [US2] Display exchange badge (LSE/AIM) in search results in src/components/forms/asset-search.tsx
- [ ] T019 [US2] Auto-populate exchange field when adding UK assets in src/lib/stores/asset.ts
- [ ] T020 [US2] Show exchange indicator in holdings list for UK stocks in src/components/dashboard/holdings-table.tsx

**Checkpoint**: UK symbols searchable; exchange displayed correctly

---

## Phase 5: User Story 3 - Price Update Frequency Control (Priority: P2)

**Goal**: Users can configure how often prices update (realtime/frequent/standard/manual)

**Independent Test**: Change update frequency in settings, verify prices update at new interval

### Implementation for User Story 3

- [ ] T021 [US3] Create PriceSettings component with frequency selector in src/components/settings/price-settings.tsx
- [ ] T022 [US3] Add price preferences to userSettings persistence in src/lib/db/queries.ts
- [ ] T023 [US3] Load saved preferences on app initialization in src/lib/stores/price.ts
- [ ] T024 [US3] Update polling interval when preference changes in src/lib/stores/price.ts
- [ ] T025 [US3] Add settings page or modal for price preferences in src/app/(dashboard)/settings/page.tsx

**Checkpoint**: Users can change refresh frequency; setting persists across sessions

---

## Phase 6: User Story 4 - Market Hours Awareness (Priority: P3)

**Goal**: Users see market status (pre/regular/post/closed) for each holding

**Independent Test**: View portfolio outside market hours; see "Closed" indicator for US stocks

### Implementation for User Story 4

- [ ] T026 [US4] Add market state display to PriceDisplay component in src/components/dashboard/price-display.tsx
- [ ] T027 [US4] Create MarketStatusBadge component (PRE/REGULAR/POST/CLOSED) in src/components/ui/market-status-badge.tsx
- [ ] T028 [US4] Fetch marketState from Yahoo Finance response in src/app/api/prices/[symbol]/route.ts
- [ ] T029 [US4] Fall back to calculated market state when API unavailable in src/lib/services/market-hours.ts
- [ ] T030 [US4] Show per-holding market status in holdings table in src/components/dashboard/holdings-table.tsx

**Checkpoint**: Market status visible for each holding; shows correct state based on timezone

---

## Phase 7: User Story 5 - Graceful Degradation (Priority: P3)

**Goal**: App handles API outages gracefully; shows cached prices with staleness warnings

**Independent Test**: Disconnect network; verify cached prices display with stale indicator

### Implementation for User Story 5

- [ ] T031 [US5] Add staleness indicator (fresh/aging/stale) to PriceDisplay in src/components/dashboard/price-display.tsx
- [ ] T032 [US5] Create StalenessIndicator component with visual states in src/components/ui/staleness-indicator.tsx
- [ ] T033 [US5] Handle API errors gracefully in price store (use cached data) in src/lib/stores/price.ts
- [ ] T034 [US5] Show offline indicator when network unavailable in src/components/layout/header.tsx
- [ ] T035 [US5] Auto-resume polling when connection restored in src/lib/stores/price.ts
- [ ] T036 [US5] Persist price cache to IndexedDB for offline resilience in src/lib/db/queries.ts

**Checkpoint**: App remains functional offline; staleness clearly indicated

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final testing, integration, and cleanup

- [ ] T037 Create E2E test for price refresh workflow in tests/e2e/price-refresh.spec.ts
- [ ] T038 [P] Add loading states for price fetching in src/components/dashboard/price-display.tsx
- [ ] T039 [P] Add error states for failed price fetches in src/components/dashboard/price-display.tsx
- [ ] T040 Run full test suite and fix any failures
- [ ] T041 Manual testing per quickstart.md validation scenarios
- [ ] T042 Update CLAUDE.md with feature documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Independent of US1
- **User Story 3 (P2)**: Can start after Foundational - Independent of US1/US2
- **User Story 4 (P3)**: Can start after Foundational - Benefits from US1 PriceDisplay
- **User Story 5 (P3)**: Can start after Foundational - Benefits from US1 PriceDisplay

### Within Each User Story

- Models/types before services
- Services before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- T002, T003, T004, T005 can all run in parallel (different files)
- T006, T007 can run in parallel (service + tests)
- Once Foundational phase completes, all user stories can start in parallel
- T037, T038, T039 in Polish phase can run in parallel

---

## Parallel Example: Setup Phase

```bash
# Launch all parallel tasks in Setup together:
Task: "Create market utilities in src/lib/utils/market-utils.ts"
Task: "Create staleness utility in src/lib/utils/staleness.ts"
Task: "Create unit tests for market utilities in src/lib/utils/__tests__/market-utils.test.ts"
Task: "Create unit tests for staleness utility in src/lib/utils/__tests__/staleness.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types, utilities)
2. Complete Phase 2: Foundational (market hours, price store)
3. Complete Phase 3: User Story 1 (live prices with timestamps)
4. **STOP and VALIDATE**: Test US and UK prices display correctly
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → **Deploy (MVP!)**
3. Add User Story 2 → Test UK symbol search → Deploy
4. Add User Story 3 → Test frequency control → Deploy
5. Add User Story 4 → Test market hours → Deploy
6. Add User Story 5 → Test offline mode → Deploy
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (P1 - core value)
   - Developer B: User Story 2 + 3 (P2 features)
   - Developer C: User Story 4 + 5 (P3 enhancements)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No new dependencies required - uses existing date-fns, decimal.js, Zustand, Dexie.js
