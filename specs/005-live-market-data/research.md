# Research: Live Market Data for US and UK Markets

**Feature**: 005-live-market-data
**Date**: 2026-01-25
**Status**: Complete

## Research Topics

### 1. Yahoo Finance UK Symbol Support

**Question**: How does Yahoo Finance handle UK-listed securities?

**Decision**: Use Yahoo Finance with `.L` suffix for LSE-listed securities

**Rationale**:
- Yahoo Finance already supports UK securities using the `.L` suffix (e.g., `VOD.L` for Vodafone)
- The existing `fetchYahooPrice` function in `route.ts` works with UK symbols without modification
- Response includes `currency: "GBp"` (pence) or `currency: "GBP"` (pounds) for proper display
- AIM-listed securities also use `.L` suffix on Yahoo Finance

**Alternatives Considered**:
1. **Alpha Vantage UK API**: Requires separate API key, rate limits more restrictive (5/min free tier)
2. **London Stock Exchange API**: Requires commercial license, not suitable for personal portfolio tracker
3. **Financial Times Markets API**: No public API available

**Implementation Notes**:
- UK symbols detected by `.L` suffix (case-insensitive)
- Yahoo Finance returns `marketState` in response metadata (already captured)
- Currency field indicates if price is in pence (`GBp`) vs pounds (`GBP`)

---

### 2. Pence to Pounds Conversion

**Question**: How should UK prices quoted in pence be handled?

**Decision**: Convert pence to pounds at display time; store raw value with currency indicator

**Rationale**:
- Yahoo Finance returns UK prices with `currency: "GBp"` when quoted in pence
- Storing raw values preserves data fidelity for historical analysis
- Conversion at display time allows flexible formatting
- Division by 100 is simple and maintains precision with decimal.js

**Pattern**:
```typescript
// Detection
const isInPence = currency === 'GBp';

// Conversion (using decimal.js for precision)
const displayPrice = isInPence
  ? new Decimal(rawPrice).div(100)
  : new Decimal(rawPrice);

// Display
const formatted = `£${displayPrice.toFixed(2)}`;
```

**Alternatives Considered**:
1. **Convert on storage**: Loses information about original denomination
2. **Always display in pence**: Inconsistent with user expectations (£1.50 vs 150p)

---

### 3. Market Hours Logic

**Question**: How to determine market state for US and UK exchanges?

**Decision**: Calculate market state based on exchange timezone and standard trading hours

**Rationale**:
- US markets: NYSE/NASDAQ operate 9:30 AM - 4:00 PM ET
- UK markets: LSE operates 8:00 AM - 4:30 PM GMT/BST
- Pre-market and after-hours vary by exchange but have standard windows
- Holiday calendars are complex; rely on Yahoo Finance `marketState` when available

**Market Hours Reference**:

| Exchange | Timezone | Pre-Market | Regular | Post-Market |
|----------|----------|------------|---------|-------------|
| NYSE/NASDAQ | America/New_York | 4:00-9:30 | 9:30-16:00 | 16:00-20:00 |
| LSE | Europe/London | 5:05-8:00 | 8:00-16:30 | 16:30-17:15 |
| AIM | Europe/London | - | 8:00-16:30 | - |

**Implementation Notes**:
- Use `date-fns-tz` for timezone conversions (already in project dependencies via date-fns)
- Primary source: Yahoo Finance `marketState` field from API response
- Fallback: Calculate from system time when API unavailable
- Cache market state for 1 minute to reduce recalculation

**Alternatives Considered**:
1. **Only use API marketState**: Fails when offline or API unavailable
2. **External market calendar service**: Adds dependency, complexity for holiday handling

---

### 4. Price Update Polling Strategy

**Question**: How to implement configurable automatic price updates?

**Decision**: Use `setInterval` in Zustand store with visibility-aware polling

**Rationale**:
- Simple and reliable for client-side polling
- Visibility API prevents unnecessary requests when tab is hidden
- User preference stored in IndexedDB persists across sessions
- Existing rate limiting in API route prevents abuse

**Update Intervals**:

