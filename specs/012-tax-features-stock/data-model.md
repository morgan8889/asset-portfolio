# Data Model: Stock Tax Features

**Feature**: 012-tax-features-stock
**Date**: 2026-01-31
**Status**: Complete

## Overview

This document defines the data model extensions and new entities required for ESPP/RSU tracking and capital gains tax estimation.

---

## Entity Definitions

### 1. TaxLot (Extended)

**Purpose**: Track individual purchase lots with tax-specific metadata for cost basis and holding period calculations.

**Location**: `src/types/asset.ts`

**Schema**:

```typescript
export interface TaxLot {
  // === Core Fields (Existing) ===
  id: string;                    // UUID
  quantity: Decimal;             // Total shares in lot
  purchasePrice: Decimal;        // Price per share (cost basis)
  purchaseDate: Date;            // Acquisition date
  soldQuantity: Decimal;         // Shares already sold from this lot
  remainingQuantity: Decimal;    // Calculated: quantity - soldQuantity
  notes?: string;                // User notes

  // === NEW: Tax-Specific Fields ===
  lotType?: 'standard' | 'espp' | 'rsu';  // Lot classification

  // ESPP-specific
  grantDate?: Date;              // Offering date (for ESPP disqualifying disposition check)
  bargainElement?: Decimal;      // Market price - purchase price (ESPP discount)

  // RSU-specific
  vestingDate?: Date;            // RSU vesting date (for reporting)
  vestingPrice?: Decimal;        // FMV at vesting (should match purchasePrice for RSUs)
}

// Storage type (for IndexedDB serialization)
export interface TaxLotStorage {
  id: string;
  quantity: string;              // Decimal serialized as string
  purchasePrice: string;
  purchaseDate: Date;
  soldQuantity: string;
  remainingQuantity: string;
  notes?: string;
  lotType?: 'standard' | 'espp' | 'rsu';
  grantDate?: Date;
  bargainElement?: string;       // Decimal serialized
  vestingDate?: Date;
  vestingPrice?: string;         // Decimal serialized
}
```

**Validation Rules**:
- `remainingQuantity` = `quantity - soldQuantity` (must be ≥ 0)
- `lotType` defaults to `'standard'` if not specified
- If `lotType === 'espp'`:
  - `grantDate` must be < `purchaseDate`
  - `bargainElement` must be ≥ 0
- If `lotType === 'rsu'`:
  - `vestingDate` must be defined
  - `vestingPrice` should equal `purchasePrice` (FMV at vesting)
- All Decimal fields must be ≥ 0

**Relationships**:
- Belongs to: `Holding` (via `Holding.lots` array)
- Created by: `Transaction` of type `buy`, `espp_purchase`, or `rsu_vest`
- Updated by: `Transaction` of type `sell` (updates `soldQuantity`)

---

### 2. Transaction (Extended)

**Purpose**: Add specialized transaction types for ESPP purchases and RSU vesting events.

**Location**: `src/types/transaction.ts`

**Schema Changes**:

