# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
```bash
# Start development server
npm run dev                   # Runs Next.js dev server on http://localhost:3000

# Type checking
npm run type-check            # Check TypeScript types without emitting files

# Code quality
npm run lint                  # Run ESLint
npm run lint:fix              # Run ESLint with auto-fix
npm run format                # Format code with Prettier
npm run format:check          # Check code formatting
```

### Testing
```bash
# Unit tests
npm run test                  # Run Vitest tests once
npm run test:watch            # Run Vitest in watch mode
npm run test:ui               # Open Vitest UI
npm run test:coverage         # Generate test coverage report

# E2E tests
npm run test:e2e              # Run Playwright E2E tests
npm run test:e2e:ui           # Open Playwright test runner UI

# Run specific E2E test file
npx playwright test tests/e2e/portfolio-dashboard.spec.ts
```

### Production
```bash
npm run build                 # Build production bundle
npm run start                 # Start production server
```

## Architecture Overview

This is a **privacy-first financial portfolio tracker** built with Next.js 14 App Router. Key architectural decisions:

### Data Storage Strategy
- **Local-First**: All financial data is stored in the browser's IndexedDB via Dexie.js
- **No Backend Database**: Intentionally designed without server-side persistence for privacy
- **Price API Proxying**: External market data APIs are proxied through Next.js API routes to protect API keys

### Core Technology Stack
- **Frontend Framework**: Next.js 14 with App Router (not Pages Router)
- **UI Components**: shadcn/ui (Radix UI primitives + Tailwind)
- **State Management**: Zustand stores in `src/lib/stores/`
- **Local Database**: Dexie.js wrapper around IndexedDB
- **Charts**: Recharts for interactive charts, Tremor for dashboard metrics
- **Forms**: React Hook Form + Zod validation
- **Math**: decimal.js for financial precision calculations

### Application Structure
```
src/
├── app/                      # Next.js App Router
│   ├── (dashboard)/         # Dashboard route group
│   │   ├── page.tsx        # Main dashboard
│   │   ├── holdings/       # Holdings management
│   │   ├── transactions/   # Transaction tracking
│   │   └── analysis/       # Portfolio analytics
│   └── api/                 # API routes
│       └── prices/         # Price data fetching
├── components/              # React components
│   ├── ui/                 # shadcn/ui base components
│   ├── charts/             # Chart components
│   ├── forms/              # Form components
│   └── layout/             # Layout components
├── lib/                     # Core application logic
│   ├── db/                 # Dexie database layer
│   │   ├── schema.ts      # Database schema
│   │   ├── queries.ts     # Database queries
│   │   └── migrations.ts  # Schema migrations
│   ├── stores/             # Zustand state stores
│   │   ├── portfolio.ts   # Portfolio state
│   │   ├── asset.ts       # Asset management
│   │   ├── transaction.ts # Transaction state
│   │   └── ui.ts          # UI state
│   ├── services/           # Business logic
│   └── utils/              # Utilities
└── types/                   # TypeScript type definitions
```

### Key Patterns

#### Database Operations
All database operations go through Dexie.js in `src/lib/db/`. The schema is defined in `schema.ts` with these main tables:
- `portfolios`: Investment portfolios
- `assets`: Stocks, ETFs, crypto, etc.
- `holdings`: Current positions
- `transactions`: Buy/sell/dividend records
- `priceHistory`: Historical price data cache
- `userSettings`: User preferences

#### State Management
Zustand stores provide global state management with TypeScript support. Key stores:
- **portfolioStore**: Active portfolio, portfolio list
- **assetStore**: Asset data, price updates
- **transactionStore**: Transaction history
- **uiStore**: UI state, modals, notifications

#### API Routes
Price data fetching happens through Next.js API routes in `src/app/api/prices/`:
- Proxies requests to Yahoo Finance, Alpha Vantage, CoinGecko
- Implements rate limiting and caching
- Returns standardized price format

#### Component Architecture
- **Server Components**: Default for pages, layouts
- **Client Components**: Use `'use client'` directive for:
  - Interactive forms and modals
  - Charts and visualizations
  - State-dependent UI

### Import Paths
The project uses TypeScript path aliases:
- `@/*` → `src/*`
- `@/components/*` → `src/components/*`
- `@/lib/*` → `src/lib/*`
- `@/types/*` → `src/types/*`

