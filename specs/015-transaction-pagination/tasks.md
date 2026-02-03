# Implementation Tasks: Transaction Page Pagination

**Feature**: 015-transaction-pagination
**Branch**: `015-transaction-pagination`
**Date**: 2026-02-03

## Overview

This document breaks down the transaction pagination feature into executable tasks organized by user story priority. Each user story can be implemented and tested independently, enabling incremental delivery and parallel development.

## User Story Mapping

- **US1** (P1): View Recent Transactions with Page Navigation - MVP
- **US2** (P2): Adjust Page Size for Preference - Enhancement
- **US3** (P3): Retain Pagination State During Session - Polish

## Implementation Strategy

**MVP-First Approach**: User Story 1 (US1) delivers the core value - paginated transaction viewing with Previous/Next navigation. This can ship independently. US2 and US3 are progressive enhancements that can be added later without blocking the MVP.

**TDD Workflow**: Each phase follows Test-First Development:
1. Write failing tests for the user story
2. Implement minimal code to pass tests
3. Refactor while keeping tests green
4. Verify coverage meets targets (80%+)

---

## Phase 1: Setup & Prerequisites

**Goal**: Prepare development environment and verify TDD tooling.

**Duration**: 15-30 minutes

### Tasks

- [ ] T001 Verify development environment setup (Node.js 18+, npm installed, repo cloned)
- [ ] T002 Install dependencies if needed: `npm install`
- [ ] T003 Verify type checking works: `npm run type-check`
- [ ] T004 Verify test runners work: `npm run test` (Vitest) and `npm run test:e2e` (Playwright)
- [ ] T005 Create feature branch if not exists: `git checkout -b 015-transaction-pagination`

---

## Phase 2: Foundational Layer

**Goal**: Add TypeScript interfaces and database query foundation needed by all user stories.

**Duration**: 1-2 hours

**Blocking**: Must complete before any user story implementation.

### Type Definitions

- [ ] T006 [P] Add `PaginationState` interface to src/types/transaction.ts with fields: currentPage, pageSize, totalCount, totalPages
- [ ] T007 [P] Add `PaginationOptions` interface to src/types/transaction.ts with fields: page, pageSize, portfolioId, sortBy, sortOrder, filterType, searchTerm

### Database Queries

- [ ] T008 Write unit tests for `getPaginatedTransactions()` in src/lib/db/__tests__/pagination-queries.test.ts (count query, data query, type filter, date sort)
- [ ] T009 Implement `getPaginatedTransactions()` function in src/lib/db/queries.ts using Dexie LIMIT/OFFSET with count query
- [ ] T010 Run tests to verify query logic: `npm run test -- --run src/lib/db/__tests__/pagination-queries.test.ts`

### Verification Checkpoint

- [ ] T011 Verify Phase 2: All type definitions added, query tests pass, `npm run type-check` passes with no new errors

---

## Phase 3: User Story 1 (P1) - Basic Pagination MVP

**Goal**: Display transactions in pages (default 25) with Previous/Next navigation.

**Duration**: 3-4 hours

**Independent Test**: Load transactions page with 100+ transactions → verify only 25 shown → click Next → verify transactions 26-50 shown → Previous button enabled.

**User Value**: Fixes slow page loads for users with 50+ transactions. This is the MVP - can ship independently.

### Store Layer (US1)

- [ ] T012 [US1] Write unit tests for pagination store actions in src/lib/stores/__tests__/transaction-pagination.test.ts (initialize defaults, loadPaginatedTransactions, setCurrentPage, calculate totalPages)
- [ ] T013 [US1] Add `pagination: PaginationState` property to TransactionStore interface in src/lib/stores/transaction.ts with defaults (page: 1, size: 25, count: 0, pages: 0)
- [ ] T014 [US1] Implement `loadPaginatedTransactions(portfolioId, options)` action in src/lib/stores/transaction.ts calling getPaginatedTransactions()
- [ ] T015 [US1] Implement `setCurrentPage(page)` action in src/lib/stores/transaction.ts with bounds validation (clamp to 1..totalPages)
- [ ] T016 [US1] Implement `resetPagination()` action in src/lib/stores/transaction.ts resetting to defaults
- [ ] T017 [US1] Run store tests: `npm run test -- --run src/lib/stores/__tests__/transaction-pagination.test.ts`

### UI Components (US1)

