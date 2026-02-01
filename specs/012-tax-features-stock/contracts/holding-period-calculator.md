# Service Contract: HoldingPeriodCalculator

**Purpose**: Calculate holding periods for tax lots and classify them as Short-Term (≤ 1 year) or Long-Term (> 1 year) based on IRS rules.

**Location**: `src/lib/services/holding-period.ts`

---

## Public Interface

### calculateHoldingPeriod

Determines if a tax lot qualifies for long-term capital gains treatment.

**Signature**:
```typescript
function calculateHoldingPeriod(
  purchaseDate: Date,
  referenceDate: Date
): 'short' | 'long'
```

**Parameters**:
- `purchaseDate`: Date when the asset was acquired
- `referenceDate`: Date to calculate from (typically current date for unrealized gains, or sell date for realized gains)

**Returns**: `'short'` if held ≤ 1 year (≤ 365 days), `'long'` if held > 1 year (> 365 days)

**Examples**:
```typescript
// Purchase on Jan 1, 2024
const purchase = new Date('2024-01-01');

// Sell exactly 1 year later (365 days)
calculateHoldingPeriod(purchase, new Date('2024-12-31'));  // 'short'

// Sell 366 days later (day after 1 year anniversary)
calculateHoldingPeriod(purchase, new Date('2025-01-01'));  // 'long'

// Leap year edge case (2024 is a leap year)
const leapPurchase = new Date('2024-02-29');
calculateHoldingPeriod(leapPurchase, new Date('2025-02-28'));  // 'short' (364 days)
calculateHoldingPeriod(leapPurchase, new Date('2025-03-01'));  // 'long' (366 days)
```

**Edge Cases**:
- Same-day purchase and sale: Returns `'short'` (0 days held)
- Future reference date: Valid (for "what-if" analysis)
- `referenceDate < purchaseDate`: Throws `Error` (invalid input)

**Algorithm**:
```typescript
1. Calculate days = differenceInDays(referenceDate, purchaseDate)
2. If days <= 365: return 'short'
3. Else: return 'long'
```

---

### calculateHoldingDays

Returns the exact number of days an asset has been held.

**Signature**:
```typescript
function calculateHoldingDays(
  purchaseDate: Date,
  referenceDate: Date
): number
```

**Parameters**:
- `purchaseDate`: Date when the asset was acquired
- `referenceDate`: Date to calculate from

**Returns**: Integer number of days held (can be 0 for same-day)

**Examples**:
```typescript
calculateHoldingDays(new Date('2024-01-01'), new Date('2024-01-01'));  // 0
calculateHoldingDays(new Date('2024-01-01'), new Date('2024-01-02'));  // 1
calculateHoldingDays(new Date('2024-01-01'), new Date('2024-12-31'));  // 365
```

---

### getHoldingPeriodThreshold

Returns the date when a lot will transition from short-term to long-term.

**Signature**:
```typescript
function getHoldingPeriodThreshold(purchaseDate: Date): Date
```

**Parameters**:
- `purchaseDate`: Date when the asset was acquired

**Returns**: Date (inclusive) when lot becomes long-term (purchaseDate + 366 days)

**Examples**:
```typescript
const purchase = new Date('2024-01-01');
const threshold = getHoldingPeriodThreshold(purchase);
// threshold = 2025-01-02 (day after 1-year anniversary)

// Becomes long-term on this date:
calculateHoldingPeriod(purchase, threshold);  // 'long'

// Still short-term one day before:
const dayBefore = addDays(threshold, -1);
calculateHoldingPeriod(purchase, dayBefore);  // 'short'
```

---

## Dependencies

- **date-fns**: `differenceInDays`, `addDays`, `isAfter`, `isBefore`
- **No Dexie/DB access**: Pure calculation service

---

## Testing Requirements

### Unit Tests

**File**: `tests/unit/holding-period.test.ts`

