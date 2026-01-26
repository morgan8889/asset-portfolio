# Research: Grid Dense Packing Framework Evaluation

**Feature**: 004-grid-dense-packing
**Date**: 2026-01-25
**Updated**: Added react-grid-layout vs GridStack.js comparison

## Decision Summary

**Chosen Framework**: CSS Grid `grid-auto-flow: dense` with Tailwind utilities

**Alternative Considered**: react-grid-layout (RGL) or GridStack.js - both rejected due to dnd-kit conflict

---

## Framework Comparison: RGL vs GridStack vs CSS Grid

### 1. Community & Maintenance Status

| Metric | react-grid-layout | GridStack.js | CSS Grid |
|--------|-------------------|--------------|----------|
| **GitHub Stars** | 21,823 ⭐ | 8,609 ⭐ | N/A (browser standard) |
| **Weekly NPM Downloads** | ~1.35M | ~302K | N/A |
| **Latest Version** | 2.2.2 | 12.4.2 | N/A |
| **Maintenance** | ✅ Active (18 days ago) | ✅ Active (Jan 21, 2026) | ✅ Browser standard |
| **TypeScript** | ✅ Full v2 rewrite | ✅ Pure TypeScript | N/A |

**Winner by popularity**: react-grid-layout (4.5x more downloads)

---

### 2. Dense Packing / Compaction Support

#### react-grid-layout
- ✅ Built-in compaction strategies (vertical, horizontal)
- ✅ Pluggable Compactor interface for custom implementations
- ✅ Fast variants using O(n log n) algorithm for 200+ items
- ✅ `compactType` prop: `'vertical'`, `'horizontal'`, `'none'`
- ⚠️ True masonry dense packing requires custom compactor

#### GridStack.js
- ✅ Built-in `compact()` method with two strategies:
  - `'compact'`: Finds truly empty spaces, may reorder items for optimal fit
  - `'list'`: Keeps items in order, moves up sequentially
- ✅ `float: true` option for free placement
- ✅ Batch update mode for performance
- ⚠️ Less flexibility than RGL's pluggable compactors

#### CSS Grid `grid-auto-flow: dense`
- ✅ Native browser algorithm fills gaps automatically
- ✅ Zero JavaScript overhead
- ⚠️ Items may render out-of-DOM-order visually
- ⚠️ Requires explicit grid sizing (`grid-row: span N`)

**Winner for flexibility**: react-grid-layout
**Winner for simplicity**: CSS Grid

---

### 3. dnd-kit Integration Analysis ⚠️ CRITICAL

**Critical Finding**: Both RGL and GridStack **conflict** with existing dnd-kit implementation.

| Library | dnd-kit Compatibility | Reason |
|---------|----------------------|--------|
| react-grid-layout | ❌ **CONFLICTS** | Has its own drag-drop system |
| GridStack.js | ❌ **CONFLICTS** | Has its own drag-drop system |
| CSS Grid dense | ✅ **COMPATIBLE** | CSS-only, no drag system |

**Why They Conflict**:
- Both RGL and GridStack manage their own drag-and-drop state and DOM interactions
- dnd-kit is a low-level toolkit; RGL/GridStack are high-level abstractions
- Using both creates competing drag handlers = unpredictable behavior

**Impact**: Adopting RGL or GridStack means **replacing dnd-kit entirely**, not augmenting it.

---

### 4. React 18 & Next.js 14 Compatibility

| Feature | react-grid-layout | GridStack.js | CSS Grid |
|---------|-------------------|--------------|----------|
| React 18 Support | ✅ Full | ✅ Compatible | ✅ N/A |
| Next.js 14 SSR | ✅ `measureBeforeMount` | ⚠️ Requires careful DOM init | ✅ Native |
| Hooks API | ✅ Modern v2 hooks | ⚠️ Imperative API | N/A |
| App Router | ✅ Compatible | ✅ Compatible | ✅ Native |

**Winner**: react-grid-layout (better React ergonomics)

---

### 5. Bundle Size Comparison

| Library | Bundle Size | Notes |
|---------|-------------|-------|
| react-grid-layout | ~70-100 KB | React-focused optimization |
| GridStack.js | ~70-195 KB | HTML5: 70K, jQuery-UI: 195K |
| CSS Grid | **0 bytes** | Browser built-in |
| dnd-kit (current) | ~30-50 KB | Already in project |

**Net impact if migrating to RGL/GridStack**: ~+40-70KB (replacing dnd-kit)

---

### 6. Feature Comparison Matrix

| Feature | react-grid-layout | GridStack.js | CSS Grid + dnd-kit |
|---------|-------------------|--------------|-------------------|
| Dense Packing | ✅ Pluggable | ✅ Built-in | ✅ Native |
| Responsive Breakpoints | ✅ Built-in | ✅ Built-in | ⚠️ Manual |
| Widget Resizing | ✅ Built-in | ✅ Built-in | ❌ Not needed |
| Drag-Drop | ✅ Built-in | ✅ Built-in | ✅ dnd-kit |
| TypeScript | ✅ Excellent | ✅ Good | ✅ N/A |
| Learning Curve | 📈 Moderate | 📈 Moderate-High | 📉 Low |
| Integration Effort | 🔴 Replace dnd-kit | 🔴 Replace dnd-kit | 🟢 Additive |

---

### 7. Code Examples

#### react-grid-layout Implementation

```typescript
import { Responsive, WidthProvider } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

export const Dashboard = () => {
  const layout = [
    { x: 0, y: 0, w: 2, h: 2, i: 'chart' },
    { x: 2, y: 0, w: 1, h: 1, i: 'metric1' },
    { x: 2, y: 1, w: 1, h: 1, i: 'metric2' },
  ];

  return (
    <ResponsiveGridLayout
      layouts={{ lg: layout }}
      compactType="vertical"
      cols={{ lg: 4, md: 3, sm: 2, xs: 1 }}
      rowHeight={100}
      isDraggable={true}
    >
      <div key="chart">Chart Widget</div>
      <div key="metric1">Metric 1</div>
      <div key="metric2">Metric 2</div>
    </ResponsiveGridLayout>
  );
};
```

#### GridStack.js Implementation

```typescript
import { useEffect, useRef } from 'react';
import { GridStack } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';

export const Dashboard = () => {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gridRef.current) {
      const grid = GridStack.init({
        column: 4,
        cellHeight: 100,
        float: false,
      }, gridRef.current);

      // Call compact() to fill gaps
      grid.compact('compact');

      return () => grid.destroy();
    }
  }, []);

  return (
    <div className="grid-stack" ref={gridRef}>
      <div className="grid-stack-item" gs-w="2" gs-h="2">Chart</div>
      <div className="grid-stack-item" gs-w="1" gs-h="1">Metric 1</div>
      <div className="grid-stack-item" gs-w="1" gs-h="1">Metric 2</div>
    </div>
  );
};
```

#### CSS Grid Dense (Selected Approach)

```typescript
// Works with existing dnd-kit - no replacement needed
export const Dashboard = () => {
  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className={cn(
        'grid gap-4 grid-cols-4',
        config.densePacking && 'grid-flow-row-dense'
      )}>
        <div className="col-span-2 row-span-2">Chart</div>
        <div className="col-span-1 row-span-1">Metric 1</div>
        <div className="col-span-1 row-span-1">Metric 2</div>
      </div>
    </DndContext>
  );
};
```

---

## Decision Analysis

### Option A: Migrate to react-grid-layout

**Pros**:
- Most popular grid library (1.35M weekly downloads)
- Excellent TypeScript support (v2 rewrite)
- Pluggable compactor for custom dense packing
- Built-in responsive breakpoints

**Cons**:
- 🔴 **Must replace dnd-kit** - significant refactor
- +70KB bundle size (net +40KB after removing dnd-kit)
- Learning curve for team
- Different API patterns

**Verdict**: Only worthwhile if we need advanced features like widget resizing.

### Option B: Migrate to GridStack.js

**Pros**:
- Built-in `compact()` method with smart reordering
- Framework-agnostic (could port to other frameworks)
- Active maintenance

**Cons**:
- 🔴 **Must replace dnd-kit** - significant refactor
- Less idiomatic React integration (imperative API)
- Smaller community than RGL
- +70-195KB bundle size

**Verdict**: No advantage over RGL for a React project.

### Option C: CSS Grid Dense (SELECTED)

**Pros**:
- ✅ Zero dependencies (no bundle impact)
- ✅ **Keeps existing dnd-kit** - additive change only
- ✅ Native browser performance
- ✅ Works with Tailwind utilities
- ✅ Simple implementation

**Cons**:
- No widget resizing (not in spec anyway)
- Manual responsive breakpoints (already handled)
- Items may render out-of-order (accessibility consideration)

**Verdict**: Best fit for our use case - feature 003 already has working dnd-kit, and we don't need widget resizing.

---

## Final Recommendation

