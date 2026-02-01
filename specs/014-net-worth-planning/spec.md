# Feature Specification: Net Worth History & FIRE Planning

**Feature Branch**: `014-net-worth-planning`  
**Created**: 2026-01-27  
**Status**: Draft  
**Input**: User description: "any missing features that a financial planning app should have?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Track Net Worth History (Priority: P1)

As an investor, I want to see a historical chart of my total net worth (assets minus liabilities) over time, so that I can visualize my progress toward long-term wealth goals.

**Why this priority**: Net worth is the single most important metric for financial health. While the app currently tracks performance, it doesn't explicitly highlight the absolute net worth growth over time across all accounts.

**Independent Test**: Can be fully tested by viewing the Net Worth dashboard and verifying the chart correctly aggregates all asset values (holdings, property, cash) minus any debt/liabilities for past dates.

**Acceptance Scenarios**:

1. **Given** a portfolio with historical price data and transactions, **When** I view the Net Worth page, **Then** I see a line chart showing total net worth over time.
2. **Given** the Net Worth chart, **When** I change the time range (1Y, 5Y, ALL), **Then** the chart updates to show the corresponding aggregation.
3. **Given** I have added a manual liability (e.g., a mortgage), **When** I view the chart, **Then** the net worth is correctly calculated as Assets - Liabilities.

---

### User Story 2 - FIRE Goal Setting & Projections (Priority: P2)

As a financial planner, I want to set a "FIRE" (Financial Independence, Retire Early) goal and see projections of when I will reach it based on my current save rate and expected returns.

**Why this priority**: Financial planning is forward-looking. This feature connects current holdings to future goals, answering the "When can I retire?" question which is core to the app's purpose.

**Independent Test**: Can be tested by entering a monthly contribution amount and a target annual expense, then verifying the system calculates a "FIRE Number" (Expense * 25) and projects a completion date.

**Acceptance Scenarios**:

1. **Given** I am on the Planning page, **When** I enter my "Desired Annual Retirement Income", **Then** the system calculates my "FIRE Target" using the 4% rule.
2. **Given** my current net worth and "Monthly Savings Rate", **When** I view the projection, **Then** I see a growth curve reaching the FIRE target with an estimated "Years to FIRE".
3. **Given** a projection, **When** I adjust the "Expected Annual Return %", **Then** the timeline updates dynamically.

---

### User Story 3 - "What-If" Scenario Analysis (Priority: P3)

As an investor, I want to simulate how major changes (like a large purchase or a market crash) would affect my long-term financial plan, so that I can make better big-picture decisions.

**Why this priority**: Helps with decision support for life events (buying a house, career changes) rather than just tracking market movements.

**Independent Test**: Can be tested by creating a scenario (e.g., "Market Crash -20%") and seeing the projected FIRE date delay in real-time.

**Acceptance Scenarios**:

1. **Given** my financial plan, **When** I apply a "One-time Expense" scenario (e.g., $50k house deposit), **Then** the projection shows the immediate drop in net worth and the recalculated retirement date.
2. **Given** a plan, **When** I toggle a "Market Downturn" scenario, **Then** I see the impact of lower returns on my path to independence.

---

### Edge Cases

- **Negative Net Worth**: How does the system visualize a net worth below zero? (Chart should support negative Y-axis; planning should indicate "Infinite" years to FIRE until positive).
- **Data Gaps**: What if price history is missing for a specific date range? (Line should interpolate between known points or use last-known price).
- **Multiple Portfolios**: Does FIRE planning include all portfolios or just the active one? (Default to "Global Net Worth" but allow filtering by portfolio).

## Clarifications

### Session 2026-01-27

- Q: How should the FIRE target be calculated? → A: Safe Withdrawal Rate (SWR) - The system calculates the target as `Annual Expenses / Withdrawal Rate`. Users can customize the rate (default 4%).
- Q: How should inflation be handled in long-term projections? → A: Inflation-Adjusted (Real) - All projections are shown in "today's dollars" (purchasing power) by adjusting expected returns for a standard inflation rate (default 3%).
- Q: Where is the primary interface for this feature? → A: Dedicated Planning Page - A full-page dashboard with dedicated sections for Net Worth History, FIRE Projection, and Scenario simulation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated "Planning" page accessible from the sidebar.
- **FR-002**: System MUST aggregate total value of all holdings, properties, and cash to calculate "Total Assets".
- **FR-003**: System MUST allow users to add "Liabilities" (Manual entries for Debt, Mortgage, Loans) with balance and interest rate.
- **FR-004**: System MUST generate a historical time-series of "Net Worth" (Assets - Liabilities).
- **FR-005**: System MUST allow users to input "Target Retirement Income" and "Monthly Savings Amount".
- **FR-006**: System MUST calculate the "FIRE Number" using a customizable Safe Withdrawal Rate (SWR), defaulting to 4%.
- **FR-007**: System MUST project net worth growth in inflation-adjusted "today's dollars" using compound interest adjusted for inflation.
- **FR-008**: System MUST allow users to define "Scenarios" (temporary or permanent changes to returns, savings, or one-time events).
- **FR-009**: System MUST display a "Countdown to FIRE" widget on the main dashboard.
- **FR-010**: System MUST persist goal settings, liabilities, and inflation assumptions in IndexedDB.

### Key Entities

- **Liability**: Represents debt (id, name, balance, interestRate, portfolioId).
- **FinancialGoal**: Represents a target state (id, type: "FIRE", targetValue, annualExpenses, expectedReturn).
- **FinancialProjection**: Derived data structure for chart visualization (year, balance, isProjected).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their net worth history chart in under 1 second.
- **SC-002**: "Years to FIRE" calculation matches manual compound interest validation within 0.1% accuracy.
- **SC-003**: Net Worth aggregation handles up to 10,000 historical data points without browser lag.
- **SC-004**: 95% of users can successfully set a FIRE goal without referring to external documentation.