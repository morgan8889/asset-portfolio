# Implementation Plan: Stock Tax Features (ESPP, RSU, Capital Gains)

**Branch**: `012-tax-features-stock` | **Date**: 2026-01-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-tax-features-stock/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature extends the portfolio tracker to support specialized stock compensation (ESPP, RSU) and provides tax liability estimation capabilities for capital gains. The implementation focuses on accurate cost basis tracking with bargain element preservation for ESPP shares, automatic FMV-based basis for RSU vesting, and time-based holding period differentiation (Short Term vs. Long Term) with FIFO-based tax liability estimates. The feature includes disqualifying disposition detection for ESPP sales that violate IRS holding requirements.

**Primary Technical Approach**: Extend the existing TaxLot data model with new fields for grant/vesting dates and bargain elements, add specialized ESPP/RSU transaction types, implement holding period calculations with tax rate application, and create new UI components for tax analysis visualization.

## Technical Context

**Language/Version**: TypeScript 5.3 with Next.js 14.2 (App Router) + React 18
**Primary Dependencies**: Dexie.js 3.2 (IndexedDB), decimal.js 10.4 (financial precision), Zod 3.25 (validation), React Hook Form 7.63, shadcn/ui + Radix UI, Recharts 2.15
**Storage**: Browser IndexedDB via Dexie.js (privacy-first, no server persistence)
**Testing**: Vitest for unit tests, Playwright for E2E workflows, @testing-library/react for component tests
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge) with ES2020+ support
**Project Type**: Single web application (Next.js App Router structure)
**Performance Goals**: <100ms for tax calculation updates, <50ms for holding period classification, support 10,000+ tax lots per portfolio
**Constraints**: All calculations client-side using decimal.js (no floating point), IndexedDB size limits (~50MB per origin), offline-capable with cached data
**Scale/Scope**: Support portfolios with 100+ assets, 1,000+ transactions, 5,000+ tax lots, 50+ years of holding periods

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Check (Pre-Research) ✅ PASSED

#### Privacy-First Architecture ✅
- All tax lot metadata (grant dates, vesting dates, bargain elements) stored in browser IndexedDB
- No server-side persistence of sensitive tax data
- Tax calculations performed entirely client-side using decimal.js
- No external API calls for tax calculations (all data local)

#### Financial Precision ✅
- All cost basis calculations use decimal.js (no floating point)
- Bargain element tracking maintains precision for adjusted basis calculations
- Tax liability estimates use Decimal arithmetic for rate application
- Holding period calculations maintain date precision to the day

#### Type Safety & Validation ✅
- Extended TaxLot interface with strict types for new fields
- Zod schemas for ESPP/RSU transaction validation
- Transaction type union extended with 'espp_purchase' | 'rsu_vest'
- TaxSettings interface with validated tax rate ranges (0-100%)

#### Test-Driven Quality ✅
- Unit tests for holding period calculation logic (< 1 year vs. ≥ 1 year)
- Unit tests for ESPP disqualifying disposition detection
- Unit tests for FIFO lot selection and tax liability estimation
- E2E tests for ESPP/RSU transaction entry workflows
- E2E tests for tax analysis view with mixed lot ages

#### Component Architecture ✅
- New Client Components: TaxAnalysisTab (charts), ESPPTransactionForm, RSUTransactionForm
- Server Components for page layouts (holdings, analysis views)
- Zustand store extension for tax settings (rates, methods)
- Forms use React Hook Form + Zod validation

**Violations**: None

---

### Post-Design Check (After Phase 1) ✅ PASSED

#### Privacy-First Architecture ✅
**Verified in data-model.md**:
- TaxSettings stored in existing `userSettings` table (IndexedDB only)
- TaxAnalysis computed on-demand (never persisted)
- All ESPP/RSU metadata stored in Transaction.metadata (JSON in IndexedDB)
- DisqualifyingDisposition computed dynamically (no storage)
- No new external API dependencies introduced

**Verified in contracts**:
- HoldingPeriodCalculator: Pure calculation service, no database access
- TaxEstimator: Reads from IndexedDB, no writes, no external calls
- ESPPValidator: Pure validation logic, no side effects

**COMPLIANCE**: ✅ All data remains local. No privacy violations.

---

#### Financial Precision ✅
**Verified in data-model.md**:
- All new Decimal fields properly serialized: `bargainElement`, `vestingPrice`, `shortTermRate`, `longTermRate`
- Added to `TAX_LOT_DECIMAL_FIELDS` constant for serialization
- Zod schemas enforce Decimal types at boundaries

**Verified in contracts**:
- TaxEstimator uses `.mul()`, `.minus()`, `.plus()` for all arithmetic
- Final tax amounts rounded with `.toDP(2)` (2 decimal places)
- No floating-point operations in calculation paths

**COMPLIANCE**: ✅ decimal.js used consistently for all financial calculations.

---

#### Type Safety & Validation ✅
**Verified in data-model.md**:
- Extended `TaxLot` interface with optional fields (backward compatible)
- New Zod schemas: `TaxLotSchema`, `ESPPTransactionSchema`, `RSUTransactionSchema`, `TaxSettingsSchema`
- Refinement validators for cross-field constraints (e.g., `netShares = gross - withheld`)

**Verified in contracts**:
- All service functions have explicit TypeScript signatures
- Return types fully specified (`TaxAnalysis`, `DisqualifyingDispositionCheck`)
- Error cases throw typed errors with clear messages

**COMPLIANCE**: ✅ Strict typing maintained. No `any` types introduced.

---