```typescript
// Extend TransactionType union
export type TransactionType =
  | 'buy'
  | 'sell'
  | 'dividend'
  | 'interest'
  | 'split'
  | 'transfer_in'
  | 'transfer_out'
  | 'fee'
  | 'tax'
  | 'spinoff'
  | 'merger'
  | 'reinvestment'
  | 'espp_purchase'  // NEW
  | 'rsu_vest';      // NEW

// Transaction interface (no changes to structure, just new types supported)
export interface Transaction {
  id: string;
  portfolioId: string;
  assetId: string;
  type: TransactionType;
  date: Date;
  quantity: Decimal;             // For espp_purchase: shares purchased
                                 // For rsu_vest: NET shares (after withholding)
  price: Decimal;                // For espp_purchase: discounted purchase price
                                 // For rsu_vest: FMV at vesting
  totalAmount: Decimal;          // quantity × price
  fees: Decimal;
  currency: string;
  taxLotId?: string;
  notes?: string;
  importSource?: string;
  metadata?: Record<string, any>; // Store ESPP/RSU-specific data here
}

// ESPP Transaction Metadata (stored in metadata field)
export interface ESPPTransactionMetadata {
  grantDate: string;             // ISO date string
  purchaseDate: string;          // ISO date string (same as transaction.date)
  marketPriceAtGrant: string;    // Decimal as string
  marketPriceAtPurchase: string; // Decimal as string
  discountPercent: number;       // 0-100 (e.g., 15 for 15%)
  bargainElement: string;        // Decimal as string (calculated)
}

// RSU Transaction Metadata (stored in metadata field)
export interface RSUTransactionMetadata {
  vestingDate: string;           // ISO date string (same as transaction.date)
  grossSharesVested: string;     // Decimal as string
  sharesWithheld: string;        // Decimal as string (for taxes)
  netShares: string;             // Decimal as string (grossSharesVested - sharesWithheld)
  vestingPrice: string;          // Decimal as string (FMV at vesting)
  taxWithheldAmount?: string;    // Decimal as string (optional, for record-keeping)
}
```

**Validation Rules**:
- `espp_purchase` transactions:
  - `metadata.grantDate` < `metadata.purchaseDate`
  - `metadata.discountPercent` ≥ 0 and ≤ 100
  - `metadata.bargainElement` = `metadata.marketPriceAtPurchase` - `price`
  - `quantity` > 0
- `rsu_vest` transactions:
  - `metadata.grossSharesVested` > 0
  - `metadata.sharesWithheld` ≥ 0
  - `metadata.netShares` = `metadata.grossSharesVested` - `metadata.sharesWithheld`
  - `quantity` = `metadata.netShares`
  - `price` = `metadata.vestingPrice`

**State Transitions**:
1. User creates `espp_purchase` transaction → System creates `TaxLot` with `lotType: 'espp'`
2. User creates `rsu_vest` transaction → System creates `TaxLot` with `lotType: 'rsu'`
3. User creates `sell` transaction → System updates `soldQuantity` on relevant `TaxLot`(s) using FIFO

---

### 3. TaxSettings (New)

**Purpose**: Store user's tax rate preferences for capital gains liability estimation.

**Location**: `src/types/tax.ts` (new file)

**Schema**:

```typescript
export interface TaxSettings {
  shortTermRate: Decimal;        // Ordinary income tax rate (0.00 - 1.00, e.g., 0.24 for 24%)
  longTermRate: Decimal;         // Long-term capital gains rate (0.00 - 1.00, e.g., 0.15 for 15%)
  updatedAt: Date;               // Last update timestamp
}

// Storage format for IndexedDB userSettings table
export interface TaxSettingsStorage {
  id?: number;                   // Auto-increment primary key
  key: 'tax_rates';              // Fixed key for retrieval
  value: {
    shortTermRate: string;       // Decimal serialized as string
    longTermRate: string;        // Decimal serialized as string
    updatedAt: string;           // Date as ISO string
  };
  updatedAt: Date;               // IndexedDB metadata (table standard)
}

// Default values
export const DEFAULT_TAX_RATES: TaxSettings = {
  shortTermRate: new Decimal(0.24),  // 24% (typical US marginal rate)
  longTermRate: new Decimal(0.15),   // 15% (typical US capital gains rate)
  updatedAt: new Date(),
};
```

**Validation Rules**:
- `shortTermRate` ≥ 0 and ≤ 1.00 (0% to 100%)
- `longTermRate` ≥ 0 and ≤ 1.00
- Both rates stored as Decimal for precision
- Zod schema: `z.number().min(0).max(1)` (for form input, then converted to Decimal)

**Storage**:
- Stored in existing `userSettings` table with key `'tax_rates'`
- Managed by Zustand store: `useTaxSettingsStore`

---

