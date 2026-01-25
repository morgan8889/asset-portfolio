# Tasks: Dashboard Stacking Layout

**Input**: Design documents from `/specs/003-dashboard-stacking-layout/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Not explicitly requested in spec - test tasks omitted per template guidelines.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root (Next.js 14 App Router)
- Paths follow existing project structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Extend existing types and configuration for layout feature

- [ ] T001 Add LayoutMode, GridColumns, WidgetSpan types to src/types/dashboard.ts
- [ ] T002 Add Zod schemas (LayoutModeSchema, GridColumnsSchema, WidgetSpanSchema) to src/types/dashboard.ts
- [ ] T003 Update DashboardConfiguration interface to version 2 with layoutMode, gridColumns, widgetSpans in src/types/dashboard.ts
- [ ] T004 Add DEFAULT_WIDGET_SPANS constant to src/types/dashboard.ts
- [ ] T005 [P] Add DashboardConfigurationSchemaV2 Zod schema to src/types/dashboard.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T006 Implement v1 to v2 migration function in src/lib/services/dashboard-config.ts
- [ ] T007 Update loadConfig() to handle migration from v1 to v2 in src/lib/services/dashboard-config.ts
- [ ] T008 [P] Add setLayoutMode() persistence method to src/lib/services/dashboard-config.ts
- [ ] T009 [P] Add setGridColumns() persistence method to src/lib/services/dashboard-config.ts
- [ ] T010 [P] Add setWidgetSpan() persistence method to src/lib/services/dashboard-config.ts
- [ ] T011 Add setLayoutMode store action with optimistic update to src/lib/stores/dashboard.ts
- [ ] T012 Add setGridColumns store action with optimistic update to src/lib/stores/dashboard.ts
- [ ] T013 Add setWidgetSpan store action with optimistic update to src/lib/stores/dashboard.ts

**Checkpoint**: Foundation ready - config persistence and store actions work, v1→v2 migration tested

---

## Phase 3: User Story 1 - Drag and Drop Widget Reordering (Priority: P1) 🎯 MVP

**Goal**: Users can drag and drop widgets to reorder them, with visual feedback and persistent positions

**Independent Test**: Create dashboard with 3+ widgets, drag any widget to new position, verify layout updates and persists after page refresh

**Note**: dnd-kit is already integrated. This phase enhances existing functionality with layout-aware behavior.

### Implementation for User Story 1

- [ ] T014 [US1] Verify existing dnd-kit drag-drop works with new config version in src/components/dashboard/dashboard-container.tsx
- [ ] T015 [US1] Ensure widget order persistence uses v2 config format in src/components/dashboard/dashboard-container.tsx
- [ ] T016 [US1] Add keyboard accessibility for widget reordering (arrow keys) in src/components/dashboard/dashboard-container.tsx
- [ ] T017 [US1] Handle edge case: invalid drop returns widget to original position in src/components/dashboard/dashboard-container.tsx
- [ ] T018 [US1] Handle edge case: single widget on dashboard in src/components/dashboard/dashboard-container.tsx

**Checkpoint**: Drag-drop reordering works, persists on refresh, keyboard accessible

---

## Phase 4: User Story 2 - Switch Between Grid and Stacking Layouts (Priority: P2)

**Goal**: Users can switch between multi-column grid and single-column stacking layouts

**Independent Test**: Toggle between grid and stacking modes, verify widgets rearrange accordingly while preserving relative order

### Implementation for User Story 2

- [ ] T019 [P] [US2] Create LayoutModeSelector component in src/components/dashboard/layout-mode-selector.tsx
- [ ] T020 [US2] Add gridClasses mapping constant (2/3/4 cols) to src/components/dashboard/dashboard-container.tsx
- [ ] T021 [US2] Compute effectiveLayoutMode based on isMobile and config.layoutMode in src/components/dashboard/dashboard-container.tsx
- [ ] T022 [US2] Apply dynamic grid class based on effectiveLayoutMode in src/components/dashboard/dashboard-container.tsx
- [ ] T023 [US2] Add layout mode toggle to settings UI in src/components/dashboard/dashboard-settings.tsx
- [ ] T024 [US2] Ensure widget order is maintained when switching layout modes in src/components/dashboard/dashboard-container.tsx

**Checkpoint**: Grid/stacking toggle works, layout changes apply immediately, order preserved across mode switches

---

## Phase 5: User Story 3 - Configure Column Count for Grid Layout (Priority: P3)

**Goal**: Users can configure grid to use 2, 3, or 4 columns

**Independent Test**: Change column count and verify widgets redistribute appropriately across selected number of columns

### Implementation for User Story 3

- [ ] T025 [US3] Add column count selector to settings UI (only visible in grid mode) in src/components/dashboard/dashboard-settings.tsx
- [ ] T026 [US3] Apply gridColumns from config to grid class selection in src/components/dashboard/dashboard-container.tsx
- [ ] T027 [US3] Add transition animation for layout changes in src/components/dashboard/dashboard-container.tsx

**Checkpoint**: Column count selector works, widgets redistribute correctly, settings persist

---

## Phase 6: User Story 4 - Responsive Layout Adaptation (Priority: P4)

**Goal**: Dashboard automatically adapts layout based on screen width with defined breakpoints

**Independent Test**: Resize browser from wide (desktop) to narrow (mobile), verify layout adapts at breakpoints

### Implementation for User Story 4

- [ ] T028 [US4] Force stacking layout when isMobile is true (< 768px) in src/components/dashboard/dashboard-container.tsx
- [ ] T029 [US4] Implement tablet breakpoint (768px-1024px) max 2 columns in src/components/dashboard/dashboard-container.tsx
- [ ] T030 [US4] Verify widget order is maintained across all breakpoints in src/components/dashboard/dashboard-container.tsx
- [ ] T031 [US4] Restore saved grid preference when viewport expands past mobile breakpoint in src/components/dashboard/dashboard-container.tsx

**Checkpoint**: Responsive breakpoints work correctly, layout adapts smoothly at 768px and 1024px thresholds

---

## Phase 7: User Story 5 - Widget Size Configuration (Priority: P5)

**Goal**: Users can configure widgets to span 1 or 2 columns in grid layout

**Independent Test**: Set widget to span 2 columns, verify it occupies double horizontal space in 3+ column grid

### Implementation for User Story 5

- [ ] T032 [US5] Update WidgetWrapper to accept span prop in src/components/dashboard/widget-wrapper.tsx
- [ ] T033 [US5] Read widget span from config.widgetSpans[id] (NOT from WIDGET_DEFINITIONS) in src/components/dashboard/widget-wrapper.tsx
- [ ] T034 [US5] Apply md:col-span-2 class when span is 2 in src/components/dashboard/widget-wrapper.tsx
- [ ] T035 [US5] Pass span prop from config to each WidgetWrapper in src/components/dashboard/dashboard-container.tsx
- [ ] T036 [US5] Add widget span controls to dashboard settings UI in src/components/dashboard/dashboard-settings.tsx
- [ ] T037 [US5] Handle edge case: 2-column span clamps to available columns on narrow screens in src/components/dashboard/widget-wrapper.tsx

**Checkpoint**: Widget spans configurable, display correctly in grid, persist across sessions

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T038 Add resetLayoutToDefault action to restore defaults in src/lib/stores/dashboard.ts
- [ ] T039 Add "Reset to Default Layout" button to settings UI in src/components/dashboard/dashboard-settings.tsx
- [ ] T040 Handle corrupted config gracefully with fallback to defaults in src/lib/services/dashboard-config.ts
- [ ] T041 [P] Verify all hooks are before early returns (per lessons learned) in src/components/dashboard/dashboard-container.tsx
- [ ] T042 [P] Verify optimistic updates have proper rollback on error in src/lib/stores/dashboard.ts
- [ ] T043 Run quickstart.md manual testing checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories have logical priority order but can proceed in parallel if needed
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Extends existing dnd-kit integration
- **User Story 2 (P2)**: Can start after Foundational - Adds layout mode switching
- **User Story 3 (P3)**: Depends on US2 (grid mode must exist to configure columns)
- **User Story 4 (P4)**: Depends on US2/US3 (responsive adapts the grid/stacking modes)
- **User Story 5 (P5)**: Depends on US2/US3 (widget spans only matter in grid mode)

### Within Each User Story

- Store actions before UI components that use them
- Container updates before settings UI
- Core implementation before edge case handling

### Parallel Opportunities

**Phase 1 (Setup)**:
```
T001, T002, T003, T004 must be sequential (same file)
T005 can run after T002 (needs GridColumnsSchema first)
```

**Phase 2 (Foundational)**:
```
# Sequential first:
T006 → T007 (migration before loading)