| Setting | Interval | Use Case |
|---------|----------|----------|
| Real-time | 30 seconds | Active trading, day traders |
| Frequent | 1 minute | Active monitoring |
| Standard | 5 minutes | Casual checking (default) |
| Manual | Never | Long-term investors, offline |

**Implementation Pattern**:
```typescript
// In price store
let pollInterval: NodeJS.Timer | null = null;

const startPolling = (intervalMs: number) => {
  stopPolling();
  if (intervalMs > 0 && document.visibilityState === 'visible') {
    pollInterval = setInterval(() => refreshPrices(), intervalMs);
  }
};

// Pause when tab hidden
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    stopPolling();
  } else {
    startPolling(currentInterval);
  }
});
```

**Alternatives Considered**:
1. **WebSocket/SSE**: Overkill for delayed quotes; adds server complexity
2. **Service Worker background sync**: Browser support inconsistent; privacy concerns
3. **React Query polling**: Would work but adds dependency; Zustand sufficient

---

### 5. Staleness Detection

**Question**: How to calculate and display price staleness?

**Decision**: Stale threshold = 2× configured update interval

**Rationale**:
- Adaptive to user's chosen refresh frequency
- If user chose 5-minute updates, stale at 10 minutes makes intuitive sense
- Provides consistent UX regardless of preference
- Clarified during `/speckit.clarify` session

**Staleness Levels**:

| State | Condition | Visual Indicator |
|-------|-----------|------------------|
| Fresh | age < interval | Green dot or no indicator |
| Aging | interval ≤ age < 2×interval | Yellow/amber indicator |
| Stale | age ≥ 2×interval | Red indicator + warning text |

**Implementation**:
```typescript
type StalenessLevel = 'fresh' | 'aging' | 'stale';

function calculateStaleness(
  lastUpdate: Date,
  intervalMs: number
): StalenessLevel {
  const age = Date.now() - lastUpdate.getTime();
  if (age < intervalMs) return 'fresh';
  if (age < intervalMs * 2) return 'aging';
  return 'stale';
}
```

---

### 6. Symbol Validation for UK Markets

**Question**: How to validate and recognize UK symbol formats?

**Decision**: Pattern matching with `.L` suffix; pass-through to Yahoo Finance for validation

**Rationale**:
- LSE symbols follow pattern: `TICKER.L` (e.g., `VOD.L`, `HSBA.L`, `BP.L`)
- AIM symbols: Same pattern but smaller companies
- FTSE 100/250 symbols are 2-4 characters typically
- Let Yahoo Finance be the authoritative validator

**Symbol Patterns**:
```typescript
// UK market detection
const isUKSymbol = (symbol: string): boolean => {
  return /\.[Ll]$/.test(symbol);
};

// Exchange extraction
const getExchange = (symbol: string): string => {
  if (isUKSymbol(symbol)) return 'LSE';
  if (isCrypto(symbol)) return 'CRYPTO';
  return 'US'; // Default for NYSE/NASDAQ/AMEX
};
```

---

## Summary of Decisions

| Topic | Decision | Key Rationale |
|-------|----------|---------------|
| UK Price Source | Yahoo Finance with .L suffix | Already supported, no new dependency |
| Pence Handling | Convert at display time | Preserves data fidelity |
| Market Hours | API primary, calculated fallback | Reliability + offline support |
| Polling | setInterval with visibility awareness | Simple, effective, battery-friendly |
| Staleness | 2× interval threshold | Adaptive to user preference |
| Symbol Validation | Pattern match + API validation | Simple detection, authoritative validation |

## Dependencies Identified

- **Existing**: date-fns (timezone handling via date-fns-tz)
- **Existing**: decimal.js (pence conversion precision)
- **Existing**: Zustand (polling state management)
- **Existing**: Dexie.js (preference persistence)
- **New**: None required

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Yahoo Finance rate limiting | Medium | Medium | Existing rate limiting; batch requests |
| Yahoo Finance API changes | Low | High | Abstract price fetching; easy to swap providers |
| Timezone edge cases (DST) | Medium | Low | Use date-fns-tz for robust handling |
| Browser tab throttling | Medium | Low | Visibility API pauses polling; resume on focus |
