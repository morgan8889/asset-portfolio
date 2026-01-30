# Feature Specification: Financial Analysis & Recommendations

**Feature Branch**: `008-financial-analysis`
**Created**: 2026-01-26
**Status**: Draft
**Input**: User description: "Implement financial analysis page to support review and recommendations on portfolio"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Portfolio Health Score (Priority: P1)

As an investor, I want to see an overall health score for my portfolio based on diversification, performance, and risk, so that I can quickly assess if my investment strategy needs adjustment.

**Why this priority**: This provides the high-level "at a glance" value that frames the rest of the analysis. It's the entry point for the entire feature.

**Independent Test**: Can be tested by navigating to the new "Analysis" page and verifying a score (0-100) is displayed along with a qualitative rating (e.g., "Good", "Needs Attention").

**Acceptance Scenarios**:

1. **Given** a portfolio with diversified holdings, **When** I navigate to the Analysis page, **Then** I see a high health score (e.g., >80) with a "Healthy" label.
2. **Given** a portfolio concentrated in a single asset class, **When** I view the analysis, **Then** I see a lower score reflecting poor diversification.
3. **Given** an empty portfolio, **When** I view the analysis, **Then** I see a "No Data" state with a prompt to add holdings.

---

### User Story 2 - Receive Actionable Recommendations (Priority: P2)

As an investor, I want to see specific, actionable recommendations to improve my portfolio, so that I can take concrete steps to optimize my returns or reduce risk.

**Why this priority**: Moving from "what is happening" (score) to "what to do" (recommendations) provides the core utility of an analysis tool.

**Independent Test**: Can be tested by creating specific portfolio conditions (e.g., high cash drag, single stock concentration) and verifying corresponding recommendation cards appear.

**Acceptance Scenarios**:

1. **Given** a portfolio with >20% cash, **When** I view recommendations, **Then** I see a "High Cash Drag" alert suggesting I invest the excess cash.
2. **Given** a portfolio with one stock >15% of total value, **When** I view recommendations, **Then** I see a "Concentration Risk" alert identifying the specific asset.
3. **Given** a well-balanced portfolio, **When** I view recommendations, **Then** I see a message indicating no critical actions are needed.

---

### User Story 3 - Analyze Asset Allocation vs Targets (Priority: P3)

As an investor, I want to compare my current asset allocation against standard models (e.g., 60/40 stocks/bonds) or custom targets, so that I can rebalance effectively.

**Why this priority**: This supports the "rebalancing" workflow which is a key maintenance task for investors.

**Independent Test**: Can be tested by selecting a target model and verifying the UI shows the "drift" (difference) between current and target percentages for each asset class.

**Acceptance Scenarios**:

1. **Given** a current allocation of 80% stocks, **When** I select a "60/40" target model, **Then** I see a visualization showing I am overweight in stocks by 20%.
2. **Given** an allocation analysis, **When** I view the details, **Then** I see specific buy/sell amounts needed to return to the target allocation.

### Edge Cases

- What happens when price data is missing for some assets? (Exclude from risk calculations but alert user of missing data)
- How does the system handle negative values (e.g., short positions)? (Treat as separate risk category or exclude from basic long-only models)
- How are "Other" or unknown asset types handled? (Flag as "Unclassified" and recommend user updates asset type)

## Clarifications

### Session 2026-01-26

- Q: How should the Portfolio Health Score be calculated and presented? → A: Customizable Weight Profiles - Score is a composite of Diversification, Performance, and Volatility. Users can select profiles (e.g., Growth, Safety) that adjust these weights. The calculation formula must be fully transparent and visible to the user.
- Q: What target allocation models should be supported? → A: Hybrid Model - Provide standard industry templates (e.g., 60/40, All Weather) but allow users to clone and customize these targets to fit their specific needs.
- Q: How should different asset classes like Property and Crypto be categorized? → A: Comprehensive Multi-Class - Explicitly support Property, Crypto, Commodities, and International Equities as distinct classes alongside Stocks and Bonds.
- Q: How should Property valuation be handled? → A: Manual Only - Users must manually update the value/price of property assets as no reliable live ticker exists for individual real estate.
- Q: How should international exposure be determined? → A: Ticker Inference with Manual Override - Automatically guess the region based on exchange suffixes (e.g., .L for UK), but allow users to manually set or correct the Region attribute for any asset.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated "Analysis" page accessible from the main navigation.
- **FR-002**: System MUST calculate a "Portfolio Health Score" (0-100) using a transparent formula based on Diversification, Performance Consistency, and Risk/Volatility.
- **FR-003**: System MUST allow users to select from different "Health Profiles" (e.g., Growth-Focused, Income-Focused, Balanced) that apply different weights to the scoring factors.
- **FR-004**: System MUST display the active scoring formula and raw component scores to ensure complete calculation transparency.
- **FR-005**: System MUST analyze portfolio composition across comprehensive asset classes: Stocks, Bonds, Crypto, Property, Commodities, and Cash.
- **FR-006**: System MUST detect and report international exposure by inferring region from asset tickers (e.g., exchange suffixes) while allowing users to manually override the detected region.
- **FR-007**: System MUST support manual price/value updates for Property assets to reflect current estimated market value.
- **FR-008**: System MUST analyze portfolio composition to detect common issues: High Cash (>20%), Single Asset Concentration (>15%), Sector Concentration (>30%), and lack of International Diversification.
- **FR-009**: System MUST display actionable recommendation cards for each detected issue, explaining the risk and suggesting a general remedy.
- **FR-010**: System MUST provide standard industry target allocation models (e.g., 60/40, All Weather, 80/20 Growth) as selectable comparison benchmarks.
- **FR-011**: System MUST allow users to clone industry standard models and customize the target percentages for each asset class (including Property and Crypto).
- **FR-012**: System MUST calculate and display the specific currency value difference (+/-) required to rebalance each asset class to the active target model.
- **FR-013**: System MUST perform all analysis locally in the browser to maintain privacy (no sending portfolio data to external analysis servers).

### Key Entities

- **HealthMetric**: Represents a specific dimension of analysis (e.g., Diversification) with a score and status.
- **Recommendation**: An actionable insight derived from analysis rules, containing a title, description, severity (High/Medium/Low), and related asset(s).
- **TargetModel**: A predefined asset allocation template (e.g., "Growth": 80% Stock, 20% Bond).
- **Asset (Extended)**: Added attributes for `Region` (e.g., US, UK, Emerging) and `ValuationMethod` (Live Ticker vs. Manual).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Analysis page loads and displays health score within 2 seconds for portfolios with <100 holdings.
- **SC-002**: 100% of detected concentration risks (defined as >15% single asset) trigger a corresponding recommendation card.
- **SC-003**: Rebalancing calculations (target vs current) are accurate to within 0.01% of total portfolio value.
- **SC-004**: Users can successfully identify their most significant portfolio risk within 10 seconds of viewing the page.