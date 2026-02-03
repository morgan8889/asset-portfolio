---
description: "Task list for portfolio management feature implementation"
---

# Tasks: Portfolio Management

**Input**: Design documents from `/specs/016-portfolio-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Test tasks included - feature follows TDD workflow per CLAUDE.md requirements

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

Next.js 14 App Router structure:
- `src/app/` - Pages and routes
- `src/components/` - React components
- `src/lib/` - Utilities, stores, services
- `tests/e2e/` - Playwright E2E tests
- Unit tests co-located with source in `__tests__/` directories

---

## Phase 1: Setup (Database Schema)

**Purpose**: Database migration foundation for lastAccessedAt tracking

- [ ] T001 Update Portfolio interface with lastAccessedAt field in src/types/portfolio.ts
- [ ] T002 Update database schema to v5 with lastAccessedAt index in src/lib/db/schema.ts
- [ ] T003 Create migration v4→v5 script in src/lib/db/migrations.ts

---

## Phase 2: Foundational (Store Infrastructure)

**Purpose**: Core portfolioStore actions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Modify setCurrentPortfolio to track lastAccessedAt in src/lib/stores/portfolio.ts
- [ ] T005 [P] Implement updatePortfolio action in src/lib/stores/portfolio.ts
- [ ] T006 [P] Implement deletePortfolio action with fallback logic in src/lib/stores/portfolio.ts
- [ ] T007 [P] Implement getSortedPortfolios helper in src/lib/stores/portfolio.ts

**Tests for Foundational Store Actions**:

- [ ] T008 [P] Unit test for setCurrentPortfolio lastAccessedAt tracking in src/lib/stores/__tests__/portfolio.test.ts
- [ ] T009 [P] Unit test for updatePortfolio action in src/lib/stores/__tests__/portfolio.test.ts
- [ ] T010 [P] Unit test for deletePortfolio with fallback in src/lib/stores/__tests__/portfolio.test.ts
- [ ] T011 [P] Unit test for getSortedPortfolios sorting logic in src/lib/stores/__tests__/portfolio.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Switch Between Existing Portfolios (Priority: P1) 🎯 MVP

**Goal**: Users can quickly switch between portfolios using a dropdown selector in the dashboard header

**Independent Test**: User with 3 portfolios clicks selector → sees dropdown → selects different portfolio → dashboard updates with new portfolio data

**User Story Reference**: spec.md lines 20-34

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T012 [P] [US1] Unit test for PortfolioSelector component rendering in src/components/portfolio/__tests__/portfolio-selector.test.tsx
- [ ] T013 [P] [US1] Unit test for PortfolioSelector sorting behavior in src/components/portfolio/__tests__/portfolio-selector.test.tsx
- [ ] T014 [P] [US1] Unit test for PortfolioSelector disabled state during CSV import in src/components/portfolio/__tests__/portfolio-selector.test.tsx
- [ ] T015 [P] [US1] E2E test for portfolio switching workflow in tests/e2e/portfolio-switching.spec.ts
- [ ] T016 [P] [US1] E2E test for portfolio selection persistence across page reload in tests/e2e/portfolio-switching.spec.ts
- [ ] T017 [P] [US1] E2E test for CSV import blocking portfolio selector in tests/e2e/portfolio-switching.spec.ts

### Implementation for User Story 1

- [ ] T018 [US1] Create PortfolioSelector component in src/components/portfolio/portfolio-selector.tsx
- [ ] T019 [US1] Replace static portfolio badges with PortfolioSelector in src/components/dashboard/DashboardHeader.tsx
- [ ] T020 [US1] Verify price polling switches immediately when portfolio changes (existing priceStore behavior)
- [ ] T021 [US1] Verify filter state preservation on portfolio switch (preserve type/search, reset date/pagination)

**Checkpoint**: At this point, User Story 1 (portfolio switching) should be fully functional and testable independently

---

## Phase 4: User Story 2 - View List of All Portfolios (Priority: P2)

**Goal**: Users can view a dedicated page showing all portfolios with key metrics (name, type, total value, YTD return)

**Independent Test**: User navigates to /portfolios → sees table with all portfolios → clicks "View" on a portfolio → navigates to dashboard with that portfolio selected

**User Story Reference**: spec.md lines 37-51

### Tests for User Story 2

- [ ] T022 [P] [US2] E2E test for /portfolios route navigation in tests/e2e/portfolios-management.spec.ts
- [ ] T023 [P] [US2] E2E test for portfolio list display with metrics in tests/e2e/portfolios-management.spec.ts
- [ ] T024 [P] [US2] E2E test for "View" action switching to portfolio in tests/e2e/portfolios-management.spec.ts
- [ ] T025 [P] [US2] E2E test for empty state with "Create Your First Portfolio" button in tests/e2e/portfolios-management.spec.ts

### Implementation for User Story 2

- [ ] T026 [US2] Add /portfolios route to navigation config in src/lib/config/navigation.ts
- [ ] T027 [US2] Create PortfoliosPage component in src/app/(dashboard)/portfolios/page.tsx
- [ ] T028 [US2] Create PortfoliosTable component with metrics display in src/components/portfolio/portfolios-table.tsx
- [ ] T029 [US2] Integrate calculatePortfolioMetrics service for value/return display in src/components/portfolio/portfolios-table.tsx
- [ ] T030 [US2] Implement "View" action button to switch portfolio and navigate to dashboard in src/components/portfolio/portfolios-table.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Edit Portfolio Settings (Priority: P3)

**Goal**: Users can edit portfolio name, type, currency, and settings (rebalance threshold, tax strategy, dividend reinvestment)

**Independent Test**: User opens portfolio settings → changes name from "Taxable" to "Main Account" → toggles dividend reinvestment ON → saves → name and setting persist

**User Story Reference**: spec.md lines 54-68

### Tests for User Story 3

- [ ] T031 [P] [US3] Unit test for CreatePortfolioDialog edit mode prop in src/components/forms/__tests__/create-portfolio.test.tsx
- [ ] T032 [P] [US3] Unit test for type change warning with transactions in src/components/forms/__tests__/create-portfolio.test.tsx
- [ ] T033 [P] [US3] E2E test for editing portfolio name and settings in tests/e2e/portfolio-edit.spec.ts
- [ ] T034 [P] [US3] E2E test for type change warning dialog when transactions exist in tests/e2e/portfolio-edit.spec.ts

### Implementation for User Story 3

- [ ] T035 [US3] Add mode prop ('create' | 'edit') to CreatePortfolioDialog in src/components/forms/create-portfolio.tsx
- [ ] T036 [US3] Add portfolio prop for edit mode initial values in src/components/forms/create-portfolio.tsx
- [ ] T037 [US3] Implement type change validation with transaction count check in src/components/forms/create-portfolio.tsx
- [ ] T038 [US3] Add confirmation dialog for type change when transactions exist in src/components/forms/create-portfolio.tsx
- [ ] T039 [US3] Wire up "Edit" button in PortfoliosTable to open dialog in src/components/portfolio/portfolios-table.tsx
- [ ] T040 [US3] Call portfolioStore.updatePortfolio on form submit in edit mode in src/components/forms/create-portfolio.tsx

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Delete Portfolio (Priority: P4)

**Goal**: Users can delete portfolios with graduated confirmation based on transaction count (0, 1-10, >10 transactions)

**Independent Test**: User with 3 portfolios opens delete dialog for "Test Portfolio" (50 transactions) → types portfolio name → confirms deletion → portfolio removed from list

**User Story Reference**: spec.md lines 71-85

### Tests for User Story 4

- [ ] T041 [P] [US4] Unit test for DeletePortfolioDialog with 0 transactions (simple confirmation) in src/components/portfolio/__tests__/delete-portfolio-dialog.test.tsx
- [ ] T042 [P] [US4] Unit test for DeletePortfolioDialog with 1-10 transactions (checkbox) in src/components/portfolio/__tests__/delete-portfolio-dialog.test.tsx
- [ ] T043 [P] [US4] Unit test for DeletePortfolioDialog with >10 transactions (typed name) in src/components/portfolio/__tests__/delete-portfolio-dialog.test.tsx
- [ ] T044 [P] [US4] Unit test for last portfolio deletion warning in src/components/portfolio/__tests__/delete-portfolio-dialog.test.tsx
- [ ] T045 [P] [US4] E2E test for deleting portfolio with no transactions in tests/e2e/portfolio-delete.spec.ts
- [ ] T046 [P] [US4] E2E test for deleting portfolio with checkbox confirmation in tests/e2e/portfolio-delete.spec.ts
- [ ] T047 [P] [US4] E2E test for deleting portfolio with typed name confirmation in tests/e2e/portfolio-delete.spec.ts
- [ ] T048 [P] [US4] E2E test for last portfolio deletion showing empty state in tests/e2e/portfolio-delete.spec.ts

### Implementation for User Story 4

- [ ] T049 [US4] Create DeletePortfolioDialog component in src/components/portfolio/delete-portfolio-dialog.tsx
- [ ] T050 [US4] Implement 3-level confirmation logic (0, 1-10, >10 transactions) in src/components/portfolio/delete-portfolio-dialog.tsx
- [ ] T051 [US4] Add last portfolio warning message in src/components/portfolio/delete-portfolio-dialog.tsx
- [ ] T052 [US4] Add currently selected portfolio notice with next portfolio name in src/components/portfolio/delete-portfolio-dialog.tsx
- [ ] T053 [US4] Wire up "Delete" button in PortfoliosTable with transaction count fetch in src/components/portfolio/portfolios-table.tsx
- [ ] T054 [US4] Call portfolioStore.deletePortfolio on confirmation in src/components/portfolio/delete-portfolio-dialog.tsx
- [ ] T055 [US4] Verify automatic fallback to most recently used portfolio after deletion in src/lib/stores/__tests__/portfolio.test.ts

**Checkpoint**: All user stories (US1-US4) should now be independently functional

---

## Phase 7: Data Isolation & Cross-Story Verification

**Purpose**: Verify no data leakage between portfolios and cross-story integration

- [ ] T056 [P] E2E test for data isolation (holdings from Portfolio A not visible in Portfolio B) in tests/e2e/portfolio-isolation.spec.ts
- [ ] T057 [P] E2E test for filter state preservation across all pages in tests/e2e/portfolio-switching.spec.ts
- [ ] T058 Run full test suite to verify all 930+ unit tests and 370+ E2E tests pass
- [ ] T059 Generate test coverage report and verify ≥85% for new code

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T060 [P] Update CLAUDE.md with portfolio management feature documentation
- [ ] T061 [P] Update CHANGELOG.md with feature 016 entry
- [ ] T062 [P] Code cleanup: Remove any TODO comments, unused imports
- [ ] T063 Performance profiling: Verify portfolio switching <2 seconds, sorting <50ms
- [ ] T064 Accessibility audit: Keyboard navigation, screen reader support for all dialogs
- [ ] T065 Run quickstart.md validation: Verify all 5 phases work as documented
- [ ] T066 Create git commit with feature complete message

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4)
- **Data Isolation (Phase 7)**: Depends on all 4 user stories being complete
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independently testable, integrates with US1 (View action switches portfolio)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independently testable, integrates with US2 (Edit button in table)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Independently testable, integrates with US2 (Delete button in table)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Components before integration
- Unit tests before E2E tests
- Store actions (Phase 2) before UI components
- Core implementation before cross-story integration

### Parallel Opportunities

**Phase 1 (Setup)**:
- T001, T002, T003 can run sequentially (modify same schema files)

**Phase 2 (Foundational)**:
- T005, T006, T007 can run in parallel (different actions in portfolio.ts)
- T008, T009, T010, T011 can run in parallel (different test files)

**Phase 3 (US1)**:
- T012, T013, T014 can run in parallel (different test files/sections)
- T015, T016, T017 can run in parallel (different E2E test files)

**Phase 4 (US2)**:
- T022, T023, T024, T025 can run in parallel (different E2E test scenarios)
- T026, T027, T028 can run in parallel (different files)

**Phase 5 (US3)**:
- T031, T032 can run in parallel (different test files)
- T033, T034 can run in parallel (different E2E test scenarios)

**Phase 6 (US4)**:
- T041, T042, T043, T044 can run in parallel (different test scenarios)
- T045, T046, T047, T048 can run in parallel (different E2E test files)

**Phase 7 (Data Isolation)**:
- T056, T057 can run in parallel (different E2E test files)

**Phase 8 (Polish)**:
- T060, T061, T062 can run in parallel (different documentation files)

**Cross-Phase Parallelization**:
- Once Foundational (Phase 2) completes, ALL user stories (US1-US4) can start in parallel
- Different team members can work on US1, US2, US3, US4 simultaneously

---

## Parallel Example: User Story 1

```bash
# Launch all unit tests for User Story 1 together:
Task: "Unit test for PortfolioSelector component rendering"
Task: "Unit test for PortfolioSelector sorting behavior"
Task: "Unit test for PortfolioSelector disabled state during CSV import"

