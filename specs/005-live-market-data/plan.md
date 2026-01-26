# Implementation Plan: Live Market Data - Performance Page Integration

**Branch**: `005-live-market-data` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-live-market-data/spec.md`

## Summary

Integrate live market data into the Performance page, replacing hardcoded placeholder values with real-time calculated metrics. This extends the existing live price infrastructure (already implemented for dashboard widgets) to the Performance page, adding new calculations for CAGR, Max Drawdown, and Sharpe Ratio.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Next.js 14.2 (App Router)
**Primary Dependencies**: React 18, Zustand 4.5, decimal.js, Recharts 2.15, date-fns
**Storage**: Browser IndexedDB via Dexie.js (existing price cache, transaction history)
**Testing**: Vitest for unit tests, Playwright for E2E
**Target Platform**: Modern browsers (desktop-first, responsive)
**Project Type**: Web application (Next.js monorepo)
**Performance Goals**: Performance page loads in <2 seconds, metrics update reactively with live prices
**Constraints**: All calculations use decimal.js, privacy-first (no server-side data)
**Scale/Scope**: Portfolio with up to 50 holdings, historical data spanning multiple years

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy-First Architecture | ✅ PASS | All calculations client-side, uses existing local stores |
| II. Financial Precision | ✅ PASS | All metrics use decimal.js, existing pattern in metrics-service.ts |
| III. Type Safety & Validation | ✅ PASS | TypeScript strict mode, new types in src/types/ |
| IV. Test-Driven Quality | ✅ PASS | Unit tests for new calculation functions, E2E for page |
| V. Component Architecture | ✅ PASS | Client component (interactive charts), reuses shadcn/ui |

**Technology Stack Compliance**: All technologies already in use - no new dependencies required.

## Project Structure

### Documentation (this feature)

```text
specs/005-live-market-data/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/(dashboard)/performance/
│   └── page.tsx                    # MODIFY: Replace hardcoded values with hook
├── components/
│   └── charts/
│       └── performance-chart.tsx   # CREATE: New chart component
├── hooks/
│   ├── index.ts                    # MODIFY: Export new hook
│   └── usePerformanceData.ts       # CREATE: Performance page data hook
├── lib/services/
│   ├── index.ts                    # MODIFY: Export new functions
│   └── metrics-service.ts          # MODIFY: Add CAGR, Sharpe, MaxDrawdown
└── types/
    └── dashboard.ts                # MODIFY: Add PerformancePageData type

tests/
├── e2e/
│   └── performance-page.spec.ts    # CREATE: E2E tests
└── unit/ (via src/lib/services/__tests__/)
    └── metrics-service.test.ts     # MODIFY: Add tests for new functions
```

**Structure Decision**: Single Next.js web application (no backend separation needed). New code integrates into existing structure following established patterns.

## Complexity Tracking

> No constitution violations requiring justification. All additions follow existing patterns.

## Existing Infrastructure Analysis

### Already Implemented (Reuse)

| Component | Location | Provides |
|-----------|----------|----------|
| `useLivePriceMetrics` | `src/hooks/useLivePriceMetrics.ts` | totalValue, totalGain, topPerformers, biggestLosers |
| `getHistoricalValues` | `src/lib/services/historical-value.ts` | Time-series portfolio values for charts |
| `calculateAllPerformance` | `src/lib/services/performance-calculator.ts` | Per-holding performance by period |
| `getTopPerformers/getBiggestLosers` | `src/lib/services/performance-calculator.ts` | Ranking functions |
| Price Store | `src/lib/stores/price.ts` | Live price subscription infrastructure |

### Gaps to Fill (New Code)

| Function | Location | Purpose |
|----------|----------|---------|
| `calculateAnnualizedReturn` | `metrics-service.ts` | CAGR calculation (currently stubbed → 0) |
| `calculateMaxDrawdown` | `metrics-service.ts` | Peak-to-trough decline (currently stubbed → 0) |
| `calculateSharpeRatio` | `metrics-service.ts` | Risk-adjusted return (currently stubbed → 0) |
| `usePerformanceData` | New hook | Combines live metrics + calculations for page |
| `PerformanceChart` | New component | Line chart with period selection |

## Implementation Approach

### Phase 1: Core Calculations (metrics-service.ts)

Replace stubbed functions in `calculateBasicPerformance()`:

```typescript
// Annualized Return (CAGR)
export function calculateAnnualizedReturn(
  startValue: Decimal,
  endValue: Decimal,
  daysHeld: number
): number {
  if (daysHeld <= 0 || startValue.isZero()) return 0;
  const years = daysHeld / 365;
  const ratio = endValue.div(startValue).toNumber();
  return (Math.pow(ratio, 1 / years) - 1) * 100;
}