**Use CSS Grid `grid-auto-flow: dense`** because:

1. **Integration**: Zero conflict with existing dnd-kit drag-drop
2. **Bundle**: Zero bytes added (vs 70-100KB for RGL/GridStack)
3. **Simplicity**: CSS-only solution, no new library patterns to learn
4. **Scope**: Widget resizing is explicitly out of scope per spec
5. **Performance**: Native browser layout algorithm

**When to reconsider RGL/GridStack**:
- If widget resizing becomes a requirement
- If we need to support 50+ widgets with complex layouts
- If the project moves away from dnd-kit for other reasons

---

---

## Extended Column Spans Research (2026-01-25 Update)

Following spec clarification session, widget column spans need to expand from 1-2 to 1-4 plus "full-width".

### 1. CSS Grid Column Span Classes for 1-4 + Full

**Decision**: Use Tailwind CSS utility classes for column spans

**Rationale**: Tailwind provides built-in `col-span-{n}` utilities. For "full" span, use `col-span-full` which sets `grid-column: 1 / -1` to span all columns.

**Implementation**:
```typescript
const COL_SPAN_CLASSES: Record<WidgetSpan, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
  4: 'col-span-4',
  'full': 'col-span-full',  // spans all available columns
};
```

**Alternatives Considered**:
- Custom CSS with `grid-column` property → Rejected: Tailwind already provides optimized utilities
- Inline styles → Rejected: Inconsistent with codebase patterns

### 2. Runtime Clamping for Column Span > Grid Columns

**Decision**: Clamp at render time, preserve saved preference

**Rationale**: Users may switch between 2, 3, and 4 column grids. A widget configured as 4x should render as 3x in a 3-column grid but revert to 4x when grid expands. This prevents data loss and matches user mental model.

**Implementation**:
```typescript
function getEffectiveColumnSpan(
  savedSpan: WidgetSpan,
  gridColumns: GridColumns
): number {
  if (savedSpan === 'full') return gridColumns;
  return Math.min(savedSpan, gridColumns);
}
```

**Alternatives Considered**:
- Reset to 1x when exceeding → Rejected: Loses user configuration
- Block grid column reduction → Rejected: Too restrictive
- Show warning → Rejected: Unnecessary friction for common operation

### 3. Type Representation for 'full' Span

**Decision**: Use union type `1 | 2 | 3 | 4 | 'full'` with separate effective span computation

**Rationale**: The 'full' option is semantically different from numeric spans - it's dynamic based on grid columns. Using a string literal keeps the type self-documenting and distinguishes the "span all" intent from a fixed numeric span.

**Implementation**:
```typescript
// Type definition
export type WidgetSpan = 1 | 2 | 3 | 4 | 'full';

// Zod schema
export const WidgetSpanSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal('full'),
]);
```

**Alternatives Considered**:
- Use -1 or 0 for full → Rejected: Magic numbers are unclear
- Use `Infinity` → Rejected: JSON serialization issues
- Separate boolean `isFullWidth` → Rejected: Splits single concept into two fields

### 4. Schema Migration Strategy

**Decision**: Backward-compatible additive change, no version bump required

**Rationale**: Existing configs have `widgetSpans` with values 1 or 2. The new type (`1 | 2 | 3 | 4 | 'full'`) is a superset. Zod validation will pass for existing values. No migration function needed.

**Implementation**:
- Update `WidgetSpanSchema` to accept new values
- Existing configs remain valid
- New values available immediately after code update

### 5. Tailwind col-span Classes Availability

**Decision**: Use default Tailwind grid classes; no config changes needed

**Verification**:
```css
/* Available by default in Tailwind */
.col-span-1 { grid-column: span 1 / span 1; }
.col-span-2 { grid-column: span 2 / span 2; }
.col-span-3 { grid-column: span 3 / span 3; }
.col-span-4 { grid-column: span 4 / span 4; }
.col-span-full { grid-column: 1 / -1; }
```

---

## Sources

- [react-grid-layout GitHub](https://github.com/react-grid-layout/react-grid-layout)
- [react-grid-layout npm](https://www.npmjs.com/package/react-grid-layout)
- [GridStack.js GitHub](https://github.com/gridstack/gridstack.js)
- [GridStack.js Documentation](https://gridstackjs.com/)
- [dnd-kit Documentation](https://dndkit.com/)
- [CSS Grid grid-auto-flow - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-auto-flow)
- [NPM Trends: gridstack vs react-grid-layout](https://npmtrends.com/gridstack-vs-react-grid-layout)
