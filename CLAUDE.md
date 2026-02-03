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
All database operations go through Dexie.js in `src/lib/db/`. The schema is defined in `schema.ts` (current version: v4) with these tables:

**Core Tables:**
- `portfolios`: Investment portfolios
- `assets`: Stocks, ETFs, crypto, real estate
- `holdings`: Current positions with tax lot tracking
- `transactions`: Buy/sell/dividend records with tax metadata

**Tax & Performance Tables:**
- `priceHistory`: Historical price data cache
- `priceSnapshots`: Real-time price snapshots with market state
- `dividendRecords`: Dividend payment tracking

**Planning Tables (v4):**
- `liabilities`: Mortgages, loans, credit cards for net worth tracking
- `liabilityPayments`: Payment history for accurate balance reconstruction

**Performance & Settings:**
- `performanceSnapshots`: Historical performance data
- `userSettings`: User preferences and configuration

#### State Management

Zustand stores provide global state management with TypeScript support. The application uses 13 specialized stores for different domains.

**Store Reference:**

**Core Portfolio Stores:**
- **portfolioStore** (`src/lib/stores/portfolio.ts`): Portfolio CRUD, holdings management, asset tracking
  - State: portfolios, currentPortfolio, holdings, assets, metrics
  - Actions: loadPortfolios(), createPortfolio(), loadHoldings(), calculateMetrics()
  - Persistence: currentPortfolio only
  - Usage: Primary store for portfolio operations

- **assetStore** (`src/lib/stores/asset.ts`): Asset management and data
  - State: Asset metadata, prices, exchange information
  - Actions: Asset CRUD operations
  - Usage: Manage individual asset definitions

- **transactionStore** (`src/lib/stores/transaction.ts`): Transaction history and CRUD
  - State: Transaction list, filters
  - Actions: createTransaction(), updateTransaction(), deleteTransaction()
  - Usage: Buy/sell/dividend transaction management

- **performance** (`src/lib/stores/performance.ts`): Performance data and calculations
  - State: Performance metrics, benchmarks, time-weighted returns
  - Actions: calculatePerformance(), loadBenchmarks()
  - Usage: Portfolio performance analytics

**Market Data Stores:**
- **priceStore** (`src/lib/stores/price.ts`): Live price polling and market data
  - State: livePriceData, pollingEnabled, updatePreferences
  - Actions: startPolling(), stopPolling(), refreshPrice(), updatePreferences()
  - Persistence: updatePreferences
  - Features: Automatic price polling (15s-60s intervals), staleness detection, offline handling
  - Usage: Real-time price updates for US/UK markets

**Tax & Planning Stores:**
- **taxSettingsStore** (`src/lib/stores/tax-settings.ts`): Tax rate configuration
  - State: shortTermRate (default 24%), longTermRate (default 15%)
  - Actions: setShortTermRate(), setLongTermRate(), resetToDefaults()
  - Persistence: localStorage
  - Usage: User tax rate preferences for capital gains estimates

- **planningStore** (`src/lib/stores/planning.ts`): FIRE planning and liability management
  - State: fireConfig, liabilities, scenarios, liabilityPayments
  - Actions: addLiability(), recordPayment(), updateFireConfig(), createScenario()
  - Features: Net worth tracking, FIRE calculations, scenario modeling
  - Usage: Financial independence planning and debt tracking

- **allocation** (`src/lib/stores/allocation.ts`): Asset allocation and rebalancing
  - State: Target allocations, current allocations, rebalancing suggestions
  - Actions: setTargetAllocation(), calculateDrift(), getRebalancingPlan()
  - Usage: Asset allocation planning and monitoring

**Dashboard & Analysis Stores:**
- **dashboardStore** (`src/lib/stores/dashboard.ts`): Dashboard widget configuration
  - State: Widget visibility, order, layout, time periods
  - Actions: setWidgetVisibility(), setTimePeriod(), setLayoutMode()
  - Persistence: IndexedDB via dashboardConfigService
  - Features: react-grid-layout integration, dense packing, responsive layouts
  - Usage: Dashboard personalization and layout management

- **analysisStore** (`src/lib/stores/analysis.ts`): Analysis state management
  - State: Analysis results, filters, selected metrics
  - Actions: runAnalysis(), setFilters()
  - Usage: Portfolio analysis views

