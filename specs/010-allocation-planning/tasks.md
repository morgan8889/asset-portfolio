# Tasks: Comprehensive Allocation Planning

**Branch**: `010-allocation-planning`
**Spec**: `specs/010-allocation-planning/spec.md`
**Status**: Generated

## Implementation Strategy

We will implement this feature in three main phases. Phase 1 focuses on building the data structures and service layer for allocation calculations and target persistence. Phase 2 builds the core UI components for visualization and target editing. Phase 3 integrates everything into the main Allocation page and adds the rebalancing logic.

## Dependencies

1.  **Phase 1 (Setup)**: Must be completed first to establish the database schema and core types.
2.  **Phase 2 (Foundational)**: Service logic blocks the UI implementation.
3.  **Phase 3-5**: UI components can be built in parallel once services are ready.

## Phase 1: Setup

*Goal: Define types and extend database.*

- [ ] T001 [Setup] Create `src/types/allocation.ts` with `TargetModel`, `RebalancingItem`, and `AllocationCategory` interfaces
- [ ] T002 [Setup] Update `src/lib/db/schema.ts` to include keys/stores for `allocation_targets` and `rebalancing_exclusions` in `userSettings` (if not using generic key-value store)
- [ ] T003 [Setup] Create `src/lib/services/allocation/target-service.ts` for CRUD operations on TargetModels

## Phase 2: Foundational

*Goal: Core logic for allocation and rebalancing.*

- [ ] T004 [Foundation] Implement `calculateCurrentAllocation` in `src/lib/services/allocation/rebalancing-service.ts` handling margin (negative cash) netting
- [ ] T005 [Foundation] Implement `calculateRebalancingPlan` in `src/lib/services/allocation/rebalancing-service.ts` handling exclusions and drift calculation
- [ ] T006 [Foundation] Create `src/lib/stores/allocation.ts` (Zustand) to manage active target model, exclusions state, and calculated plan

## Phase 3: User Story 1 - View Current Allocation (P1)

*Goal: Visualize portfolio breakdown.*
*Test Criteria: Navigate to Allocation page, see accurate Donut chart.*

- [ ] T007 [US1] Create `src/components/allocation/allocation-chart-tabs.tsx` to switch between Asset Class, Sector, and Region views
- [ ] T008 [US1] Integrate `AllocationDonut` (reused/refactored) to handle the "Unclassified" visual slice logic
- [ ] T009 [US1] Update `src/app/(dashboard)/allocation/page.tsx` to display the current allocation charts

## Phase 4: User Story 2 - Define Target Model (P2)

*Goal: Allow users to set their goals.*
*Test Criteria: Create new target, adjust sliders to 100%, save.*

- [ ] T010 [US2] Create `src/components/allocation/target-model-editor.tsx` with sliders for each asset class
- [ ] T011 [US2] Implement validation logic in `target-model-editor.tsx` to ensure 100% total before saving
- [ ] T012 [US2] Add "Manage Targets" modal/dropdown to `src/app/(dashboard)/allocation/page.tsx`

## Phase 5: User Story 3 - Analyze Drift and Rebalance (P3)

*Goal: Actionable buy/sell advice.*
*Test Criteria: Select target, see drift table with specific actions.*

- [ ] T013 [US3] Create `src/components/allocation/rebalancing-table.tsx` to display Drift% and Buy/Sell amounts
- [ ] T014 [US3] Create `src/components/allocation/exclusion-toggle.tsx` to manage account-level exclusions
- [ ] T015 [US3] Integrate rebalancing table and controls into `src/app/(dashboard)/allocation/page.tsx`

## Final Phase: Polish

- [ ] T016 [Polish] Add visual alert for "Unclassified" assets in the allocation dashboard
- [ ] T017 [Polish] Ensure negative cash/margin is visualized correctly (netted or distinct bar) per clarifications
