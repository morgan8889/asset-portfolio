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

### CI / GitHub Actions

- **Lint, type-check, unit tests**: Run automatically on every PR to `main`
- **E2E tests**: Triggered on-demand (chromium-only, `MOCK_PRICES=1`):
  - Add the `run-e2e` label to the PR, **or**
  - Comment `/run-e2e` on the PR
- Build artifacts are cached between the build and E2E jobs

### Production
```bash
npm run build                 # Build production bundle
npm run start                 # Start production server
```

## Architecture Overview

**Privacy-first financial portfolio tracker** built with Next.js 14 App Router. All data stored locally in IndexedDB via Dexie.js - no backend database for maximum privacy.

### Core Technology Stack
- **Frontend**: Next.js 14 (App Router, not Pages Router) + React 18 + TypeScript 5.3
- **State**: Zustand 4.5 stores in `src/lib/stores/`
- **Database**: Dexie.js 3.2 (IndexedDB wrapper) - Schema v4
- **UI**: shadcn/ui (Radix + Tailwind), Recharts 2.15, react-grid-layout
- **Forms**: React Hook Form + Zod validation
- **Math**: **decimal.js** for all financial calculations (avoid floating-point errors)
- **Data**: PapaParse 5.4 (CSV), date-fns, jsPDF 4.0 + html2canvas 1.4 (PDF export)
- **Testing**: Vitest (unit), Playwright (E2E)

### Application Structure
```
src/
├── app/                      # Next.js App Router
│   ├── (dashboard)/         # Dashboard route group
│   ├── api/prices/          # Price API proxy routes
├── components/              # React components (ui/, charts/, forms/, layout/)
├── lib/
│   ├── db/                  # Dexie database (schema.ts, queries.ts, migrations.ts)
│   ├── stores/              # Zustand state stores (14 stores - see below)
│   ├── services/            # Business logic
│   └── utils/               # Utilities
└── types/                   # TypeScript types
```

### Database Schema (v4)
**Core Tables**: `portfolios`, `assets`, `holdings` (with tax lots), `transactions` (with tax metadata)
**Tax & Performance**: `priceHistory`, `priceSnapshots`, `dividendRecords`, `performanceSnapshots`
**Planning (v4)**: `liabilities`, `liabilityPayments` (for net worth tracking)
**Settings**: `userSettings`

### State Management - Zustand Stores (14)

| Store | File | Purpose | Key Actions |
|-------|------|---------|-------------|
| **portfolioStore** | `portfolio.ts` | Portfolio CRUD, holdings, metrics | loadPortfolios(), createPortfolio(), loadHoldings() |
| **assetStore** | `asset.ts` | Asset metadata | Asset CRUD operations |
| **transactionStore** | `transaction.ts` | Transaction history | createTransaction(), updateTransaction() |
| **performanceStore** | `performance.ts` | Performance analytics | calculatePerformance(), loadBenchmarks() |
| **priceStore** | `price.ts` | Live price polling (15s-60s) | startPolling(), stopPolling(), refreshPrice() |
| **taxSettingsStore** | `tax-settings.ts` | Tax rates (ST: 24%, LT: 15%) | setShortTermRate(), setLongTermRate() |
| **planningStore** | `planning.ts` | FIRE, liabilities, net worth | addLiability(), recordPayment(), updateFireConfig() |
| **allocationStore** | `allocation.ts` | Asset allocation, rebalancing | setTargetAllocation(), getRebalancingPlan() |
| **dashboardStore** | `dashboard.ts` | Widget config, layouts | setWidgetVisibility(), setTimePeriod() |
| **analysisStore** | `analysis.ts` | Analysis state | runAnalysis(), setFilters() |
| **uiStore** | `ui.ts` | Modals, notifications | showModal(), addNotification() |
| **csvImportStore** | `csv-import.ts` | CSV import workflow | setFile(), setMappings(), startImport() |
| **exportStore** | `export.ts` | Export operations | exportTransactions(), exportHoldings() |

### Key Patterns

**Import Paths**: `@/*` → `src/*`, `@/components/*` → `src/components/*`, etc.

**Financial Calculations** - Always use Decimal.js:
```typescript
import Decimal from 'decimal.js';

// Always use Decimal for money
const total = new Decimal(price).mul(quantity);
const taxAmount = total.mul(taxRate);
```

**Component Architecture**:
- Server Components: Default for pages, layouts
- Client Components: Use `'use client'` for interactive UI, charts, state-dependent components

**API Routes**: Price fetching proxied through `src/app/api/prices/` (Yahoo Finance, Alpha Vantage, CoinGecko)

## Development Workflow - Test-Driven Development (TDD)

**REQUIRED**: All new features MUST follow TDD approach.

### TDD Workflow

**Phase 1: Write Tests First**
1. Define requirements: What should this feature do?
2. Write failing tests: Unit tests for services/utilities, E2E tests for user workflows
3. Verify tests fail for the right reasons
4. Run tests: `npm run test` or `npm run test:e2e`

**Phase 2: Implement Feature**
1. Write minimal code to make tests pass
2. Run tests frequently after each small change
3. Iterate: Add functionality incrementally with tests

**Phase 3: Refactor**
1. Clean up code while keeping tests green
2. Add edge cases and additional scenarios
3. Verify coverage: `npm run test:coverage` (target: 80%+)

### TDD Examples

**New Store:**
```typescript
// 1. Write test first (MUST FAIL initially)
describe('NewFeatureStore', () => {
  it('should initialize with default state', () => {
    expect(useNewFeatureStore.getState().items).toEqual([]);
  });

  it('should add item', () => {
    useNewFeatureStore.getState().addItem({ id: '1', name: 'Test' });
    expect(useNewFeatureStore.getState().items).toHaveLength(1);
  });
});

// 2. Implement store to make tests pass
// 3. Refactor and add more tests
```

**New Service:**
```typescript
// 1. Write test first
describe('calculateMetric', () => {
  it('should calculate average correctly', () => {
    expect(calculateMetric([1, 2, 3]).toNumber()).toBe(2);
  });

  it('should handle empty array', () => {
    expect(calculateMetric([]).toNumber()).toBe(0);
  });
});

// 2. Implement service
// 3. Add edge cases
```

**New UI Component (E2E):**
```typescript
test('should display transaction form', async ({ page }) => {
  await page.goto('/transactions');
  await page.getByRole('button', { name: /add transaction/i }).click();
  await expect(page.getByLabel(/symbol/i)).toBeVisible();
});
```

### Testing Coverage Requirements

**Minimum Coverage by Layer:**
- Services/Utilities: 80%+ unit test coverage
- Stores: 90%+ unit test coverage (all actions tested)
- Critical Workflows: 100% E2E coverage
- UI Components: 70%+ component tests

**Before PR Creation:**
- [ ] All new tests passing
- [ ] Coverage targets met
- [ ] E2E tests added for user-facing changes
- [ ] No existing tests broken

## Verification Before Completion

**CRITICAL**: Never claim a task is "complete" or "done" without running verification. This is a **mandatory quality gate**.

### Verification Requirements by Task Type

**Code Changes (Services, Utilities, Stores)**:
```bash
# MUST run these before claiming done:
npm run type-check              # TypeScript validation
npm run test -- --run          # Unit tests must pass
npm run test:coverage          # Verify coverage maintained/improved
```

**UI Changes (Components, Pages, Features)**:
```bash
# MUST run these before claiming done:
npm run type-check              # TypeScript validation
npm run test:e2e               # E2E tests must pass
npm run dev                    # Start dev server

# THEN verify in browser:
# 1. Navigate to affected page(s)
# 2. Test all interactive elements
# 3. Verify visual appearance (no cutoffs, proper spacing)
# 4. Check browser console for errors
# 5. Test responsive behavior (desktop, tablet, mobile)
```

**Database/Schema Changes**:
```bash
# MUST run these before claiming done:
npm run type-check              # TypeScript validation
npm run test -- --run          # Unit tests must pass
npm run dev                    # Verify migrations run successfully

# THEN verify in DevTools:
# 1. Open Application → IndexedDB → PortfolioTrackerDB
# 2. Verify schema changes applied correctly
# 3. Check data integrity
# 4. Test rollback if migration supports it
```

### Mandatory Verification Checklist

Before claiming ANY task is complete:

- [ ] **Code compiles**: `npm run type-check` passes with zero errors
- [ ] **Tests pass**: `npm run test -- --run` shows all tests passing
- [ ] **No regressions**: Existing functionality still works
- [ ] **Visual verification** (if UI): Browser testing confirms correct appearance and behavior
- [ ] **Error-free console**: Browser console shows no errors or warnings
- [ ] **Coverage maintained**: `npm run test:coverage` shows coverage at/above targets

