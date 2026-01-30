# Implementation Plan: Comprehensive Allocation Planning

**Branch**: `010-allocation-planning` | **Date**: 2026-01-27 | **Spec**: [specs/010-allocation-planning/spec.md](specs/010-allocation-planning/spec.md)
**Input**: Feature specification from `/specs/010-allocation-planning/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a full allocation planning suite featuring current allocation visualization (Asset Class, Sector, Region), target modeling, and actionable rebalancing plans. Key technical components include a client-side rebalancing engine using `decimal.js`, persistence of target models in IndexedDB via `userSettings`, and interactive Recharts visualizations. Margin handling and account exclusions are first-class features.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5+ (Next.js 14)  
**Primary Dependencies**: React 18, Recharts, Decimal.js, Zustand, Dexie.js, Zod  
**Storage**: IndexedDB (`userSettings` table for targets/exclusions)  
**Testing**: Vitest (Unit/Integration), Playwright (E2E)  
**Target Platform**: Web (Next.js Client Components)
**Project Type**: Web Application  
**Performance Goals**: Rebalancing calc < 200ms, Chart render < 500ms  
**Constraints**: Local-only analysis (Privacy First), Precision math required  
**Scale/Scope**: ~500 holdings, ~10 asset classes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Privacy-First**: No external API for rebalancing; data stays local.
- [x] **Financial Precision**: All drift/amount calculations use `decimal.js`.
- [x] **Type Safety**: Contracts defined for `RebalancingItem`, `TargetModel`.
- [x] **Component Architecture**: Reusing `AllocationDonut`, new widgets follow patterns.

## Project Structure

### Documentation (this feature)

```text
specs/010-allocation-planning/
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
├── app/(dashboard)/allocation/
│   └── page.tsx                 # Update: Real implementation replacing placeholder
├── components/allocation/
│   ├── allocation-chart-tabs.tsx # Tabs for Class/Sector/Region views
│   ├── target-model-editor.tsx   # Sliders for setting targets
│   ├── rebalancing-table.tsx     # Buy/Sell action list
│   └── exclusion-toggle.tsx      # Account exclusion UI
├── lib/services/allocation/
│   ├── rebalancing-service.ts    # Core logic: Drift & Amount calculation
│   └── target-service.ts         # CRUD for TargetModels in DB
├── lib/stores/
│   └── allocation.ts             # Zustand store for allocation UI state
└── types/
    └── allocation.ts             # Shared types
```

**Structure Decision**: Option 1: Single project (DEFAULT)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |