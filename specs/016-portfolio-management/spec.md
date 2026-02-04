# Feature Specification: Portfolio Management

**Feature Branch**: `016-portfolio-management`
**Created**: February 3, 2026
**Status**: Draft
**Input**: User description: "ability to manage multiple portfolios"

## Clarifications

### Session 2026-02-03

- Q: When a user attempts to delete their only remaining portfolio, what should happen? → A: Allow deletion with confirmation message
- Q: How should the system handle portfolio switching during an active CSV import operation? → A: Block switching - Disable portfolio selector and show "Import in progress" message until import completes
- Q: What should happen to active price polling when a user switches portfolios? → A: Switch immediately - Stop polling old portfolio's assets, immediately start polling new portfolio's assets
- Q: How should portfolios be ordered in the selector dropdown? → A: Most recently used first - Currently selected portfolio at top, then by last access time, with alphabetical fallback for never-accessed
- Q: Should page-level filters and sorting persist or reset when switching portfolios? → A: Preserve filter selections (type, search) and sort order, but reset date ranges and pagination to page 1

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Switch Between Existing Portfolios (Priority: P1)

As a user with multiple portfolios (e.g., taxable account, IRA, 401k), I want to quickly switch between them so I can view and manage each portfolio's holdings and performance independently.

**Why this priority**: Core missing functionality - users can currently create multiple portfolios (via CreatePortfolioDialog or CSV import), but cannot switch between them once created. This blocks users from managing their existing portfolios.

**Independent Test**: User with 3 portfolios clicks portfolio selector in header → sees dropdown list of all portfolios → selects "IRA Portfolio" → dashboard updates to show IRA holdings and metrics. Can be tested immediately without other stories.

**Acceptance Scenarios**:

1. **Given** I have 3 portfolios (Taxable, IRA, 401k), **When** I click the portfolio selector in the dashboard header, **Then** I see a dropdown menu listing all 3 portfolios with their names and types
2. **Given** I am viewing my Taxable portfolio, **When** I select "IRA" from the portfolio selector, **Then** the dashboard updates to show IRA holdings, transactions, and performance metrics
3. **Given** I switch from IRA to 401k portfolio, **When** the page reloads, **Then** the 401k portfolio remains selected (persistence)
4. **Given** I have selected a portfolio, **When** I navigate to Holdings, Transactions, or Performance pages, **Then** the selected portfolio remains active across all pages

---

### User Story 2 - View List of All Portfolios (Priority: P2)

As a user managing multiple portfolios, I want to view a list of all my portfolios with their key metrics so I can see my complete financial picture and navigate to specific portfolios.

**Why this priority**: Provides portfolio overview and navigation hub. Enhances US1 by giving users a dedicated management interface beyond the dropdown selector.

**Independent Test**: User navigates to /portfolios page → sees table/cards listing all portfolios with names, types, total values, and returns → clicks "View Details" on IRA portfolio → navigates to dashboard with IRA selected.

**Acceptance Scenarios**:

1. **Given** I have multiple portfolios, **When** I navigate to the Portfolios page (/portfolios), **Then** I see a list of all my portfolios showing: name, type, total value, and YTD return
2. **Given** I am on the Portfolios list page, **When** I click "View" on a specific portfolio, **Then** I navigate to the dashboard with that portfolio selected
3. **Given** I am viewing the portfolio list, **When** I click "Create New Portfolio", **Then** the CreatePortfolioDialog opens
4. **Given** I have no portfolios created, **When** I visit the Portfolios page, **Then** I see an empty state with a "Create Your First Portfolio" button

---

### User Story 3 - Edit Portfolio Settings (Priority: P3)

As a user, I want to edit my portfolio's name, type, and settings so I can keep my portfolio information accurate and customize behavior like rebalancing and dividend reinvestment.

**Why this priority**: Improves portfolio management but not blocking - users can work with portfolios as initially created. Adds flexibility for long-term management.

**Independent Test**: User opens portfolio settings → changes name from "Taxable" to "Main Taxable Account" → toggles dividend reinvestment ON → saves → name and setting persist.

**Acceptance Scenarios**:

1. **Given** I have a portfolio, **When** I open the Edit Portfolio dialog, **Then** I can change the portfolio name, type, currency, rebalance threshold, tax strategy, and dividend settings
2. **Given** I edit portfolio settings, **When** I save changes, **Then** the updated settings persist and apply to future operations (e.g., dividend reinvestment)
3. **Given** I have transactions in a portfolio, **When** I attempt to change the portfolio type from "taxable" to "IRA", **Then** I see a warning about tax implications and must confirm the change
4. **Given** I edit a portfolio's rebalance threshold, **When** I save the change, **Then** future rebalancing recommendations use the new threshold

---

### User Story 4 - Delete Portfolio (Priority: P4)

As a user, I want to delete portfolios I no longer need so I can remove closed accounts and keep my portfolio list clean.

**Why this priority**: Nice-to-have for cleanup but not essential for daily use. Most users won't frequently delete portfolios.

**Independent Test**: User with 3 portfolios opens delete dialog for "Test Portfolio" → confirms deletion with warning → portfolio is removed from database and dropdown list.

**Acceptance Scenarios**:

