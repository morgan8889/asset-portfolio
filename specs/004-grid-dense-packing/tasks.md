# Implementation Tasks: Dashboard Grid Dense Packing

**Feature Branch**: `004-grid-dense-packing`
**Generated**: 2026-01-25
**Source**: spec.md, plan.md, data-model.md, quickstart.md, contracts/store-actions.md

## Task Legend

- `[P]` = Parallelizable (no dependencies on other tasks in same phase)
- `[S]` = Sequential (depends on prior tasks)
- `[US1]` = User Story 1: Enable Dense Grid Packing Mode (P1)
- `[US2]` = User Story 2: Configure Widget Row Spans (P1)
- `[US3]` = User Story 3: Automatic Widget Placement Optimization (P2)
- `[US4]` = User Story 4: Preview Layout Changes (P3)

---

## Phase 1: Setup & Preparation

- [X] T001 [P] Create feature branch `004-grid-dense-packing` from main
- [X] T002 [P] Read existing `src/types/dashboard.ts` to understand current v2 schema
- [X] T003 [P] Read existing `src/lib/stores/dashboard.ts` to understand store patterns
- [X] T004 [P] Read existing `src/lib/services/dashboard-config.ts` for persistence patterns

---

## Phase 2: Types & Schema (Foundational)

**Dependency**: T002 must complete first

- [X] T005 [S] [US1,US2] Add `WidgetRowSpan = 1 | 2 | 3` type to `src/types/dashboard.ts`
- [X] T006 [S] [US1,US2] Add `WidgetRowSpanSchema` Zod validator (z.union of literals 1, 2, 3)
- [X] T007 [S] [US1] Rename current `DashboardConfiguration` to `DashboardConfigurationV2`
- [X] T008 [S] [US1,US2] Create `DashboardConfiguration` v3 interface with:
  - `version: 3` (readonly)
  - `densePacking: boolean`
  - `widgetRowSpans: Partial<Record<WidgetId, WidgetRowSpan>>`
- [X] T009 [S] [US2] Add `DEFAULT_WIDGET_ROW_SPANS` constant:
  - `'growth-chart': 2`
  - `'recent-activity': 2`
  - `'category-breakdown': 2`
  - Metrics default to 1 (implicit)
- [X] T010 [S] [US1] Update `DEFAULT_DASHBOARD_CONFIG` to v3:
  - `densePacking: false`
  - `widgetRowSpans: { ...DEFAULT_WIDGET_ROW_SPANS }`
- [X] T011 [S] [US1,US2] Update `DashboardConfigurationSchema` for v3 validation

---

## Phase 3: Service & Migration

**Dependency**: Phase 2 must complete first

- [X] T012 [S] [US1] Add `migrateV2ToV3()` function in `src/lib/services/dashboard-config.ts`:
  - Spread v2 config
  - Set `version: 3`
  - Set `densePacking: false`
  - Set `widgetRowSpans: { ...DEFAULT_WIDGET_ROW_SPANS }`
- [X] T013 [S] [US1] Update `getConfig()` to detect v2 and call migration
- [X] T014 [P] [US1] Add `setDensePacking(enabled: boolean)` service method:
  - Load config, update densePacking, persist to IndexedDB
- [X] T015 [P] [US2] Add `setWidgetRowSpan(widgetId, rowSpan)` service method:
  - Load config, update widgetRowSpans[widgetId], persist to IndexedDB

---

## Phase 4: Store Actions

**Dependency**: T014, T015 must complete first

- [X] T016 [P] [US1] Add `setDensePacking` to `DashboardState` interface in store
- [X] T017 [P] [US2] Add `setWidgetRowSpan` to `DashboardState` interface in store
- [X] T018 [S] [US1] Implement `setDensePacking` action with optimistic update pattern:
  - Update store immediately
  - Persist via service
  - Rollback on error with error message
- [X] T019 [S] [US2] Implement `setWidgetRowSpan` action with optimistic update pattern:
  - Validate rowSpan is 1, 2, or 3
  - Update store immediately
  - Persist via service
  - Rollback on error with error message

---

## Phase 5: Dashboard Container (US1 - Dense Packing)

**Dependency**: Phase 4 must complete first

- [X] T020 [S] [US1,US3] Update `src/components/dashboard/dashboard-container.tsx`:
  - Add `grid-flow-row-dense` class when `config.densePacking && effectiveLayoutMode === 'grid'`
- [X] T021 [S] [US1] Ensure dense packing is disabled on mobile (< 768px) per FR-006
- [X] T022 [S] [US2] Compute effective row span per widget from `config.widgetRowSpans` with fallback to DEFAULT_WIDGET_ROW_SPANS
- [X] T023 [S] [US2] Pass `rowSpan` prop to each `WidgetWrapper` component

---

## Phase 6: Widget Wrapper (US2 - Row Spans)

**Dependency**: T023 must complete first

- [X] T024 [P] [US2] Add `rowSpan?: WidgetRowSpan` prop to `WidgetWrapperProps` interface
- [X] T025 [S] [US2] Add row span class mapping constant:
  ```tsx
  const ROW_SPAN_CLASSES: Record<WidgetRowSpan, string> = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
  };
  ```
- [X] T026 [S] [US2,US3] Apply `ROW_SPAN_CLASSES[rowSpan ?? 1]` to wrapper div className

---

## Phase 7: Settings UI (US1 + US2)

**Dependency**: Phase 4 and T026 must complete first

