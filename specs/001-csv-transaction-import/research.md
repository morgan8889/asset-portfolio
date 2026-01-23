# Research: CSV Transaction Import

**Feature**: CSV Transaction Import with Automatic Column Detection
**Date**: 2026-01-22
**Phase**: 0 - Research & Investigation

## Research Tasks

### 1. CSV Parsing with papaparse

**Question**: What are the best practices for parsing CSV files with papaparse in a React/Next.js environment?

**Decision**: Use papaparse with `worker: false` (no web worker) for simplicity, with `header: true` for auto-header detection.

**Rationale**:
- papaparse is already a dependency (v5.4.1)
- Built-in streaming support for large files
- Automatic delimiter detection (comma, semicolon, tab)
- Header row detection is reliable
- Web workers add complexity without significant benefit for <10MB files

**Configuration**:
```typescript
Papa.parse(file, {
  header: true,              // Auto-detect headers
  skipEmptyLines: true,      // Ignore blank rows
  transformHeader: (h) => h.trim().toLowerCase(), // Normalize headers
  dynamicTyping: false,      // Keep as strings, we'll convert with decimal.js
  complete: (results) => { /* handle results */ },
  error: (error) => { /* handle error */ }
});
```

**Alternatives Considered**:
- `csv-parse`: More complex API, not needed for this use case
- Manual parsing: Error-prone, reinventing the wheel
- Web Worker approach: Overkill for typical file sizes (<10MB)

---

### 2. Automatic Column Detection Algorithm

**Question**: How should we automatically detect which CSV columns map to transaction fields?

**Decision**: Multi-pass detection using header name matching, then data pattern validation.

**Rationale**:
- Header matching covers 80%+ of standard exports
- Data pattern validation catches edge cases
- Confidence scoring allows graceful degradation to manual mapping

**Algorithm**:
```
Pass 1: Header Name Matching (case-insensitive)
├── Date: date, transaction_date, trade_date, settlement_date
├── Symbol: symbol, ticker, asset, stock, security
├── Type: type, action, transaction_type, side
├── Quantity: quantity, qty, shares, units, amount
├── Price: price, cost, price_per_share, unit_price
├── Fees: fees, commission, fee, commissions
└── Notes: notes, description, memo, comments

Pass 2: Data Pattern Validation
├── Date columns: Try parsing first 5 non-empty values as dates
├── Symbol columns: Check for uppercase alphanumeric patterns (1-10 chars)
├── Type columns: Look for buy/sell/dividend keywords
├── Numeric columns: Validate as numbers for quantity/price/fees
└── Assign confidence scores (0-1) based on match quality

Pass 3: Conflict Resolution
├── Multiple date matches → Prefer "date" > "transaction_date" > others
├── Multiple numeric columns → Use header hints to distinguish qty vs price
└── Unmatched required fields → Flag for user attention
```

**Alternatives Considered**:
- ML-based detection: Overkill, adds complexity, unpredictable
- User-always-selects: Poor UX, spec requires auto-detection
- Fixed column positions: Brittle, different brokerages vary

---

### 3. Date Format Parsing

**Question**: How do we handle multiple date formats (ISO, US, EU, written) per FR-006?

**Decision**: Use a parsing cascade with date-fns, trying formats in order of specificity.

**Rationale**:
- date-fns is already a dependency
- Cascade approach handles ambiguity (is 01/02/2025 Jan 2 or Feb 1?)
- Per-row parsing allows mixed formats in same file

**Format Priority**:
```typescript
const DATE_FORMATS = [
  'yyyy-MM-dd',           // ISO 8601 (unambiguous, try first)
  'yyyy/MM/dd',           // ISO variant
  'MMMM d, yyyy',         // January 15, 2025
  'MMMM dd, yyyy',        // January 05, 2025
  'MMM d, yyyy',          // Jan 15, 2025
  'MMM dd, yyyy',         // Jan 05, 2025
  'MM/dd/yyyy',           // US format
  'M/d/yyyy',             // US short
  'dd/MM/yyyy',           // EU format (try after US for ambiguous)
  'd/M/yyyy',             // EU short
  'MM-dd-yyyy',           // US with dashes
  'dd-MM-yyyy',           // EU with dashes
];

function parseDate(value: string): Date | null {
  for (const format of DATE_FORMATS) {
    const parsed = parse(value.trim(), format, new Date());
    if (isValid(parsed)) return parsed;
  }
  return null; // Mark row as error
}
```

