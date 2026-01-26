# Feature Specification: Live Market Data for US and UK Markets

**Feature Branch**: `005-live-market-data`
**Created**: 2026-01-25
**Status**: Draft
**Input**: User description: "i want to use live market data for us and uk markets"

## Clarifications

### Session 2026-01-25

- Q: At what age should cached prices be marked as stale? → A: 2x the user's chosen update interval (adaptive threshold)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Real-Time Portfolio Value (Priority: P1)

As an investor with holdings in US and UK markets, I want to see my portfolio value update with live market prices so that I can make informed decisions based on current market conditions.

**Why this priority**: This is the core value proposition—users need to see accurate, current prices for their holdings to understand their portfolio's true worth.

**Independent Test**: Can be fully tested by adding a US stock (e.g., AAPL) and a UK stock (e.g., VOD.L) to a portfolio, then verifying the displayed prices match current market values within an acceptable delay.

**Acceptance Scenarios**:

1. **Given** a portfolio with US stocks, **When** I view the dashboard during US market hours, **Then** I see prices that reflect current market values with a visible timestamp showing when the price was last updated.

2. **Given** a portfolio with UK stocks (LSE-listed), **When** I view the dashboard during UK market hours, **Then** I see prices in the appropriate currency (GBP for LSE) with current market values.

3. **Given** a portfolio with mixed US and UK holdings, **When** markets are open, **Then** all prices update automatically without requiring manual refresh.

4. **Given** any portfolio, **When** I view a price, **Then** I can see how old the price data is (e.g., "Updated 30 seconds ago").

---

### User Story 2 - UK Market Symbol Recognition (Priority: P2)

As an investor with UK holdings, I want to search for and add UK-listed securities using their standard identifiers so that I can track my LSE, AIM, and other UK exchange holdings.

**Why this priority**: US symbols already work. UK market support requires recognizing UK-specific symbol formats and exchanges to expand coverage.

**Independent Test**: Can be fully tested by searching for "Vodafone" or "VOD.L" and successfully adding it to a portfolio with correct exchange identification.

**Acceptance Scenarios**:

1. **Given** I want to add a UK stock, **When** I search using the LSE symbol format (e.g., "VOD.L", "HSBA.L"), **Then** the system finds and displays the correct security with exchange identified.

2. **Given** I want to add a UK stock, **When** I search by company name (e.g., "Vodafone"), **Then** results include UK-listed securities clearly marked with their exchange.

3. **Given** I'm adding an AIM-listed security, **When** I use the AIM symbol format, **Then** the system recognizes and prices it correctly.

---

### User Story 3 - Price Update Frequency Control (Priority: P2)

As a user, I want to control how frequently prices update so that I can balance between data freshness and system resource usage.

**Why this priority**: Different users have different needs—active traders want frequent updates while long-term investors may prefer less frequent updates to reduce data usage.

**Independent Test**: Can be fully tested by changing the update frequency setting and verifying that price updates occur at the new interval.

**Acceptance Scenarios**:

1. **Given** I'm in settings, **When** I select a price update interval, **Then** I can choose from options including real-time (every 15-30 seconds), frequent (every 1 minute), standard (every 5 minutes), or manual only.

2. **Given** I've set a specific update frequency, **When** viewing my portfolio, **Then** prices update according to my chosen interval.

3. **Given** I want to conserve resources, **When** I choose manual-only updates, **Then** prices only refresh when I explicitly request it.

---

### User Story 4 - Market Hours Awareness (Priority: P3)

As an investor, I want the system to indicate market status (open/closed) so that I understand when prices are live versus last closing prices.

**Why this priority**: Understanding market hours helps users interpret price movements and set expectations for when updates will occur.

**Independent Test**: Can be fully tested by viewing the portfolio outside market hours and verifying appropriate status indicators are shown.

**Acceptance Scenarios**:

1. **Given** US markets are closed, **When** I view US holdings, **Then** I see an indicator that the market is closed and prices reflect the last closing price.

2. **Given** UK markets are in pre-market, **When** I view UK holdings, **Then** I see the market state (pre-market, regular, post-market, closed).

3. **Given** I have holdings across time zones, **When** I view my portfolio, **Then** each holding shows its relevant market status.

