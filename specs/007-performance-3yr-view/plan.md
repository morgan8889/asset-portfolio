# Implementation Plan: Performance Page 3-Year View & YoY Growth

**Branch**: `007-performance-3yr-view` | **Date**: 2026-01-26 | **Spec**: [specs/007-performance-3yr-view/spec.md](specs/007-performance-3yr-view/spec.md)
**Input**: Feature specification from `/specs/007-performance-3yr-view/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enhance the existing Performance Analytics page by adding a 3-Year (3Y) time period to the performance chart and introducing a new Year-over-Year (YoY) growth table. The implementation leverages pre-computed `PerformanceSnapshot` data from IndexedDB and uses Time-Weighted Return (TWR) calculation methodology to ensure accuracy independent of cash flows.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5+ (Next.js 14)  
**Primary Dependencies**: React 18, Recharts, Decimal.js, date-fns, Dexie.js (IndexedDB)  
**Storage**: IndexedDB (`PerformanceSnapshot` table)  
**Testing**: Vitest (Unit/Integration), Playwright (E2E)  
**Target Platform**: Web (Next.js Client Components)
**Project Type**: Web Application  
**Performance Goals**: Chart render < 2s, TWR calculation < 500ms  
**Constraints**: Local-first architecture (no server-side calculation), TWR required for accuracy  
**Scale/Scope**: ~1095 data points for 3Y view, aggregated monthly

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Library-First**: Extensions are within existing modules (`services/performance-analytics`).
- [x] **Test-First**: Unit tests required for new TWR helpers and component logic.
- [x] **Simplicity**: Reusing existing `PerformanceSnapshot` avoids new DB tables.

## Project Structure

### Documentation (this feature)

```text
specs/007-performance-3yr-view/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── app/(dashboard)/performance/
│   └── page.tsx                 # Update: Add 3Y button & YoY table
├── components/performance/
│   └── yoy-growth-table.tsx     # New: Component for YoY display
├── hooks/
│   └── usePerformanceData.ts    # Update: Handle 3Y period & calculate YoY
├── lib/services/
│   ├── performance-analytics.ts # Update: Add YoY calculation logic
│   └── twr-calculator.ts        # Reuse: Core TWR logic
└── types/
    ├── dashboard.ts             # Update: Add '3Y' to TimePeriod
    └── performance.ts           # Update: Add YearOverYearMetric type
```

**Structure Decision**: Option 1: Single project (DEFAULT)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |