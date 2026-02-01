# Quickstart Guide: Tax Features Development

**Feature**: 012-tax-features-stock
**Last Updated**: 2026-01-31

## Overview

This guide helps developers work with the ESPP/RSU tax features locally. It covers setup, common workflows, testing, and debugging.

---

## Prerequisites

- Node.js 18+ and npm 9+
- Repository cloned and dependencies installed: `npm install`
- Familiarity with Next.js 14 App Router, TypeScript, and IndexedDB

---

## Quick Start (5 Minutes)

### 1. Start Development Server

```bash
npm run dev
```

App runs at: http://localhost:3000

### 2. Enable Tax Features

The tax features are integrated into existing workflows. No feature flags needed.

### 3. Create Test Data

**Option A: Use Mock Data Generator** (recommended for development)
1. Navigate to http://localhost:3000/test
2. Click "Generate Mock Data"
3. Wait for redirect to dashboard
4. Portfolio will contain ESPP/RSU test lots

**Option B: Manual Entry**
1. Navigate to Holdings page
2. Click "Add Transaction"
3. Select "ESPP Purchase" or "RSU Vest" from type dropdown
4. Fill in required fields (see screenshots below)

### 4. View Tax Analysis

1. Navigate to Holdings page
2. Click on any holding with tax lots
3. Select "Tax Analysis" tab
4. View ST/LT breakdown, tax liability estimates

---

## Development Workflows

### Adding a New ESPP Transaction

```typescript
// Example: Programmatic creation for tests
import { db } from '@/lib/db/schema';
import { Decimal } from 'decimal.js';

async function createESPPTransaction() {
  const transaction = {
    id: uuid(),
    portfolioId: 'portfolio-123',
    assetId: 'asset-abc',
    type: 'espp_purchase' as const,
    date: new Date('2023-12-15'),
    quantity: new Decimal(100),
    price: new Decimal(85),        // Discounted price
    totalAmount: new Decimal(8500), // 100 × 85
    fees: new Decimal(0),
    currency: 'USD',
    metadata: {
      grantDate: '2023-06-01',
      purchaseDate: '2023-12-15',
      marketPriceAtGrant: '100',
      marketPriceAtPurchase: '100',
      discountPercent: 15,
      bargainElement: '15',        // 100 - 85
    },
  };

  await db.transactions.add(transaction);

  // This creates a TaxLot with lotType: 'espp'
  console.log('ESPP transaction created');
}
```

### Adding a New RSU Vest

```typescript
async function createRSUTransaction() {
  const grossShares = new Decimal(100);
  const sharesWithheld = new Decimal(22);  // Taxes
  const netShares = grossShares.minus(sharesWithheld);
  const vestingPrice = new Decimal(150);

  const transaction = {
    id: uuid(),
    portfolioId: 'portfolio-123',
    assetId: 'asset-abc',
    type: 'rsu_vest' as const,
    date: new Date('2024-03-15'),
    quantity: netShares,           // 78 shares
    price: vestingPrice,           // FMV at vesting
    totalAmount: netShares.mul(vestingPrice),
    fees: new Decimal(0),
    currency: 'USD',
    metadata: {
      vestingDate: '2024-03-15',
      grossSharesVested: '100',
      sharesWithheld: '22',
      netShares: '78',
      vestingPrice: '150',
      taxWithheldAmount: '3300',   // 22 × 150 (optional)
    },
  };

  await db.transactions.add(transaction);
  console.log('RSU vest transaction created');
}
```

### Calculating Tax Liability

```typescript
import { estimateTaxLiability } from '@/lib/services/tax-estimator';
import { useTaxSettingsStore } from '@/lib/stores/tax-settings';

async function calculateTaxes(portfolioId: string) {
  // Get holdings
  const holdings = await db.getHoldingsByPortfolio(portfolioId);

  // Get current prices
  const prices = new Map<string, Decimal>();
  for (const holding of holdings) {
    const asset = await db.assets.get(holding.assetId);
    if (asset?.currentPrice) {
      prices.set(holding.assetId, new Decimal(asset.currentPrice));
    }
  }

  // Get user's tax settings
  const taxSettings = useTaxSettingsStore.getState().taxSettings;

  // Calculate
  const analysis = estimateTaxLiability(holdings, prices, taxSettings);

  console.log('Tax Analysis:', {
    shortTermGains: analysis.shortTermGains.toFixed(2),
    longTermGains: analysis.longTermGains.toFixed(2),
    estimatedTax: analysis.totalEstimatedTax.toFixed(2),
  });

  return analysis;
}
```

### Checking for Disqualifying Dispositions

