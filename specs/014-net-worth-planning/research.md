# Research: Net Worth History & FIRE Planning

## Technical Context
**Feature**: 014-net-worth-planning
**Goal**: Implement comprehensive net worth tracking and financial independence (FIRE) planning tools.

## Decisions

### 1. Data Model for Liabilities
**Decision**: Store liabilities in a new `liabilities` table in IndexedDB.
**Rationale**:
- **Separation**: Liabilities are distinct from Assets (Holdings). Mixing them would complicate the `Holdings` table logic and queries.
- **Simplicity**: Liabilities (mortgages, loans) have different attributes (interest rate, payment frequency) than investment assets.
- **Persistence**: Needs to be persisted alongside other financial data in Dexie.

### 2. Net Worth Calculation
**Decision**: Calculate historical net worth on-the-fly using `PerformanceSnapshot` (Assets) and `Liability` history.
**Rationale**:
- **Performance**: We already have daily asset snapshots. We can combine these with liability balances (which change less frequently) to derive net worth without storing a duplicate "Net Worth Snapshot" table.
- **Flexibility**: Allows restating history if a liability is added retroactively.

### 3. FIRE Projection Logic
**Decision**: Implement a client-side projection engine in `src/lib/services/planning/fire-projection.ts`.
**Rationale**:
- **Privacy**: All financial data stays local.
- **Responsiveness**: Instant updates when user tweaks variables (savings rate, return %).
- **Math**: Use `compound-interest` formula with inflation adjustment (Real Return = Nominal - Inflation).

### 4. Scenario Storage
**Decision**: Store scenarios as JSON in `userSettings`.
**Rationale**:
- **Lightweight**: Scenarios are just configuration objects (e.g., `{ name: "Market Crash", returnAdjustment: -0.2 }`).
- **No Relations**: They don't need complex joins or querying.

## Unknowns Resolved
- **Negative Values**: Charts (Recharts) support negative values natively.
- **Data Gaps**: Interpolation logic will be handled in the chart data transformation layer.
- **Storage**: New `liabilities` table + `userSettings` for goals/scenarios.

## Technology Stack
- **Database**: Dexie.js (`liabilities` table).
- **Visualization**: Recharts (Line/Area charts for projections).
- **Logic**: `decimal.js` for all currency math.
- **State**: Zustand (`planning-store`).