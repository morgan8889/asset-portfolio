# Research: Dashboard Stacking Layout

**Feature**: 003-dashboard-stacking-layout
**Date**: 2026-01-24
**Status**: Complete

---

## Lessons Learned from Previous Features

These lessons from feature 002 and prior work MUST be incorporated:

### Lesson 1: React Hooks Before Early Returns
**Source**: Commit `3d1767b` - fix: move React hooks before early returns

**Issue**: Placing hooks after conditional returns violates React rules and causes runtime errors.

**Pattern to Follow**:
```tsx
// ✅ CORRECT: All hooks before any conditional returns
const [isMobile, setIsMobile] = useState(false);
const sensors = useSensors(...);
const gridClass = useMemo(() => ..., [config]);

if (loading) return <Skeleton />;  // Early return AFTER hooks
```

**Verification**: Any new hooks in `dashboard-container.tsx` must be placed before the `if (configLoading || portfolioLoading || !config)` check.

---

### Lesson 2: Loading State Race Conditions
**Source**: Commit `5e8eaf8` - fix: prevent loading state race condition in dashboard

**Issue**: Multiple components triggering loads independently created cascading updates that stuck loading states.

**Pattern to Follow**:
- Use `useDashboardData` hook as single source of truth for data loading
- Add guards to prevent duplicate concurrent calls
- Use `useRef` to prevent duplicate effect executions in React Strict Mode

**Verification**: New layout config loading must not introduce additional loading triggers - use existing `loadConfig` from dashboard store.

---

### Lesson 3: IndexedDB Decimal Serialization
**Source**: Commit `197d3b2` - fix: serialize Decimal values for IndexedDB

**Issue**: IndexedDB cannot store Decimal.js objects directly; they must be serialized to strings.

**Applicability**: ✅ NOT APPLICABLE - Feature 003 stores enums and numbers only (layoutMode, gridColumns, widgetSpans). No Decimal values.

---

### Lesson 4: Mobile Detection Pattern
**Source**: Existing code in `dashboard-container.tsx` lines 144-156

**Issue**: Mobile viewport needs special handling - current implementation already detects mobile and disables drag-drop.

**Pattern to Follow**:
```tsx
const MOBILE_BREAKPOINT = 768;

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
  };
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () => window.removeEventListener('resize', checkMobile);
}, []);
```

**Verification**: Use existing `isMobile` state to force stacking layout on mobile devices.

---

### Lesson 5: Widget Span Implementation Gap
**Source**: Current `widget-wrapper.tsx` line 62

**Issue**: Widget span currently reads from static `WIDGET_DEFINITIONS[id].colSpan`, not from user configuration.

**Current Implementation**:
```tsx
definition.colSpan === 2 ? 'md:col-span-2' : 'col-span-1'
```

**Required Change**: Must read from `config.widgetSpans[id]` instead of `definition.colSpan` to support user-configurable spans.

---

### Lesson 6: Optimistic Updates with Rollback
**Source**: Current `dashboard.ts` store pattern

**Issue**: Store actions must update UI immediately but rollback on persistence failure.

**Pattern to Follow**: Use existing `optimisticUpdate` helper in dashboard store:
```tsx
async function optimisticUpdate<T>(
  get, set, field, value, persistFn, errorMessage
) {
  const { config } = get();
  const updatedConfig = { ...config, [field]: value };
  set({ config: updatedConfig });  // Optimistic
  try {
    await persistFn();
  } catch (error) {
    set({ config, error: detailedMessage });  // Rollback
  }
}
```

---

## 1. dnd-kit Grid Layout Integration

### Decision
Use dnd-kit's `rectSortingStrategy` with CSS Grid for flexible column layouts.

### Rationale
- dnd-kit is already installed and integrated (v6.3.1 core, v10.0.0 sortable)
- The existing `dashboard-container.tsx` uses `rectSortingStrategy` which works well with 2D grid layouts
- No additional dependencies required

### Alternatives Considered
| Alternative | Why Rejected |
|------------|--------------|
| react-beautiful-dnd | Deprecated by Atlassian; dnd-kit already in use |
| react-dnd | More complex API; dnd-kit provides better React 18 support |
| Custom drag implementation | Reinventing the wheel; dnd-kit handles edge cases |

### Best Practices
- Use `closestCenter` collision detection for grid layouts (already implemented)
- Apply `activationConstraint: { distance: 8 }` to prevent accidental drags (already implemented)
- Use `rectSortingStrategy` for 2D grid reordering (already implemented)
- Disable drag-drop on mobile via `disabled` prop (already implemented)

---

## 2. Responsive Grid Column Strategy

### Decision
Use Tailwind CSS Grid utilities with a dedicated `gridColumns` state that maps to CSS classes.

### Rationale
- Tailwind's grid system provides responsive breakpoints out of the box
- CSS Grid handles variable-width columns natively
- No runtime JavaScript calculations needed for column sizing
- Column span can be achieved with `col-span-2` utility classes

