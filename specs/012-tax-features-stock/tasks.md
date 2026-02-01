# Tasks: Stock Tax Features (ESPP, RSU, Capital Gains)

**Input**: Design documents from `/specs/012-tax-features-stock/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Unit and E2E tests are included as per the test-driven quality principle in the constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `- [ ] [ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All file paths are relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend existing TypeScript types and database schema for tax features

- [ ] T001 Extend TransactionType union to include 'espp_purchase' | 'rsu_vest' in src/types/transaction.ts
- [ ] T002 [P] Create TaxLot interface extensions in src/types/asset.ts with optional fields: lotType, grantDate, bargainElement, vestingDate, vestingPrice
- [ ] T003 [P] Create new types file src/types/tax.ts with TaxSettings, TaxAnalysis, TaxLotAnalysis, DisqualifyingDisposition, DisqualifyingReason interfaces
- [ ] T004 [P] Create ESPPTransactionMetadata and RSUTransactionMetadata interfaces in src/types/transaction.ts
- [ ] T005 Update Dexie serialization hooks in src/lib/db/schema.ts to handle new Decimal fields: bargainElement, vestingPrice
- [ ] T006 [P] Add TAX_LOT_DECIMAL_FIELDS constant in src/lib/db/schema.ts with new decimal fields for serialization

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services and validation schemas that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Create HoldingPeriodCalculator service in src/lib/services/holding-period.ts with calculateHoldingPeriod(), calculateHoldingDays(), getHoldingPeriodThreshold() functions
- [ ] T008 [P] Create Zod validation schemas in src/types/tax.ts: TaxLotSchema, TaxSettingsSchema with refinement validators
- [ ] T009 [P] Create Zod validation schemas in src/types/transaction.ts: ESPPTransactionSchema, RSUTransactionSchema with cross-field validation
- [ ] T010 [P] Create TaxSettings Zustand store in src/lib/stores/tax-settings.ts with getters/setters for shortTermRate and longTermRate
- [ ] T011 Create TaxEstimator service in src/lib/services/tax-estimator.ts with estimateTaxLiability(), estimateForHolding(), calculateLotAnalysis() functions
- [ ] T012 [P] Create ESPPValidator service in src/lib/services/espp-validator.ts with isDisqualifyingDisposition(), checkDispositionStatus(), getDispositionReason(), getTaxImplicationMessage() functions

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Track ESPP with Discounts and Lookback (Priority: P1) 🎯 MVP

**Goal**: Enable users to track ESPP purchases with discount and grant date metadata, ensuring accurate cost basis and bargain element tracking for tax reporting.

**Independent Test**: Can be fully tested by adding a new "ESPP Purchase" transaction with a 15% discount, verifying the cost basis is recorded as the discounted price and the bargain element is stored separately.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T013 [P] [US1] Create unit tests for HoldingPeriodCalculator in tests/unit/holding-period.test.ts with 12 test cases covering boundary conditions (365 days, 366 days, leap years, same-day, invalid dates)
- [ ] T014 [P] [US1] Create E2E test for ESPP workflow in tests/e2e/espp-workflow.spec.ts testing transaction entry form, cost basis verification, and holdings display

### Implementation for User Story 1

- [ ] T015 [P] [US1] Create ESPPTransactionForm component in src/components/forms/espp-transaction-form.tsx with fields for Grant Date, Purchase Date, Market Price at Grant, Market Price at Purchase, Discount %, using React Hook Form + Zod validation
- [ ] T016 [US1] Implement ESPP transaction creation logic in transaction store/service to create TaxLot with lotType: 'espp', grantDate, and calculated bargainElement
- [ ] T017 [US1] Update Add Transaction dialog in src/components/forms/transaction-form.tsx to include "ESPP Purchase" option and conditionally render ESPPTransactionForm
- [ ] T018 [US1] Update Holdings detail view to display ESPP-specific metadata: Acquisition Cost vs Market Value at Purchase, Bargain Element in src/components/holdings/holding-detail.tsx
- [ ] T019 [US1] Add ESPP lot type badge/indicator in holdings table to distinguish ESPP lots from standard lots

**Checkpoint**: At this point, User Story 1 should be fully functional - users can enter ESPP transactions and view bargain element tracking

---

## Phase 4: User Story 2 - Track RSU Vesting and Taxation (Priority: P2)

**Goal**: Enable users to record RSU vesting events with tax withholding, ensuring portfolio reflects net shares received and correct FMV-based tax basis.

**Independent Test**: Can be tested by adding an "RSU Vest" transaction with "Shares Vested" and "Shares Withheld", verifying the resulting holding quantity equals (Vested - Withheld) and cost basis equals FMV at vesting.

### Tests for User Story 2

- [ ] T020 [P] [US2] Create E2E test for RSU workflow in tests/e2e/rsu-workflow.spec.ts testing vesting transaction entry, net shares calculation, and cost basis verification

### Implementation for User Story 2

- [ ] T021 [P] [US2] Create RSUTransactionForm component in src/components/forms/rsu-transaction-form.tsx with fields for Vesting Date, Gross Shares Vested, Shares Withheld for Tax, Vesting Price (FMV), using React Hook Form + Zod validation with auto-calculated Net Shares display
- [ ] T022 [US2] Implement RSU transaction creation logic to create TaxLot with lotType: 'rsu', vestingDate, vestingPrice matching purchasePrice, and quantity = netShares
- [ ] T023 [US2] Update Add Transaction dialog to include "RSU Vest" option and conditionally render RSUTransactionForm
- [ ] T024 [US2] Update Holdings detail view to display RSU-specific metadata: Gross Shares, Withheld Shares, Vesting Price in src/components/holdings/holding-detail.tsx
- [ ] T025 [US2] Add RSU lot type badge/indicator in holdings table to distinguish RSU lots from standard/ESPP lots

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - ESPP and RSU tracking fully functional

---

## Phase 5: User Story 3 - View Estimated Capital Gains Tax Liability (Priority: P3)

**Goal**: Transform portfolio tracker into active tax planning tool by showing unrealized capital gains broken down by Short Term vs Long Term with estimated tax liability based on user-configured rates.

**Independent Test**: Can be tested by viewing a holding with multiple lots (some >1 year, some <1 year) and verifying the "Tax Analysis" tab correctly separates gains based on holding period and applies correct tax rates.

### Tests for User Story 3

- [ ] T026 [P] [US3] Create unit tests for TaxEstimator in tests/unit/tax-estimator.test.ts with 8 test cases covering ST/LT gain calculation, loss handling, ESPP adjusted basis, zero quantities, missing prices
- [ ] T027 [P] [US3] Create unit tests for ESPPValidator in tests/unit/espp-validator.test.ts with 15 test cases covering disqualifying disposition rules, boundary conditions (exactly 1 year, exactly 2 years), invalid inputs
- [ ] T028 [P] [US3] Create E2E test for tax analysis view in tests/e2e/tax-analysis.spec.ts testing mixed ST/LT lot display, tax liability accuracy, settings integration

### Implementation for User Story 3

- [ ] T029 [P] [US3] Create TaxSettingsPanel component in src/components/settings/tax-settings-panel.tsx with sliders/inputs for Short-Term Rate (0-100%) and Long-Term Rate (0-100%) with percentage display and Decimal storage
- [ ] T030 [P] [US3] Create Tax Settings page in src/app/(dashboard)/settings/tax/page.tsx rendering TaxSettingsPanel
- [ ] T031 [US3] Implement tax settings persistence: save to IndexedDB userSettings table with key 'tax_rates', load defaults if not exists (ST: 24%, LT: 15%)
- [ ] T032 [P] [US3] Create TaxAnalysisTab component in src/components/holdings/tax-analysis-tab.tsx with Summary Cards (Tremor) for Unrealized ST/LT Gains, Estimated Tax Liability
- [ ] T033 [US3] Implement Tax Lot Table in TaxAnalysisTab with columns: Purchase Date, Quantity, Cost Basis, Current Value, Gain/Loss, Holding Period (ST/LT badge), Lot Type, sortable with color coding (green for LT, yellow for ST)
- [ ] T034 [US3] Add disqualifying disposition detection for ESPP lots: display warning badge with tooltip in Tax Lot Table when sale date violates 2-year grant OR 1-year purchase requirements
- [ ] T035 [US3] Integrate TaxAnalysisTab into Holdings detail page as new tab option alongside existing tabs
- [ ] T036 [US3] Wire up TaxEstimator service to calculate analysis on-demand when Tax Analysis tab is viewed, using current prices from price store and tax settings from settings store
- [ ] T037 [US3] Add loading state with skeleton loaders for tax calculations (target <100ms but good UX)

**Checkpoint**: All user stories should now be independently functional - complete ESPP/RSU tracking with tax liability estimation

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and ensure production readiness

- [ ] T038 [P] Update CLAUDE.md with Tax Features section documenting ESPP/RSU workflows, holding period calculation, tax estimation, common debugging scenarios
- [ ] T039 [P] Add tax features to mock data generator in test page for development/testing with sample ESPP/RSU lots
- [ ] T040 Add comprehensive JSDoc comments to all tax service functions (holding-period.ts, tax-estimator.ts, espp-validator.ts)
- [ ] T041 [P] Verify all Decimal.js arithmetic uses .mul(), .minus(), .plus(), .div() methods (no operators) in tax calculation paths
- [ ] T042 [P] Verify date handling uses date-fns functions (no manual date arithmetic) in holding period and ESPP validation logic
- [ ] T043 Run type-check (npm run type-check) and fix any TypeScript errors in tax-related files
- [ ] T044 Run linter (npm run lint) and fix any issues in new components and services
- [ ] T045 Validate quickstart.md examples work correctly with current implementation
- [ ] T046 Run full test suite (npm run test && npm run test:e2e) and achieve 90%+ coverage on tax services

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends only on Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends only on Foundational (Phase 2) - No dependencies on other stories (independently testable)
- **User Story 3 (P3)**: Depends only on Foundational (Phase 2) - No dependencies on other stories (tax analysis works on any lots including standard/ESPP/RSU)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (T013-T014 before T015-T019, etc.)
- Models/Types before services (Phase 1 types before Phase 2 services)
- Services before UI components (Phase 2 services before Phase 3-5 components)
- Core implementation before integration (forms before Add Transaction dialog integration)
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**: Tasks T002, T003, T004, T006 can run in parallel (different files)

**Phase 2 (Foundational)**: Tasks T008, T009, T010, T012 can run in parallel after T007 (different files)

**Phase 3 (User Story 1)**:
- Tests T013, T014 can run in parallel
- Component T015 can run parallel with transaction logic work

**Phase 4 (User Story 2)**:
- Component T021 can run parallel with transaction logic work

**Phase 5 (User Story 3)**:
- Tests T026, T027, T028 can run in parallel
- Settings panel T029 and Tax analysis tab T032 can run in parallel
- Multiple implementation tasks (T029, T030, T032) are independent files

**Phase 6 (Polish)**: Tasks T038, T039, T040, T041, T042 can run in parallel (different concerns)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Create unit tests for HoldingPeriodCalculator in tests/unit/holding-period.test.ts"
Task: "Create E2E test for ESPP workflow in tests/e2e/espp-workflow.spec.ts"

# After tests fail, launch independent components:
Task: "Create ESPPTransactionForm component in src/components/forms/espp-transaction-form.tsx"
# (while above runs, different developer can start):
Task: "Implement ESPP transaction creation logic in transaction store/service"
```

## Parallel Example: User Story 3

```bash
# Launch all tests together:
Task: "Create unit tests for TaxEstimator in tests/unit/tax-estimator.test.ts"
Task: "Create unit tests for ESPPValidator in tests/unit/espp-validator.test.ts"
Task: "Create E2E test for tax analysis view in tests/e2e/tax-analysis.spec.ts"

# Launch independent UI components together:
Task: "Create TaxSettingsPanel component in src/components/settings/tax-settings-panel.tsx"
Task: "Create Tax Settings page in src/app/(dashboard)/settings/tax/page.tsx"
Task: "Create TaxAnalysisTab component in src/components/holdings/tax-analysis-tab.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T006)
2. Complete Phase 2: Foundational (T007-T012) - CRITICAL: blocks all stories
3. Complete Phase 3: User Story 1 (T013-T019)
4. **STOP and VALIDATE**: Test ESPP transaction entry independently
5. Deploy/demo basic ESPP tracking capability

**Estimated MVP Scope**: ~19 tasks focused on ESPP tracking foundation

### Incremental Delivery

1. **Foundation**: Setup + Foundational (T001-T012) → Core services ready
2. **MVP Release**: + User Story 1 (T013-T019) → ESPP tracking live! 🎯
3. **Second Release**: + User Story 2 (T020-T025) → RSU tracking added
4. **Full Feature**: + User Story 3 (T026-T037) → Tax analysis complete
5. **Production**: + Polish (T038-T046) → Hardened and documented

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

1. **Team completes Phase 1-2 together** (T001-T012)
2. **Once Foundational is done:**
   - Developer A: User Story 1 (T013-T019) - ESPP tracking
   - Developer B: User Story 2 (T020-T025) - RSU tracking
   - Developer C: User Story 3 (T026-T037) - Tax analysis
3. Stories complete and integrate independently via shared services

---

## Summary

**Total Tasks**: 46
**Task Breakdown by Phase**:
- Phase 1 (Setup): 6 tasks
- Phase 2 (Foundational): 6 tasks
- Phase 3 (User Story 1): 7 tasks (2 tests + 5 implementation)
- Phase 4 (User Story 2): 6 tasks (1 test + 5 implementation)
- Phase 5 (User Story 3): 12 tasks (3 tests + 9 implementation)
- Phase 6 (Polish): 9 tasks

**Parallel Opportunities**: 18 tasks marked [P] can run concurrently with other tasks in same phase

**MVP Scope**: 19 tasks (Phases 1-3 for User Story 1 only)

**Independent Test Criteria**:
- **US1**: Add ESPP transaction → Verify bargain element stored → View in holdings
- **US2**: Add RSU vest → Verify net shares calculated → View in holdings
- **US3**: View mixed-lot holding → Verify ST/LT breakdown → Verify tax estimate accuracy

**Technology Stack**: TypeScript 5.3, Next.js 14.2 (App Router), React 18, Dexie.js 3.2 (IndexedDB), decimal.js 10.4, Zod 3.25, React Hook Form 7.63, shadcn/ui, Recharts 2.15

**Performance Targets**:
- Tax calculation updates: <100ms
- Holding period classification: <50ms
- Support: 10,000+ tax lots per portfolio

**Testing Coverage Goals**:
- Unit tests: 100% for holding-period.ts (pure logic)
- Unit tests: 95%+ for tax-estimator.ts (edge cases)
- Unit tests: 100% for espp-validator.ts (critical tax logic)
- E2E tests: Complete user workflows for ESPP, RSU, and tax analysis

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- All tasks include exact file paths for implementation
- Tests written first (TDD approach) for all user stories
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All financial calculations use decimal.js (no floating point)
- All date handling uses date-fns (no manual arithmetic)
- IndexedDB persistence via Dexie hooks with Decimal serialization
- Privacy-first: all data local, no server persistence, no external APIs for tax calculations
