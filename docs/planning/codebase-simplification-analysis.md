# Asset Portfolio Codebase Simplification Analysis

## Executive Summary

After analyzing 261 TypeScript/TSX files across the asset-portfolio codebase, I identified several categories of simplification opportunities. The codebase is generally well-structured with good separation of concerns, but there are clear areas for improvement in code duplication, type safety, and complexity reduction.

---

## 1. Code Duplication (High Priority)

### 1.1 API Routes - Duplicated Price Fetching Logic

**Files:**
- `/src/app/api/prices/[symbol]/route.ts` (347 lines)
- `/src/app/api/prices/batch/route.ts` (422 lines)

**Issue:** Both files contain nearly identical implementations of:
- `fetchYahooPrice()` function (~60 lines each)
- `fetchCoinGeckoPrice()` function (~50 lines each)
- `priceSources` array configuration
- `fetchPriceWithRetry()` function (~50 lines each)
- Cache configuration constants

**Impact:** ~200 lines of duplicated code across 2 files

**Recommendation:** Extract shared price-fetching logic into a new service:
```typescript
// src/lib/services/price-sources.ts
export const priceSources: PriceSource[];
export async function fetchPriceWithRetry(symbol: string): Promise<PriceResult>;
export async function fetchYahooPrice(symbol: string): Promise<PriceResult>;
export async function fetchCoinGeckoPrice(symbol: string): Promise<PriceResult>;
```

### 1.2 Duplicate Sharpe Ratio Calculations

**Files:**
- `/src/lib/services/metrics-service.ts` (lines 321-355)
- `/src/lib/services/twr-calculator.ts` (lines 452-459)

**Issue:** Two implementations of `calculateSharpeRatio()` with slightly different signatures and logic.

**Recommendation:** Consolidate into a single implementation in `twr-calculator.ts` and re-export from `metrics-service.ts`.

### 1.3 Similar Widget Structure Patterns

**Files:**
- `/src/components/dashboard/widgets/total-value-widget.tsx`
- `/src/components/dashboard/widgets/gain-loss-widget.tsx`
- `/src/components/dashboard/widgets/day-change-widget.tsx`

**Observation:** Good use of shared components (`WidgetCard`, `WidgetSkeleton`, `MetricValue`). The deprecated re-export files (`top-performers-widget.tsx`, `biggest-losers-widget.tsx`) suggest ongoing consolidation efforts.

**Recommendation:** Remove deprecated wrapper files once consumers are updated to use `PerformanceListWidget` directly.

---

## 2. Type Safety Issues (High Priority)

### 2.1 Excessive `any` Usage

**Total occurrences:** 120+ instances of `: any` or `as any` across 38 files

**Most Problematic Files:**

| File | Issue Count | Severity |
|------|-------------|----------|
| `/src/lib/db/__tests__/queries.test.ts` | 50+ | Medium (test code) |
| `/src/lib/services/allocation/__tests__/target-service.test.ts` | 20+ | Medium (test code) |
| `/src/app/api/prices/[symbol]/route.ts` | 5 | High |
| `/src/app/api/prices/batch/route.ts` | 5 | High |
| `/src/lib/utils/logger.ts` | 10 | Medium |
| `/src/lib/utils.ts` | 6 | Medium |

**Production Code Concerns:**
```typescript
// src/app/api/prices/[symbol]/route.ts:15
metadata?: any;

// src/lib/utils.ts:186
export function getFromStorage(key: string): any {

// src/lib/services/property-service.ts:225
await db.holdings.add(holding as any);
```

**Recommendation:**
1. Create proper type definitions for API metadata structures
2. Use generic type parameters for storage functions
3. Fix database operations to use proper storage types

### 2.2 Component Prop Type Assertions

**Files:**
- `/src/components/layout/sidebar.tsx:87` - `href as any`
- `/src/components/analysis/recommendation-card.tsx:72` - `actionUrl as any`
- `/src/components/forms/add-transaction.tsx:186` - `type as any`

**Recommendation:** Define proper types for navigation and form field values.

---

## 3. Complex Functions (Medium Priority)

### 3.1 Large Store Files

**File:** `/src/lib/stores/price.ts` (708 lines)

**Issue:** The price store contains:
- State management
- Polling infrastructure
- Cache persistence
- Network state handling
- Price transformation logic

**Recommendation:** Split into:
- `price-state.ts` - Core state and simple mutations
- `price-effects.ts` - Async effects (polling, persistence)
- Keep `transformPriceData()` as a pure utility function

### 3.2 CSV Import Dialog Complexity

**File:** `/src/components/forms/csv-import-dialog.tsx` (416 lines)

**Issue:** Single component manages 5 different workflow steps with complex state.

**Recommendation:** Consider a state machine pattern (XState) or step-specific sub-components:
```typescript
const stepComponents: Record<DialogStep, React.ComponentType> = {
  upload: UploadStep,
  preview: PreviewStep,
  mapping: MappingStep,
  importing: ImportingStep,
  results: ResultsStep,
};
```

