# Tasks: CSV Transaction Import

**Input**: Design documents from `/specs/001-csv-transaction-import/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Constitution requires unit tests for services and E2E for workflows. Tests included per spec.

**Organization**: Tasks grouped by user story (P1→P5) to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project type**: Single Next.js web application
- **Source**: `src/` at repository root
- **Tests**: `src/__tests__/` for unit tests, `tests/e2e/` for Playwright

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create types and foundational services that all user stories depend on

- [ ] T001 Copy type contracts from `specs/001-csv-transaction-import/contracts/csv-import-types.ts` to `src/types/csv-import.ts`
- [ ] T002 [P] Add CSV validation schemas from `specs/001-csv-transaction-import/contracts/validation-schemas.ts` to `src/lib/utils/validation.ts`
- [ ] T003 [P] Create date parsing utility in `src/lib/utils/date-parser.ts` with multi-format support (ISO, US, EU, written)
- [ ] T004 [P] Create CSV parser service in `src/lib/services/csv-parser.ts` using papaparse with delimiter auto-detection

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services that MUST be complete before ANY user story UI can be implemented

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete

- [ ] T005 Create column detector service in `src/lib/services/column-detector.ts` with header keyword matching
- [ ] T006 Create CSV validator service in `src/lib/services/csv-validator.ts` with row-level validation
- [ ] T007 Create CSV importer orchestration service in `src/lib/services/csv-importer.ts` (coordinates parsing, detection, validation)
- [ ] T008 Create Zustand store for import state in `src/lib/stores/csv-import.ts`
- [ ] T009 [P] Add unit test for date parser in `src/lib/utils/__tests__/date-parser.test.ts`
- [ ] T010 [P] Add unit test for CSV parser in `src/lib/services/__tests__/csv-parser.test.ts`
- [ ] T011 [P] Add unit test for column detector in `src/lib/services/__tests__/column-detector.test.ts`
- [ ] T012 [P] Add unit test for CSV validator in `src/lib/services/__tests__/csv-validator.test.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Import Transactions from CSV File (Priority: P1) 🎯 MVP

**Goal**: Users can upload a CSV file with standard headers, see auto-detected column mappings, and import transactions to their portfolio.

**Independent Test**: Upload a CSV with Date, Symbol, Quantity, Price, Type columns → verify transactions appear in portfolio.

### Tests for User Story 1

- [ ] T013 [P] [US1] Add unit test for csv-importer service in `src/lib/services/__tests__/csv-importer.test.ts`
- [ ] T014 [P] [US1] Add E2E test for basic CSV import flow in `tests/e2e/csv-import.spec.ts`

### Implementation for User Story 1

- [ ] T015 [P] [US1] Create file upload component in `src/components/forms/csv-file-upload.tsx` with drag-drop and file input
- [ ] T016 [P] [US1] Create import preview table component in `src/components/forms/import-preview-table.tsx` showing first 10 rows
- [ ] T017 [US1] Create main CSV import dialog in `src/components/forms/csv-import-dialog.tsx` orchestrating the import flow
- [ ] T018 [US1] Create import results summary component in `src/components/forms/import-results.tsx` showing success/failure counts
- [ ] T019 [US1] Wire up "Import CSV" button on transactions page in `src/app/(dashboard)/transactions/page.tsx`
- [ ] T020 [US1] Add progress indicator to import dialog for large files
- [ ] T021 [US1] Export csv-import store from `src/lib/stores/index.ts`

**Checkpoint**: User Story 1 complete - basic CSV import with auto-detection works

---

## Phase 4: User Story 2 - Correct Column Mapping Before Import (Priority: P2)

**Goal**: Users can manually correct column mappings when auto-detection is wrong or incomplete.

**Independent Test**: Upload a CSV with non-standard headers (e.g., "Ticker" instead of "Symbol") → manually reassign mapping → import succeeds.

### Tests for User Story 2

- [ ] T022 [P] [US2] Add E2E test for manual column mapping correction in `tests/e2e/csv-import.spec.ts`

### Implementation for User Story 2