```typescript
import {
  isDisqualifyingDisposition,
  checkDispositionStatus,
  getTaxImplicationMessage
} from '@/lib/services/espp-validator';

function checkESPPSale(lot: TaxLot, sellDate: Date) {
  if (lot.lotType !== 'espp') {
    console.log('Not an ESPP lot');
    return;
  }

  const isDisqualifying = isDisqualifyingDisposition(
    lot.grantDate!,
    lot.purchaseDate,
    sellDate
  );

  if (isDisqualifying) {
    const check = checkDispositionStatus(
      lot.grantDate!,
      lot.purchaseDate,
      sellDate
    );

    const message = getTaxImplicationMessage(check, lot.bargainElement!);
    console.warn('⚠️ Disqualifying Disposition:', message);
  } else {
    console.log('✅ Qualifying disposition - favorable tax treatment');
  }
}
```

---

## Testing

### Run All Tests

```bash
# Unit tests (Vitest)
npm run test

# E2E tests (Playwright)
npm run test:e2e

# Both
npm run test:all
```

### Run Specific Tax Feature Tests

```bash
# Unit tests for tax services
npm run test -- --run src/lib/services/__tests__/holding-period.test.ts
npm run test -- --run src/lib/services/__tests__/tax-estimator.test.ts
npm run test -- --run src/lib/services/__tests__/espp-validator.test.ts

# E2E workflow tests
npx playwright test tests/e2e/espp-workflow.spec.ts
npx playwright test tests/e2e/rsu-workflow.spec.ts
npx playwright test tests/e2e/tax-analysis.spec.ts
```

### Watch Mode (for TDD)

```bash
npm run test:watch
# Then press 'p' to filter by filename pattern
# Type: holding-period
```

### Test Coverage

```bash
npm run test:coverage
# Open coverage/index.html in browser
```

---

## Debugging

### Inspect IndexedDB Data

**Chrome/Edge DevTools**:
1. F12 → Application tab → IndexedDB → PortfolioTrackerDB
2. Expand tables: `holdings`, `transactions`
3. View tax lot data in `holdings` table (embedded in `lots` array)

**Firefox DevTools**:
1. F12 → Storage tab → Indexed DB → PortfolioTrackerDB

**Programmatic Access** (in console):
```javascript
// Get all holdings
const holdings = await db.holdings.toArray();
console.log(holdings);

// Get all ESPP lots
const esppHoldings = holdings.filter(h =>
  h.lots.some(lot => lot.lotType === 'espp')
);
console.log(esppHoldings);

// Get tax settings
const taxSettings = await db.userSettings
  .where('key').equals('tax_rates')
  .first();
console.log(taxSettings);
```

### Debug Holding Period Calculation

```typescript
import { calculateHoldingPeriod, calculateHoldingDays } from '@/lib/services/holding-period';

const purchaseDate = new Date('2023-06-15');
const today = new Date();

const period = calculateHoldingPeriod(purchaseDate, today);
const days = calculateHoldingDays(purchaseDate, today);

console.log(`Held for ${days} days → ${period} term`);
// Output: "Held for 565 days → long term"
```

### Debug Tax Calculation

```typescript
import { estimateForHolding } from '@/lib/services/tax-estimator';

const holding = await db.getHoldingWithDecimals('holding-123');
const currentPrice = new Decimal(150);
const taxSettings = {
  shortTermRate: new Decimal(0.24),
  longTermRate: new Decimal(0.15),
  updatedAt: new Date(),
};

const analysis = estimateForHolding(holding, currentPrice, taxSettings);

console.log('Lot Details:');
analysis.lots.forEach(lot => {
  console.log(`  Lot ${lot.lotId}: ${lot.holdingPeriod} term, gain: $${lot.unrealizedGain}`);
});
```

### Common Issues

**Issue**: Tax analysis shows $0.00 for all metrics
- **Cause**: No current price set for assets
- **Fix**: Ensure assets have `currentPrice` field populated

**Issue**: ESPP transaction fails validation
- **Cause**: `grantDate >= purchaseDate`
- **Fix**: Grant date must be before purchase date

**Issue**: RSU vest creates wrong number of shares
- **Cause**: `netShares !== grossShares - sharesWithheld`
- **Fix**: Verify calculation in metadata

**Issue**: Holding period always shows "short"
- **Cause**: System date mocked incorrectly in tests
- **Fix**: Use `vi.setSystemTime(new Date('2025-01-31'))` in tests

---

## Configuration

### Tax Settings (User Preferences)

Default tax rates are set to typical US rates:
- Short-Term (ordinary income): 24%
- Long-Term (capital gains): 15%

**Update via UI**:
1. Navigate to Settings → Tax
2. Adjust sliders for ST/LT rates
3. Rates saved to IndexedDB immediately

**Update Programmatically**:
```typescript
import { useTaxSettingsStore } from '@/lib/stores/tax-settings';

const store = useTaxSettingsStore.getState();
store.setShortTermRate(0.32);  // 32%
store.setLongTermRate(0.20);   // 20%
```

### Decimal.js Precision

