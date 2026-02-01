# Research: Stock Tax Features (ESPP, RSU, Capital Gains)

**Feature**: 012-tax-features-stock
**Date**: 2026-01-31
**Status**: Complete

## Overview

This document consolidates research findings for implementing ESPP/RSU tracking and capital gains tax estimation in a privacy-first portfolio tracker using TypeScript, Next.js 14, and IndexedDB storage.

---

## R1: ESPP Tax Treatment & Cost Basis Calculation

### Decision
Use a **dual-basis tracking model** where:
1. **Initial Cost Basis** = Discounted purchase price (actual amount paid)
2. **Bargain Element** = Market price at purchase - Discounted purchase price (stored separately)
3. **Adjusted Cost Basis** = Initial Cost Basis + Bargain Element (calculated at sale time for reporting)

### Rationale
The IRS treats the bargain element (discount) of ESPP shares as compensation income in the year of sale if it's a disqualifying disposition, or in the year of purchase if it's a qualifying disposition. To avoid double-taxation, the adjusted cost basis must include the bargain element that was already taxed as income. Storing both values allows accurate gain/loss calculation and proper tax reporting.

**Example**:
- Grant Date Market Price: $100
- Purchase Date Market Price: $85 (lookback to lower price)
- Discount: 15%
- Actual Purchase Price: $85 × 0.85 = $72.25

Storage:
- `purchasePrice` (cost basis): $72.25
- `bargainElement`: $85 - $72.25 = $12.75
- Adjusted Cost Basis (at sale): $72.25 + $12.75 = $85

### Alternatives Considered
- **Store only adjusted basis**: Rejected because it loses visibility into actual cash paid vs. taxable compensation
- **Calculate bargain element on-demand**: Rejected because it requires storing market prices at grant/purchase dates, which may not be available later
- **Treat discount as immediate income**: Rejected because tax treatment depends on holding period (qualifying vs. disqualifying)

### Implementation Notes
- Extend `TaxLot` interface with `bargainElement?: Decimal` and `grantDate?: Date`
- Create `ESPPLot` type extending `TaxLot` with required ESPP fields
- Validation: `bargainElement` must be ≥ 0 and `grantDate` < `purchaseDate`

---

## R2: RSU Cost Basis & Tax Withholding

### Decision
**Fair Market Value (FMV) at vesting** is the cost basis for RSU shares. The system will:
1. Accept "Gross Shares Vested" and "Shares Withheld for Tax" as inputs
2. Calculate Net Shares = Gross - Withheld
3. Create a `buy` transaction for Net Shares with cost basis = FMV at vesting date
4. Store vesting metadata in `TaxLot` for reporting purposes

### Rationale
RSUs are taxed as ordinary income at vesting based on FMV. The employer withholds shares to cover income tax, FICA, etc. The employee receives the net shares with a cost basis equal to the value that was already taxed as income. This prevents double-taxation when the shares are later sold.

**Example**:
- Gross Shares Vested: 100
- Shares Withheld: 22 (for taxes)
- Net Shares Received: 78
- FMV at Vesting: $150

Result:
- Transaction: Buy 78 shares @ $150/share
- Cost Basis: 78 × $150 = $11,700
- Tax Lot: `vestingDate`, `vestingPrice = $150`

### Alternatives Considered
- **Store gross shares and mark withheld shares**: Rejected because the withheld shares are never owned by the user (they go directly to the government)
- **Create separate "RSU Vest" transaction type that doesn't affect holdings**: Rejected because it complicates portfolio value tracking
- **Allow users to enter net shares only**: Rejected because users need to see the full picture (gross vs. net) for record-keeping

### Implementation Notes
- Add transaction type: `'rsu_vest'`
- Extend `TaxLot` interface with `vestingDate?: Date` and `vestingPrice?: Decimal`
- Validation: `vestingPrice` must match `purchasePrice` for RSU lots
- Form logic: Auto-calculate net shares, show breakdown to user

