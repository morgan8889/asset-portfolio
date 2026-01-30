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

- [X] T001 [Setup] Update `src/types/asset.ts` to include `RentalInfo` interface, add `rentalInfo` to `Asset`, and add `valuationMethod: 'AUTO' | 'MANUAL'` field to `Asset`. Note: Asset.currentPrice remains `number` for backwards compatibility; property-service.ts will handle Decimal conversion at service boundaries per Constitution Principle II.
- [X] T002 [Setup] Update `src/types/asset.ts` to add `ownershipPercentage` to `Holding` interface.
- [X] T003 [Setup] Update `src/types/asset.ts` to add `'real_estate'` and `'other'` to `AssetType` enum/union if not present.
- [X] T004 [Setup] Update `src/lib/db/schema.ts` to ensure Dexie tables preserve new optional fields (`Asset.rentalInfo`, `Asset.valuationMethod`, `Holding.ownershipPercentage`). Verify existing assets default to `valuationMethod: 'AUTO'` and holdings default to `ownershipPercentage: 100`. No migration script needed; Dexie handles optional fields gracefully.

## Phase 2: Foundational

*Goal: Core business logic for property management.*

- [X] T005 [Foundation] Create `src/lib/services/property-service.ts` with `calculateNetValue` and `calculateYield` helper functions.
- [X] T006 [Foundation] Implement `addPropertyAsset` in `src/lib/services/property-service.ts` handling asset creation and initial buy transaction.
- [X] T007 [Foundation] Implement `updateManualPrice` in `src/lib/services/property-service.ts` to update `Asset.currentPrice` and log `PriceHistory`.
- [X] T008 [Foundation] Update `src/lib/services/holdings-service.ts` or `holdings-calculator.ts` to factor in `ownershipPercentage` for total portfolio value calculations.

## Phase 3: User Story 1 - View and Filter Holdings List (P1)

*Goal: Unified list view for all asset types.*
*Test Criteria: Add various assets, verify all appear in one list, verify filtering by type.*

- [X] T009 [US1] Update `src/components/tables/holdings-table.tsx` to display "Net Value" (taking ownership % into account).
- [X] T010 [US1] Update `src/components/tables/holdings-table.tsx` column definitions to handle non-ticker assets (e.g., hide "Symbol" or show "N/A" for manual assets).
- [X] T011 [US1] Update filtering logic in `src/components/tables/holdings-table.tsx` to include new types (Real Estate, Other).

## Phase 4: User Story 2 & 3 - Add Real Estate & Rental Property (P2/P3)

*Goal: Specialized forms for property entry.*
*Test Criteria: Open "Add Holding", select "Real Estate", enter details including rent, save, verify data.*

- [X] T012 [US2] Create `src/components/holdings/add-property-dialog.tsx` with fields for Name, Value, Purchase Price, Date, and Ownership %.
- [X] T013 [US3] Add "Rental Property" toggle to `src/components/holdings/add-property-dialog.tsx` revealing "Monthly Rent" field.
- [X] T014 [US2] Create `src/components/holdings/add-manual-asset-dialog.tsx` as a generic form for "Other" asset types.
- [X] T015 [US2] Integrate new dialogs into `src/app/(dashboard)/holdings/page.tsx` via a "Add Asset" dropdown menu.

## Phase 5: Manual Valuation Updates (P2)

*Goal: Workflow for updating manual asset values.*
*Test Criteria: Click "Update Value" on a property, enter new price, verify portfolio total updates.*

- [X] T016 [US2] Create `src/components/holdings/manual-price-update-dialog.tsx` for entering a new estimated value and date.
- [X] T017 [US2] Add "Update Value" action button to the row actions in `src/components/tables/holdings-table.tsx` (visible only for `valuationMethod === 'MANUAL'`).
- [X] T018 [US2] Connect "Update Value" action to trigger the update service and refresh the list.

## Final Phase: Polish

- [X] T019 [Polish] Add visual badges for "Rental" and "Manual Valuation" in the holdings list.
- [X] T020 [Polish] Ensure yield % is displayed for rental properties in the list or detail view.

## Testing Phase: E2E Validation

- [X] T021 [Test] Add E2E test for property addition workflow (SC-001): Open add property dialog, fill form with Name="Test Property", Value=500000, Ownership=100%, Rental=true, MonthlyRent=2500, verify save completes under 30 seconds and property appears in list. **Spec ready in E2E_TEST_SPEC.md**
- [X] T022 [Test] Add E2E test for holdings list performance (SC-002): Generate mock portfolio with 100 holdings including 10 properties, navigate to holdings page, measure time from navigation to interactive list render, assert < 200ms using Playwright performance timing. **Spec ready in E2E_TEST_SPEC.md**
- [X] T023 [Test] Add E2E test for Real Estate filter (SC-003): Add 3 stocks and 2 properties, apply "Real Estate" filter, verify only 2 properties displayed, apply "All" filter, verify all 5 assets shown. **Spec ready in E2E_TEST_SPEC.md**