**Ambiguity Handling**:
- For dates like `01/02/2025`, we default to US (MM/DD/YYYY)
- User can manually specify if their file uses EU format
- Detection hint: If any date has day > 12, we know it's DD/MM format

**Alternatives Considered**:
- Chrono.js: Natural language parsing adds unpredictability
- Moment.js: Deprecated, heavier than date-fns
- Single format only: Spec explicitly requires multiple formats

---

### 4. Transaction Type Mapping

**Question**: How do we map various brokerage type labels to our TransactionType enum?

**Decision**: Keyword-based mapping with fallback to user selection.

**Rationale**:
- Brokerages use inconsistent terminology
- Keyword approach handles variations
- Spec allows both positive/negative quantity inference

**Mapping Table**:
```typescript
const TYPE_KEYWORDS: Record<string, TransactionType> = {
  // Buy variants
  'buy': 'buy',
  'bought': 'buy',
  'purchase': 'buy',
  'long': 'buy',
  'reinvest': 'reinvestment',
  'reinvestment': 'reinvestment',
  'drip': 'reinvestment',

  // Sell variants
  'sell': 'sell',
  'sold': 'sell',
  'sale': 'sell',
  'short': 'sell',

  // Dividend variants
  'div': 'dividend',
  'dividend': 'dividend',
  'distribution': 'dividend',
  'income': 'dividend',

  // Split variants
  'split': 'split',
  'stock split': 'split',

  // Transfer variants
  'transfer': 'transfer_in', // Direction determined by +/- quantity
  'transfer in': 'transfer_in',
  'transfer out': 'transfer_out',
  'deposit': 'transfer_in',
  'withdrawal': 'transfer_out',
};

// If type not provided, infer from quantity sign
function inferTypeFromQuantity(quantity: number, explicit_type?: string): TransactionType {
  if (explicit_type) return mapType(explicit_type);
  return quantity >= 0 ? 'buy' : 'sell';
}
```

**Alternatives Considered**:
- Require exact type values: Poor UX, breaks many imports
- No type inference: Spec says infer from quantity if not provided

---

### 5. Duplicate Detection Strategy

**Question**: How do we efficiently detect duplicate transactions (FR-015)?

**Decision**: Hash-based comparison using date + symbol + quantity + price as composite key.

**Rationale**:
- Spec defines duplicates as matching on these 4 fields
- Hash comparison is O(1) lookup
- Loads only recent transactions for comparison (past 2 years)

**Implementation**:
```typescript
function createTransactionHash(t: { date: Date; symbol: string; quantity: string; price: string }): string {
  const dateStr = format(t.date, 'yyyy-MM-dd');
  const qty = new Decimal(t.quantity).toFixed(8);
  const prc = new Decimal(t.price).toFixed(8);
  return `${dateStr}|${t.symbol.toUpperCase()}|${qty}|${prc}`;
}

async function findDuplicates(newTransactions: ParsedRow[], portfolioId: string): Promise<DuplicateMatch[]> {
  // Load existing transaction hashes
  const existingTxns = await db.transactions
    .where('portfolioId')
    .equals(portfolioId)
    .filter(t => t.date >= twoYearsAgo)
    .toArray();

  const existingHashes = new Set(existingTxns.map(createTransactionHash));

  // Check new transactions against existing
  return newTransactions
    .filter(row => existingHashes.has(createTransactionHash(row)))
    .map(row => ({ row, existingTransaction: /* lookup */ }));
}
```

**Alternatives Considered**:
- Full row comparison: Slower, unnecessary complexity
- Date-only matching: Too many false positives
- Fuzzy matching: Spec says exact matching for MVP

