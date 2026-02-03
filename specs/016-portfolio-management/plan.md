# Implementation Plan: Portfolio Management

**Branch**: `016-portfolio-management` | **Date**: February 3, 2026 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-portfolio-management/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

**Primary Requirement**: Add UI controls for switching between, viewing, editing, and deleting multiple portfolios. Users can create multiple portfolios but currently cannot switch between them once created.

**Technical Approach**:
- Extend existing portfolioStore with updatePortfolio, deletePortfolio, and getSortedPortfolios actions
- Add lastAccessedAt timestamp tracking to Portfolio entity (database schema v4→v5 migration)
- Create PortfolioSelector component using shadcn/ui Select component in DashboardHeader
- Build dedicated /portfolios management page with table layout
- Reuse CreatePortfolioDialog in edit mode for portfolio modifications
- Implement graduated delete confirmation (0, 1-10, >10 transactions)
- Portfolio sorting: current first → by recency (lastAccessedAt) → alphabetical fallback

## Technical Context

**Language/Version**: TypeScript 5.3 + React 18
**Primary Dependencies**: Next.js 14 (App Router), Zustand 4.5, Dexie.js 3.2, shadcn/ui (Radix + Tailwind), React Hook Form + Zod
**Storage**: IndexedDB (client-side via Dexie.js) - Schema v4→v5 migration
**Testing**: Vitest (unit tests), Playwright (E2E tests)
**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web (single-page application with Next.js App Router)
**Performance Goals**: Portfolio switching <2 seconds, sorting operation <50ms for 20 portfolios
**Constraints**: Client-side only (no backend), privacy-first (all data in IndexedDB), financial precision (decimal.js for calculations)
**Scale/Scope**: 2-5 portfolios typical, 20-50 portfolios maximum supported, 4 user stories (P1-P4), 5 implementation phases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Privacy-First Architecture (NON-NEGOTIABLE) ✅
- All portfolio data stored in IndexedDB (client-side only)
- No backend API calls for portfolio CRUD operations
- localStorage only for persisting currentPortfolio selection
- **Status**: PASSED - No violations

### Financial Precision ✅
- Use decimal.js for all calculations (portfolio metrics, cost basis)
- No JavaScript Number type for monetary values
- **Status**: PASSED - Using Decimal for PortfolioMetrics calculations

### Type Safety ✅
- TypeScript strict mode enabled
- Zod validation for portfolio forms and updates
- Type-safe Portfolio interface with lastAccessedAt field
- **Status**: PASSED - Full type coverage

### Test-Driven Quality ✅
- TDD workflow required for all new features
- Unit tests: 85%+ coverage target for new code
- E2E tests: Portfolio switching, editing, deletion workflows
- **Status**: PASSED - Test strategy defined in quickstart.md

### Component Architecture ✅
- Server components default (pages, layouts)
- Client components for interactive UI (PortfolioSelector, dialogs)
- shadcn/ui primitives for all UI components
- **Status**: PASSED - Component contracts defined

**Overall Assessment**: ✅ **CONSTITUTION COMPLIANT** - No violations, all principles satisfied

## Project Structure

### Documentation (this feature)

```text
specs/016-portfolio-management/
├── plan.md              # This file (/speckit.plan command output)
├── spec.md              # Feature specification (4 user stories)
├── research.md          # Phase 0 output - 9 design decisions
├── data-model.md        # Phase 1 output - Entity definitions, state management
├── quickstart.md        # Phase 1 output - 5-phase implementation guide
├── contracts/           # Phase 1 output - Component and store API contracts
│   ├── portfolio-selector.md
│   ├── portfolio-store.md
│   └── edit-delete-dialogs.md
├── checklists/
│   └── requirements.md  # Specification quality checklist (all passed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (dashboard)/
│       ├── page.tsx                    # Dashboard (existing)
│       └── portfolios/
│           └── page.tsx                # NEW: Portfolios management page
├── components/
│   ├── dashboard/
│   │   └── DashboardHeader.tsx         # MODIFIED: Add PortfolioSelector
│   ├── forms/
│   │   └── create-portfolio.tsx        # MODIFIED: Add edit mode support
│   ├── portfolio/                      # NEW: Portfolio components
│   │   ├── portfolio-selector.tsx      # NEW: Portfolio dropdown selector
│   │   ├── portfolios-table.tsx        # NEW: Portfolio list table
│   │   └── delete-portfolio-dialog.tsx # NEW: Delete confirmation dialog
│   └── ui/                             # shadcn/ui primitives (existing)
├── lib/
│   ├── db/
│   │   ├── schema.ts                   # MODIFIED: Add lastAccessedAt index
│   │   ├── migrations.ts               # MODIFIED: Add migration v4→v5
│   │   └── validation.ts               # Zod schemas (existing)
│   ├── stores/
│   │   ├── portfolio.ts                # MODIFIED: Add 3 new actions
│   │   └── csv-import.ts               # EXISTING: isProcessing flag
│   ├── config/
│   │   └── navigation.ts               # MODIFIED: Add /portfolios route
│   └── services/
│       └── portfolio-metrics.ts        # EXISTING: Calculate metrics
└── types/
    └── portfolio.ts                    # MODIFIED: Add lastAccessedAt field

tests/
├── e2e/                                # NEW: E2E tests
│   ├── portfolio-switching.spec.ts     # Portfolio selector and switching
│   ├── portfolios-management.spec.ts   # Portfolios page workflows
│   ├── portfolio-edit.spec.ts          # Edit dialog and type change warning
│   ├── portfolio-delete.spec.ts        # Delete confirmation levels
│   └── portfolio-isolation.spec.ts     # Data isolation verification
└── unit/                               # NEW: Unit tests
    ├── lib/stores/__tests__/
    │   └── portfolio.test.ts           # Store action tests
    └── components/portfolio/__tests__/
        ├── portfolio-selector.test.tsx
        └── delete-portfolio-dialog.test.tsx
```

**Structure Decision**: Next.js 14 App Router architecture with components organized by domain. Portfolio-specific components in `src/components/portfolio/`. Database schema and migrations in `src/lib/db/`. State management in `src/lib/stores/portfolio.ts` (Zustand). Tests mirror source structure with E2E tests in `tests/e2e/` and unit tests co-located with source.

## Complexity Tracking

**No violations detected** - Constitution check passed with full compliance.

This feature maintains existing architectural patterns:
- Client-side IndexedDB storage (privacy-first)
- Zustand for state management (consistent with 14 existing stores)
- shadcn/ui components (consistent with existing UI patterns)
- TDD workflow (Vitest + Playwright)
- decimal.js for financial calculations

**Complexity Justification**: None required - feature aligns with established architecture and patterns.