### 4. TaxAnalysis (New)

**Purpose**: Calculated result for tax liability estimation (not persisted, computed on-demand).

**Location**: `src/types/tax.ts`

**Schema**:

```typescript
export interface TaxAnalysis {
  // Holdings-level analysis
  totalUnrealizedGain: Decimal;       // Sum of all unrealized gains
  totalUnrealizedLoss: Decimal;       // Sum of all unrealized losses (as positive number)
  netUnrealizedGain: Decimal;         // totalUnrealizedGain - totalUnrealizedLoss

  // Holding period breakdown
  shortTermGains: Decimal;            // Unrealized gains from ST lots
  longTermGains: Decimal;             // Unrealized gains from LT lots
  shortTermLosses: Decimal;           // Unrealized losses from ST lots
  longTermLosses: Decimal;            // Unrealized losses from LT lots

  // Tax liability estimates
  estimatedSTTax: Decimal;            // shortTermGains × shortTermRate
  estimatedLTTax: Decimal;            // longTermGains × longTermRate
  totalEstimatedTax: Decimal;         // estimatedSTTax + estimatedLTTax

  // Lot-level details
  lots: TaxLotAnalysis[];             // Per-lot breakdown
}

export interface TaxLotAnalysis {
  lotId: string;
  assetSymbol: string;
  purchaseDate: Date;
  quantity: Decimal;                  // remainingQuantity
  costBasis: Decimal;                 // purchasePrice × quantity
  currentValue: Decimal;              // currentPrice × quantity
  unrealizedGain: Decimal;            // currentValue - costBasis
  holdingPeriod: 'short' | 'long';    // Based on current date
  holdingDays: number;                // Days held (for display)
  lotType: 'standard' | 'espp' | 'rsu';

  // ESPP-specific (if applicable)
  bargainElement?: Decimal;
  adjustedCostBasis?: Decimal;        // costBasis + bargainElement (for reporting)
}
```

**Calculation Logic**:
1. For each holding in portfolio:
   - For each lot with `remainingQuantity > 0`:
     - Calculate `unrealizedGain = (currentPrice - purchasePrice) × remainingQuantity`
     - Classify as ST or LT based on `differenceInDays(now, purchaseDate) > 365`
     - Accumulate into ST or LT buckets
2. Apply tax rates:
   - `estimatedSTTax = shortTermGains × shortTermRate`
   - `estimatedLTTax = longTermGains × longTermRate`
3. Return structured `TaxAnalysis` object

**Notes**:
- This is a **computed entity**, not stored in database
- Calculated by `TaxEstimatorService`
- Recalculated on price updates or settings changes

---

### 5. DisqualifyingDisposition (New)

**Purpose**: Flag ESPP sales that don't meet IRS holding requirements (computed, not persisted).

**Location**: `src/types/tax.ts`

**Schema**:

