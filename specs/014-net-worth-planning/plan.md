# Implementation Plan: Net Worth History & FIRE Planning

**Branch**: `014-net-worth-planning` | **Date**: 2026-01-27 | **Spec**: [specs/014-net-worth-planning/spec.md](specs/014-net-worth-planning/spec.md)
**Input**: Feature specification from `/specs/014-net-worth-planning/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a dedicated Planning page featuring historical Net Worth tracking and FIRE (Financial Independence, Retire Early) projections. The system will aggregate asset values and manual liabilities to produce a net worth history. A client-side projection engine will calculate "Time to FIRE" based on configurable savings rates and inflation-adjusted returns.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5+ (Next.js 14)  
**Primary Dependencies**: React 18, Recharts, Decimal.js, Dexie.js, Zustand  
**Storage**: IndexedDB (`liabilities` table, `userSettings` for config)  
**Testing**: Vitest (Unit for projection math), Playwright (E2E)  
**Target Platform**: Web (Next.js Client Components)
**Project Type**: Web Application  
**Performance Goals**: Projection calc < 50ms, Net Worth history < 1s  
**Constraints**: Local-only processing, Real (inflation-adjusted) returns  
**Scale/Scope**: ~10k history points, 30-year projections

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Privacy-First**: Planning data stored locally; no external transmission.
- [x] **Financial Precision**: Projections use `decimal.js` compounding.
- [x] **Type Safety**: New `Liability` and `FireConfig` interfaces.
- [x] **Component Architecture**: Reusing Recharts for new visualizations.

## Project Structure

### Documentation (this feature)

```text
specs/014-net-worth-planning/
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
├── app/(dashboard)/planning/
│   └── page.tsx                 # New Planning page
├── components/planning/
│   ├── net-worth-chart.tsx      # Historical line chart
│   ├── fire-projection-chart.tsx# Future growth chart
│   ├── liability-manager.tsx    # Modal/list for debts
│   └── scenario-controls.tsx    # Inputs for "What-If"
├── lib/services/planning/
│   ├── fire-projection.ts       # Core compounding logic
│   └── net-worth-service.ts     # Aggregates assets + liabilities
├── lib/stores/
│   └── planning.ts              # Zustand store for planning state
└── types/
    └── planning.ts              # Type definitions
```

**Structure Decision**: Option 1: Single project (DEFAULT)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |