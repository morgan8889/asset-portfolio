# Service Contract: TaxEstimator

**Purpose**: Calculate unrealized capital gains tax liability estimates using FIFO lot selection and user-configured tax rates.

**Location**: `src/lib/services/tax-estimator.ts`

---

## Public Interface

### estimateTaxLiability

Calculates detailed tax liability estimates for a portfolio's holdings.

**Signature**:
```typescript
function estimateTaxLiability(
  holdings: Holding[],
  currentPrices: Map<string, Decimal>,
  taxSettings: TaxSettings
): TaxAnalysis
```

**Parameters**:
- `holdings`: Array of holdings to analyze
- `currentPrices`: Map of assetId → current market price
- `taxSettings`: User's tax rate preferences (ST and LT rates)

**Returns**: `TaxAnalysis` object with complete breakdown

**Example**:
```typescript
const holdings = await db.getHoldingsByPortfolio('portfolio-123');
const prices = new Map([
  ['asset-1', new Decimal(150)],
  ['asset-2', new Decimal(200)],
]);
const taxSettings = {
  shortTermRate: new Decimal(0.24),
  longTermRate: new Decimal(0.15),
  updatedAt: new Date(),
};

const analysis = estimateTaxLiability(holdings, prices, taxSettings);
console.log(`Total estimated tax: $${analysis.totalEstimatedTax}`);
```

**Algorithm**:
```typescript
1. For each holding:
   a. Get current price from map
   b. For each lot in holding.lots where remainingQuantity > 0:
      - Calculate unrealized gain = (currentPrice - lot.purchasePrice) × lot.remainingQuantity
      - Classify as ST or LT using holding period calculator
      - Accumulate into ST or LT buckets
2. Apply tax rates:
   - estimatedSTTax = shortTermGains × shortTermRate
   - estimatedLTTax = longTermGains × longTermRate
3. Build lot-level details array
4. Return TaxAnalysis object
```

---

### estimateForHolding

Calculates tax liability for a single holding (useful for detail views).

**Signature**:
```typescript
function estimateForHolding(
  holding: Holding,
  currentPrice: Decimal,
  taxSettings: TaxSettings
): TaxAnalysis
```

**Parameters**:
- `holding`: Single holding to analyze
- `currentPrice`: Current market price for the asset
- `taxSettings`: User's tax rate preferences

**Returns**: `TaxAnalysis` object for this holding only

**Example**:
```typescript
const holding = await db.getHoldingWithDecimals('holding-xyz');
const currentPrice = new Decimal(125.50);
const analysis = estimateForHolding(holding, currentPrice, taxSettings);

// Display in UI
console.log(`Short-Term Gains: $${analysis.shortTermGains}`);
console.log(`Long-Term Gains: $${analysis.longTermGains}`);
console.log(`Estimated Tax: $${analysis.totalEstimatedTax}`);
```

---

### calculateLotAnalysis

Low-level function to analyze a single tax lot.

**Signature**:
```typescript
function calculateLotAnalysis(
  lot: TaxLot,
  assetSymbol: string,
  currentPrice: Decimal
): TaxLotAnalysis
```

**Parameters**:
- `lot`: Tax lot to analyze
- `assetSymbol`: Asset symbol (for display)
- `currentPrice`: Current market price

**Returns**: `TaxLotAnalysis` object with per-lot details

**Example**:
```typescript
const lot = {
  id: 'lot-1',
  quantity: new Decimal(100),
  soldQuantity: new Decimal(20),
  remainingQuantity: new Decimal(80),
  purchasePrice: new Decimal(100),
  purchaseDate: new Date('2023-01-15'),
  lotType: 'standard',
};

const analysis = calculateLotAnalysis(lot, 'AAPL', new Decimal(150));
console.log(`Unrealized gain: $${analysis.unrealizedGain}`);  // $4,000
console.log(`Holding period: ${analysis.holdingPeriod}`);     // 'long'
```

---

## Dependencies

- **HoldingPeriodCalculator**: `calculateHoldingPeriod`, `calculateHoldingDays`
- **decimal.js**: All financial arithmetic
- **date-fns**: Date comparisons
- **Types**: `TaxAnalysis`, `TaxLotAnalysis`, `TaxSettings`, `Holding`, `TaxLot`