# Launch all E2E tests for User Story 1 together:
Task: "E2E test for portfolio switching workflow"
Task: "E2E test for portfolio selection persistence across page reload"
Task: "E2E test for CSV import blocking portfolio selector"
```

---

## Parallel Example: User Story 2

```bash
# Launch all E2E tests for User Story 2 together:
Task: "E2E test for /portfolios route navigation"
Task: "E2E test for portfolio list display with metrics"
Task: "E2E test for 'View' action switching to portfolio"
Task: "E2E test for empty state with 'Create Your First Portfolio' button"

# Launch all implementation tasks for User Story 2 together:
Task: "Add /portfolios route to navigation config"
Task: "Create PortfoliosPage component"
Task: "Create PortfoliosTable component with metrics display"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (database schema)
2. Complete Phase 2: Foundational (store actions) - **CRITICAL**
3. Complete Phase 3: User Story 1 (portfolio switching)
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**MVP Scope**: T001-T021 (21 tasks)
**Estimated Effort**: 2-3 days for experienced Next.js developer

### Incremental Delivery

1. Complete Setup + Foundational (T001-T011) → Foundation ready
2. Add User Story 1 (T012-T021) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (T022-T030) → Test independently → Deploy/Demo
4. Add User Story 3 (T031-T040) → Test independently → Deploy/Demo
5. Add User Story 4 (T041-T055) → Test independently → Deploy/Demo
6. Add Data Isolation + Polish (T056-T066) → Final validation → Deploy

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T011)
2. Once Foundational is done:
   - Developer A: User Story 1 (T012-T021)
   - Developer B: User Story 2 (T022-T030)
   - Developer C: User Story 3 (T031-T040)
   - Developer D: User Story 4 (T041-T055)
