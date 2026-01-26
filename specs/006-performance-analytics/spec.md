# Feature Specification: Portfolio Performance Analytics

**Feature Branch**: `006-performance-analytics`
**Created**: 2025-01-25
**Status**: Draft
**Input**: User description: "006 visualize and analyze portfolio performance over time."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Portfolio Performance Chart (Priority: P1)

As an investor, I want to see a visual chart of my portfolio's total value over time, so that I can understand how my investments have performed historically.

**Why this priority**: This is the core value proposition - visualizing performance history. Without this, users cannot track their investment journey over time, which is the fundamental purpose of the feature.

**Independent Test**: Can be fully tested by loading a portfolio with historical transactions and price data, selecting different time periods, and verifying the chart displays accurate portfolio value progression.

**Acceptance Scenarios**:

1. **Given** a portfolio with holdings and historical price data, **When** I view the performance analytics page, **Then** I see an interactive line/area chart showing portfolio value over time with the selected time period.

2. **Given** a portfolio with multiple assets, **When** I hover over any point on the chart, **Then** I see a tooltip displaying the date, total portfolio value, and change from previous period.

3. **Given** the performance chart is displayed, **When** I select a different time period (1W, 1M, 3M, 1Y, ALL), **Then** the chart updates to show performance for that specific period.

4. **Given** a portfolio with price data, **When** the chart loads, **Then** I see visual indicators distinguishing gains (green) from losses (red).

---

### User Story 2 - Analyze Individual Holding Performance (Priority: P2)

As an investor, I want to see performance metrics for each of my holdings, so that I can identify which investments are performing well and which are underperforming.

**Why this priority**: After understanding overall portfolio performance, users need granular insight into individual holdings to make informed decisions about rebalancing or selling.

**Independent Test**: Can be tested by viewing a portfolio with multiple holdings and verifying each holding shows its individual gain/loss metrics with correct calculations.

**Acceptance Scenarios**:

1. **Given** a portfolio with holdings, **When** I view the performance breakdown, **Then** I see a table/list showing each holding with its current value, cost basis, absolute gain/loss, and percentage gain/loss.

2. **Given** the holdings performance view, **When** I select a time period, **Then** each holding's performance metrics update to reflect that period's gains/losses.

3. **Given** multiple holdings with varying performance, **When** I view the performance breakdown, **Then** holdings are sortable by gain/loss amount or percentage.

---

### User Story 3 - View Performance Summary Statistics (Priority: P2)

As an investor, I want to see key performance summary statistics, so that I can quickly understand my overall investment performance at a glance.

**Why this priority**: Summary statistics provide quick insights without requiring users to analyze the full chart, enabling faster decision-making.

**Independent Test**: Can be tested by loading a portfolio and verifying the summary statistics display correctly calculated values.

**Acceptance Scenarios**:

1. **Given** a portfolio with historical data, **When** I view the performance page, **Then** I see summary statistics including: total return (%), total gain/loss ($), period high, period low, and best/worst performing day.

2. **Given** summary statistics are displayed, **When** I change the time period filter, **Then** all statistics recalculate for the new period.

3. **Given** a portfolio with gains, **When** viewing the total return, **Then** positive returns are displayed in green; negative returns in red.

---

### User Story 4 - Compare Performance Across Time Periods (Priority: P3)

As an investor, I want to compare my portfolio's performance across different time periods, so that I can identify trends and seasonal patterns.

**Why this priority**: Comparative analysis helps identify patterns but is not essential for basic performance tracking. Users can gain value from P1-P2 without this feature.

**Independent Test**: Can be tested by selecting multiple time periods and verifying comparison data is displayed side-by-side.

**Acceptance Scenarios**:

1. **Given** the performance analytics view, **When** I access the comparison feature, **Then** I can see performance metrics for multiple periods displayed side-by-side (e.g., 1M vs 3M vs 1Y).

2. **Given** comparison data is displayed, **When** viewing the metrics, **Then** I can clearly identify which periods had better/worse performance through visual indicators.

3. **Given** the performance chart is displayed, **When** I enable benchmark comparison, **Then** I see a configurable benchmark index (default: S&P 500) overlaid on my portfolio performance chart.

---

### User Story 5 - Export Performance Report (Priority: P3)

As an investor, I want to export my performance data, so that I can share it with advisors or keep records for tax purposes.

**Why this priority**: Export functionality is a "nice-to-have" that extends the core value but is not essential for day-to-day performance tracking.

**Independent Test**: Can be tested by triggering an export and verifying the downloaded file contains accurate performance data.

**Acceptance Scenarios**:

1. **Given** the performance analytics view, **When** I click export, **Then** I can download my performance data as a CSV file containing dates, values, and returns.

2. **Given** the export dialog, **When** I select a time period, **Then** only that period's data is included in the export.