---

## R3: Holding Period Classification (Short-Term vs. Long-Term)

### Decision
Use **exact date-based calculation** with **1-year threshold**:
- **Short-Term (ST)**: Holding period ≤ 1 year (≤ 365 days)
- **Long-Term (LT)**: Holding period > 1 year (> 365 days)

Calculate holding period as: `sellDate - purchaseDate` in days, then classify.

### Rationale
IRS Publication 550 defines long-term capital gains as assets held for "more than one year". The exact cutoff is the day after the one-year anniversary of the purchase date. Using precise date arithmetic ensures correct classification for tax reporting.

**Example**:
- Purchase: 2024-01-15
- Sell on 2025-01-15: ST (exactly 365 days = 1 year, not MORE than 1 year)
- Sell on 2025-01-16: LT (366 days > 1 year)

### Alternatives Considered
- **Use calendar year boundaries**: Rejected because it doesn't match IRS rules
- **Use >= 365 days for LT**: Rejected because IRS requires MORE than one year, not "one year or more"
- **Use months instead of days**: Rejected because it's less precise (leap years, varying month lengths)

### Implementation Notes
- Create utility function: `calculateHoldingPeriod(purchaseDate: Date, sellDate: Date): 'short' | 'long'`
- Use `date-fns` `differenceInDays` for calculation
- Edge case: Same-day trades (purchase and sell on same day) = 0 days = ST

---

## R4: FIFO Lot Selection for Tax Estimates

### Decision
Implement **FIFO (First-In-First-Out)** as the default lot selection method for unrealized gain tax liability estimates. The system will:
1. Sort tax lots by `purchaseDate` ascending (oldest first)
2. For each lot, calculate: `unrealizedGain = (currentPrice - purchasePrice) × remainingQuantity`
3. Classify each lot as ST or LT based on holding period from `purchaseDate` to current date
4. Sum ST gains and LT gains separately
5. Apply user-configured tax rates to estimate liability

### Rationale
FIFO is the most common default method for tax reporting and is intuitive (sell the oldest shares first). It provides a conservative estimate for tax liability since older shares are more likely to have LT treatment (lower tax rate). The IRS allows other methods (LIFO, Specific ID), but FIFO is the safest default assumption for estimation purposes.

### Alternatives Considered
- **Average Cost**: Rejected because it's only allowed for mutual funds, not individual stocks
- **LIFO (Last-In-First-Out)**: Considered but FIFO is more common and conservative
- **Specific ID**: Rejected as default because it requires user input for which lots to sell; can be added later as advanced feature
- **HIFO (Highest-In-First-Out)**: Rejected because it's a tax optimization strategy, not a default reporting method

### Implementation Notes
- Service: `tax-estimator.ts` with `estimateTaxLiability(holdings: Holding[], currentPrices: Map<string, Decimal>, taxRates: TaxRates): TaxEstimate`
- For each holding's lots: sort by `purchaseDate`, calculate unrealized gain, classify ST/LT
- Return: `{ shortTermGains, longTermGains, estimatedSTTax, estimatedLTTax, totalEstimatedTax }`

---

## R5: ESPP Disqualifying Disposition Rules

### Decision
Flag a disposition as **disqualifying** if the sale occurs before BOTH of these holding requirements are met:
1. **2 years from Grant Date** (the offering date)
2. **1 year from Purchase Date** (the actual purchase/exercise date)

Display a warning badge/indicator on sales that are disqualifying dispositions.

### Rationale
Per IRS rules (IRC Section 423), a qualifying disposition of ESPP shares requires holding the shares for at least 2 years from the grant date AND at least 1 year from the purchase date. If either requirement is not met, the disposition is disqualifying, and the bargain element is taxed as ordinary income (not capital gains). This is critical for accurate tax reporting.

**Example**:
- Grant Date: 2023-06-01
- Purchase Date: 2023-12-01
- Sell on 2024-12-02: **Disqualifying** (2 years from grant not met: 2024-12-02 < 2025-06-01)
- Sell on 2025-06-02: **Qualifying** (both requirements met)