### Examples of REQUIRED Verification

**Example 1: Adding a new service function**
```bash
# Write tests first (TDD)
npm run test -- --run src/lib/services/__tests__/my-service.test.ts

# Implement function

# BEFORE claiming done:
npm run type-check              # ✅ Must pass
npm run test -- --run          # ✅ Must pass
npm run test:coverage          # ✅ Verify 80%+ coverage
```

**Example 2: Adding a new UI component**
```bash
# Write E2E test first (TDD)
npm run test:e2e -- tests/e2e/my-feature.spec.ts

# Implement component

# BEFORE claiming done:
npm run type-check              # ✅ Must pass
npm run test:e2e               # ✅ Must pass
npm run dev                    # ✅ Start server

# Browser verification:
# ✅ Navigate to page
# ✅ Verify component renders correctly
# ✅ Test all interactive elements
# ✅ Check console for errors
# ✅ Test responsive behavior
```

**Example 3: Modifying existing feature**
```bash
# BEFORE claiming done:
npm run type-check              # ✅ Must pass
npm run test -- --run          # ✅ All tests pass (including existing)
npm run test:e2e               # ✅ E2E tests pass
npm run dev                    # ✅ Manual verification

# Regression testing:
# ✅ Test affected workflows end-to-end
# ✅ Verify no visual regressions
# ✅ Check related features still work
```

### When NOT to Skip Verification

**NEVER skip verification for:**
- "Small" changes (small bugs can break systems)
- "Quick" fixes (untested fixes often create new bugs)
- "Obvious" changes (assumptions lead to errors)
- Time pressure (rushing creates more work later)

**Golden Rule**: If you didn't verify it, you didn't finish it.

### Feedback Mechanisms

Use these feedback mechanisms to ensure completeness:

1. **Automated Tests**: TDD approach ensures tests verify behavior
2. **Type Checking**: TypeScript catches type errors before runtime
3. **Browser Testing**: Visual verification for UI changes
4. **Coverage Reports**: Ensure adequate test coverage
5. **E2E Tests**: Verify complete user workflows
6. **Manual QA**: Human verification of complex interactions

### Verification Failure Protocol

If verification fails:

1. **DO NOT** claim task is complete
2. **DO NOT** mark task as "done" with failing tests
3. **DO** investigate and fix the issue
4. **DO** re-run full verification suite
5. **DO** update tests if requirements changed

**Remember**: Evidence before assertions. Tests pass before "done".

## Test Coverage & Quality

### Current Coverage (Phase 2 Complete - Feb 2026)

**Unit Tests** (Vitest): 57 files, 930+ test cases
- Service tests: 22 files (440+ tests)
- Store tests: 7 files (209 tests) - **100% store coverage (14/14)**
- Component tests: 4 files (80 tests)
- Utility tests: 6 files (154 tests)

**E2E Tests** (Playwright): 36 files, 370+ test cases
- Dashboard/Layout: 14 files (140+ tests)
- Holdings/Transactions: 6 files (37 tests)
- Analytics/Reporting: 5 files (50+ tests)
- CSV Import/Export: 2 files (37 tests)
- **E2E Workflow Coverage: 95%**

**Excellent Coverage (85%+)**:
- ✅ CSV Import/Validation (120+ tests)
- ✅ Metrics Calculation (58 tests)
- ✅ Performance Analytics (78 tests)
- ✅ Price Management (98 tests) - **98.26% coverage after Phase 2**
- ✅ Tax Logic (91 tests) - **90% coverage (up from 30%)**
- ✅ Store Management (209 tests) - **100% store coverage**
- ✅ Utility Functions (154 tests)
- ✅ E2E Workflows (370+ tests)

**Testing Initiatives:**
- **Phase 1** (Complete): Tax logic testing - 47 tests added, 30% → 90% coverage
- **Phase 2** (Complete): API resilience - 18 tests for price-sources.ts, 0% → 98.26% coverage
- **Phase 3** (Complete): Documentation updates

See `docs/planning/test-coverage-phase-2-complete.md` for detailed metrics.

## Feature Catalog

Quick reference to all major features:

| Feature | Page | Key Components | Services | Store |
|---------|------|----------------|----------|-------|
| **Portfolio Management** | `/portfolios` | portfolios-table, portfolio-selector, create-portfolio-dialog, delete-portfolio-dialog | - | portfolioStore |
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

