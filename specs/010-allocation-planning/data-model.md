# Data Model: Allocation Planning

## Entities

### TargetModel
*Persisted in `userSettings` under key `allocation_targets`.*

```typescript
export interface TargetModel {
  id: string;
  name: string;
  targets: Record<AllocationCategory, number>; // Category -> Percentage (0-100)
  lastUpdated: Date;
}

export type AllocationCategory = AssetType | string; // 'stock', 'bond', 'us_equity', etc.
```

### RebalancingExclusions
*Persisted in `userSettings` under key `rebalancing_exclusions`.*

```typescript
export interface RebalancingExclusions {
  portfolioIds: string[]; // IDs of portfolios/accounts to exclude
}
```

### RebalancingPlan (In-Memory)
*Generated result of drift analysis.*

```typescript
export interface RebalancingPlan {
  totalValue: string; // Decimal.js value serialized as string
  targetModelName: string;
  items: RebalancingItem[];
}

export interface RebalancingItem {
  category: string;
  currentValue: string; // Decimal.js value serialized as string
  currentPercent: number;
  targetPercent: number;
  driftPercent: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount: string; // Decimal.js value serialized as string
}
```

**Note**: All monetary values use string representation for serialization. At runtime, these are converted to/from `Decimal` instances using `decimal.js` for precise financial calculations.

## Validation Rules

1. **Target Sum**:
   - `SUM(targets.values())` must equal 100% (+/- 0.01% for rounding).

2. **Negative Values**:
   - Target percentages cannot be negative.
   - Input assets with negative value (margin) are netted against their category total (usually Cash).

3. **Rebalancing Logic**:
   - `Drift = Current% - Target%`.
   - `Amount = TotalValue * (Target% - Current%)`.
   - If `Amount > 0` -> BUY.
   - If `Amount < 0` -> SELL.