**Test Cases**:
```typescript
describe('calculateHoldingPeriod', () => {
  test('same day is short-term', () => {
    const date = new Date('2024-01-01');
    expect(calculateHoldingPeriod(date, date)).toBe('short');
  });

  test('365 days (exactly 1 year) is short-term', () => {
    const purchase = new Date('2024-01-01');
    const sell = new Date('2024-12-31');  // 365 days later
    expect(calculateHoldingPeriod(purchase, sell)).toBe('short');
  });

  test('366 days (more than 1 year) is long-term', () => {
    const purchase = new Date('2024-01-01');
    const sell = new Date('2025-01-01');  // 366 days later (leap year)
    expect(calculateHoldingPeriod(purchase, sell)).toBe('long');
  });

  test('leap year Feb 29 edge case', () => {
    const purchase = new Date('2024-02-29');
    const shortSell = new Date('2025-02-28');  // 364 days
    const longSell = new Date('2025-03-01');   // 366 days

    expect(calculateHoldingPeriod(purchase, shortSell)).toBe('short');
    expect(calculateHoldingPeriod(purchase, longSell)).toBe('long');
  });

  test('throws error if reference date before purchase date', () => {
    const purchase = new Date('2024-01-01');
    const invalid = new Date('2023-12-31');

    expect(() => calculateHoldingPeriod(purchase, invalid))
      .toThrow('Reference date cannot be before purchase date');
  });
});

describe('calculateHoldingDays', () => {
  test('returns 0 for same day', () => {
    const date = new Date('2024-01-01');
    expect(calculateHoldingDays(date, date)).toBe(0);
  });

  test('returns 1 for next day', () => {
    expect(calculateHoldingDays(
      new Date('2024-01-01'),
      new Date('2024-01-02')
    )).toBe(1);
  });

  test('returns 365 for full year (non-leap)', () => {
    expect(calculateHoldingDays(
      new Date('2023-01-01'),
      new Date('2023-12-31')
    )).toBe(364);
  });

  test('returns 366 for full year (leap)', () => {
    expect(calculateHoldingDays(
      new Date('2024-01-01'),
      new Date('2024-12-31')
    )).toBe(365);  // 2024 is leap year
  });
});

describe('getHoldingPeriodThreshold', () => {
  test('returns date 366 days after purchase', () => {
    const purchase = new Date('2024-01-01');
    const threshold = getHoldingPeriodThreshold(purchase);

    expect(threshold).toEqual(new Date('2025-01-02'));
  });

  test('threshold date is first long-term day', () => {
    const purchase = new Date('2024-06-15');
    const threshold = getHoldingPeriodThreshold(purchase);

    expect(calculateHoldingPeriod(purchase, threshold)).toBe('long');

    const dayBefore = addDays(threshold, -1);
    expect(calculateHoldingPeriod(purchase, dayBefore)).toBe('short');
  });
});
```

**Coverage Target**: 100% (pure logic, no I/O)

---

## Error Handling

**Invalid Input Errors**:
- `referenceDate < purchaseDate`: Throw `Error` with message `"Reference date cannot be before purchase date"`
- Invalid Date objects: Throw `Error` with message `"Invalid date provided"`

**No Silent Failures**: All edge cases explicitly handled with clear error messages.

---

## Performance

**Expected Performance**:
- Single calculation: < 1ms
- Batch of 10,000 lots: < 100ms
- No caching needed (calculations are trivial)

**Optimization**: None needed. date-fns operations are already optimized.

---

## Usage Example

```typescript
import {
  calculateHoldingPeriod,
  calculateHoldingDays,
  getHoldingPeriodThreshold
} from '@/lib/services/holding-period';

// Example: Display holding status for a lot
function displayLotStatus(lot: TaxLot, currentPrice: Decimal) {
  const now = new Date();
  const period = calculateHoldingPeriod(lot.purchaseDate, now);
  const days = calculateHoldingDays(lot.purchaseDate, now);
  const threshold = getHoldingPeriodThreshold(lot.purchaseDate);

  console.log(`Lot #${lot.id}:`);
  console.log(`  Held for ${days} days`);
  console.log(`  Status: ${period === 'long' ? 'Long-Term' : 'Short-Term'}`);

  if (period === 'short') {
    const daysUntilLT = differenceInDays(threshold, now);
    console.log(`  Becomes long-term in ${daysUntilLT} days (on ${format(threshold, 'yyyy-MM-dd')})`);
  }
}
```

---

## Notes

- **Timezone Handling**: Uses local browser timezone (no UTC conversion) because tax holding periods are based on calendar dates, not timestamps.
- **IRS Reference**: IRS Publication 550, Section "Holding Period"
- **No Database State**: Pure calculation service with no side effects.
