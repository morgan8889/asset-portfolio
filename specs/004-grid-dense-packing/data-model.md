# Data Model: Grid Dense Packing

**Feature**: 004-grid-dense-packing
**Date**: 2026-01-25

## Schema Version Change

**Current**: Version 2 (from feature 003)
**Target**: Version 3

## Type Definitions

### New Types

```typescript
/**
 * Widget row span (1 = normal, 2 = double, 3 = triple height).
 * Used for dense packing layout calculations.
 */
export type WidgetRowSpan = 1 | 2 | 3;
```

### Modified Types

#### DashboardConfiguration (v2 → v3)

```typescript
export interface DashboardConfiguration {
  /** Schema version for migrations (current: 3) */
  readonly version: 3;

  // ... existing v2 fields unchanged ...
  widgetOrder: WidgetId[];
  widgetVisibility: Record<WidgetId, boolean>;
  timePeriod: TimePeriod;
  performerCount: number;
  lastUpdated: string;
  layoutMode: LayoutMode;
  gridColumns: GridColumns;
  widgetSpans: Partial<Record<WidgetId, WidgetSpan>>;

  // NEW in v3
  /** Whether dense packing mode is enabled */
  densePacking: boolean;

  /** Per-widget row span overrides (1, 2, or 3 rows) */
  widgetRowSpans: Partial<Record<WidgetId, WidgetRowSpan>>;
}
```

## Zod Schemas

### New Schemas

```typescript
export const WidgetRowSpanSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const WidgetRowSpansSchema = z.record(
  WidgetIdSchema,
  WidgetRowSpanSchema
);
```

### Updated Schema

```typescript
export const DashboardConfigurationSchema = z.object({
  version: z.literal(3),
  // ... existing fields ...
  widgetOrder: z.array(WidgetIdSchema).min(1),
  widgetVisibility: z.object({ /* ... */ }),
  timePeriod: TimePeriodSchema,
  performerCount: z.number().int().min(1).max(10),
  lastUpdated: z.string().datetime(),
  layoutMode: LayoutModeSchema,
  gridColumns: GridColumnsSchema,
  widgetSpans: z.record(WidgetIdSchema, WidgetSpanSchema).optional().default({}),

  // NEW in v3
  densePacking: z.boolean(),
  widgetRowSpans: z.record(WidgetIdSchema, WidgetRowSpanSchema).optional().default({}),
});
```

## Default Values

### Default Row Spans (FR-009)

```typescript
/**
 * Default row spans based on widget type:
 * - Charts: 2 rows (larger, needs vertical space)
 * - Tables: 2 rows (needs space for data rows)
 * - Metrics cards: 1 row (compact, implicit default)
 */
export const DEFAULT_WIDGET_ROW_SPANS: Partial<Record<WidgetId, WidgetRowSpan>> = {
  'growth-chart': 2,
  'recent-activity': 2,
  'category-breakdown': 2,
  // Metrics widgets default to 1 (not explicitly set)
};
```

### Updated Default Configuration

```typescript
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfiguration = {
  version: 3,
  // ... existing defaults ...
  widgetOrder: [/* ... */],
  widgetVisibility: { /* ... */ },
  timePeriod: 'ALL',
  performerCount: 5,
  lastUpdated: new Date().toISOString(),
  layoutMode: 'grid',
  gridColumns: 4,
  widgetSpans: { ...DEFAULT_WIDGET_SPANS },

  // NEW in v3
  densePacking: false,  // Disabled by default
  widgetRowSpans: { ...DEFAULT_WIDGET_ROW_SPANS },
};
```

## Migration

### v2 → v3 Migration

```typescript
function migrateV2ToV3(v2: DashboardConfigurationV2): DashboardConfiguration {
  return {
    ...v2,
    version: 3,
    densePacking: false,  // Preserve existing layout behavior
    widgetRowSpans: { ...DEFAULT_WIDGET_ROW_SPANS },
  };
}
```

### Migration Strategy

1. On config load, check `version` field
2. If version < 3, apply migration chain (v1→v2→v3)
3. Persist migrated config immediately
4. Existing users get `densePacking: false` (no visual change)

## State Transitions

### Dense Packing Toggle

```
State: densePacking = false
  ↓ User enables dense packing
State: densePacking = true
  → Grid class adds 'grid-flow-row-dense'
  → Row span selectors become visible in settings
  → Widgets reflow to fill gaps
```

### Row Span Change

```
State: widgetRowSpans['growth-chart'] = 2
  ↓ User changes to 3
State: widgetRowSpans['growth-chart'] = 3
  → Widget height increases to 3 rows
  → Other widgets reflow around it
  → Changes persist to IndexedDB
```

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| densePacking | boolean | "Dense packing must be true or false" |
| widgetRowSpans | Record<WidgetId, 1\|2\|3> | "Row span must be 1, 2, or 3" |
| widgetRowSpans keys | valid WidgetId | "Invalid widget ID" |

## Relationships

```
DashboardConfiguration
├── densePacking (boolean)
│   └── Controls visibility of row span UI in settings
│   └── Controls 'grid-flow-row-dense' CSS class
│
└── widgetRowSpans (Record<WidgetId, WidgetRowSpan>)
    └── Maps to CSS 'row-span-{n}' class per widget
    └── Defaults from DEFAULT_WIDGET_ROW_SPANS if not set
```

## Storage

All data stored in IndexedDB via Dexie.js:
- **Table**: `userSettings`
- **Key**: `'dashboard-config'`
- **Value**: JSON-serialized `DashboardConfiguration`

No server-side storage (privacy-first architecture).
