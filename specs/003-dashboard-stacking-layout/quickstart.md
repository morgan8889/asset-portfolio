# Quickstart: Dashboard Stacking Layout

**Feature**: 003-dashboard-stacking-layout
**Date**: 2026-01-24

## ⚠️ Critical Implementation Warnings

These patterns MUST be followed based on lessons from previous features:

### 1. React Hooks Before Early Returns
```tsx
// ✅ CORRECT - hooks BEFORE conditional returns
const gridClass = useMemo(() => ..., [config]);
const effectiveMode = useMemo(() => isMobile ? 'stacking' : config.layoutMode, [isMobile, config.layoutMode]);

if (configLoading || !config) return <Skeleton />;  // AFTER hooks

// ❌ WRONG - will cause React errors
if (configLoading || !config) return <Skeleton />;
const gridClass = useMemo(() => ..., [config]);  // Hook after return!
```

### 2. Use Existing Mobile Detection
```tsx
// Reuse existing isMobile state - DO NOT add new detection
const effectiveLayoutMode = isMobile ? 'stacking' : config.layoutMode;
```

### 3. Widget Span from Config, Not Definition
```tsx
// ✅ CORRECT - read from user config
const span = config.widgetSpans[id];

// ❌ WRONG - reads static definition
const span = WIDGET_DEFINITIONS[id].colSpan;
```

### 4. Follow Optimistic Update Pattern
```tsx
// Use existing helper for new store actions
setLayoutMode: async (mode) => {
  await optimisticUpdate(get, set, 'layoutMode', mode, ...);
},
```

---

## Overview

This feature extends the dashboard widget system with configurable grid/stacking layouts. Users can:
1. Switch between grid and stacking (single-column) layouts
2. Configure grid column count (2, 3, or 4 columns)
3. Set widget column spans (1 or 2 columns)
4. Enjoy responsive layout adaptation on mobile devices

## Quick Reference

### File Locations

| Purpose | Path |
|---------|------|
| Types/Contracts | `src/types/dashboard.ts` |
| Store | `src/lib/stores/dashboard.ts` |
| Service | `src/lib/services/dashboard-config.ts` |
| Container | `src/components/dashboard/dashboard-container.tsx` |
| Settings UI | `src/components/dashboard/dashboard-settings.tsx` |
| Widget Wrapper | `src/components/dashboard/widget-wrapper.tsx` |

### Key Types

```typescript
type LayoutMode = 'grid' | 'stacking';
type GridColumns = 2 | 3 | 4;
type WidgetSpan = 1 | 2;

interface DashboardConfiguration {
  version: 2;
  layoutMode: LayoutMode;
  gridColumns: GridColumns;
  widgetSpans: Record<WidgetId, WidgetSpan>;
  // ... existing fields
}
```

### Store Actions

```typescript
// In component
const { setLayoutMode, setGridColumns, setWidgetSpan } = useDashboardStore();

// Switch to stacking
await setLayoutMode('stacking');

// Set 3-column grid
await setGridColumns(3);

// Make growth chart span 2 columns
await setWidgetSpan('growth-chart', 2);
```

## Implementation Steps

### 1. Update Types (src/types/dashboard.ts)

Add new types and extend `DashboardConfiguration`:

```typescript
// Add these types
export type LayoutMode = 'grid' | 'stacking';
export type GridColumns = 2 | 3 | 4;
export type WidgetSpan = 1 | 2;

// Add to DashboardConfiguration interface
layoutMode: LayoutMode;
gridColumns: GridColumns;
widgetSpans: Record<WidgetId, WidgetSpan>;

// Update version to 2
readonly version: 2;

// Add Zod schemas
export const LayoutModeSchema = z.enum(['grid', 'stacking']);
export const GridColumnsSchema = z.union([z.literal(2), z.literal(3), z.literal(4)]);
```

### 2. Update Service (src/lib/services/dashboard-config.ts)

Add persistence methods:

```typescript
async setLayoutMode(mode: LayoutMode): Promise<void> {
  const config = await this.getConfig();
  config.layoutMode = mode;
  config.lastUpdated = new Date().toISOString();
  await this.saveConfig(config);
}

async setGridColumns(columns: GridColumns): Promise<void> {
  const config = await this.getConfig();
  config.gridColumns = columns;
  config.lastUpdated = new Date().toISOString();
  await this.saveConfig(config);
}

async setWidgetSpan(widgetId: WidgetId, span: WidgetSpan): Promise<void> {
  const config = await this.getConfig();
  config.widgetSpans[widgetId] = span;
  config.lastUpdated = new Date().toISOString();
  await this.saveConfig(config);
}
```

