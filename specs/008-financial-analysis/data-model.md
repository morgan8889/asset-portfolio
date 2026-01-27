# Data Model: Financial Analysis

## New Entities

### HealthMetric
*Represents a specific dimension of the portfolio health score.*
*Used in memory/UI, not persisted.*

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (e.g., 'diversification') |
| name | string | Display name (e.g., 'Diversification') |
| score | number | Score 0-100 |
| weight | number | Weight in overall score (0-1) |
| status | 'good' \| 'warning' \| 'critical' | Qualitative status |
| details | string | Explanation of the score |

### Recommendation
*An actionable insight derived from analysis.*
*Used in memory/UI, not persisted.*

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier |
| type | string | Rule ID (e.g., 'high_cash') |
| title | string | Short headline |
| description | string | Detailed explanation |
| severity | 'high' \| 'medium' \| 'low' | Importance level |
| action | string | Suggested action text |
| relatedAssetIds | string[] | Assets involved (optional) |

### TargetModel
*A desired asset allocation template.*
*Persisted in `userSettings` (key: 'target_models').*

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique ID |
| name | string | Model name (e.g., '60/40 Growth') |
| isSystem | boolean | True for built-in read-only models |
| allocations | Record<AssetType, number> | Target % for each asset type |

### Asset (Extension)
*Extending existing `Asset` entity in `src/types/asset.ts`.*

| Field | Type | Description |
|-------|------|-------------|
| region | string | 'US', 'International', 'Emerging', etc. |
| valuationMethod | 'LIVE' \| 'MANUAL' | Determines price update source |

## Validation Rules

1. **Target Allocation Sum**:
   - The sum of percentages in a `TargetModel` MUST equal 100%.
   - Calculations use `decimal.js` to avoid floating point errors.

2. **Health Score**:
   - Final score is `SUM(metric.score * metric.weight)`.
   - Sum of weights in a profile MUST equal 1.0.

3. **Manual Valuation**:
   - If `valuationMethod` is 'MANUAL', price updates via API polling MUST be skipped.
   - User input for manual price must be a non-negative number.

4. **Region**:
   - Must be one of the defined `Region` enum values (to be defined in types).
   - Defaults to 'US' if unknown.
