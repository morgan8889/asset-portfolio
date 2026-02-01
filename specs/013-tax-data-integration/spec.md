# Feature Specification: Tax Data Integration (Import/Export & App-wide)

**Feature Branch**: `013-tax-data-integration`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "include updates to the import and export to include data for this feature. Also any other parts of the application that could utilize this data"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import ESPP/RSU Data via CSV (Priority: P1)

As an employee with stock compensation, I want to import my ESPP and RSU transactions using a CSV file, so that I don't have to manually enter complex tax metadata for every vest or purchase.

**Why this priority**: Batch processing is the only scalable way for users with many vesting events or frequent ESPP purchases to use the tax features.

**Independent Test**: Can be fully tested by uploading a CSV with columns for "Grant Date", "Shares Withheld", and "Discount %" and verifying the resulting transactions in the app have the correct tax metadata attached.

**Acceptance Scenarios**:

1. **Given** a CSV file with "RSU Vest" rows including "Shares Withheld" columns, **When** I use the Import tool, **Then** the system correctly identifies these fields and creates the specialized RSU transactions.
2. **Given** the column mapping interface, **When** I upload a custom CSV, **Then** I can map source columns to the new "Grant Date", "Discount %", and "Vesting FMV" fields.

---

### User Story 2 - Export Tax-Aware Performance Reports (Priority: P2)

As a tax-conscious investor, I want to export my transaction history and holdings with estimated tax liability data, so that I can provide complete records to my tax advisor.

**Why this priority**: Extends the value of the tax calculation engine by making the data portable and useful outside the application.

**Independent Test**: Can be tested by clicking "Export" on the Reports page and verifying the resulting CSV contains columns for "Holding Period (ST/LT)", "Estimated Basis Adjustment", and "Potential Tax Bill".

**Acceptance Scenarios**:

1. **Given** a portfolio with ESPP and RSU holdings, **When** I click "Export Transactions", **Then** the CSV includes specialized columns for bargain elements and withholding data.
2. **Given** the Holdings export, **When** I download the file, **Then** each row includes the "Estimated Unrealized Tax" based on my configured tax rates.

---

### User Story 3 - View Tax Alerts on Analysis & Dashboard (Priority: P2)

As an investor, I want to see tax-related warnings and opportunities (like upcoming LT transitions) on my main dashboard and analysis pages, so that I can time my sales optimally.

**Why this priority**: Integrates tax data into the core user experience, moving it from a "report" to an "active insight".

**Independent Test**: Can be tested by having a lot that is 11 months old and verifying a "Tax Optimization" recommendation appears on the Analysis page.

**Acceptance Scenarios**:

1. **Given** a holding with a tax lot turning "Long Term" in the next 30 days, **When** I view the Analysis page, **Then** I see a recommendation to "Wait for Long Term status" before selling.
2. **Given** high unrealized short-term gains, **When** I view the Dashboard, **Then** a "Tax Exposure" widget shows the estimated tax burden.

### Edge Cases

- How are conflicting CSV headers handled for tax fields? (System should prompt for mapping if ambiguity exists).
- What if imported date formats for "Grant Date" vary? (Reuse existing robust date parsing logic).
- How are "Shares Withheld" represented in the export if the row represents a Net receive? (Include "Gross Shares" and "Shares Withheld" as separate columns for transparency).

## Clarifications

### Session 2026-01-27

- Q: Which "other parts" of the application should prioritize tax data? → A: The **Analysis Page** (for tax-loss harvesting and LT/ST alerts) and the **Dashboard** (for a summary tax exposure widget).
- Q: Should the export format be updated for all report types? → A: Yes, both the "Tax Report" and "Holdings Summary" should include the new tax-related columns.
- Q: How should the system distinguish between Net and Gross RSU imports? → A: Auto-detect via Header - If a "Shares Withheld" column is mapped in the CSV, the system assumes Gross input and calculates Net automatically.
- Q: Where should the high-level tax liability be displayed? → A: Dedicated Dashboard Widget - A new "Tax Exposure" card will be added to the main dashboard to show estimated ST/LT liability at a glance.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST update the CSV Import service to support mapping for: `grantDate`, `vestingDate`, `discountPercent`, `sharesWithheld`, and `ordinaryIncomeAmount`.
- **FR-002**: System MUST update the CSV Export service to include tax metadata in "Transaction History" and "Holdings Summary" reports.
- **FR-003**: System MUST add a "Tax Optimization" rule to the Recommendation Engine (Feature 008) to detect lots approaching the 1-year LT threshold.
- **FR-004**: System MUST add a dedicated "Tax Exposure" widget to the Dashboard (Feature 002) displaying estimated Short Term and Long Term tax liability.
- **FR-005**: System MUST include the "Bargain Element" in the ordinary income portion of the Tax Report.
- **FR-006**: System MUST automatically detect if an RSU import is "Gross" or "Net" based on the presence of a mapped "Shares Withheld" column.

### Key Entities

- **ImportMapping**: Updated to include tax-specific fields.
- **TaxRecommendation**: A new recommendation type for the Analysis engine.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully import 100 RSU vesting events with withholding data via CSV without errors.
- **SC-002**: Exported CSVs contain exactly 5 new tax-related columns as defined in FR-002.
- **SC-003**: The "Tax Exposure" widget renders on the dashboard in < 200ms using existing pre-computed lot data.
- **SC-004**: 90% of lot "Aging" events (transitioning to LT) are correctly flagged 30 days in advance.