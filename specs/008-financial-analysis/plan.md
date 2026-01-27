# Implementation Plan: Financial Analysis & Recommendations

**Branch**: `008-financial-analysis` | **Date**: 2026-01-26 | **Spec**: [specs/008-financial-analysis/spec.md](specs/008-financial-analysis/spec.md)
**Input**: Feature specification from `/specs/008-financial-analysis/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement a comprehensive financial analysis dashboard that provides a Portfolio Health Score, actionable recommendations, and asset allocation modeling. Key technical features include extending the `Asset` data model to support manual valuation (for property) and regional classification, and a client-side rule engine for generating deterministic financial advice. All analysis is performed locally to maintain privacy.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5+ (Next.js 14)  
**Primary Dependencies**: React 18, Recharts (Charts), Decimal.js (Math), Zustand (State), Dexie.js (DB)  
**Storage**: IndexedDB (extending `assets` table, adding `userSettings` for profiles)  
**Testing**: Vitest (Unit/Integration for scoring logic), Playwright (E2E for analysis flows)  
**Target Platform**: Web (Next.js Client Components)
**Project Type**: Web Application  
**Performance Goals**: Analysis page load < 2s, Rebalancing calc < 100ms  
**Constraints**: Privacy-first (Local analysis only), High precision math required  
**Scale/Scope**: ~100-500 holdings typical, supports diverse asset classes (Crypto, Property)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Privacy-First**: Analysis logic runs 100% client-side; no data egress.
- [x] **Financial Precision**: All scoring and rebalancing uses `decimal.js`.
- [x] **Type Safety**: New entities (`HealthMetric`, `Recommendation`) defined in contracts.
- [x] **Component Architecture**: Reusing shadcn/ui and Recharts; new widgets follow existing patterns.

## Project Structure

### Documentation (this feature)

```text
specs/008-financial-analysis/
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
├── app/(dashboard)/analysis/
│   └── page.tsx                 # New Analysis page
├── components/analysis/
│   ├── health-score-card.tsx    # Visualization of health score
│   ├── recommendation-list.tsx  # List of actionable cards
│   ├── allocation-chart.tsx     # Current vs Target comparison
│   └── rebalancing-table.tsx    # Buy/Sell instructions
├── lib/services/analysis/
│   ├── scoring-service.ts       # Health score calculation logic
│   ├── recommendation-engine.ts # Rule-based recommendation generation
│   └── rebalancing-service.ts   # Target drift calculations
├── lib/stores/
│   └── analysis.ts              # Zustand store for analysis state
└── types/
    └── analysis.ts              # Type definitions (Health, Profile, etc.)
```

**Structure Decision**: Option 1: Single project (DEFAULT)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |