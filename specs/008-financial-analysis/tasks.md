# Tasks: Financial Analysis & Recommendations

**Branch**: `008-financial-analysis`
**Spec**: `specs/008-financial-analysis/spec.md`
**Status**: Generated

## Implementation Strategy

We will implement this feature in phases, starting with the core data model extensions and backend services (health scoring, recommendations), and then building the UI for the Analysis page. The focus is on a privacy-first, local-only analysis engine.

## Dependencies

1.  **Phase 1 (Setup)**: Must complete first to extend the `Asset` model and set up database tables.
2.  **Phase 2 (Foundational)**: Implements the calculation logic. This blocks all user stories.
3.  **Phase 3, 4, 5**: Can technically be done in parallel once Phase 2 is complete, but sequential order is recommended for logical feature progression.

## Phase 1: Setup

*Goal: Extend the data model to support analysis features.*

- [X] T001 [Setup] Update `src/types/asset.ts` to include `region` (string) and `valuationMethod` ('LIVE' | 'MANUAL') in the `Asset` interface
- [X] T002 [Setup] Update `src/lib/db/schema.ts` to include new fields in `assets` table schema definition (version bump if needed)
- [X] T003 [Setup] Create `src/types/analysis.ts` with `HealthMetric`, `Recommendation`, `TargetModel`, `AnalysisProfile`, and `Region` enum (US, UK, EU, APAC, EMERGING, OTHER) interfaces
- [X] T004 [Setup] Update `src/lib/db/schema.ts` to include `userSettings` schema for storing analysis profiles and target models (if not already present)
- [X] T004a [P] [Setup] Create `src/lib/utils/region-inference.ts` to infer region from ticker suffix (.L→UK, .TO→CA, .DE→EU, etc.) with fallback to US

## Phase 2: Foundational

*Goal: Implement the core analysis logic engines (Scoring, Recommendations, Rebalancing).*

- [X] T005 [Foundation] Create `src/lib/services/analysis/scoring-service.ts` to implement `calculateHealthScore(portfolio, profile)` logic
- [X] T006 [Foundation] Create `src/lib/services/analysis/recommendation-engine.ts` to implement rule-based recommendation generation (e.g., cash drag, concentration)
- [X] T007 [Foundation] Create `src/lib/services/analysis/rebalancing-service.ts` to calculate target drift and rebalancing actions
- [X] T008 [Foundation] Create `src/lib/stores/analysis.ts` (Zustand) to manage analysis state and coordinate service calls
- [X] T009 [Foundation] Create unit tests for scoring service in `src/lib/services/analysis/__tests__/scoring-service.test.ts`
- [X] T009a [P] [Foundation] Create unit tests for recommendation engine in `src/lib/services/analysis/__tests__/recommendation-engine.test.ts`
- [X] T009b [P] [Foundation] Create unit tests for rebalancing service in `src/lib/services/analysis/__tests__/rebalancing-service.test.ts`
- [X] T009c [P] [Foundation] Seed predefined target models (60/40, 80/20 Growth, All Weather) in `src/lib/data/target-models.ts`

## Phase 3: User Story 1 - View Portfolio Health Score (P1)

*Goal: Display the overall health score and breakdown.*
*Test Criteria: Navigate to /analysis, see score (0-100) and component details.*

- [X] T010 [US1] Create `src/components/analysis/health-score-card.tsx` to visualize the overall score and radial progress
- [X] T011 [US1] Create `src/components/analysis/metric-breakdown.tsx` to display details for Diversification, Performance, and Volatility
- [X] T012 [US1] Create `src/components/analysis/profile-selector.tsx` to allow switching between "Growth", "Safety", "Balanced" profiles
- [X] T013 [US1] Create `src/app/(dashboard)/analysis/page.tsx` skeleton and integrate the health score components
- [X] T013a [US1] Add "Analysis" link to sidebar navigation in `src/components/layout/sidebar.tsx`

## Phase 4: User Story 2 - Receive Actionable Recommendations (P2)

*Goal: Display generated recommendations to the user.*
*Test Criteria: Conditions like high cash trigger visible alerts.*

- [X] T014 [US2] Create `src/components/analysis/recommendation-card.tsx` to display individual recommendation details and severity
- [X] T015 [US2] Create `src/components/analysis/recommendation-list.tsx` to render the list of active recommendations
- [X] T016 [US2] Integrate `RecommendationList` into `src/app/(dashboard)/analysis/page.tsx`

## Phase 5: User Story 3 - Analyze Asset Allocation vs Targets (P3)

*Goal: Allocation comparison and rebalancing tools.*
*Test Criteria: Select a target model, see drift and buy/sell instructions.*

- [X] T017 [US3] Create `src/components/analysis/allocation-chart.tsx` (Recharts) to compare Current vs Target allocation
- [X] T018 [US3] Create `src/components/analysis/target-model-selector.tsx` to switch between models (60/40, All Weather, Custom)
- [X] T019 [US3] Create `src/components/analysis/rebalancing-table.tsx` to list specific Buy/Sell actions with currency amounts
- [X] T020 [US3] Integrate allocation tools into `src/app/(dashboard)/analysis/page.tsx`
- [X] T020a [US3] Implement target model clone/customize functionality in `src/lib/services/analysis/target-model-service.ts`

## Final Phase: Polish

- [X] T021 [Polish] Add "Manual Valuation" UI to `src/components/holdings/holding-row.tsx` (or equivalent) to support Property updates
- [X] T022 [Polish] Add "Region" override UI to Asset edit modal
- [X] T023 [Polish] Ensure all analysis calculations handle edge cases (empty portfolio, zero prices) gracefully
- [X] T024 [Polish] Create E2E test for analysis page workflow in `tests/e2e/analysis.spec.ts` (Constitution IV compliance)
- [X] T025 [Polish] Add transparency UI showing raw scoring formula and weights in `src/components/analysis/formula-display.tsx`