```typescript
export interface DisqualifyingDisposition {
  transactionId: string;              // Sell transaction ID
  assetSymbol: string;
  lotId: string;                      // ESPP lot that was sold
  grantDate: Date;
  purchaseDate: Date;
  sellDate: Date;
  isDisqualifying: boolean;           // True if either requirement not met
  reason: DisqualifyingReason;
  taxImplication: string;             // Human-readable explanation
}

export type DisqualifyingReason =
  | 'sold_before_2yr_from_grant'      // Sold < 2 years from grant date
  | 'sold_before_1yr_from_purchase'   // Sold < 1 year from purchase date
  | 'both_requirements_not_met'       // Both conditions violated
  | 'qualifying';                     // Neither condition violated (not disqualifying)

export interface DisqualifyingDispositionCheck {
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

**Calculation Logic**:

```typescript
function checkDisqualifyingDisposition(
  grantDate: Date,
  purchaseDate: Date,
  sellDate: Date
): DisqualifyingDispositionCheck {
  const twoYearsFromGrant = addYears(grantDate, 2);
  const oneYearFromPurchase = addYears(purchaseDate, 1);

  const meetsGrantRequirement = sellDate >= twoYearsFromGrant;
  const meetsPurchaseRequirement = sellDate >= oneYearFromPurchase;
  const isQualifying = meetsGrantRequirement && meetsPurchaseRequirement;

  return {
    grantDate,
    purchaseDate,
    sellDate,
    twoYearsFromGrant,
    oneYearFromPurchase,
    meetsGrantRequirement,
    meetsPurchaseRequirement,
    isQualifying,
  };
}
```

**UI Display**:
- Show badge in transaction list: "Disqualifying Disposition" (yellow/warning color)
- Tooltip with explanation: "This sale occurred before meeting both holding requirements (2 years from grant AND 1 year from purchase). The bargain element will be taxed as ordinary income."

---

## Database Schema Changes

### IndexedDB Tables (Dexie)

**1. Holdings Table (No Schema Changes)**
- Tax lots are stored as embedded array in `Holding.lots`
- New fields added to `TaxLot` interface (see above)
- Serialization handled by existing Dexie hooks

**2. Transactions Table (No Schema Changes)**
- New transaction types (`espp_purchase`, `rsu_vest`) use existing schema
- ESPP/RSU metadata stored in `metadata` field (JSON)
- Existing indexes support filtering by type

**3. UserSettings Table (Existing, Usage Extended)**
```typescript
// Existing schema
{
  id: '++id',        // Auto-increment
  key: string,       // Lookup key
  value: unknown,    // JSON value
  updatedAt: Date    // Timestamp
}

// New usage for tax settings
{
  key: 'tax_rates',
  value: {
    shortTermRate: '0.24',
    longTermRate: '0.15',
    updatedAt: '2026-01-31T...'
  },
  updatedAt: Date
}
```

**Indexes**: No new indexes required. Existing indexes on `key` suffice for tax settings lookup.

---

## Data Relationships

```
Portfolio 1──→ * Holding
                   ↓
              1──→ * TaxLot (embedded in Holding.lots)
                      ↑
                      │ created by
                      │
Transaction ──────────┘
  (types: buy, espp_purchase, rsu_vest)

UserSettings (key: 'tax_rates')
  ↓ used by
TaxEstimatorService → TaxAnalysis (computed)
  ↑ uses
