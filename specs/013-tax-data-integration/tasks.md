# Implementation Tasks: Tax Data Integration

**Feature**: 013-tax-data-integration
**Branch**: `013-tax-data-integration`
**Generated**: 2026-01-31

## Overview

This task list implements tax-specific metadata integration across CSV import, export, dashboard, and analysis features. Tasks are organized by user story (from spec.md) to enable independent implementation and testing of each feature increment.

---

## Implementation Strategy

### MVP Approach
**MVP = User Story 1 only** (P1: CSV Import)
- Delivers immediate value: Users can import ESPP/RSU data
- Independently testable without US2 or US3
- Estimated: 1 week

### Incremental Delivery
- **Iteration 1** (MVP): US1 - CSV Import with tax fields
- **Iteration 2**: US2 - Export with tax columns
- **Iteration 3**: US3 - Dashboard widget + Analysis recommendations

### Parallel Execution
Tasks marked with `[P]` are parallelizable within their phase and can be executed simultaneously by different developers or AI agents.

---

## Phase 1: Setup & Type Definitions

**Goal**: Establish type system and shared utilities for tax metadata.

**Prerequisites**: None (can start immediately)

### Tasks

- [ ] T001 [P] Extend Transaction interface with tax fields in src/types/transaction.ts
- [ ] T002 [P] Extend TransactionStorage interface with serialized tax fields in src/types/storage.ts
- [ ] T003 [P] Add tax field names to TRANSACTION_DECIMAL_FIELDS array in src/lib/utils/decimal-serialization.ts
- [ ] T004 [P] Create TaxSettings interface in src/types/settings.ts
- [ ] T005 [P] Create tax-specific type definitions in src/types/tax.ts (AgingLot, TaxExposureMetrics, TaxRecommendation)
- [ ] T006 [P] Create formatCurrency, formatPercent, formatHoldingPeriod utilities in src/lib/utils/tax-formatters.ts
- [ ] T007 Verify decimal serialization hooks work with new tax fields by reading Transaction test file

**Completion Criteria**: All type definitions compile without errors, decimal serialization functions handle tax fields correctly.

---

## Phase 2: Foundational Services

**Goal**: Build tax calculation engine and settings management (blocking prerequisites for all user stories).

**Prerequisites**: Phase 1 complete

### Tasks

- [ ] T008 Create TaxSettings store in src/lib/stores/tax-settings.ts with default rates (ST: 0.24, LT: 0.15)
- [ ] T009 Create calculateHoldingPeriod function in src/lib/services/tax-calculator.ts (365-day threshold)
- [ ] T010 [P] Create detectAgingLots function in src/lib/services/tax-calculator.ts (30-day lookback algorithm)
- [ ] T011 [P] Create calculateTaxExposure function in src/lib/services/tax-calculator.ts (ST/LT gains aggregation)
- [ ] T012 [P] Create unit tests for calculateHoldingPeriod in src/lib/services/__tests__/tax-calculator.test.ts
- [ ] T013 [P] Create unit tests for detectAgingLots in src/lib/services/__tests__/tax-calculator.test.ts
- [ ] T014 [P] Create unit tests for calculateTaxExposure in src/lib/services/__tests__/tax-calculator.test.ts

**Completion Criteria**: All tax calculation functions pass unit tests with 90%+ accuracy on aging lot detection, calculations complete in <200ms for 500 holdings.

---

## Phase 3: User Story 1 - CSV Import with Tax Fields (P1)

**Goal**: As an employee with stock compensation, I want to import my ESPP and RSU transactions using a CSV file, so that I don't have to manually enter complex tax metadata for every vest or purchase.

**Prerequisites**: Phase 1 & 2 complete

**Independent Test**: Upload a CSV with columns for "Grant Date", "Shares Withheld", and "Discount %" and verify the resulting transactions have correct tax metadata attached.

### Tasks

#### Column Detection

- [ ] T015 [US1] Add grantDatePatterns array to column-detector.ts (10 variations: 'grant date', 'award date', 'purchase date', etc.)
- [ ] T016 [US1] Add vestingDatePatterns array to column-detector.ts (8 variations: 'vest date', 'vesting date', 'release date', etc.)
- [ ] T017 [US1] Add discountPercentPatterns array to column-detector.ts (7 variations: 'discount', 'discount %', 'espp discount', etc.)
- [ ] T018 [US1] Add sharesWithheldPatterns array to column-detector.ts (10 variations: 'shares withheld', 'tax shares', 'shares sold to cover', etc.)
- [ ] T019 [US1] Add ordinaryIncomePatterns array to column-detector.ts (12 variations: 'ordinary income', 'w2 income', 'compensation income', etc.)
- [ ] T020 [US1] Update detectColumnMappings function to map tax field patterns to CSVImportMapping in src/lib/services/column-detector.ts