# Then parallel service methods:
T008, T009, T010 can run in parallel

# Then store actions (after service methods):
T011, T012, T013 can run after corresponding T008, T009, T010
```

**User Stories**:
```
# US2 has parallel opportunity:
T019 (LayoutModeSelector) can run in parallel with T020-T022

# US5 has parallel opportunity:
T032-T034 (WidgetWrapper) can run in parallel with T036 (settings UI)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (types and schemas)
2. Complete Phase 2: Foundational (migration, persistence, store actions)
3. Complete Phase 3: User Story 1 (verify drag-drop with v2 config)
4. **STOP and VALIDATE**: Test drag-drop independently, verify persistence
5. Deploy/demo if ready - users can reorder widgets with persistence

### Incremental Delivery

1. **Setup + Foundational** → Config infrastructure ready
2. **Add US1** → Drag-drop works with v2 config → Deploy (MVP!)
3. **Add US2** → Grid/stacking toggle → Deploy
4. **Add US3** → Column configuration → Deploy
5. **Add US4** → Responsive breakpoints → Deploy
6. **Add US5** → Widget span sizing → Deploy
7. **Add Polish** → Reset, edge cases, validation → Final Release

### Recommended Execution Order

For single developer:
```
Phase 1 → Phase 2 → US1 → US2 → US3 → US4 → US5 → Phase 8
```

For parallel work:
```
Phase 1 → Phase 2 (foundation complete)
Then: US1 + US2 can overlap (different concerns)
Then: US3 (needs US2)
Then: US4 + US5 can overlap (different concerns)
Finally: Phase 8
```

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- **Critical Warning**: All new hooks MUST be placed before `if (configLoading...)` return (see quickstart.md)
- **Critical Warning**: Read widget spans from `config.widgetSpans[id]`, NOT from `WIDGET_DEFINITIONS[id].colSpan`
- Follow existing optimisticUpdate pattern for new store actions
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