## CSV Transaction Import

Bulk import transactions from CSV files with auto-detection and validation.

### Import Flow
1. **File Upload**: Drag-drop CSV file (max 5MB)
2. **Parsing**: PapaParse auto-detects delimiters
3. **Column Detection**: Auto-map headers (Date, Symbol, Quantity, etc.)
4. **Validation**: Row-level validation with detailed errors
5. **Duplicate Detection**: Cross-reference with existing transactions
6. **Import**: Progress tracking with error summary

### Architecture
- `src/lib/services/csv-parser.ts` - PapaParse wrapper
- `src/lib/services/column-detector.ts` - Auto-detect column mappings
- `src/lib/services/csv-validator.ts` - Row validation
- `src/lib/services/csv-importer.ts` - Import orchestration
- `src/components/forms/csv-import-dialog.tsx` - Main UI workflow

### Supported Date Formats
- ISO 8601: `yyyy-MM-dd`, `yyyy/MM/dd`
- US: `MM/dd/yyyy`, `M/d/yyyy`
- EU: `dd/MM/yyyy`, `d/M/yyyy`
- Written: `January 15, 2025`, `Jan 15, 2025`

### Testing
```bash
npm run test -- src/lib/services/__tests__/csv*.test.ts  # 103 tests
npm run test:e2e -- tests/e2e/csv-import.spec.ts
```

## Portfolio Management

Multi-portfolio support with comprehensive CRUD operations and data isolation.

### Key Features

**Portfolio Switching** (`/` Dashboard):
- Dropdown selector in header (PortfolioSelector component)
- Sorted by recency (lastAccessedAt → updatedAt → createdAt)
- Disabled during CSV import
- Persists selection across page reloads (Zustand persist middleware)

**Portfolio Management Page** (`/portfolios`):
- Table view of all portfolios with real-time metrics
- Columns: Name, Type, Total Value, YTD Return, Holdings count, Actions
- Current portfolio highlighted with "Current" badge
- Metrics calculated from actual holdings data

**Create Portfolio**:
- Form fields: Name (1-50 chars), Type (taxable/IRA/401k/Roth), Currency (USD/EUR/GBP/CAD/JPY)
- Default settings: 5% rebalance threshold, FIFO tax strategy
- Validation: Required name, valid type/currency

**Edit Portfolio**:
- Pre-filled form with existing portfolio data
- Type change warning if portfolio has transactions
- Shows transaction count before allowing type change
- Updates portfolio with new values

**Delete Portfolio**:
- Graduated confirmation based on transaction count:
  - **0 transactions**: Simple confirmation
  - **1-10 transactions**: Checkbox confirmation
  - **>10 transactions**: Must type portfolio name exactly
- Last portfolio warning
- Auto-fallback to next most recently used portfolio
- Complete data deletion (portfolio + all transactions)

### Database Schema v5

```typescript
interface Portfolio {
  id: string;
  name: string;
  type: 'taxable' | 'ira' | '401k' | 'roth';
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date; // NEW in v5 - for recency sorting
  settings: PortfolioSettings;
}
```

**Migration**: Reversible v4→v5 migration adds `lastAccessedAt` index to portfolios table.

### Store Actions

**portfolioStore** enhancements:
- `setCurrentPortfolio(portfolio)` - Updates lastAccessedAt timestamp
- `getSortedPortfolios()` - Returns portfolios sorted by recency
- `deletePortfolio(id)` - Auto-fallback to next portfolio if current deleted
- `updatePortfolio(id, changes)` - Updates portfolio with validation

### Components

- **PortfolioSelector** (`src/components/portfolio/portfolio-selector.tsx`)
  - Dropdown with checkmark on current portfolio
  - Shows portfolio name and type
  - Disabled during CSV import

- **PortfoliosTable** (`src/components/portfolio/portfolios-table.tsx`)
  - Displays all portfolios with metrics
  - View/Edit/Delete actions per row
  - Real metrics from holdings queries

- **CreatePortfolioDialog** (`src/components/forms/create-portfolio.tsx`)
  - Dual mode: create or edit
  - Controlled dialog state
  - Type change warnings

- **DeletePortfolioDialog** (`src/components/forms/delete-portfolio-dialog.tsx`)
  - Graduated confirmation UI
  - Transaction count checking
  - Last portfolio warning

