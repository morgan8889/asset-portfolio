# Implementation Plan: Dashboard Stacking Layout

**Branch**: `003-dashboard-stacking-layout` | **Date**: 2026-01-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-dashboard-stacking-layout/spec.md`

## Summary

Extend the existing dashboard widget system to support configurable grid/stacking layouts, responsive column count, and widget span configuration. Building on the existing dnd-kit drag-and-drop infrastructure, this feature adds layout mode selection, column count preferences (2-4 columns), per-widget span settings, and responsive breakpoint behavior.

## Technical Context

**Language/Version**: TypeScript 5.3+ with Next.js 14.2 (App Router)
**Primary Dependencies**: @dnd-kit/core 6.3+, @dnd-kit/sortable 10.0+, Zustand 4.5+, Zod
**Storage**: IndexedDB via Dexie.js (userSettings table)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Modern browsers (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
**Project Type**: Web application (Next.js frontend-only)
**Performance Goals**: Layout transitions < 500ms, drag operations complete in < 3s
**Constraints**: Privacy-first (all data local), responsive 320px-2560px
**Scale/Scope**: Single-user local app, ~8 widgets, simple layout state

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|------------|-------|
| I. Privacy-First Architecture | ✅ PASS | Layout config stored in IndexedDB via Dexie.js, no server persistence |
| II. Financial Precision | ✅ N/A | No monetary calculations in layout feature |
| III. Type Safety & Validation | ✅ REQUIRED | Zod schemas for layout config, TypeScript strict mode |
| IV. Test-Driven Quality | ✅ REQUIRED | Unit tests for layout logic, E2E for drag-drop workflows |
| V. Component Architecture | ✅ REQUIRED | shadcn/ui for settings UI, Zustand for state, Client Components for interactivity |
| Technology Stack | ✅ PASS | Uses approved stack: dnd-kit (already installed), Zustand, Tailwind |

**Gate Status**: ✅ PASS - No violations, proceeding to Phase 0

### Post-Design Re-Check (Phase 1 Complete)

| Principle | Status | Design Verification |
|-----------|--------|---------------------|
| I. Privacy-First | ✅ PASS | data-model.md confirms IndexedDB storage only |
| III. Type Safety | ✅ PASS | contracts/dashboard-layout.ts includes Zod schemas |
| IV. Test-Driven | ✅ PLANNED | quickstart.md includes test checklist |
| V. Component Arch | ✅ PASS | Uses shadcn/ui RadioGroup, Select; Zustand store actions |

**Post-Design Gate Status**: ✅ PASS - Design artifacts comply with constitution

## Project Structure

### Documentation (this feature)

```text
specs/003-dashboard-stacking-layout/
├── plan.md              # This file
├── research.md          # Phase 0: dnd-kit patterns, responsive grid patterns
├── data-model.md        # Phase 1: LayoutConfiguration schema
├── quickstart.md        # Phase 1: Implementation quick reference
├── contracts/           # Phase 1: TypeScript interfaces
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (dashboard)/
│       └── page.tsx                   # Dashboard page (update grid classes)
├── components/
│   └── dashboard/
│       ├── dashboard-container.tsx    # UPDATE: Add layout mode logic
│       ├── dashboard-settings.tsx     # UPDATE: Add layout configuration UI
│       ├── widget-wrapper.tsx         # UPDATE: Add span support
│       └── layout-mode-selector.tsx   # NEW: Grid/stacking toggle
├── lib/
│   ├── stores/
│   │   └── dashboard.ts               # UPDATE: Add layout state actions
│   └── services/
│       └── dashboard-config.ts        # UPDATE: Add layout config persistence
└── types/
    └── dashboard.ts                   # UPDATE: Add LayoutMode, column count types

tests/
├── unit/
│   └── lib/services/
│       └── dashboard-config.test.ts   # UPDATE: Layout config tests
└── e2e/
    ├── dashboard-layout.spec.ts       # NEW: Layout mode E2E tests
    └── widget-reorder.spec.ts         # UPDATE: Add span tests
```

**Structure Decision**: Single Next.js web application. All changes within existing `src/` directory structure following established patterns from feature 002.

## Lessons Applied (from Previous Features)

**Source**: Git history fixes and patterns from feature 002 implementation

| Lesson | Issue | How This Plan Addresses It |
|--------|-------|---------------------------|
| **React Hooks Rule** | Hooks after early returns cause errors | New hooks (gridClass memo, effectiveMode) placed before loading checks in dashboard-container.tsx |
| **Loading Race Conditions** | Multiple load triggers cause stuck states | Use existing `loadConfig` action only; no new load triggers added |
| **IndexedDB Serialization** | Decimal values can't be stored directly | ✅ N/A - only enums and numbers in new config fields |
| **Mobile Detection** | Need to force stacking on mobile | Reuse existing `isMobile` state to override `effectiveLayoutMode` |
| **Widget Span Gap** | Current span reads from static definition | Change `widget-wrapper.tsx` to read from `config.widgetSpans[id]` |
| **Optimistic Updates** | UI must update immediately with rollback | New actions use existing `optimisticUpdate` helper pattern |

**Verification Checklist** (for implementation):
- [ ] All new hooks in dashboard-container.tsx are before `if (configLoading...)` return
- [ ] No new data loading effects added (use existing loadConfig)
- [ ] `effectiveLayoutMode = isMobile ? 'stacking' : config.layoutMode`
- [ ] `widget-wrapper.tsx` reads span from `config.widgetSpans[id]` not `definition.colSpan`
- [ ] New store actions follow `optimisticUpdate` pattern

---

## Complexity Tracking

> No complexity violations - feature uses existing stack and patterns.

| Aspect | Complexity | Justification |
|--------|------------|---------------|
| Layout modes | Low | Simple enum switch between grid/stacking |
| Column configuration | Low | CSS Grid with Tailwind utilities |
| Widget span | Medium | Requires grid layout logic updates |
| Responsive behavior | Medium | Existing Tailwind breakpoints, window listener already present |
| Persistence | Low | Extends existing DashboardConfiguration schema |
