# Service Contract: ESPPValidator

**Purpose**: Validate ESPP transactions and detect disqualifying dispositions based on IRS holding period requirements.

**Location**: `src/lib/services/espp-validator.ts`

---

## Public Interface

### isDisqualifyingDisposition

Determines if an ESPP stock sale violates IRS qualifying disposition rules.

**Signature**:
```typescript
function isDisqualifyingDisposition(
  grantDate: Date,
  purchaseDate: Date,
  sellDate: Date
): boolean
```

**Parameters**:
- `grantDate`: ESPP offering date (when the grant/option was given)
- `purchaseDate`: ESPP exercise/purchase date (when shares were bought)
- `sellDate`: Date when shares were sold

**Returns**: `true` if disposition is disqualifying, `false` if qualifying

**IRS Rules**:
A disposition is **qualifying** if BOTH conditions are met:
1. Shares held for at least **2 years from grant date**
2. Shares held for at least **1 year from purchase date**

If either condition fails, it's **disqualifying**.

**Examples**:
```typescript
const grant = new Date('2023-01-01');
const purchase = new Date('2023-07-01');

// Case 1: Sell before both requirements met
isDisqualifyingDisposition(grant, purchase, new Date('2024-06-30'));
// → true (< 1 year from purchase, < 2 years from grant)

// Case 2: Sell after 1 year from purchase, but before 2 years from grant
isDisqualifyingDisposition(grant, purchase, new Date('2024-12-31'));
// → true (meets purchase requirement, but < 2 years from grant)

// Case 3: Sell after both requirements met
isDisqualifyingDisposition(grant, purchase, new Date('2025-01-02'));
// → false (qualifying disposition)
```

**Edge Cases**:
- Sell on exact 1-year anniversary of purchase: Disqualifying (needs MORE than 1 year)
- Sell on exact 2-year anniversary of grant: Disqualifying (needs AT LEAST 2 years)
- Same-day sell: Disqualifying

---

### checkDispositionStatus

Returns detailed breakdown of disposition status with reasons.

**Signature**:
```typescript
function checkDispositionStatus(
  grantDate: Date,
  purchaseDate: Date,
  sellDate: Date
): DisqualifyingDispositionCheck
```

**Parameters**:
- `grantDate`: ESPP offering date
- `purchaseDate`: ESPP exercise/purchase date
- `sellDate`: Date when shares were sold

**Returns**: `DisqualifyingDispositionCheck` object with full analysis

**Example**:
```typescript
const grant = new Date('2023-06-01');
const purchase = new Date('2023-12-01');
const sell = new Date('2024-12-15');

const check = checkDispositionStatus(grant, purchase, sell);
console.log(check);
// {
//   grantDate: 2023-06-01,
//   purchaseDate: 2023-12-01,
//   sellDate: 2024-12-15,
//   twoYearsFromGrant: 2025-06-01,
//   oneYearFromPurchase: 2024-12-01,
//   meetsGrantRequirement: false,    // 2024-12-15 < 2025-06-01
//   meetsPurchaseRequirement: true,  // 2024-12-15 >= 2024-12-01
//   isQualifying: false
// }
```

---

### getDispositionReason

Returns human-readable reason for disqualifying status.

**Signature**:
```typescript
function getDispositionReason(
  check: DisqualifyingDispositionCheck
): DisqualifyingReason
```

**Parameters**:
- `check`: Result from `checkDispositionStatus()`

**Returns**: Enum describing why disposition is disqualifying (or `'qualifying'` if it meets requirements)

**Possible Values**:
```typescript
type DisqualifyingReason =
  | 'sold_before_2yr_from_grant'      // Only grant requirement failed
  | 'sold_before_1yr_from_purchase'   // Only purchase requirement failed
  | 'both_requirements_not_met'       // Both failed
  | 'qualifying';                     // Both met
```

**Example**:
```typescript
const check = checkDispositionStatus(grant, purchase, sell);
const reason = getDispositionReason(check);

switch (reason) {
  case 'sold_before_2yr_from_grant':
    console.warn('Sold before 2-year grant requirement');
    break;
  case 'sold_before_1yr_from_purchase':
    console.warn('Sold before 1-year purchase requirement');
    break;
  case 'both_requirements_not_met':
    console.error('Failed both holding requirements');
    break;
  case 'qualifying':
    console.info('Qualifying disposition');
    break;
}
```

---

### getTaxImplicationMessage

Returns user-friendly explanation of tax implications.

**Signature**:
```typescript
function getTaxImplicationMessage(
  check: DisqualifyingDispositionCheck,
  bargainElement: Decimal
): string
```

**Parameters**:
- `check`: Result from `checkDispositionStatus()`
- `bargainElement`: Discount amount (market price - purchase price at time of ESPP purchase)

**Returns**: String explaining tax treatment

