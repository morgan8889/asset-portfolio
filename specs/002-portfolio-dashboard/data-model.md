# Data Model: Configurable Portfolio Dashboard

**Feature**: 002-portfolio-dashboard | **Date**: 2026-01-22

## Entities

### DashboardConfiguration

Stores user's personalized dashboard layout and preferences.

```typescript
interface DashboardConfiguration {
  /** Schema version for future migrations */
  version: 1;

  /** Ordered array of widget IDs (determines display order) */
  widgetOrder: WidgetId[];

  /** Visibility state for each widget (true = visible) */
  widgetVisibility: Record<WidgetId, boolean>;

  /** Default time period for gain/loss calculations */
  timePeriod: TimePeriod;

  /** Number of assets to show in top/bottom performers (1-10) */
  performerCount: number;

  /** ISO timestamp of last config update */
  lastUpdated: string;
}
```

**Storage**: IndexedDB `userSettings` table with key `'dashboard-config'`

**Default Value**:
```typescript
const DEFAULT_DASHBOARD_CONFIG: DashboardConfiguration = {
  version: 1,
  widgetOrder: [
    'total-value',
    'gain-loss',
    'day-change',
    'category-breakdown',
    'growth-chart',
    'top-performers',
    'biggest-losers',
    'recent-activity',
  ],
  widgetVisibility: {
    'total-value': true,
    'gain-loss': true,
    'day-change': true,
    'category-breakdown': true,
    'growth-chart': true,
    'top-performers': true,
    'biggest-losers': true,
    'recent-activity': true,
  },
  timePeriod: 'ALL',
  performerCount: 5,
  lastUpdated: new Date().toISOString(),
};
```

---

### Widget

Represents a discrete dashboard component.

```typescript
type WidgetId =
  | 'total-value'
  | 'gain-loss'
  | 'day-change'
  | 'category-breakdown'
  | 'growth-chart'
  | 'top-performers'
  | 'biggest-losers'
  | 'recent-activity';

interface WidgetDefinition {
  /** Unique identifier */
  id: WidgetId;

  /** Display name shown in settings */
  displayName: string;

  /** Short description for accessibility */
  description: string;

  /** Grid column span (1 = single column, 2 = double) */
  colSpan: 1 | 2;

  /** Minimum height in pixels */
  minHeight: number;

  /** Whether widget can be hidden */
  canHide: boolean;
}
```

**Widget Registry**:
```typescript
const WIDGET_DEFINITIONS: Record<WidgetId, WidgetDefinition> = {
  'total-value': {
    id: 'total-value',
    displayName: 'Total Value',
    description: 'Current portfolio market value',
    colSpan: 1,
    minHeight: 120,
    canHide: false,  // Core metric, always visible
  },
  'gain-loss': {
    id: 'gain-loss',
    displayName: 'Total Gain/Loss',
    description: 'Overall portfolio performance',
    colSpan: 1,
    minHeight: 120,
    canHide: true,
  },
  'day-change': {
    id: 'day-change',
    displayName: 'Day Change',
    description: "Today's portfolio movement",
    colSpan: 1,
    minHeight: 120,
    canHide: true,
  },
  'category-breakdown': {
    id: 'category-breakdown',
    displayName: 'Category Breakdown',
    description: 'Asset allocation by type',
    colSpan: 1,
    minHeight: 300,
    canHide: true,
  },
  'growth-chart': {
    id: 'growth-chart',
    displayName: 'Growth Chart',
    description: 'Portfolio value over time',
    colSpan: 2,
    minHeight: 400,
    canHide: true,
  },
  'top-performers': {
    id: 'top-performers',
    displayName: 'Top Performers',
    description: 'Best performing holdings',
    colSpan: 1,
    minHeight: 250,
    canHide: true,
  },
  'biggest-losers': {
    id: 'biggest-losers',
    displayName: 'Biggest Losers',
    description: 'Worst performing holdings',
    colSpan: 1,
    minHeight: 250,
    canHide: true,
  },
  'recent-activity': {
    id: 'recent-activity',
    displayName: 'Recent Activity',
    description: 'Latest transactions',
    colSpan: 2,
    minHeight: 300,
    canHide: true,
  },
};
```

---

### TimePeriod

Enumeration for gain/loss calculation windows.

