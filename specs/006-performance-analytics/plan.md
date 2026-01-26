# Implementation Plan: Portfolio Performance Analytics

**Branch**: `006-performance-analytics` | **Date**: 2025-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-performance-analytics/spec.md`

## Summary

Implement comprehensive portfolio performance analytics with pre-computed daily snapshots, Time-Weighted Return (TWR) calculations, interactive time-series charts, individual holding performance breakdown, and S&P 500 benchmark comparison. All data persists locally in IndexedDB maintaining the privacy-first architecture.

## Technical Context

**Language/Version**: TypeScript 5.3 with Next.js 14.2 (App Router)
**Primary Dependencies**: Recharts 2.15, Dexie.js 3.2, decimal.js, date-fns, Zod, Zustand 4.5
**Storage**: IndexedDB via Dexie.js (new `performanceSnapshots` table required)
**Testing**: Vitest for unit tests, Playwright for E2E tests
**Target Platform**: Web browser (privacy-first, local-only operation)
**Project Type**: web (Next.js App Router monolith)
**Performance Goals**:
- Chart render < 2 seconds (SC-001)
- Time period changes < 500ms (SC-002)
- 5 years × 50 holdings without lag (SC-005)
**Constraints**:
- All data local-only (IndexedDB)
- decimal.js for all financial calculations
- TWR methodology for returns
**Scale/Scope**: Single-user portfolios, 10+ years of historical data possible

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Privacy-First Architecture | ✅ PASS | All data stored in IndexedDB; benchmark data proxied via existing API routes; no server-side persistence |
| II. Financial Precision | ✅ PASS | Using decimal.js for all calculations (TWR, gains, snapshots); spec explicitly requires FR-010 |
| III. Type Safety & Validation | ✅ PASS | New types in src/types/; Zod schemas for API responses; strict TypeScript |
| IV. Test-Driven Quality | ✅ PASS | Unit tests for TWR calculations, snapshot service; E2E for performance page workflow |
| V. Component Architecture | ✅ PASS | Server Components for page, Client Components for charts; Zustand store for state; Recharts for visualization |
| Technology Stack | ✅ PASS | All technologies already in stack (Recharts, Dexie, decimal.js, Zustand) |

**Gate Status**: ✅ All principles satisfied. Proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/006-performance-analytics/
├── plan.md              # This file
├── research.md          # Phase 0 output - TWR implementation, benchmark data
├── data-model.md        # Phase 1 output - PerformanceSnapshot schema
├── quickstart.md        # Phase 1 output - Development setup
├── contracts/           # Phase 1 output - API contracts
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── (dashboard)/
│   │   └── performance/        # NEW: Performance analytics page
│   │       ├── page.tsx        # Server component - page shell
│   │       └── components/     # Client components for charts/tables
│   └── api/
│       └── prices/
│           └── [symbol]/route.ts  # EXTEND: Support ^GSPC for S&P 500
├── components/
│   ├── charts/
│   │   ├── performance-chart.tsx    # NEW: Main performance time-series chart
│   │   └── benchmark-overlay.tsx    # NEW: Benchmark comparison overlay
│   └── performance/
│       ├── summary-stats.tsx        # NEW: Performance summary statistics
│       ├── holdings-breakdown.tsx   # NEW: Individual holding performance table
│       └── period-selector.tsx      # NEW: Time period filter buttons
├── lib/
│   ├── db/
│   │   └── schema.ts               # EXTEND: Add performanceSnapshots table
│   ├── services/
│   │   ├── performance-calculator.ts   # EXTEND: Add TWR calculation
│   │   ├── historical-value.ts         # EXISTS: Reuse for value calculation
│   │   ├── snapshot-service.ts         # NEW: Snapshot computation/persistence
│   │   └── benchmark-service.ts        # NEW: Benchmark data fetching/caching
│   └── stores/
│       └── performance.ts          # NEW: Zustand store for performance state
└── types/
    ├── dashboard.ts                # EXTEND: Add performance-specific types
    └── performance.ts              # NEW: PerformanceSnapshot, TWR types

tests/
├── unit/
│   └── services/
│       ├── twr-calculator.test.ts      # NEW: TWR calculation tests
│       └── snapshot-service.test.ts    # NEW: Snapshot service tests
└── e2e/
    └── performance-analytics.spec.ts   # NEW: Performance page E2E tests
```

**Structure Decision**: Extending existing Next.js App Router structure. New `/performance` route under dashboard group. Services follow existing pattern in `src/lib/services/`.

## Complexity Tracking

> No Constitution violations requiring justification.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| Snapshot Storage | New IndexedDB table | Required for <2s chart render; on-demand calculation too slow for 5yr×50 holdings |
| TWR Calculation | Custom implementation | Industry-standard method; no suitable npm package for browser-only |
| Benchmark Data | Extend existing price API | ^GSPC already supported by Yahoo Finance; minimal new code |

## Constitution Re-Check (Post Phase 1 Design)

| Principle | Status | Evidence from Design |
|-----------|--------|----------------------|
| I. Privacy-First Architecture | ✅ PASS | `performanceSnapshots` stored in IndexedDB; benchmark API proxied through Next.js; no new external data storage |
| II. Financial Precision | ✅ PASS | `data-model.md` specifies Decimal fields for all monetary values; TWR uses Decimal throughout |
| III. Type Safety & Validation | ✅ PASS | `contracts/service-interfaces.ts` defines strict interfaces; Zod schemas in `data-model.md` |
| IV. Test-Driven Quality | ✅ PASS | `quickstart.md` includes test commands; `research.md` defines 95%+ coverage for TWR calculator |
| V. Component Architecture | ✅ PASS | Design follows Server/Client Component split; Zustand store for state; existing Recharts patterns |
| Technology Stack | ✅ PASS | No new dependencies required; all tools from existing stack |

**Post-Design Gate Status**: ✅ All principles satisfied. Ready for Phase 2 task generation.

## Generated Artifacts

| Artifact | Path | Status |
|----------|------|--------|
| Implementation Plan | `specs/006-performance-analytics/plan.md` | ✅ Complete |
| Research | `specs/006-performance-analytics/research.md` | ✅ Complete |
| Data Model | `specs/006-performance-analytics/data-model.md` | ✅ Complete |
| Service Interfaces | `specs/006-performance-analytics/contracts/service-interfaces.ts` | ✅ Complete |
| API Contracts | `specs/006-performance-analytics/contracts/api-contracts.ts` | ✅ Complete |
| Quickstart Guide | `specs/006-performance-analytics/quickstart.md` | ✅ Complete |
| Task List | `specs/006-performance-analytics/tasks.md` | ✅ Complete |
| Agent Context | `CLAUDE.md` | ✅ Updated |

## Next Steps

Run `/speckit.implement` to begin implementation of the task list.