1. **Given** I have a portfolio with no holdings or transactions, **When** I click "Delete Portfolio", **Then** the portfolio is removed immediately after confirmation
2. **Given** I have a portfolio with existing transactions, **When** I attempt to delete it, **Then** I see a warning about losing transaction history and must type the portfolio name to confirm
3. **Given** I delete my currently selected portfolio, **When** the deletion completes, **Then** the system automatically switches to my most recently used portfolio (or shows empty state if no portfolios remain)
4. **Given** I have only one portfolio, **When** I attempt to delete it, **Then** I see a confirmation message warning this is my last portfolio, and if confirmed, the portfolio is deleted and I see the empty state with "Create Your First Portfolio" prompt

---

### Edge Cases

- **CSV Import in Progress**: Portfolio selector is disabled with "Import in progress" message displayed until import completes to prevent data corruption
- **Price Polling During Switch**: System immediately stops polling old portfolio's assets and starts polling new portfolio's assets for seamless transition
- **Page Filters and Sort**: When switching portfolios, filter selections (transaction type, search terms) and sort order are preserved, but date ranges reset to defaults and pagination returns to page 1
- What if a portfolio is deleted while another user/tab has it selected?
- What happens when switching to a portfolio with 10,000+ transactions (performance)?
- How does the system handle portfolio switching when navigating back/forward in browser history?
- What if a portfolio has been corrupted or has invalid data?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a portfolio selector component in the dashboard header that displays the current portfolio name and allows switching
- **FR-002**: Portfolio selector MUST display all portfolios with their name and type (e.g., "Main Portfolio - TAXABLE"), ordered by most recently used first (currently selected at top, then by last access time, with alphabetical fallback)
- **FR-003**: System MUST persist the selected portfolio across browser sessions
- **FR-004**: When a portfolio is selected, all pages (dashboard, holdings, transactions, performance, tax analysis) MUST display data for the selected portfolio only
- **FR-005**: System MUST provide a dedicated Portfolios management page at /portfolios route
- **FR-006**: Portfolios page MUST display: name, type, total value, YTD return, and action buttons (View, Edit, Delete)
- **FR-007**: System MUST allow editing portfolio properties: name, type, currency, rebalance threshold, tax strategy, auto-rebalance, dividend reinvestment
- **FR-008**: System MUST validate portfolio edits: name required, type from valid list (taxable/ira/401k/roth), positive rebalance threshold
- **FR-009**: System MUST warn users before changing portfolio type if transactions exist (tax implications)
- **FR-010**: System MUST support portfolio deletion with confirmation dialog
- **FR-011**: System MUST prevent accidental deletion by requiring portfolio name confirmation for portfolios with >10 transactions
- **FR-012**: When deleting currently selected portfolio, system MUST automatically switch to another portfolio or show empty state
- **FR-013**: Portfolio switching MUST update all dependent UI components: metrics cards, charts, tables, widgets
- **FR-014**: System MUST maintain portfolio selection state when navigating between pages
- **FR-015**: System MUST handle portfolio switching gracefully during ongoing operations (e.g., price polling, CSV import)
- **FR-016**: System MUST disable portfolio selector and display "Import in progress" message during active CSV import operations
- **FR-017**: When switching portfolios, system MUST immediately stop price polling for old portfolio's assets and start polling new portfolio's assets without delay
- **FR-018**: When switching portfolios, system MUST preserve filter selections (transaction type, search terms) and sort order, but reset date range filters to defaults and pagination to page 1

### Key Entities

- **Portfolio**: Represents a financial account (taxable, IRA, 401k, roth). Key attributes: id, name, type, currency, settings (rebalanceThreshold, taxStrategy, autoRebalance, dividendReinvestment), createdAt, updatedAt.
- **Portfolio Selection State**: Tracks which portfolio is currently active. Persisted across sessions. All data queries filter by portfolio identifier.
- **Portfolio Settings**: Configuration specific to each portfolio affecting behavior (rebalancing, tax calculations, dividend handling). Nested within Portfolio entity.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can switch between portfolios in under 2 seconds (from click to dashboard update)
- **SC-002**: Portfolio selection persists 100% across browser sessions (reload, close/reopen)
- **SC-003**: 95% of portfolio switches complete without requiring full page reload
- **SC-004**: Users can complete portfolio creation, switching, editing, and deletion workflows without errors 95% of the time
- **SC-005**: System supports managing 20+ portfolios without performance degradation in selector UI
- **SC-006**: Portfolio switching correctly updates all dashboard widgets within 1 second
- **SC-007**: Zero data leakage between portfolios (holdings/transactions from Portfolio A never appear when Portfolio B is selected)

## Assumptions *(optional)*

- Users typically manage 2-5 portfolios (taxable + retirement accounts), not dozens
- Portfolio switching happens infrequently (1-5 times per session, not constantly)
- Portfolio editing happens rarely (initial setup, then occasional updates)
- Portfolio deletion is infrequent (account closure, cleanup)
- Current portfolio selection is tied to browser/device (not synced across devices - no backend)
- Performance target: portfolio switching should feel instant (<2s including data loading)
- Portfolio selector will be positioned in dashboard header next to portfolio name badges (replacing current static display)
- Portfolios page will use table or card layout similar to existing Holdings/Transactions pages
- All portfolio data is stored locally on the user's device (no cloud synchronization)

## Out of Scope *(optional)*

- Portfolio merging or splitting
- Portfolio sharing or multi-user access (app is single-user, client-side only)
- Cross-portfolio analytics or aggregation (consolidated view across all portfolios)
- Portfolio templates or cloning
- Portfolio import/export (separate from transaction CSV import)
- Portfolio archiving (soft delete vs hard delete)
- Undo/redo for portfolio operations
- Portfolio-level permissions or access control
- Real-time portfolio synchronization across devices or browsers
- Portfolio performance comparison or benchmarking across portfolios
