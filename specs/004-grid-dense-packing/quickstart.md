# Quickstart: Grid Dense Packing Implementation

**Feature**: 004-grid-dense-packing
**Estimated Time**: ~2.5 hours

## Prerequisites

- Feature 003 (dashboard-stacking-layout) merged
- Branch `004-grid-dense-packing` checked out
- `npm install` complete

## Implementation Checklist

### Phase 1: Types & Schema (~30 min)

**File**: `src/types/dashboard.ts`

- [ ] Add `WidgetRowSpan = 1 | 2 | 3` type
- [ ] Add `WidgetRowSpanSchema` Zod validator
- [ ] Add `DashboardConfigurationV2` interface (rename current)
- [ ] Update `DashboardConfiguration` to version 3 with:
  - `densePacking: boolean`
  - `widgetRowSpans: Partial<Record<WidgetId, WidgetRowSpan>>`
- [ ] Add `DEFAULT_WIDGET_ROW_SPANS` constant
- [ ] Update `DEFAULT_DASHBOARD_CONFIG` for v3
- [ ] Update `DashboardConfigurationSchema` for v3

### Phase 2: Service & Migration (~30 min)

**File**: `src/lib/services/dashboard-config.ts`

- [ ] Add `setDensePacking(enabled: boolean)` method
- [ ] Add `setWidgetRowSpan(widgetId, rowSpan)` method
- [ ] Add `migrateV2ToV3()` function
- [ ] Update `getConfig()` to handle v2 → v3 migration

### Phase 3: Store (~20 min)

**File**: `src/lib/stores/dashboard.ts`

- [ ] Import `WidgetRowSpan` type
- [ ] Add `setDensePacking` to `DashboardState` interface
- [ ] Add `setWidgetRowSpan` to `DashboardState` interface
- [ ] Implement `setDensePacking` action with optimistic update
- [ ] Implement `setWidgetRowSpan` action with optimistic update

### Phase 4: Dashboard Container (~20 min)

**File**: `src/components/dashboard/dashboard-container.tsx`

- [ ] Import `WidgetRowSpan` type
- [ ] Add `config.densePacking && 'grid-flow-row-dense'` to grid classes
- [ ] Compute effective row span per widget from `config.widgetRowSpans`
- [ ] Pass `rowSpan` prop to `WidgetWrapper`
- [ ] Disable dense packing on mobile (already handles < 768px)

### Phase 5: Widget Wrapper (~15 min)

**File**: `src/components/dashboard/widget-wrapper.tsx`

- [ ] Add `rowSpan?: WidgetRowSpan` prop
- [ ] Add row span class mapping:
  ```tsx
  const rowSpanClass = {
    1: 'row-span-1',
    2: 'row-span-2',
    3: 'row-span-3',
  }[rowSpan ?? 1];
  ```
- [ ] Apply `rowSpanClass` to wrapper div

### Phase 6: Settings UI (~45 min)

**File**: `src/components/dashboard/dashboard-settings.tsx`

- [ ] Import `WidgetRowSpan` type
- [ ] Add `handleDensePackingChange` callback
- [ ] Add `handleWidgetRowSpanChange` callback
- [ ] Add Dense Packing toggle (Switch component):
  - Only visible when `layoutMode === 'grid'`
  - Label: "Dense Packing"
  - Description: "Fill gaps with smaller widgets"
- [ ] Add Row Span selector per widget (Select component):
  - Only visible when `densePacking === true`
  - Options: "1x", "2x", "3x"
  - Show next to each widget row
- [ ] Update `resetToDefault` to include new v3 fields

### Phase 7: Testing (~30 min)

**Unit Tests**: Add to `src/lib/stores/__tests__/dashboard.test.ts`
- [ ] Test `setDensePacking(true)` enables dense packing
- [ ] Test `setDensePacking(false)` disables dense packing
- [ ] Test `setWidgetRowSpan` updates row span
- [ ] Test v2 → v3 migration

**E2E Test**: Create `tests/e2e/dashboard-dense-packing.spec.ts`
- [ ] Test enabling dense packing shows row span selectors
- [ ] Test disabling dense packing hides row span selectors
- [ ] Test changing row span persists after reload
- [ ] Test mobile viewport disables dense packing

## Verification Commands

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Unit tests
npm run test

# E2E tests
npx playwright test tests/e2e/dashboard-dense-packing.spec.ts

# Build
npm run build
```

## Quick Visual Verification

1. Start dev server: `npm run dev`
2. Navigate to dashboard with mock data
3. Open Settings → enable "Dense Packing"
4. Set Growth Chart to "3x" row span
5. Verify smaller widgets stack beside it
6. Resize to mobile → dense packing auto-disabled

## Key Implementation Notes

### CSS Grid Dense Class

```tsx
// dashboard-container.tsx line ~292
<div className={cn(
  'grid gap-4 transition-all duration-300',
  gridClass,
  config.densePacking && effectiveLayoutMode === 'grid' && 'grid-flow-row-dense'
)}>
```

### Row Span Classes

```tsx
// widget-wrapper.tsx
const ROW_SPAN_CLASSES: Record<WidgetRowSpan, string> = {
  1: 'row-span-1',
  2: 'row-span-2',
  3: 'row-span-3',
};

// In component
className={cn(
  spanClass,
  ROW_SPAN_CLASSES[rowSpan ?? 1],
  // ... other classes
)}
```

### Settings UI Layout

```tsx
{/* Dense Packing Toggle - after Grid Columns selector */}
{config.layoutMode === 'grid' && (
  <div className="flex items-center justify-between">
    <div>
      <Label>Dense Packing</Label>
      <p className="text-xs text-muted-foreground">
        Fill gaps with smaller widgets
      </p>
    </div>
    <Switch
      checked={config.densePacking}
      onCheckedChange={handleDensePackingChange}
    />
  </div>
)}

{/* Row Span per widget - in widget row, after column span */}
{config.densePacking && (
  <Select
    value={String(config.widgetRowSpans?.[widgetId] ?? 1)}
    onValueChange={(v) => handleWidgetRowSpanChange(widgetId, v)}
  >
    <SelectTrigger className="w-16 h-8">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="1">1x</SelectItem>
      <SelectItem value="2">2x</SelectItem>
      <SelectItem value="3">3x</SelectItem>
    </SelectContent>
  </Select>
)}
```