### Data Isolation

- Holdings filtered by `portfolioId`
- Transactions filtered by `portfolioId`
- Metrics calculated per-portfolio
- No data leakage between portfolios
- Filter state cleared on portfolio switch

### Testing

```bash
# Unit Tests
npm run test -- --run src/lib/stores/__tests__/portfolio.test.ts     # Store actions (8 tests)
npm run test -- --run src/components/portfolio/__tests__/*.test.tsx  # Components (15+ tests)
npm run test -- --run src/components/forms/__tests__/*.test.tsx      # Dialogs (19 tests)

# E2E Tests
npx playwright test tests/e2e/portfolio-switching.spec.ts           # Switching workflow
npx playwright test tests/e2e/portfolios-management.spec.ts         # CRUD operations
npx playwright test tests/e2e/portfolio-edit.spec.ts                # Edit workflow (13 tests)
npx playwright test tests/e2e/portfolio-delete.spec.ts              # Delete workflow (15 tests)
npx playwright test tests/e2e/portfolio-isolation.spec.ts           # Data isolation (6 tests)
```

## Tax Features (ESPP, RSU, Capital Gains)

Comprehensive tax tracking for stock compensation and capital gains analysis.

### ESPP/RSU Transactions

**ESPP Purchase** (Transactions → Add Transaction → "ESPP Purchase"):
- Grant Date, Purchase Date, Market Price at Grant/Purchase, Discount %, Quantity
- Cost Basis: Discounted price paid (NOT FMV)
- Disqualifying disposition: Sale within 2 years of grant OR 1 year of purchase → bargain element taxed as ordinary income

**RSU Vest** (Transactions → Add Transaction → "RSU Vest"):
- Vesting Date, Gross Shares, Shares Withheld for Tax, Vesting Price (FMV)
- Cost Basis: FMV at vesting × Net shares (Gross - Withheld)
- Income already reported on W-2 at vesting

### Tax Analysis

**Access**: `/tax-analysis` page OR Holdings → View Details → "Tax Analysis" tab

**Features**:
- Holding period classification (ST: ≤365 days, LT: >365 days)
- FIFO cost basis method
- Summary: Unrealized gains (total, ST, LT), estimated tax liability
- Tax Lot Table: Per-lot gain/loss, holding period, ESPP disqualifying disposition warnings
- Tax Lot Aging: Alerts for lots becoming long-term within 30 days

### Tax Settings

**Location**: `/settings/tax` or Settings → Tax Settings

**Configuration**:
- Short-Term Rate: Default 24% (ordinary income) - Slider 0%-50%
- Long-Term Rate: Default 15% (capital gains) - Slider 0%-30%
- Stored in IndexedDB with Decimal.js precision

**Common US Tax Rates** (2024):
- Short-term: 10%, 12%, 22%, 24%, 32%, 35%, 37%
- Long-term: 0%, 15%, 20%

### CSV Import/Export with Tax Fields

**Import Header Patterns**:
- Grant Date: `grant_date`, `award_date`, `purchase_date`
- Vesting Date: `vesting_date`, `vest_date`, `release_date`
- Discount: `discount`, `discount %`, `espp discount`
- Shares Withheld: `shares withheld`, `tax shares`
- Ordinary Income: `ordinary income`, `w2 income`

**Export Columns** (Transaction):
`grantDate`, `vestDate`, `discountPercent`, `sharesWithheld`, `ordinaryIncome`

**Export Columns** (Holdings):
`holdingPeriod` (ST/LT/Mixed), `shortTermGain`, `longTermGain`, `estimatedTax`, `basisAdjustment`

### Testing Tax Features
```bash
npm run test -- --run src/lib/services/__tests__/holding-period.test.ts  # 91 tests
npm run test -- --run src/lib/services/__tests__/tax-calculator.test.ts
npx playwright test tests/e2e/espp-workflow.spec.ts --project=chromium
npx playwright test tests/e2e/tax-analysis-view.spec.ts --project=chromium
```

### Tax Domain Knowledge

**ESPP Disqualifying Disposition Rules**: Sale within 2 years of grant OR 1 year of purchase → bargain element taxed as ordinary income
**RSU Tax Treatment**: FMV at vest is cost basis for capital gains; income already on W-2
**FIFO Method**: First-in-first-out lot selection for tax calculations
**Holding Periods**: Short-term ≤365 days, Long-term >365 days
**Tax Lot Aging**: Lots becoming LT within 30 days get high-priority recommendations

