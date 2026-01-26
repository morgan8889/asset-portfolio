# Research: Portfolio Performance Analytics

**Phase**: 0 - Research | **Date**: 2025-01-25

## Research Areas

### 1. Time-Weighted Return (TWR) Calculation

**Decision**: Implement Modified Dietz TWR approximation for daily periods

**Rationale**:
- True TWR requires portfolio valuation at every cash flow, which is computationally expensive
- Modified Dietz provides acceptable accuracy (within 0.1% for typical portfolios) with daily snapshots
- Already have daily price data and pre-computed snapshots to support this

**Formula**:
```
TWR = [(1 + R1) × (1 + R2) × ... × (1 + Rn)] - 1

Where each sub-period return Ri:
Ri = (EMV - BMV - CF) / (BMV + Σ(CFi × Wi))

EMV = End Market Value
BMV = Beginning Market Value
CF = Cash Flows (buys positive, sells negative)
Wi = Weight = (days remaining in period) / (total days in period)
```

**Alternatives Considered**:
| Method | Pros | Cons | Decision |
|--------|------|------|----------|
| Simple Return | Easy to implement | Distorted by cash flows | ❌ Rejected |
| True TWR | Most accurate | Requires valuation at every cash flow | ❌ Too expensive |
| Modified Dietz | Good balance of accuracy/performance | Slight approximation | ✅ Selected |
| Money-Weighted (IRR) | Shows actual investor experience | Sensitive to timing luck | ❌ Per spec clarification |

**Implementation Notes**:
- Break periods at each transaction (buy/sell)
- Use daily snapshots as sub-period boundaries
- Calculate compound return across all sub-periods
- Handle edge cases: no transactions, single day, zero starting value

### 2. Benchmark Data (S&P 500)

**Decision**: Use ^GSPC ticker via existing Yahoo Finance API proxy

**Rationale**:
- Yahoo Finance already integrated and working
- ^GSPC is the official S&P 500 index ticker
- Historical data available for 40+ years
- No additional API keys or services required

**Implementation**:
```typescript
// Extend existing price API to handle index symbols
const isIndexSymbol = (symbol: string) => symbol.startsWith('^');

// ^GSPC will work with existing fetchYahooPrice function
// Just need to update validateSymbol to allow ^ prefix
```

**Caching Strategy**:
- Cache benchmark data in IndexedDB alongside asset prices
- Reuse existing `priceHistory` table structure
- Create pseudo-asset entry for ^GSPC with type 'index'

**Alternatives Considered**:
| Source | Pros | Cons | Decision |
|--------|------|------|----------|
| Yahoo Finance ^GSPC | Already integrated, free | Rate limits apply | ✅ Selected |
| Alpha Vantage | Official API | Requires separate key, quota | ❌ Unnecessary |
| Static historical data | No API calls | Requires manual updates | ❌ Maintenance burden |
| Fred API | Official Fed data | Different data format | ❌ Over-engineered |

### 3. Snapshot Computation Strategy

**Decision**: Compute snapshots on transaction add/modify with incremental updates

**Rationale**:
- Matches clarification decision from spec (FR-013)
- Provides immediate feedback when users add transactions
- Avoids background jobs (incompatible with browser-only architecture)
- Only recomputes affected date range, not full history

**Algorithm**:
```
On transaction add/modify:
1. Determine affected date range: [transaction.date, today]
2. For each day in range:
   a. Calculate holdings at day end (from transactions)
   b. Look up prices for each holding
   c. Sum to get total portfolio value
   d. Compute day-over-day change
   e. Upsert snapshot record
3. Update summary statistics cache
```

**Performance Optimization**:
- Batch price lookups per day
- Use existing `PriceCache` from price-lookup.ts
- Index snapshots by [portfolioId, date] for fast range queries
- Limit initial computation to last 5 years for new portfolios

**Edge Cases**:
| Scenario | Handling |
|----------|----------|
| Transaction deleted | Recompute from deleted date forward |
| Transaction date modified | Recompute from earlier of old/new date |
| Back-dated transaction | Recompute from transaction date forward |
| Missing price data | Use interpolated price, flag snapshot |
| First transaction ever | Start snapshots from transaction date |

### 4. Chart Performance Optimization

