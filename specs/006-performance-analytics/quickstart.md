# Quickstart: Portfolio Performance Analytics

**Feature Branch**: `006-performance-analytics`

## Prerequisites

- Node.js 18+ installed
- Project cloned and on `006-performance-analytics` branch
- Dependencies installed (`npm install`)

## Development Setup

```bash
# 1. Verify you're on the correct branch
git branch --show-current
# Expected: 006-performance-analytics

# 2. Install dependencies (if not done)
npm install

# 3. Start development server
npm run dev

# 4. Open browser
open http://localhost:3000
```

## Key Files to Implement

### Phase 1: Database Schema Extension

```bash
# File: src/lib/db/schema.ts
# Action: Add performanceSnapshots table and migration
```

Changes required:
1. Add `performanceSnapshots` table to schema version 2
2. Add Dexie hooks for Decimal serialization
3. Add helper methods for snapshot queries

### Phase 2: Type Definitions

```bash
# File: src/types/performance.ts (NEW)
# Action: Create new types file
```

Contents:
- `PerformanceSnapshot` interface
- `PerformanceSummary` interface
- `TWRResult` interface
- Zod validation schemas

### Phase 3: Core Services

```bash
# Files to create:
src/lib/services/twr-calculator.ts      # TWR calculation logic
src/lib/services/snapshot-service.ts    # Snapshot CRUD + computation
src/lib/services/benchmark-service.ts   # Benchmark data fetching
```

Implementation order:
1. `twr-calculator.ts` - Pure functions, no dependencies
2. `snapshot-service.ts` - Depends on TWR calculator, DB
3. `benchmark-service.ts` - Extends price API

### Phase 4: State Management

```bash
# File: src/lib/stores/performance.ts (NEW)
# Action: Create Zustand store for performance state
```

### Phase 5: UI Components

```bash
# Files to create:
src/components/charts/performance-chart.tsx
src/components/performance/summary-stats.tsx
src/components/performance/holdings-breakdown.tsx
src/components/performance/period-selector.tsx
```

### Phase 6: Page Integration

```bash
# File: src/app/(dashboard)/performance/page.tsx (NEW)
# Action: Create performance analytics page
```

## Testing Commands

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- src/lib/services/__tests__/twr-calculator.test.ts

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run specific E2E test
npx playwright test tests/e2e/performance-analytics.spec.ts

# Type checking
npm run type-check

# Linting
npm run lint
```

## Verification Checklist

### Database Schema
- [ ] `performanceSnapshots` table exists in IndexedDB
- [ ] Decimal fields serialize/deserialize correctly
- [ ] Composite index `[portfolioId+date]` works

### TWR Calculator
- [ ] Single-period return calculation correct
- [ ] Multi-period compounding correct
- [ ] Cash flow timing handled correctly
- [ ] Edge cases: zero values, negative returns

### Snapshot Service
- [ ] Snapshots computed on transaction add
- [ ] Snapshots recomputed on transaction modify
- [ ] Snapshots recomputed on transaction delete
- [ ] Gap filling works correctly

### Benchmark Service
- [ ] ^GSPC fetches from Yahoo Finance
- [ ] Benchmark data cached in IndexedDB
- [ ] Return calculation matches portfolio period

### UI Components
- [ ] Chart renders within 2 seconds
- [ ] Time period changes update within 500ms
- [ ] Holdings table sortable
- [ ] Benchmark overlay toggleable
- [ ] Empty state displays correctly

### E2E Workflows
- [ ] Navigate to /performance
- [ ] View chart with mock data
- [ ] Change time periods
- [ ] Toggle benchmark comparison
- [ ] Export CSV (P3)

## Common Issues

### Issue: Decimal precision errors
**Solution**: Ensure all calculations use `Decimal` objects, convert to `number` only for chart display.

### Issue: Slow snapshot computation
**Solution**: Check that price cache is being reused across date lookups.

### Issue: Chart performance lag
**Solution**: Verify data aggregation is applied for long time periods (weekly/monthly).

### Issue: Benchmark data not loading
**Solution**: Check that `validateSymbol` allows `^` prefix for index symbols.

## Architecture Notes

### Data Flow

```
Transaction Added/Modified
         │
         ▼
Snapshot Service (compute affected range)
         │
         ▼
TWR Calculator (compute returns)
         │
         ▼
IndexedDB (persist snapshots)
         │
         ▼
Performance Store (load on page view)
         │
         ▼
UI Components (render chart/stats)
```

### Performance Considerations

1. **Snapshot computation**: Runs synchronously after transaction save. For large portfolios (5+ years), may take 1-2 seconds. Consider progress indicator.

2. **Chart rendering**: Use data aggregation for periods > 3 months. Never send > 500 data points to Recharts.

3. **Memory usage**: Price cache can grow large for many assets. Clear cache between major operations.

## Related Documentation

- [Specification](./spec.md)
- [Research](./research.md)
- [Data Model](./data-model.md)
- [Service Interfaces](./contracts/service-interfaces.ts)
- [API Contracts](./contracts/api-contracts.ts)