// Max Drawdown
export function calculateMaxDrawdown(
  historicalValues: { date: Date; value: Decimal }[]
): number {
  let maxDrawdown = 0;
  let peak = new Decimal(0);

  for (const point of historicalValues) {
    if (point.value.gt(peak)) peak = point.value;
    if (peak.gt(0)) {
      const drawdown = peak.minus(point.value).div(peak).toNumber();
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }
  }

  return maxDrawdown * 100;
}

// Sharpe Ratio (simplified - using 4% risk-free rate)
export function calculateSharpeRatio(
  returns: number[], // Array of period returns (e.g., daily/weekly)
  riskFreeRate: number = 0.04
): number {
  if (returns.length < 30) return 0; // Insufficient data

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return (avgReturn - riskFreeRate / 252) / stdDev; // Daily risk-free rate
}
```

### Phase 2: Data Hook (usePerformanceData.ts)

```typescript
export function usePerformanceData(portfolioId: string) {
  const { holdings, assets } = usePortfolioStore();
  const liveMetrics = useLivePriceMetrics(holdings, assets);

  // Async calculations with useMemo + useEffect pattern
  const [performanceData, setPerformanceData] = useState<PerformancePageData | null>(null);

  useEffect(() => {
    async function calculate() {
      const historicalValues = await getHistoricalValues(portfolioId, 'ALL');
      // Calculate CAGR, Sharpe, MaxDrawdown from historicalValues
      // Combine with liveMetrics
    }
    calculate();
  }, [portfolioId, liveMetrics.totalValue]);

  return performanceData;
}
```

### Phase 3: UI Components

1. **Performance Page** (`page.tsx`): Replace hardcoded values with hook data
2. **PerformanceChart**: Reuse patterns from existing `GrowthChartWidget`
3. **MetricCard**: Already exists in shadcn/ui

## Verification

1. **Type Check**: `npm run type-check`
2. **Lint**: `npm run lint`
3. **Unit Tests**:
   - `npm run test -- src/lib/services/__tests__/metrics-service.test.ts`
   - Test CAGR, Sharpe, MaxDrawdown calculations with edge cases
4. **E2E Test**:
   - Navigate to http://localhost:3000/performance
   - Verify metrics show calculated values (not hardcoded)
   - Change time period, verify chart updates
   - Verify top/bottom performers display correctly

## Files to Modify/Create

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/services/metrics-service.ts` | MODIFY | Add CAGR, Sharpe, MaxDrawdown calculations |
| `src/lib/services/index.ts` | MODIFY | Export new functions |
| `src/hooks/usePerformanceData.ts` | CREATE | Data hook for Performance page |
| `src/hooks/index.ts` | MODIFY | Export new hook |
| `src/components/charts/performance-chart.tsx` | CREATE | Historical performance chart |
| `src/app/(dashboard)/performance/page.tsx` | REWRITE | Connect to data, display real metrics |
| `src/types/dashboard.ts` | MODIFY | Add PerformancePageData type |
| `src/lib/services/__tests__/metrics-service.test.ts` | MODIFY | Add tests for new calculations |
