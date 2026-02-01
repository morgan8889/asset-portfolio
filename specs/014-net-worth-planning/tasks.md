# Tasks: Net Worth History & FIRE Planning

**Branch**: `014-net-worth-planning`
**Spec**: `specs/014-net-worth-planning/spec.md`
**Status**: Generated

## Implementation Strategy

We will implement this feature in three phases. Phase 1 focuses on the core data structures and calculation services for liabilities and projections. Phase 2 builds the Planning page UI and its visualization components. Phase 3 integrates the feature into the main dashboard with a summary widget.

## Dependencies

1.  **Phase 1 (Setup)**: Must be completed first to establish database tables and types.
2.  **Phase 2 (Foundational)**: Core logic for aggregation and projection is required for the UI.
3.  **Phase 3-5**: UI components can be built in parallel, but integration depends on the services.

## Phase 1: Setup

*Goal: Establish data model and storage.*

- [ ] T001 [Setup] Create `src/types/planning.ts` with `Liability`, `FireConfig`, `ProjectionPoint`, and `Scenario` interfaces
- [ ] T002 [Setup] Update `src/lib/db/schema.ts` to include the `liabilities` table definition
- [ ] T003 [Setup] Create `src/lib/stores/planning.ts` (Zustand) to manage planning state (goals, scenarios, liabilities)

## Phase 2: Foundational

*Goal: Implement core calculation engines.*

- [ ] T004 [Foundation] Create `src/lib/services/planning/net-worth-service.ts` to aggregate asset snapshots and liability history into a monthly time-series
- [ ] T005 [Foundation] Create `src/lib/services/planning/fire-projection.ts` to implement the inflation-adjusted compound interest projection logic
- [ ] T006 [Foundation] Create unit tests for projection logic in `src/lib/services/planning/__tests__/fire-projection.test.ts`

## Phase 3: User Story 1 - Net Worth History (P1)

*Goal: Visualize historical progress.*
*Test Criteria: View chart, see assets minus liabilities over time.*

- [ ] T007 [US1] Create `src/components/planning/liability-manager.tsx` to add/edit manual liability entries
- [ ] T008 [US1] Create `src/components/planning/net-worth-chart.tsx` using Recharts to display the aggregated history
- [ ] T009 [US1] Create `src/app/(dashboard)/planning/page.tsx` skeleton and integrate the Net Worth section

## Phase 4: User Story 2 & 3 - FIRE Planning & Scenarios (P2/P3)

*Goal: Goal setting and "What-If" analysis.*
*Test Criteria: Set inputs, see projection curve update; toggle scenario, see shift.*

- [ ] T010 [US2] Create `src/components/planning/goal-input-form.tsx` for Expenses, SWR, and Savings Rate
- [ ] T011 [US2] Create `src/components/planning/fire-projection-chart.tsx` to visualize the path to FI (including "Crossover Point")
- [ ] T012 [US3] Create `src/components/planning/scenario-controls.tsx` to define and toggle scenarios (e.g., market crash)
- [ ] T013 [US2] Integrate planning tools into `src/app/(dashboard)/planning/page.tsx`

## Final Phase: Polish & Integration

- [ ] T014 [Polish] Create "Countdown to FIRE" widget for the main dashboard (`src/components/dashboard/widgets/fire-countdown-widget.tsx`)
- [ ] T015 [Polish] Ensure negative net worth is handled gracefully in charts (y-axis scaling)
