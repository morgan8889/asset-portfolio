# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Feature #016: Portfolio Management (February 2026)

**Multi-Portfolio Support with Comprehensive CRUD Operations**

- **Portfolio Switching**: Dropdown selector in dashboard header sorted by recency
- **Portfolio Management Page** (`/portfolios`): Table view with real-time metrics
- **Create Portfolio**: Form with validation (name, type, currency, settings)
- **Edit Portfolio**: Pre-filled form with type change warnings for portfolios with transactions
- **Delete Portfolio**: Graduated confirmation system:
  - 0 transactions: Simple confirmation
  - 1-10 transactions: Checkbox confirmation
  - >10 transactions: Must type portfolio name exactly
- **Data Isolation**: Complete separation of holdings, transactions, and metrics per portfolio
- **Auto-Fallback**: Automatic portfolio selection when current portfolio is deleted
- **Recency Tracking**: `lastAccessedAt` timestamp for intelligent portfolio sorting

**Database**:
- Schema v5: Added `lastAccessedAt` field to portfolios table for recency sorting
- Reversible migration (v4→v5) with rollback support

**Components**:
- `PortfolioSelector`: Dropdown selector with disabled state during CSV import
- `PortfoliosTable`: Management table with View/Edit/Delete actions
- `CreatePortfolioDialog`: Dual-mode (create/edit) dialog with validation
- `DeletePortfolioDialog`: Graduated confirmation dialog based on transaction count

**Store Enhancements**:
- `setCurrentPortfolio()`: Updates lastAccessedAt timestamp
- `getSortedPortfolios()`: Returns portfolios sorted by recency
- `deletePortfolio()`: Auto-fallback to next most recently used portfolio
- `updatePortfolio()`: Updates portfolio with validation

**Testing**:
- 42+ unit tests (store actions, components, dialogs)
- 55+ E2E tests (switching, CRUD, data isolation, filter state preservation)
- Data isolation verification suite
- Filter state preservation tests across portfolio switches

**Navigation**:
- Added `/portfolios` route to portfolio management page
- Integrated portfolio selector in dashboard header
- Portfolio switching preserves page context

---

#### Phase 2: API Resilience Testing (February 2026)

**Price Source Testing & Coverage Improvement**

- 18 new unit tests for `price-sources.ts`
- Coverage improvement: 0% → 98.26%
- Retry logic validation
- Error handling verification
- Cache behavior testing
- Timeout handling tests

---

#### Feature #014: FIRE Planning (February 2026)

**Financial Independence Planning with Net Worth Tracking**

- Net worth calculation (assets - liabilities)
- Liability tracking (mortgages, loans, credit cards, debts)
- Payment history tracking for balance reconstruction
- Cash ledger system for all cash flows
- FIRE projection with scenario modeling
- Safe withdrawal rate calculations (4% rule)
- Years to FIRE estimates

**Database**:
- Schema v4: Added `liabilities` and `liabilityPayments` tables
- Payment tracking with principal/interest breakdown
- Indexed by liability ID and date

---

## [Earlier Releases]

### January 2026

#### Phase 1: Tax Logic Testing
- 47 new tests for tax calculation logic
- Coverage improvement: 30% → 90% for tax services
- FIFO cost basis method testing
- Holding period classification tests
- ESPP/RSU tax treatment validation

#### Feature #013: Tax Integration
- CSV import/export with tax fields (grantDate, vestDate, discount%, etc.)
- Tax exposure widget for dashboard
- Enhanced transaction forms with tax-specific fields

#### Feature #012: Tax Features
- ESPP purchase tracking with disqualifying disposition warnings
- RSU vest tracking with cost basis calculations
- Capital gains analysis (short-term/long-term)
- Tax lot aging alerts
- Holding period tracking

#### Code Simplification Initiative
- Extracted `price-sources.ts` module
- Removed 500+ lines of duplicate price fetching code
- Consolidated Sharpe ratio calculations
- Removed deprecated widgets

### December 2025

#### Feature #011: Export & Reporting
- PDF export for performance reports (jsPDF + html2canvas)
- CSV export for transactions and holdings
- Custom date range selection
- Formatted reports with charts

#### Feature #010: Asset Allocation
- Allocation planning with target percentages
- Rebalancing calculator
- Buy/sell recommendations
- Multi-dimensional allocation views (asset class, sector, geography)

### November 2025

#### Feature #007: 3-Year Performance Analysis
- Extended performance tracking to 3 years
- Historical performance charts
- Benchmark comparisons
- Risk metrics (Sharpe ratio, max drawdown)

#### Feature #005: Live Market Data
- Real-time price updates (15s-60s polling)
- UK market support (LSE, AIM with `.L` symbols)
- Price staleness detection (fresh/aging/stale)
- Offline resilience with IndexedDB cache
- Market hours awareness (NYSE, NASDAQ, LSE)

---

## Migration Guide

### v4 → v5 (Portfolio Management)

**Database Changes**:
- Added `lastAccessedAt` field to portfolios table
- New index on `lastAccessedAt` for efficient sorting

**Migration**:
```typescript
// Automatic migration on app start
// Adds lastAccessedAt = updatedAt || createdAt for existing portfolios
```

**Rollback** (if needed):
```typescript
// Run down migration to remove lastAccessedAt field
await runMigration('down', 2); // Migration version 2
```

**Breaking Changes**: None (backward compatible)

**Action Required**: None (migration runs automatically)

---

## Version History

- **v5.0.0** (Feb 2026): Multi-portfolio management with CRUD operations
- **v4.0.0** (Feb 2026): FIRE planning and net worth tracking
- **v3.0.0** (Jan 2026): Tax features (ESPP, RSU, capital gains)
- **v2.0.0** (Dec 2025): Allocation planning and export features
- **v1.0.0** (Nov 2025): Initial release with live market data

---

## Links

- [Project README](./README.md)
- [Developer Documentation](./CLAUDE.md)
- [Security Assessment](./SECURITY_ASSESSMENT_REPORT.md)
- [Development Guide](./README-DEVELOPMENT.md)
