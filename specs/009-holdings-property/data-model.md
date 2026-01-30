# Data Model: Holdings & Property

## Entity Extensions

### Asset (Extended)
*Source: `src/types/asset.ts`*

| Field | Type | Description |
|-------|------|-------------|
| rentalInfo | RentalInfo (Optional) | Metadata for rental properties |

```typescript
export interface RentalInfo {
  isRental: boolean;
  monthlyRent: Decimal;
  address?: string;
  notes?: string;
}
```

### Holding (Extended)
*Source: `src/types/asset.ts`*

| Field | Type | Description |
|-------|------|-------------|
| ownershipPercentage | number | Percentage of asset owned (0-100). Default 100. |

## Validation Rules

1. **Property Asset**:
   - Must have `type = 'real_estate'`.
   - `valuationMethod` must be `'MANUAL'`.
   - `quantity` on Holding is typically 1 (representing "1 property").
   - Net Value = `currentPrice * quantity * (ownershipPercentage / 100)`.

2. **Rental Info**:
   - `monthlyRent` must be non-negative.
   - If `isRental` is true, `monthlyRent` is recommended but optional (default 0).

3. **Ownership**:
   - `ownershipPercentage` must be > 0 and <= 100.

## API Contracts (Internal)

### `updateManualPrice(assetId: string, price: Decimal, date: Date)`
- Updates `Asset.currentPrice`.
- Creates a new `PriceHistory` entry.
- Triggers portfolio value recalculation.

### `addProperty(portfolioId: string, propertyData: PropertyFormData)`
- Creates `Asset` with manual valuation.
- Creates `Holding` with ownership percentage.
- Creates initial `Transaction` (Buy) for cost basis history.
