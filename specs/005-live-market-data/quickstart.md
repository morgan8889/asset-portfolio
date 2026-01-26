# Quickstart Guide: Live Market Data

**Feature**: 005-live-market-data
**Date**: 2026-01-25

## Overview

This feature extends the portfolio tracker with live market data for US and UK markets, including configurable price updates, market hours awareness, and staleness detection.

## Prerequisites

- Node.js 18+ and npm
- Existing portfolio tracker codebase
- Understanding of:
  - Next.js 14 App Router
  - Zustand state management
  - Dexie.js / IndexedDB
  - TypeScript

## Quick Setup

```bash
# Ensure you're on the feature branch
git checkout 005-live-market-data

# Install dependencies (no new packages required)
npm install

# Start development server
npm run dev
```

## Key Files

### New Files to Create

| File | Purpose |
|------|---------|
| `src/types/market.ts` | Market, MarketState, PricePreferences types |
| `src/lib/services/market-hours.ts` | Market state calculation |
| `src/lib/services/price-service.ts` | Price update orchestration |
| `src/lib/stores/price.ts` | Price polling state (Zustand) |
| `src/lib/utils/market-utils.ts` | UK symbol detection, pence conversion |
| `src/lib/utils/staleness.ts` | Staleness threshold calculation |
| `src/components/dashboard/price-display.tsx` | Price with staleness indicator |
| `src/components/settings/price-settings.tsx` | Update frequency selector |

### Existing Files to Modify

| File | Changes |
|------|---------|
| `src/app/api/prices/[symbol]/route.ts` | Add UK symbol handling |
| `src/lib/db/schema.ts` | No changes (userSettings table exists) |

## Implementation Order

### Phase 1: Core Types & Utilities
1. Create `src/types/market.ts` with Market, MarketState types
2. Create `src/lib/utils/market-utils.ts` with `isUKSymbol()`, `convertPenceToPounds()`
3. Create `src/lib/utils/staleness.ts` with `calculateStaleness()`

### Phase 2: Market Hours Service
1. Create `src/lib/services/market-hours.ts`
2. Implement `getMarketState()` using timezone-aware logic
3. Add holiday detection (basic implementation)

### Phase 3: Price Store & Polling
1. Create `src/lib/stores/price.ts` (Zustand)
2. Implement polling with visibility awareness
3. Add user preference persistence

### Phase 4: API Enhancement
1. Update `/api/prices/[symbol]/route.ts` for UK symbols
2. Test with `.L` suffix symbols

### Phase 5: UI Components
1. Create `PriceDisplay` component with staleness indicator
2. Create `PriceSettings` component for frequency selection
3. Integrate into dashboard

## Code Patterns

### UK Symbol Detection
```typescript
// src/lib/utils/market-utils.ts
export const isUKSymbol = (symbol: string): boolean => {
  return /\.[Ll]$/.test(symbol);
};
```

### Pence to Pounds Conversion
```typescript
// src/lib/utils/market-utils.ts
import Decimal from 'decimal.js';

export const convertPenceToPounds = (
  price: Decimal,
  currency: string
): { displayPrice: Decimal; displayCurrency: string } => {
  if (currency === 'GBp') {
    return {
      displayPrice: price.div(100),
      displayCurrency: 'GBP',
    };
  }
  return { displayPrice: price, displayCurrency: currency };
};
```

### Staleness Calculation
```typescript
// src/lib/utils/staleness.ts
import { REFRESH_INTERVALS, type RefreshInterval, type StalenessLevel } from '@/types/market';

export const calculateStaleness = (
  lastUpdate: Date,
  refreshInterval: RefreshInterval
): StalenessLevel => {
  const intervalMs = REFRESH_INTERVALS[refreshInterval];
  if (intervalMs === 0) return 'fresh'; // Manual mode

  const age = Date.now() - lastUpdate.getTime();
  if (age < intervalMs) return 'fresh';
  if (age < intervalMs * 2) return 'aging';
  return 'stale';
};
```

### Polling with Visibility Awareness
```typescript
// src/lib/stores/price.ts (simplified)
import { create } from 'zustand';

let pollInterval: NodeJS.Timer | null = null;

export const usePriceStore = create((set, get) => ({
  // ... state

  startPolling: (intervalMs: number) => {
    if (pollInterval) clearInterval(pollInterval);
    if (intervalMs > 0 && document.visibilityState === 'visible') {
      pollInterval = setInterval(() => get().refreshPrices(), intervalMs);
    }
  },

  stopPolling: () => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  },
}));

// Setup visibility listener (in component or effect)
document.addEventListener('visibilitychange', () => {
  const store = usePriceStore.getState();
  if (document.visibilityState === 'hidden' && store.preferences.pauseWhenHidden) {
    store.stopPolling();
  } else {
    store.startPolling(REFRESH_INTERVALS[store.preferences.refreshInterval]);
  }
});
```

