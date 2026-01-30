# Implementation Plan: Holdings Page with Property Support

**Branch**: `009-holdings-property` | **Date**: 2026-01-27 | **Spec**: [specs/009-holdings-property/spec.md](specs/009-holdings-property/spec.md)
**Input**: Feature specification from `/specs/009-holdings-property/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement full property asset support within the Holdings page. This includes extending the data model to support `rentalInfo` and `ownershipPercentage`, creating a specialized "Add Property" workflow, and enabling manual valuation updates. The Holdings table will be refactored to support polymorphic row displays (e.g. Yield for rentals vs. Gain/Loss for stocks).

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5+ (Next.js 14)  
**Primary Dependencies**: React 18, React Hook Form, Zod, Decimal.js, Dexie.js, react-window (virtualization)  
**Storage**: IndexedDB (`assets`, `holdings` tables extended)  
**Testing**: Vitest (Unit/Integration), Playwright (E2E for property add flow)  
**Target Platform**: Web (Next.js Client Components)
**Project Type**: Web Application  
**Performance Goals**: List render < 200ms, Immediate update on manual price change  
**Constraints**: Local-first architecture (no external property API), High precision math for Net Value  
**Scale/Scope**: Support 10-50 property assets efficiently within the holdings list
**Explicit Scope Exclusions** (from spec.md Edge Cases):
- Mortgage/liability tracking (gross asset value only; use Notes field for reference)
- Multi-currency properties (assume portfolio base currency; reuse existing multi-currency support if implemented)
- Fractional ownership platforms (supported via `ownershipPercentage` field, but no platform-specific integrations)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Privacy-First**: Property data remains local; no API calls for valuation.
- [x] **Financial Precision**: Ownership % and Net Value use `decimal.js`.
- [x] **Type Safety**: New `RentalInfo` and `PropertyFormData` interfaces defined.
- [x] **Component Architecture**: Reusing `HoldingsTable` logic but extending row components.

## Project Structure

### Documentation (this feature)

```text
specs/009-holdings-property/
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
├── app/(dashboard)/holdings/
│   └── page.tsx                 # Update: Add Property button integration
├── components/holdings/
│   ├── add-property-dialog.tsx  # New: Specialized form for Real Estate
│   ├── property-row.tsx         # New: Table row for property assets
│   ├── manual-price-update.tsx  # New: Modal for updating value
│   └── holdings-toolbar.tsx     # Update: Filter by Type dropdown
├── lib/services/
│   └── property-service.ts      # New: Logic for property CRUD & Yield
├── types/
    └── asset.ts                 # Update: Add RentalInfo & ownershipPercentage
```

**Structure Decision**: Option 1: Single project (DEFAULT)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Asset.currentPrice remains `number` (Constitution II requires Decimal) | Backwards compatibility with existing 102 usages across 18 files | Full migration to Decimal out of scope for this feature. Property service layer handles Decimal conversion at boundaries. Tracked as technical debt for future refactoring. |