#### Test-Driven Quality ✅
**Verified in contracts**:
- **HoldingPeriodCalculator**: 100% coverage target, 12 unit test cases defined
- **TaxEstimator**: 95%+ coverage target, 8 unit test cases with edge cases
- **ESPPValidator**: 100% coverage target, 15 unit test cases for boundary conditions
- E2E tests defined in quickstart.md: `espp-workflow.spec.ts`, `rsu-workflow.spec.ts`, `tax-analysis.spec.ts`

**Test Completeness**:
- Boundary cases: Exactly 365 days (ST), 366 days (LT), leap years
- Error cases: Invalid dates, missing prices, zero quantities
- Integration: Multiple lots, mixed ST/LT holdings, ESPP disqualifying dispositions

**COMPLIANCE**: ✅ Comprehensive test coverage planned for all critical paths.

---

#### Component Architecture ✅
**Verified in plan.md structure**:
- New components follow shadcn/ui patterns (Radix primitives + Tailwind)
- Client Components marked with `'use client'` directive (forms, interactive tabs)
- Server Components for page layouts (Next.js App Router default)
- Zustand store for tax settings (follows existing pattern in `src/lib/stores/`)

**File Organization**:
- Services in `src/lib/services/` (pure logic, no React dependencies)
- Forms in `src/components/forms/` (Client Components)
- Settings panels in `src/components/settings/` (Client Components)
- Types in `src/types/` (shared across client/server)

**COMPLIANCE**: ✅ Follows established architecture patterns.

---

### Final Compliance Summary

| Principle | Initial | Post-Design | Status |
|-----------|---------|-------------|--------|
| Privacy-First | ✅ | ✅ | **PASSED** |
| Financial Precision | ✅ | ✅ | **PASSED** |
| Type Safety | ✅ | ✅ | **PASSED** |
| Test-Driven Quality | ✅ | ✅ | **PASSED** |
| Component Architecture | ✅ | ✅ | **PASSED** |

**GATE STATUS**: ✅ **APPROVED TO PROCEED TO PHASE 2 (TASKS)**

No constitution violations detected. All design decisions align with project principles.

---

## Project Structure

### Documentation (this feature)

```text
specs/012-tax-features-stock/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command) ✅ COMPLETE
├── data-model.md        # Phase 1 output (/speckit.plan command) ✅ COMPLETE
├── quickstart.md        # Phase 1 output (/speckit.plan command) ✅ COMPLETE
├── contracts/           # Phase 1 output (/speckit.plan command) ✅ COMPLETE
│   ├── holding-period-calculator.md
│   ├── tax-estimator.md
│   └── espp-validator.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── types/
│   ├── transaction.ts       # Extended with 'espp_purchase' | 'rsu_vest'
│   ├── asset.ts            # Extended TaxLot interface
│   └── tax.ts              # NEW: TaxSettings, TaxAnalysis, DisqualifyingDisposition
├── lib/
│   ├── db/
│   │   └── schema.ts       # Extended with tax lot fields, tax settings table
│   ├── stores/
│   │   └── tax-settings.ts # NEW: Zustand store for tax rates/methods
│   ├── services/
│   │   ├── tax-lot-manager.ts      # NEW: FIFO/LIFO/SpecificID lot selection
│   │   ├── holding-period.ts       # NEW: ST/LT classification logic
│   │   ├── tax-estimator.ts        # NEW: Unrealized gains tax calculation
│   │   └── espp-validator.ts       # NEW: Disqualifying disposition detection
│   └── utils/
│       └── date-calculations.ts    # NEW: Years between dates, holding period helpers
├── components/
│   ├── forms/
│   │   ├── espp-transaction-form.tsx   # NEW: ESPP purchase entry
│   │   └── rsu-transaction-form.tsx    # NEW: RSU vest entry
│   ├── holdings/
│   │   └── tax-analysis-tab.tsx        # NEW: ST/LT gains breakdown
│   └── settings/
│       └── tax-settings-panel.tsx      # NEW: Tax rate configuration
└── app/
    └── (dashboard)/
        └── settings/
            └── tax/
                └── page.tsx            # NEW: Tax settings page

tests/
├── unit/
│   ├── holding-period.test.ts          # NEW: Holding period logic
│   ├── tax-estimator.test.ts           # NEW: Tax calculation accuracy
│   ├── espp-validator.test.ts          # NEW: Disqualifying disposition rules
│   └── tax-lot-manager.test.ts         # NEW: FIFO/LIFO selection
└── e2e/
    ├── espp-workflow.spec.ts           # NEW: ESPP transaction entry
    ├── rsu-workflow.spec.ts            # NEW: RSU vest + withholding
    └── tax-analysis.spec.ts            # NEW: Tax liability view accuracy
```

**Structure Decision**: Single project structure with feature-organized modules. New tax-specific types in `src/types/tax.ts`, services in `src/lib/services/` following existing patterns (decimal.js precision, Dexie queries). Components use shadcn/ui primitives with Client Component directives for interactivity. Testing mirrors production structure with unit tests for business logic and E2E for user workflows.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. All requirements align with existing architecture patterns and constitutional principles.

---

## Phase 0-1 Completion Summary

**Phase 0: Research** ✅ COMPLETE
- 10 research areas documented in `research.md`
- All technical unknowns resolved (ESPP cost basis, RSU treatment, holding periods, FIFO selection, etc.)
- Best practices established for decimal.js, date handling, testing strategy

**Phase 1: Design & Contracts** ✅ COMPLETE
- Data model extended: 3 new entities, 2 extended entities, 0 new DB tables
- Service contracts defined: HoldingPeriodCalculator, TaxEstimator, ESPPValidator
- Developer quickstart guide created with examples and debugging tips
- Agent context updated in CLAUDE.md

**Ready for Phase 2**: `/speckit.tasks` command to generate implementation tasks
