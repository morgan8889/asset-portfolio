# Feature Specification: Configurable Portfolio Overview Dashboard

**Feature Branch**: `002-portfolio-dashboard`
**Created**: 2026-01-22
**Status**: Draft (Expert Panel Reviewed)
**Input**: User description: "Create dashboard that provides an overview of the entire portfolio. Show totals, categories, growth overtime. This should be configurable"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Portfolio Summary at a Glance (Priority: P1)

A user opens the portfolio dashboard and immediately sees their total portfolio value, overall gain/loss (both amount and percentage), and a breakdown by asset category (stocks, ETFs, crypto, bonds, etc.). This gives them a quick understanding of their financial position without clicking into individual holdings.

**Why this priority**: This is the core value proposition. Users need to see their portfolio totals and category breakdown before any other dashboard features matter.

**Independent Test**: Can be fully tested by creating a portfolio with multiple asset types and verifying the dashboard displays accurate totals and category percentages.

**Acceptance Scenarios**:

1. **Given** a user has holdings across multiple asset categories, **When** they open the dashboard, **Then** they see total portfolio value, total gain/loss (amount and percentage), and a visual breakdown by category.

2. **Given** a user has no holdings in their portfolio, **When** they open the dashboard, **Then** they see a friendly empty state with guidance to add their first transaction.

3. **Given** market prices have changed since the user's last visit, **When** the dashboard loads, **Then** values reflect the most recent available prices.

**Example Calculation**:
```
Holdings:
- AAPL: 10 shares @ $150 cost basis, current price $175
- GOOGL: 5 shares @ $140 cost basis, current price $135

Calculations:
- AAPL Value: 10 × $175 = $1,750 | Gain: $1,750 - $1,500 = $250 (+16.67%)
- GOOGL Value: 5 × $135 = $675 | Loss: $675 - $700 = -$25 (-3.57%)
- Total Value: $2,425 | Total Cost: $2,200 | Total Gain: $225 (+10.23%)
- Category: Stocks 100%
- Top Performer: AAPL (+16.67%)
- Biggest Loser: GOOGL (-3.57%)
```

---

### User Story 2 - View Portfolio Growth Over Time (Priority: P2)

A user wants to understand how their portfolio has performed historically. They view a chart showing portfolio value over time and can select different time ranges (1 week, 1 month, 3 months, 6 months, 1 year, all time) to analyze performance across different periods.

**Why this priority**: Historical performance context is essential for investment decisions, but users first need to see current totals (P1) before historical trends add value.

**Independent Test**: Can be tested by creating a portfolio with transactions at different dates and verifying the chart accurately reflects portfolio value changes over selected time periods.

**Acceptance Scenarios**:

1. **Given** a user has transactions spanning 6 months, **When** they select "6 months" time range, **Then** they see a chart showing portfolio value from 6 months ago to today.

2. **Given** a user views the growth chart, **When** they hover over a point on the chart, **Then** they see the specific date and portfolio value at that point.

3. **Given** a user has only 2 weeks of history, **When** they select "1 year" time range, **Then** the chart shows available data with appropriate messaging about limited history.

---

### User Story 3 - Customize Dashboard Layout and Widgets (Priority: P3)

A user wants to personalize their dashboard by choosing which information widgets to display and how they are arranged. They can show/hide specific sections (e.g., hide the category breakdown if they only hold stocks) and rearrange the order of widgets to match their preferences.

**Why this priority**: Configurability enhances user experience but requires core display functionality (P1, P2) to exist first. Users with different investment styles will prioritize different information.

**Independent Test**: Can be tested by toggling widgets on/off and rearranging them, then verifying the layout persists after page refresh.

**Acceptance Scenarios**:

1. **Given** a user is on the dashboard, **When** they open dashboard settings, **Then** they see a list of available widgets with toggles to show/hide each one.

2. **Given** a user hides the "Category Breakdown" widget, **When** they return to the dashboard, **Then** the category breakdown is not displayed.

3. **Given** a user rearranges widgets by dragging them, **When** they refresh the page, **Then** their custom layout is preserved.

4. **Given** a user wants to reset to defaults, **When** they click "Reset to Default Layout", **Then** all widgets return to their original positions and visibility.

---

### User Story 4 - View Top Performers and Losers (Priority: P4)

A user wants to quickly identify which holdings are performing best and worst. The dashboard shows a "Top Performers" section listing holdings with the highest gains and a "Biggest Losers" section showing holdings with the largest losses, helping users focus attention where it matters most.

**Why this priority**: This provides actionable insights but depends on having the foundational dashboard structure in place first.

**Independent Test**: Can be tested by creating holdings with various gain/loss percentages and verifying the correct assets appear in each section.

**Acceptance Scenarios**:

1. **Given** a user has 10+ holdings, **When** they view the dashboard, **Then** they see up to 5 top performers ranked by percentage gain.

2. **Given** a user has holdings with losses, **When** they view the dashboard, **Then** they see up to 5 biggest losers ranked by percentage loss.

3. **Given** a user clicks on a top performer, **When** the system responds, **Then** they navigate to that holding's detail view.

---

### User Story 5 - Configure Time Period for Gain/Loss Calculations (Priority: P5)