**UI & Workflow Stores:**
- **uiStore** (`src/lib/stores/ui.ts`): UI state, modals, notifications
  - State: Modal state, notification queue, loading indicators
  - Actions: showModal(), hideModal(), addNotification(), clearNotifications()
  - Usage: Global UI state coordination

- **csvImportStore** (`src/lib/stores/csv-import.ts`): CSV import workflow state
  - State: Import progress, column mappings, validation errors
  - Actions: setFile(), setMappings(), startImport(), resetState()
  - Features: Multi-step import wizard, duplicate detection, error handling
  - Usage: CSV transaction import workflow

- **exportStore** (`src/lib/stores/export.ts`): Export operation tracking
  - State: Export progress, format selection, filters
  - Actions: exportTransactions(), exportHoldings(), exportTaxReport()
  - Features: PDF/CSV export with jsPDF and html2canvas
  - Usage: Report generation and data export

**Store Usage Patterns:**

```typescript
// Example: Portfolio operations
import { usePortfolioStore } from '@/lib/stores/portfolio';

function MyComponent() {
  const { portfolios, loadPortfolios, setCurrentPortfolio } = usePortfolioStore();

  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  return <div>{portfolios.map(p => ...)}</div>;
}

// Example: Price polling
import { usePriceStore } from '@/lib/stores/price';

function PriceDisplay({ symbol }) {
  const { prices, startPolling, stopPolling } = usePriceStore();

  useEffect(() => {
    startPolling([symbol]);
    return () => stopPolling();
  }, [symbol]);

  return <div>{prices[symbol]?.price}</div>;
}

// Example: Tax settings
import { useTaxSettingsStore } from '@/lib/stores/tax-settings';

function TaxSettings() {
  const { taxSettings, setShortTermRate } = useTaxSettingsStore();

  const handleChange = (rate: number) => {
    setShortTermRate(new Decimal(rate));
  };

  return <input value={taxSettings.shortTermRate.toNumber()} onChange={...} />;
}
```

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
- **Coverage**: Aim for 80%+ coverage on business logic

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

## Planning & FIRE Features (Feature #014)

The planning module provides comprehensive net worth tracking, liability management, and FIRE (Financial Independence, Retire Early) calculation tools with accurate historical reconstruction and cash flow analysis.

### Net Worth Tracking with Liabilities

**Overview**: Complete liability management system integrated with portfolio tracking for accurate net worth calculations.

**Key Features**:
- **Liability Management**: Track mortgages, loans, credit cards, and other debts
- **Cash Ledger System**: Accurate net worth by tracking all cash flows (transactions, dividends, liability payments)
- **Historical Accuracy**: Reconstruct liability balances at any point in time using payment history
- **Multiple Liability Types**: Support for mortgages, auto loans, student loans, personal loans, credit cards, and other debts

**Database Schema (v4)**:
- **`liabilities` table**: Liability definitions with initial balance, interest rate, payment schedule
  - Fields: `id`, `portfolioId`, `name`, `type`, `initialBalance`, `interestRate`, `startDate`, `monthlyPayment`, `notes`
- **`liabilityPayments` table**: Payment history for accurate balance reconstruction
  - Fields: `id`, `liabilityId`, `date`, `principalAmount`, `interestAmount`, `notes`
  - Index: `[liabilityId+date]` for efficient querying

**Components**:
- `src/components/planning/liability-manager.tsx`: Liability CRUD interface with payment tracking
- `src/components/planning/net-worth-chart.tsx`: Visual net worth over time (assets - liabilities)
- `src/components/planning/fire-projection-chart.tsx`: FIRE timeline visualization
- `src/components/planning/goal-input-form.tsx`: FIRE goal configuration
- `src/components/planning/scenario-controls.tsx`: Scenario modeling controls

**Services**:
- `src/lib/services/planning/liability-service.ts`: Liability CRUD and balance reconstruction
  - `reconstructLiabilityBalances(liability, asOfDate)`: Historical balance calculation
  - `calculateCurrentBalance(liability)`: Current liability balance
  - `getPaymentHistory(liabilityId)`: Payment records with P&I breakdown
- `src/lib/services/cash-ledger.ts`: Cash flow aggregation for net worth
  - `sumCashFlows(portfolioId, startDate, endDate)`: Aggregate all cash movements
  - Tracks: transactions (buys/sells), dividends, liability payments
