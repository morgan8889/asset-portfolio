# Implementation Plan: Configurable Portfolio Overview Dashboard

**Branch**: `002-portfolio-dashboard` | **Date**: 2026-01-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-portfolio-dashboard/spec.md`

## Summary

Transform the existing static dashboard into a fully configurable portfolio overview with:
1. **Widget system**: Show/hide and reorder dashboard components with drag-drop
2. **Time period controls**: Configure gain/loss calculation windows (Today, Week, Month, Year, All)
3. **Performance widgets**: Top performers and biggest losers with configurable counts
4. **Historical data integration**: Replace mock chart data with real transaction-based history
5. **Settings persistence**: Store widget configuration in IndexedDB via existing userSettings table

## Technical Context

**Language/Version**: TypeScript 5.3 with Next.js 14.2 (App Router)
**Primary Dependencies**: React 18, Zustand 4.5, Recharts 2.15, shadcn/ui, Tailwind CSS, dnd-kit (new)
**Storage**: IndexedDB via Dexie.js 3.2 (existing userSettings table)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (modern browsers: Chrome, Firefox, Safari, Edge)
**Project Type**: Single Next.js web application
**Performance Goals**: Dashboard load < 2s (SC-001), chart range change < 1s (SC-004)
**Constraints**: All data local-only (privacy-first), financial precision via decimal.js
**Scale/Scope**: Single-user local application, ~50 holdings max typical use

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Implementation Notes |
|-----------|--------|---------------------|
| **I. Privacy-First (NON-NEGOTIABLE)** | ✅ PASS | Widget config stored in IndexedDB userSettings; no server persistence |
| **II. Financial Precision** | ✅ PASS | All calculations use existing decimal.js patterns; performance metrics computed from Holding/Transaction Decimal fields |
| **III. Type Safety & Validation** | ✅ PASS | New interfaces in src/types/; Zod schemas for widget config validation |
| **IV. Test-Driven Quality** | ✅ PASS | Unit tests for calculation services; E2E tests for widget interactions |
| **V. Component Architecture** | ✅ PASS | shadcn/ui base; new widgets as Client Components with React.memo for charts |

**Technology Stack Additions**:
- `@dnd-kit/core` and `@dnd-kit/sortable` for drag-drop widget reordering (no server requirement, accessibility-first)

## Project Structure

### Documentation (this feature)

```text
specs/002-portfolio-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── dashboard-config.ts  # Widget configuration types
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (dashboard)/
│       └── page.tsx                    # MODIFY: integrate DashboardContainer
├── components/
│   ├── dashboard/                      # NEW: dashboard-specific components
│   │   ├── dashboard-container.tsx     # Widget orchestration with dnd-kit
│   │   ├── dashboard-settings.tsx      # Widget visibility/order modal
│   │   ├── widget-wrapper.tsx          # Generic draggable widget container
│   │   └── widgets/
│   │       ├── total-value-widget.tsx
│   │       ├── gain-loss-widget.tsx
│   │       ├── category-breakdown-widget.tsx
│   │       ├── growth-chart-widget.tsx
│   │       ├── top-performers-widget.tsx
│   │       └── biggest-losers-widget.tsx
│   └── charts/
│       ├── portfolio-chart.tsx         # MODIFY: accept real data props
│       └── allocation-donut.tsx        # EXISTING (may need time period)
├── lib/
│   ├── db/
│   │   ├── schema.ts                   # EXISTING: userSettings table
│   │   └── queries.ts                  # MODIFY: add dashboard config queries
│   ├── services/
│   │   ├── dashboard-config.ts         # NEW: widget config CRUD
│   │   ├── performance-calculator.ts   # NEW: time-period performance calc
│   │   └── historical-value.ts         # NEW: portfolio value reconstruction
│   └── stores/
│       └── dashboard.ts                # NEW: dashboard state store
└── types/
    └── dashboard.ts                    # NEW: widget/config type definitions

tests/
├── unit/
│   ├── performance-calculator.test.ts
│   └── historical-value.test.ts
└── e2e/
    ├── dashboard-configuration.spec.ts
    └── dashboard-display.spec.ts
```

**Structure Decision**: Single Next.js web app (existing pattern). New components organized under `src/components/dashboard/` with widget-per-file structure. Services for business logic in `src/lib/services/`.

## Complexity Tracking

No constitution violations requiring justification. Implementation follows established patterns.

---

## Phase Outputs Reference

### Phase 0: research.md
- dnd-kit vs react-beautiful-dnd decision
- Historical value reconstruction approach
- Time-period performance calculation methodology
- Mobile widget reordering UX patterns

### Phase 1: data-model.md, contracts/, quickstart.md
- DashboardConfiguration entity
- Widget entity schema
- PerformanceMetric time-window types
- API contracts for config persistence