3. Stories complete and integrate independently
4. Team validates data isolation (T056-T059) together
5. Team polishes (T060-T066) together

---

## Task Statistics

- **Total Tasks**: 66
- **Setup Phase**: 3 tasks
- **Foundational Phase**: 8 tasks (4 implementation + 4 tests)
- **User Story 1**: 10 tasks (6 tests + 4 implementation)
- **User Story 2**: 9 tasks (4 tests + 5 implementation)
- **User Story 3**: 10 tasks (4 tests + 6 implementation)
- **User Story 4**: 15 tasks (8 tests + 7 implementation)
- **Data Isolation**: 4 tasks
- **Polish**: 7 tasks
- **Parallel Opportunities**: 45 tasks marked [P] (68% can run in parallel within phases)

### Task Breakdown by User Story

| User Story | Priority | Tasks | Tests | Implementation | Independent Test? |
|------------|----------|-------|-------|----------------|------------------|
| US1 - Switch Portfolios | P1 (MVP) | 10 | 6 | 4 | ✅ Yes |
| US2 - View Portfolio List | P2 | 9 | 4 | 5 | ✅ Yes |
| US3 - Edit Portfolio | P3 | 10 | 4 | 6 | ✅ Yes |
| US4 - Delete Portfolio | P4 | 15 | 8 | 7 | ✅ Yes |

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD workflow)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Database schema v4→v5 migration is reversible (rollback script provided)
- All financial calculations use decimal.js (no JavaScript Number)
- Privacy-first: All data in IndexedDB, no backend API calls