Configured in `src/lib/utils/decimal-serialization.ts`:
```typescript
Decimal.set({
  precision: 20,    // Sufficient for financial calculations
  rounding: 4,      // ROUND_HALF_UP
});
```

---

## File Structure Reference

```
src/
├── types/
│   ├── transaction.ts       # TransactionType + ESPP/RSU metadata
│   ├── asset.ts            # TaxLot interface
│   └── tax.ts              # TaxSettings, TaxAnalysis, DisqualifyingDisposition
├── lib/
│   ├── db/
│   │   └── schema.ts       # Dexie hooks, decimal serialization
│   ├── stores/
│   │   └── tax-settings.ts # Zustand store for tax rates
│   ├── services/
│   │   ├── holding-period.ts       # ST/LT classification
│   │   ├── tax-estimator.ts        # Tax liability calculations
│   │   └── espp-validator.ts       # Disqualifying disposition checks
│   └── utils/
│       └── decimal-serialization.ts # Decimal ↔ string conversion
├── components/
│   ├── forms/
│   │   ├── espp-transaction-form.tsx   # ESPP entry UI
│   │   └── rsu-transaction-form.tsx    # RSU vest UI
│   ├── holdings/
│   │   └── tax-analysis-tab.tsx        # Tax breakdown visualization
│   └── settings/
│       └── tax-settings-panel.tsx      # Tax rate configuration
└── app/
    └── (dashboard)/
        ├── holdings/
        │   └── [id]/
        │       └── page.tsx            # Holdings detail (includes tax tab)
        └── settings/
            └── tax/
                └── page.tsx            # Tax settings page

tests/
├── unit/
│   ├── holding-period.test.ts          # Holding period logic tests
│   ├── tax-estimator.test.ts           # Tax calculation tests
│   └── espp-validator.test.ts          # Disposition validation tests
└── e2e/
    ├── espp-workflow.spec.ts           # ESPP transaction E2E
    ├── rsu-workflow.spec.ts            # RSU vest E2E
    └── tax-analysis.spec.ts            # Tax analysis view E2E
```

---

## Tips & Best Practices

### Working with Decimal.js

```typescript
// ✅ DO: Always use Decimal methods
const total = price.mul(quantity);
const taxAmount = total.mul(taxRate);

// ❌ DON'T: Never use operators
const total = price * quantity;  // Wrong! Coerces to number
```

### Date Handling

```typescript
// ✅ DO: Use date-fns for calculations
import { differenceInDays, addYears } from 'date-fns';

const days = differenceInDays(sellDate, purchaseDate);
const threshold = addYears(purchaseDate, 1);

// ❌ DON'T: Manual date arithmetic
const days = (sellDate - purchaseDate) / (1000 * 60 * 60 * 24);  // Fragile
```

### Testing with Specific Dates

```typescript
// ✅ DO: Mock system time for consistent tests
beforeEach(() => {
  vi.setSystemTime(new Date('2025-01-31'));
});

afterEach(() => {
  vi.useRealTimers();
});

// Test runs as if it's 2025-01-31
const period = calculateHoldingPeriod(
  new Date('2023-01-01'),
  new Date()  // Uses mocked "now"
);
```

### Validation Best Practices

```typescript
// ✅ DO: Validate early with Zod schemas
import { ESPPTransactionSchema } from '@/types/transaction';

const result = ESPPTransactionSchema.safeParse(transactionData);
if (!result.success) {
  console.error('Validation failed:', result.error);
  return;
}

// ❌ DON'T: Skip validation and hope for the best
await db.transactions.add(transactionData);  // May fail in Dexie hooks
```

---

## Additional Resources

- **IRS Publication 550**: Capital Gains and Losses
- **IRS Section 423**: Employee Stock Purchase Plans
- **decimal.js Documentation**: https://mikemcl.github.io/decimal.js/
- **date-fns Documentation**: https://date-fns.org/
- **Dexie.js Guide**: https://dexie.org/docs/Tutorial/

---

## Getting Help

**Common Questions**:
1. Q: How do I add a new lot type?
   - A: Extend `TaxLot.lotType` union in `src/types/asset.ts`, update Zod schemas

2. Q: How do I change the holding period threshold (currently 1 year)?
   - A: Modify `calculateHoldingPeriod()` in `src/lib/services/holding-period.ts`

3. Q: Can I support tax-loss harvesting?
   - A: Yes, extend `TaxAnalysis` with loss-specific fields and create new service

**Troubleshooting**:
- Check browser console for Dexie errors
- Verify decimal.js is used for all financial calculations
- Ensure dates are Date objects (not strings) before passing to services
- Run `npm run type-check` to catch TypeScript errors early

---

## Next Steps

After completing development:
1. Run full test suite: `npm run test:all`
2. Verify type safety: `npm run type-check`
3. Check code quality: `npm run lint`
4. Generate coverage report: `npm run test:coverage`
5. Test manually in browser with mock data
6. Create PR with `/commit-push-pr` skill