### Testing Strategy
- **Unit Tests**: Vitest for services and utilities
- **E2E Tests**: Playwright for user workflows in `tests/e2e/`
- **Test Data**: Use factories for consistent test data
- **Coverage**: Aim for 70%+ coverage on business logic

### Financial Calculations
All monetary calculations use `decimal.js` to avoid floating-point errors:
```typescript
import Decimal from 'decimal.js';

// Always use Decimal for money
const total = new Decimal(price).mul(quantity);
const taxAmount = total.mul(taxRate);
```

### Development Guidelines

#### Adding New Features
1. Define types in `src/types/`
2. Update database schema if needed
3. Create/update Zustand store
4. Build UI components with shadcn/ui primitives
5. Add appropriate tests

#### Performance Considerations
- Use React.memo for expensive chart components
- Implement virtual scrolling for large lists with react-window
- Cache price data in IndexedDB to reduce API calls
- Use Next.js Image component for optimized loading

#### Security Notes
- API keys stored in environment variables only
- All external API calls proxied through backend
- Input validation with Zod schemas
- XSS protection via React's default escaping

## Code Quality & Simplification Initiative

A comprehensive codebase refactoring effort to improve maintainability, type safety, and reduce complexity.

### Documentation
See `docs/planning/` for detailed analysis and implementation tracking:
- **codebase-simplification-analysis.md**: Complete analysis of 261 TypeScript/TSX files
- **README.md**: Initiative overview, phases, and metrics
- **TODO.md**: 5-phase task breakdown with progress tracking

### Completed Improvements (Phase 2)

**Price Fetching Deduplication** (~500 lines removed)
- Created shared `src/lib/services/price-sources.ts` module (344 lines)
- Refactored API routes to use shared logic:
  - `src/app/api/prices/[symbol]/route.ts` (232 lines removed)
  - `src/app/api/prices/batch/route.ts` (284 lines removed)
- Unified retry logic, caching, and error handling

**Code Cleanup**
- Removed deprecated widget wrappers (top-performers, biggest-losers)
- Consolidated Sharpe ratio calculations
- Standardized console logging in migrations

### Price Sources Module

The `price-sources.ts` module provides centralized price fetching:

```typescript
// Shared types
export interface PriceMetadata {
  currency: string;
  marketState?: string;
  change?: number;
  changePercent?: number;
}

export interface PriceResult {
  price: number;
  metadata?: PriceMetadata;
}

// Price source registry
export const priceSources: PriceSource[] = [
  yahooFinanceSource,
  coinGeckoSource,
  alphaVantageSource,
];

// Main function - tries all sources with retries
export async function fetchPriceWithRetry(
  symbol: string
): Promise<PriceResult>;
```

**Benefits:**
- Single source of truth for price fetching
- Consistent retry and timeout handling
- Centralized caching logic
- Easier testing and maintenance

### Ongoing Work
See `TODO.md` Code Quality & Simplification section for remaining phases:
- Phase 1: Type Safety improvements
- Phase 3: Complexity reduction (split large files)
- Phase 4: Consistency (logging, patterns)
- Phase 5: Cleanup (dead code, unused exports)

**Target Metrics:**
- 87% reduction in duplicated code ✅ (Phase 2 complete)
- 87% reduction in `any` usage (in progress)
- 75% reduction in files >500 lines (in progress)

## CSV Transaction Import

The CSV import feature allows bulk importing transactions from CSV files with auto-detection and validation.

### Architecture
```
src/lib/services/
├── csv-parser.ts         # PapaParse wrapper for parsing CSV files
├── column-detector.ts    # Auto-detect column mappings from headers
├── csv-validator.ts      # Row-level validation with error reporting
└── csv-importer.ts       # Orchestrates the full import workflow

src/lib/stores/
└── csv-import.ts         # Zustand store for import state management

src/components/forms/
├── csv-import-dialog.tsx      # Main import dialog orchestrating the flow
├── csv-file-upload.tsx        # Drag-drop file upload with validation
├── import-preview-table.tsx   # Preview of parsed data
├── column-mapping-editor.tsx  # Manual column mapping correction
├── duplicate-review.tsx       # Review and handle duplicate transactions
└── import-results.tsx         # Success/error summary with download option
```

### Import Flow
1. **File Upload**: User selects/drops CSV file (max 5MB)
2. **Parsing**: PapaParse extracts headers and rows with delimiter auto-detection
3. **Column Detection**: Headers matched against known patterns (Date, Symbol, Quantity, etc.)
4. **Validation**: Each row validated with detailed error messages
5. **Duplicate Detection**: Cross-reference with existing transactions
6. **Import**: Valid rows added to database with progress tracking

### Supported Date Formats
- ISO 8601: `yyyy-MM-dd`, `yyyy/MM/dd`
- US Format: `MM/dd/yyyy`, `M/d/yyyy`
- EU Format: `dd/MM/yyyy`, `d/M/yyyy`
- Written: `January 15, 2025`, `Jan 15, 2025`

### Testing CSV Import
```bash
# Unit tests (103 tests)
npm run test -- src/lib/services/__tests__/csv*.test.ts src/lib/utils/__tests__/date-parser.test.ts

# E2E tests
npm run test:e2e -- tests/e2e/csv-import.spec.ts
```

## E2E Testing Notes

Playwright tests cover comprehensive user workflows (31 test files):

**Dashboard & Layout (14 tests):**
- dashboard-rgl.spec.ts, dashboard-configuration.spec.ts
- dashboard-dense-packing.spec.ts, dashboard-display.spec.ts
- dashboard-performance.spec.ts, dashboard-performers.spec.ts
- dashboard-responsive.spec.ts, dashboard-time-period.spec.ts
- dashboard-chart.spec.ts, dashboard-settings-viewport.spec.ts
- portfolio-dashboard.spec.ts, loading-state-regression.spec.ts
- mock-data-flow.spec.ts, navigation-bug.spec.ts

**Holdings & Transactions (6 tests):**
- holdings-table.spec.ts, holdings-performance.spec.ts
- holdings-data-loading.spec.ts, transaction-management.spec.ts
- property-addition.spec.ts, real-estate-filter.spec.ts

**Analysis & Pricing (5 tests):**
- analysis.spec.ts, analysis-manual-price.spec.ts
- analysis-region-override.spec.ts, price-refresh.spec.ts
- performance-analytics.spec.ts

**Charts & Visualization (2 tests):**
- charts-visualization.spec.ts, category-breakdown-pie.spec.ts

**Import/Export (2 tests):**
- csv-import.spec.ts, export-reports.spec.ts

**Settings & Allocation (2 tests):**
- settings-verification.spec.ts, allocation-responsive-layout.spec.ts

Tests run against the dev server by default. The Playwright config automatically starts the dev server before tests.

Run with: `npm run test:e2e` (auto-starts dev server)
Run specific: `npx playwright test tests/e2e/[name].spec.ts`

## Verification Patterns

### Quick Verification (MCP Playwright)
Use MCP Playwright tools for fast 2-5 second verification during development:
1. `browser_navigate('/test')` - Go to test page
2. `browser_click('Generate Mock Data')` - Trigger data generation
3. `browser_wait_for(text: '/', timeout: 10000)` - Wait for redirect
4. `browser_snapshot()` - Verify no "Loading" text, widgets visible

### Regression Testing (CLI Playwright)
Run focused tests before commits:
```bash
npx playwright test tests/e2e/loading-state-regression.spec.ts --project=chromium
```

### Key Testing Principles
- **Use hard timeouts (5s)**: Fail fast if loading stuck, don't use long 15s+ timeouts
- **Avoid conditional logic**: `if (loading.isVisible())` masks failures - always assert
- **Verify real data**: Check for $X.XX format, not $0.00 or empty state
- **Test page reload**: Exercises persist middleware rehydration path

### UI Feature Development Workflow

**CRITICAL**: For any UI feature with multiple visual states/modes, use this workflow:

```
Make change → Build → Screenshot ALL modes → Self-verify → Fix if broken → THEN present to user
```

**Before telling user "done" on UI features:**
1. Start dev server if not running
2. Use MCP Playwright to navigate to affected page
3. Screenshot each visual state/configuration
4. Verify no visual regressions or cutoffs
5. Check browser console for errors
6. Only then present results to user

**For features with conditional display logic** (e.g., widget sizes, responsive layouts):
- Create explicit decision matrix during planning:
  ```
  | Condition | Expected Visual Result |
  |-----------|----------------------|
  | 1×1       | Compact, no chart    |
  | 1×4+      | Stacked with chart   |
  | 2×2+      | Side-by-side         |
  ```
- Screenshot EACH configuration before claiming completion
- If user introduces new terminology (e.g., "compact view"), immediately ask for precise definition

**Anti-pattern to avoid:**
```
Make change → Tell user "done" → User finds visual issue → Repeat
```

## Common Debugging Scenarios

### IndexedDB Issues
- Use browser DevTools → Application → IndexedDB to inspect data
- Clear IndexedDB: `await Dexie.delete('PortfolioTrackerDB')`

### State Management Debugging
- Zustand DevTools: Install zustand/devtools for Redux DevTools support
- Check store state: `const state = usePortfolioStore.getState()`

### Price API Failures
- Check rate limits in `src/lib/utils/rate-limit.ts`
- Verify API keys in `.env.local`
- Fallback to manual price entry if APIs fail

## Active Technologies

**Core Stack:**
- TypeScript 5.3 with Next.js 14.2 (App Router) + React 18
- Zustand 4.5 for state management
- Dexie.js 3.2 for IndexedDB persistence (privacy-first, browser-only)
- shadcn/ui + Tailwind CSS for UI components
- Zod for validation, decimal.js for financial precision calculations

**UI/UX:**
- Recharts 2.15 for interactive charts
- @dnd-kit/core 6.3+ and @dnd-kit/sortable 10.0+ for drag-drop
- react-grid-layout for responsive dashboard layouts
- react-window for virtual scrolling of large lists

**Data Processing:**
- PapaParse 5.4 for CSV parsing and import
- date-fns for date manipulation
- jsPDF 4.0 + html2canvas 1.4 for PDF export generation

**Development:**
- Vitest for unit testing
- Playwright for E2E testing
- ESLint + Prettier for code quality

## Recent Changes

**Foundation Features (Early 2025):**
- 001-csv-transaction-import: CSV parsing with PapaParse, date-parser, import workflow
- 002-portfolio-dashboard: Recharts 2.15, dnd-kit drag-drop widgets

**Dashboard Enhancements:**
- 003-dashboard-stacking-layout: Widget stacking with dnd-kit
- 004-grid-dense-packing: Optimized grid layout with dense packing

**Market Data & Analytics:**
- 005-live-market-data: Real-time prices, UK market support, staleness detection
- 006-performance-analytics: Time-weighted returns, performance tracking
- 007-performance-3yr-view: Extended 3-year analysis

**Advanced Features:**
- 008-financial-analysis: Financial metrics and analysis tools
- 009-holdings-property: Real estate holdings with rental yield calculations
- 010-allocation-planning: Asset allocation with rebalancing

**Reporting & Code Quality:**
- 011-export-functionality: PDF/CSV export with jsPDF and html2canvas
- **Code Simplification**: Extracted price-sources.ts, removed 500+ duplicate lines, cleaned up deprecated code (January 2026)

## Live Market Data Feature (005)

### Overview
The live market data feature provides real-time price updates for US and UK markets with automatic polling, staleness detection, and offline resilience.

### Key Components
- **Price Store** (`src/lib/stores/price.ts`): Zustand store managing price data, polling infrastructure, and user preferences
- **Market Hours Service** (`src/lib/services/market-hours.ts`): Calculates market state (PRE/REGULAR/POST/CLOSED) with timezone awareness
- **Price Display** (`src/components/dashboard/price-display.tsx`): Displays live prices with staleness indicators and timestamps
- **Price Settings** (`src/components/settings/price-settings.tsx`): UI for configuring update frequency and display options

### UK Market Support
- Symbols ending in `.L` are recognized as London Stock Exchange (LSE) symbols (e.g., `VOD.L`, `HSBA.L`)
- Automatic pence-to-pounds conversion for stocks quoted in GBp
- Exchange badges displayed in holdings table (LSE, AIM)

### Price Update Intervals
- **Realtime**: 15 seconds (for active traders)
- **Frequent**: 30 seconds (balanced updates)
- **Standard**: 60 seconds (recommended for most users)
- **Manual**: No automatic updates (user triggers refresh)

