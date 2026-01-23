# Research: Configurable Portfolio Dashboard

**Feature**: 002-portfolio-dashboard | **Date**: 2026-01-22

## Research Topics

### 1. Drag-and-Drop Library Selection

**Decision**: `@dnd-kit/core` + `@dnd-kit/sortable`

**Rationale**:
- Built for React 18+ with hooks-first API
- Excellent accessibility (WCAG 2.1 compliant keyboard navigation)
- Tree-shakeable, smaller bundle than react-beautiful-dnd
- Active maintenance; react-beautiful-dnd is in maintenance mode
- Supports touch, keyboard, and pointer interactions
- Works with CSS Grid layouts (our dashboard grid)

**Alternatives Considered**:
| Library | Pros | Cons | Decision |
|---------|------|------|----------|
| react-beautiful-dnd | Established, good docs | Deprecated, no React 18 support, larger bundle | ❌ |
| @dnd-kit | Modern, accessible, performant | Slightly more setup | ✅ Selected |
| react-sortable-hoc | Simple API | Outdated, uses legacy refs | ❌ |
| Native HTML5 DnD | Zero deps | Poor mobile support, accessibility issues | ❌ |

**Implementation Notes**:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

### 2. Historical Portfolio Value Reconstruction

**Decision**: Transaction-based reconstruction with price caching

**Rationale**:
- Existing `transactions` and `priceHistory` tables provide source data
- Reconstruct holdings at any point by replaying transactions up to that date
- Cache computed daily values in new `portfolioHistory` computed cache (optional)

**Algorithm**:
```typescript
// For each date in the requested range:
// 1. Get all transactions up to date → compute holdings snapshot
// 2. Get prices for those holdings on that date from priceHistory
// 3. Calculate total portfolio value = Σ(holding.quantity × price)

interface HistoricalValuePoint {
  date: Date;
  totalValue: Decimal;
  holdings: { assetId: string; quantity: Decimal; value: Decimal }[];
}
```

**Edge Cases**:
- **No price data for date**: Use most recent available price (mark as interpolated)
- **No transactions before date**: Return $0 or null with appropriate messaging
- **Weekend/holiday dates**: Use previous trading day's close price
- **New holding with no history**: Value starts from first transaction date

**Performance Optimization**:
- Compute incrementally: cache last computed state, extend forward
- Pre-aggregate monthly/weekly for long ranges (1Y, ALL)
- Use Web Worker for >1000 data points to avoid UI blocking

---

### 3. Time-Period Performance Calculation

**Decision**: Configurable sliding window with period enum

**Methodology**:
```typescript
type TimePeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';

interface PeriodConfig {
  period: TimePeriod;
  startDate: Date;  // Computed based on period
  endDate: Date;    // Always today/now
}

// Gain/Loss = (CurrentValue - StartPeriodValue) / StartPeriodValue × 100
// Top Performers: Holdings sorted by period gain % descending
// Biggest Losers: Holdings sorted by period gain % ascending
```

**Edge Cases**:
- **Holding acquired mid-period**: Use acquisition cost as start value
- **Holding sold mid-period**: Exclude from current performers (or show realized gain)
- **No data for period start**: Use earliest available, show warning

---

### 4. Widget Configuration Schema

**Decision**: JSON-serializable config stored in IndexedDB userSettings

**Schema**:
```typescript
interface DashboardConfig {
  version: 1;  // For future migrations
  widgetOrder: WidgetId[];  // Ordered list of widget IDs
  widgetVisibility: Record<WidgetId, boolean>;
  timePeriod: TimePeriod;  // Default period for gain/loss
  performerCount: number;  // How many top/bottom performers (default: 5)
  lastUpdated: Date;
}

type WidgetId =
  | 'total-value'
  | 'gain-loss'
  | 'day-change'
  | 'category-breakdown'
  | 'growth-chart'
  | 'top-performers'
  | 'biggest-losers'
  | 'recent-activity';
```

**Storage Key**: `'dashboard-config'` in userSettings table

---

### 5. Mobile Widget Reordering UX

**Decision**: Settings modal with up/down buttons (per spec edge case)

**Rationale**:
- Drag-drop on touch is frustrating for complex layouts
- Settings modal provides clear "edit mode" mental model
- Up/down arrows are familiar and accessible
- Consistent with native mobile patterns (iOS/Android settings)

**Implementation**:
```tsx
// Desktop: Drag-drop enabled directly on dashboard
// Mobile (< 768px): Settings gear → Modal with toggle switches and ↑↓ buttons
// Detection: CSS media query + window.matchMedia for dynamic behavior
```

---

### 6. Stale Data Handling

**Decision**: Visual indicators with last-updated timestamp

**Implementation**:
- Add `lastPriceUpdate: Date` to portfolio store
- Compare against market close time (4 PM ET for US markets)
- Show warning banner if >1 trading day old
- Individual stale indicators on price-dependent widgets

**Visual Design**:
```tsx
// Stale banner (prominent, top of dashboard)
<Alert variant="warning">
  <AlertCircle className="h-4 w-4" />
  <span>Prices last updated: {formatRelative(lastUpdate)}. Some values may be outdated.</span>
</Alert>

// Widget-level indicator
<Badge variant="outline" className="text-amber-600">
  <Clock className="h-3 w-3 mr-1" /> Stale
</Badge>
```

---

## Dependencies to Add

```json
{
  "@dnd-kit/core": "^6.1.0",
  "@dnd-kit/sortable": "^8.0.0",
  "@dnd-kit/utilities": "^3.2.2"
}
```

**Install command**:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Open Questions Resolved

| Question | Resolution |
|----------|------------|
| How to persist widget config? | IndexedDB userSettings table with 'dashboard-config' key |
| Which DnD library? | @dnd-kit (modern, accessible, React 18 compatible) |
| How to compute historical values? | Transaction replay + priceHistory lookup per date |
| Mobile reordering? | Settings modal with up/down controls |
| Stale data UX? | Warning banner + per-widget badges |

---

## Technical Risks

| Risk | Mitigation |
|------|------------|
| Historical reconstruction slow for many transactions | Incremental caching, Web Worker offload |
| DnD library learning curve | Follow official @dnd-kit examples closely |
| Price gaps in historical data | Interpolate from nearest available, mark visually |
| Browser IndexedDB storage limits | Limit cache size, implement LRU eviction |