**Decision**: Pre-aggregate data for long time periods

**Rationale**:
- 10 years of daily data = 3,650+ points (too many for smooth rendering)
- Recharts performance degrades above ~500 points
- Users can't visually distinguish daily points over years anyway

**Aggregation Strategy**:
| Period | Resolution | Max Points |
|--------|------------|------------|
| 1W, 1M | Daily | 30 |
| 3M | Daily | 90 |
| 1Y | Weekly | 52 |
| ALL (< 2 years) | Weekly | 104 |
| ALL (2-5 years) | Weekly | 260 |
| ALL (> 5 years) | Monthly | 120 |

**Implementation**:
- Store daily snapshots always (source of truth)
- Aggregate on-demand when fetching for chart
- Use end-of-period value for aggregated points
- Preserve min/max within period for accurate high/low stats

### 5. Decimal.js Integration Pattern

**Decision**: Use consistent serialization pattern from existing codebase

**Rationale**:
- Existing pattern in `decimal-serialization.ts` handles IndexedDB storage
- Maintains compatibility with Dexie hooks
- Prevents precision loss during storage/retrieval

**New Decimal Fields for PerformanceSnapshot**:
```typescript
const PERFORMANCE_SNAPSHOT_DECIMAL_FIELDS = [
  'totalValue',
  'dayChange',
  'cumulativeReturn',
  'twrReturn',
] as const;
```

**Serialization Flow**:
1. Compute with Decimal objects in memory
2. Serialize to string before IndexedDB write (via Dexie hook)
3. Deserialize back to Decimal on read
4. Use Decimal for all intermediate calculations
5. Convert to number only for chart display

### 6. Existing Code Reuse Analysis

**Components to Reuse**:
| Existing | Purpose | Modification Needed |
|----------|---------|---------------------|
| `historical-value.ts` | Portfolio value at date | Refactor to share with snapshot service |
| `performance-calculator.ts` | Holding performance | Extend with TWR calculation |
| `price-lookup.ts` | Price fetching with cache | None - use as-is |
| `TIME_PERIOD_CONFIGS` | Period definitions | None - use as-is |
| `HoldingPerformance` type | Per-holding metrics | None - use as-is |

**Components to Create**:
| New | Purpose |
|-----|---------|
| `snapshot-service.ts` | Snapshot computation/persistence |
| `twr-calculator.ts` | TWR calculation logic (pure functions) |
| `benchmark-service.ts` | Benchmark data fetching/caching |
| `performance.ts` store | UI state management |
| `PerformanceSnapshot` type | Snapshot entity definition |

### 7. Testing Strategy

**Unit Tests (Vitest)**:
```
src/lib/services/__tests__/
├── twr-calculator.test.ts      # TWR calculation edge cases
│   ├── Single period returns
│   ├── Multi-period compounding
│   ├── Cash flow timing
│   ├── Zero/negative values
│   └── Decimal precision
├── snapshot-service.test.ts    # Snapshot computation
│   ├── New snapshot creation
│   ├── Incremental updates
│   ├── Gap handling
│   └── Transaction triggers
└── benchmark-service.test.ts   # Benchmark data
    ├── ^GSPC fetching
    ├── Cache behavior
    └── Error handling
```

**E2E Tests (Playwright)**:
```
tests/e2e/performance-analytics.spec.ts
├── Navigate to performance page
├── View portfolio chart with mock data
├── Change time period (verify chart updates)
├── View individual holding performance
├── Enable benchmark comparison
├── Export performance data (P3)
└── Handle empty portfolio state
```

**Coverage Targets**:
- TWR calculator: 95%+ (critical financial logic)
- Snapshot service: 80%+
- Benchmark service: 70%+

## Summary of Decisions

| Area | Decision | Risk Level |
|------|----------|------------|
| Return Calculation | Modified Dietz TWR | Low - industry standard |
| Benchmark Source | Yahoo Finance ^GSPC | Low - already integrated |
| Snapshot Trigger | On transaction change | Low - per clarification |
| Chart Aggregation | Period-based resolution | Low - standard practice |
| Decimal Handling | Existing serialization pattern | Low - proven pattern |

All research areas resolved. Ready for Phase 1: Design & Contracts.
