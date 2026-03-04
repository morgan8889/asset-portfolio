# Production Readiness & Public Release Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address all issues identified in the production readiness assessment — security hardening, error resilience, dead code removal, performance optimization, public repository readiness, and duplicate consolidation — to bring the app from 6.5/10 to production-ready.

**Architecture:** Six sequential phases, each independently committable. Phase 1 (Security) and Phase 2 (Error Resilience) are critical blockers. Phases 3-6 are high-value cleanup and optimization. Each phase has a verification gate before moving on.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Zustand, Dexie.js, Recharts, shadcn/ui, Vitest, Playwright

---

## Phase 1: Security Hardening

### Task 1.1: Remove NEXT_PUBLIC_ prefix from API keys

**Files:**
- Modify: `/.env.example`
- Modify: `src/lib/services/price-sources.ts` (verify server-side only usage)

**Step 1: Update .env.example**

Replace the API key section (lines 4-7):

```env
# API Keys (Optional - for live price feeds)
# These are server-side only. Do NOT prefix with NEXT_PUBLIC_
YAHOO_FINANCE_KEY=your_yahoo_finance_key_here
ALPHA_VANTAGE_KEY=your_alpha_vantage_key_here
COINGECKO_KEY=your_coingecko_key_here
```

**Step 2: Verify price-sources.ts uses server-side env vars**

Check that `src/lib/services/price-sources.ts` and all files under `src/app/api/prices/` only access these keys server-side (inside API route handlers). They should reference `process.env.YAHOO_FINANCE_KEY` (not `NEXT_PUBLIC_`). If any client-side code references these, move that logic to API routes.

**Step 3: Commit**

```bash
git add .env.example
git commit -m "fix(security): remove NEXT_PUBLIC_ prefix from API keys

Server-side API keys should never be exposed to the client bundle.
Renamed to YAHOO_FINANCE_KEY, ALPHA_VANTAGE_KEY, COINGECKO_KEY."
```

---

### Task 1.2: Restrict CORS and add security headers

**Files:**
- Modify: `next.config.mjs`

**Step 1: Replace the headers() function**

Replace lines 25-44 in `next.config.mjs` with:

```javascript
async headers() {
  const securityHeaders = [
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    },
  ];

  return [
    {
      // Security headers on all routes
      source: '/(.*)',
      headers: securityHeaders,
    },
    {
      // CORS only on API routes — restrict to same origin
      source: '/api/:path*',
      headers: [
        ...securityHeaders,
        {
          key: 'Access-Control-Allow-Origin',
          value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET, POST, OPTIONS',
        },
        {
          key: 'Access-Control-Allow-Headers',
          value: 'Content-Type',
        },
      ],
    },
  ];
},
```

**Step 2: Run type-check and dev server**

```bash
npm run type-check
npm run dev
# Verify localhost:3000 still loads, API calls still work
```

**Step 3: Commit**

```bash
git add next.config.mjs
git commit -m "fix(security): restrict CORS to app origin and add security headers

Replace wildcard CORS with env-based origin. Add X-Content-Type-Options,
X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy.
Remove PUT/DELETE from allowed methods (not used by price API)."
```

---

### Task 1.3: Fix error detail leakage in batch route

**Files:**
- Modify: `src/app/api/prices/batch/route.ts` (lines 145-157)

**Step 1: Replace the catch block**

Replace lines 145-157:

```typescript
  } catch (error) {
    logger.error('Error in batch price request:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
```

**Step 2: Run tests**

```bash
npm run test -- --run src/lib/services/__tests__/price-sources.test.ts
```

**Step 3: Commit**

```bash
git add src/app/api/prices/batch/route.ts
git commit -m "fix(security): hide error details in production batch route

Only expose error details when NODE_ENV=development. Remove console.error
of stack trace that was always logged regardless of environment."
```

---

### Task 1.4: Add URL encoding for symbols in price sources

**Files:**
- Modify: `src/lib/services/price-sources.ts` (line 70)

**Step 1: Add encodeURIComponent to Yahoo Finance URL**

In `src/lib/services/price-sources.ts`, line 70, change:

```typescript
// Before:
const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

// After:
const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
```

**Step 2: Run tests**

```bash
npm run test -- --run src/lib/services/__tests__/price-sources.test.ts
```

**Step 3: Commit**

```bash
git add src/lib/services/price-sources.ts
git commit -m "fix(security): URL-encode symbols in Yahoo Finance requests

Prevents SSRF via specially crafted symbol strings containing
path traversal or query injection characters."
```

---

### Task 1.5: Guard the /test page in production

**Files:**
- Modify: `src/app/(dashboard)/test/page.tsx`

**Step 1: Add environment check at top of component**

Add after the `'use client'` directive and imports:

```typescript
// After existing imports, before the component function:
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
```

Then at the start of the component's return, wrap the entire output:

```typescript
export default function TestPage() {
  // ... existing state declarations ...

  if (!IS_DEVELOPMENT) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold">Not Available</h1>
        <p className="text-muted-foreground mt-2">
          This page is only available in development mode.
        </p>
      </div>
    );
  }

  // ... rest of existing component ...
}
```

**Step 2: Run type-check**

```bash
npm run type-check
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/test/page.tsx
git commit -m "fix(security): guard /test page behind NODE_ENV check

Test page can wipe all user data. Now only accessible in development mode.
Shows 'Not Available' message in production."
```

---

### Task 1.6: Remove unused rate limiters and auth placeholder

**Files:**
- Modify: `src/lib/utils/rate-limit.ts`

**Step 1: Remove unused exports (lines 77-103 and 105-164)**

Keep only `rateLimit()`, `cleanupExpiredTokens()`, and the types. Remove:
- `ipRateLimit` (line 78-81) — never imported
- `userRateLimit` (line 84-87) — never imported
- `priceFetchRateLimit` (line 90-93) — never imported
- `batchRequestRateLimit` (line 95-98) — never imported
- `uploadRateLimit` (line 100-103) — never imported
- `createRateLimitMiddleware` (line 106-133) — never imported
- `extractIPKey` (line 136-151) — never imported
- `extractUserKey` (line 153-164) — never imported, contains auth placeholder code
- `createRateLimitResponse` (line 167-191) — never imported

The file should contain only the `RateLimitConfig` interface, `TokenData` interface, `tokenStorage`, `rateLimit()` function, and `cleanupExpiredTokens()` helper.

**Step 2: Run tests**

```bash
npm run type-check
npm run test -- --run
```

**Step 3: Commit**

```bash
git add src/lib/utils/rate-limit.ts
git commit -m "refactor: remove unused rate limiter exports and auth placeholder

Remove 8 pre-built rate limiters, middleware factory, IP/user key extractors,
and response helper that were never imported. Remove auth placeholder code
with hardcoded header slicing. Keep only core rateLimit() function."
```

---

## Phase 2: Error Resilience

### Task 2.1: Create global error boundary

**Files:**
- Create: `src/app/error.tsx`

**Step 1: Create the error boundary**

```typescript
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-2xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md text-center">
        An unexpected error occurred. Your data is safe in your browser&apos;s local storage.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-2 max-w-lg overflow-auto rounded bg-muted p-4 text-sm">
          {error.message}
        </pre>
      )}
      <div className="flex gap-2">
        <Button onClick={reset}>Try Again</Button>
        <Button variant="outline" onClick={() => (window.location.href = '/')}>
          Go Home
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/error.tsx
git commit -m "feat: add route-level error boundary

Catches unhandled errors in dashboard routes. Shows user-friendly message
with retry button. Only displays error details in development mode."
```

---

### Task 2.2: Create global-error boundary (root layout errors)

**Files:**
- Create: `src/app/global-error.tsx`

**Step 1: Create the global error boundary**

```typescript
'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontFamily: 'system-ui, sans-serif',
          gap: '16px',
          padding: '32px',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>
            Something went wrong
          </h2>
          <p style={{ color: '#666', maxWidth: '400px', textAlign: 'center' }}>
            A critical error occurred. Your data is safe in your browser&apos;s local storage.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: '#000',
              color: '#fff',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/global-error.tsx
git commit -m "feat: add global error boundary for root layout failures

Catches errors that break the root layout. Uses inline styles since
Tailwind may not be available. Provides retry button."
```

---

### Task 2.3: Create 404 page

**Files:**
- Create: `src/app/not-found.tsx`

**Step 1: Create the not-found page**

```typescript
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="text-muted-foreground text-lg">Page not found</p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/not-found.tsx
git commit -m "feat: add 404 not-found page

Shows branded 404 page instead of generic browser error.
Links back to dashboard."
```

---

### Task 2.4: Verify error boundaries work

**Step 1: Run type-check and dev server**

```bash
npm run type-check
npm run dev
```

**Step 2: Test 404 page**

Navigate to `http://localhost:3000/nonexistent-page` — should show branded 404.

**Step 3: Test error boundary**

Temporarily throw an error in a page component to verify error.tsx catches it.

---

## Phase 3: Dead Code Removal

### Task 3.1: Delete dead component files

**Files:**
- Delete: `src/components/dashboard/ChartsRow.tsx`
- Delete: `src/components/dashboard/MetricsCards.tsx`
- Delete: `src/components/dashboard/RecentActivity.tsx`
- Delete: `src/components/dashboard/widget-wrapper.tsx`
- Delete: `src/components/charts/portfolio-chart.tsx`
- Delete: `src/components/charts/allocation-donut.tsx`
- Delete: `src/components/ui/avatar.tsx`

**Step 1: Delete all 7 files**

```bash
rm src/components/dashboard/ChartsRow.tsx
rm src/components/dashboard/MetricsCards.tsx
rm src/components/dashboard/RecentActivity.tsx
rm src/components/dashboard/widget-wrapper.tsx
rm src/components/charts/portfolio-chart.tsx
rm src/components/charts/allocation-donut.tsx
rm src/components/ui/avatar.tsx
```

**Step 2: Run type-check to confirm nothing breaks**

```bash
npm run type-check
npm run test -- --run
```

Expected: All pass — these files have zero imports.

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove 7 dead component files

Delete ChartsRow, MetricsCards, RecentActivity (replaced by RGL dashboard),
widget-wrapper (replaced by widget-wrapper-rgl), portfolio-chart and
allocation-donut (replaced by newer versions), avatar (zero imports).
All confirmed zero imports via grep."
```

---

### Task 3.2: Delete dead utility and validation files

**Files:**
- Delete: `src/lib/utils/csv-export.ts`
- Delete: `src/lib/validation/export-schemas.ts`

**Step 1: Delete both files**

```bash
rm src/lib/utils/csv-export.ts
rm src/lib/validation/export-schemas.ts
```

**Step 2: Run type-check**

```bash
npm run type-check
npm run test -- --run
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove dead csv-export utils and export-schemas

