# Research: Financial Analysis & Recommendations

## Technical Context
**Feature**: 008-financial-analysis
**Goal**: Implement comprehensive portfolio analysis including health scoring, multi-asset class breakdown, and actionable recommendations.

## Decisions

### 1. Data Model Extension for Asset Attributes
**Decision**: Extend the `Asset` entity in `src/types/asset.ts` and `src/lib/db/schema.ts` to include `region` and `valuationMethod`.
**Rationale**:
- **Region**: Essential for calculating international exposure (FR-006). Storing it directly on the asset allows for simple aggregation queries and manual overrides.
- **ValuationMethod**: Distinguishes between 'LIVE' (ticker-based) and 'MANUAL' (user-entered) assets like property, enabling correct price update logic.
**Alternatives Considered**:
- **Inference Only**: Inferring region at runtime from ticker suffixes (e.g., .L) is fragile and doesn't support manual correction or assets without tickers.
- **Separate Tables**: Creating a separate `AssetRegion` table adds unnecessary join complexity for a 1:1 attribute.

### 2. Portfolio Health Score Calculation
**Decision**: Implement scoring logic in a new `src/lib/services/analysis/scoring-service.ts`.
**Rationale**:
- **Isolation**: Scoring logic is complex (weighted factors, multiple dimensions) and should be isolated from general portfolio data fetching.
- **Transparency**: The service will return both the final score and the breakdown (component scores), supporting the requirement for transparency (FR-004).
- **Flexibility**: The service can accept a "Profile" configuration object to adjust weights dynamically (FR-003).

### 3. Target Model Storage
**Decision**: Store target models in `userSettings` table within `src/lib/db/schema.ts` as a JSON blob.
**Rationale**:
- **Simplicity**: Target models are essentially configuration (percentages per category). A full relational schema (TargetModel -> TargetAllocation) is overkill for personal finance app scale.
- **Portability**: JSON storage makes it easy to clone/modify models (FR-011) and sync/export settings.
- **IndexedDB**: `userSettings` is already established for app-wide preferences.

### 4. Recommendation Engine
**Decision**: Create a rule-based engine in `src/lib/services/analysis/recommendation-engine.ts`.
**Rationale**:
- **Deterministic**: Financial advice in a software tool must be predictable and traceable to specific data conditions (e.g., "Cash > 20%").
- **Extensible**: New rules (e.g., "Crypto > 5%") can be added as simple independent functions that return `Recommendation | null`.
- **Local Execution**: Runs entirely in the browser, respecting the privacy-first mandate (FR-013).

## Unknowns Resolved
- **Region Data**: Will be stored on `Asset` entity. Initial population will use ticker suffix heuristics (e.g., `.L` -> UK, `.TO` -> Canada), defaulting to 'US' for others, with UI for user correction.
- **Property Valuation**: Will use the `currentPrice` field in `Asset` but updated via a manual input UI instead of API polling. `valuationMethod = 'MANUAL'` will flag this behavior.
- **Data Persistence**: Leveraging existing `Dexie` infrastructure. No new top-level database stores needed beyond extending `Asset` and using `userSettings`.

## Technology Stack
- **Database**: Dexie.js (IndexedDB)
- **Math**: decimal.js (for all currency/percentage calculations)
- **State**: Zustand (for managing analysis page UI state)
- **Visualization**: Recharts (for health score radial bars and allocation pie charts)
