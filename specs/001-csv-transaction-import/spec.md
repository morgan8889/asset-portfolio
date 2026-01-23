# Feature Specification: CSV Transaction Import with Automatic Column Detection

**Feature Branch**: `001-csv-transaction-import`
**Created**: 2026-01-22
**Status**: Draft (Expert Panel Reviewed)
**Input**: User description: "Add csv import for transactions with automatic column detection"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Import Transactions from CSV File (Priority: P1)

A user wants to import their transaction history from a brokerage or financial institution export. They select a CSV file from their computer, and the system automatically detects which columns contain transaction data (date, symbol, quantity, price, type) and imports the transactions into their portfolio.

**Why this priority**: This is the core functionality. Without the ability to upload and import a CSV file, the feature has no value. Users need a fast way to bulk-add historical transactions rather than entering them one by one.

**Independent Test**: Can be fully tested by uploading a standard CSV file with clearly labeled columns and verifying transactions appear in the portfolio.

**Acceptance Scenarios**:

1. **Given** a user is on the transactions page, **When** they click "Import CSV" and select a valid CSV file with transaction data, **Then** the system displays a preview of detected columns and mapped fields.

2. **Given** a CSV file has standard column headers (Date, Symbol, Quantity, Price, Type), **When** the file is uploaded, **Then** the system automatically maps these columns to the corresponding transaction fields.

3. **Given** the user confirms the column mapping, **When** they click "Import", **Then** all valid transactions are added to their portfolio and a summary shows how many were imported.

**Example CSV Format**:
```csv
Date,Symbol,Type,Quantity,Price,Fees,Notes
2025-01-15,AAPL,BUY,10,150.00,4.95,Initial purchase
2025-01-20,GOOGL,BUY,5,175.50,4.95,
2025-02-01,AAPL,SELL,5,155.00,4.95,Partial sale
2025-03-15,VTI,DIVIDEND,0,0.85,,Q1 dividend
```

---

### User Story 2 - Correct Column Mapping Before Import (Priority: P2)

A user uploads a CSV file where the automatic detection incorrectly maps some columns (e.g., the system thinks "Ticker" is the date field). The user needs to manually correct the mapping before proceeding with the import.

**Why this priority**: Automatic detection won't be perfect for all file formats. Users must be able to fix errors to ensure data accuracy, but this builds on P1's core upload functionality.

**Independent Test**: Can be tested by uploading a CSV with non-standard headers and verifying the user can reassign column mappings before import.

**Acceptance Scenarios**:

1. **Given** the system displays a column mapping preview, **When** the user sees an incorrect mapping, **Then** they can click on the field and select a different column from a dropdown.

2. **Given** a required field (Date, Symbol, Quantity, Price) is not mapped, **When** the user attempts to import, **Then** the system shows an error indicating which required fields are missing.

3. **Given** the user corrects all column mappings, **When** they click "Import", **Then** transactions are imported using the corrected mappings.

---

### User Story 3 - Handle Import Errors Gracefully (Priority: P3)

A user uploads a CSV file that contains some invalid rows (missing data, invalid dates, non-numeric prices). The system should import the valid rows and clearly report which rows failed and why.

**Why this priority**: Real-world CSV exports often contain data quality issues. Graceful error handling improves user trust, but core import and mapping must work first.

**Independent Test**: Can be tested by uploading a CSV with intentionally malformed rows and verifying partial import succeeds with clear error reporting.

**Acceptance Scenarios**:

1. **Given** a CSV file contains 100 rows where 5 have invalid data, **When** the user imports the file, **Then** 95 transactions are imported successfully and the 5 failures are listed with specific error reasons.

2. **Given** an import completes with errors, **When** the user views the error report, **Then** each failed row shows the row number, the problematic data, and a human-readable explanation of why it failed.

3. **Given** the user reviews import errors, **When** they choose to "Download Failed Rows", **Then** they receive a CSV containing only the failed rows for manual correction.

---

### User Story 4 - Handle Duplicate Transaction Detection (Priority: P4)

A user accidentally imports the same CSV file twice, or imports a file that contains transactions already in their portfolio. The system should detect potential duplicates and allow the user to decide how to handle them.

**Why this priority**: Duplicate prevention protects data integrity but requires core import functionality (P1-P3) to work first.

**Independent Test**: Can be tested by importing a file, then importing the same file again and verifying duplicate detection activates.

**Acceptance Scenarios**:

1. **Given** a user imports a CSV file containing transactions that match existing transactions (same date, symbol, quantity, price), **When** the import preview loads, **Then** the system flags potential duplicates and shows a count.

2. **Given** duplicates are detected, **When** the user views the duplicate list, **Then** they can choose to skip duplicates, import anyway, or review each individually.

3. **Given** the user chooses "Skip Duplicates", **When** the import completes, **Then** only new transactions are added and the summary shows "X imported, Y duplicates skipped".

---

### User Story 5 - Support Common Brokerage Export Formats (Priority: P5 - Enhancement)

*Note: This is an enhancement feature. Core import functionality (P1-P4) provides full value without pre-configured brokerage templates.*