### Alternatives Considered
- **Only check 1-year from purchase**: Rejected because IRS requires BOTH conditions
- **Use calendar years instead of exact dates**: Rejected because IRS uses exact date arithmetic
- **Auto-adjust tax treatment**: Rejected for MVP; flag the issue and let user handle reporting

### Implementation Notes
- Service: `espp-validator.ts` with `isDisqualifyingDisposition(grantDate: Date, purchaseDate: Date, sellDate: Date): boolean`
- Logic: `sellDate < addYears(grantDate, 2) OR sellDate < addYears(purchaseDate, 1)`
- UI: Show warning badge in transaction list and holdings detail for disqualifying sales
- Consider adding a "Tax Impact" column in reports showing "Ordinary Income" vs. "Capital Gains"

---

## R6: Tax Settings Storage & Validation

### Decision
Store user tax rate preferences in IndexedDB `userSettings` table with key-value structure:
```typescript
{
  key: 'tax_rates',
  value: {
    shortTermRate: 0.24,  // 24% (ordinary income rate)
    longTermRate: 0.15,   // 15% (capital gains rate)
    updatedAt: Date
  }
}
```

Validate tax rates: 0% ≤ rate ≤ 100% (stored as decimal: 0.00 - 1.00).

### Rationale
The existing `userSettings` table provides a flexible key-value store for preferences. Tax rates vary by jurisdiction and individual income level, so they must be user-configurable. Storing as decimal (0.24 for 24%) aligns with financial calculation patterns and simplifies arithmetic.

### Alternatives Considered
- **Create separate `taxSettings` table**: Rejected because `userSettings` already exists for this purpose
- **Hard-code US federal rates**: Rejected because users may be in different jurisdictions or tax brackets
- **Store as percentage integers (24)**: Rejected because decimal format is more standard for rate calculations
- **Auto-detect rates from user location**: Rejected for privacy reasons (no geolocation tracking)

### Implementation Notes
- Create Zod schema: `TaxRatesSchema` with `.min(0).max(1)` validation
- Zustand store: `useTaxSettingsStore` with `setRates`, `getRates` actions
- Default values: ST = 24% (typical US marginal rate), LT = 15% (typical US cap gains rate)
- Settings UI: Percentage inputs (display as 24%, store as 0.24)

---

## R7: Best Practices for decimal.js in Tax Calculations

### Decision
Follow these patterns for all tax calculations:
1. **Input validation**: Parse user input to Decimal early, validate before arithmetic
2. **Intermediate calculations**: Keep all intermediate values as Decimal (no conversion to number)
3. **Rounding only at display**: Use `.toFixed(2)` for currency display, but preserve full precision in storage
4. **Tax rate application**: `taxAmount = gain.mul(taxRate)` (both Decimals)
5. **Summation**: Use `.reduce((sum, val) => sum.plus(val), new Decimal(0))`

### Rationale
Tax calculations require precision to avoid cumulative rounding errors. The IRS expects calculations to the cent ($0.01), but intermediate calculations should maintain extra precision to avoid compounding errors across thousands of lots.

### Best Practices from decimal.js Documentation
- Always use Decimal arithmetic methods (`.plus`, `.minus`, `.mul`, `.div`)
- Never use `+`, `-`, `*`, `/` operators on Decimal objects (they coerce to number)
- Store precision config once: `Decimal.set({ precision: 20, rounding: 4 })` (ROUND_HALF_UP)
- Use `.toDP(2)` for final rounding in reports (rounds to 2 decimal places)

### Implementation Notes
- Create utility: `calculateTax(amount: Decimal, rate: Decimal): Decimal` that returns `amount.mul(rate).toDP(2)`
- Test edge cases: zero amounts, negative amounts (losses), very small amounts ($0.001)
- Consider adding `TaxCalculation` type with breakdown: `{ gain, rate, tax, netProceeds }`

