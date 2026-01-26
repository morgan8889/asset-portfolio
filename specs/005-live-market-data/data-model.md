# Data Model: Live Market Data

**Feature**: 005-live-market-data
**Date**: 2026-01-25

## Entity Definitions

### Market

Represents a trading venue with its operating characteristics.

```typescript
interface Market {
  id: string;              // 'NYSE' | 'NASDAQ' | 'AMEX' | 'LSE' | 'AIM'
  name: string;            // 'New York Stock Exchange'
  country: 'US' | 'UK';
  timezone: string;        // 'America/New_York' | 'Europe/London'
  currency: string;        // 'USD' | 'GBP'
  symbolSuffix?: string;   // '.L' for LSE/AIM, undefined for US
  tradingHours: TradingHours;
}

interface TradingHours {
  preMarket?: { start: string; end: string };   // '04:00' - '09:30'
  regular: { start: string; end: string };       // '09:30' - '16:00'
  postMarket?: { start: string; end: string };  // '16:00' - '20:00'
}
```

**Relationships**: None (reference data)

**Validation Rules**:
- `id` must be unique
- `timezone` must be valid IANA timezone
- `tradingHours.regular` is required; pre/post are optional

**Storage**: Static constant (not persisted to IndexedDB)

---

### MarketState

Represents the current operating state of a market.

```typescript
type MarketState = 'PRE' | 'REGULAR' | 'POST' | 'CLOSED';

interface MarketStatus {
  market: string;           // Market.id
  state: MarketState;
  nextStateChange?: Date;   // When state will change
  isHoliday: boolean;
  holidayName?: string;
}
```

**Relationships**: References `Market.id`

**State Transitions**:
```
CLOSED → PRE → REGULAR → POST → CLOSED
         ↑__________________________|
```

**Validation Rules**:
- `state` must be valid MarketState enum value
- `nextStateChange` required unless `state === 'CLOSED' && isHoliday`

**Storage**: Computed at runtime (not persisted)

---

### PriceUpdatePreferences

User preferences for price update behavior. Stored in IndexedDB via `userSettings` table.

```typescript
interface PriceUpdatePreferences {
  refreshInterval: RefreshInterval;
  showStalenessIndicator: boolean;
  pauseWhenHidden: boolean;        // Pause polling when tab hidden
}

type RefreshInterval = 'realtime' | 'frequent' | 'standard' | 'manual';

const REFRESH_INTERVALS: Record<RefreshInterval, number> = {
  realtime: 30_000,   // 30 seconds
  frequent: 60_000,   // 1 minute
  standard: 300_000,  // 5 minutes (default)
  manual: 0,          // No automatic refresh
};
```

**Relationships**: Stored in `userSettings` table with key `'priceUpdatePreferences'`

**Validation Rules**:
- `refreshInterval` must be valid RefreshInterval
- All fields have sensible defaults

**Defaults**:
```typescript
const DEFAULT_PRICE_PREFERENCES: PriceUpdatePreferences = {
  refreshInterval: 'standard',
  showStalenessIndicator: true,
  pauseWhenHidden: true,
};
```

**Storage**: IndexedDB `userSettings` table (existing)

---

### LivePriceData

Extended price information for display purposes.

```typescript
interface LivePriceData {
  symbol: string;
  price: Decimal;
  currency: string;           // 'USD' | 'GBP' | 'GBp'
  displayPrice: Decimal;      // After pence→pounds conversion
  displayCurrency: string;    // Always 'USD' or 'GBP'
  change: Decimal;
  changePercent: number;
  timestamp: Date;
  source: string;
  marketState: MarketState;
  staleness: StalenessLevel;
  exchange: string;           // Detected exchange
}

type StalenessLevel = 'fresh' | 'aging' | 'stale';
```

**Relationships**:
- References `Asset.symbol`
- Computed from `PriceSnapshot` + `PriceUpdatePreferences`

**Validation Rules**:
- `price` must be positive
- `timestamp` must be valid Date
- `staleness` computed from `timestamp` and user's `refreshInterval`

**Storage**: In-memory (Zustand store); derived from cached `PriceSnapshot`

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        REFERENCE DATA                           │
│  ┌──────────┐                                                   │
│  │  Market  │ ──────────────────────────────┐                   │
│  └──────────┘                               │                   │
│       │                                     │                   │
│       │ derives                             │ references        │
│       ▼                                     │                   │
│  ┌──────────────┐                           │                   │
│  │ MarketStatus │                           │                   │
│  └──────────────┘                           │                   │
└─────────────────────────────────────────────│───────────────────┘
                                              │
┌─────────────────────────────────────────────│───────────────────┐
│                     USER DATA               │                   │
│  ┌─────────────────────────┐                │                   │
│  │ PriceUpdatePreferences  │                │                   │
│  │ (userSettings table)    │                │                   │
│  └─────────────────────────┘                │                   │
│              │                              │                   │
│              │ configures                   │                   │
│              ▼                              ▼                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    LivePriceData                          │   │
│  │  (computed at runtime from PriceSnapshot + preferences)   │   │
│  └──────────────────────────────────────────────────────────┘   │
│              │                                                   │
│              │ extends                                           │
│              ▼                                                   │
│  ┌───────────────┐                                              │
│  │ PriceSnapshot │ (existing entity in asset.ts)                │
│  └───────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

## IndexedDB Schema Changes

### Existing: userSettings table

No schema change required. New preference stored as:

```typescript
{
  key: 'priceUpdatePreferences',
  value: {
    refreshInterval: 'standard',
    showStalenessIndicator: true,
    pauseWhenHidden: true
  },
  updatedAt: new Date()
}
```

### Existing: assets table

Already has `exchange` field - will be populated with detected exchange for new assets.

### Existing: priceSnapshots table

Already has `marketState` field - will be populated from Yahoo Finance response.

## Migration Notes

- No database migrations required
- New `userSettings` entry created on first access with defaults
- Existing `PriceSnapshot` records remain compatible
- `Asset.exchange` field already exists; may be null for legacy data