**Examples**:
```typescript
const check = checkDispositionStatus(grant, purchase, sell);
const bargainElement = new Decimal(15);

const message = getTaxImplicationMessage(check, bargainElement);
console.log(message);
// "Disqualifying Disposition: The $15.00 bargain element will be taxed as
//  ordinary income. You must hold shares for at least 2 years from grant
//  date (2023-06-01) and 1 year from purchase date (2023-12-01).
//  This sale occurred on 2024-12-15, which is before the 2-year grant
//  requirement (2025-06-01)."

// For qualifying disposition:
// "Qualifying Disposition: Favorable tax treatment applies. The bargain
//  element is taxed as long-term capital gains, not ordinary income."
```

---

## Dependencies

- **date-fns**: `addYears`, `isAfter`, `isBefore`, `differenceInDays`
- **decimal.js**: For bargain element formatting
- **Types**: `DisqualifyingDispositionCheck`, `DisqualifyingReason`

---

## Return Type Details

### DisqualifyingDispositionCheck

```typescript
interface DisqualifyingDispositionCheck {
  grantDate: Date;
  purchaseDate: Date;
  sellDate: Date;
  twoYearsFromGrant: Date;            // grantDate + 2 years
  oneYearFromPurchase: Date;          // purchaseDate + 1 year
  meetsGrantRequirement: boolean;     // sellDate >= twoYearsFromGrant
  meetsPurchaseRequirement: boolean;  // sellDate >= oneYearFromPurchase
  isQualifying: boolean;              // Both requirements met
}
```

---

## Testing Requirements

### Unit Tests

**File**: `tests/unit/espp-validator.test.ts`

**Test Cases**:
```typescript
describe('isDisqualifyingDisposition', () => {
  const grant = new Date('2023-01-01');
  const purchase = new Date('2023-07-01');

  test('same-day sale is disqualifying', () => {
    expect(isDisqualifyingDisposition(grant, purchase, purchase)).toBe(true);
  });

  test('sale before 1 year from purchase is disqualifying', () => {
    const sell = new Date('2024-06-30');  // 364 days after purchase
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(true);
  });

  test('sale exactly 1 year from purchase is disqualifying', () => {
    const sell = new Date('2024-07-01');  // Exactly 1 year
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(true);
  });

  test('sale 1 day after 1 year from purchase, but before 2 years from grant', () => {
    const sell = new Date('2024-07-02');  // 366 days from purchase, but < 2 years from grant
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(true);
  });

  test('sale before 2 years from grant is disqualifying', () => {
    const sell = new Date('2024-12-31');  // > 1 year from purchase, but < 2 years from grant
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(true);
  });

  test('sale exactly 2 years from grant is disqualifying', () => {
    const sell = new Date('2025-01-01');  // Exactly 2 years
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(true);
  });

  test('sale after both requirements met is qualifying', () => {
    const sell = new Date('2025-01-02');  // > 2 years from grant, > 1 year from purchase
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(false);
  });

  test('throws error if grant date after purchase date', () => {
    const invalidGrant = new Date('2024-01-01');
    const invalidPurchase = new Date('2023-01-01');

    expect(() =>
      isDisqualifyingDisposition(invalidGrant, invalidPurchase, new Date('2025-01-01'))
    ).toThrow('Grant date must be before purchase date');
  });

  test('throws error if sell date before purchase date', () => {
    const invalidSell = new Date('2023-06-01');

    expect(() =>
      isDisqualifyingDisposition(grant, purchase, invalidSell)
    ).toThrow('Sell date cannot be before purchase date');
  });
});

describe('checkDispositionStatus', () => {
  test('returns correct threshold dates', () => {
    const grant = new Date('2023-06-15');
    const purchase = new Date('2023-12-15');
    const sell = new Date('2025-06-16');

    const check = checkDispositionStatus(grant, purchase, sell);

    expect(check.twoYearsFromGrant).toEqual(new Date('2025-06-15'));
    expect(check.oneYearFromPurchase).toEqual(new Date('2024-12-15'));
    expect(check.meetsGrantRequirement).toBe(true);
    expect(check.meetsPurchaseRequirement).toBe(true);
    expect(check.isQualifying).toBe(true);
  });

  test('identifies when only grant requirement fails', () => {
    const grant = new Date('2023-01-01');
    const purchase = new Date('2023-07-01');
    const sell = new Date('2024-12-31');  // > 1 year from purchase, < 2 years from grant

    const check = checkDispositionStatus(grant, purchase, sell);

    expect(check.meetsGrantRequirement).toBe(false);
    expect(check.meetsPurchaseRequirement).toBe(true);
    expect(check.isQualifying).toBe(false);
  });

  test('identifies when only purchase requirement fails', () => {
    const grant = new Date('2023-01-01');
    const purchase = new Date('2024-06-01');
    const sell = new Date('2025-02-01');  // > 2 years from grant, < 1 year from purchase

    const check = checkDispositionStatus(grant, purchase, sell);

    expect(check.meetsGrantRequirement).toBe(true);
    expect(check.meetsPurchaseRequirement).toBe(false);
    expect(check.isQualifying).toBe(false);
  });

  test('identifies when both requirements fail', () => {
    const grant = new Date('2023-01-01');
    const purchase = new Date('2023-07-01');
    const sell = new Date('2024-01-01');  // < 1 year from purchase, < 2 years from grant

    const check = checkDispositionStatus(grant, purchase, sell);

    expect(check.meetsGrantRequirement).toBe(false);
    expect(check.meetsPurchaseRequirement).toBe(false);
    expect(check.isQualifying).toBe(false);
  });
});

describe('getDispositionReason', () => {
  test('returns correct reason for each case', () => {
    const grant = new Date('2023-01-01');

    // Both fail
    let check = checkDispositionStatus(grant, new Date('2023-07-01'), new Date('2024-01-01'));
    expect(getDispositionReason(check)).toBe('both_requirements_not_met');

    // Only grant fails
    check = checkDispositionStatus(grant, new Date('2023-07-01'), new Date('2024-12-31'));
    expect(getDispositionReason(check)).toBe('sold_before_2yr_from_grant');

    // Only purchase fails
    check = checkDispositionStatus(grant, new Date('2024-06-01'), new Date('2025-02-01'));
    expect(getDispositionReason(check)).toBe('sold_before_1yr_from_purchase');

    // Qualifying
    check = checkDispositionStatus(grant, new Date('2023-07-01'), new Date('2025-07-02'));
    expect(getDispositionReason(check)).toBe('qualifying');
  });
});

describe('getTaxImplicationMessage', () => {
  test('generates correct message for disqualifying disposition', () => {
    const grant = new Date('2023-01-01');
    const purchase = new Date('2023-07-01');
    const sell = new Date('2024-12-31');
    const bargainElement = new Decimal(12.50);

    const check = checkDispositionStatus(grant, purchase, sell);
    const message = getTaxImplicationMessage(check, bargainElement);

    expect(message).toContain('Disqualifying Disposition');
    expect(message).toContain('$12.50');
    expect(message).toContain('ordinary income');
    expect(message).toContain('2 years from grant');
  });

  test('generates correct message for qualifying disposition', () => {
    const grant = new Date('2023-01-01');
    const purchase = new Date('2023-07-01');
    const sell = new Date('2025-07-02');
    const bargainElement = new Decimal(15.00);

    const check = checkDispositionStatus(grant, purchase, sell);
    const message = getTaxImplicationMessage(check, bargainElement);

    expect(message).toContain('Qualifying Disposition');
    expect(message).toContain('Favorable tax treatment');
    expect(message).toContain('long-term capital gains');
  });
});
```