### Staleness Detection
Staleness is calculated based on data age relative to the configured refresh interval:
- **Fresh** (green): Data is current (age < interval)
- **Aging** (yellow): Data is getting old (interval ≤ age < 2x interval)
- **Stale** (red): Data needs refresh (age ≥ 2x interval)

### Offline Resilience
- Price cache persisted to IndexedDB for offline access
- Offline indicator shown in header when network unavailable
- Automatic polling resume when connection restored
- Graceful degradation with cached data fallback on API errors

### Market Hours
Market state is calculated with timezone awareness:
- US Markets (NYSE/NASDAQ): ET timezone, 9:30 AM - 4:00 PM
- UK Markets (LSE/AIM): GMT/BST timezone, 8:00 AM - 4:30 PM

### Testing
```bash
# Run market data unit tests
npm run test -- --run src/lib/utils/__tests__/market-utils.test.ts src/lib/utils/__tests__/staleness.test.ts src/lib/services/__tests__/market-hours.test.ts

# Run E2E price refresh tests
npx playwright test tests/e2e/price-refresh.spec.ts --project=chromium
```

## Tax Data Integration Feature (013)

### Overview
The tax data integration feature enables comprehensive tax tracking for stock compensation (ESPP, RSU) and capital gains analysis. It extends the CSV import/export system with tax-specific fields and adds tax exposure visualization to the dashboard and analysis pages.

### Key Components
- **Tax Calculator** (`src/lib/services/tax-calculator.ts`): Core tax calculation engine with holding period analysis, aging lot detection, and tax exposure metrics
- **Tax Settings Store** (`src/lib/stores/tax-settings.ts`): Zustand store managing tax rates (default: ST 24%, LT 15%)
- **Tax Exposure Widget** (`src/components/dashboard/widgets/tax-exposure-widget.tsx`): Dashboard widget displaying estimated tax liability and aging lots
- **Tax Formatters** (`src/lib/utils/tax-formatters.ts`): Utilities for formatting currency, percentages, and holding periods

### Tax Field Definitions

The following optional fields are available on Transaction records:

- **grantDate**: ESPP purchase date or RSU award date (must be ≤ today)
- **vestingDate**: When shares became owned (must be ≥ grantDate, ≤ today)
- **discountPercent**: ESPP discount percentage as decimal (0.0-0.5 range, e.g., 0.15 for 15%)
- **sharesWithheld**: Number of shares withheld for taxes (must be ≤ quantity)
- **ordinaryIncomeAmount**: W-2 taxable compensation including bargain element (must be ≥ 0)

All tax fields use `Decimal.js` for precision calculations.

### CSV Import with Tax Fields

The CSV import system automatically detects tax-related columns:

**Supported Header Patterns:**
- Grant Date: `grant_date`, `grantdate`, `award_date`, `purchase_date`, `option_date`
- Vesting Date: `vesting_date`, `vest_date`, `release_date`, `settlement_date`
- Discount: `discount`, `discount %`, `espp discount`, `purchase discount`
- Shares Withheld: `shares withheld`, `tax shares`, `shares sold to cover`, `withheld`
- Ordinary Income: `ordinary income`, `w2 income`, `compensation income`, `taxable income`

**Import Behavior:**
- If `sharesWithheld` column is mapped, the system assumes **Gross shares** input and automatically calculates net shares
- Validation enforces business rules (e.g., grantDate ≤ vestingDate ≤ transactionDate)
- All tax fields are optional and backward-compatible with existing transactions

**Example CSV with Tax Fields:**
```csv
Date,Symbol,Type,Quantity,Price,Grant Date,Vesting Date,Discount %,Shares Withheld,Ordinary Income
2025-01-15,ACME,Buy,100,50.00,2024-01-15,2025-01-15,15,22,1100.00
2025-02-01,ACME,Sell,50,55.00,,,,
```

### Export with Tax Data

Both transaction and holdings exports include tax-related columns:

**Transaction Export Columns** (5 tax columns added):
- `grantDate`: Formatted as `yyyy-MM-dd`
- `vestDate`: Formatted as `yyyy-MM-dd`
- `discountPercent`: Formatted as `##.##%`
- `sharesWithheld`: Formatted as `#,###.####`
- `ordinaryIncome`: Formatted as `$#,###.##`