- [X] T027 [P] [US1] Import `WidgetRowSpan` type in `src/components/dashboard/dashboard-settings.tsx`
- [X] T028 [P] [US1] Add `handleDensePackingChange` callback calling `setDensePacking`
- [X] T029 [P] [US2] Add `handleWidgetRowSpanChange` callback calling `setWidgetRowSpan`
- [X] T030 [S] [US1] Add Dense Packing toggle section (FR-001):
  - Only visible when `config.layoutMode === 'grid'`
  - Use shadcn/ui Switch component
  - Label: "Dense Packing"
  - Description: "Fill gaps with smaller widgets"
- [X] T031 [S] [US2] Add Row Span selector per widget (FR-002, FR-008):
  - Only visible when `config.densePacking === true`
  - Use shadcn/ui Select component with options: "1x", "2x", "3x"
  - Display next to each widget row in visibility section
- [X] T032 [S] [US1,US2] Update `resetToDefault` to reset densePacking and widgetRowSpans

---

## Phase 8: Unit Tests

**Dependency**: Implementation phases must complete first

- [X] T033 [P] [US1,US2] Add type tests for `WidgetRowSpan` and `DashboardConfiguration` v3 schema
- [X] T034 [P] [US1] Add store test: `setDensePacking(true)` enables dense packing
- [X] T035 [P] [US1] Add store test: `setDensePacking(false)` disables dense packing
- [X] T036 [P] [US2] Add store test: `setWidgetRowSpan('growth-chart', 2)` updates row span
- [X] T037 [P] [US2] Add store test: `setWidgetRowSpan('growth-chart', 3)` updates row span
- [X] T038 [P] [US1] Add store test: persistence error rollback for `setDensePacking`
- [X] T039 [P] [US1,US2] Add migration test: v2 config migrates to v3 with defaults

---

## Phase 9: E2E Tests

**Dependency**: Phase 8 must complete first

- [X] T040 [S] [US1] Create `tests/e2e/dashboard-dense-packing.spec.ts`
- [X] T041 [S] [US1] E2E test: enabling dense packing shows row span selectors
- [X] T042 [S] [US1] E2E test: disabling dense packing hides row span selectors
- [X] T043 [S] [US2] E2E test: changing row span persists after page reload
- [X] T044 [S] [US1] E2E test: mobile viewport disables dense packing (FR-006)
- [X] T045 [S] [US3] E2E test: widgets reflow to fill gaps when dense packing enabled

---

## Phase 10: Verification & Polish

**Dependency**: All prior phases must complete

- [X] T046 [P] Run `npm run type-check` - verify no type errors
- [X] T047 [P] Run `npm run lint` - verify no lint errors
- [X] T048 [P] Run `npm run test` - all unit tests pass
- [X] T049 [S] Run `npx playwright test tests/e2e/dashboard-dense-packing.spec.ts` - all E2E tests pass
- [X] T050 [S] Run `npm run build` - production build succeeds
- [X] T051 [S] Manual verification: visual check of dense packing layout
- [X] T052 [S] [US3] Verify SC-003: widget changes reflect within 200ms
- [X] T053 [S] Verify SC-002: 85%+ grid space utilization with dense packing

---

## Task Summary

| Phase | Tasks | Parallelizable | User Stories |
|-------|-------|----------------|--------------|
| 1. Setup | 4 | 4 | - |
| 2. Types | 7 | 0 | US1, US2 |
| 3. Service | 4 | 2 | US1, US2 |
| 4. Store | 4 | 2 | US1, US2 |
| 5. Container | 4 | 0 | US1, US2, US3 |
| 6. Wrapper | 3 | 1 | US2, US3 |
| 7. Settings | 6 | 3 | US1, US2 |
| 8. Unit Tests | 7 | 7 | US1, US2 |
| 9. E2E Tests | 6 | 0 | US1, US2, US3 |
| 10. Verification | 8 | 3 | US3 |
| **Total** | **53** | **22** | - |

### Tasks by User Story

| User Story | Priority | Tasks |
|------------|----------|-------|
| US1: Dense Packing Toggle | P1 | T005-T014, T016, T018, T020-T021, T027-T028, T030, T032-T035, T038-T042, T044 |
| US2: Row Spans | P1 | T005-T011, T015, T017, T019, T022-T031, T036-T037, T39, T043 |
| US3: Auto Placement | P2 | T020, T026, T045, T052-T053 |
| US4: Preview | P3 | (Deferred - out of initial scope) |

### Critical Path

```
T002 → T005-T011 → T012-T013 → T014-T015 → T016-T019 → T020-T023 → T024-T026 → T027-T032 → T033-T039 → T040-T045 → T046-T053
```

**Estimated Implementation Time**: ~2.5 hours (per quickstart.md)

---

## Notes

- **US4 (Preview)** is P3 and deferred from initial implementation - can be added as enhancement
- All tasks follow existing patterns from feature 003 (dashboard-stacking-layout)
- CSS Grid `grid-auto-flow: dense` is the core implementation - zero new dependencies
- Migration from v2 to v3 preserves existing user settings with sensible defaults

---

## Completion Summary

**Completed**: 2026-01-25
**All 53 tasks completed successfully**

### Verification Results
- ✅ Type checking: passed
- ✅ Linting: passed
- ✅ Unit tests: 20 dashboard-specific tests passed
- ✅ E2E tests: 7/7 passed
- ✅ Production build: successful
