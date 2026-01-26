# Implementation Plan: Live Market Data for US and UK Markets

**Branch**: `005-live-market-data` | **Date**: 2026-01-25 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-live-market-data/spec.md`

## Summary

Extend the existing price fetching infrastructure to support live market data for both US and UK markets. The current system already supports US equities via Yahoo Finance and cryptocurrencies via CoinGecko. This feature adds:

1. UK market symbol recognition and pricing (LSE, AIM via Yahoo Finance .L suffix)
2. User-configurable price update intervals with automatic refresh
3. Market hours awareness with pre/regular/post/closed status indicators
4. Staleness detection based on 2x user's configured update interval
5. Enhanced price caching in IndexedDB for offline resilience

## Technical Context

**Language/Version**: TypeScript 5.3+ with Next.js 14.2 App Router
**Primary Dependencies**: React 18, Zustand 4.5, Dexie.js 3.2, decimal.js, date-fns
**Storage**: Browser IndexedDB via Dexie.js (userSettings table for preferences)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web browser (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (Next.js monolith)
**Performance Goals**: Price updates for 50 holdings within 10 seconds; dashboard load <3s with cached data
**Constraints**: Privacy-first (no server-side user data); rate limiting (10 req/min single, 5 req/min batch)
**Scale/Scope**: Up to 50 holdings per portfolio; 4 update frequency options

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy-First Architecture | ✅ PASS | All price preferences stored in IndexedDB; external APIs proxied through Next.js routes |
| II. Financial Precision | ✅ PASS | Prices use decimal.js; pence-to-pounds conversion preserves precision |
| III. Type Safety & Validation | ✅ PASS | Zod schemas for API responses; strict TypeScript types for Market, PriceUpdate |
| IV. Test-Driven Quality | ✅ PASS | Unit tests for market hours logic, staleness calculation; E2E for refresh workflows |
| V. Component Architecture | ✅ PASS | Server Components for static UI; Client Components for price polling; Zustand for price state |

**Gate Status**: ✅ PASSED - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/005-live-market-data/
├── plan.md              # This file
├── research.md          # Phase 0: Yahoo Finance UK support, market hours logic
├── data-model.md        # Phase 1: Market, UserPricePreferences entities
├── quickstart.md        # Phase 1: Developer onboarding guide
├── contracts/           # Phase 1: Price API response schemas
└── tasks.md             # Phase 2: Implementation tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   └── api/
│       └── prices/
│           └── [symbol]/
│               └── route.ts         # Extend for UK symbol handling
├── components/
│   ├── dashboard/
│   │   └── price-display.tsx        # NEW: Price with staleness indicator
│   └── settings/
│       └── price-settings.tsx       # NEW: Update frequency selector
├── lib/
│   ├── db/
│   │   └── schema.ts                # Extend userSettings for price preferences
│   ├── services/
│   │   ├── market-hours.ts          # NEW: Market state calculation
│   │   └── price-service.ts         # NEW: Orchestrates price updates
│   ├── stores/
│   │   └── price.ts                 # NEW: Price polling state management
│   └── utils/
│       ├── market-utils.ts          # NEW: UK symbol detection, pence conversion
│       └── staleness.ts             # NEW: Staleness threshold calculation
└── types/
    └── market.ts                    # NEW: Market, MarketState, PricePreferences types

tests/
├── unit/
│   ├── market-hours.test.ts
│   ├── market-utils.test.ts
│   └── staleness.test.ts
└── e2e/
    └── price-refresh.spec.ts
```

**Structure Decision**: Extends existing Next.js monolith structure. New services follow established patterns in `src/lib/services/`. Price state management via new Zustand store mirrors existing `asset.ts` store pattern.