csv-export.ts (127 lines) - zero imports, superseded by export-service.
export-schemas.ts (45 lines) - zero imports, unused Zod schemas."
```

---

### Task 3.3: Remove unused functions from utils.ts

**Files:**
- Modify: `src/lib/utils.ts`

**Step 1: Remove dead functions (lines 71-191)**

Remove these functions from `src/lib/utils.ts`:
- `getChangeColor` (lines 72-76)
- `getChangeBgColor` (lines 78-82)
- `isValidEmail` (lines 85-88)
- `isValidSymbol` (lines 90-94)
- `debounce` (lines 97-107)
- `throttle` (lines 110-123)
- `safeDivide` (lines 131-136)
- `calculatePercentageChange` (lines 139-148)
- `sortBy` (lines 151-164)
- `getFromStorage` (lines 167-175)
- `setToStorage` (lines 177-183)
- `removeFromStorage` (lines 185-191)

Also remove the now-unused `logger` import (line 3) and `Decimal` import (line 4) if no remaining functions use them. Keep: `cn()`, re-exports from currency, `formatNumber()`, `formatDate()`, `formatRelativeTime()`, `generateId()`.

The file should look like:

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export currency formatting from centralized module
export {
  formatCurrency,
  formatPercentage,
  formatCompactCurrency,
} from '@/lib/utils/currency';

// Number formatting with abbreviations
export function formatNumber(
  value: number | string | Decimal,
  decimals: number = 2
): string {
  const num = value instanceof Decimal ? value.toNumber() : Number(value);

  if (Math.abs(num) >= 1e9) {
    return (num / 1e9).toFixed(decimals) + 'B';
  }
  if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toFixed(decimals) + 'M';
  }
  if (Math.abs(num) >= 1e3) {
    return (num / 1e3).toFixed(decimals) + 'K';
  }
  return num.toFixed(decimals);
}

// Date formatting
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
}

// Relative time formatting
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - dateObj.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return formatDate(dateObj);
}

// Generate random ID
export function generateId(): string {
  return crypto.randomUUID();
}
```

Note: Keep the `Decimal` import only if `formatNumber` needs it (it does — `value instanceof Decimal`).

```typescript
import { Decimal } from 'decimal.js';
```

**Step 2: Run type-check and tests**

```bash
npm run type-check
npm run test -- --run
```

**Step 3: Commit**

```bash
git add src/lib/utils.ts
git commit -m "refactor: remove 12 unused functions from utils.ts

Remove getChangeColor, getChangeBgColor, isValidEmail, isValidSymbol,
debounce, throttle, safeDivide, calculatePercentageChange, sortBy,
getFromStorage, setToStorage, removeFromStorage. All confirmed zero
imports via codebase-wide grep."
```

---

### Task 3.4: Remove unused npm dependencies

**Step 1: Identify and remove HIGH-confidence unused packages**

```bash
npm uninstall react-window @types/react-window @radix-ui/react-avatar
```

**Step 2: Check for @dnd-kit removal safety**

Search for any `@dnd-kit` imports (the dead `widget-wrapper.tsx` was the only consumer — already deleted in Task 3.1):

```bash
grep -r "@dnd-kit" src/ --include="*.ts" --include="*.tsx"
```

If no results:
```bash
npm uninstall @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Step 3: Check for @tremor/react removal safety**

```bash
grep -r "@tremor" src/ --include="*.ts" --include="*.tsx"
```

If only used in `tax-analysis-tab.tsx`, skip for now (in-use). Otherwise remove.

**Step 4: Run type-check and tests**

```bash
npm run type-check
npm run test -- --run
```

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "refactor: remove unused npm dependencies

Remove react-window, @types/react-window (installed but never imported),
@radix-ui/react-avatar (only consumer was dead avatar.tsx),
@dnd-kit/* (only consumer was dead widget-wrapper.tsx)."
```

---

### Task 3.5: Remove dead cash-ledger.ts service

**Files:**
- Delete: `src/lib/services/cash-ledger.ts`
- Delete: `src/lib/services/__tests__/cash-ledger.test.ts`

**Step 1: Verify zero production imports**

```bash
grep -r "cash-ledger" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "\.test\."
```

If zero results, safe to delete.

**Step 2: Delete files**

```bash
rm src/lib/services/cash-ledger.ts
rm src/lib/services/__tests__/cash-ledger.test.ts
```

**Step 3: Run type-check and tests**

```bash
npm run type-check
npm run test -- --run
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove dead cash-ledger service

241-line module with zero production imports. Test file also removed.
Can be re-implemented when net worth feature integrates cash tracking."
```

---

## Phase 4: Performance Optimization

### Task 4.1: Add Zustand selectors to portfolioStore consumers

This is the highest-impact performance fix. There are ~26 source files (excluding specs/docs) using `usePortfolioStore()` with full-store subscriptions.