### Implementation Pattern
```tsx
// Map column count to Tailwind grid classes
const gridClasses = {
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4', // existing behavior
};

// For stacking mode
const stackingClass = 'grid-cols-1';
```

### Alternatives Considered
| Alternative | Why Rejected |
|------------|--------------|
| CSS Flexbox with wrap | Grid provides better column alignment and span support |
| Inline styles with calc() | Harder to maintain; Tailwind is project standard |
| CSS Container Queries | Browser support still limited; breakpoints sufficient |
| Masonry layout | Over-engineered for widget dashboard; fixed rows work better |

---

## 3. Widget Span Configuration

### Decision
Add a `widgetSpans` record to `DashboardConfiguration` mapping widget IDs to column spans (1 or 2).

### Rationale
- Extends existing configuration pattern (similar to `widgetVisibility`)
- Type-safe with Zod validation
- Compatible with CSS Grid `col-span-*` classes
- Default all widgets to span 1, except `growth-chart` and `recent-activity` which span 2

### Schema Addition
```typescript
interface DashboardConfiguration {
  // ... existing fields
  layoutMode: 'grid' | 'stacking';
  gridColumns: 2 | 3 | 4;
  widgetSpans: Record<WidgetId, 1 | 2>;
}
```

### Edge Cases
- Span 2 widget in 2-column grid → Takes full row
- Span 2 widget in stacking mode → Span ignored, full width
- Screen too narrow for grid → Falls back to stacking regardless of config

---

## 4. Mobile Responsive Behavior

### Decision
Force stacking layout on screens below 768px regardless of user preference.

### Rationale
- Existing `MOBILE_BREAKPOINT = 768` is already defined
- Tailwind's `md:` breakpoint aligns with this value
- Matches spec requirement: "System MUST collapse to single-column stacking layout on screens narrower than 768px"
- User's grid preferences are preserved and restored when viewport expands

### Implementation Pattern
```tsx
const effectiveLayoutMode = isMobile ? 'stacking' : config.layoutMode;
const effectiveColumns = effectiveLayoutMode === 'stacking' ? 1 : config.gridColumns;
```

---

## 5. Layout Configuration Persistence

### Decision
Store layout configuration as part of the existing `DashboardConfiguration` in IndexedDB.

### Rationale
- Maintains privacy-first architecture (no server storage)
- Uses established pattern from feature 002
- Single source of truth for all dashboard preferences
- Zod validation ensures data integrity across schema changes

### Migration Strategy
```typescript
// Version 1 → Version 2 migration
function migrateV1ToV2(config: DashboardConfigurationV1): DashboardConfiguration {
  return {
    ...config,
    version: 2,
    layoutMode: 'grid',        // Default to grid (matches current fixed layout)
    gridColumns: 4,            // Default to 4 columns (matches current behavior)
    widgetSpans: {
      'total-value': 1,
      'gain-loss': 1,
      'day-change': 1,
      'category-breakdown': 1,
      'growth-chart': 2,       // These already have colSpan: 2 in WIDGET_DEFINITIONS
      'top-performers': 1,
      'biggest-losers': 1,
      'recent-activity': 2,    // These already have colSpan: 2 in WIDGET_DEFINITIONS
    },
  };
}
```

---

## 6. Keyboard Accessibility for Layout Settings

### Decision
Use shadcn/ui RadioGroup for layout mode selection and Select for column count.

### Rationale
- shadcn/ui components include built-in ARIA attributes
- Consistent with existing settings UI patterns
- Tab navigation and arrow key support out of the box
- Focus management handled by Radix UI primitives

### Components to Use
- `RadioGroup` for Grid/Stacking toggle
- `Select` for column count (2, 3, 4)
- Existing widget toggle pattern for span configuration

---

## 7. Animation Strategy

### Decision
Use CSS transitions for layout changes; dnd-kit handles drag animations.

### Rationale
- CSS transitions are performant and don't block JavaScript
- dnd-kit provides drag overlay and smooth repositioning
- Tailwind's `transition-all` utility provides consistent timing

### Implementation
```tsx
<div className="transition-all duration-300 ease-in-out">
  {/* Grid content */}
</div>
```

---

## Summary of Additions to Codebase

### New Types
- `LayoutMode = 'grid' | 'stacking'`
- `GridColumns = 2 | 3 | 4`
- Extended `DashboardConfiguration` with `layoutMode`, `gridColumns`, `widgetSpans`

### Updated Components
- `dashboard-container.tsx`: Dynamic grid classes based on layout config
- `dashboard-settings.tsx`: Layout mode and column settings UI
- `widget-wrapper.tsx`: Apply `col-span-*` classes from config

### New Components
- `layout-mode-selector.tsx`: Grid/stacking toggle with icons

### Store Updates
- `setLayoutMode(mode: LayoutMode)` action
- `setGridColumns(columns: GridColumns)` action
- `setWidgetSpan(widgetId: WidgetId, span: 1 | 2)` action

### Service Updates
- `dashboardConfigService.setLayoutMode(mode)`
- `dashboardConfigService.setGridColumns(columns)`
- `dashboardConfigService.setWidgetSpan(widgetId, span)`
