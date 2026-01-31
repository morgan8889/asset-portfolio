# Tasks: Portfolio Export Functionality

**Input**: Design documents from `/specs/011-export-functionality/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Included per constitution (IV. Test-Driven Quality) - unit tests for services, E2E tests for workflows.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Project structure**: Next.js App Router at repository root
- Source: `src/`
- Tests: `src/lib/services/__tests__/` (unit), `tests/e2e/` (E2E)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create shared type definitions

- [X] T001 Install PDF generation dependencies: `npm install jspdf html2canvas jspdf-autotable && npm install -D @types/jspdf @types/html2canvas`
- [X] T002 [P] Create export types in src/types/export.ts (copy from contracts/export-service.ts)
- [X] T003 [P] Add export types to barrel export in src/types/index.ts
- [X] T004 [P] Create Zod validation schemas in src/lib/validation/export-schemas.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core export service and store infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create export service skeleton implementing IExportService in src/lib/services/export-service.ts
- [X] T006 Implement utility functions (generateExportFilename, getDateRangeBounds) in src/lib/services/export-service.ts
- [X] T007 [P] Create export progress Zustand store in src/lib/stores/export.ts
- [X] T008 [P] Create reusable ExportButton component with progress indicator in src/components/reports/export-button.tsx
- [X] T009 Unit tests for utility functions in src/lib/services/__tests__/export-service.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Export Portfolio Performance Report (Priority: P1) 🎯 MVP

**Goal**: Download a PDF report of portfolio performance with charts and summary tables

**Independent Test**: Navigate to Reports page, click "Download PDF", verify PDF contains Total Value chart, Asset Allocation donut, and Top 10 Holdings table

### Tests for User Story 1

- [X] T010 [P] [US1] Unit test for preparePerformanceData() in src/lib/services/__tests__/export-service.test.ts
- [ ] T011 [P] [US1] E2E test for PDF download workflow in tests/e2e/export-reports.spec.ts

### Implementation for User Story 1

- [X] T012 [US1] Implement preparePerformanceData() method in src/lib/services/export-service.ts
- [X] T013 [US1] Create PDF-capturable PerformanceReport component in src/components/reports/performance-report.tsx
- [X] T014 [US1] Create PerformanceChartForPdf component (fixed dimensions, no animations) in src/components/reports/performance-chart-pdf.tsx
- [X] T015 [P] [US1] Create AllocationDonutForPdf component (fixed dimensions, no animations) in src/components/reports/allocation-donut-pdf.tsx
- [X] T016 [US1] Implement generatePerformancePdf() with lazy-loaded jsPDF/html2canvas in src/lib/services/export-service.ts
- [X] T017 [US1] Wire up "Download PDF" button in src/app/(dashboard)/reports/page.tsx
- [X] T018 [US1] Add loading state and error toast for PDF generation in src/app/(dashboard)/reports/page.tsx

**Checkpoint**: User Story 1 complete - PDF export should work independently (FR-002, SC-001)

---

## Phase 4: User Story 2 - Export Transaction History (Priority: P2)

**Goal**: Export full transaction history as CSV file with date range filtering

**Independent Test**: Click "Export Transactions (CSV)", verify CSV contains Date, Type, Symbol, Quantity, Price, Fees, Total columns

### Tests for User Story 2

- [ ] T019 [P] [US2] Unit test for prepareTransactionData() with date range filtering in src/lib/services/__tests__/export-service.test.ts
- [ ] T020 [P] [US2] Unit test for CSV generation with 5K mock transactions (SC-002) in src/lib/services/__tests__/export-service.test.ts
- [ ] T021 [P] [US2] E2E test for transaction CSV download in tests/e2e/export-reports.spec.ts

### Implementation for User Story 2

- [ ] T022 [US2] Implement prepareTransactionData() with date filtering in src/lib/services/export-service.ts
- [ ] T023 [US2] Implement exportTransactionsCsv() using PapaParse in src/lib/services/export-service.ts
- [ ] T024 [P] [US2] Create DateRangeSelect component in src/components/reports/date-range-select.tsx
- [ ] T025 [US2] Wire up "Download CSV" button for transactions in src/app/(dashboard)/reports/page.tsx
- [ ] T026 [US2] Add date range selector to transaction export card in src/app/(dashboard)/reports/page.tsx
- [ ] T027 [US2] Add loading state and error handling for CSV export in src/app/(dashboard)/reports/page.tsx

**Checkpoint**: User Story 2 complete - Transaction CSV export should work independently (FR-003, FR-005, SC-002)

---

## Phase 5: User Story 3 - Export Current Holdings Snapshot (Priority: P3)

**Goal**: Download current holdings as CSV file with market values and gain/loss

**Independent Test**: Click "Export Holdings (CSV)", verify CSV contains Symbol, Name, Quantity, Cost Basis, Current Price, Market Value, Unrealized Gain/Loss columns

### Tests for User Story 3

- [ ] T028 [P] [US3] Unit test for prepareHoldingsData() in src/lib/services/__tests__/export-service.test.ts
- [ ] T029 [P] [US3] E2E test for holdings CSV download in tests/e2e/export-reports.spec.ts

### Implementation for User Story 3

- [ ] T030 [US3] Implement prepareHoldingsData() in src/lib/services/export-service.ts
- [ ] T031 [US3] Implement exportHoldingsCsv() using PapaParse in src/lib/services/export-service.ts
- [ ] T032 [US3] Wire up "Download CSV" button for holdings in src/app/(dashboard)/reports/page.tsx
- [ ] T033 [US3] Add loading state and error handling in src/app/(dashboard)/reports/page.tsx

**Checkpoint**: User Story 3 complete - Holdings CSV export should work independently (FR-004)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, empty state handling, and overall polish

- [ ] T034 [P] Handle empty portfolio state - disable buttons or show message in src/app/(dashboard)/reports/page.tsx
- [ ] T035 [P] Add escapeFormulae: true to all CSV generation (CSV injection prevention)
- [ ] T036 Verify filename convention compliance (FR-007) across all exports
- [ ] T037 [P] E2E test for empty portfolio handling in tests/e2e/export-reports.spec.ts
- [ ] T038 [P] Verify no network requests during export (SC-004) via E2E test in tests/e2e/export-reports.spec.ts
- [ ] T039 Run type-check and lint: `npm run type-check && npm run lint`
- [ ] T040 Manual verification: Open exported CSV in Excel/Numbers/Sheets (SC-003)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - Can proceed in parallel (if staffed) or sequentially (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Depends on Foundational - Independent of US1
- **User Story 3 (P3)**: Depends on Foundational - Independent of US1/US2

### Within Each User Story

- Tests SHOULD be written first to define expected behavior
- Data preparation methods before file generation
- Service implementation before UI wiring
- Error handling last

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational completes, all user stories can start in parallel
- Tests for each story marked [P] can run in parallel
- PDF chart components (T015) can parallel with other US1 implementation

---

## Parallel Example: Foundational Phase

```bash
# After T005 (service skeleton), these can run in parallel:
Task T006: "Implement utility functions in export-service.ts"
Task T007: "Create export progress store in src/lib/stores/export.ts"
Task T008: "Create ExportButton component in src/components/reports/export-button.tsx"
```

## Parallel Example: User Story 1 Tests

```bash
# These can run in parallel:
Task T010: "Unit test for preparePerformanceData()"
Task T011: "E2E test for PDF download workflow"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T009)
3. Complete Phase 3: User Story 1 (T010-T018)
4. **STOP and VALIDATE**: Test PDF export works end-to-end
5. Deploy/demo if ready - users can export performance PDFs

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test → Deploy (MVP: PDF export)
3. Add User Story 2 → Test → Deploy (+ Transaction CSV)
4. Add User Story 3 → Test → Deploy (+ Holdings CSV)
5. Polish phase → Final validation

