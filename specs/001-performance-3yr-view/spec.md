# Feature Specification: Performance Page 3-Year View & YoY Growth

**Feature Branch**: `001-performance-3yr-view`
**Created**: 2026-01-26
**Status**: Draft
**Input**: User description: "Enhance the performance page to include 3yr view. Also i'd like to include compound growth rate year to year."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View 3-Year Performance History (Priority: P1)

As an investor, I want to view my portfolio's performance over a 3-year period so that I can understand longer-term trends and make informed decisions about my investment strategy.

**Why this priority**: This is the core functionality request and provides immediate value by extending the existing performance visualization to include a 3-year time period, which is a standard benchmark for evaluating investment performance.

**Independent Test**: Can be fully tested by selecting the 3Y period button on the performance page and verifying that the chart displays 3 years of historical data with proper date formatting and portfolio values.

**Acceptance Scenarios**:

1. **Given** I am viewing the performance page with portfolio data spanning at least 3 years, **When** I click the "3Y" time period selector, **Then** the performance chart displays data for the past 3 years with monthly data points
2. **Given** I have a portfolio with less than 3 years of history, **When** I click the "3Y" selector, **Then** the chart displays all available data from portfolio inception to present
3. **Given** I am viewing the 3Y chart, **When** I hover over data points, **Then** I see tooltips showing the date, portfolio value, and change from the previous data point

---

### User Story 2 - View Year-over-Year Compound Growth Rate (Priority: P2)

As an investor, I want to see the compound annual growth rate (CAGR) calculated year-over-year so that I can understand how my portfolio has grown on an annualized basis across different time periods.

**Why this priority**: This adds analytical value by showing growth rates between consecutive years, helping users identify which years had stronger or weaker performance and understand the consistency of returns.

**Independent Test**: Can be tested by viewing the performance page and verifying that year-over-year CAGR metrics are displayed, calculated correctly based on portfolio values at year boundaries, and formatted as percentages.

**Acceptance Scenarios**:

1. **Given** I have portfolio data spanning multiple years, **When** I view the performance page, **Then** I see a year-over-year growth section displaying CAGR for each consecutive year pair (e.g., 2023-2024, 2024-2025, 2025-2026)
2. **Given** I view year-over-year CAGR metrics, **When** the growth is positive, **Then** it displays in green with a "+" prefix, and when negative, it displays in red with a "-" prefix
3. **Given** I have less than 1 complete year of data, **When** I view the performance page, **Then** the year-over-year section shows a message indicating insufficient data with the requirement (e.g., "Year-over-year growth requires at least 1 year of history")

---

### Edge Cases

- What happens when the portfolio has exactly 3 years of data vs more than 3 years? (Chart should show exactly 3 years from current date backward)
- How does the system handle data gaps in the 3-year period? (Display available data with visual indicators for gaps if any)
- What happens when switching from 3Y view to other time periods? (Smooth transition with chart re-rendering and data aggregation adjustments)
- How are partial years handled in year-over-year calculations? (Current incomplete year should be excluded from YoY CAGR calculations or clearly marked as "in progress")
- What happens when there are no transactions in an entire year? (Still calculate CAGR based on starting and ending portfolio values for that year)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add a "3Y" time period selector button to the existing performance chart period options (1M, 3M, YTD, 1Y, ALL)
- **FR-002**: System MUST display portfolio value data for the past 3 years when the 3Y period is selected, with appropriate data point aggregation (monthly granularity recommended for readability)
- **FR-003**: System MUST calculate compound annual growth rate (CAGR) for each consecutive year-over-year period using the formula: CAGR = ((Ending Value / Beginning Value) ^ (1 / Years)) - 1
- **FR-004**: System MUST display year-over-year CAGR metrics in a dedicated section on the performance page, showing each year-pair comparison (e.g., Year 1 → Year 2, Year 2 → Year 3)
- **FR-005**: System MUST format CAGR values as percentages with appropriate precision (2 decimal places)
- **FR-006**: System MUST visually distinguish positive growth (green) from negative growth (red) in the year-over-year display
- **FR-007**: System MUST handle portfolios with less than 3 years of data by displaying available data from inception
- **FR-008**: System MUST handle portfolios with less than 1 year of data by showing an informative message for the year-over-year section
- **FR-009**: System MUST maintain existing chart functionality (tooltips, zoom, pan) when displaying 3Y data
- **FR-010**: System MUST persist the selected time period (3Y) across page refreshes using existing user preferences mechanism

### Key Entities

- **Performance Time Period**: Represents the selectable time ranges for viewing portfolio performance, now including "3Y" (3 years) alongside existing options (1M, 3M, YTD, 1Y, ALL)
- **Year-over-Year Growth Metric**: Represents the calculated CAGR between consecutive year boundaries, including start date, end date, beginning value, ending value, and calculated CAGR percentage
- **Historical Portfolio Value**: Time-series data points containing date and portfolio value, used for chart visualization and CAGR calculations

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view 3-year performance history by clicking the 3Y selector, with the chart displaying within 2 seconds for portfolios with standard data volumes (up to 1000 transactions)
- **SC-002**: Year-over-year CAGR calculations are accurate to within 0.01% when compared to manual calculations using the same portfolio values
- **SC-003**: Users with 3+ years of portfolio history see year-over-year growth metrics for all complete year pairs on the performance page
- **SC-004**: The 3Y chart displays readable data points with appropriate aggregation (no more than 50 data points to maintain chart readability)
- **SC-005**: 95% of users can understand the year-over-year growth metrics without additional explanation (based on color coding and percentage formatting following existing UI patterns)

## Assumptions *(optional)*

- The existing performance page already has infrastructure for multiple time periods (1M, 3M, YTD, 1Y, ALL)
- Historical portfolio value data is stored in IndexedDB with sufficient granularity to support 3-year views
- The existing chart library (Recharts based on CLAUDE.md) supports the data volume required for 3-year visualization
- Year boundaries are calculated based on calendar years (January 1 - December 31)
- The compound growth calculation uses daily compounding assumption as is standard for investment performance metrics
- Users expect CAGR to be calculated based on portfolio values at year boundaries (December 31 of each year)

## Out of Scope *(optional)*

- Comparison of portfolio CAGR against benchmark indices (S&P 500, etc.) for the 3-year period
- Export functionality specifically for 3Y or year-over-year data
- Breakdown of CAGR by asset class or individual holdings
- Adjustments for cash flows (deposits/withdrawals) in CAGR calculations - using simple time-weighted return
- Rolling 3-year performance (multiple 3-year windows) - only showing most recent 3-year period
- Customizable year boundaries (fiscal years vs calendar years) - using calendar years only