**Files:** All files importing `usePortfolioStore` (26 source files)

**Pattern:** In each file, replace destructured full-store access with individual selectors.

**Before (anti-pattern):**
```typescript
const { currentPortfolio, holdings, loadHoldings } = usePortfolioStore();
```

**After (optimized):**
```typescript
const currentPortfolio = usePortfolioStore((s) => s.currentPortfolio);
const holdings = usePortfolioStore((s) => s.holdings);
const loadHoldings = usePortfolioStore((s) => s.loadHoldings);
```

**Step 1: Fix page-level components first (highest impact)**

These render on every navigation and hold large subtrees:
- `src/app/(dashboard)/page.tsx`
- `src/app/(dashboard)/holdings/page.tsx`
- `src/app/(dashboard)/transactions/page.tsx`
- `src/app/(dashboard)/portfolios/page.tsx`
- `src/app/(dashboard)/performance/page.tsx`
- `src/app/(dashboard)/allocation/page.tsx`
- `src/app/(dashboard)/planning/page.tsx`
- `src/app/(dashboard)/tax-analysis/page.tsx`
- `src/app/(dashboard)/reports/page.tsx`
- `src/app/(dashboard)/analysis/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`

**Step 2: Fix component-level consumers**

- `src/components/tables/transaction-table.tsx`
- `src/components/tables/holdings-table.tsx`
- `src/components/portfolio/portfolio-selector.tsx`
- `src/components/forms/add-transaction.tsx`
- `src/components/forms/create-portfolio.tsx`
- `src/components/forms/delete-portfolio-dialog.tsx`
- `src/components/forms/csv-import-dialog.tsx`
- `src/components/dashboard/dashboard-container-rgl.tsx`
- `src/components/planning/goal-input-form.tsx`
- `src/components/planning/liability-manager.tsx`
- `src/components/holdings/add-manual-asset-dialog.tsx`
- `src/components/holdings/add-property-dialog.tsx`

**Step 3: Fix hook consumers**

- `src/hooks/usePerformanceData.ts`
- `src/hooks/useDashboardData.ts`

**Step 4: Run tests**

```bash
npm run type-check
npm run test -- --run
```

**Step 5: Commit**

```bash
git add -A
git commit -m "perf: add Zustand selectors to all portfolioStore consumers

Replace full-store subscriptions with individual field selectors across
26 files. Prevents unnecessary re-renders when unrelated store fields
change. Estimated 40-60% reduction in re-renders during price polling."
```

---

### Task 4.2: Add Zustand selectors to priceStore consumers

**Files:** 6 source files using `usePriceStore()`
- `src/app/(dashboard)/tax-analysis/page.tsx`
- `src/app/(dashboard)/performance/page.tsx`
- `src/components/dashboard/dashboard-container-rgl.tsx`
- `src/components/layout/header.tsx`
- `src/components/tables/holdings-table.tsx`
- `src/components/settings/price-settings.tsx`

**Pattern:** Same as Task 4.1 — replace `usePriceStore()` with individual selectors.

**Step 1: Apply selector pattern to all 6 files**

**Step 2: Run tests**

```bash
npm run type-check
npm run test -- --run
```

**Step 3: Commit**

```bash
git add -A
git commit -m "perf: add Zustand selectors to all priceStore consumers

Replace full-store subscriptions with individual selectors in 6 files.
Critical for price polling — prevents all dashboard widgets from
re-rendering on every 15-60s price update cycle."
```

---

### Task 4.3: Add Zustand selectors to remaining store consumers

**Files:** All remaining `use*Store()` consumers:
- `useDashboardStore()` — 7 source files
- `useUIStore()` — 3 files
- `useTransactionStore()` — 2 files
- `useAllocationStore()` — 1 file
- `usePlanningStore()` — 2 files
- `useTaxSettingsStore()` — 3 files
- `usePerformanceStore()` — 1 file
- `useAnalysisStore()` — 1 file
- `useCsvImportStore()` — 1 file
- `useExportStore()` — 1 file
- `useAssetStore()` — 1 file