A user exports their transaction history from a popular brokerage and imports it directly without manual column mapping. The system recognizes the format and applies pre-configured mappings.

**Why this priority**: Pre-configured templates improve user experience for common cases, but manual mapping from P2 provides a complete fallback.

**Independent Test**: Can be tested by uploading sample exports from supported brokerages and verifying automatic format detection.

**Acceptance Scenarios**:

1. **Given** a user uploads a CSV file that matches a known brokerage format, **When** the system analyzes the file structure, **Then** it automatically detects the brokerage and applies the correct column mapping.

2. **Given** the system detects a known format, **When** showing the preview, **Then** it displays "Detected: [Brokerage Name] format" and the user can proceed without manual mapping.

---

### Edge Cases

- What happens when the CSV file is empty or contains only headers?
  - System displays "No transaction data found in file" message
- What happens when the CSV file exceeds the maximum allowed size (10MB)?
  - System displays file size limit error before processing begins
- What happens when the CSV uses a different delimiter (semicolon, tab)?
  - System attempts to auto-detect delimiter; falls back to user selection if uncertain
- What happens when date formats vary within the same file?
  - System attempts to parse each date individually; rows with unparseable dates are marked as errors
- What happens when the user uploads a non-CSV file?
  - System validates file type and shows "Please select a CSV file" error
- What happens when a transaction symbol doesn't match any known asset?
  - System imports the transaction but flags it for review; user can add the new asset or correct the symbol
- What happens when the user imports the same file twice?
  - System detects duplicates based on date, symbol, quantity, and price; user chooses how to handle

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to select and upload CSV files from their device
- **FR-002**: System MUST automatically detect column mappings based on header names and data patterns
- **FR-003**: System MUST display a preview of the first 10 rows with detected column mappings before import
- **FR-004**: System MUST allow users to manually override any detected column mapping
- **FR-005**: System MUST validate that all required fields (Date, Symbol, Quantity, Price) are mapped before import
- **FR-006**: System MUST validate each row's data during import, accepting the following date formats:
  - ISO 8601: `YYYY-MM-DD` (e.g., 2025-01-15)
  - US format: `MM/DD/YYYY` (e.g., 01/15/2025)
  - EU format: `DD/MM/YYYY` (e.g., 15/01/2025) - detected by context
  - Written: `Month DD, YYYY` (e.g., January 15, 2025)
- **FR-007**: System MUST import all valid transactions even if some rows contain errors
- **FR-008**: System MUST provide a detailed error report for any rows that fail validation
- **FR-009**: System MUST allow users to download failed rows as a CSV for correction
- **FR-010**: System MUST support transaction types: Buy, Sell, Dividend, Split, and Transfer
- **FR-011**: System MUST handle CSV files with different delimiters (comma, semicolon, tab)
- **FR-012**: System MUST preserve financial precision for all imported monetary values
- **FR-013**: System MUST store imported transactions in the user's local portfolio data
- **FR-014**: System MUST allow users to cancel an import before confirmation without affecting existing data
- **FR-015**: System MUST detect potential duplicate transactions by matching date, symbol, quantity, and price against existing portfolio transactions
- **FR-016**: System MUST allow users to skip, include, or individually review detected duplicates

### Key Entities

- **Import Session**: Represents a single CSV import attempt; tracks file metadata, detected mappings, preview data, validation results, duplicate detection, and final import status
- **Column Mapping**: Maps a CSV column (by header name or index) to a transaction field; includes confidence score from auto-detection
- **Import Error**: Records a failed row with row number, original data, field that failed, and human-readable error message
- **Duplicate Match**: Records a potential duplicate with the CSV row and matching existing transaction for user review
- **Transaction**: Existing entity extended to support bulk creation from import; includes date, symbol, quantity, price, type, and optional fees/notes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can import a 500-row CSV file in under 30 seconds (excluding upload time)
- **SC-002**: Automatic column detection correctly maps columns for CSV files using common header names (Date, Symbol, Ticker, Quantity, Shares, Price, Amount, Type, Action) without user intervention
- **SC-003**: 95% of users successfully complete their first CSV import without requiring support
- **SC-004**: Time to add 100+ historical transactions reduced by 80% compared to manual entry
- **SC-005**: Import error messages are clear enough that 90% of users can identify and fix data issues on their own
- **SC-006**: Zero data loss or corruption during import process (all imported values match source file exactly)
- **SC-007**: Duplicate detection correctly identifies matching transactions with zero false negatives (may have some false positives that user can override)

## Assumptions

- Users have CSV files exported from their brokerage or financial tracking software
- CSV files contain at minimum: date, asset symbol, quantity, and price per share/unit
- Transaction type (buy/sell) may be inferred from positive/negative quantities if not explicitly provided
- The application already has a transactions page where imported data will appear
- File size limit of 10MB is reasonable for typical transaction history exports (approximately 50,000 rows)
- Users expect the import to happen entirely in their browser (consistent with privacy-first architecture)
- Duplicate detection uses exact matching; fuzzy matching is out of scope for initial release