**Holdings Export Columns** (5 tax columns added):
- `holdingPeriod`: `ST` (Short-Term), `LT` (Long-Term), or `Mixed`
- `shortTermGain`: Unrealized gains on lots held ≤365 days
- `longTermGain`: Unrealized gains on lots held >365 days
- `estimatedTax`: ST × STrate + LT × LTrate
- `basisAdjustment`: For ESPP disqualifying dispositions

### Tax Exposure Widget

The Tax Exposure widget displays on the dashboard and shows:
- **Estimated Tax Liability**: Total potential tax bill on unrealized gains
- **Short-Term Gains**: Gains taxed at ordinary income rates (default 24%)
- **Long-Term Gains**: Gains taxed at preferential rates (default 15%)
- **Aging Lots Alert**: Number of lots becoming long-term within 30 days

**Performance Target**: Renders in <200ms for portfolios with 500+ holdings

### Tax Lot Aging Recommendations

The analysis engine detects holdings approaching long-term capital gains status:
- **Detection Window**: 30 days before a lot becomes long-term (held >365 days)
- **Recommendation Type**: `tax_lot_aging`
- **Severity**: High if ≤7 days, Medium if 8-30 days
- **Metadata**: Includes asset symbol, aging lots count, days until LT, and potential savings

**Business Rule**: Long-term status = held >365 days from purchase date

### Tax Settings Configuration

Default tax rates (configurable via tax settings store):
- **Short-Term Rate**: 24% (ordinary income tax rate)
- **Long-Term Rate**: 15% (long-term capital gains rate)

Users can customize these rates based on their tax bracket.

### Testing Tax Features

```bash
# Run tax calculator unit tests
npm run test -- --run src/lib/services/__tests__/tax-calculator.test.ts

# Run CSV import with tax field tests
npm run test -- --run src/lib/services/__tests__/column-detector.test.ts src/lib/services/__tests__/csv-validator.test.ts

# Run export service tests
npm run test -- --run src/lib/services/__tests__/export-service.test.ts

# Run tax widget tests
npm run test -- --run src/components/dashboard/widgets/__tests__/tax-exposure-widget.test.tsx

# Run E2E tax import tests (when available)
npx playwright test tests/e2e/csv-import-tax.spec.ts --project=chromium

# Run E2E tax export tests (when available)
npx playwright test tests/e2e/export-tax-data.spec.ts --project=chromium
```

### Common Tax Scenarios

**ESPP Purchase (Qualified Holding):**
```csv
Date,Symbol,Type,Quantity,Price,Grant Date,Discount %,Ordinary Income
2025-01-15,ACME,Buy,100,42.50,2024-07-15,15,750.00
```
- Grant Date: Offering period start (6 months before purchase)
- Discount: 15% ESPP discount
- Ordinary Income: (FMV - Discounted Price) × Quantity = $750

**RSU Vest (Net Shares):**
```csv
Date,Symbol,Type,Quantity,Price,Vesting Date,Shares Withheld,Ordinary Income
2025-02-01,ACME,Buy,78,50.00,2025-02-01,22,5000.00
```
- Quantity: Net shares received after withholding
- Shares Withheld: Sold to cover taxes (gross = 78 + 22 = 100)
- Ordinary Income: FMV at vest × Gross shares = $5,000

**Tax Loss Harvesting:**
The analysis engine will recommend waiting to sell lots approaching long-term status, potentially saving the difference between ordinary income and long-term capital gains rates (e.g., 24% - 15% = 9% savings).

### Privacy & Security

All tax data is stored **locally in IndexedDB only**:
- No server-side persistence or transmission of sensitive tax information
- Tax calculations performed entirely in the browser
- Export functionality creates local files only (no uploads)

### Architecture Notes

**Type Safety:**
- All tax fields are optional (`?:`) for backward compatibility
- Type guards available: Check for tax metadata presence before accessing
- No `any` types used in tax calculation code

**Decimal Precision:**
- All monetary calculations use `Decimal.js` to avoid floating-point errors
- Tax rates stored as decimals (0.24, not 24)
- Percentages converted during display only

**Performance Optimizations:**
- Tax exposure calculations memoized with `useMemo` in dashboard
- Aging lot detection runs only when holdings or prices change
- IndexedDB compound indexes available for future optimization