**Step 1: Apply selector pattern to all remaining store consumers**

Same approach as Tasks 4.1-4.2.

**Step 2: Run tests**

```bash
npm run type-check
npm run test -- --run
```

**Step 3: Commit**

```bash
git add -A
git commit -m "perf: add Zustand selectors to all remaining store consumers

Complete selector migration across all 14 Zustand stores. Every store
access now uses individual field selectors instead of full subscriptions."
```

---

### Task 4.4: Add dynamic imports for chart components

**Files:**
- Modify: `src/app/(dashboard)/performance/page.tsx`
- Modify: `src/app/(dashboard)/allocation/page.tsx`
- Modify: `src/app/(dashboard)/analysis/page.tsx`
- Modify: `src/app/(dashboard)/planning/page.tsx`
- Modify: `src/components/dashboard/widgets/growth-chart-widget.tsx`
- Modify: `src/components/dashboard/widgets/category-breakdown-widget.tsx`

**Step 1: Add dynamic imports for heavy chart components**

In each file that imports chart components from recharts, wrap them with `next/dynamic`:

```typescript
import dynamic from 'next/dynamic';

// Replace:
// import { PerformanceChart } from '@/components/charts/performance-chart';

// With:
const PerformanceChart = dynamic(
  () => import('@/components/charts/performance-chart').then(mod => ({ default: mod.PerformanceChart })),
  { ssr: false, loading: () => <div className="h-[400px] animate-pulse rounded bg-muted" /> }
);
```

Apply to the heaviest chart consumers first:
1. Performance page (PerformanceChart, BenchmarkSelector)
2. Allocation page (AllocationDonutChart)
3. Analysis page (AllocationChart)
4. Planning page (FireProjectionChart, NetWorthChart)
5. Dashboard chart widgets (GrowthChartWidget, CategoryBreakdownWidget)

**Step 2: Also add optimizePackageImports to next.config.mjs**

```javascript
experimental: {
  typedRoutes: true,
  optimizePackageImports: ['recharts', 'date-fns', 'lucide-react'],
},
```

**Step 3: Run build to verify bundle improvement**

```bash
npm run build
```

Compare First Load JS sizes for dashboard and performance pages vs before.

**Step 4: Run tests**

```bash
npm run type-check
npm run test -- --run
```

**Step 5: Commit**

```bash
git add -A
git commit -m "perf: add dynamic imports for chart components and optimize packages

Lazy-load Recharts components in performance, allocation, analysis, and
planning pages. Add shimmer loading placeholders. Configure
optimizePackageImports for recharts, date-fns, lucide-react.
Reduces initial JS bundle for non-chart pages."
```

---

### Task 4.5: Optimize Dexie queries (getFiltered and getSummary)

**Files:**
- Modify: `src/lib/db/queries.ts` (lines 316-350 and 393-445)

**Step 1: Optimize getFiltered to use index-first lookup**

Replace lines 316-350:

```typescript
async getFiltered(filter: TransactionFilter): Promise<Transaction[]> {
  let collection;

  // Use Dexie index for portfolioId (most common filter)
  if (filter.portfolioId) {
    collection = db.transactions.where('portfolioId').equals(filter.portfolioId);
  } else {
    collection = db.transactions.toCollection();
  }

  // Apply remaining filters in JS (Dexie doesn't support compound WHERE + filter well)
  if (filter.assetId) {
    collection = collection.filter((t) => t.assetId === filter.assetId);
  }

  if (filter.type && filter.type.length > 0) {
    collection = collection.filter((t) => filter.type!.includes(t.type));
  }

  if (filter.dateFrom) {
    collection = collection.filter((t) => new Date(t.date) >= filter.dateFrom!);
  }

  if (filter.dateTo) {
    collection = collection.filter((t) => new Date(t.date) <= filter.dateTo!);
  }

  if (filter.search) {
    const searchLower = filter.search.toLowerCase();
    collection = collection.filter(
      (t) =>
        (t.notes?.toLowerCase().includes(searchLower) ?? false) ||
        (t.importSource?.toLowerCase().includes(searchLower) ?? false)
    );
  }

  const transactions = await collection.toArray();
  return transactions.map((t) => db.convertTransactionDecimals(t));
},
```

