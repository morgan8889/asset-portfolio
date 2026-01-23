# Tasks: Configurable Portfolio Dashboard

**Feature**: 002-portfolio-dashboard
**Input**: Design documents from `/specs/002-portfolio-dashboard/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Unit tests for services, E2E tests for widget interactions (per constitution IV.Test-Driven Quality)

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1, US2, US3, US4, US5 (maps to spec.md priorities P1-P5)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create foundational types/services

- [ ] T001 Install dnd-kit dependencies: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- [ ] T002 [P] Create dashboard types in src/types/dashboard.ts (copy from contracts/dashboard-config.ts)
- [ ] T003 [P] Add dashboard types export to src/types/index.ts
- [ ] T004 Create dashboard config service in src/lib/services/dashboard-config.ts
- [ ] T005 Create dashboard Zustand store in src/lib/stores/dashboard.ts
- [ ] T006 Add dashboard store export to src/lib/stores/index.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core services and infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Implement performance calculator service in src/lib/services/performance-calculator.ts
- [ ] T008 Implement historical value service in src/lib/services/historical-value.ts
- [ ] T009 [P] Add dashboard config queries to src/lib/db/queries.ts (getDashboardConfig, saveDashboardConfig)
- [ ] T010 [P] Create widget-wrapper component in src/components/dashboard/widget-wrapper.tsx
- [ ] T011 [P] Create stale-data-banner component in src/components/dashboard/stale-data-banner.tsx

### Unit Tests (Foundational Services)

- [ ] T012 [P] Unit test for performance-calculator in src/lib/services/__tests__/performance-calculator.test.ts
- [ ] T013 [P] Unit test for historical-value in src/lib/services/__tests__/historical-value.test.ts

**Checkpoint**: Foundation ready - dashboard config, performance calculations, and historical value reconstruction available

---

## Phase 3: User Story 1 - View Portfolio Summary at a Glance (Priority: P1) 🎯 MVP

**Goal**: Display total portfolio value, gain/loss, and category breakdown immediately on dashboard load

**Independent Test**: Create portfolio with multiple asset types, verify dashboard shows accurate totals and category percentages

### Implementation for User Story 1

- [ ] T014 [P] [US1] Create total-value-widget in src/components/dashboard/widgets/total-value-widget.tsx
- [ ] T015 [P] [US1] Create gain-loss-widget in src/components/dashboard/widgets/gain-loss-widget.tsx
- [ ] T016 [P] [US1] Create day-change-widget in src/components/dashboard/widgets/day-change-widget.tsx
- [ ] T017 [P] [US1] Create category-breakdown-widget in src/components/dashboard/widgets/category-breakdown-widget.tsx
- [ ] T018 [US1] Create dashboard-container component in src/components/dashboard/dashboard-container.tsx (integrates widgets)
- [ ] T019 [US1] Update main dashboard page to use DashboardContainer in src/app/(dashboard)/page.tsx
- [ ] T020 [US1] Add empty state display when portfolio has no holdings in dashboard-container.tsx
- [ ] T021 [US1] Add loading states to all US1 widgets

### E2E Test for User Story 1

- [ ] T022 [US1] E2E test for dashboard display in tests/e2e/dashboard-display.spec.ts

**Checkpoint**: US1 complete - users see total value, gain/loss, and category breakdown on dashboard

---

## Phase 4: User Story 2 - View Portfolio Growth Over Time (Priority: P2)

**Goal**: Interactive chart showing portfolio value history with selectable time ranges

**Independent Test**: Create portfolio with transactions at different dates, verify chart reflects value changes per time period

### Implementation for User Story 2

- [ ] T023 [P] [US2] Create growth-chart-widget in src/components/dashboard/widgets/growth-chart-widget.tsx
- [ ] T024 [US2] Refactor portfolio-chart.tsx to accept real data props in src/components/charts/portfolio-chart.tsx
- [ ] T025 [US2] Connect growth-chart-widget to historical-value service for real data
- [ ] T026 [US2] Add time range selector (1W, 1M, 3M, 6M, 1Y, All) to growth-chart-widget
- [ ] T027 [US2] Add hover tooltip showing date and value to chart
- [ ] T028 [US2] Handle edge case: limited history with appropriate messaging
- [ ] T029 [US2] Add loading state to growth-chart-widget

### E2E Test for User Story 2

- [ ] T030 [US2] E2E test for chart time range in tests/e2e/dashboard-chart.spec.ts

**Checkpoint**: US2 complete - users see interactive historical chart with time range selection

---

## Phase 5: User Story 3 - Customize Dashboard Layout and Widgets (Priority: P3)

**Goal**: Allow users to show/hide widgets, reorder via drag-drop, with persistent configuration

**Independent Test**: Toggle widgets, reorder them, refresh page, verify layout persists

### Implementation for User Story 3

- [ ] T031 [P] [US3] Create dashboard-settings modal in src/components/dashboard/dashboard-settings.tsx
- [ ] T032 [US3] Integrate dnd-kit sortable into dashboard-container.tsx for drag-drop reordering
- [ ] T033 [US3] Add widget visibility toggles to dashboard-settings.tsx
- [ ] T034 [US3] Add widget order controls (up/down buttons) for mobile in dashboard-settings.tsx
- [ ] T035 [US3] Implement "Reset to Default Layout" button in dashboard-settings.tsx
- [ ] T036 [US3] Connect dashboard-settings to dashboard store for persistence
- [ ] T037 [US3] Add settings gear button to dashboard header for opening settings modal
- [ ] T038 [US3] Implement responsive behavior: drag-drop on desktop, settings modal on mobile

### E2E Test for User Story 3

- [ ] T039 [US3] E2E test for widget configuration in tests/e2e/dashboard-configuration.spec.ts

**Checkpoint**: US3 complete - users can customize and persist their dashboard layout

---

## Phase 6: User Story 4 - View Top Performers and Losers (Priority: P4)

**Goal**: Display ranked lists of best and worst performing holdings

**Independent Test**: Create holdings with various gain/loss percentages, verify correct ranking

### Implementation for User Story 4

- [ ] T040 [P] [US4] Create top-performers-widget in src/components/dashboard/widgets/top-performers-widget.tsx
- [ ] T041 [P] [US4] Create biggest-losers-widget in src/components/dashboard/widgets/biggest-losers-widget.tsx
- [ ] T042 [US4] Connect widgets to performance-calculator service
- [ ] T043 [US4] Add navigation to holding detail on performer click
- [ ] T044 [US4] Handle empty states (no gains, no losses)
- [ ] T045 [US4] Add loading states to performer widgets

### E2E Test for User Story 4

- [ ] T046 [US4] E2E test for performers display in tests/e2e/dashboard-performers.spec.ts

**Checkpoint**: US4 complete - users see top 5 performers and losers ranked by percentage

---

## Phase 7: User Story 5 - Configure Time Period for Gain/Loss Calculations (Priority: P5)

**Goal**: Allow users to select calculation period (Today, Week, Month, Year, All Time) affecting all metrics

**Independent Test**: Select different periods, verify gain/loss values update correctly

### Implementation for User Story 5

- [ ] T047 [P] [US5] Add time period selector component in src/components/dashboard/time-period-selector.tsx
- [ ] T048 [US5] Integrate time period selector into dashboard header
- [ ] T049 [US5] Update gain-loss-widget to use selected time period
- [ ] T050 [US5] Update top-performers-widget to use selected time period
- [ ] T051 [US5] Update biggest-losers-widget to use selected time period
- [ ] T052 [US5] Persist time period preference in dashboard config
- [ ] T053 [US5] Add period label to widgets showing calculation context

### E2E Test for User Story 5

- [ ] T054 [US5] E2E test for time period selection in tests/e2e/dashboard-time-period.spec.ts

**Checkpoint**: US5 complete - users can configure time window for all performance metrics

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T055 [P] Implement stale data indicators on all price-dependent widgets
- [ ] T056 [P] Add React.memo to all widget components for performance
- [ ] T057 [P] Ensure all financial calculations use decimal.js (audit)
- [ ] T058 Add keyboard navigation support for widget reordering (accessibility)
- [ ] T059 Add ARIA labels and screen reader support to all widgets
- [ ] T060 Responsive layout testing and fixes (320px - 2560px per SC-006)
- [ ] T061 Performance optimization: verify dashboard load < 2s (SC-001)
- [ ] T062 Performance optimization: verify chart range change < 1s (SC-004)
- [ ] T063 Run quickstart.md validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

```text
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
┌───────────────────────────────────────────────────────┐
│  User Stories can proceed in priority order:          │
│  Phase 3 (US1-MVP) → Phase 4 (US2) → Phase 5 (US3)   │
│                   → Phase 6 (US4) → Phase 7 (US5)    │
└───────────────────────────────────────────────────────┘
    ↓