---

## R8: Client-Side Date Handling for Holding Periods

### Decision
Use **date-fns** library (already in project) for all date calculations:
- `differenceInDays(sellDate, purchaseDate)` for holding period
- `addYears(date, years)` for ESPP disqualifying disposition checks
- `isAfter(dateA, dateB)` for date comparisons
- **Always work in user's local timezone** (no UTC conversion for dates)

### Rationale
Tax holding periods are based on calendar dates in the user's timezone, not UTC timestamps. Converting to/from UTC can cause off-by-one errors when dates cross midnight. The `date-fns` library provides reliable date arithmetic that respects the Date object's timezone.

**Example of UTC pitfall**:
- User in PST (UTC-8) enters purchase date: "2024-01-15"
- Browser creates Date: 2024-01-15T00:00:00-08:00
- If converted to UTC: 2024-01-15T08:00:00Z
- Displayed back to user: "2024-01-15" ✓ (correct)
- But if compared as UTC timestamps, could be off by a day in calculations

### Alternatives Considered
- **Use moment.js**: Rejected because it's deprecated and larger bundle size
- **Use native Date arithmetic**: Rejected because it's error-prone with leap years, DST
- **Use luxon**: Considered, but date-fns is simpler and already installed
- **Store dates as UTC**: Rejected because tax dates are calendar dates, not moments in time

### Implementation Notes
- Import date-fns functions as needed: `import { differenceInDays, addYears } from 'date-fns'`
- When parsing user input: use `parse(dateString, 'yyyy-MM-dd', new Date())` to ensure correct timezone
- When storing in IndexedDB: Dexie handles Date objects natively (stores as timestamps)
- When displaying: Use `format(date, 'yyyy-MM-dd')` for consistency

---

## R9: UI Patterns for Tax Analysis Visualization

### Decision
Create a dedicated **"Tax Analysis" tab** in the Holdings detail view with the following sections:
1. **Summary Cards** (Tremor Card components):
   - Unrealized ST Gains ($ amount + count of lots)
   - Unrealized LT Gains ($ amount + count of lots)
   - Estimated Tax Liability ($ amount breakdown)
2. **Tax Lot Table** (shadcn/ui Table):
   - Columns: Purchase Date, Quantity, Cost Basis, Current Value, Gain/Loss, Holding Period (ST/LT), Type (Standard/ESPP/RSU)
   - Sortable by date, gain/loss
   - Color coding: Green for LT, Yellow for ST
3. **Disposition Flag** (for ESPP):
   - Badge component showing "Disqualifying" with tooltip explanation

### Rationale
Separating tax analysis into its own tab keeps the main Holdings view clean while providing power users with detailed breakdowns. Using existing UI components (Tremor for metrics, shadcn/ui for tables) maintains consistency with the rest of the application.

### Alternatives Considered
- **Inline in Holdings table**: Rejected because it clutters the main view with too many columns
- **Separate page**: Rejected because users want to see tax info in context of a specific holding
- **Modal/popover**: Rejected because the information is complex and benefits from dedicated space
- **Charts/graphs**: Considered for future enhancement (pie chart of ST/LT distribution)

### Implementation Notes
- Component: `TaxAnalysisTab.tsx` as Client Component (interactive sorting/filtering)
- Use Recharts for optional visualization of ST/LT breakdown over time
- Responsive: Stack cards vertically on mobile, horizontal on desktop
- Loading state: Skeleton loaders while calculating (calculations should be <100ms but good UX)

---

## R10: Testing Strategy for Tax Calculations

### Decision
Implement **3 layers of testing**:
1. **Unit tests** (Vitest): Test pure calculation functions with known inputs/outputs
   - Holding period classification (boundary cases: 365 days, 366 days)
   - FIFO lot selection (verify order, partial lot handling)
   - Tax estimation (verify rate application, precision)
   - ESPP disqualifying disposition (boundary cases: exactly 1 year, exactly 2 years)
