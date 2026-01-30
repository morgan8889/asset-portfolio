# Research: Comprehensive Allocation Planning

## Technical Context
**Feature**: 010-allocation-planning
**Goal**: Implement an allocation planning page with target models, drift analysis, and rebalancing recommendations.

## Decisions

### 1. Data Model for Targets
**Decision**: Store target models in `userSettings` table using a simple JSON structure.
**Rationale**:
- **Simplicity**: Target models are small configuration objects (name + map of percentages). No need for a complex relational table.
- **Portability**: JSON storage makes it easy to export/import models.
- **Validation**: Zod schema validation will ensure percentages sum to 100%.

### 2. Negative Cash Handling
**Decision**: Calculate "Net Cash" by subtracting negative balances (margin) from positive cash holdings.
**Rationale**:
- **Clarity**: Displaying "Net Cash" avoids confusing negative slices in donut charts.
- **Standard Practice**: Most portfolio tools net liabilities against cash to show true liquidity.
- **Visualization**: If Net Cash is negative, it will be shown as a distinct "Margin" bar in bar charts but excluded (or zeroed) in donut charts to maintain 100% total.

### 3. Unclassified Assets
**Decision**: Automatically group assets without a classification into an "Unclassified" category.
**Rationale**:
- **Visibility**: Users must see that these assets exist and affect the total.
- **Actionability**: Clicking this slice should link to the asset edit form.
- **Implementation**: Handled in the `metrics-service` aggregation logic.

### 4. Account Exclusion
**Decision**: Add an `excludeFromAnalysis` flag to the `Portfolio` entity (or Account entity if it existed). Since we only have `Portfolios` and `Holdings`, we will add a `tags` array or `metadata` field to Holdings to flag exclusion.
**Correction**: The plan calls for "Account-Level Toggle". Since the current schema tracks `Portfolios`, we will add a `rebalancingEnabled` boolean to the `Portfolio` settings (or similar config). Actually, looking at the schema, we have `Portfolio`. We can add a setting in `userSettings` that lists excluded Portfolio IDs.
**Refined Decision**: Store `excludedPortfolioIds` in `userSettings` (key: `rebalancing_exclusions`).

## Unknowns Resolved
- **Storage**: `userSettings` table in Dexie.
- **Calculations**: Client-side in `rebalancing-service.ts`.
- **Visualization**: Recharts for Donut/Bar charts.

## Technology Stack
- **State**: Zustand (`useAllocationStore`).
- **Logic**: `decimal.js` for precision rebalancing math.
- **UI**: Shadcn UI (Sliders for target setting, Table for rebalancing plan).
