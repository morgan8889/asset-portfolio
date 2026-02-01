# Developer Quickstart: Tax Data Integration

**Feature**: 013-tax-data-integration
**Audience**: Developers implementing or extending tax functionality

## Overview

This guide provides a quick onboarding path for developers working with the tax data integration feature. It covers the essential concepts, code patterns, and common tasks.

---

## 5-Minute Quick Start

### 1. Understand the Data Model

**Tax data extends Transaction** with optional fields:
```typescript
interface Transaction {
  // ... existing fields ...

  // Tax metadata (all optional)
  grantDate?: Date;                // ESPP/RSU grant/award date
  vestingDate?: Date;              // RSU vesting date
  discountPercent?: Decimal;       // ESPP discount (0.0-0.5)
  sharesWithheld?: Decimal;        // Shares withheld for taxes
  ordinaryIncomeAmount?: Decimal;  // W-2 taxable income
}
```

**Tax lots track holding periods**:
```typescript
interface TaxLot {
  purchaseDate: Date;       // KEY: Used for ST/LT calculation
  remainingQuantity: Decimal;
  // ... other fields
}
```

**Holding period rule**:
```typescript
const daysHeld = (today - purchaseDate) / (1000*60*60*24);
const period = daysHeld >= 365 ? 'long' : 'short';
```

### 2. Key Services

| Service | Purpose | Location |
|---------|---------|----------|
| `tax-calculator.ts` | Tax lot aging, ST/LT calculations | `src/lib/services/` |
| `csv-importer.ts` | Import ESPP/RSU data from CSV | `src/lib/services/` |
| `export-service.ts` | Export with tax columns | `src/lib/services/` |
| `recommendation-engine.ts` | Tax optimization alerts | `src/lib/services/analysis/` |

### 3. Essential Patterns

**Always use Decimal.js for money**:
```typescript
import Decimal from 'decimal.js';

// ✓ Correct
const tax = new Decimal(gain).mul(taxRate);

// ✗ Wrong (floating-point errors)
const tax = gain * taxRate;
```

**Check for tax metadata**:
```typescript
function hasTaxData(tx: Transaction): boolean {
  return tx.grantDate !== undefined ||
         tx.vestingDate !== undefined;
}
```

**Calculate holding period**:
```typescript
function getHoldingPeriod(lot: TaxLot, currentDate = new Date()): 'short' | 'long' {
  const days = Math.floor(
    (currentDate.getTime() - lot.purchaseDate.getTime()) / (1000*60*60*24)
  );
  return days >= 365 ? 'long' : 'short';
}
```

---

## Common Tasks

### Task 1: Add Tax Fields to CSV Import

**Step 1**: Update column detector (`src/lib/services/column-detector.ts`)
```typescript
const grantDatePatterns = ['grant date', 'award date', 'purchase date'];
const vestingDatePatterns = ['vest date', 'vesting date', 'release date'];

// In detectColumnMappings function:
if (matchPattern(header, grantDatePatterns)) {
  mappings.grantDate = header;
}
```

**Step 2**: Add validation (`src/lib/services/csv-validator.ts`)
```typescript
if (row.grantDate) {
  const grantDate = parseDate(row.grantDate);
  if (!grantDate || grantDate > today) {
    errors.push('Grant date must be in the past');
  }
}
```

**Step 3**: Map to transaction (`src/lib/services/csv-importer.ts`)
```typescript
const transaction: Transaction = {
  // ... standard fields ...
  grantDate: parsed.grantDate,
  vestingDate: parsed.vestingDate,
  discountPercent: parsed.discountPercent,
  sharesWithheld: parsed.sharesWithheld,
  ordinaryIncomeAmount: parsed.ordinaryIncomeAmount,
};
```

### Task 2: Display Tax Data in UI

**Read transaction with tax metadata**:
```typescript
const transaction = await db.convertTransactionDecimals(txStorage);

if (transaction.grantDate) {
  console.log('Grant Date:', format(transaction.grantDate, 'yyyy-MM-dd'));
}

if (transaction.discountPercent) {
  console.log('Discount:', transaction.discountPercent.mul(100).toFixed(2) + '%');
}
```

