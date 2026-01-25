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

## Reference Links

- [Spec Document](./spec.md)
- [Research Decisions](./research.md)
- [Data Model](./data-model.md)
- [API Contracts](./contracts/price-api.ts)
- [Implementation Plan](./plan.md)