#### Validation

- [ ] T021 [US1] Extend CSVImportMapping interface with optional tax fields in src/types/csv-import.ts
- [ ] T022 [US1] Add date validation for grantDate (must be ≤ today) in src/lib/services/csv-validator.ts
- [ ] T023 [US1] Add date validation for vestingDate (must be ≥ grantDate, ≤ today) in src/lib/services/csv-validator.ts
- [ ] T024 [US1] Add numeric validation for discountPercent (0.0-0.5 range) in src/lib/services/csv-validator.ts
- [ ] T025 [US1] Add numeric validation for sharesWithheld (must be ≤ quantity) in src/lib/services/csv-validator.ts
- [ ] T026 [US1] Add numeric validation for ordinaryIncomeAmount (must be ≥ 0) in src/lib/services/csv-validator.ts

#### Import Execution

- [ ] T027 [US1] Update createTransactionFromRow to include tax fields from ParsedRow in src/lib/services/csv-importer.ts
- [ ] T028 [US1] Add normalizeDiscountPercent function to convert percentage to decimal (15 → 0.15) in src/lib/services/csv-importer.ts
- [ ] T029 [US1] Add isGrossSharesImport detection logic (if sharesWithheld present, quantity = net) in src/lib/services/csv-importer.ts
- [ ] T030 [US1] Add calculateGrossShares function (net + withheld) in src/lib/services/csv-importer.ts

#### Testing

- [ ] T031 [US1] Create unit tests for tax column detection in src/lib/services/__tests__/column-detector.test.ts
- [ ] T032 [US1] Create unit tests for tax field validation in src/lib/services/__tests__/csv-validator.test.ts
- [ ] T033 [US1] Create E2E test for importing RSU CSV with withholding in tests/e2e/csv-import-tax.spec.ts
- [ ] T034 [US1] Create E2E test for importing ESPP CSV with discount in tests/e2e/csv-import-tax.spec.ts
- [ ] T035 [US1] Create E2E test for gross vs net shares calculation in tests/e2e/csv-import-tax.spec.ts

**Acceptance Criteria** (from spec.md):
- ✅ System correctly identifies "RSU Vest" rows with "Shares Withheld" columns
- ✅ Column mapping interface allows mapping to "Grant Date", "Discount %", "Vesting FMV" fields
- ✅ Users can import 100 RSU vesting events without errors (SC-001)
- ✅ Auto-detects Gross vs Net import based on "Shares Withheld" presence (FR-006)

---

## Phase 4: User Story 2 - Export Tax-Aware Reports (P2)

**Goal**: As a tax-conscious investor, I want to export my transaction history and holdings with estimated tax liability data, so that I can provide complete records to my tax advisor.

**Prerequisites**: Phase 1 & 2 complete (US1 optional - export works independently)

**Independent Test**: Click "Export" on the Reports page and verify the resulting CSV contains columns for "Holding Period (ST/LT)", "Estimated Basis Adjustment", and "Potential Tax Bill".

### Tasks

#### Type Definitions

- [ ] T036 [P] [US2] Extend TransactionExportRow interface with 5 tax columns in src/types/export.ts
- [ ] T037 [P] [US2] Extend HoldingExportRow interface with 5 tax columns in src/types/export.ts

#### Transaction Export