- [ ] T023 [US2] Create column mapping editor component in `src/components/forms/column-mapping-editor.tsx` with dropdown selectors
- [ ] T024 [US2] Add required field validation indicator to column mapping editor (highlight unmapped required fields)
- [ ] T025 [US2] Integrate column mapping editor into csv-import-dialog.tsx with edit mode toggle
- [ ] T026 [US2] Add "mapping_review" status handling in csv-import store
- [ ] T027 [US2] Show confidence scores for auto-detected mappings in column-mapping-editor.tsx

**Checkpoint**: User Stories 1 AND 2 work independently

---

## Phase 5: User Story 3 - Handle Import Errors Gracefully (Priority: P3)

**Goal**: Invalid rows are reported with clear error messages; valid rows import successfully; failed rows can be downloaded.

**Independent Test**: Upload CSV with 5 malformed rows among 100 → 95 import, 5 errors listed with reasons, download failed rows CSV.

### Tests for User Story 3

- [ ] T028 [P] [US3] Add unit tests for error reporting in csv-validator in `src/lib/services/__tests__/csv-validator.test.ts`
- [ ] T029 [P] [US3] Add E2E test for partial import with errors in `tests/e2e/csv-import.spec.ts`

### Implementation for User Story 3

- [ ] T030 [US3] Create error report component in `src/components/forms/import-error-report.tsx` showing row number, data, and error message
- [ ] T031 [US3] Add "Download Failed Rows" button to import-results.tsx with CSV generation
- [ ] T032 [US3] Implement failed rows CSV generation utility in `src/lib/utils/csv-export.ts`
- [ ] T033 [US3] Update import-results.tsx to show detailed error breakdown with expandable rows
- [ ] T034 [US3] Add error severity styling (error vs warning) in error report component

**Checkpoint**: User Stories 1, 2, AND 3 all work independently

---

## Phase 6: User Story 4 - Handle Duplicate Transaction Detection (Priority: P4)

**Goal**: System detects potential duplicates by matching date+symbol+quantity+price; users choose skip, import anyway, or review individually.

**Independent Test**: Import a file, then import the same file again → duplicates detected and flagged → choose skip → only new transactions added.

### Tests for User Story 4

- [ ] T035 [P] [US4] Add unit test for duplicate detection in `src/lib/services/__tests__/csv-importer.test.ts`
- [ ] T036 [P] [US4] Add E2E test for duplicate detection and handling in `tests/e2e/csv-import.spec.ts`

### Implementation for User Story 4

- [ ] T037 [US4] Add duplicate detection logic to csv-importer.ts using transaction hash comparison
- [ ] T038 [US4] Create duplicate review component in `src/components/forms/duplicate-review.tsx` showing matched transactions
- [ ] T039 [US4] Add duplicate handling options (skip/import/review) to csv-import-dialog.tsx
- [ ] T040 [US4] Update import-results.tsx to show "X duplicates skipped" count
- [ ] T041 [US4] Add `duplicateHandling` state and actions to csv-import store

**Checkpoint**: User Stories 1-4 all work independently

---

## Phase 7: User Story 5 - Support Common Brokerage Export Formats (Priority: P5 - Enhancement)

**Goal**: System recognizes known brokerage CSV formats and auto-applies correct mappings.

**Independent Test**: Upload a Fidelity/Schwab export → system shows "Detected: [Brokerage] format" → import without manual mapping.

**Note**: This is an enhancement. MVP (US1-US4) provides full value without this.

### Tests for User Story 5

- [ ] T042 [P] [US5] Add unit test for brokerage format detection in `src/lib/services/__tests__/column-detector.test.ts`

### Implementation for User Story 5

- [ ] T043 [US5] Define brokerage format presets in `src/lib/services/brokerage-formats.ts` (Fidelity, Schwab, Robinhood)
- [ ] T044 [US5] Add brokerage format detection to column-detector.ts based on header patterns
- [ ] T045 [US5] Show "Detected: [Brokerage Name] format" badge in import preview when format recognized
- [ ] T046 [US5] Add brokerage format override option if detection is wrong

**Checkpoint**: All user stories (1-5) work

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T047 [P] Add accessibility labels to all form components in csv-import-dialog.tsx
- [ ] T048 [P] Add loading states and skeleton UI for file parsing in csv-import-dialog.tsx
- [ ] T049 Performance optimization: implement chunked processing for files >1000 rows in csv-importer.ts
- [ ] T050 Add cancel import functionality with confirmation dialog
- [ ] T051 [P] Run `npm run lint` and fix any issues
- [ ] T052 [P] Run `npm run type-check` and fix any type errors
- [ ] T053 Run full test suite: `npm run test && npm run test:e2e`
- [ ] T054 Update CLAUDE.md with CSV import feature documentation if needed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in priority order (P1 → P2 → P3 → P4 → P5)
  - Or in parallel if staffed appropriately