## FIRE Planning & Net Worth Tracking

Financial Independence, Retire Early (FIRE) planning with liability management and net worth tracking.

### Net Worth Tracking

**Features**:
- **Liability Management**: Track mortgages, loans, credit cards, other debts
- **Cash Ledger System**: Aggregate all cash flows (transactions, dividends, liability payments)
- **Historical Accuracy**: Reconstruct liability balances at any point in time using payment history
- **Net Worth Calculation**: Assets - Liabilities with historical time series

**Database (v4)**:
- `liabilities` table: id, portfolioId, name, type, initialBalance, interestRate, startDate, monthlyPayment
- `liabilityPayments` table: id, liabilityId, date, principalAmount, interestAmount (indexed by [liabilityId+date])

### FIRE Planning

**Key Calculations**:
- **FIRE Number**: Annual expenses × 25 (4% safe withdrawal rate)
- **Years to FIRE**: Based on current net worth, savings rate, expected returns
- **Scenario Modeling**: Optimistic, baseline, pessimistic projections

**Configuration**:
- Retirement age, annual expenses, safe withdrawal rate (default 4%), expected return, current savings rate

### Components & Services

**Components**:
- `src/components/planning/liability-manager.tsx` - Liability CRUD with payment tracking
- `src/components/planning/net-worth-chart.tsx` - Assets - liabilities over time
- `src/components/planning/fire-projection-chart.tsx` - FIRE timeline visualization

**Services**:
- `src/lib/services/planning/liability-service.ts` - Balance reconstruction
- `src/lib/services/cash-ledger.ts` - Cash flow aggregation
- `src/lib/services/planning/net-worth-service.ts` - Net worth calculations
- `src/lib/services/planning/fire-projection.ts` - FIRE projections

**Store**: `planningStore` - FIRE config, liabilities, scenarios, payments

### Testing
```bash
npm run test -- --run src/lib/services/planning/
npm run test -- --run src/lib/services/__tests__/cash-ledger.test.ts
npx playwright test tests/e2e/planning*.spec.ts --project=chromium
```

## Live Market Data

Real-time price updates for US/UK markets with automatic polling and staleness detection.

**Key Features**:
- Price polling intervals: Realtime (15s), Frequent (30s), Standard (60s), Manual
- UK market support: `.L` symbols (LSE), auto GBp→GBP conversion
- Staleness detection: Fresh (green), Aging (yellow), Stale (red)
- Offline resilience: Cache in IndexedDB, auto-resume on reconnect
- Market hours: US (NYSE/NASDAQ) ET 9:30 AM-4:00 PM, UK (LSE/AIM) GMT/BST 8:00 AM-4:30 PM

**Components**: `priceStore`, `price-display.tsx`, `price-settings.tsx`, `market-hours.ts`

**Price Sources** (`src/lib/services/price-sources.ts`):
- Centralized price fetching with retry logic (3 attempts, exponential backoff)
- Fallback chain: Yahoo Finance → CoinGecko → Alpha Vantage
- Caching: 5 min TTL, LRU eviction (1000 symbols)
- Timeout: 10s with AbortController

## Navigation System