---

### User Story 5 - Graceful Degradation (Priority: P3)

As a user, I want the application to handle data provider outages gracefully so that I can still use the app even when live data is temporarily unavailable.

**Why this priority**: Ensures reliability and trust—users should never be blocked from viewing their portfolio due to external service issues.

**Independent Test**: Can be fully tested by simulating a network disconnection and verifying the app displays cached prices with appropriate staleness warnings.

**Acceptance Scenarios**:

1. **Given** the price data provider is unavailable, **When** I view my portfolio, **Then** I see the last known prices with a clear indicator that they may be stale.

2. **Given** prices exceed 2x my configured update interval, **When** I view a holding, **Then** I see a staleness warning indicating the price data age.

3. **Given** a temporary outage resolves, **When** data becomes available again, **Then** prices resume updating automatically.

---

### Edge Cases

- What happens when a symbol exists on both US and UK exchanges with the same ticker?
  - System uses the symbol suffix (.L for London) to disambiguate, or prompts user to select exchange when ambiguous.

- How does the system handle UK securities priced in pence vs pounds?
  - Prices are normalized to pounds for display consistency, with clear indication of the unit.

- What happens when markets are closed for holidays?
  - Display last trading day's closing price with clear indication of the closure.

- How are ADRs (American Depositary Receipts) of UK companies handled?
  - ADRs trading on US exchanges use US pricing; users can track the underlying UK security separately if desired.

- What happens when the user's device goes offline?
  - Continue displaying last known prices with offline indicator; sync when connection restores.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch live price data for securities listed on major US exchanges (NYSE, NASDAQ, AMEX).

- **FR-002**: System MUST fetch live price data for securities listed on UK exchanges (LSE, AIM).

- **FR-003**: System MUST recognize UK symbol formats including the ".L" suffix for LSE-listed securities.

- **FR-004**: System MUST display the timestamp of the last price update for each holding.

- **FR-005**: System MUST indicate the current market state (pre-market, regular hours, post-market, closed) for each exchange.

- **FR-006**: System MUST allow users to configure price update frequency with at least three options (e.g., real-time, standard, manual).

- **FR-007**: System MUST cache price data locally to enable offline viewing and reduce external requests.

- **FR-008**: System MUST handle UK prices quoted in pence by converting to pounds for display.

- **FR-009**: System MUST provide visual indication when displayed prices are stale, defined as exceeding 2x the user's configured update interval.

- **FR-010**: System MUST support batch price requests to efficiently update multiple holdings simultaneously.

- **FR-011**: System MUST maintain existing cryptocurrency price support.

- **FR-012**: System MUST preserve existing rate limiting to prevent overuse of external price services.

### Key Entities

- **Market**: Represents a trading venue (NYSE, NASDAQ, LSE, AIM) with attributes including name, country, timezone, trading hours, and symbol suffix conventions.

- **PriceUpdate**: Represents a real-time price event with symbol, price, currency, timestamp, market state, and change metrics.

- **UserPricePreferences**: User settings for price updates including refresh interval and display preferences.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view current prices for both US and UK securities within their chosen update interval (default: under 5 minutes old during market hours).

- **SC-002**: UK securities are correctly identified and priced with 99% accuracy when using standard symbol formats.

- **SC-003**: The portfolio dashboard loads with price data in under 3 seconds when prices are cached.

- **SC-004**: Users can identify at a glance whether displayed prices are live, delayed, or stale through clear visual indicators.

- **SC-005**: The application remains fully functional (display cached prices, record transactions) when external price services are unavailable.

- **SC-006**: Price updates for a portfolio of up to 50 holdings complete within 10 seconds when fetching fresh data.

## Assumptions

- Users understand the difference between live and delayed quotes based on their data source.
- UK market hours are 8:00 AM - 4:30 PM GMT; US market hours are 9:30 AM - 4:00 PM ET.
- Free tier data access provides 15-minute delayed quotes, which is acceptable for most retail investors.
- The existing rate limiting configuration is sufficient for typical usage patterns.
- Users with UK holdings will use standard LSE symbol formats (SYMBOL.L) for unambiguous identification.