### 3.3 Dashboard Store Repetition

**File:** `/src/lib/stores/dashboard.ts` (317 lines)

**Issue:** 10+ similar methods following the same optimistic update pattern.

**Recommendation:** Create a generic update helper:
```typescript
function createOptimisticSetter<K extends keyof DashboardConfiguration>(
  field: K,
  persist: (value: DashboardConfiguration[K]) => Promise<void>
): (value: DashboardConfiguration[K]) => Promise<void>
```

---

## 4. Inconsistent Patterns (Medium Priority)

### 4.1 Mixed Error Handling Strategies

**Observation:** Some stores use `console.error`, others use the `logger` service.

**Files with console.log/warn/error:** 126 occurrences across 38 files

**Most Notable:**
- `/src/lib/stores/price.ts` - 21 console calls
- `/src/lib/db/migrations.ts` - 27 console calls

**Recommendation:** Standardize on the `logger` service for production code, reserve `console.*` for development-only debugging.

### 4.2 Decimal Field Handling

**Issue:** Inconsistent patterns for Decimal serialization/deserialization across the codebase.

**Files:**
- `/src/lib/db/converters.ts` - Manual conversion
- `/src/lib/utils/decimal-serialization.ts` - Generic utility
- Various services doing inline conversion

**Recommendation:** Consolidate all Decimal handling through `decimal-serialization.ts`.

---

## 5. Dead Code Candidates (Low Priority)

### 5.1 Deprecated Wrapper Components

**Files to remove after migration:**
- `/src/components/dashboard/widgets/top-performers-widget.tsx` (13 lines)
- `/src/components/dashboard/widgets/biggest-losers-widget.tsx` (13 lines)

These are marked deprecated and only re-export from `performance-list-widget.tsx`.

### 5.2 Unused Exports Check Needed

**Recommendation:** Run `npx ts-prune` to identify unused exports across the codebase.

---

## 6. Missing Abstractions (Medium Priority)

### 6.1 Gain/Loss Calculation Pattern

**Repeated pattern across multiple files:**
```typescript
const unrealizedGain = currentValue.minus(costBasis);
const unrealizedGainPercent = costBasis.isZero()
  ? 0
  : unrealizedGain.dividedBy(costBasis).mul(100).toNumber();
```

**Files:**
- `/src/lib/services/holdings-service.ts` (lines 245-251)
- `/src/lib/db/queries.ts` (lines 223-226)
- `/src/lib/services/portfolio-service.ts` (lines 68-70)

**Recommendation:** Already exists in `metrics-service.ts` as `calculatePositionGainLoss()` - ensure consistent usage.

### 6.2 Date Range Utilities

**Repeated pattern:**
```typescript
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - days);
```

**Recommendation:** Create a `dateRange` utility module with common date calculations.

### 6.3 Safe Division Pattern

**Multiple implementations of divide-by-zero safety:**
- `/src/lib/services/metrics-service.ts` - `safePercent()`
- `/src/lib/utils.ts` - `safeDivide()`

**Recommendation:** Standardize on a single implementation.

---

## 7. Performance Considerations (Low Priority)

### 7.1 Repeated Asset Lookups

**Pattern found in multiple services:**
```typescript
const assetMap = new Map(assets.map((a) => [a.id, a]));
// or
const asset = assets.find((a) => a.id === holding.assetId);
```

**Recommendation:** Consider a shared utility or hook that maintains an asset lookup map.

---

## Prioritized Action Plan

### Phase 1: Type Safety (High Impact)
1. Create typed interfaces for API metadata structures
2. Fix `as any` assertions in database operations
3. Add proper generics to storage utility functions

### Phase 2: Code Deduplication (High Impact)
1. Extract shared price-fetching logic from API routes
2. Consolidate Sharpe ratio calculations
3. Remove deprecated widget wrappers

### Phase 3: Complexity Reduction (Medium Impact)
1. Split price store into focused modules
2. Refactor CSV import dialog with step components
3. Create generic dashboard store update helper

### Phase 4: Consistency (Medium Impact)
1. Standardize logging (logger vs console)
2. Consolidate Decimal serialization patterns
3. Standardize gain/loss calculations

### Phase 5: Cleanup (Low Impact)
1. Run `ts-prune` for unused exports
2. Remove dead code
3. Add date range utility functions

---

## Metrics Summary

| Category | Issues Found | Priority |
|----------|-------------|----------|
| Code Duplication | 3 major patterns | High |
| Type Safety (`any` usage) | 120+ instances | High |
| Complex Functions | 3 large files | Medium |
| Inconsistent Patterns | 2 patterns | Medium |
| Dead Code | 2 deprecated files | Low |
| Missing Abstractions | 3 patterns | Medium |