Grouped collapsible navigation configured in `src/lib/config/navigation.ts`:

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
    ]
  },
  // ... more groups
];
```

**Components**: `nav-group.tsx`, `nav-item.tsx`, `sidebar.tsx`
**Features**: Collapsible groups, active highlighting, mobile drawer

## Code Quality Initiative

**Completed (Phase 2 - Jan 2026)**:
- **Price Fetching Deduplication**: Created `price-sources.ts` module (~500 lines removed)
- **Code Cleanup**: Removed deprecated widgets, consolidated Sharpe ratio calculations

**Documentation**: See `docs/planning/` for detailed analysis:
- `codebase-simplification-analysis.md` - Analysis of 261 TypeScript/TSX files
- `README.md` - Initiative overview, phases, metrics
- `TODO.md` - 5-phase task breakdown with progress

**Ongoing Work**:
- Phase 1: Type Safety improvements (87% reduction in `any` usage target)
- Phase 3: Complexity reduction (75% reduction in files >500 lines target)
- Phase 4: Consistency (logging, patterns)
- Phase 5: Cleanup (dead code, unused exports)

## Recent Changes

| Feature | Date | Impact |
|---------|------|--------|
| **Fix: Price Request Deduplication** | Feb 2026 | In-flight guard on refreshAllPrices(), filter non-priceable assets (real_estate/cash/other), stabilize dashboard effect deps |
| **CI: E2E Sharding** | Feb 2026 | 4-shard matrix strategy, blob reporter, merged HTML reports — ~4x faster CI feedback |
| **E2E Test Overhaul** | Feb 2026 | Fixed 198 failures across 49 files; fixed test infrastructure (route order, selectors, seed data); found 3 real app bugs |
| **Feature #016: Portfolio Management** | Feb 2026 | Multi-portfolio switching, CRUD operations, data isolation, graduated delete confirmations |
| **Phase 2: API Resilience Testing** | Feb 2026 | 18 tests for price-sources.ts, 0% → 98.26% coverage |
| **Feature #014: FIRE Planning** | Feb 2026 | Net worth tracking, liabilities, cash ledger, DB schema v4 |
| **Phase 1: Tax Logic Testing** | Jan 2026 | 47 tests added, 30% → 90% tax service coverage |
| **Feature #013: Tax Integration** | Jan 2026 | CSV import/export with tax fields, tax exposure widget |
| **Feature #012: Tax Features** | Jan 2026 | ESPP/RSU tracking, capital gains analysis |
| **Code Simplification** | Jan 2026 | Extracted price-sources.ts, removed 500+ duplicate lines |
| **Feature #011: Export** | Dec 2025 | PDF/CSV export with jsPDF and html2canvas |
| **Feature #010: Allocation** | Dec 2025 | Asset allocation planning with rebalancing |
| **Feature #007: 3yr Performance** | Nov 2025 | Extended performance analysis to 3 years |
| **Feature #005: Live Market Data** | Nov 2025 | Real-time prices, UK market support, staleness detection |

See `CHANGELOG.md` for older features.

## Verification Patterns

### Quick Verification (MCP Playwright)
For fast 2-5 second verification during development:
```
1. browser_navigate('/test')
2. browser_click('Generate Mock Data')
3. browser_wait_for(text: '/', timeout: 10000)
4. browser_snapshot() → Verify no "Loading" text, widgets visible
```

### Regression Testing (CLI Playwright)
```bash
npx playwright test tests/e2e/loading-state-regression.spec.ts --project=chromium
```

### UI Feature Development Workflow

**CRITICAL**: For UI features with multiple visual states/modes:

```
Make change → Build → Screenshot ALL modes → Self-verify → Fix if broken → THEN present to user
```

**Before claiming "done"**:
1. Start dev server if not running
2. Use MCP Playwright to navigate to affected page
3. Screenshot each visual state/configuration
4. Verify no visual regressions or cutoffs
5. Check browser console for errors
6. Only then present results to user

**Key Testing Principles**:
- Use hard timeouts (5s): Fail fast if loading stuck
- Avoid conditional logic: `if (loading.isVisible())` masks failures
- Verify real data: Check for $X.XX format, not $0.00
- Test page reload: Exercises persist middleware rehydration

## E2E Test Patterns

### Imports and Fixtures

All E2E tests import from the custom fixture, **not** directly from `@playwright/test`:

```typescript
import { test, expect, seedMockData } from './fixtures/test';
```

The fixture (`tests/e2e/fixtures/test.ts`) auto-intercepts `/api/prices/*` requests when `MOCK_PRICES=1` is set, returning deterministic mock prices.

### seedMockData

Tests that need portfolio/holdings/transaction data **must** call `seedMockData(page)` in `beforeEach`. It navigates to `/test`, clicks "Generate Mock Data", and waits for completion. The caller's next `page.goto()` cancels the auto-redirect.

```typescript
test.beforeEach(async ({ page }) => {
  await seedMockData(page);
  await page.goto('/holdings');
  await page.waitForLoadState('load');
});
```

### Performance

- Use `waitForLoadState('load')`, **not** `'networkidle'` — `networkidle` adds ~500ms idle wait per call
- `seedMockData` handles its own waiting internally; no extra `waitForLoadState` needed after it

### Selector Reference (What the UI Actually Uses)

Tests MUST use selectors that match the real DOM. These were validated against the running app:

| UI Element | Correct Selector | Wrong (don't use) |
|-----------|-----------------|-------------------|
| Transaction form inputs | `page.locator('#assetSymbol')`, `#quantity`, `#price` | `getByLabel('Symbol')` — inputs have ids, not labels |
| Portfolio selector | `getByRole('combobox').filter()` anchored to "Portfolio:" text | Bare `getByRole('combobox')` — strict mode violation (multiple comboboxes) |
| Table headers | `thead th` | `role="columnheader"` — shadcn tables don't use ARIA column roles |
| Date pickers | Click "Pick a date" button (Popover pattern) | `getByLabel('Date')` — there's no label on the trigger |
| shadcn Select | Click trigger → click option in listbox | `selectOption()` — it's a Radix popover, not a native select |
| Radix Switch | `onCheckedChange` + `setValue` | `register()` — doesn't work with Radix Switch |
| Dashboard load | `data-testid="dashboard-container"` | Waiting for specific widget text |
| Empty states | `.or()` for multiple possible messages | Single exact text match |

### Route Registration Order

Playwright route handlers are evaluated **LIFO** (last registered = first evaluated). When intercepting price APIs:

```typescript
// Register wildcard FIRST (evaluated last — fallback)
await page.route('**/api/prices/*', (route) => route.fallback());
// Register batch LAST (evaluated first — catches batch requests)
await page.route('**/api/prices/batch', (route) => { ... });
```

Use `route.fallback()` (not `route.continue()`) for non-matching requests so the route chain processes correctly.

### Common E2E Mistakes to Avoid

1. **Testing on wrong page**: "Add Transaction" button is on `/transactions`, not the dashboard
2. **Missing seed data**: Always call `seedMockData(page)` in `beforeEach` for tests needing data
3. **Conditional logic masking failures**: Never use `if (await locator.isVisible())` — it hides real bugs
4. **Testing non-existent features**: Verify the feature exists in the app before writing tests
5. **Chasing infrastructure when tests are wrong**: If many tests fail, the tests are probably wrong — validate against the running app before adjusting CI config

## Common Debugging Scenarios

### IndexedDB Issues
- Inspect: DevTools → Application → IndexedDB → `PortfolioTrackerDB`
- Clear: `await Dexie.delete('PortfolioTrackerDB')`

### State Management
- Zustand DevTools: Install zustand/devtools for Redux DevTools
- Check state: `const state = usePortfolioStore.getState()`

### Price API Failures
- Check rate limits: `src/lib/utils/rate-limit.ts`
- Verify API keys: `.env.local`
- Fallback: Manual price entry if APIs fail

### Tax Issues
- **Disqualifying disposition not showing**: Verify grant date set, < purchase date, within 2 years
- **Tax estimate incorrect**: Settings → Tax Settings, verify rates match tax bracket
- **ESPP bargain element wrong**: Verify discount %, market prices; Bargain = (FMV at Purchase - Discounted Price) × Qty
- **RSU net shares mismatch**: Check gross shares, withheld shares; Net = Gross - Withheld
- **Tax settings not persisting**: Check IndexedDB enabled, look for errors in console

### FIRE Planning Issues
- **Net worth calculation**: Check `liabilityPayments` in IndexedDB, verify `sumCashFlows()` in cash-ledger.ts
- **Projection errors**: Verify retirement age > current age, check scenario inputs in planningStore
- **Liability balance mismatch**: Ensure payment records complete, startDate before all payments

## Development Guidelines

### Adding New Features
1. **Write tests first** (TDD approach - see above)
2. Define types in `src/types/`
3. Update database schema if needed (increment version)
4. Create/update Zustand store with tests
5. Build UI components with shadcn/ui primitives
6. Verify coverage: `npm run test:coverage` (80%+ target)

### Dependency Notes

**@tremor/react** (v3.17.4):
- **Current Usage**: Only used in `tax-analysis-tab.tsx` for `Card` and `List` components
- **Reason**: Historical dependency from earlier implementation
- **Migration Path**: Consider migrating to shadcn/ui `Card` + custom `List` component to reduce bundle size
- **Not Urgent**: Minimal footprint, works well, migration is optional optimization

### Performance Considerations
- Use React.memo for expensive chart components
- Implement virtual scrolling with react-window for large lists
- Cache price data in IndexedDB
- Use Next.js Image component

### Security Notes
- API keys in environment variables only
- All external API calls proxied through backend
- Input validation with Zod schemas
- XSS protection via React's default escaping
- **Tax data**: Stored locally in IndexedDB only, no server-side persistence
