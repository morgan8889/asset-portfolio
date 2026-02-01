# Data Model: Net Worth & FIRE

## Entities

### Liability
*Persisted in `liabilities` table.*

| Field | Type | Description |
|-------|------|-------------|
| id | string | UUID |
| name | string | e.g. "Home Mortgage" |
| balance | Decimal | Current outstanding amount |
| interestRate | number | Annual percentage (e.g. 0.045) |
| payment | Decimal | Monthly payment amount |
| startDate | Date | Origin date of loan |
| termMonths | number | Original term (optional) |

### FinancialGoal (FIRE Config)
*Persisted in `userSettings` (key: `fire_config`).*

```typescript
export interface FireConfig {
  annualExpenses: Decimal;
  withdrawalRate: number; // 0.04 default
  currentSavings: Decimal; // Monthly contribution
  expectedReturn: number; // 0.07 default (Real)
  inflationRate: number; // 0.03 default
  retirementAge?: number;
}
```

### Scenario
*Persisted in `userSettings` (key: `planning_scenarios`).*

```typescript
export interface Scenario {
  id: string;
  name: string;
  type: 'market_correction' | 'expense_increase' | 'income_change';
  value: number; // % drop, or $ amount
  durationMonths?: number;
  isActive: boolean;
}
```

## Validation Rules

1. **SWR**: Safe Withdrawal Rate must be between 0.01 and 0.10 (1-10%).
2. **Liabilities**: Balance must be non-negative (it's a debt magnitude).
3. **Projection**:
   - `FIRE Target = Annual Expenses / Withdrawal Rate`.
   - `Real Return = (1 + Nominal) / (1 + Inflation) - 1`.

## API Contracts (Internal)

### `calculateFireProjection(config: FireConfig, currentNetWorth: Decimal)`
- Returns: `ProjectionPoint[]` (Year, NetWorth, Target).

### `getNetWorthHistory(startDate: Date, endDate: Date)`
- Returns: `NetWorthPoint[]` (Date, Assets, Liabilities, Total).