Phase 8 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Start After |
|-------|-----------|-----------------|
| US1 (P1) | Foundational only | Phase 2 complete |
| US2 (P2) | Foundational + US1 containers | T019 complete |
| US3 (P3) | US1 widgets exist | T018 complete |
| US4 (P4) | Foundational only | Phase 2 complete |
| US5 (P5) | US1 + US4 widgets exist | T016, T040, T041 complete |

### Within Each User Story

1. Widget components (parallel where marked [P])
2. Container/integration work (sequential)
3. Edge cases and loading states
4. E2E test

---

## Parallel Opportunities

### Phase 1 Parallel Tasks
```bash
# Can run simultaneously:
T002 src/types/dashboard.ts
T003 src/types/index.ts
```

### Phase 2 Parallel Tasks
```bash
# Can run simultaneously:
T009 src/lib/db/queries.ts (dashboard config queries)
T010 src/components/dashboard/widget-wrapper.tsx
T011 src/components/dashboard/stale-data-banner.tsx
T012 tests: performance-calculator.test.ts
T013 tests: historical-value.test.ts
```

### User Story 1 Parallel Tasks
```bash
# Can run simultaneously:
T014 total-value-widget.tsx
T015 gain-loss-widget.tsx
T016 day-change-widget.tsx
T017 category-breakdown-widget.tsx
```