### Single Developer Sequence

```
T001 → T002,T003,T004 (parallel) → T005 → T006,T007,T008 (parallel) → T009
→ T010,T011 (parallel) → T012 → T013 → T014,T015 (parallel) → T016 → T017 → T018
→ T019,T020,T021 (parallel) → T022 → T023 → T024 → T025 → T026 → T027
→ T028,T029 (parallel) → T030 → T031 → T032 → T033
→ T034,T035,T036 (parallel) → T037,T038 (parallel) → T039 → T040
```

---

## Requirements Coverage

| Requirement | Tasks | User Story |
|-------------|-------|------------|
| FR-001 | Existing (Reports page exists) | - |
| FR-002 | T012-T018 | US1 |
| FR-003 | T022-T027 | US2 |
| FR-004 | T030-T033 | US3 |
| FR-005 | T024-T026 | US2 |
| FR-006 | T038 (verified via E2E) | All |
| FR-007 | T006, T036 | All |
| SC-001 | T010, T016 | US1 |
| SC-002 | T020, T023 | US2 |
| SC-003 | T040 | All |
| SC-004 | T038 | All |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- PapaParse already installed - reuse existing `generateCsv()` and `downloadCsv()` utilities
- Lazy load jsPDF/html2canvas to avoid bundle bloat
- All monetary values must use Decimal.js formatting (constitution compliance)
- Commit after each checkpoint