Holding.lots (TaxLot[])
```

---

## Migration Strategy

### Version 3 Schema (New)

```typescript
this.version(3).stores({
  // Existing tables (no changes)
  portfolios: '++id, name, type, createdAt, updatedAt',
  assets: '++id, symbol, name, type, exchange, currency',
  holdings: '++id, portfolioId, assetId, [portfolioId+assetId], lastUpdated',
  transactions: '++id, portfolioId, assetId, date, type, [portfolioId+date], [assetId+date], [portfolioId+assetId]',
  priceHistory: '++id, assetId, date, [assetId+date], source',
  priceSnapshots: '++id, assetId, timestamp, [assetId+timestamp], source',
  dividendRecords: '++id, assetId, portfolioId, paymentDate, [assetId+paymentDate]',
  userSettings: '++id, key',
  performanceSnapshots: '++id, portfolioId, date, [portfolioId+date]',

  // No new tables needed - using existing structures
});
```

**Migration Tasks**:
1. No schema changes (only type extensions)
2. Add serialization for new TaxLot fields (`bargainElement`, `vestingPrice`) in Dexie hooks
3. Update `HOLDING_DECIMAL_FIELDS` and `TAX_LOT_DECIMAL_FIELDS` to include new fields
4. Create default tax settings on first app load (if not exists)

### Data Transformation

**Existing Data Compatibility**:
- Existing `TaxLot` records will have `lotType: undefined` → treat as `'standard'`
- Existing transactions unaffected (new types are additive)
- No backfill required for existing data

**New Field Defaults**:
```typescript
// Default values for backward compatibility
{
  lotType: lotType ?? 'standard',
  grantDate: undefined,        // Only for ESPP lots
  bargainElement: undefined,   // Only for ESPP lots
  vestingDate: undefined,      // Only for RSU lots
  vestingPrice: undefined,     // Only for RSU lots
}
```

---

## Validation Schemas (Zod)

### TaxLotSchema

```typescript
export const TaxLotSchema = z.object({
  id: z.string().uuid(),
  quantity: DecimalSchema,
  purchasePrice: DecimalSchema,
  purchaseDate: z.date(),
  soldQuantity: DecimalSchema,
  remainingQuantity: DecimalSchema,
  notes: z.string().optional(),
  lotType: z.enum(['standard', 'espp', 'rsu']).default('standard'),
  grantDate: z.date().optional(),
  bargainElement: DecimalSchema.optional(),
  vestingDate: z.date().optional(),
  vestingPrice: DecimalSchema.optional(),
}).refine(
  (data) => data.remainingQuantity.equals(data.quantity.minus(data.soldQuantity)),
  { message: 'remainingQuantity must equal quantity - soldQuantity' }
).refine(
  (data) => data.lotType !== 'espp' || (data.grantDate && data.bargainElement),
  { message: 'ESPP lots must have grantDate and bargainElement' }
).refine(
  (data) => data.lotType !== 'rsu' || (data.vestingDate && data.vestingPrice),
  { message: 'RSU lots must have vestingDate and vestingPrice' }
);
```

### ESPPTransactionSchema

```typescript
export const ESPPTransactionSchema = TransactionSchema.extend({
  type: z.literal('espp_purchase'),
  metadata: z.object({
    grantDate: z.string().datetime(),
    purchaseDate: z.string().datetime(),
    marketPriceAtGrant: DecimalStringSchema,
    marketPriceAtPurchase: DecimalStringSchema,
    discountPercent: z.number().min(0).max(100),
    bargainElement: DecimalStringSchema,
  }),
}).refine(
  (data) => new Date(data.metadata.grantDate) < new Date(data.metadata.purchaseDate),
  { message: 'Grant date must be before purchase date' }
);
```

### RSUTransactionSchema

```typescript
export const RSUTransactionSchema = TransactionSchema.extend({
  type: z.literal('rsu_vest'),
  metadata: z.object({
    vestingDate: z.string().datetime(),
    grossSharesVested: DecimalStringSchema,
    sharesWithheld: DecimalStringSchema,
    netShares: DecimalStringSchema,
    vestingPrice: DecimalStringSchema,
    taxWithheldAmount: DecimalStringSchema.optional(),
  }),
}).refine(
  (data) => {
    const gross = new Decimal(data.metadata.grossSharesVested);
    const withheld = new Decimal(data.metadata.sharesWithheld);
    const net = new Decimal(data.metadata.netShares);
    return net.equals(gross.minus(withheld));
  },
  { message: 'Net shares must equal gross shares - shares withheld' }
);
```

### TaxSettingsSchema

```typescript
export const TaxSettingsSchema = z.object({
  shortTermRate: z.number().min(0).max(1),
  longTermRate: z.number().min(0).max(1),
  updatedAt: z.date(),
});
```

---

## Summary

**New Entities**: 3 (TaxSettings, TaxAnalysis, DisqualifyingDisposition)
**Extended Entities**: 2 (TaxLot, Transaction)
**New DB Tables**: 0 (using existing structures)
**New Decimal Fields**: 4 (bargainElement, vestingPrice, shortTermRate, longTermRate)
**New Indexes**: 0 (existing indexes sufficient)

**Data Integrity**:
- All financial values use Decimal.js
- All dates use native Date objects (stored as timestamps in IndexedDB)
- Validation enforced at service layer (Zod schemas)
- No orphaned data (tax lots embedded in holdings)
- Backward compatible with existing data (new fields optional)