- **Polish (Phase 8)**: Depends on at least US1-US3 being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundation → US1 (no dependencies on other stories) 🎯 MVP
- **User Story 2 (P2)**: Foundation → US2 (enhances US1 UI but independently testable)
- **User Story 3 (P3)**: Foundation → US3 (enhances error handling, independently testable)
- **User Story 4 (P4)**: Foundation → US4 (adds duplicate detection, independently testable)
- **User Story 5 (P5)**: Foundation → US5 (enhancement, optional for MVP)

### Within Each User Story

- Tests SHOULD be written and fail before implementation (TDD approach per constitution)
- Services before UI components
- Core components before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (all [P] tasks):**
```
T002 (validation schemas) || T003 (date parser) || T004 (csv parser)
```

**Phase 2 (tests can run in parallel):**
```
T009 (date-parser.test) || T010 (csv-parser.test) || T011 (column-detector.test) || T012 (csv-validator.test)
```

**Phase 3 - US1 (components can run in parallel):**
```
T015 (file-upload) || T016 (preview-table)
```

---

## Parallel Example: Foundation Tests

```bash
# Launch all foundation tests together:
Task: "Add unit test for date parser in src/lib/utils/__tests__/date-parser.test.ts"
Task: "Add unit test for CSV parser in src/lib/services/__tests__/csv-parser.test.ts"
Task: "Add unit test for column detector in src/lib/services/__tests__/column-detector.test.ts"
Task: "Add unit test for CSV validator in src/lib/services/__tests__/csv-validator.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test US1 independently with standard CSV files
5. Deploy/demo if ready - users can now bulk import transactions

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test independently → **MVP Ready!** (basic import works)
3. Add US2 → Test independently → Manual mapping available
4. Add US3 → Test independently → Error handling complete
5. Add US4 → Test independently → Duplicate protection complete
6. Add US5 (optional) → Test independently → Brokerage presets available
7. Each story adds value without breaking previous stories

### Recommended Sequence for Solo Developer

```
Day 1: T001-T008 (Setup + Foundation services)
Day 2: T009-T012 (Foundation tests)
Day 3: T013-T021 (US1 complete - MVP!)
Day 4: T022-T027 (US2 complete)
Day 5: T028-T034 (US3 complete)
Day 6: T035-T041 (US4 complete)
Day 7: T042-T046 (US5 optional), T047-T054 (Polish)
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1: Setup | T001-T004 (4 tasks) | Types, schemas, utilities |
| Phase 2: Foundational | T005-T012 (8 tasks) | Core services + tests |
| Phase 3: US1 (P1) | T013-T021 (9 tasks) | Basic import 🎯 MVP |
| Phase 4: US2 (P2) | T022-T027 (6 tasks) | Manual mapping |
| Phase 5: US3 (P3) | T028-T034 (7 tasks) | Error handling |
| Phase 6: US4 (P4) | T035-T041 (7 tasks) | Duplicate detection |
| Phase 7: US5 (P5) | T042-T046 (5 tasks) | Brokerage presets |
| Phase 8: Polish | T047-T054 (8 tasks) | Quality & cleanup |
| **Total** | **54 tasks** | |

### Tasks per User Story

- US1: 9 tasks (MVP)
- US2: 6 tasks
- US3: 7 tasks
- US4: 7 tasks
- US5: 5 tasks (optional enhancement)

### Parallel Opportunities

- Phase 1: 3 parallel tasks (T002, T003, T004)
- Phase 2: 4 parallel test tasks (T009-T012)
- Phase 3: 3 parallel tasks (T013, T014, T015/T016)
- Each US phase: 2-3 parallel opportunities
- Total: ~15 tasks can run in parallel with proper coordination

### MVP Scope

**Minimum viable feature (21 tasks):**
- Phase 1: Setup (4 tasks)
- Phase 2: Foundational (8 tasks)
- Phase 3: User Story 1 (9 tasks)

After MVP, each additional user story adds incremental value.
