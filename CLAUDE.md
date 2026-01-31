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
1. **File Upload**: User selects/drops CSV file (max 10MB)
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

Playwright tests cover key user workflows:
- `portfolio-dashboard.spec.ts`: Dashboard functionality
- `loading-state-regression.spec.ts`: Loading state completion verification
- `mock-data-flow.spec.ts`: Mock data generation and dashboard display
- `transaction-management.spec.ts`: Adding/editing transactions
- `holdings-table.spec.ts`: Holdings display and filtering
- `charts-visualization.spec.ts`: Chart interactions
- `csv-import.spec.ts`: CSV transaction import workflow

Tests run against the dev server by default. The Playwright config automatically starts the dev server before tests.

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
- TypeScript 5.3 with Next.js 14.2 (App Router) + React 18, Zustand 4.5, Recharts 2.15, shadcn/ui, Tailwind CSS, dnd-kit, papaparse (CSV parsing), Zod (validation), decimal.js (financial precision)
- Browser IndexedDB via Dexie.js 3.2 (privacy-first, local-only)
- TypeScript 5.3+ with Next.js 14.2 (App Router) + @dnd-kit/core 6.3+, @dnd-kit/sortable 10.0+, Zustand 4.5+, Zod (003-dashboard-stacking-layout)
- IndexedDB via Dexie.js (userSettings table) (003-dashboard-stacking-layout)
- TypeScript 5.3 (strict mode) + Next.js 14.2, React 18, Tailwind CSS, dnd-kit, Zustand 4.5 (004-grid-dense-packing)
- IndexedDB via Dexie.js (privacy-first, browser-only) (004-grid-dense-packing)
- TypeScript 5.3+ with Next.js 14.2 App Router + React 18, Zustand 4.5, Dexie.js 3.2, decimal.js, date-fns (005-live-market-data)
- Browser IndexedDB via Dexie.js (userSettings table for preferences) (005-live-market-data)
- TypeScript 5.3 with Next.js 14.2 (App Router) + Recharts 2.15, Dexie.js 3.2, decimal.js, date-fns, Zod, Zustand 4.5 (006-performance-analytics)
- IndexedDB via Dexie.js (new `performanceSnapshots` table required) (006-performance-analytics)
- TypeScript 5.3 with Next.js 14.2 (App Router) + React 18, jsPDF + html2canvas (PDF), PapaParse (CSV), Recharts 2.15, decimal.js, date-fns (011-export-functionality)
- Browser IndexedDB via Dexie.js (read-only for export) (011-export-functionality)

## Recent Changes
- 001-csv-transaction-import: Added papaparse for CSV parsing, date-parser utility, CSV import dialog and workflow
- 002-portfolio-dashboard: Added Recharts 2.15, dnd-kit for drag-drop dashboard widgets
- 005-live-market-data: Added live market data with UK market support, price polling, staleness indicators, and offline resilience

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