---

### Edge Cases

- What happens when there is no historical price data for some assets? Display with indication that data is incomplete/estimated.
- How does the system handle portfolios with no transactions yet? Show empty state with guidance to add holdings.
- What happens when price data has gaps (weekends, holidays)? Use last known price for continuity, indicate interpolated data.
- How are dividends and other income reflected in performance? Include reinvested dividends in total return; show dividend contributions separately if significant.
- What happens when viewing a very long time period (10+ years)? Aggregate data points (weekly/monthly) to maintain chart readability.
- How are currency conversions handled for multi-currency portfolios? Display in portfolio's base currency with conversion at historical rates.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST calculate portfolio value at any historical point using transaction history and price data.
- **FR-002**: System MUST display an interactive time-series chart of portfolio value over configurable time periods (1W, 1M, 3M, 1Y, ALL).
- **FR-003**: System MUST calculate and display total return as both absolute value and percentage using Time-Weighted Return (TWR) methodology to eliminate cash flow timing effects.
- **FR-004**: System MUST provide individual holding performance with cost basis, current value, and gain/loss metrics.
- **FR-005**: System MUST allow filtering performance data by time period with instant UI updates.
- **FR-006**: System MUST visually distinguish positive (gains) from negative (losses) performance using color coding.
- **FR-007**: System MUST display summary statistics including period high, period low, and total change.
- **FR-008**: System MUST handle missing price data gracefully by interpolating and indicating estimated values.
- **FR-009**: System MUST support sorting holdings by performance metrics (gain/loss amount or percentage).
- **FR-010**: System MUST calculate performance using high-precision decimal arithmetic to avoid floating-point errors.
- **FR-011**: System MUST export performance data to CSV format with date, value, and return columns.
- **FR-012**: System MUST persist all data locally in the browser (IndexedDB) maintaining privacy-first architecture.
- **FR-013**: System MUST pre-compute and persist daily portfolio value snapshots in IndexedDB for fast chart rendering. Snapshots are computed/updated immediately when transactions are added or modified.
- **FR-014**: System MUST support overlaying a single configurable benchmark index (default: S&P 500) on the performance chart for comparison. Benchmark data sourced via existing price API infrastructure (e.g., ^GSPC ticker via Yahoo Finance).

### Key Entities

- **PerformanceSnapshot**: A point-in-time record of portfolio value containing date, total value, and change from previous snapshot. Pre-computed daily and persisted in IndexedDB for fast retrieval.
- **HoldingPerformance**: Performance metrics for a single holding including cost basis, current value, absolute and percentage gain/loss.
- **PerformanceSummary**: Aggregated statistics for a period including total return, high, low, best day, worst day.
- **TimeSeriesDataPoint**: Individual data point for charting with date, value, and optional annotations for dividends/transactions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their portfolio performance chart within 2 seconds of page load.
- **SC-002**: Time period changes update the chart and statistics within 500 milliseconds.
- **SC-003**: Portfolio performance calculations match manual calculations with 99.99% accuracy (decimal precision).
- **SC-004**: Users can identify their best and worst performing holdings within 10 seconds of viewing the page.
- **SC-005**: Performance data for 5 years of history with 50 holdings renders without visible lag.
- **SC-006**: Users can export up to 10 years of daily performance data within 5 seconds.
- **SC-007**: 90% of users can successfully interpret their portfolio's performance trend on first view (clear visual hierarchy).
- **SC-008**: All performance features work offline after initial data load (privacy-first, local-only operation).

## Assumptions

- The existing `priceHistory` table contains sufficient historical price data for calculating performance over time.
- The existing time period configurations (TODAY, WEEK, MONTH, QUARTER, YEAR, ALL) will be reused for consistency.
- Performance calculations will leverage the existing `HoldingPerformance` type already defined in the codebase.
- The feature will integrate with the existing dashboard widget system and can be added as a new page or enhanced widget.
- Chart library (Recharts) already in use will be sufficient for the required visualizations.
- Decimal.js will be used for all financial calculations to maintain precision.

## Clarifications

### Session 2025-01-25

- Q: Should performance history be calculated on-demand or pre-computed and persisted? → A: Pre-compute and persist daily snapshots in IndexedDB (faster reads, uses storage).
- Q: Should the performance chart support comparison against a benchmark index? → A: Single configurable benchmark (default: S&P 500) overlaid on chart.
- Q: Which return calculation method should be used? → A: Time-Weighted Return (TWR) - industry standard, ignores cash flow timing.
- Q: When should performance snapshots be computed? → A: On transaction add/modify (update affected snapshots immediately).
- Q: How should benchmark index data be sourced? → A: Extend existing price API to fetch index data (e.g., ^GSPC via Yahoo Finance).
