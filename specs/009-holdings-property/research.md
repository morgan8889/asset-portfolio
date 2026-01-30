# Research: Holdings Page with Property Support

## Technical Context
**Feature**: 009-holdings-property
**Goal**: Implement comprehensive holdings management including property and rental income tracking.

## Decisions

### 1. Data Model Extension for Property
**Decision**: Extend `Asset` with `rentalInfo` and `Holding` with `ownershipPercentage`.
**Rationale**:
- **Rental Info**: Stores static property data (isRental, monthlyRent) directly on the Asset, as these are intrinsic properties of the asset itself.
- **Ownership Percentage**: Stores the user's stake (0-100%) on the Holding record. This allows correct Net Value calculation (Market Value * Percentage) while preserving the property's total market value for reference.
**Alternatives Considered**:
- **Separate Property Table**: Rejected to maintain a unified `Asset` table for simpler queries and "All Holdings" views.
- **Quantity as Percentage**: Rejected because it's confusing UI/UX. Explicit field is cleaner.

### 2. Manual Valuation Workflow
**Decision**: Leverage existing `valuationMethod` field (from Feat 008) to trigger a manual price update UI.
**Rationale**:
- **Consistency**: Reuses the mechanism established in Feature 008.
- **Implementation**: When `valuationMethod === 'MANUAL'`, the "Update Value" button appears. This updates `Asset.currentPrice` directly instead of waiting for an API poll.
- **History**: Manual updates should still create a `PriceHistory` record to track value over time.

### 3. Holdings List Architecture
**Decision**: Refactor `HoldingsTable` to use a polymorphic row component or conditional rendering based on asset type.
**Rationale**:
- **Property Rows**: Need to show "Net Value" (derived from ownership %) and potentially "Yield" instead of just "Quantity" and "Price".
- **Filtering**: Client-side filtering is sufficient for typical portfolio sizes (< 500 items).

### 4. Yield Calculation
**Decision**: Calculate Yield on-the-fly in the UI/Service layer.
**Rationale**:
- **Formula**: `(Monthly Rent * 12) / Current Total Property Value`.
- **Storage**: No need to persist "Yield" as it's a derived metric from `rentalInfo.monthlyRent` and `currentPrice`.

## Unknowns Resolved
- **Fractional Ownership**: Handled via `ownershipPercentage` on Holding.
- **Manual Updates**: Updates write to `Asset.currentPrice` and `PriceHistory`.
- **Filtering**: Built-in support for `AssetType` filtering in the table.

## Technology Stack
- **Database**: Dexie.js (Schema updates for Asset/Holding)
- **UI**: Shadcn UI (Table, Dialog, Form)
- **State**: Zustand (Portfolio Store updates)
- **Validation**: Zod (Property form validation)
