# Tasks: Holdings Page with Property Support

**Branch**: `009-holdings-property`
**Spec**: `specs/009-holdings-property/spec.md`
**Status**: Generated

## Implementation Strategy

We will implement this feature in sequential phases. First, we'll establish the necessary data structures and database schema updates. Then, we'll build the property service logic. Finally, we'll implement the UI components for the unified list, specialized forms, and manual update workflows.

## Dependencies

1.  **Phase 1 (Setup)**: Must be completed first to ensure the database can store the new asset and holding fields.
2.  **Phase 2 (Foundational)**: Service layer logic is required before UI components can function.
3.  **Phase 3-5**: UI implementation phases can overlap slightly but generally follow the order of List -> Add Form -> Update Form.

## Phase 1: Setup

*Goal: Extend data types and database schema.*

- [ ] T001 [Setup] Update `src/types/asset.ts` to include `RentalInfo` interface and add `rentalInfo` to `Asset`.
- [ ] T002 [Setup] Update `src/types/asset.ts` to add `ownershipPercentage` to `Holding` interface.
- [ ] T003 [Setup] Update `src/types/asset.ts` to add `'real_estate'` and `'other'` to `AssetType` enum/union if not present.
- [ ] T004 [Setup] Update `src/lib/db/schema.ts` to ensure Dexie stores preserve new fields (hooks/transforms).

## Phase 2: Foundational

*Goal: Core business logic for property management.*

- [ ] T005 [Foundation] Create `src/lib/services/property-service.ts` with `calculateNetValue` and `calculateYield` helper functions.
- [ ] T006 [Foundation] Implement `addPropertyAsset` in `src/lib/services/property-service.ts` handling asset creation and initial buy transaction.
- [ ] T007 [Foundation] Implement `updateManualPrice` in `src/lib/services/property-service.ts` to update `Asset.currentPrice` and log `PriceHistory`.
- [ ] T008 [Foundation] Update `src/lib/services/holdings-service.ts` or `holdings-calculator.ts` to factor in `ownershipPercentage` for total portfolio value calculations.

## Phase 3: User Story 1 - View and Filter Holdings List (P1)

*Goal: Unified list view for all asset types.*
*Test Criteria: Add various assets, verify all appear in one list, verify filtering by type.*

- [ ] T009 [US1] Update `src/components/tables/holdings-table.tsx` to display "Net Value" (taking ownership % into account).
- [ ] T010 [US1] Update `src/components/tables/holdings-table.tsx` column definitions to handle non-ticker assets (e.g., hide "Symbol" or show "N/A" for manual assets).
- [ ] T011 [US1] Update filtering logic in `src/components/tables/holdings-table.tsx` to include new types (Real Estate, Other).

## Phase 4: User Story 2 & 3 - Add Real Estate & Rental Property (P2/P3)

*Goal: Specialized forms for property entry.*
*Test Criteria: Open "Add Holding", select "Real Estate", enter details including rent, save, verify data.*

- [ ] T012 [US2] Create `src/components/holdings/add-property-dialog.tsx` with fields for Name, Value, Purchase Price, Date, and Ownership %.
- [ ] T013 [US3] Add "Rental Property" toggle to `src/components/holdings/add-property-dialog.tsx` revealing "Monthly Rent" field.
- [ ] T014 [US2] Create `src/components/holdings/add-manual-asset-dialog.tsx` as a generic form for "Other" asset types.
- [ ] T015 [US2] Integrate new dialogs into `src/app/(dashboard)/holdings/page.tsx` via a "Add Asset" dropdown menu.

## Phase 5: Manual Valuation Updates (P2)

*Goal: Workflow for updating manual asset values.*
*Test Criteria: Click "Update Value" on a property, enter new price, verify portfolio total updates.*

- [ ] T016 [US2] Create `src/components/holdings/manual-price-update-dialog.tsx` for entering a new estimated value and date.
- [ ] T017 [US2] Add "Update Value" action button to the row actions in `src/components/tables/holdings-table.tsx` (visible only for `valuationMethod === 'MANUAL'`).
- [ ] T018 [US2] Connect "Update Value" action to trigger the update service and refresh the list.

## Final Phase: Polish

- [ ] T019 [Polish] Add visual badges for "Rental" and "Manual Valuation" in the holdings list.
- [ ] T020 [Polish] Ensure yield % is displayed for rental properties in the list or detail view.