**Step 2: Optimize getSummary with index lookup**

Replace lines 393-445 — change the initial query:

```typescript
async getSummary(portfolioId?: string): Promise<TransactionSummary> {
  let transactions;

  if (portfolioId) {
    transactions = await db.transactions
      .where('portfolioId')
      .equals(portfolioId)
      .toArray();
  } else {
    transactions = await db.transactions.toArray();
  }

  const convertedTransactions = transactions.map((t) =>
    db.convertTransactionDecimals(t)
  );

  // ... rest of aggregation logic stays the same ...
```

**Step 3: Run tests**

```bash
npm run type-check
npm run test -- --run
```

**Step 4: Commit**

```bash
git add src/lib/db/queries.ts
git commit -m "perf: optimize Dexie queries to use index-first lookup

getFiltered() and getSummary() now use .where('portfolioId').equals()
instead of .toCollection().filter(). Reduces full table scans — only
loads matching rows from IndexedDB before applying JS filters.
50-80% faster for portfolios with 100+ transactions."
```

---

## Phase 5: Public Repository Readiness

### Task 5.1: Add LICENSE file

**Files:**
- Create: `LICENSE`

**Step 1: Create MIT license file**

```
MIT License

Copyright (c) 2025-2026 Asset Portfolio Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 2: Commit**

```bash
git add LICENSE
git commit -m "docs: add MIT LICENSE file

package.json declares MIT license but no LICENSE file existed.
Required for open-source compliance."
```

---

### Task 5.2: Clean up .gitignore and tracked files

**Files:**
- Modify: `.gitignore`

**Step 1: Add entries for local tool config**

Add these to `.gitignore`:

```gitignore
# Local tool configurations
.claude/settings.local.json
.specify/
screenshots/
```

**Step 2: Remove .DS_Store files from git tracking**

```bash
git rm --cached .DS_Store
git rm --cached docs/.DS_Store
git rm --cached docs/archive/.DS_Store
git rm --cached docs/archive/obsolete/.DS_Store
```

(If any don't exist, that's fine — the `--cached` flag just untracks them.)

**Step 3: Remove .serena/project.yml from tracking**

```bash
git rm --cached .serena/project.yml
```

**Step 4: Remove .claude/settings.local.json from tracking**

```bash
git rm --cached .claude/settings.local.json 2>/dev/null || true
```

**Step 5: Commit**

```bash
git add .gitignore
git add -A
git commit -m "chore: clean up tracked files and extend .gitignore

Remove tracked .DS_Store files (4), .serena/project.yml, and
.claude/settings.local.json from git. Add screenshots/, .specify/,
and local tool configs to .gitignore."
```

---

### Task 5.3: Remove personal information from docs

**Files:**
- Modify: `docs/archive/regression-analysis-2026-02-02.md`

**Step 1: Remove author attribution**

Search for and remove "Author: Nick Morgan" or any personal name references.

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove personal information from documentation

Remove author attributions containing personal names for public release."
```

---

### Task 5.4: Fix README inconsistencies

**Files:**
- Modify: `README.md`

**Step 1: Standardize repository references**

Replace all occurrences:
- `yourusername/portfolio-tracker` → `morgan8889/asset-portfolio`
- `portfolio-tracker.git` → `asset-portfolio.git`
- `portfoliotracker.app` references → remove or mark as placeholder
- Remove the dashboard preview image reference (line 7) if image doesn't exist, or replace with a note

