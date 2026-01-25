# Data Model: Dashboard Stacking Layout

**Feature**: 003-dashboard-stacking-layout
**Date**: 2026-01-24

## Entity Overview

This feature extends the existing `DashboardConfiguration` entity with layout-specific properties.

## Entities

### LayoutMode (Enumeration)

Defines the available layout types for the dashboard.

| Value | Description |
|-------|-------------|
| `grid` | Multi-column layout with configurable column count |
| `stacking` | Single-column vertical layout |

**Default**: `grid`

---

### GridColumns (Enumeration)

Defines valid column count options for grid layout.

| Value | Description |
|-------|-------------|
| `2` | Two-column grid |
| `3` | Three-column grid |
| `4` | Four-column grid (current default) |

**Default**: `4`

---

### WidgetSpan (Type)

Column span configuration for a widget.

| Value | Description |
|-------|-------------|
| `1` | Widget occupies one column |
| `2` | Widget spans two columns |

**Default per Widget**:
| Widget ID | Default Span | Rationale |
|-----------|--------------|-----------|
| `total-value` | 1 | Compact metric |
| `gain-loss` | 1 | Compact metric |
| `day-change` | 1 | Compact metric |
| `category-breakdown` | 1 | Pie chart fits single column |
| `growth-chart` | 2 | Time series needs horizontal space |
| `top-performers` | 1 | List format |
| `biggest-losers` | 1 | List format |
| `recent-activity` | 2 | Table needs horizontal space |

---

### DashboardConfiguration (Extended)

**Location**: `src/types/dashboard.ts`

#### Existing Fields (from Feature 002)
| Field | Type | Description |
|-------|------|-------------|
| `version` | `1 \| 2` | Schema version (migrating to 2) |
| `widgetOrder` | `WidgetId[]` | Ordered list of widget IDs |
| `widgetVisibility` | `Record<WidgetId, boolean>` | Visibility state per widget |
| `timePeriod` | `TimePeriod` | Selected gain/loss calculation period |
| `performerCount` | `number` | Count of top/bottom performers shown |
| `lastUpdated` | `string` | ISO 8601 timestamp |

#### New Fields (Feature 003)
| Field | Type | Description |
|-------|------|-------------|
| `layoutMode` | `'grid' \| 'stacking'` | Current layout mode |
| `gridColumns` | `2 \| 3 \| 4` | Column count for grid mode |
| `widgetSpans` | `Record<WidgetId, 1 \| 2>` | Column span per widget |

---

### Responsive Breakpoints (Constants)

**Location**: `src/types/dashboard.ts` or `src/lib/constants/layout.ts`

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | `< 768px` | Force stacking layout, ignore grid preferences |
| Tablet | `768px - 1023px` | Apply `gridColumns` with max 2 columns |
| Desktop | `≥ 1024px` | Apply full `gridColumns` configuration |

---

## Validation Rules

### Zod Schema for New Fields

```typescript
const LayoutModeSchema = z.enum(['grid', 'stacking']);
const GridColumnsSchema = z.union([z.literal(2), z.literal(3), z.literal(4)]);
const WidgetSpanSchema = z.union([z.literal(1), z.literal(2)]);

const WidgetSpansSchema = z.object({
  'total-value': WidgetSpanSchema,
  'gain-loss': WidgetSpanSchema,
  'day-change': WidgetSpanSchema,
  'category-breakdown': WidgetSpanSchema,
  'growth-chart': WidgetSpanSchema,
  'top-performers': WidgetSpanSchema,
  'biggest-losers': WidgetSpanSchema,
  'recent-activity': WidgetSpanSchema,
});

// Extended configuration schema
const DashboardConfigurationSchemaV2 = z.object({
  version: z.literal(2),
  widgetOrder: z.array(WidgetIdSchema).min(1),
  widgetVisibility: WidgetVisibilitySchema,
  timePeriod: TimePeriodSchema,
  performerCount: z.number().int().min(1).max(10),
  lastUpdated: z.string().datetime(),
  // New fields
  layoutMode: LayoutModeSchema,
  gridColumns: GridColumnsSchema,
  widgetSpans: WidgetSpansSchema,
});
```

### Validation Constraints

| Rule | Constraint |
|------|------------|
| Widget span max | Span cannot exceed `gridColumns` (clamped at runtime) |
| All widgets present in widgetSpans | Keys must match all WidgetId values |
| Grid columns range | Only 2, 3, or 4 accepted |
| Layout mode values | Only 'grid' or 'stacking' accepted |

---

## State Transitions

### Layout Mode Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  User selects "Grid Layout"     User selects "Stacking"     │
│           ↓                              ↓                  │
│  ┌─────────────┐                ┌─────────────────┐        │
│  │  Grid Mode  │ ←────────────→ │  Stacking Mode  │        │
│  └─────────────┘                └─────────────────┘        │
│           ↑                              ↑                  │
│           │      Screen < 768px          │                  │
│           │      (force stacking)        │                  │
│           └──────────────────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Grid Column Transitions

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│ 2 cols  │ ←→ │ 3 cols  │ ←→ │ 4 cols  │
└─────────┘    └─────────┘    └─────────┘
     ↑              ↑              ↑
     │              │              │
  Responsive reduction on narrower screens
```

### Widget Span Transitions

```
Widget Configuration:
  ┌──────────┐      ┌──────────┐
  │ Span: 1  │ ←──→ │ Span: 2  │
  └──────────┘      └──────────┘
       ↑                 ↑
       │                 │
  Only affects Grid mode; ignored in Stacking mode
```

---

## Migration Strategy

### Version 1 → Version 2

When loading a v1 configuration, migrate to v2:

```typescript
function migrateToV2(v1Config: DashboardConfigurationV1): DashboardConfigurationV2 {
  return {
    ...v1Config,
    version: 2,
    layoutMode: 'grid',
    gridColumns: 4,
    widgetSpans: {
      'total-value': 1,
      'gain-loss': 1,
      'day-change': 1,
      'category-breakdown': 1,
      'growth-chart': 2,
      'top-performers': 1,
      'biggest-losers': 1,
      'recent-activity': 2,
    },
  };
}
```

The migration preserves existing behavior (4-column grid) while adding new configurability.

---

## Persistence Location

| Field | Storage | Key |
|-------|---------|-----|
| `DashboardConfiguration` | IndexedDB `userSettings` table | `dashboard-config` |

**Note**: Per constitution, all data remains local to the browser. No server-side persistence.

---

## Relationships

```
DashboardConfiguration
  ├── layoutMode (enum)
  ├── gridColumns (enum)
  ├── widgetSpans (map: WidgetId → span)
  │       └── references WidgetId
  ├── widgetOrder (array)
  │       └── references WidgetId
  └── widgetVisibility (map)
          └── references WidgetId

WIDGET_DEFINITIONS (static registry)
  └── defines valid WidgetId values
```