### 3. Update Store (src/lib/stores/dashboard.ts)

Add store actions with optimistic updates:

```typescript
setLayoutMode: async (mode) => {
  await optimisticUpdate(
    get, set, 'layoutMode', mode,
    () => dashboardConfigService.setLayoutMode(mode),
    'Failed to update layout mode'
  );
},

setGridColumns: async (columns) => {
  await optimisticUpdate(
    get, set, 'gridColumns', columns,
    () => dashboardConfigService.setGridColumns(columns),
    'Failed to update grid columns'
  );
},

setWidgetSpan: async (widgetId, span) => {
  const { config } = get();
  if (!config) return;
  await optimisticUpdate(
    get, set, 'widgetSpans',
    { ...config.widgetSpans, [widgetId]: span },
    () => dashboardConfigService.setWidgetSpan(widgetId, span),
    'Failed to update widget span'
  );
},
```

### 4. Update Container (src/components/dashboard/dashboard-container.tsx)

Apply dynamic grid classes:

```tsx
// Grid class mapping
const gridClasses: Record<GridColumns, string> = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

// In render
const effectiveMode = isMobile ? 'stacking' : config.layoutMode;
const gridClass = effectiveMode === 'stacking'
  ? 'grid-cols-1'
  : gridClasses[config.gridColumns];

return (
  <div className={`grid gap-4 ${gridClass}`}>
    {/* widgets */}
  </div>
);
```

### 5. Update Widget Wrapper (src/components/dashboard/widget-wrapper.tsx)

Apply span classes:

```tsx
interface WidgetWrapperProps {
  id: WidgetId;
  span?: 1 | 2;  // Add span prop
  disabled?: boolean;
  children: React.ReactNode;
}

// In render
const spanClass = span === 2 ? 'md:col-span-2' : '';

return (
  <div className={`${spanClass} ...`}>
    {children}
  </div>
);
```

### 6. Add Settings UI (src/components/dashboard/dashboard-settings.tsx)

Add layout configuration section:

```tsx
<div className="space-y-4">
  <h4>Layout Mode</h4>
  <RadioGroup value={config.layoutMode} onValueChange={setLayoutMode}>
    <RadioGroupItem value="grid" />
    <RadioGroupItem value="stacking" />
  </RadioGroup>

  {config.layoutMode === 'grid' && (
    <>
      <h4>Columns</h4>
      <Select value={config.gridColumns.toString()} onValueChange={(v) => setGridColumns(Number(v))}>
        <SelectItem value="2">2 Columns</SelectItem>
        <SelectItem value="3">3 Columns</SelectItem>
        <SelectItem value="4">4 Columns</SelectItem>
      </Select>
    </>
  )}
</div>
```

## Testing

### Unit Tests

```bash
# Run layout config tests
npm run test -- src/lib/services/__tests__/dashboard-config.test.ts
```

### E2E Tests

```bash
# Run layout E2E tests
npx playwright test tests/e2e/dashboard-layout.spec.ts
```

### Manual Testing Checklist

- [ ] Grid mode displays widgets in configured columns
- [ ] Stacking mode displays single column
- [ ] Column count changes apply immediately
- [ ] Widget span stretches widget across columns
- [ ] Mobile viewport forces stacking layout
- [ ] Settings persist after page refresh
- [ ] Drag-drop works in both layout modes
- [ ] Reset to default restores layout settings

## Responsive Behavior

| Viewport | Behavior |
|----------|----------|
| < 768px | Force stacking layout |
| 768px - 1023px | Max 2 columns |
| ≥ 1024px | Use configured columns |

## Migration

Existing v1 configurations are automatically migrated to v2 on first load:

```typescript
// Automatic defaults applied
layoutMode: 'grid'    // Matches current 4-col behavior
gridColumns: 4        // Matches current behavior
widgetSpans: {
  'growth-chart': 2,     // Already had colSpan: 2
  'recent-activity': 2,  // Already had colSpan: 2
  // others: 1
}
```