- `src/lib/services/planning/net-worth-service.ts`: Net worth calculation engine
  - `calculateNetWorth(portfolioId, asOfDate)`: Assets - Liabilities at point in time
  - `getNetWorthHistory(portfolioId, startDate, endDate)`: Historical net worth series

**Store**:
- `src/lib/stores/planning.ts` (`usePlanningStore`):
  - FIRE configuration: retirement age, annual expenses, safe withdrawal rate
  - Liabilities: CRUD operations for liabilities
  - Scenarios: Multiple FIRE scenarios with different assumptions
  - Liability payments: Payment tracking and history

**Usage Example**:
```typescript
import { usePlanningStore } from '@/lib/stores/planning';
import { netWorthService } from '@/lib/services/planning/net-worth-service';

// Get current net worth
const portfolioId = 'portfolio-1';
const netWorth = await netWorthService.calculateNetWorth(portfolioId, new Date());
console.log(`Net worth: $${netWorth.toFixed(2)}`);

// Add liability
const planningStore = usePlanningStore.getState();
await planningStore.addLiability({
  portfolioId,
  name: 'Mortgage',
  type: 'mortgage',
  initialBalance: new Decimal(300000),
  interestRate: new Decimal(0.04), // 4%
  startDate: new Date('2023-01-01'),
  monthlyPayment: new Decimal(1432.25),
});
```

### FIRE Planning & Projection

**Overview**: Financial Independence, Retire Early (FIRE) calculation engine with scenario modeling and sensitivity analysis.

**Key Calculations**:
- **FIRE Number**: Annual expenses × 25 (4% safe withdrawal rate)
- **Years to FIRE**: Based on current net worth, savings rate, and expected returns
- **Withdrawal Strategy**: 4% rule with inflation adjustment
- **Scenario Modeling**: Optimistic, baseline, pessimistic projections

**FIRE Configuration**:
- **Retirement Age**: Target age for financial independence
- **Annual Expenses**: Expected yearly spending in retirement
- **Safe Withdrawal Rate**: Default 4% (customizable)
- **Expected Return**: Assumed portfolio growth rate
- **Current Savings Rate**: Monthly investment amount

**Components**:
- `src/components/planning/fire-projection-chart.tsx`: Interactive FIRE timeline
  - Shows projected net worth growth
  - Highlights FIRE date based on assumptions
  - Scenario comparison (optimistic/baseline/pessimistic)

**Services**:
- `src/lib/services/planning/fire-projection.ts`: FIRE calculation engine
  - `calculateFireNumber(annualExpenses, withdrawalRate)`: Required portfolio size
  - `projectNetWorth(currentNW, savingsRate, returnRate, years)`: Future net worth projection
  - `calculateYearsToFire(currentNW, fireNumber, savingsRate, returnRate)`: Time to FIRE

**Store Features**:
- Multiple FIRE scenarios with different assumptions
- Sensitivity analysis (vary return rates, expenses, savings)
- Goal tracking and progress monitoring

### Allocation Planning

**Overview**: Asset allocation tools with rebalancing recommendations and target allocation tracking.

**Key Features**:
- **Target Allocation**: Define desired asset class percentages
- **Current Allocation**: Automatic calculation from holdings
- **Rebalancing Recommendations**: Buy/sell suggestions to reach target
- **Drift Monitoring**: Alert when allocation deviates beyond threshold

**Store**:
- `src/lib/stores/allocation.ts` (if exists - to be documented)

**Access**:
1. **Planning Page**: Navigate to `/planning`
2. **Net Worth View**: Shows assets, liabilities, and net worth chart
3. **FIRE Projection**: Configure FIRE goals and view timeline
4. **Scenario Analysis**: Compare different FIRE scenarios

### Testing

```bash
# Run planning-related unit tests
npm run test -- --run src/lib/services/planning/

# Run cash ledger tests
npm run test -- --run src/lib/services/__tests__/cash-ledger.test.ts

# Run planning E2E tests (if available)
npx playwright test tests/e2e/planning*.spec.ts --project=chromium
```

### Common Debugging Scenarios

**Net Worth Calculation Issues**:
- Check liability payment history: DevTools → IndexedDB → `liabilityPayments`
- Verify cash ledger: `sumCashFlows()` in `cash-ledger.ts`
- Historical balances: `reconstructLiabilityBalances()` in `liability-service.ts`