**Coverage Target**: 100% (critical tax logic)

---

## Error Handling

**Invalid Inputs**:
- `grantDate > purchaseDate`: Throw `Error('Grant date must be before purchase date')`
- `sellDate < purchaseDate`: Throw `Error('Sell date cannot be before purchase date')`
- Invalid Date objects: Throw `Error('Invalid date provided')`

**No Silent Failures**: All invalid states result in explicit errors.

---

## Performance

**Expected Performance**:
- Single check: < 1ms
- Batch of 1,000 transactions: < 10ms
- No caching needed (date arithmetic is trivial)

---

## Usage Example

```typescript
import {
  isDisqualifyingDisposition,
  checkDispositionStatus,
  getTaxImplicationMessage
} from '@/lib/services/espp-validator';

// Example: Display warning badge for disqualifying ESPP sales
function TransactionRow({ transaction }: { transaction: Transaction }) {
  if (transaction.type !== 'sell') return null;

  // Get the associated tax lot (ESPP lot)
  const lot = findTaxLot(transaction.taxLotId);
  if (lot?.lotType !== 'espp') return null;

  const isDisqualifying = isDisqualifyingDisposition(
    lot.grantDate!,
    lot.purchaseDate,
    transaction.date
  );

  if (!isDisqualifying) return null;

  const check = checkDispositionStatus(
    lot.grantDate!,
    lot.purchaseDate,
    transaction.date
  );

  const message = getTaxImplicationMessage(check, lot.bargainElement!);

  return (
    <Badge variant="warning">
      <Tooltip content={message}>
        Disqualifying Disposition
      </Tooltip>
    </Badge>
  );
}
```

---

## Notes

- **IRS Reference**: IRC Section 423 (Employee Stock Purchase Plans)
- **No Database Access**: Pure validation logic with no side effects
- **Future Enhancement**: Suggest optimal sell date to achieve qualifying status
- **Tax Advice Disclaimer**: This is informational only, not tax advice