- [ ] T038 [US2] Update prepareTransactionData to include grantDate column (format: yyyy-MM-dd) in src/lib/services/export-service.ts
- [ ] T039 [US2] Update prepareTransactionData to include vestDate column (format: yyyy-MM-dd) in src/lib/services/export-service.ts
- [ ] T040 [US2] Update prepareTransactionData to include discountPercent column (format: ##.##%) in src/lib/services/export-service.ts
- [ ] T041 [US2] Update prepareTransactionData to include sharesWithheld column (format: #,###.####) in src/lib/services/export-service.ts
- [ ] T042 [US2] Update prepareTransactionData to include ordinaryIncome column (format: $#,###.##) in src/lib/services/export-service.ts

#### Holdings Export

- [ ] T043 [US2] Update prepareHoldingsData to calculate holdingPeriod (ST/LT/Mixed) per holding in src/lib/services/export-service.ts
- [ ] T044 [US2] Update prepareHoldingsData to calculate shortTermGain (sum of ST lots with gains > 0) in src/lib/services/export-service.ts
- [ ] T045 [US2] Update prepareHoldingsData to calculate longTermGain (sum of LT lots with gains > 0) in src/lib/services/export-service.ts
- [ ] T046 [US2] Update prepareHoldingsData to calculate estimatedTax (ST × STrate + LT × LTrate) in src/lib/services/export-service.ts
- [ ] T047 [US2] Add basisAdjustment column for ESPP disqualifying dispositions in src/lib/services/export-service.ts

#### Testing

- [ ] T048 [US2] Create unit tests for transaction export with tax columns in src/lib/services/__tests__/export-service.test.ts
- [ ] T049 [US2] Create unit tests for holdings export with tax metrics in src/lib/services/__tests__/export-service.test.ts
- [ ] T050 [US2] Create E2E test for exporting transactions with tax data in tests/e2e/export-tax-data.spec.ts
- [ ] T051 [US2] Create E2E test for exporting holdings with tax calculations in tests/e2e/export-tax-data.spec.ts

**Acceptance Criteria** (from spec.md):
- ✅ Transaction CSV includes 5 tax columns: Grant Date, Vest Date, Discount %, Shares Withheld, Ordinary Income (SC-002)
- ✅ Holdings CSV includes estimated unrealized tax based on configured rates
- ✅ Export completes in <3 seconds for 10k transactions
- ✅ Bargain element included in ordinary income (FR-005)

---

## Phase 5: User Story 3 - Tax Alerts on Dashboard & Analysis (P2)

**Goal**: As an investor, I want to see tax-related warnings and opportunities (like upcoming LT transitions) on my main dashboard and analysis pages, so that I can time my sales optimally.

**Prerequisites**: Phase 1 & 2 complete (US1 & US2 optional - alerts work independently)

**Independent Test**: Have a lot that is 11 months old and verify a "Tax Optimization" recommendation appears on the Analysis page. Verify "Tax Exposure" widget displays on Dashboard.

### Tasks

#### Dashboard Widget

- [ ] T052 [P] [US3] Create TaxExposureWidget component in src/components/dashboard/widgets/tax-exposure-widget.tsx
- [ ] T053 [P] [US3] Add WidgetSkeleton loading state to TaxExposureWidget
- [ ] T054 [P] [US3] Add TaxExposureEmptyState component for portfolios without tax lots
- [ ] T055 [US3] Add 'tax-exposure' to WidgetId union type in src/types/dashboard.ts
- [ ] T056 [US3] Add WIDGET_SIZE_CONSTRAINTS for tax-exposure (minW:1, maxW:2, minH:2, maxH:4) in src/types/dashboard.ts
- [ ] T057 [US3] Add render case for 'tax-exposure' widget in dashboard-container-rgl.tsx
- [ ] T058 [US3] Add 'tax-exposure' to DEFAULT_DASHBOARD_CONFIG in src/lib/services/dashboard-config.ts
- [ ] T059 [US3] Add useMemo hook to calculate tax exposure in dashboard container using calculateTaxExposure function

#### Analysis Recommendations

- [ ] T060 [P] [US3] Add 'tax_lot_aging' to RecommendationType union in src/types/analysis.ts
- [ ] T061 [P] [US3] Create TaxRecommendationMetadata interface in src/types/analysis.ts
- [ ] T062 [US3] Add checkTaxLotAging function to recommendation-engine.ts using detectAgingLots
- [ ] T063 [US3] Integrate checkTaxLotAging into generateRecommendations main loop in src/lib/services/analysis/recommendation-engine.ts
- [ ] T064 [US3] Create TaxRecommendations component to display aging lot alerts in src/components/analysis/tax-recommendations.tsx
- [ ] T065 [US3] Add tax recommendations section to Analysis page in src/app/(dashboard)/analysis/page.tsx

#### Testing

- [ ] T066 [US3] Create unit tests for TaxExposureWidget rendering in src/components/dashboard/widgets/__tests__/tax-exposure-widget.test.tsx
- [ ] T067 [US3] Create unit tests for checkTaxLotAging recommendation logic in src/lib/services/analysis/__tests__/recommendation-engine.test.ts
- [ ] T068 [US3] Create E2E test for tax exposure widget display on dashboard in tests/e2e/dashboard-tax-widget.spec.ts
- [ ] T069 [US3] Create E2E test for aging lot recommendation on analysis page in tests/e2e/analysis-tax-recommendations.spec.ts
- [ ] T070 [US3] Create E2E test for 30-day lookback accuracy (11-month-old lot triggers alert) in tests/e2e/analysis-tax-recommendations.spec.ts

**Acceptance Criteria** (from spec.md):
- ✅ Tax Exposure widget renders on dashboard in <200ms (SC-003)
- ✅ Recommendation appears for lots turning LT within 30 days
- ✅ 90% of lot aging events correctly flagged (SC-004)
- ✅ Widget shows estimated ST and LT tax liability (FR-004)

---

## Phase 6: Polish & Integration

**Goal**: Complete feature with documentation, edge case handling, and cross-cutting concerns.

**Prerequisites**: US1, US2, US3 complete

### Tasks

#### Documentation

- [ ] T071 [P] Update CLAUDE.md with tax feature overview and common commands
- [ ] T072 [P] Add tax import/export examples to README.md
- [ ] T073 [P] Create tax feature user guide in docs/features/tax-integration.md

#### Edge Cases

- [ ] T074 Handle ambiguous CSV column conflicts (prompt user for manual mapping) in src/lib/services/column-detector.ts
- [ ] T075 Add conflict resolution UI for tax field mapping in src/components/forms/column-mapping-editor.tsx
- [ ] T076 Handle missing current prices gracefully in detectAgingLots (skip lots without prices)
- [ ] T077 Add validation for tax field business rules (grantDate ≤ vestingDate ≤ date) in csv-validator.ts

#### Performance Optimization

- [ ] T078 Add memoization to tax exposure calculation in dashboard container (useMemo with stable deps)
- [ ] T079 Verify <200ms render time for Tax Exposure widget with 500 holdings
- [ ] T080 Verify <3 second export time for 10k transactions with tax columns
- [ ] T081 Add optional IndexedDB compound index [portfolioId+grantDate] for future performance (comment only, not implemented)

#### Cross-Browser Testing

- [ ] T082 [P] Test CSV import with tax fields in Chrome
- [ ] T083 [P] Test CSV import with tax fields in Firefox
- [ ] T084 [P] Test CSV import with tax fields in Safari
- [ ] T085 [P] Test export with tax columns in Chrome
- [ ] T086 [P] Test export with tax columns in Firefox

**Completion Criteria**: All edge cases handled, performance targets met, documentation complete, cross-browser compatibility verified.

---

## Dependencies & Execution Order

### Story Completion Order

```
Phase 1 (Setup) → Phase 2 (Foundational)
                        ↓
        ┌───────────────┼───────────────┐
        ↓               ↓               ↓
    US1 (P1)        US2 (P2)        US3 (P2)
    CSV Import      Export          Dashboard/Analysis
        ↓               ↓               ↓
        └───────────────┼───────────────┘
                        ↓
                  Phase 6 (Polish)
```

**Critical Path**: Phase 1 → Phase 2 → US1 → Phase 6

**Parallel Stories**: US1, US2, US3 are independent after Phase 2 completes.

### Task Dependencies Within Stories

#### User Story 1 (CSV Import)
- T015-T020 (Column Detection) can run in parallel
- T021-T026 (Validation) depend on T021 (type extension) but are otherwise parallel
- T027-T030 (Import Execution) are sequential
- T031-T035 (Tests) depend on implementation but can run in parallel

#### User Story 2 (Export)
- T036-T037 (Types) can run in parallel
- T038-T042 (Transaction Export) can run in parallel after T036
- T043-T047 (Holdings Export) can run in parallel after T037
- T048-T051 (Tests) can run in parallel

#### User Story 3 (Dashboard/Analysis)
- T052-T054 (Widget Components) can run in parallel
- T055-T059 (Widget Integration) are sequential
- T060-T061 (Recommendation Types) can run in parallel
- T062-T065 (Recommendation Integration) are sequential
- T066-T070 (Tests) can run in parallel

---

## Parallel Execution Examples

### Scenario 1: Two Developers

**Developer A (Backend Focus)**:
- Phase 1: T001-T007 (types)
- Phase 2: T008-T014 (tax calculator)
- US1: T015-T030 (CSV import logic)
- US2: T038-T047 (export logic)

**Developer B (Frontend/Testing Focus)**:
- Phase 1: T006 (formatters)
- US1: T031-T035 (CSV import tests)
- US2: T048-T051 (export tests)
- US3: T052-T070 (dashboard, analysis, tests)

### Scenario 2: Three AI Agents

**Agent 1 (Type System & Services)**:
- T001-T005, T008-T011 (types & core services)
- T015-T020 (column detection)
- T036-T037 (export types)
- T060-T061 (recommendation types)

**Agent 2 (CSV Import & Export)**:
- T021-T030 (import validation & execution)
- T038-T047 (export implementation)
- T074-T077 (edge cases)

**Agent 3 (UI & Testing)**:
- T052-T059 (dashboard widget)
- T062-T065 (analysis recommendations)
- T031-T035, T048-T051, T066-T070 (all tests)
- T071-T073 (documentation)

---

## Task Summary

| Phase | Task Count | Parallelizable | Story |
|-------|-----------|----------------|-------|
| Phase 1: Setup | 7 | 6 (86%) | - |
| Phase 2: Foundational | 7 | 5 (71%) | - |
| Phase 3: US1 CSV Import | 21 | 14 (67%) | P1 |
| Phase 4: US2 Export | 16 | 10 (63%) | P2 |
| Phase 5: US3 Dashboard/Analysis | 19 | 10 (53%) | P2 |
| Phase 6: Polish | 15 | 8 (53%) | - |
| **TOTAL** | **85** | **53 (62%)** | - |

### Task Distribution by Type

| Type | Count | Percentage |
|------|-------|-----------|
| Type Definitions | 10 | 12% |
| Service Functions | 24 | 28% |
| UI Components | 14 | 16% |
| Validation | 11 | 13% |
| Unit Tests | 12 | 14% |
| E2E Tests | 10 | 12% |
| Documentation | 4 | 5% |

### Estimated Timeline

| Scope | Task Count | Estimated Duration |
|-------|-----------|-------------------|
| MVP (US1 only) | 35 tasks | 1 week |
| US1 + US2 | 51 tasks | 1.5 weeks |
| Full Feature (All 3 stories) | 85 tasks | 2-3 weeks |

**Assumptions**: 1 developer working full-time, or 2-3 developers/agents working in parallel.

---

## Testing Strategy

### Unit Test Coverage Target: 70%+

**Files requiring unit tests** (12 files):
- tax-calculator.ts (3 test files: holding period, aging lots, tax exposure)
- column-detector.ts (1 test file: tax patterns)
- csv-validator.ts (1 test file: tax field validation)
- export-service.ts (2 test files: transaction export, holdings export)
- recommendation-engine.ts (1 test file: tax lot aging check)
- TaxExposureWidget (1 test file: rendering)

### E2E Test Coverage

**User flows requiring E2E tests** (10 tests):
1. Import RSU CSV with withholding → verify transactions
2. Import ESPP CSV with discount → verify transactions
3. Import with gross vs net shares → verify calculation
4. Export transactions → verify 5 tax columns present
5. Export holdings → verify tax metrics calculated
6. Dashboard displays tax exposure widget
7. Analysis page shows aging lot recommendation
8. 11-month-old lot triggers 30-day alert
9. CSV column conflict resolution UI
10. Cross-browser CSV import/export

### Acceptance Test Mapping

| Success Criterion | Test Tasks | Acceptance Check |
|-------------------|-----------|------------------|
| SC-001: Import 100 RSU events | T033-T035 | E2E test with 100-row CSV |
| SC-002: 5 tax columns in export | T048-T051 | E2E test verifies column count |
| SC-003: Widget <200ms render | T066, T079 | Unit test + performance check |
| SC-004: 90% aging detection | T013, T070 | Unit test + E2E validation |

---

## Implementation Notes

### Critical Success Factors

1. **Decimal.js Everywhere**: All monetary calculations MUST use Decimal.js (no native floats)
2. **Type Safety**: No `any` types; use type guards for tax metadata access
3. **Backward Compatibility**: Tax fields are optional; existing transactions work unchanged
4. **Performance**: Pre-compute tax metrics in dashboard container (useMemo pattern)
5. **CSV Ambiguity**: Provide clear UI for manual column mapping when auto-detection conflicts

### Common Pitfalls to Avoid

- ❌ Using `any` type for tax metadata → ✅ Use proper type guards
- ❌ Float arithmetic for tax calculations → ✅ Use Decimal.js
- ❌ Assuming tax fields always present → ✅ Check with `hasTaxMetadata(tx)`
- ❌ Blocking US2/US3 on US1 completion → ✅ Stories are independent after Phase 2

### Code Review Checklist

- [ ] All tax calculations use Decimal.js
- [ ] Type safety enforced (no `any` types)
- [ ] Zod validation on all CSV imports
- [ ] Unit tests achieve 70%+ coverage
- [ ] E2E tests cover acceptance scenarios
- [ ] Performance targets met (<200ms widget, <3s export)
- [ ] Documentation updated (CLAUDE.md, README.md)

---

## Next Steps

1. **Start with MVP**: Implement Phase 1 → Phase 2 → User Story 1 (T001-T035)
2. **Test Incrementally**: Run unit tests after each service implementation
3. **Verify Independently**: Each user story should be testable without others
4. **Optimize Last**: Don't optimize prematurely; measure first (T078-T081)

**Ready to implement!** Begin with T001 (extend Transaction interface) and follow the task order.