**Show tax fields in transaction list**:
```typescript
export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const hasTaxData = transaction.grantDate !== undefined;

  return (
    <tr>
      <td>{format(transaction.date, 'yyyy-MM-dd')}</td>
      <td>{transaction.symbol}</td>
      {hasTaxData && (
        <td className="text-muted-foreground">
          Grant: {format(transaction.grantDate!, 'yyyy-MM-dd')}
        </td>
      )}
    </tr>
  );
}
```

### Task 3: Calculate Tax Exposure

**Service function**:
```typescript
// src/lib/services/tax-calculator.ts
export function calculateTaxExposure(
  holdings: Holding[],
  currentPrices: Map<string, Decimal>,
  taxSettings: TaxSettings
): TaxExposureMetrics {
  let shortTermGains = new Decimal(0);
  let longTermGains = new Decimal(0);

  for (const holding of holdings) {
    const price = currentPrices.get(holding.assetId);
    if (!price) continue;

    for (const lot of holding.lots) {
      if (lot.remainingQuantity.lte(0)) continue;

      const daysHeld = Math.floor(
        (Date.now() - lot.purchaseDate.getTime()) / (1000*60*60*24)
      );

      const currentValue = lot.remainingQuantity.mul(price);
      const costBasis = lot.remainingQuantity.mul(lot.purchasePrice);
      const gain = currentValue.minus(costBasis);

      if (daysHeld >= 365) {
        longTermGains = longTermGains.plus(gain.gt(0) ? gain : new Decimal(0));
      } else {
        shortTermGains = shortTermGains.plus(gain.gt(0) ? gain : new Decimal(0));
      }
    }
  }

  const estimatedTax = shortTermGains.mul(taxSettings.shortTermTaxRate)
    .plus(longTermGains.mul(taxSettings.longTermTaxRate));

  return {
    shortTermGains,
    longTermGains,
    estimatedTaxLiability: estimatedTax,
    // ... other metrics
  };
}
```

**Usage in component**:
```typescript
export function TaxExposureWidget() {
  const holdings = usePortfolioStore(state => state.holdings);
  const assets = usePortfolioStore(state => state.assets);
  const taxSettings = useTaxSettings();

  const taxExposure = useMemo(() => {
    const prices = new Map(assets.map(a => [a.id, a.currentPrice]));
    return calculateTaxExposure(holdings, prices, taxSettings);
  }, [holdings, assets, taxSettings]);

  return (
    <WidgetCard title="Tax Exposure">
      <div>ST Gains: {formatCurrency(taxExposure.shortTermGains)}</div>
      <div>LT Gains: {formatCurrency(taxExposure.longTermGains)}</div>
      <div>Est. Tax: {formatCurrency(taxExposure.estimatedTaxLiability)}</div>
    </WidgetCard>
  );
}
```

### Task 4: Detect Aging Lots

**Service function**:
```typescript
// src/lib/services/tax-lot-aging.ts
export function detectAgingLots(
  holdings: Holding[],
  currentPrices: Map<string, Decimal>,
  lookbackDays: number = 30,
  currentDate: Date = new Date()
): AgingLot[] {
  const agingLots: AgingLot[] = [];

  for (const holding of holdings) {
    const price = currentPrices.get(holding.assetId);
    if (!price) continue;

    for (const lot of holding.lots) {
      if (lot.remainingQuantity.lte(0)) continue;

      const daysHeld = Math.floor(
        (currentDate.getTime() - lot.purchaseDate.getTime()) / (1000*60*60*24)
      );
      const daysUntilLT = 365 - daysHeld;

      // Check if approaching long-term threshold
      if (daysHeld < 365 && daysUntilLT <= lookbackDays) {
        const currentValue = lot.remainingQuantity.mul(price);
        const costBasis = lot.remainingQuantity.mul(lot.purchasePrice);
        const unrealizedGain = currentValue.minus(costBasis);

        agingLots.push({
          holdingId: holding.id,
          assetId: holding.assetId,
          lotId: lot.id,
          remainingQuantity: lot.remainingQuantity,
          purchaseDate: lot.purchaseDate,
          daysUntilLongTerm: Math.ceil(daysUntilLT),
          unrealizedGain,
          currentValue,
          holdingPeriod: 'short',
        });
      }
    }
  }

  // Sort by urgency
  return agingLots.sort((a, b) => a.daysUntilLongTerm - b.daysUntilLongTerm);
}
```