---

## Return Type Details

### TaxAnalysis

```typescript
interface TaxAnalysis {
  // Summary metrics
  totalUnrealizedGain: Decimal;       // All gains (ignoring losses)
  totalUnrealizedLoss: Decimal;       // All losses (as positive numbers)
  netUnrealizedGain: Decimal;         // totalGain - totalLoss

  // Holding period breakdown
  shortTermGains: Decimal;            // ST lots with unrealized gains
  longTermGains: Decimal;             // LT lots with unrealized gains
  shortTermLosses: Decimal;           // ST lots with unrealized losses
  longTermLosses: Decimal;            // LT lots with unrealized losses

  // Tax estimates
  estimatedSTTax: Decimal;            // shortTermGains × shortTermRate
  estimatedLTTax: Decimal;            // longTermGains × longTermRate
  totalEstimatedTax: Decimal;         // estimatedSTTax + estimatedLTTax

  // Lot details
  lots: TaxLotAnalysis[];             // One entry per lot
}
```

### TaxLotAnalysis

```typescript
interface TaxLotAnalysis {
  lotId: string;
  assetSymbol: string;
  purchaseDate: Date;
  quantity: Decimal;                  // remainingQuantity
  costBasis: Decimal;                 // purchasePrice × quantity
  currentValue: Decimal;              // currentPrice × quantity
  unrealizedGain: Decimal;            // currentValue - costBasis (can be negative)
  holdingPeriod: 'short' | 'long';
  holdingDays: number;
  lotType: 'standard' | 'espp' | 'rsu';

  // ESPP-specific (if lot.lotType === 'espp')
  bargainElement?: Decimal;
  adjustedCostBasis?: Decimal;        // costBasis + (bargainElement × quantity)
}
```

---

## Testing Requirements

### Unit Tests

**File**: `tests/unit/tax-estimator.test.ts`

