# Implementation Plan: Dashboard Grid Dense Packing

**Branch**: `004-grid-dense-packing` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-grid-dense-packing/spec.md`

## Summary

Enable masonry-style dense packing where smaller widgets fill vertical gaps alongside larger widgets. Uses **CSS Grid `grid-auto-flow: dense`** with Tailwind utilities - a zero-dependency approach that integrates seamlessly with the existing dnd-kit drag-drop implementation from feature 003.

## Technical Context

**Language/Version**: TypeScript 5.3 (strict mode)
**Primary Dependencies**: Next.js 14.2, React 18, Tailwind CSS, dnd-kit, Zustand 4.5
**Storage**: IndexedDB via Dexie.js (privacy-first, browser-only)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web browser (responsive: mobile/tablet/desktop)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Widget reflow < 200ms, instant dense packing toggle
**Constraints**: Zero additional dependencies, maintain dnd-kit compatibility
**Scale/Scope**: 8 dashboard widgets, single dashboard view

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy-First | ✅ PASS | All config stored in IndexedDB via Dexie.js |
| II. Financial Precision | ✅ N/A | No monetary calculations in layout feature |
| III. Type Safety | ✅ PASS | New types with Zod validation, strict mode |
| IV. Test-Driven | ✅ PASS | Unit tests for types/store, E2E for workflow |
| V. Component Architecture | ✅ PASS | shadcn/ui components, Zustand store, CSS-only layout |
| Technology Stack | ✅ PASS | No new dependencies - uses CSS Grid + Tailwind |

## Project Structure

### Documentation (this feature)

```text
specs/004-grid-dense-packing/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Framework evaluation (CSS Grid vs react-grid-layout)
├── data-model.md        # Type definitions and schema changes
├── quickstart.md        # Quick implementation guide
├── contracts/           # API contracts (store actions)
└── checklists/          # Quality checklists
    └── requirements.md  # Spec validation checklist
```

### Source Code (repository root)

```text
src/
├── types/
│   └── dashboard.ts            # Add WidgetRowSpan, densePacking, v3 schema
├── lib/
│   ├── stores/
│   │   └── dashboard.ts        # Add setDensePacking, setWidgetRowSpan actions
│   └── services/
│       └── dashboard-config.ts # Add persistence + v2→v3 migration
└── components/
    └── dashboard/
        ├── dashboard-container.tsx  # Add grid-flow-row-dense class
        ├── widget-wrapper.tsx       # Add rowSpan prop + row-span-{n} class
        └── dashboard-settings.tsx   # Add dense packing toggle + row span selectors

tests/
├── unit/
│   └── dashboard-types.test.ts     # Schema validation tests
└── e2e/
    └── dashboard-dense-packing.spec.ts  # Dense packing workflow test
```

**Structure Decision**: Extends existing dashboard module structure from feature 003. All changes are additive modifications to existing files - no new directories needed.

## Complexity Tracking

> No constitution violations requiring justification.

| Decision | Rationale |
|----------|-----------|
| CSS Grid over react-grid-layout | Zero bundle impact, no dnd-kit conflicts, native browser perf |
| Schema version bump (v2→v3) | Clean migration path, preserves existing user configs |
| Row spans limited to 1/2/3 | Matches spec, sufficient for dashboard use case |