## Testing

### Unit Tests
```bash
# Run market utilities tests
npm run test -- src/lib/utils/__tests__/market-utils.test.ts

# Run staleness tests
npm run test -- src/lib/utils/__tests__/staleness.test.ts

# Run market hours tests
npm run test -- src/lib/services/__tests__/market-hours.test.ts
```

### E2E Tests
```bash
# Run price refresh workflow tests
npm run test:e2e -- tests/e2e/price-refresh.spec.ts
```

### Manual Testing

1. **UK Symbol Recognition**
   - Add `VOD.L` (Vodafone) to portfolio
   - Verify price displays in GBP (not pence)

2. **Market Hours**
   - Check during US market hours: prices show "Regular" state
   - Check outside hours: prices show "Closed" state

3. **Staleness Indicators**
   - Set refresh to "Standard" (5 min)
   - Wait 5+ minutes without refresh
   - Verify "aging" indicator appears
   - Wait 10+ minutes
   - Verify "stale" indicator appears

4. **Visibility Pause**
   - Set refresh to "Frequent" (1 min)
   - Switch to another tab for 2+ minutes
   - Return and verify polling resumes

## Common Issues

### UK Prices Showing in Pence
**Problem**: Price displays as 150 instead of £1.50
**Solution**: Check `currency` field in API response; convert if `GBp`

### Polling Not Stopping on Tab Hide
**Problem**: API calls continue when tab is hidden
**Solution**: Verify visibility event listener is attached; check `pauseWhenHidden` preference

### Market State Always "CLOSED"
**Problem**: Market shows closed during trading hours
**Solution**: Check timezone handling; ensure `date-fns-tz` is used correctly

### Rate Limiting Errors
**Problem**: 429 errors from Yahoo Finance
**Solution**: Reduce refresh frequency; existing rate limiting should handle this

---

## Performance Page Integration (Added 2026-01-25)

### Overview

The Performance page integration extends live market data to display real-time calculated metrics including CAGR, Max Drawdown, and Sharpe Ratio.

### New Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/usePerformanceData.ts` | Data hook combining live metrics + calculations |
| `src/components/charts/performance-chart.tsx` | Historical performance line chart |
| `src/types/dashboard.ts` | Add PerformancePageData type |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/services/metrics-service.ts` | Implement CAGR, MaxDrawdown, SharpeRatio |
| `src/lib/services/index.ts` | Export new calculation functions |
| `src/hooks/index.ts` | Export usePerformanceData hook |
| `src/app/(dashboard)/performance/page.tsx` | Replace hardcoded values with hook |

### Implementation Order

#### Phase 1: Core Calculations (metrics-service.ts)

Replace stubbed functions with real implementations:

```typescript
// src/lib/services/metrics-service.ts

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

// Sharpe Ratio (4% risk-free rate)
export function calculateSharpeRatio(
  returns: number[],
  riskFreeRate: number = 0.04
): number {
  if (returns.length < 30) return 0; // Insufficient data

  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) =>
    sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return (avgReturn - riskFreeRate / 252) / stdDev;
}
```

#### Phase 2: Data Hook (usePerformanceData.ts)

```typescript
// src/hooks/usePerformanceData.ts
export function usePerformanceData() {
  const { holdings, assets, currentPortfolio } = usePortfolioStore();
  const liveMetrics = useLivePriceMetrics(holdings, assets);

  const [performanceData, setPerformanceData] = useState<PerformancePageData | null>(null);

  useEffect(() => {
    if (!currentPortfolio) return;

    async function calculate() {
      const historicalValues = await getHistoricalValues(currentPortfolio.id, 'ALL');
      const annualizedReturn = calculateAnnualizedReturn(...);
      const maxDrawdown = calculateMaxDrawdown(historicalValues);
      const sharpeRatio = calculateSharpeRatio(...);
      // Combine with liveMetrics
      setPerformanceData({...});
    }
    calculate();
  }, [currentPortfolio?.id, liveMetrics.totalValue]);

  return performanceData;
}
```

#### Phase 3: UI Components

1. **Performance Page** (`page.tsx`): Replace hardcoded values with hook data
2. **PerformanceChart**: Reuse patterns from existing `GrowthChartWidget`

### Testing Performance Page

```bash
# Unit tests for calculations
npm run test -- src/lib/services/__tests__/metrics-service.test.ts

# E2E tests
npx playwright test tests/e2e/performance-page.spec.ts
```

### Manual Verification

1. Navigate to http://localhost:3000/performance
2. Verify metrics show calculated values (not hardcoded "+12.5%", "+8.2%", etc.)
3. Change time period, verify chart updates
4. Verify top/bottom performers display correctly

## Reference Links

- [Spec Document](./spec.md)
- [Research Decisions](./research.md)
- [Data Model](./data-model.md)
- [API Contracts](./contracts/price-api.ts)
- [Implementation Plan](./plan.md)