---

### 6. Error Handling & Partial Import

**Question**: How do we implement partial imports with detailed error reporting (FR-007, FR-008)?

**Decision**: Two-phase validation with row-level error collection.

**Rationale**:
- Users need to know exactly which rows failed and why
- Valid rows should import even if some fail
- Failed rows should be downloadable for correction

**Implementation**:
```typescript
interface ValidationResult {
  valid: ParsedTransaction[];
  errors: RowError[];
}

interface RowError {
  rowNumber: number;
  originalData: Record<string, string>;
  field: string;
  value: string;
  message: string;
}

function validateRows(rows: ParsedRow[], mapping: ColumnMapping): ValidationResult {
  const valid: ParsedTransaction[] = [];
  const errors: RowError[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 for header row and 0-index
    const result = validateRow(row, mapping);

    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({
        rowNumber,
        originalData: row,
        ...result.error
      });
    }
  });

  return { valid, errors };
}
```

**Error Message Templates**:
| Field | Error Condition | Message |
|-------|-----------------|---------|
| Date | Unparseable | "Could not parse date '{value}'. Expected format: YYYY-MM-DD or MM/DD/YYYY" |
| Symbol | Empty | "Symbol is required" |
| Symbol | Invalid | "Symbol '{value}' contains invalid characters" |
| Quantity | Not a number | "Quantity '{value}' is not a valid number" |
| Quantity | Zero | "Quantity cannot be zero" |
| Price | Not a number | "Price '{value}' is not a valid number" |
| Price | Negative | "Price cannot be negative" |
| Type | Unknown | "Unknown transaction type '{value}'. Expected: Buy, Sell, Dividend, Split, Transfer" |

---

### 7. Brokerage Format Presets (P5 Enhancement)

**Question**: What common brokerage formats should we support for auto-detection?

**Decision**: Defer to post-MVP. P5 priority, spec marks as enhancement.

**Rationale**:
- P1-P4 functionality provides complete value
- Manual column mapping serves as universal fallback
- Brokerage formats change frequently, maintenance burden

**Future Consideration**:
If implemented, would detect based on:
- Specific header combinations unique to each brokerage
- File metadata patterns
- Known column naming conventions

**Common formats to potentially support**:
- Fidelity
- Schwab
- TD Ameritrade / Schwab merged
- E*TRADE
- Robinhood
- Vanguard
- Interactive Brokers

---

### 8. File Size and Performance

**Question**: How do we handle large files while maintaining UI responsiveness?

**Decision**: Chunked processing with progress updates.

**Rationale**:
- 10MB limit (~50k rows) is reasonable but could cause UI freeze
- Chunked processing allows progress feedback
- State updates between chunks keep UI responsive

**Implementation**:
```typescript
const CHUNK_SIZE = 100; // rows per batch

async function processInChunks(rows: ParsedRow[], onProgress: (pct: number) => void): Promise<void> {
  const total = rows.length;

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await processChunk(chunk);

    // Yield to UI thread
    await new Promise(resolve => setTimeout(resolve, 0));

    onProgress(Math.min(100, Math.round(((i + chunk.length) / total) * 100)));
  }
}
```

**Performance Targets** (per SC-001):
- 500 rows: < 30 seconds total
- Progress updates: Every 100 rows
- UI remains responsive: No blocking > 100ms

---

## Summary of Decisions

| Area | Decision | Key Rationale |
|------|----------|---------------|
| CSV Parsing | papaparse, no worker | Already in deps, simple API |
| Column Detection | Header + pattern matching | 80%+ coverage, deterministic |
| Date Parsing | date-fns cascade | Multiple formats, existing dep |
| Type Mapping | Keyword lookup + inference | Handles brokerage variations |
| Duplicate Detection | Hash-based comparison | O(1) lookup, exact matching |
| Error Handling | Row-level collection | Partial import support |
| Brokerage Presets | Deferred to post-MVP | P5 priority, manual fallback works |
| Performance | Chunked processing | UI responsive for large files |
