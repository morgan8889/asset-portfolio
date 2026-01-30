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

### 4. Portfolio Exclusion
**Decision**: Store excluded portfolio IDs in `userSettings` table under key `rebalancing_exclusions`.
**Rationale**:
- **Simplicity**: Portfolio exclusions are a user preference, not inherent to the Portfolio entity itself.
- **Flexibility**: Users can easily toggle exclusions without modifying core portfolio data.
- **Consistency**: Matches the pattern used for storing target models in `allocation_targets` key.
**Implementation**: A JSON array of portfolio IDs stored at `userSettings['rebalancing_exclusions']`.

## Unknowns Resolved
- **Storage**: `userSettings` table in Dexie.
- **Calculations**: Client-side in `rebalancing-service.ts`.
- **Visualization**: Recharts for Donut/Bar charts.

## Technology Stack
- **State**: Zustand (`useAllocationStore`).
- **Logic**: `decimal.js` for precision rebalancing math.
- **UI**: Shadcn UI (Sliders for target setting, Table for rebalancing plan).