2. **Integration tests** (Vitest): Test service interactions with mock DB
   - Tax lot manager with multiple lots
   - Tax estimator with mixed ST/LT holdings
3. **E2E tests** (Playwright): Test user workflows
   - Enter ESPP transaction → Verify lot created with bargain element
   - Enter RSU vest → Verify net shares calculation
   - View tax analysis tab → Verify ST/LT breakdown displayed correctly

### Rationale
Tax calculations are mission-critical and must be accurate to the cent. Unit tests catch logic errors in calculations. Integration tests verify that services work together correctly. E2E tests ensure the full user workflow works as expected.

### Test Cases (Unit)
```typescript
// Holding period tests
test('365 days is short-term', () => {
  const result = calculateHoldingPeriod(
    new Date('2024-01-01'),
    new Date('2024-12-31') // 365 days later
  );
  expect(result).toBe('short');
});

test('366 days is long-term', () => {
  const result = calculateHoldingPeriod(
    new Date('2024-01-01'),
    new Date('2025-01-01') // 366 days later (leap year)
  );
  expect(result).toBe('long');
});

// ESPP disqualifying disposition tests
test('sale before 2 years from grant is disqualifying', () => {
  const result = isDisqualifyingDisposition(
    new Date('2023-01-01'), // grant
    new Date('2023-07-01'), // purchase
    new Date('2024-12-31')  // sell (< 2 years from grant)
  );
  expect(result).toBe(true);
});

// Tax estimation tests
test('calculates ST and LT gains correctly with FIFO', () => {
  const lots = [
    { purchaseDate: new Date('2023-01-01'), quantity: 10, purchasePrice: 100 },
    { purchaseDate: new Date('2024-01-01'), quantity: 5, purchasePrice: 110 },
  ];
  const currentPrice = 120;
  const result = estimateTaxLiability(lots, currentPrice, { st: 0.24, lt: 0.15 });
  expect(result.longTermGains).toBeCloseTo(200); // 10 × (120 - 100)
  expect(result.shortTermGains).toBeCloseTo(50); // 5 × (120 - 110)
});
```

### Implementation Notes
- Use `fake-indexeddb` for integration tests with DB interactions
- Create test data factories for consistent lot creation
- Mock current date for time-sensitive tests: `vi.setSystemTime(new Date('2025-01-01'))`
- Coverage target: 90%+ for tax calculation services

---

## Summary Table

| Research Area | Decision | Key Trade-off |
|---------------|----------|---------------|
| R1: ESPP Cost Basis | Dual-basis (initial + bargain element) | Complexity vs. accurate tax reporting |
| R2: RSU Treatment | FMV at vesting = cost basis | Simplicity vs. showing gross shares |
| R3: Holding Period | Date-based (> 365 days = LT) | Precision vs. simplicity |
| R4: Lot Selection | FIFO default | Conservative estimate vs. optimal tax |
| R5: ESPP Disposition | Flag disqualifying sales | User awareness vs. auto-adjustment |
| R6: Tax Settings | User-configured rates in IndexedDB | Flexibility vs. jurisdiction detection |
| R7: decimal.js | Full precision, round only at display | Accuracy vs. performance |
| R8: Date Handling | date-fns, local timezone | Correctness vs. UTC normalization |
| R9: UI Visualization | Dedicated tab with cards + table | Discoverability vs. clutter |
| R10: Testing | 3-layer (unit/integration/E2E) | Coverage vs. test maintenance |

---

## Next Steps

Phase 1 artifacts to generate:
1. **data-model.md**: Detailed schema for `TaxLot` extensions, new transaction types, `TaxSettings` entity
2. **contracts/**: Internal service contracts for `TaxEstimator`, `HoldingPeriodCalculator`, `ESPPValidator`
3. **quickstart.md**: Developer guide for working with tax features locally
4. **Update CLAUDE.md context**: Add tax features section with key patterns and gotchas
