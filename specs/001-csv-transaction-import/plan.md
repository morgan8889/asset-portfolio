# Implementation Plan: CSV Transaction Import

**Branch**: `csv-transaction-import` | **Date**: 2026-01-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-csv-transaction-import/spec.md`

## Summary

Add CSV transaction import functionality with automatic column detection to the portfolio tracker. Users can upload CSV files from brokerages, the system auto-detects column mappings, displays a preview, allows manual corrections, validates data, handles errors gracefully, detects duplicates, and imports valid transactions to IndexedDB via Dexie.js.

## Technical Context

**Language/Version**: TypeScript 5.3 with Next.js 14 App Router
**Primary Dependencies**: React 18, papaparse (CSV parsing), Zod (validation), decimal.js (financial precision), Dexie.js (IndexedDB), React Hook Form, shadcn/ui, Zustand
**Storage**: Browser IndexedDB via Dexie.js (privacy-first, local-only)
**Testing**: Vitest (unit tests), Playwright (E2E tests)
**Target Platform**: Web browser (modern Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Import 500-row CSV in <30 seconds (per SC-001), responsive UI during processing
**Constraints**: All processing client-side (privacy-first), 10MB max file size, offline-capable after initial load
**Scale/Scope**: Single user, thousands of transactions per portfolio, typical imports 50-500 rows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Requirement | Compliance |
|-----------|-------------|------------|
| **I. Privacy-First (NON-NEGOTIABLE)** | All data stays in browser IndexedDB | ✅ CSV processing entirely client-side, no server uploads |
| **II. Financial Precision** | Use decimal.js for monetary values | ✅ All price/quantity/fee parsing uses decimal.js |
| **III. Type Safety & Validation** | Zod schemas, strict mode, no `any` | ✅ New Zod schemas for CSV row validation, import mappings |
| **IV. Test-Driven Quality** | Unit tests for services, E2E for workflows | ✅ Tests for parser, validator, import service; E2E for import flow |
| **V. Component Architecture** | shadcn/ui, Server/Client split, Zustand | ✅ Import dialog as Client Component, new import store |

**Gate Status**: ✅ PASSED - All constitutional requirements can be met.

## Project Structure

### Documentation (this feature)

```text
specs/001-csv-transaction-import/
├── plan.md              # This file
├── research.md          # Phase 0 output - best practices, patterns
├── data-model.md        # Phase 1 output - entities, schemas
├── quickstart.md        # Phase 1 output - getting started guide
├── contracts/           # Phase 1 output - API contracts
│   ├── csv-import-types.ts
│   └── validation-schemas.ts
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── types/
│   └── csv-import.ts           # New import-specific types
├── lib/
│   ├── stores/
│   │   └── csv-import.ts       # New Zustand store for import state
│   ├── services/
│   │   ├── csv-parser.ts       # CSV parsing with papaparse
│   │   ├── column-detector.ts  # Auto-detection logic
│   │   ├── csv-validator.ts    # Row validation service
│   │   └── csv-importer.ts     # Import orchestration
│   └── utils/
│       ├── date-parser.ts      # Multi-format date parsing
│       └── validation.ts       # Extend existing with CSV schemas
├── components/
│   └── forms/
│       ├── csv-import-dialog.tsx      # Main import modal
│       ├── column-mapping-editor.tsx  # Mapping correction UI
│       ├── import-preview-table.tsx   # Preview grid
│       └── import-results.tsx         # Success/error summary
└── app/
    └── (dashboard)/
        └── transactions/
            └── page.tsx        # Wire up Import CSV button

tests/
├── unit/
│   ├── csv-parser.test.ts
│   ├── column-detector.test.ts
│   ├── csv-validator.test.ts
│   ├── date-parser.test.ts
│   └── csv-importer.test.ts
└── e2e/
    └── csv-import.spec.ts
```

**Structure Decision**: Single Next.js web application with client-side-only processing. All import logic in `src/lib/services/`, UI components in `src/components/forms/`, types in `src/types/`. Follows existing project patterns.

## Complexity Tracking

> No constitution violations requiring justification. Implementation follows existing patterns.

| Area | Approach | Rationale |
|------|----------|-----------|
| CSV Parsing | papaparse (existing dep) | Already in package.json, battle-tested |
| Column Detection | Pattern matching + header analysis | Simple, deterministic, no ML needed |
| State Management | New Zustand store | Follows existing pattern |
| Validation | Zod schemas | Follows existing pattern |

## Phase Status

| Phase | Status | Output |
|-------|--------|--------|
| Phase 0: Research | ✅ Complete | `research.md` |
| Phase 1: Design | ✅ Complete | `data-model.md`, `contracts/`, `quickstart.md` |
| Phase 2: Tasks | ⏳ Pending | Run `/speckit.tasks` to generate |

## Post-Design Constitution Re-Check

*Re-evaluation after Phase 1 design completion.*

| Principle | Design Compliance |
|-----------|-------------------|
| **I. Privacy-First** | ✅ No server uploads. All CSV parsing via papaparse in browser. Data stored in IndexedDB via Dexie.js. |
| **II. Financial Precision** | ✅ `contracts/csv-import-types.ts` uses `Decimal` from decimal.js for all monetary fields. |
| **III. Type Safety** | ✅ Full Zod schemas in `contracts/validation-schemas.ts`. No `any` types in contracts. |
| **IV. Test-Driven** | ✅ Test file paths specified in project structure. Coverage plan in quickstart.md. |
| **V. Component Architecture** | ✅ Import dialog as Client Component. Zustand store for state. shadcn/ui primitives. |

**Post-Design Gate Status**: ✅ PASSED - Design artifacts comply with all constitutional principles.

## Dependencies

```
Phase 0: Research → Phase 1: Design → Phase 2: Tasks
```

- **Phase 0**: Research CSV parsing patterns, date format detection, brokerage export formats ✅
- **Phase 1**: Data models, validation schemas, component contracts ✅
- **Phase 2**: Task breakdown for implementation (via /speckit.tasks) ⏳
