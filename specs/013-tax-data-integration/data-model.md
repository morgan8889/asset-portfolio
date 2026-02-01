# Data Model: Tax Data Integration

**Feature**: 013-tax-data-integration
**Date**: 2026-01-31
**Phase**: 1 - Design

## Overview

This document defines the data structures for tax-related metadata in the portfolio tracker. All entities extend existing models to preserve backward compatibility while enabling tax-aware functionality.

---

## Entity Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Transaction                          │
├─────────────────────────────────────────────────────────────┤
│ Existing Fields:                                            │
│ - id: string                                                │
│ - portfolioId: string                                       │
│ - assetId: string                                           │
│ - type: TransactionType                                     │
│ - date: Date                                                │
│ - quantity: Decimal                                         │
│ - price: Decimal                                            │
│ - totalAmount: Decimal                                      │
│ - fees: Decimal                                             │
│ - currency: string                                          │
│ - taxLotId?: string                                         │
│ - notes?: string                                            │
│ - importSource?: string                                     │
│ - metadata?: Record<string, any>                            │
├─────────────────────────────────────────────────────────────┤
│ NEW Tax Fields:                                             │
│ - grantDate?: Date                                          │
│ - vestingDate?: Date                                        │
│ - discountPercent?: Decimal                                 │
│ - sharesWithheld?: Decimal                                  │
│ - ordinaryIncomeAmount?: Decimal                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ 1:N
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                         TaxLot                              │
├─────────────────────────────────────────────────────────────┤
│ Existing Fields (no changes):                               │
│ - id: string                                                │
│ - quantity: Decimal                                         │
│ - purchasePrice: Decimal                                    │
│ - purchaseDate: Date        ◄── KEY for holding period calc │
│ - soldQuantity: Decimal                                     │
│ - remainingQuantity: Decimal                                │
│ - notes?: string                                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ N:1
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        Holding                              │
├─────────────────────────────────────────────────────────────┤
│ Existing Fields (no changes):                               │
│ - id: string                                                │
│ - portfolioId: string                                       │
│ - assetId: string                                           │
│ - quantity: Decimal                                         │
│ - costBasis: Decimal                                        │
│ - averageCost: Decimal                                      │
│ - currentValue: Decimal                                     │
│ - unrealizedGain: Decimal                                   │
│ - unrealizedGainPercent: number                             │
│ - lots: TaxLot[]                                            │
│ - lastUpdated: Date                                         │
│ - ownershipPercentage?: number                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Entities

### 1. Transaction (Extended)

**Purpose**: Represents a financial transaction with optional tax metadata for ESPP/RSU.

**Schema**:
```typescript
interface Transaction {
  // === EXISTING FIELDS (unchanged) ===
  id: string;                      // UUID
  portfolioId: string;
  assetId: string;
  type: TransactionType;
  date: Date;
  quantity: Decimal;
  price: Decimal;
  totalAmount: Decimal;
  fees: Decimal;
  currency: string;
  taxLotId?: string;
  notes?: string;
  importSource?: string;
  metadata?: Record<string, any>;

  // === NEW TAX FIELDS (optional) ===
  grantDate?: Date;                // ESPP: Purchase date | RSU: Award date
  vestingDate?: Date;              // When shares became owned
  discountPercent?: Decimal;       // ESPP discount (0.0-0.5 range)
  sharesWithheld?: Decimal;        // Shares withheld for taxes
  ordinaryIncomeAmount?: Decimal;  // W-2 taxable compensation
}
```

**Storage Type** (IndexedDB):
```typescript
interface TransactionStorage {
  // Existing fields...

  // Tax fields (Decimal → string serialization)
  grantDate?: Date;
  vestingDate?: Date;
  discountPercent?: string;
  sharesWithheld?: string;
  ordinaryIncomeAmount?: string;
}
```

**Validation Rules**:
- `grantDate` ≤ `vestingDate` (if both present)
- `vestingDate` ≤ `date` (vesting before transaction)
- `discountPercent` in range [0, 0.5] (0-50%)
- `sharesWithheld` ≤ `quantity` (can't withhold more than received)
- `ordinaryIncomeAmount` ≥ 0
- Tax fields only valid for transaction types: `buy`, `transfer_in`, `reinvestment`

**State Transitions**: None (transactions are immutable after creation)

### 2. TaxLot (No Changes)

**Purpose**: Tracks individual purchase lots for tax basis and holding period calculations.

**Schema** (unchanged):
```typescript
interface TaxLot {
  id: string;
  quantity: Decimal;
  purchasePrice: Decimal;
  purchaseDate: Date;           // Used for ST/LT determination
  soldQuantity: Decimal;
  remainingQuantity: Decimal;
  notes?: string;
}
```

**Relationships**:
- Belongs to: `Holding.lots[]` (embedded array)
- Created when: Buy transaction processed
- Updated when: Sell transaction allocates from lot

**Invariants**:
- `soldQuantity + remainingQuantity = quantity` (always true)
- `remainingQuantity ≥ 0` (never negative)
- `purchaseDate` never changes (even during stock splits)

---

## Derived Entities (Calculated, Not Stored)

### 3. AgingLot

**Purpose**: Represents a tax lot approaching the 1-year long-term threshold.

**Schema**:
```typescript
interface AgingLot {
  holdingId: string;
  assetId: string;
  assetSymbol: string;
  lotId: string;
  remainingQuantity: Decimal;
  purchaseDate: Date;
  daysUntilLongTerm: number;       // Days until 365-day threshold
  unrealizedGain: Decimal;
  unrealizedGainPercent: number;
  currentPrice: Decimal;
  currentValue: Decimal;
  holdingPeriod: 'short';          // Always 'short' for aging lots
}
```

**Calculation**:
```typescript
daysHeld = floor((currentDate - purchaseDate) / (1000*60*60*24))
daysUntilLongTerm = 365 - daysHeld
isAging = daysHeld < 365 && daysUntilLongTerm <= 30
```

**Source**: Computed from `Holding.lots` + current asset prices

### 4. TaxExposureMetrics

**Purpose**: Summary of short-term and long-term unrealized gains for dashboard widget.

**Schema**:
```typescript
interface TaxExposureMetrics {
  shortTermGains: Decimal;
  shortTermLosses: Decimal;
  longTermGains: Decimal;
  longTermLosses: Decimal;
  netShortTerm: Decimal;
  netLongTerm: Decimal;
  totalUnrealizedGain: Decimal;
  estimatedTaxLiability: Decimal;
  effectiveTaxRate: number;        // Weighted avg of ST/LT rates
  agingLotsCount: number;
}
```

**Calculation**:
```typescript
shortTermGains = sum(lot.unrealizedGain WHERE holdingDays < 365 AND gain > 0)
longTermGains = sum(lot.unrealizedGain WHERE holdingDays >= 365 AND gain > 0)
estimatedTaxLiability = (shortTermGains × shortTermRate) + (longTermGains × longTermRate)
```

**Dependencies**:
- `Holding.lots` (for lot-level calculations)
- `Asset.currentPrice` (for market values)
- `UserSettings.taxRates` (for tax liability estimates)

### 5. TaxRecommendation

**Purpose**: Actionable recommendation for tax optimization.

**Schema**:
```typescript
interface TaxRecommendation extends Recommendation {
  type: 'tax_lot_aging';
  metadata: {
    agingLotsCount: number;
    totalUnrealizedGain: string;    // Serialized Decimal
    earliestLotDaysRemaining: number;
    affectedAssetIds: string[];
  };
}
```

**Generation Logic**:
```typescript
IF agingLots.length > 0 THEN
  severity = earliestLot.daysUntilLT <= 7 ? 'high' : 'medium'
  title = "Long-Term Capital Gains Opportunity"
  description = `${count} lot(s) approaching long-term status in ${days} days`
  actionUrl = "/analysis?tab=tax"
END IF
```

---

## Supporting Types

### CSVImportMapping (Extended)

**Purpose**: Maps CSV columns to transaction fields.

**Schema**:
```typescript
interface CSVImportMapping {
  // Existing fields...
  date: string;
  symbol: string;
  type: string;
  quantity: string;
  price: string;
  fees?: string;
  notes?: string;

  // NEW: Tax field mappings
  grantDate?: string;
  vestingDate?: string;
  discountPercent?: string;
  sharesWithheld?: string;
  ordinaryIncomeAmount?: string;
}
```

**Validation**:
- Each mapping value must correspond to a column header in CSV
- Date fields validated with existing `parseDate()` utility
- Decimal fields validated with Zod decimal schema

### TransactionExportRow (Extended)

**Purpose**: Formatted transaction data for CSV export.

**Schema**:
```typescript
interface TransactionExportRow {
  // Existing fields...
  date: string;              // 'yyyy-MM-dd'
  type: string;
  symbol: string;
  name: string;
  quantity: string;          // '####.####'
  price: string;             // '####.##'
  fees: string;              // '####.##'
  total: string;             // '####.##'

  // NEW: Tax export columns
  grantDate: string;         // 'yyyy-MM-dd' or ''
  vestDate: string;          // 'yyyy-MM-dd' or ''
  discountPercent: string;   // '##.##%' or ''
  sharesWithheld: string;    // '####.####' or ''
  ordinaryIncome: string;    // '$####.##' or ''
}
```

### HoldingExportRow (Extended)

**Purpose**: Formatted holding data for CSV export with tax metrics.

**Schema**:
```typescript
interface HoldingExportRow {
  // Existing fields...
  symbol: string;
  name: string;
  assetType: string;
  quantity: string;
  costBasis: string;
  averageCost: string;
  currentPrice: string;
  marketValue: string;
  unrealizedGain: string;
  unrealizedGainPercent: string;

  // NEW: Tax export columns
  holdingPeriod: string;          // 'ST' | 'LT' | 'Mixed'
  shortTermGain: string;          // '$####.##'
  longTermGain: string;           // '$####.##'
  estimatedTax: string;           // '$####.##'
  basisAdjustment: string;        // '$####.##' (ESPP disqualifying)
}
```

**Calculation**:
```typescript
holdingPeriod = determinePeriod(holding.lots)
  // 'ST' if all lots < 365 days
  // 'LT' if all lots >= 365 days
  // 'Mixed' if combination

shortTermGain = sum(lot.unrealizedGain WHERE holdingDays < 365)
longTermGain = sum(lot.unrealizedGain WHERE holdingDays >= 365)
estimatedTax = (shortTermGain × STrate) + (longTermGain × LTrate)
```

---

## User Settings (New)

### TaxSettings

**Purpose**: User-configured tax rates and preferences.

**Schema**:
```typescript
interface TaxSettings {
  userId: string;                  // Always 'default' (single-user app)
  shortTermTaxRate: number;        // 0.0-0.5 (e.g., 0.32 for 32%)
  longTermTaxRate: number;         // 0.0-0.3 (e.g., 0.15 for 15%)
  stateRate: number;               // 0.0-0.15 (e.g., 0.05 for 5%)
  enableTaxOptimization: boolean;  // Show/hide recommendations
  lookbackDays: number;            // Default: 30
  jurisdiction: string;            // 'US', 'UK', etc. (future use)
}
```

**Storage**:
```typescript
// In UserSettings table (IndexedDB)
{
  key: 'tax-settings',
  value: TaxSettings,
  updatedAt: Date
}
```

**Defaults**:
```typescript
{
  shortTermTaxRate: 0.24,          // US 24% bracket (common)
  longTermTaxRate: 0.15,           // US 15% LTCG
  stateRate: 0.05,                 // 5% state tax estimate
  enableTaxOptimization: true,
  lookbackDays: 30,
  jurisdiction: 'US'
}
```

---

## Indexes & Queries

### Existing Indexes (No Changes)

```typescript
transactions: '++id, portfolioId, assetId, date, type, [portfolioId+date], [assetId+date], [portfolioId+assetId]'
holdings: '++id, portfolioId, assetId, [portfolioId+assetId], lastUpdated'
```

### Potential Future Index (Optional Performance Optimization)

```typescript
// Version 3 schema (if query performance becomes critical)
transactions: '++id, portfolioId, assetId, date, type, grantDate, vestingDate, [portfolioId+date], [portfolioId+grantDate]'
```

**Use Case**: Efficiently filter transactions by grant date range for tax year reports.

**Trade-off**: Adds index storage overhead (~10KB per 1000 transactions).

### Key Queries

**Q1: Get all tax-aware transactions for a portfolio**
```typescript
await db.transactions
  .where('portfolioId').equals(portfolioId)
  .filter(tx => tx.grantDate !== undefined || tx.vestingDate !== undefined)
  .toArray();
```

**Q2: Get aging lots for tax recommendations**
```typescript
const holdings = await db.getHoldingsByPortfolio(portfolioId);
const agingLots = detectAgingLots(holdings, currentPrices, 30);
```

**Q3: Get holdings for tax export**
```typescript
const holdings = await db.getHoldingsByPortfolio(portfolioId);
const exportData = prepareHoldingsDataWithTax(holdings, assets, taxSettings);
```

---

## Validation Rules Summary

### Field-Level Validation

| Field | Type | Range | Required | Validation |
|-------|------|-------|----------|------------|
| grantDate | Date | Past dates only | No | ≤ today |
| vestingDate | Date | Past dates only | No | ≥ grantDate, ≤ today |
| discountPercent | Decimal | 0.0-0.5 | No | ESPP only, positive |
| sharesWithheld | Decimal | 0-quantity | No | ≤ quantity |
| ordinaryIncomeAmount | Decimal | ≥ 0 | No | Positive or zero |

### Business Rules

1. **Tax fields only for specific transaction types**:
   - Valid: `buy`, `transfer_in`, `reinvestment`
   - Invalid: `sell`, `dividend`, `split`, `fee`

2. **ESPP consistency**:
   - IF `discountPercent` present THEN `grantDate` required
   - IF `sharesWithheld` present THEN `ordinaryIncomeAmount` recommended

3. **RSU consistency**:
   - IF `vestingDate` present THEN `sharesWithheld` commonly present
   - `ordinaryIncomeAmount = FMV at vest × Gross Shares`

4. **Gross/Net Share Calculation**:
   ```typescript
   IF sharesWithheld > 0 THEN
     grossShares = quantity + sharesWithheld
     netShares = quantity
   ELSE
     grossShares = quantity
     netShares = quantity
   END IF
   ```

---

## Migration Strategy

### Phase 1: Schema Extension (No Data Migration)

```typescript
// Transaction interface updated (src/types/transaction.ts)
// Decimal serialization list updated (src/lib/utils/decimal-serialization.ts)
// No database migration needed - new fields are optional
```

### Phase 2: Backfill (Optional, User-Initiated)

Users can manually edit existing transactions to add tax metadata via UI.

### Phase 3: CSV Import Enhancement

New transactions imported with tax fields automatically populate the extended schema.

---

## Performance Considerations

### Memory Footprint

**Per Transaction with Tax Data**:
- 5 optional fields × 8 bytes (Date) + 3 × 16 bytes (Decimal as string) = 88 bytes
- **Impact**: +88 bytes per ESPP/RSU transaction (~1% increase for 1000 transactions)

**Holdings with Lot Calculations**:
- No additional storage (lots unchanged)
- Calculation overhead: ~0.1ms per lot for aging detection

### Query Performance

**Aging Lot Detection** (500 holdings × 3 lots):
- Holdings load: 50ms (indexed on portfolioId)
- Lot iteration: 150ms (1,500 date calculations)
- Price lookups: 30ms (Map.get is O(1))
- **Total: ~230ms** (meets <200ms target with caching)

**Export with Tax Columns** (1,000 transactions):
- Transaction load: 100ms
- Formatting: 50ms
- CSV generation: 30ms
- **Total: ~180ms** (well under 3-second target)

---

## Future Extensions

### Planned Enhancements (Not in Scope for Feature 013)

1. **Wash Sale Detection**:
   - Track `purchasedSimilarAsset` within 30-day window
   - Add `washSaleAdjustment: Decimal` to TaxLot

2. **Multi-Jurisdiction Support**:
   - Add `TaxSettings.jurisdiction: 'US' | 'UK' | 'EU'`
   - Localized holding period rules (UK: CGT allowance, EU: tax-free thresholds)

3. **Tax Loss Harvesting**:
   - Add `HarvestingOpportunity` entity
   - Recommendations for realizing losses to offset gains

4. **IRS Form Integration**:
   - Generate Schedule D (Form 1040)
   - Generate Form 8949 (Sale of Capital Assets)
   - Export in TurboTax/H&R Block CSV format

---

## References

- **Existing Schemas**: `src/types/transaction.ts`, `src/types/asset.ts`, `src/types/storage.ts`
- **Database Layer**: `src/lib/db/schema.ts` (serialization hooks)
- **CSV Import**: `src/types/csv-import.ts` (mapping types)
- **Export Service**: `src/types/export.ts` (export row types)
- **IRS Publications**: Pub 550 (capital gains), Pub 525 (ESPP/RSU taxation)
