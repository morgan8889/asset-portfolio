# Feature Specification: Holdings Page with Property Support

**Feature Branch**: `009-holdings-property`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "Implement the holdings page. this should include the ability to add property and rental property."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View and Filter Holdings List (Priority: P1)

As an investor, I want to view a comprehensive list of all my assets, including stocks, cash, and property, so that I can see my entire portfolio in one place.

**Why this priority**: This is the core view for managing assets. Without a unified list, users cannot effectively track or manage their portfolio composition.

**Independent Test**: Can be fully tested by adding multiple asset types (Stock, Property, Cash) and verifying they all appear in the list, are sortable by value, and can be filtered by type.

**Acceptance Scenarios**:

1. **Given** I have a mix of assets, **When** I navigate to the Holdings page, **Then** I see a table listing all assets with columns for Name, Type, Quantity, Current Price, and Total Value.
2. **Given** the holdings list, **When** I click the "Filter by Type" dropdown and select "Real Estate", **Then** only property assets are displayed.
3. **Given** the holdings list, **When** I click the "Value" column header, **Then** the list sorts by total value descending/ascending.

---

### User Story 2 - Add Real Estate Property (Priority: P2)

As an investor, I want to add a residential or commercial property to my portfolio with a manual valuation, so that my net worth calculation includes my real estate assets.

**Why this priority**: Real estate is a major asset class for many investors. Supporting it differentiates this tool from stock-only trackers and fulfills the specific user request.

**Independent Test**: Can be tested by clicking "Add Holding", selecting "Real Estate", entering property details (Name, Purchase Price, Current Value), and verifying the asset is created with the correct manual valuation mode.

**Acceptance Scenarios**:

1. **Given** the Add Holding modal, **When** I select "Real Estate", **Then** the form adapts to show fields for "Property Name", "Address" (optional), "Purchase Price", and "Current Estimated Value".
2. **Given** I have added a property, **When** I view it in the list, **Then** it shows the "Manual Valuation" badge (or similar indicator) and the value I entered.
3. **Given** a property holding, **When** I click "Update Value", **Then** I can input a new estimated price which updates the portfolio total immediately.

---

### User Story 3 - Add Rental Property with Income Tracking (Priority: P3)

As a landlord, I want to designate a property as a "Rental" and track its monthly income potential, so that I can analyze the yield on my investment.

**Why this priority**: Extends the basic property support to cover the "rental property" specific request, adding value for real estate investors.

**Independent Test**: Can be tested by adding a property, toggling "Is Rental", entering monthly rent, and verifying the system stores this metadata and potentially displays annual yield.

**Acceptance Scenarios**:

1. **Given** the Add Property form, **When** I toggle "Rental Property", **Then** an additional field for "Monthly Rent" appears.
2. **Given** a rental property, **When** I view its details, **Then** I see the estimated annual yield (Annual Rent / Current Value).

### Edge Cases

- What happens if a property has an outstanding mortgage? (Currently out of scope for this specific "holdings" feature, assume tracking *gross* asset value for now, or use a "Notes" field).
- How are currencies handled for international properties? (Assume base currency of portfolio for MVP, or reuse existing multi-currency support if available).
- Can I add fractional ownership? (Yes, using the ownership percentage field).

## Clarifications

### Session 2026-01-27

- Q: How should fractional real estate ownership be handled? → A: Percentage Ownership Field - Add `ownershipPercentage` (0-100) to the Holding entity. Net Value = Current Value * (Percentage / 100).
- Q: How should different asset classes be displayed in the Holdings list? → A: Unified List - All asset types (Stock, Crypto, Property, Cash, Other) appear in one table with a "Type" column and filtering.
- Q: How should miscellaneous assets (Art, Collectibles) be handled? → A: Generic "Manual Asset" Form - Provide a flexible form for adding any asset type not covered by specific flows, allowing manual name, value, and type selection.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a virtualized list of all portfolio holdings (Unified List) using infinite scroll to support efficient rendering of up to 500+ items.
- **FR-002**: System MUST allow filtering holdings by Asset Type (Stock, ETF, Crypto, Real Estate, Cash, Other).
- **FR-003**: System MUST support adding a new holding manually without a ticker symbol (specifically for Real Estate and Other assets).
- **FR-004**: System MUST provide a specialized form for Real Estate entry including: Name, Current Value, Purchase Date, Purchase Price, and Ownership Percentage (0-100%).
- **FR-005**: System MUST provide a generic "Add Manual Asset" form for other asset types (Art, Collectibles, etc.) requiring Name, Value, and Type.
- **FR-006**: System MUST allow marking a Real Estate asset as "Rental" and capturing "Monthly Rent".
- **FR-007**: System MUST allow manual price updates for assets flagged as `valuationMethod: 'MANUAL'` (from Feature 008).
- **FR-008**: System MUST calculate and display "Gross Estimated Yield" for rental properties using the formula: `(Monthly Rent * 12) / Current Value`.
- **FR-009**: System MUST calculate the Net Value of property holdings by multiplying current market value by the ownership percentage.
- **FR-010**: System MUST persist all property and manual asset data locally in IndexedDB.

### Key Entities

- **Asset (Extended)**: Reuse extension from Feature 008 (`valuationMethod`, `region`) and add `rentalInfo` (optional object with `isRental`, `monthlyRent`).
- **Holding (Extended)**: Standard holding record linking Portfolio to Asset. Added `ownershipPercentage` field (default 100). For property, `quantity` is typically 1.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a new property asset in under 30 seconds.
- **SC-002**: Holdings list renders < 200ms for portfolios with up to 100 items.
- **SC-003**: "Real Estate" filter correctly hides all non-property assets.
- **SC-004**: Manual value update immediately reflects in the displayed Total Value of the holding.