**FIRE Planning Edge Cases**:
- Negative cash flows: Verify retirement age > current age
- Projection errors: Check scenario inputs in `planningStore`
- Chart rendering: Verify data array length and date ranges

**Liability Balance Mismatch**:
- Check payment records are complete
- Verify principal vs interest split
- Ensure startDate is before all payment dates
- Run balance reconstruction for specific date

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

**Planning & Net Worth (February 2026):**
- 014-net-worth-cash-ledger: Complete liability tracking implementation
  - Liability management with payment history
  - Cash ledger for accurate net worth calculations
  - Historical liability balance reconstruction
  - FIRE projection and scenario modeling
  - Database schema v4 with `liabilities` and `liabilityPayments` tables

**Testing & Quality (February 2026):**
- **Phase 2: API Resilience Testing** - Comprehensive test coverage for price-sources.ts
  - 18 new tests (PriceCache, Yahoo Finance, CoinGecko, retry logic)
  - Coverage: 0% → 98.26% statements, 100% functions
  - Validates retry logic (3 attempts, exponential backoff)
  - Tests UK market GBp→GBP conversion
  - Verifies cache TTL (5 min) and LRU eviction (1000 symbols)
  - Confirms timeout handling (10s AbortController)
  - All 643 existing tests passing (no regressions)

## Navigation System

The app uses a grouped collapsible navigation structure for improved organization and mobile responsiveness.

### Configuration

Navigation is configured in `src/lib/config/navigation.ts`:

```typescript
export const navigationStructure: (NavItem | NavGroup)[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  {
    id: 'portfolio',
    name: 'Portfolio',
    icon: Briefcase,
    items: [
      { name: 'Holdings', href: '/holdings', icon: Briefcase },
      { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
      { name: 'Performance', href: '/performance', icon: TrendingUp },
    ]
  },
  // ... more groups
];
```

### Components

- `src/components/layout/nav-group.tsx`: Collapsible group component
- `src/components/layout/nav-item.tsx`: Individual navigation item
- `src/components/layout/sidebar.tsx`: Sidebar with navigation groups

### Features

- **Collapsible Groups**: Click group headers to expand/collapse
- **Default State**: Groups can be configured with `defaultOpen` property
- **Active Highlighting**: Current route is highlighted
- **Mobile Responsive**: Drawer-based navigation on mobile devices
- **Icon Support**: Lucide React icons for all items

### Adding Navigation Items

1. Edit `src/lib/config/navigation.ts`
2. Add to appropriate group or create new group
3. Import icon from `lucide-react`
4. Specify href, name, and icon

Example:
```typescript
{
  id: 'reports',
  name: 'Reports',
  icon: FileText,
  items: [
    { name: 'Tax Reports', href: '/reports/tax', icon: Receipt },
    { name: 'Performance', href: '/reports/performance', icon: BarChart3 },
  ]
}
```

## Feature Index

Quick reference to all major features:

| Feature | Page | Key Components | Services | Store |
|---------|------|----------------|----------|-------|
| **Portfolio Dashboard** | `/` | dashboard-container-rgl | metrics-service | dashboardStore |
| **Holdings Management** | `/holdings` | holdings-table, holding-detail-modal | holdings-service | portfolioStore |
| **Transaction Tracking** | `/transactions` | transaction-table, add-transaction | - | transactionStore |
| **Performance Analytics** | `/performance` | performance-chart, summary-stats | performance-analytics | performanceStore |
| **Tax Analysis** | `/tax-analysis` | tax-analysis-tab, tax-exposure-widget | tax-calculator, tax-estimator | taxSettingsStore |
| **FIRE Planning** | `/planning` | fire-projection-chart, liability-manager | fire-projection, net-worth-service | planningStore |
| **Asset Allocation** | `/allocation` | allocation-donut-chart, rebalancing-table | rebalancing-service | allocationStore |
| **Analysis Tools** | `/analysis` | allocation-chart, recommendation-list | recommendation-engine | analysisStore |
| **CSV Import** | Dialog | csv-import-dialog, csv-file-upload | csv-importer, column-detector | csvImportStore |
| **Export Reports** | `/reports` | export-button, performance-report | export-service | exportStore |
| **Settings** | `/settings` | price-settings, tax-settings-panel | - | uiStore |
| **Price Updates** | Global | price-display, staleness-indicator | price-polling, price-sources | priceStore |