**Test Cases**:
```typescript
describe('estimateTaxLiability', () => {
  test('calculates ST and LT gains correctly with FIFO', () => {
    const holdings = [
      {
        id: 'holding-1',
        assetId: 'asset-1',
        lots: [
          // Old lot (LT)
          {
            id: 'lot-1',
            purchaseDate: new Date('2023-01-01'),
            purchasePrice: new Decimal(100),
            quantity: new Decimal(10),
            soldQuantity: new Decimal(0),
            remainingQuantity: new Decimal(10),
          },
          // Recent lot (ST)
          {
            id: 'lot-2',
            purchaseDate: new Date('2024-11-01'),
            purchasePrice: new Decimal(110),
            quantity: new Decimal(5),
            soldQuantity: new Decimal(0),
            remainingQuantity: new Decimal(5),
          },
        ],
      },
    ];

    const prices = new Map([['asset-1', new Decimal(120)]]);
    const taxSettings = {
      shortTermRate: new Decimal(0.24),
      longTermRate: new Decimal(0.15),
      updatedAt: new Date(),
    };

    const result = estimateTaxLiability(holdings, prices, taxSettings);

    // LT gain: 10 × (120 - 100) = 200
    expect(result.longTermGains.toNumber()).toBeCloseTo(200);

    // ST gain: 5 × (120 - 110) = 50
    expect(result.shortTermGains.toNumber()).toBeCloseTo(50);

    // LT tax: 200 × 0.15 = 30
    expect(result.estimatedLTTax.toNumber()).toBeCloseTo(30);

    // ST tax: 50 × 0.24 = 12
    expect(result.estimatedSTTax.toNumber()).toBeCloseTo(12);

    // Total tax: 30 + 12 = 42
    expect(result.totalEstimatedTax.toNumber()).toBeCloseTo(42);
  });

  test('handles unrealized losses correctly', () => {
    const holdings = [
      {
        id: 'holding-1',
        assetId: 'asset-1',
        lots: [
          {
            id: 'lot-1',
            purchaseDate: new Date('2024-01-01'),
            purchasePrice: new Decimal(150),
            quantity: new Decimal(10),
            soldQuantity: new Decimal(0),
            remainingQuantity: new Decimal(10),
          },
        ],
      },
    ];

    const prices = new Map([['asset-1', new Decimal(100)]]);
    const taxSettings = {
      shortTermRate: new Decimal(0.24),
      longTermRate: new Decimal(0.15),
      updatedAt: new Date(),
    };

    const result = estimateTaxLiability(holdings, prices, taxSettings);

    // Loss: 10 × (100 - 150) = -500
    expect(result.shortTermLosses.toNumber()).toBeCloseTo(500);  // Stored as positive
    expect(result.netUnrealizedGain.toNumber()).toBeCloseTo(-500);

    // No tax on losses
    expect(result.totalEstimatedTax.toNumber()).toBe(0);
  });

  test('includes ESPP adjusted cost basis in lot analysis', () => {
    const holdings = [
      {
        id: 'holding-1',
        assetId: 'asset-1',
        lots: [
          {
            id: 'lot-1',
            purchaseDate: new Date('2023-01-01'),
            purchasePrice: new Decimal(85),      // Discounted price
            quantity: new Decimal(10),
            soldQuantity: new Decimal(0),
            remainingQuantity: new Decimal(10),
            lotType: 'espp',
            bargainElement: new Decimal(15),     // Market was $100
          },
        ],
      },
    ];

    const prices = new Map([['asset-1', new Decimal(120)]]);
    const taxSettings = {
      shortTermRate: new Decimal(0.24),
      longTermRate: new Decimal(0.15),
      updatedAt: new Date(),
    };

    const result = estimateTaxLiability(holdings, prices, taxSettings);
    const lotAnalysis = result.lots[0];

    // Cost basis: 10 × $85 = $850
    expect(lotAnalysis.costBasis.toNumber()).toBeCloseTo(850);

    // Adjusted cost basis: 10 × ($85 + $15) = $1000
    expect(lotAnalysis.adjustedCostBasis!.toNumber()).toBeCloseTo(1000);

    // Unrealized gain (using initial basis): 10 × (120 - 85) = 350
    expect(lotAnalysis.unrealizedGain.toNumber()).toBeCloseTo(350);
  });

  test('ignores lots with zero remaining quantity', () => {
    const holdings = [
      {
        id: 'holding-1',
        assetId: 'asset-1',
        lots: [
          {
            id: 'lot-1',
            purchaseDate: new Date('2023-01-01'),
            purchasePrice: new Decimal(100),
            quantity: new Decimal(10),
            soldQuantity: new Decimal(10),  // Fully sold
            remainingQuantity: new Decimal(0),
          },
        ],
      },
    ];

    const prices = new Map([['asset-1', new Decimal(120)]]);
    const taxSettings = {
      shortTermRate: new Decimal(0.24),
      longTermRate: new Decimal(0.15),
      updatedAt: new Date(),
    };

    const result = estimateTaxLiability(holdings, prices, taxSettings);

    expect(result.totalUnrealizedGain.toNumber()).toBe(0);
    expect(result.lots.length).toBe(0);
  });

  test('handles missing price for asset', () => {
    const holdings = [
      {
        id: 'holding-1',
        assetId: 'asset-1',
        lots: [
          {
            id: 'lot-1',
            purchaseDate: new Date('2023-01-01'),
            purchasePrice: new Decimal(100),
            quantity: new Decimal(10),
            soldQuantity: new Decimal(0),
            remainingQuantity: new Decimal(10),
          },
        ],
      },
    ];

    const prices = new Map();  // No price for asset-1
    const taxSettings = {
      shortTermRate: new Decimal(0.24),
      longTermRate: new Decimal(0.15),
      updatedAt: new Date(),
    };

    // Should skip holdings without current price
    const result = estimateTaxLiability(holdings, prices, taxSettings);
    expect(result.lots.length).toBe(0);
  });
});

describe('calculateLotAnalysis', () => {
  test('calculates all fields correctly for standard lot', () => {
    const lot = {
      id: 'lot-1',
      purchaseDate: new Date('2023-06-15'),
      purchasePrice: new Decimal(100),
      quantity: new Decimal(50),
      soldQuantity: new Decimal(10),
      remainingQuantity: new Decimal(40),
      lotType: 'standard' as const,
    };

    const analysis = calculateLotAnalysis(lot, 'AAPL', new Decimal(150));

    expect(analysis.lotId).toBe('lot-1');
    expect(analysis.assetSymbol).toBe('AAPL');
    expect(analysis.quantity.toNumber()).toBe(40);
    expect(analysis.costBasis.toNumber()).toBeCloseTo(4000);    // 40 × 100
    expect(analysis.currentValue.toNumber()).toBeCloseTo(6000); // 40 × 150
    expect(analysis.unrealizedGain.toNumber()).toBeCloseTo(2000); // 6000 - 4000
    expect(analysis.holdingPeriod).toBe('long');
    expect(analysis.lotType).toBe('standard');
  });

  test('includes ESPP fields for ESPP lot', () => {
    const lot = {
      id: 'lot-2',
      purchaseDate: new Date('2024-01-01'),
      purchasePrice: new Decimal(85),
      quantity: new Decimal(100),
      soldQuantity: new Decimal(0),
      remainingQuantity: new Decimal(100),
      lotType: 'espp' as const,
      bargainElement: new Decimal(15),
      grantDate: new Date('2023-06-01'),
    };

    const analysis = calculateLotAnalysis(lot, 'GOOGL', new Decimal(120));

    expect(analysis.bargainElement!.toNumber()).toBe(15);
    expect(analysis.adjustedCostBasis!.toNumber()).toBeCloseTo(10000); // 100 × (85 + 15)
  });
});
```