### Task 5: Export with Tax Columns

**Extend prepareTransactionData** (`src/lib/services/export-service.ts`):
```typescript
async prepareTransactionData(
  portfolioId: string,
  dateRange: DateRangePreset
): Promise<TaxAwareTransactionExportRow[]> {
  const transactions = await db.getTransactionsByPortfolio(portfolioId);
  const assets = await db.assets.toArray();
  const assetMap = new Map(assets.map(a => [a.id, a]));

  return transactions.map(tx => ({
    // Standard columns
    date: format(tx.date, 'yyyy-MM-dd'),
    type: capitalize(tx.type),
    symbol: assetMap.get(tx.assetId)?.symbol || 'N/A',
    quantity: tx.quantity.toFixed(4),
    price: tx.price.toFixed(2),

    // Tax columns
    grantDate: tx.grantDate ? format(tx.grantDate, 'yyyy-MM-dd') : '',
    vestDate: tx.vestingDate ? format(tx.vestingDate, 'yyyy-MM-dd') : '',
    discountPercent: tx.discountPercent
      ? tx.discountPercent.mul(100).toFixed(2) + '%'
      : '',
    sharesWithheld: tx.sharesWithheld
      ? tx.sharesWithheld.toFixed(4)
      : '',
    ordinaryIncome: tx.ordinaryIncomeAmount
      ? '$' + tx.ordinaryIncomeAmount.toFixed(2)
      : '',
  }));
}
```

---

## Architecture Patterns

### Pattern 1: Pure Service Functions

Tax calculations should be pure functions (no side effects):

```typescript
// ✓ Good: Pure function
export function calculateTaxLiability(
  gain: Decimal,
  period: 'short' | 'long',
  rates: TaxSettings
): Decimal {
  const rate = period === 'short' ? rates.shortTermTaxRate : rates.longTermTaxRate;
  return gain.mul(rate);
}

// ✗ Bad: Side effects
export function calculateTaxLiability(gain: Decimal, period: 'short' | 'long'): Decimal {
  const settings = await db.userSettings.get('tax-settings');  // Side effect!
  // ...
}
```

### Pattern 2: Type-Safe Tax Metadata Access

Always check for tax fields before accessing:

```typescript
// ✓ Good: Type-safe with guard
function displayTaxInfo(tx: Transaction) {
  if (hasTaxMetadata(tx)) {
    return `Grant: ${tx.grantDate?.toISOString()}`;  // Safe
  }
  return 'No tax data';
}

// ✗ Bad: Assumes fields exist
function displayTaxInfo(tx: Transaction) {
  return `Grant: ${tx.grantDate.toISOString()}`;  // Runtime error!
}
```

### Pattern 3: Decimal Serialization

IndexedDB stores Decimal as strings; convert on read/write:

```typescript
// Write to DB (automatic via hooks)
const tx: Transaction = {
  discountPercent: new Decimal('0.15'),  // Decimal object
};
await db.transactions.add(transactionToStorage(tx));  // Converts to '0.15'

// Read from DB (manual conversion)
const txStorage = await db.transactions.get(id);
const tx = db.convertTransactionDecimals(txStorage);
console.log(tx.discountPercent instanceof Decimal);  // true
```

---

## Testing Guide

### Unit Test Example

```typescript
// src/lib/services/__tests__/tax-calculator.test.ts
import { describe, it, expect } from 'vitest';
import { detectAgingLots } from '../tax-lot-aging';
import Decimal from 'decimal.js';

describe('detectAgingLots', () => {
  it('detects lots 30 days before LT threshold', () => {
    const currentDate = new Date('2025-02-15');
    const purchaseDate = new Date('2024-02-16');  // 364 days ago

    const holdings = [{
      id: 'h1',
      assetId: 'a1',
      lots: [{
        id: 'lot1',
        purchaseDate,
        remainingQuantity: new Decimal('100'),
        purchasePrice: new Decimal('50'),
      }],
    }];

    const prices = new Map([['a1', new Decimal('60')]]);

    const agingLots = detectAgingLots(holdings, prices, 30, currentDate);

    expect(agingLots).toHaveLength(1);
    expect(agingLots[0].daysUntilLongTerm).toBe(1);
    expect(agingLots[0].unrealizedGain.toNumber()).toBe(1000);  // (60-50)*100
  });

  it('excludes lots already long-term', () => {
    const currentDate = new Date('2025-02-15');
    const purchaseDate = new Date('2024-01-01');  // 410 days ago

    const holdings = [{
      lots: [{ purchaseDate, remainingQuantity: new Decimal('100') }]
    }];

    const agingLots = detectAgingLots(holdings, new Map(), 30, currentDate);
    expect(agingLots).toHaveLength(0);  // Already LT
  });
});
```