## Test Coverage & Quality

### Overall Test Coverage

**Unit Tests** (Vitest): 57 files, 930+ test cases
- Service tests: 22 files (440+ tests)
- Store tests: 7 files (209 tests)
- Component tests: 4 files (80 tests)
- Utility tests: 6 files (154 tests)

**E2E Tests** (Playwright): 36 files, 370+ test cases
- Dashboard/Layout: 14 files (140+ tests)
- Holdings/Transactions: 6 files (37 tests)
- Analytics/Reporting: 5 files (50+ tests)
- CSV Import/Export: 2 files (37 tests)

### Critical Coverage

**Excellent Coverage (85%+)**:
- ✅ CSV Import/Validation (120+ tests)
- ✅ Metrics Calculation (58 tests)
- ✅ Performance Analytics (78 tests)
- ✅ Price Management (98 tests)
- ✅ Tax Logic (91 tests, 30% → 90% coverage)
- ✅ Store Management (209 tests)
- ✅ Utility Functions (154 tests)
- ✅ E2E Workflows (370+ tests)

### Testing Commands

```bash
# Run all unit tests
npm run test

# Run specific service tests
npm run test -- --run src/lib/services/__tests__/

# Run with coverage report
npm run test:coverage

# Run all E2E tests
npm run test:e2e

# Run specific E2E test
npx playwright test tests/e2e/portfolio-dashboard.spec.ts
```

### Testing Initiatives

**Phase 1: Tax Logic Testing** (Complete)
- Added 47 tests for ESPP validation, holding periods, tax estimation
- Coverage: 30% → 90% for tax services

**Phase 2: API Resilience Testing** (Complete)
- Added 18 tests for price-sources.ts
- Coverage: 0% → 98.26% for price fetching logic
- Validates retry, caching, timeout, currency conversion

**Phase 3: Documentation Updates** (Complete)
- Updated CLAUDE.md with feature index, navigation docs
- Documented all 13 Zustand stores
- Added test coverage section

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

## Tax Features (012-tax-features-stock)

The tax features enable ESPP/RSU tracking and capital gains tax analysis for stock holdings.

### ESPP Transactions

**Entry**: Navigate to Transactions → Add Transaction → Select "ESPP Purchase"

**Required Fields**:
- **Grant Date**: ESPP offering date (start of offering period)
- **Purchase Date**: Date shares were purchased
- **Market Price at Grant**: Stock FMV when offering period began
- **Market Price at Purchase**: Stock FMV on purchase date
- **Discount %**: ESPP discount percentage (e.g., 15%)
- **Quantity**: Number of shares purchased

**Metadata Stored**:
- Grant date for disqualifying disposition calculations
- Bargain element = (Market Price at Purchase - Discounted Price) × Quantity

**Cost Basis**: The discounted price paid (NOT the FMV at purchase)

**Disqualifying Disposition Rules**:
A sale is disqualifying if it occurs:
- Within 2 years of grant date, OR
- Within 1 year of purchase date

If disqualifying, the bargain element is taxed as ordinary income (W-2) instead of capital gains.

### RSU Transactions

**Entry**: Navigate to Transactions → Add Transaction → Select "RSU Vest"

**Required Fields**:
- **Vesting Date**: Date RSUs vested
- **Gross Shares Vested**: Total shares that vested
- **Shares Withheld for Tax**: Shares automatically sold to cover taxes
- **Vesting Price (FMV)**: Fair market value per share at vesting

**Metadata Stored**:
- Vesting date for tax reporting
- Vesting price (FMV at vest)
- Net shares received = Gross Shares - Withheld Shares

**Cost Basis**: FMV at vesting × Net shares received

**Tax Withholding**: The shares withheld for tax are automatically handled by reducing the total share count. The withheld shares don't appear in your holdings.

**Important**: RSU income is already reported on your W-2 at vesting. The cost basis for capital gains is the FMV at vest.

### Tax Analysis

**Access**:
1. Dedicated page: Navigate to `/tax-analysis`
2. Holdings detail: Go to Holdings → Click dropdown → "View Details" → "Tax Analysis" tab

**Features**:
- **Holding Period Classification**:
  - Short-term: ≤ 365 days from purchase
  - Long-term: > 365 days from purchase