```typescript
type TimePeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';

interface TimePeriodConfig {
  id: TimePeriod;
  label: string;
  shortLabel: string;
  getDaysAgo: () => number;
  getStartDate: () => Date;
}

const TIME_PERIOD_CONFIGS: Record<TimePeriod, TimePeriodConfig> = {
  TODAY: {
    id: 'TODAY',
    label: 'Today',
    shortLabel: '1D',
    getDaysAgo: () => 0,
    getStartDate: () => startOfDay(new Date()),
  },
  WEEK: {
    id: 'WEEK',
    label: 'This Week',
    shortLabel: '1W',
    getDaysAgo: () => 7,
    getStartDate: () => subDays(new Date(), 7),
  },
  MONTH: {
    id: 'MONTH',
    label: 'This Month',
    shortLabel: '1M',
    getDaysAgo: () => 30,
    getStartDate: () => subDays(new Date(), 30),
  },
  QUARTER: {
    id: 'QUARTER',
    label: 'This Quarter',
    shortLabel: '3M',
    getDaysAgo: () => 90,
    getStartDate: () => subDays(new Date(), 90),
  },
  YEAR: {
    id: 'YEAR',
    label: 'This Year',
    shortLabel: '1Y',
    getDaysAgo: () => 365,
    getStartDate: () => subDays(new Date(), 365),
  },
  ALL: {
    id: 'ALL',
    label: 'All Time',
    shortLabel: 'ALL',
    getDaysAgo: () => Infinity,
    getStartDate: () => new Date(0),
  },
};
```

---

### PerformanceMetric

Calculated performance data for a single holding over a time period.

```typescript
interface HoldingPerformance {
  /** Reference to holding */
  holdingId: string;

  /** Asset symbol for display */
  symbol: string;

  /** Asset name */
  name: string;

  /** Asset type (stock, etf, crypto, etc.) */
  assetType: AssetType;

  /** Current market value using decimal.js */
  currentValue: Decimal;

  /** Value at start of period (or acquisition if newer) */
  periodStartValue: Decimal;

  /** Absolute gain/loss in currency */
  absoluteGain: Decimal;

  /** Percentage gain/loss */
  percentGain: number;

  /** Time period this metric covers */
  period: TimePeriod;

  /** Whether start value was interpolated (no exact data) */
  isInterpolated: boolean;
}
```

---

### HistoricalValuePoint

Single data point for portfolio value history (chart data).

```typescript
interface HistoricalValuePoint {
  /** Date of this snapshot */
  date: Date;

  /** Total portfolio value on this date */
  totalValue: Decimal;

  /** Change from previous point */
  change: Decimal;

  /** Breakdown by holding (for drill-down) */
  holdings?: Array<{
    assetId: string;
    symbol: string;
    quantity: Decimal;
    price: Decimal;
    value: Decimal;
  }>;

  /** Whether any prices were interpolated */
  hasInterpolatedPrices: boolean;
}
```

---

### CategoryAllocation

Portfolio breakdown by asset category.

```typescript
interface CategoryAllocation {
  /** Asset type category */
  category: AssetType;

  /** Display label */
  label: string;

  /** Total value in this category */
  value: Decimal;

  /** Percentage of total portfolio */
  percentage: number;

  /** Number of holdings in category */
  holdingCount: number;

  /** Color for chart visualization */
  color: string;
}
```

---

## Relationships

```text
DashboardConfiguration (1) ──references── (*) Widget
                                              │
Portfolio (1) ───────contains──────── (*) Holding
    │                                       │
    │                                       ▼
    └───────────────────────────── HoldingPerformance
                                         │
                                         ▼
                                   TimePeriod
```

---

## Validation Rules

### DashboardConfiguration
- `version` must equal current schema version (1)
- `widgetOrder` must contain only valid WidgetId values
- `widgetOrder` must not contain duplicates
- `widgetVisibility` keys must match `widgetOrder` items
- `performerCount` must be between 1 and 10 inclusive
- `timePeriod` must be valid TimePeriod enum value

### Zod Schema
```typescript
import { z } from 'zod';

const WidgetIdSchema = z.enum([
  'total-value',
  'gain-loss',
  'day-change',
  'category-breakdown',
  'growth-chart',
  'top-performers',
  'biggest-losers',
  'recent-activity',
]);

const TimePeriodSchema = z.enum(['TODAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR', 'ALL']);

const DashboardConfigurationSchema = z.object({
  version: z.literal(1),
  widgetOrder: z.array(WidgetIdSchema).min(1).refine(
    (arr) => new Set(arr).size === arr.length,
    { message: 'Widget order must not contain duplicates' }
  ),
  widgetVisibility: z.record(WidgetIdSchema, z.boolean()),
  timePeriod: TimePeriodSchema,
  performerCount: z.number().int().min(1).max(10),
  lastUpdated: z.string().datetime(),
});
```

---

## State Transitions

### Widget Visibility
```
Hidden ←→ Visible (toggle in settings)
```

### Widget Order
```
[A, B, C, D] → User drags B before A → [B, A, C, D]
```

### Time Period Selection
```
ALL → TODAY | WEEK | MONTH | QUARTER | YEAR
(triggers recalculation of all period-dependent metrics)
```

### Configuration Reset
```
Custom Config → "Reset to Default" → DEFAULT_DASHBOARD_CONFIG
```