### E2E Test Example

```typescript
// tests/e2e/tax-import.spec.ts
import { test, expect } from '@playwright/test';

test('import RSU transaction with withholding', async ({ page }) => {
  await page.goto('/holdings');
  await page.click('[data-testid="import-csv"]');

  // Upload CSV with RSU data
  await page.setInputFiles('input[type="file"]', 'fixtures/rsu-vest.csv');

  // Wait for preview
  await expect(page.locator('[data-testid="preview-table"]')).toBeVisible();

  // Verify tax columns detected
  await expect(page.locator('text=Vest Date')).toBeVisible();
  await expect(page.locator('text=Shares Withheld')).toBeVisible();

  // Complete import
  await page.click('button:has-text("Import")');
  await expect(page.locator('text=Import successful')).toBeVisible();

  // Verify transaction has tax data
  const row = page.locator('[data-testid="transaction-row"]').first();
  await expect(row.locator('text=Vest:')).toBeVisible();
});
```

---

## Performance Tips

### 1. Batch Holdings Retrieval

```typescript
// ✓ Good: Load all holdings once
const holdings = await db.getHoldingsByPortfolio(portfolioId);
const agingLots = detectAgingLots(holdings, prices);

// ✗ Bad: Multiple DB queries
for (const asset of assets) {
  const holding = await db.holdings.where({ assetId: asset.id }).first();
  // Process lot...
}
```

### 2. Memoize Expensive Calculations

```typescript
const taxExposure = useMemo(() => {
  return calculateTaxExposure(holdings, prices, taxSettings);
}, [holdings, prices, taxSettings]);  // Stable dependencies
```

### 3. Use Map for Price Lookups

```typescript
// ✓ Good: O(1) lookup
const priceMap = new Map(assets.map(a => [a.id, a.currentPrice]));
const price = priceMap.get(assetId);

// ✗ Bad: O(n) lookup
const asset = assets.find(a => a.id === assetId);
const price = asset?.currentPrice;
```

---

## Debugging Checklist

**Tax fields not appearing in CSV import?**
- [ ] Check `TAX_COLUMN_PATTERNS` includes your header variation
- [ ] Verify `detectColumnMappings` detects the field
- [ ] Check console for validation errors

**Decimal serialization errors?**
- [ ] Add field to `TRANSACTION_DECIMAL_FIELDS` array
- [ ] Use `transactionToStorage()` before DB write
- [ ] Use `db.convertTransactionDecimals()` after DB read

**Aging lots not detected?**
- [ ] Verify current prices available for assets
- [ ] Check `purchaseDate` is valid Date object
- [ ] Ensure `remainingQuantity > 0`
- [ ] Confirm `daysHeld < 365` and `daysUntilLT <= 30`

**Export missing tax columns?**
- [ ] Check `TaxAwareTransactionExportRow` interface updated
- [ ] Verify `prepareTransactionData` maps tax fields
- [ ] Ensure PapaParse includes all columns

---

## Reference Links

- **Data Model**: See `data-model.md` for complete schema
- **Type Contracts**: See `contracts/*.ts` for TypeScript definitions
- **Research**: See `research.md` for design decisions
- **Constitution**: See `.specify/memory/constitution.md` for constraints

## Next Steps

After completing this quickstart:
1. Read `data-model.md` for detailed entity relationships
2. Review `contracts/tax-metadata.ts` for type definitions
3. Run `npm run test -- tax` to verify tax tests pass
4. Explore existing services: `csv-importer.ts`, `export-service.ts`

---

**Need Help?**
- Check test files for usage examples: `src/lib/services/__tests__/*-tax*.test.ts`
- Review existing patterns: Holdings service uses same lot logic
- See Feature 006 (Performance Analytics) for time-weighted calculations
