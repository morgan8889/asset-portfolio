<!--
SYNC IMPACT REPORT
==================
Version Change: N/A (initial) → 1.0.0
Bump Rationale: Initial ratification of project constitution

Modified Principles: N/A (initial creation)

Added Sections:
- I. Privacy-First Architecture (NON-NEGOTIABLE)
- II. Financial Precision
- III. Type Safety & Validation
- IV. Test-Driven Quality
- V. Component Architecture
- Technology Stack Constraints
- Development Workflow
- Governance

Removed Sections: N/A (initial creation)

Templates Verification:
- .specify/templates/plan-template.md ✅ Compatible (Constitution Check section generic)
- .specify/templates/spec-template.md ✅ Compatible (requirements/testing aligned)
- .specify/templates/tasks-template.md ✅ Compatible (TDD phases supported)

Follow-up TODOs: None
==================
-->

# Portfolio Tracker Constitution

## Core Principles

### I. Privacy-First Architecture (NON-NEGOTIABLE)

All user financial data MUST remain local to the user's browser. This principle is foundational
and cannot be compromised.

- All financial data MUST be stored in browser IndexedDB via Dexie.js
- No server-side database persistence of user portfolio data
- External market data APIs MUST be proxied through Next.js API routes to protect API keys
- Zero analytics, telemetry, or tracking of any kind
- Export functionality MAY include optional password-protected encryption
- User data MUST be completely deletable via browser IndexedDB clearing

**Rationale**: Financial data is highly sensitive. Users trust this application with their
complete financial picture. Privacy is not a feature—it is the foundation.

### II. Financial Precision

All monetary calculations MUST maintain mathematical precision appropriate for financial applications.

- All price, quantity, and monetary calculations MUST use `decimal.js`
- Native JavaScript floating-point arithmetic (`Number`) MUST NOT be used for money
- Display values MAY be rounded for presentation but calculations MUST preserve precision
- Currency conversions MUST maintain at least 8 decimal places of precision
- Tax calculations MUST follow jurisdiction-specific rounding rules

**Rationale**: Floating-point errors compound over time and across transactions. A $0.01 error
per transaction becomes significant across thousands of transactions.

### III. Type Safety & Validation

TypeScript strict mode and runtime validation provide defense-in-depth against data corruption.

- TypeScript strict mode MUST be enabled (`"strict": true` in tsconfig.json)
- All public function signatures MUST include explicit type annotations
- All external inputs (API responses, user input, CSV imports) MUST be validated with Zod schemas
- Type definitions MUST reside in `src/types/` for reusability
- Generic `any` type MUST NOT be used except in type guard implementations
- Assertions (`as Type`) SHOULD be avoided; prefer type narrowing with guards

**Rationale**: Type errors in financial applications can lead to incorrect calculations,
data corruption, or silent failures. Strict typing catches errors at compile time.

### IV. Test-Driven Quality

Testing ensures reliability for financial calculations and user workflows.

- Business logic in `src/lib/services/` MUST have unit tests via Vitest
- Critical user workflows MUST have E2E tests via Playwright
- Financial calculation functions MUST have edge case coverage (zero, negative, overflow)
- Coverage target: 70% for `src/lib/services/` and `src/lib/utils/`
- Tests MUST run and pass before merging to main branch
- Flaky tests MUST be fixed or quarantined, never ignored

**Rationale**: Users rely on this application for financial decisions. Incorrect calculations
or broken workflows erode trust and may cause real financial harm.

### V. Component Architecture

Consistent component patterns ensure maintainability and performance.

- shadcn/ui components MUST be used as the base UI primitive layer
- React Server Components MUST be the default for pages and layouts
- Client Components MUST use `'use client'` directive and SHOULD be minimized
- Interactive components (forms, charts, modals) MAY be Client Components
- State management MUST use Zustand stores in `src/lib/stores/`
- Large lists MUST implement virtual scrolling via react-window
- Chart components SHOULD use React.memo for performance

**Rationale**: Next.js App Router optimizes for Server Components. Unnecessary Client Components
increase bundle size and reduce performance. Consistent patterns reduce cognitive load.

## Technology Stack Constraints

The following technology choices are binding for this project:

| Category | Technology | Version/Notes |
|----------|------------|---------------|
| Framework | Next.js | 14.x with App Router |
| Language | TypeScript | Strict mode required |
| Styling | Tailwind CSS | With shadcn/ui components |
| State | Zustand | Stores in src/lib/stores/ |
| Local DB | Dexie.js | IndexedDB wrapper |
| Charts | Recharts + Tremor | Interactive visualizations |
| Forms | React Hook Form + Zod | Validation required |
| Math | decimal.js | All financial calculations |
| Unit Tests | Vitest | With @testing-library/react |
| E2E Tests | Playwright | Critical user workflows |

Additions to this stack require documented justification and constitution amendment.

## Development Workflow

All contributors MUST follow these workflow requirements:

**Before Starting Work**:
- Verify feature aligns with Privacy-First principle
- Check if financial calculations are involved (requires decimal.js)
- Identify test requirements (unit for services, E2E for workflows)

**During Development**:
- Run `npm run type-check` frequently during development
- Run `npm run lint` before committing
- Write tests for new services and utilities
- Use path aliases (`@/lib/`, `@/components/`, `@/types/`)

**Before Merging**:
- All tests MUST pass: `npm run test`
- Type checking MUST pass: `npm run type-check`
- Linting MUST pass: `npm run lint`
- E2E tests SHOULD pass for affected workflows: `npm run test:e2e`

**Code Review Focus**:
- Privacy compliance (no data leakage to server)
- Financial precision (decimal.js usage)
- Type safety (no `any`, proper validation)
- Test coverage for new logic

## Governance

This constitution supersedes all other development practices for this project.

**Amendment Process**:
1. Proposed changes MUST be documented with rationale
2. Changes affecting NON-NEGOTIABLE principles require explicit owner approval
3. All amendments MUST update the version number following semantic versioning:
   - MAJOR: Principle removal or fundamental redefinition
   - MINOR: New principle or significant guidance expansion
   - PATCH: Clarifications, wording improvements, non-semantic changes
4. Dependent templates MUST be verified for consistency after amendments

**Compliance**:
- All pull requests MUST verify compliance with core principles
- Constitution violations MUST be resolved before merge
- Complexity beyond constitution guidance MUST be justified in PR description

**Guidance Reference**: See `CLAUDE.md` in repository root for runtime development guidance
and implementation patterns.

**Version**: 1.0.0 | **Ratified**: 2026-01-22 | **Last Amended**: 2026-01-22