- [ ] T018 [US1] Write component tests for PaginationControls in src/components/tables/__tests__/pagination-controls.test.tsx (info text calculation, button disabled states, click handlers)
- [ ] T019 [US1] Create PaginationControls component in src/components/tables/pagination-controls.tsx with Previous/Next buttons (shadcn/ui Button), info text "Showing X-Y of Z transactions"
- [ ] T020 [US1] Integrate PaginationControls into TransactionTable in src/components/tables/transaction-table.tsx (replace loadTransactions with loadPaginatedTransactions, add controls in CardFooter, hide if totalPages <= 1)
- [ ] T021 [US1] Add loading state to PaginationControls: disable buttons when isLoading prop is true
- [ ] T022 [US1] Run component tests: `npm run test -- --run src/components/tables/__tests__/pagination-controls.test.tsx`

### E2E Tests (US1)

- [ ] T023 [US1] Write E2E test "should paginate transactions with default size" in tests/e2e/transaction-pagination.spec.ts (create 100 transactions, verify page 1 shows 1-25, click Next, verify page 2 shows 26-50)
- [ ] T024 [US1] Write E2E test "should disable Previous on first page and Next on last page" in tests/e2e/transaction-pagination.spec.ts
- [ ] T025 [US1] Write E2E test "should hide pagination for single page" in tests/e2e/transaction-pagination.spec.ts (create 10 transactions, verify no controls)
- [ ] T026 [US1] Run E2E tests: `npm run test:e2e -- tests/e2e/transaction-pagination.spec.ts`

### Verification Checkpoint (US1)

- [ ] T027 [US1] Verify US1 complete: Load /transactions with 100+ transactions → only 25 show → click Next → see 26-50 → Previous enabled → type-check passes → all tests pass
- [ ] T028 [US1] Run full test suite: `npm run test && npm run test:e2e`
- [ ] T029 [US1] Performance check: Verify page load < 2s with 100+ transactions (SC-001), navigation < 0.5s (SC-002)

**MVP Checkpoint**: User Story 1 is COMPLETE and can ship independently. Users with many transactions now have improved page load times and can navigate history.

---

## Phase 4: User Story 2 (P2) - Page Size Customization

**Goal**: Add page size selector (10, 25, 50, 100) with position preservation.

**Duration**: 2-3 hours

**Independent Test**: Navigate to page 3 (transactions 51-75) with size 25 → select size 50 → verify now on page 2 showing transactions 51-100 (position preserved).

**User Value**: Power users can customize viewing density. Independent of US1 - can develop after MVP ships.

**Dependencies**: Requires US1 (basic pagination) complete.

### Store Layer (US2)

- [ ] T030 [US2] Write unit test for position preservation in src/lib/stores/__tests__/transaction-pagination.test.ts (page 3 size 25 → size 50 → page 2)
- [ ] T031 [US2] Implement `setPageSize(size)` action in src/lib/stores/transaction.ts with position preservation: `newPage = floor((currentPage - 1) * oldSize / newSize) + 1`
- [ ] T032 [US2] Add page size validation in setPageSize: only allow [10, 25, 50, 100], default to 25 if invalid
- [ ] T033 [US2] Run store tests: `npm run test -- --run src/lib/stores/__tests__/transaction-pagination.test.ts`

### UI Components (US2)

- [ ] T034 [US2] Write component test for page size selector in src/components/tables/__tests__/pagination-controls.test.tsx (Select renders options, onPageSizeChange called with correct value)
- [ ] T035 [US2] Add page size Select to PaginationControls in src/components/tables/pagination-controls.tsx with options: 10, 25, 50, 100 (shadcn/ui Select)
- [ ] T036 [US2] Connect Select onValueChange to onPageSizeChange prop in PaginationControls
- [ ] T037 [US2] Wire setPageSize action to PaginationControls in TransactionTable in src/components/tables/transaction-table.tsx
- [ ] T038 [US2] Run component tests: `npm run test -- --run src/components/tables/__tests__/pagination-controls.test.tsx`

### E2E Tests (US2)

- [ ] T039 [US2] Write E2E test "should change page size and preserve position" in tests/e2e/transaction-pagination.spec.ts (create 100 transactions, go to page 3, select 50/page, verify page 2 with correct transactions)
- [ ] T040 [US2] Write E2E test "should hide controls when size > total count" in tests/e2e/transaction-pagination.spec.ts (80 transactions, select 100/page, verify controls hidden)
- [ ] T041 [US2] Run E2E tests: `npm run test:e2e -- tests/e2e/transaction-pagination.spec.ts`

### Verification Checkpoint (US2)

- [ ] T042 [US2] Verify US2 complete: Page size dropdown works → position preserved on change → controls hidden when appropriate → all tests pass
- [ ] T043 [US2] Run full test suite: `npm run test && npm run test:e2e`

---

## Phase 5: User Story 3 (P3) - Session State Persistence

**Goal**: Remember pagination state (page, size) during browser session across navigation.

**Duration**: 1-2 hours

**Independent Test**: Navigate to page 5 with 50/page → visit /holdings → return to /transactions → verify still on page 5 with 50/page.

**User Value**: Reduces friction when analyzing transactions across multiple pages. Independent of US1/US2 - pure enhancement.

**Dependencies**: Requires US1 (basic pagination) and US2 (page size) complete.

### Store Layer (US3)

- [ ] T044 [US3] Write unit test for SessionStorage persistence in src/lib/stores/__tests__/transaction-pagination.test.ts (save state, reload store, verify state restored)
- [ ] T045 [US3] Add Zustand persist middleware to transactionStore in src/lib/stores/transaction.ts with SessionStorage (not localStorage), key: 'transaction-pagination-state', partialize: only pagination property
- [ ] T046 [US3] Add portfolio switch detection: clear pagination if lastPortfolioId !== currentPortfolioId
- [ ] T047 [US3] Run store tests: `npm run test -- --run src/lib/stores/__tests__/transaction-pagination.test.ts`

### E2E Tests (US3)

- [ ] T048 [US3] Write E2E test "should persist pagination state in session" in tests/e2e/transaction-pagination.spec.ts (navigate to page 3 size 50, go to /holdings, return, verify page 3 size 50)
- [ ] T049 [US3] Write E2E test "should reset on filter change" in tests/e2e/transaction-pagination.spec.ts (page 3, apply filter, verify page 1)
- [ ] T050 [US3] Write E2E test "should reset on sort change" in tests/e2e/transaction-pagination.spec.ts (page 3, change sort, verify page 1)
- [ ] T051 [US3] Run E2E tests: `npm run test:e2e -- tests/e2e/transaction-pagination.spec.ts`

### Verification Checkpoint (US3)

- [ ] T052 [US3] Verify US3 complete: Navigate away and back → state preserved → filter/sort reset to page 1 → all tests pass
- [ ] T053 [US3] Run full test suite: `npm run test && npm run test:e2e`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Goal**: Final quality checks, accessibility, performance validation.

**Duration**: 1-2 hours

### Quality Assurance

- [ ] T054 Add ARIA labels to pagination buttons in src/components/tables/pagination-controls.tsx (Previous: "Go to previous page", Next: "Go to next page", Select: "Select page size")
- [ ] T055 Add keyboard navigation test: Tab through controls, Enter to activate in tests/e2e/transaction-pagination.spec.ts
- [ ] T056 Verify focus management: Focus stays on pagination controls after page change (not jumping to top)
- [ ] T057 Test responsive design: Verify pagination controls stack vertically on mobile (< 640px)
- [ ] T058 Performance benchmark: Test with 10,000 transactions, verify navigation < 0.5s (SC-005)

### Edge Case Coverage

- [ ] T059 Test edge case: New transaction added while on last page → verify count updates, controls adjust
- [ ] T060 Test edge case: Delete transactions on current page → verify page adjusts if out of bounds
- [ ] T061 Test edge case: Zero transactions → verify empty state shows, no pagination controls

### Final Verification

- [ ] T062 Run linting: `npm run lint` - fix any issues
- [ ] T063 Run type checking: `npm run type-check` - no errors allowed
- [ ] T064 Run full test suite: `npm run test` - all 930+ tests pass
- [ ] T065 Run E2E suite: `npm run test:e2e` - all 370+ tests pass
- [ ] T066 Generate test coverage report: `npm run test:coverage` - verify 80%+ for new code
- [ ] T067 Build production bundle: `npm run build` - verify no errors
- [ ] T068 Manual smoke test: Create 200 transactions, navigate through pages, change sizes, verify performance

---

## Task Summary

**Total Tasks**: 68