A user wants to see performance metrics calculated over a specific period rather than all-time. They configure the dashboard to show gains/losses for "Today", "This Week", "This Month", "This Year", or "All Time", giving them flexibility in how they evaluate performance.

**Why this priority**: This adds nuance to the dashboard but requires the basic gain/loss display (P1) to work first.

**Independent Test**: Can be tested by selecting different time periods and verifying gain/loss calculations update to reflect only the chosen window.

**Acceptance Scenarios**:

1. **Given** a user selects "This Month" as the calculation period, **When** the dashboard updates, **Then** all gain/loss values reflect performance from the start of the current month.

2. **Given** a user changes from "All Time" to "This Year", **When** the dashboard updates, **Then** the total gain/loss recalculates based on the year-to-date performance.

3. **Given** a user's selected period preference, **When** they return to the dashboard later, **Then** their preferred period is remembered.

---

### Edge Cases

- What happens when the portfolio has only one asset category?
  - Category breakdown shows 100% allocation to that category; no empty categories displayed
- What happens when all holdings are at exactly break-even (0% gain/loss)?
  - Display shows $0 / 0.00% gain/loss with neutral styling (not green or red)
- What happens when price data is unavailable for some holdings?
  - Display last known value with a "stale data" indicator; show timestamp of last price update
- What happens when the user has holdings but no transaction history (manual entry)?
  - Growth chart shows flat line at current value with message "No historical transactions"
- What happens when widget configuration data is corrupted?
  - System falls back to default layout and notifies user their preferences were reset
- What happens when the dashboard is viewed on mobile devices?
  - Widgets stack vertically in a single column; drag-to-rearrange replaced with settings menu using up/down controls for reordering
- What happens when the price API fails entirely (network error, API unavailable)?
  - Display cached prices with prominent "stale" warning banner and last-updated timestamp; all price-dependent widgets remain functional using cached data

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display total portfolio value calculated from all holdings at current market prices
- **FR-002**: System MUST display total gain/loss as both absolute amount and percentage (percentage calculated relative to total cost basis)
- **FR-003**: System MUST display portfolio allocation breakdown by asset category with percentages
- **FR-004**: System MUST display a visual chart showing portfolio value over time
- **FR-005**: System MUST allow users to select time range for the growth chart (1W, 1M, 3M, 6M, 1Y, All)
- **FR-006**: System MUST display interactive chart elements (hover to see specific values)
- **FR-007**: System MUST allow users to show/hide individual dashboard widgets
- **FR-008**: System MUST allow users to rearrange dashboard widget order
- **FR-009**: System MUST persist user's dashboard configuration across sessions
- **FR-010**: System MUST provide a "Reset to Default" option for dashboard configuration
- **FR-011**: System MUST display top performing holdings ranked by percentage gain over the user's selected time period (FR-013)
- **FR-012**: System MUST display worst performing holdings ranked by percentage loss over the user's selected time period (FR-013)
- **FR-013**: System MUST allow users to configure the time period for gain/loss calculations
- **FR-014**: System MUST update all displayed values when the selected time period changes
- **FR-015**: System MUST display an appropriate empty state when the portfolio has no holdings
- **FR-016**: System MUST indicate when price data is stale (not updated since last market close) or unavailable
- **FR-017**: System MUST preserve financial precision in all displayed monetary values

### Key Entities

- **Dashboard Configuration**: User's personalized settings including widget visibility, widget order, and default time period preference
- **Widget**: A discrete information component on the dashboard (e.g., Total Value, Category Breakdown, Growth Chart, Top Performers); has display name, visibility state, and position
- **Performance Metric**: Calculated value showing gain/loss over a specified period; includes absolute amount, percentage, and time period context
- **Category Allocation**: Breakdown of portfolio by asset type; includes category name, total value, and percentage of portfolio

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Dashboard loads and displays all visible widgets within 2 seconds of page open
- **SC-002**: Total portfolio value MUST be the most prominent visual element on the dashboard (largest font size, top position)
- **SC-003**: Users can complete dashboard customization (hide/show widgets, rearrange) in under 1 minute
- **SC-004**: Growth chart time range changes reflect updated data within 1 second
- **SC-005**: 95% of returning users find their dashboard configuration preserved correctly
- **SC-006**: Dashboard remains usable and readable on screen widths from 320px to 2560px
- **SC-007**: Zero calculation errors in displayed portfolio totals (values match sum of individual holdings)

## Clarifications

### Session 2026-01-22
- Q: When price API fails entirely, how should dashboard handle this? → A: Display cached prices with prominent "stale" warning and timestamp

## Assumptions

- Users have at least one portfolio with holdings to view on the dashboard
- Historical portfolio values can be reconstructed from transaction history and historical price data
- The application already has price data fetching capabilities for supported asset types
- Dashboard is the primary landing page after the user opens the application
- Widget configuration is stored locally (consistent with privacy-first architecture)
- Default widget set includes: Total Value, Gain/Loss, Category Breakdown, Growth Chart, Top Performers, Biggest Losers
- Mobile users use a simplified single-column layout with settings menu up/down controls for widget reordering instead of drag-to-reorder
- The number of top/worst performers displayed (5) is a reasonable default for most portfolios
