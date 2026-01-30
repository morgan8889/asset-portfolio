# Feature Specification: Comprehensive Allocation Planning

**Feature Branch**: `010-allocation-planning`
**Created**: 2026-01-27
**Status**: Draft
**Input**: User description: "build comprehensive allocation planning feature"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Current Allocation Breakdown (Priority: P1)

As an investor, I want to see a visual breakdown of my portfolio by asset class, sector, and region, so that I can understand my current exposure and diversification.

**Why this priority**: Understanding the *current* state is the prerequisite for any planning or rebalancing. It replaces the current placeholder page.

**Independent Test**: Can be fully tested by adding diverse assets (Stock, Bond, Property) and verifying the Allocation page displays accurate charts (Donut/Bar) matching the portfolio composition.

**Acceptance Scenarios**:

1. **Given** a portfolio with stocks and bonds, **When** I navigate to the Allocation page, **Then** I see a donut chart split by Asset Class (e.g., 60% Stock, 40% Bond).
2. **Given** I am viewing the allocation chart, **When** I toggle the view to "Sector", **Then** the chart updates to show Technology vs. Healthcare vs. Real Estate, etc.
3. **Given** I hover over a chart segment, **Then** I see the exact percentage and currency value of that allocation.

---

### User Story 2 - Define Target Allocation Model (Priority: P2)

As an investor, I want to define a target allocation model (percentage targets for each asset class), so that I have a benchmark to measure my portfolio against.

**Why this priority**: Sets the "goal" state. Without a target, "planning" is impossible. This builds upon the data structures from Feature 008 (Financial Analysis).

**Independent Test**: Can be tested by creating a custom target model (e.g., 50/50), saving it, and verifying it persists as the active model for the portfolio.

**Acceptance Scenarios**:

1. **Given** the Allocation page, **When** I click "Set Targets", **Then** I can input target percentages for each asset class (must sum to 100%).
2. **Given** I have defined a target, **When** I save, **Then** the system validates the total is 100% and stores the model locally.

---

### User Story 3 - Analyze Drift and Rebalance (Priority: P3)

As an investor, I want to see the "drift" between my current and target allocation, and get specific buy/sell instructions to rebalance, so that I can maintain my desired risk profile.

**Why this priority**: The actionable outcome of allocation planning. It guides the user's trading decisions.

**Independent Test**: Can be tested by setting a target that differs from current holdings and verifying the "Drift" column shows the variance and the "Action" column shows correct Buy/Sell amounts.

**Acceptance Scenarios**:

1. **Given** a target of 50% Stock and current allocation of 60% Stock, **When** I view the Rebalancing section, **Then** I see a "Sell" recommendation for the excess stock value.
2. **Given** a portfolio with cash, **When** I view rebalancing, **Then** the system suggests using available cash to buy underweight assets first before suggesting sales (tax efficiency).

### Edge Cases

- What happens if an asset has no defined class/sector? (Group under "Unclassified" visual slice and prompt user to edit asset details).
- How are negative cash balances (margin) handled in allocation? (Netted against the total Cash asset class value).
- What if the user wants to exclude specific portfolios (e.g., locked 401k) from rebalancing? (Using the "Exclude from Rebalancing" toggle at the portfolio level).

## Clarifications

### Session 2026-01-27

- Q: How should negative cash balances (margin) be handled? → A: Net against Cash - Negative balances are subtracted from the total value of the Cash asset class.
- Q: How should assets without categories be visualized? → A: Visual Slice + Alert - Assets without defined class/sector/region appear as an "Unclassified" slice in charts, accompanied by a prompt to fix them.
- Q: How should specific holdings be excluded from rebalancing? → A: Portfolio-Level Toggle - Users can toggle entire portfolios to be excluded from the generated rebalancing plan.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display interactive charts (Donut/Bar) for Current Allocation by Asset Class, Sector, and Region.
- **FR-002**: System MUST calculate current allocation percentages based on the latest available market values, netting negative cash balances against the total Cash asset class.
- **FR-003**: System MUST allow users to define and save Target Allocation Models (percentage per Asset Class) that sum to exactly 100%.
- **FR-004**: System MUST calculate "Drift" (Current % - Target %) for each category based on total portfolio value.
- **FR-005**: System MUST generate a "Rebalancing Plan" listing specific Buy/Sell actions, excluding any portfolios marked as "Excluded from Rebalancing".
- **FR-006**: System MUST support hierarchical views (e.g., click "Stock" to see breakdown by "Sector").
- **FR-007**: System MUST persist target models and portfolio-level exclusion preferences in IndexedDB using keys `allocation_targets` and `rebalancing_exclusions`.
- **FR-008**: System MUST group "Unclassified" assets into a distinct visual slice in all charts and display a persistent alert until categorized.
- **FR-009**: System MUST allow users to toggle "Exclude from Rebalancing" at the portfolio level to skip specific portfolios in generated plans.

### Key Entities

- **AllocationCategory**: A grouping dimension with three supported types: Asset Class (e.g., Stock, Bond, Cash), Sector (e.g., Technology, Healthcare), and Region (e.g., US, Europe, Asia). String-based to allow extensibility.
- **TargetModel**: Definition of target allocation percentages per category that sum to 100%. Persisted in IndexedDB userSettings table.
- **RebalancePlan**: A generated set of proposed buy/sell transactions to achieve target allocation, calculated client-side.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Allocation charts render in < 500ms (client-side rendering after data fetch) for portfolios with up to 500 holdings.
- **SC-002**: Rebalancing calculation completes in < 200ms (client-side, excluding data fetch).
- **SC-003**: Users can successfully define and save a valid target model (100% total) without errors.
- **SC-004**: "Drift" calculations are accurate to within 0.01% of portfolio value.