**Coverage Target**: 95%+ (edge cases for missing data, zero quantities, negative gains)

---

## Error Handling

**Invalid Input**:
- Missing current price: Skip holding (log warning, don't throw)
- Invalid tax rates (< 0 or > 1): Validate in caller (Zod schema)
- Empty holdings array: Return empty TaxAnalysis (all zeros)

**Decimal Precision**:
- All intermediate calculations use Decimal
- Final tax amounts rounded to 2 decimal places: `.toDP(2)`

---

## Performance

**Expected Performance**:
- 100 holdings × 10 lots each (1,000 lots): < 50ms
- 1,000 holdings × 10 lots each (10,000 lots): < 500ms

**Optimization Opportunities**:
- None needed for MVP
- Future: Memoize holding period calculations if performance becomes an issue

---

## Usage Example

```typescript
import { estimateTaxLiability } from '@/lib/services/tax-estimator';
import { useTaxSettingsStore } from '@/lib/stores/tax-settings';

function TaxAnalysisView({ portfolioId }: { portfolioId: string }) {
  const [analysis, setAnalysis] = useState<TaxAnalysis | null>(null);
  const taxSettings = useTaxSettingsStore((state) => state.taxSettings);

  useEffect(() => {
    async function calculate() {
      const holdings = await db.getHoldingsByPortfolio(portfolioId);
      const prices = new Map();

      // Get current prices for all assets
      for (const holding of holdings) {
        const asset = await db.assets.get(holding.assetId);
        if (asset?.currentPrice) {
          prices.set(holding.assetId, new Decimal(asset.currentPrice));
        }
      }

      const result = estimateTaxLiability(holdings, prices, taxSettings);
      setAnalysis(result);
    }

    calculate();
  }, [portfolioId, taxSettings]);

  if (!analysis) return <Loading />;

  return (
    <div>
      <MetricCard
        title="Short-Term Gains"
        value={`$${analysis.shortTermGains.toFixed(2)}`}
      />
      <MetricCard
        title="Long-Term Gains"
        value={`$${analysis.longTermGains.toFixed(2)}`}
      />
      <MetricCard
        title="Estimated Tax"
        value={`$${analysis.totalEstimatedTax.toFixed(2)}`}
      />
      <TaxLotTable lots={analysis.lots} />
    </div>
  );
}
```

---

## Notes

- **Not Stored**: `TaxAnalysis` is computed on-demand, not persisted to database
- **Tax Advice Disclaimer**: Estimates only, not professional tax advice
- **Loss Handling**: Losses stored as positive numbers in `shortTermLosses`/`longTermLosses` fields for clarity
- **Future Enhancement**: Support for tax-loss harvesting suggestions based on losses