- **FIFO Method**: First-in-first-out lot selection for tax calculations
- **Summary Cards**:
  - Total unrealized gains across all holdings
  - Short-term gains (taxed at ordinary income rate)
  - Long-term gains (taxed at preferential rate)
  - Estimated tax liability if all positions sold today
- **Tax Lot Table**:
  - Sortable by purchase date, quantity, cost basis, gain/loss, holding period
  - Color-coded holding periods (green = long-term, yellow = short-term)
  - Lot type badges (Standard, ESPP, RSU)
  - ESPP disqualifying disposition warnings with detailed tooltips
  - Per-lot unrealized gain/loss calculations

**ESPP Warnings**:
- **Qualifying Badge** (Green): Sale would qualify for favorable tax treatment
- **Disqualifying Badge** (Amber with ⚠️): Sale would trigger ordinary income tax on bargain element
  - Hover tooltip shows:
    - Days from grant and purchase dates
    - Days remaining until qualifying
    - Tax implications

### Tax Settings

**Location**: Navigate to `/settings/tax` or Settings → Tax Settings

**Configuration**:
- **Short-Term Rate**: Tax rate for gains ≤ 365 days (default: 24%)
  - Applied to ordinary income/short-term capital gains
  - Adjustable slider: 0% - 50%
- **Long-Term Rate**: Tax rate for gains > 365 days (default: 15%)
  - Applied to long-term capital gains
  - Adjustable slider: 0% - 30%

**Persistence**: Settings are stored in browser IndexedDB with Decimal.js precision to avoid floating-point errors.

**Common Tax Rates** (2024 US):
- Short-term (ordinary income): 10%, 12%, 22%, 24%, 32%, 35%, 37%
- Long-term capital gains: 0%, 15%, 20%

### Viewing ESPP/RSU Lots

**Holdings Table**:
- ESPP lots show purple "ESPP" badge
- RSU lots show blue "RSU" badge

**Holdings Detail Modal**:
1. Navigate to Holdings page
2. Click dropdown (⋮) on any holding → "View Details"
3. **Overview Tab**: Summary of total quantity, cost basis, current value, unrealized gain
4. **Tax Lots Tab**: Detailed breakdown of each lot with metadata:
   - ESPP lots: Grant date, bargain element (in purple card)
   - RSU lots: Vesting date, vesting price/FMV (in blue card)
   - Purchase date, quantity purchased vs sold
   - Notes field
5. **Tax Analysis Tab**: Full tax analysis for that specific holding

### Common Debugging Scenarios

**Disqualifying Disposition Warning Not Showing**:
- Verify grant date is set in the ESPP transaction
- Check that grant date is < purchase date
- Ensure grant date is within the last 2 years

**Tax Estimate Seems Incorrect**:
- Navigate to Settings → Tax Settings
- Verify short-term and long-term rates match your tax bracket
- Check IndexedDB (DevTools → Application → IndexedDB → userSettings)
- Look for `tax_rates` key with Decimal values

**ESPP Bargain Element Wrong**:
- Verify discount % is correct (e.g., 15 for 15%)
- Check market price at grant and purchase are accurate
- Bargain Element = (Market Price at Purchase - Discounted Price) × Quantity
- Example: Purchase price $85, discount 15% → Cost basis $72.25, FMV $85 → Bargain element $12.75/share

**RSU Net Shares Mismatch**:
- Check gross shares vested
- Verify shares withheld for tax
- Net shares = Gross - Withheld
- Example: 100 gross, 22 withheld → 78 net shares in holdings

**Tax Settings Not Persisting**:
- Check browser IndexedDB is enabled
- Look for errors in browser console
- Verify `tax_rates` entry exists in userSettings table
- Re-save settings if needed

### Testing

```bash
# Run tax service unit tests (55 tests total)
npm run test -- --run src/lib/services/__tests__/holding-period.test.ts
npm run test -- --run src/lib/services/__tests__/tax-estimator.test.ts
npm run test -- --run src/lib/services/__tests__/espp-validator.test.ts

# Run E2E workflow tests
npx playwright test tests/e2e/espp-workflow.spec.ts --project=chromium
npx playwright test tests/e2e/rsu-workflow.spec.ts --project=chromium
npx playwright test tests/e2e/tax-analysis-view.spec.ts --project=chromium
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
