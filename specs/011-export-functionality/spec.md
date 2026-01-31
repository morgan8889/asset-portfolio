# Feature Specification: Portfolio Export Functionality

**Feature Branch**: `011-export-functionality`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "export functionality"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export Portfolio Performance Report (Priority: P1)

As an investor, I want to download a PDF report of my portfolio's performance, so that I can share it with my accountant or archive it for my records.

**Why this priority**: Archiving and sharing portfolio data is a fundamental requirement for serious investors, especially for tax and compliance purposes.

**Independent Test**: Can be tested by navigating to the Reports page, clicking "Download PDF" for the Performance Report, and verifying the generated PDF contains correct charts and summary tables.

**Acceptance Scenarios**:

1. **Given** I am on the Reports page, **When** I click "Generate Performance Report (PDF)", **Then** a PDF file is downloaded to my device.
2. **Given** the downloaded PDF, **When** I open it, **Then** I see my current total value, performance charts, and a list of top holdings.

---

### User Story 2 - Export Transaction History (Priority: P2)

As an investor, I want to export my full transaction history as a CSV file, so that I can import it into other tools (like Excel or tax software) for further analysis.

**Why this priority**: Data portability is crucial. Users often need to manipulate raw data in spreadsheets for custom analysis not provided by the app.

**Independent Test**: Can be tested by clicking "Download CSV" for the Tax Report and verifying the file structure matches the required columns (Date, Type, Symbol, Price, Quantity).

**Acceptance Scenarios**:

1. **Given** I have transaction history, **When** I click "Export Transactions (CSV)", **Then** a CSV file is generated containing all my buy/sell/dividend records.
2. **Given** the exported CSV, **When** I open it in Excel, **Then** the columns are correctly formatted and data matches my portfolio.

---

### User Story 3 - Export Current Holdings Snapshot (Priority: P3)

As an investor, I want to download a snapshot of my current holdings as a CSV file, so that I can perform offline rebalancing calculations or net worth tracking.

**Why this priority**: Complements the transaction history by providing the "current state" view, useful for periodic net worth statements.

**Independent Test**: Can be tested by generating the "Holdings Summary" CSV export and verifying it lists all current assets with their market values.

**Acceptance Scenarios**:

1. **Given** I have active holdings, **When** I click "Export Holdings (CSV)", **Then** a .csv file is downloaded.
2. **Given** the CSV file, **When** I open it in a spreadsheet application, **Then** I see rows for each asset with columns for Quantity, Cost Basis, Market Value, and Gain/Loss.

### Edge Cases

- What happens if the portfolio is empty? (Disable export buttons or generate a "No Data" report with a helpful message).
- How are large datasets handled? (Stream CSV generation for >10k transactions to prevent browser crashes).
- What about date ranges? (Allow users to select "All Time", "YTD", or "Last Year" before generating).

## Clarifications

### Session 2026-01-27

- Q: How should PDFs be generated? → A: Browser-Native Generation - Use a client-side library to render PDFs directly in the browser, ensuring data privacy.
- Q: What format should tabular exports use? → A: CSV Only - Export all tabular reports (Transactions, Holdings) as CSV files for simplicity and universal compatibility.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "Reports" page accessible from the main navigation.
- **FR-002**: System MUST generate PDF reports client-side containing the Total Value chart, Asset Allocation donut, and Top 10 Holdings table.
- **FR-003**: System MUST generate CSV exports of transaction history including fields: Date, Type, Symbol, Quantity, Price, Fees, Total.
- **FR-004**: System MUST generate CSV exports of current holdings including: Symbol, Name, Quantity, Cost Basis, Current Price, Market Value, Unrealized Gain/Loss.
- **FR-005**: System MUST allow users to select a date range (YTD, 1Y, All) for the Transaction History CSV export.
- **FR-006**: System MUST ensure all exports happen locally in the browser (no data sent to server).
- **FR-007**: System MUST name exported files with a consistent convention (e.g., `portfolio_performance_YYYY-MM-DD.pdf`).

### Key Entities

- **ReportConfig**: Settings for a report generation task (type, dateRange, format).
- **ExportData**: The standardized data structure passed to the generator (agnostic of output format).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: PDF report generation completes in under 3 seconds for standard portfolios.
- **SC-002**: CSV export of 5,000 transactions completes in under 1 second.
- **SC-003**: Generated CSV files pass validation in standard spreadsheet software (Excel, Numbers, Google Sheets).
- **SC-004**: 100% of export operations occur without network requests (privacy verification).