**Tasks by Phase**:
- Phase 1 (Setup): 5 tasks (15-30 min)
- Phase 2 (Foundation): 6 tasks (1-2 hours) - **BLOCKING**
- Phase 3 (US1 - MVP): 18 tasks (3-4 hours) - **CAN SHIP INDEPENDENTLY**
- Phase 4 (US2): 14 tasks (2-3 hours)
- Phase 5 (US3): 10 tasks (1-2 hours)
- Phase 6 (Polish): 15 tasks (1-2 hours)

**Total Estimated Time**: 8-11 hours

**Parallel Opportunities**: Tasks marked [P] can run concurrently (T006-T007 type definitions).

---

## Dependencies & Execution Order

### Critical Path

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundation) ← MUST complete before user stories
    ↓
Phase 3 (US1 - MVP) ← Can ship after this phase
    ↓
Phase 4 (US2) ← Requires US1 complete
    ↓
Phase 5 (US3) ← Requires US1 + US2 complete
    ↓
Phase 6 (Polish)
```

### User Story Independence

- **US1 (MVP)**: Independent - can ship alone after Phase 2 + Phase 3
- **US2**: Depends on US1 (extends pagination with page size selector)
- **US3**: Depends on US1 + US2 (adds persistence to both features)

### Parallel Execution Opportunities

**Phase 2 (Foundation)**:
- T006 and T007 (type definitions) can be done in parallel

**Phase 3 (US1)**:
- After T017 (store tests pass), T018-T022 (UI components) can proceed in parallel with E2E test writing (T023-T026)

**Phase 4 (US2)**:
- After T033 (store tests pass), T034-T038 (UI components) can proceed in parallel with E2E test writing (T039-T041)

---

## Implementation Notes

### Test-Driven Development (TDD)

Each phase follows strict TDD:
1. **Red**: Write failing test first
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

Example for US1:
- T012: Write store tests (FAIL initially)
- T013-T016: Implement store actions (tests PASS)
- T017: Verify tests pass
- T018: Write component tests (FAIL initially)
- T019-T022: Implement component (tests PASS)

### Verification Gates

Each user story has a verification checkpoint (T027-T029, T042-T043, T052-T053) that MUST pass before proceeding. This ensures:
- All tests pass (unit + E2E)
- Type checking clean
- Performance targets met
- Feature independently testable

### MVP Definition

**Minimum Viable Product = Phase 1 + Phase 2 + Phase 3 (US1)**

This delivers core value:
- Page load improved from 4s → < 2s for 100+ transactions
- Previous/Next navigation functional
- Performance target SC-001 and SC-002 met

US2 and US3 are enhancements that can follow in separate releases.

---

## Performance Targets (from Success Criteria)

- **SC-001**: Page load < 2s with 100+ transactions (verify at T029)
- **SC-002**: Navigation < 0.5s between pages (verify at T029)
- **SC-003**: 95% of users navigate within 3 clicks (qualitative - track in production)
- **SC-004**: Session state retained 100% (verify at T052)
- **SC-005**: Support 10,000 transactions (verify at T058)

---

## Risk Mitigation

**Risk**: Performance degradation with 10k+ transactions
**Mitigation**: Task T058 explicitly tests this scenario before final verification

**Risk**: Position preservation logic incorrect
**Mitigation**: Task T030 tests edge cases (page 3 → size change → correct new page)

**Risk**: SessionStorage not persisting correctly
**Mitigation**: Task T044 unit tests persistence, T048-T050 E2E tests verify across navigation

**Risk**: Accessibility issues (keyboard navigation, screen readers)
**Mitigation**: Tasks T054-T056 explicitly cover ARIA labels and keyboard navigation

---

## Next Steps After Completion

1. Create pull request with all changes
2. Request code review focusing on:
   - Store action correctness (pagination logic)
   - Component accessibility (ARIA, keyboard)
   - Test coverage (80%+ for new code)
   - Performance benchmarks (SC-001, SC-002, SC-005 met)
3. Address review feedback
4. Merge to main branch
5. Deploy to production
6. Monitor performance metrics and user feedback

**Success Metrics Post-Deploy**:
- Page load time reduction (4s → < 2s)
- User navigation patterns (average clicks to target transaction)
- Session persistence usage (% of users benefiting from US3)
- Support tickets related to transaction page performance (should decrease)