### User Story 4 Parallel Tasks
```bash
# Can run simultaneously:
T040 top-performers-widget.tsx
T041 biggest-losers-widget.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (~30 min)
2. Complete Phase 2: Foundational (~2 hours)
3. Complete Phase 3: User Story 1 (~3 hours)
4. **STOP and VALIDATE**: Test dashboard displays totals, gain/loss, categories
5. Deploy/demo if ready

### Incremental Delivery

| Increment | What's Delivered | Cumulative Value |
|-----------|-----------------|------------------|
| MVP (US1) | Portfolio summary view | Core value proposition |
| +US2 | Historical chart | Performance context |
| +US3 | Customizable layout | Personalization |
| +US4 | Top/bottom performers | Actionable insights |
| +US5 | Time period control | Flexible analysis |

### Suggested Order for Solo Developer

```text
Phase 1 → Phase 2 → US1 (MVP) → US4 → US2 → US5 → US3 → Phase 8
```

Rationale: US4 (performers) is simple and adds value quickly after MVP. US3 (configuration) is complex and can wait.

---

## Summary

| Category | Count |
|----------|-------|
| Total Tasks | 63 |
| Setup Phase | 6 |
| Foundational Phase | 7 |
| User Story 1 (P1) | 9 |
| User Story 2 (P2) | 8 |
| User Story 3 (P3) | 9 |
| User Story 4 (P4) | 7 |
| User Story 5 (P5) | 8 |
| Polish Phase | 9 |
| Parallelizable Tasks | 23 |

---

## Notes

- [P] = parallelizable (different files, no dependencies)
- Constitution compliance: All widgets use shadcn/ui, calculations use decimal.js, data stored in IndexedDB
- Performance targets: Dashboard < 2s load, chart range change < 1s
- Accessibility: WCAG 2.1 via dnd-kit keyboard navigation
- Mobile: Settings modal with up/down controls for widget reordering
