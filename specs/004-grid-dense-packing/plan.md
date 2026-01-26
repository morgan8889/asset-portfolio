# Implementation Plan: Dashboard Grid Dense Packing (Extended Column Spans)

**Branch**: `004-grid-dense-packing` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-grid-dense-packing/spec.md`
**Status**: Incremental Update - Extending existing implementation with expanded column spans

## Summary

Extend the existing dashboard grid dense packing feature to support expanded column spans (1-4 plus "full-width") as clarified in the latest spec session. The base dense packing with row spans 1-3 is already implemented; this update modifies the column span system from the current 1-2 range to 1-4 plus a "full" option that spans all available columns.

**Key Changes from Existing Implementation**:
- `WidgetSpan` type: `1 | 2` → `1 | 2 | 3 | 4 | 'full'`
- Column span selector UI: 2 options → 5 options (1x, 2x, 3x, 4x, Full)
- Clamping logic: Add runtime clamping when column span exceeds grid columns
- Schema migration: v3 → v4 (or inline update if no breaking changes)

## Technical Context

**Language/Version**: TypeScript 5.3+ with Next.js 14.2 (App Router)
**Primary Dependencies**: React 18, Zustand 4.5, Tailwind CSS, shadcn/ui, dnd-kit, Zod
**Storage**: IndexedDB via Dexie.js (privacy-first, browser-only)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (modern browsers), responsive design
**Project Type**: Web application (Next.js monolith)
**Performance Goals**: Widget changes reflect within 200ms (SC-003)
**Constraints**: < 768px mobile disables dense packing; offline-capable
**Scale/Scope**: 8 dashboard widgets, 2-4 grid columns

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy-First Architecture | ✅ PASS | All data remains in IndexedDB; no server persistence |
| II. Financial Precision | ✅ N/A | Layout feature, no monetary calculations |
| III. Type Safety & Validation | ✅ PASS | Zod schemas for WidgetSpan; strict TypeScript |
| IV. Test-Driven Quality | ✅ PASS | Unit tests for store, E2E for settings UI |
| V. Component Architecture | ✅ PASS | Uses shadcn/ui Select; Zustand store pattern |

**Technology Stack Compliance**:
- Uses existing stack (Next.js, TypeScript, Zustand, Dexie.js, Tailwind, shadcn/ui)
- No new dependencies required
- CSS Grid native features (`grid-auto-flow: dense`, `col-span-*`)

## Project Structure

### Documentation (this feature)

```text
specs/004-grid-dense-packing/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── store-actions.md # Zustand store action contracts
└── tasks.md             # Phase 2 output (existing, needs update)
```

### Source Code (repository root)

```text
src/
├── types/
│   └── dashboard.ts         # WidgetSpan type + Zod schema (MODIFY)
├── lib/
│   ├── stores/
│   │   └── dashboard.ts     # setWidgetSpan action (MODIFY)
│   └── services/
│       └── dashboard-config.ts  # Persistence + clamping logic (MODIFY)
├── components/
│   └── dashboard/
│       ├── dashboard-container.tsx  # Column span class computation (MODIFY)
│       ├── widget-wrapper.tsx       # Column span prop handling (MODIFY)
│       └── dashboard-settings.tsx   # Column span dropdown (MODIFY)

tests/
├── e2e/
│   └── dashboard-dense-packing.spec.ts  # Extended column span tests (MODIFY)
└── (unit tests inline via __tests__ folders)
```

**Structure Decision**: Single Next.js application following existing patterns. All changes are modifications to existing files introduced in the base dense packing implementation.

## Complexity Tracking

> No violations - feature uses established patterns and existing stack.

| Aspect | Complexity | Justification |
|--------|------------|---------------|
| Type expansion | Low | Adding values to union type |
| UI changes | Low | Extending existing dropdown |
| Clamping logic | Medium | New runtime computation for edge cases |
| Migration | Low | Additive change, backward compatible |