Specific lines to fix:
- Line 3: Already correct (`morgan8889/asset-portfolio`)
- Line 7: Check if `docs/designs/dashboard-preview.png` exists — if not, remove the line
- Line 46: `git clone https://github.com/yourusername/portfolio-tracker.git` → `git clone https://github.com/morgan8889/asset-portfolio.git`
- Line 272: Already correct
- Line 377: Vercel deploy URL → update repo reference
- Line 381: Netlify deploy URL → update repo reference
- Lines 509-512: Remove placeholder URLs or mark as TBD
- Line 516: Star history URL → update

**Step 2: Remove or update placeholder URLs**

For URLs like `docs.portfoliotracker.app` and `support@portfoliotracker.app`, either remove the entire section or replace with GitHub alternatives:
- Documentation → link to repo's `docs/` directory
- Issues → `https://github.com/morgan8889/asset-portfolio/issues`
- Email → remove or replace with GitHub Discussions

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: fix README repository URLs and remove placeholders

Standardize all repo references to morgan8889/asset-portfolio.
Remove placeholder domain references (portfoliotracker.app).
Fix clone URL, deploy buttons, and support links."
```

---

### Task 5.5: Remove private flag and clean package.json

**Files:**
- Modify: `package.json`

**Step 1: Remove "private": true if present**

Check `package.json` for `"private": true`. If found, remove it (or keep it if you don't plan to publish to npm — your choice).

**Step 2: Verify repository field**

Ensure `package.json` has correct `repository` field pointing to the public repo.

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: update package.json metadata for public release"
```

---

## Phase 6: Duplicate Consolidation

### Task 6.1: Add getErrorMessage utility

**Files:**
- Create: `src/lib/utils/error.ts`
- Modify: Files with `error instanceof Error ? error.message : '...'` pattern (26 occurrences)

**Step 1: Create the utility**

```typescript
/**
 * Extract error message from unknown error type.
 * Handles Error objects, strings, and unknown types.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}
```

**Step 2: Replace occurrences incrementally**

Search for the pattern across the codebase and replace with `getErrorMessage(error)`. Focus on files where the pattern appears more than once.

**Step 3: Run tests**

```bash
npm run type-check
npm run test -- --run
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: consolidate error message extraction to getErrorMessage()

Add src/lib/utils/error.ts with getErrorMessage() utility. Replace
26 occurrences of 'error instanceof Error ? error.message : ...'
pattern across the codebase."
```

---

### Task 6.2: Clean up deprecated formatPercent

**Files:**
- Modify: `src/lib/utils/tax-formatters.ts`

**Step 1: Check if formatPercent has any remaining consumers**

```bash
grep -r "formatPercent[^a]" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "\.test\."
```

If zero non-test consumers, remove the deprecated function. If it has consumers, update them to use `formatPercentage` from `@/lib/utils/currency` instead, then remove.

**Step 2: Run tests**

```bash
npm run type-check
npm run test -- --run
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: remove deprecated formatPercent, use formatPercentage everywhere"
```

---

## Verification Gate

After all phases, run the complete verification suite:

```bash
# Type checking
npm run type-check

# Full test suite
npm run test -- --run

# Lint
npm run lint

# Production build
npm run build

# E2E tests (if CI available)
npm run test:e2e
```

All must pass before considering this plan complete.

---

## Summary

| Phase | Tasks | Est. Files Changed | Priority |
|-------|-------|--------------------|----------|
| 1. Security Hardening | 6 tasks | ~6 files | CRITICAL |
| 2. Error Resilience | 4 tasks | 3 new files | CRITICAL |
| 3. Dead Code Removal | 5 tasks | ~15 deleted, ~3 modified | HIGH |
| 4. Performance Optimization | 5 tasks | ~50 files | HIGH |
| 5. Public Readiness | 5 tasks | ~6 files | HIGH |
| 6. Duplicate Consolidation | 2 tasks | ~28 files | MEDIUM |
| **Total** | **27 tasks** | **~110 file touches** | |

Estimated removable code: ~2,500+ lines
Estimated new code: ~200 lines (error boundaries, utilities)
Net reduction: ~2,300+ lines
