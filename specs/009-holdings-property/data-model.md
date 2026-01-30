# Data Model: Holdings & Property

## Entity Extensions

### Asset (Extended)
*Source: `src/types/asset.ts`*

| Field | Type | Description |
|-------|------|-------------|
| rentalInfo | RentalInfo (Optional) | Metadata for rental properties (see `contracts/holdings.ts` for interface definition) |
| valuationMethod | 'AUTO' \| 'MANUAL' | Price update mechanism (from Feature 008). Properties use 'MANUAL'. |

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

## Performance Validation

### SC-002 Measurement Approach
Holdings list render time (< 200ms) will be measured using:
1. **E2E Testing**: Playwright `page.evaluate(() => performance.now())` before/after navigation
2. **React DevTools Profiler**: Component render duration in development
3. **Real User Monitoring**: Browser Performance API `navigationTiming.loadEventEnd - navigationTiming.fetchStart`

Target: Time from route navigation to interactive table (virtualized, with 100 items) < 200ms on desktop Chrome.
