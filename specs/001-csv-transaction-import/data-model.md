# Data Model: CSV Transaction Import

**Feature**: CSV Transaction Import with Automatic Column Detection
**Date**: 2026-01-22
**Phase**: 1 - Design

## Entities

### 1. ImportSession

Represents a single CSV import attempt from file selection to completion.

```typescript
interface ImportSession {
  id: string;                          // UUID
  portfolioId: string;                 // Target portfolio
  status: ImportSessionStatus;
  fileName: string;
  fileSize: number;                    // bytes
  totalRows: number;
  createdAt: Date;

  // Detection results
  detectedDelimiter: ',' | ';' | '\t';
  detectedHeaders: string[];
  columnMappings: ColumnMapping[];

  // Preview data (first 10 rows)
  previewRows: ParsedRow[];

  // Validation results
  validRowCount: number;
  errorRowCount: number;
  errors: ImportError[];

  // Duplicate detection
  duplicateCount: number;
  duplicates: DuplicateMatch[];
  duplicateHandling: 'skip' | 'import' | 'review';

  // Final results
  importedCount?: number;
  completedAt?: Date;
}

type ImportSessionStatus =
  | 'file_selected'      // File chosen, parsing started
  | 'parsing'            // Parsing CSV content
  | 'detecting'          // Auto-detecting columns
  | 'mapping_review'     // User reviewing/correcting mappings
  | 'validating'         // Validating all rows
  | 'preview'            // Showing preview, awaiting confirmation
  | 'importing'          // Writing to database
  | 'completed'          // Successfully finished
  | 'cancelled'          // User cancelled
  | 'error';             // Unrecoverable error
```

**Validation Rules**:
- `fileName` must have `.csv` extension
- `fileSize` must be ≤ 10MB (10,485,760 bytes)
- `totalRows` must be > 0 (file has data beyond headers)

**State Transitions**:
```
file_selected → parsing → detecting → mapping_review → validating → preview → importing → completed
                  ↓           ↓            ↓              ↓           ↓           ↓
                error      error       cancelled       error      cancelled    error
```

---

### 2. ColumnMapping

Maps a CSV column to a transaction field with confidence scoring.

```typescript
interface ColumnMapping {
  csvColumn: string;           // Header name from CSV
  csvColumnIndex: number;      // 0-based column position
  transactionField: TransactionField | null;
  confidence: number;          // 0-1, auto-detection confidence
  isUserOverride: boolean;     // True if user manually changed mapping
}

type TransactionField =
  | 'date'
  | 'symbol'
  | 'type'
  | 'quantity'
  | 'price'
  | 'fees'
  | 'notes';

// Required fields that must be mapped before import
const REQUIRED_FIELDS: TransactionField[] = ['date', 'symbol', 'quantity', 'price'];

// Optional fields that enhance import but aren't required
const OPTIONAL_FIELDS: TransactionField[] = ['type', 'fees', 'notes'];
```

**Validation Rules**:
- All REQUIRED_FIELDS must have a mapping before import can proceed
- Each TransactionField can only be mapped to one CSV column
- `confidence` is set by auto-detection, not editable by user
- `isUserOverride` tracks whether user changed the auto-detected mapping

---

### 3. ParsedRow

Represents a single row from the CSV after initial parsing.

```typescript
interface ParsedRow {
  rowNumber: number;           // 1-based row number in original file (header = row 1)
  raw: Record<string, string>; // Original values keyed by header
  parsed: {
    date: Date | null;
    symbol: string | null;
    type: TransactionType | null;
    quantity: Decimal | null;
    price: Decimal | null;
    fees: Decimal | null;
    notes: string | null;
  };
  isValid: boolean;
  errors: FieldError[];
}

interface FieldError {
  field: TransactionField;
  value: string;
  message: string;
}
```

**Validation Rules**:
- `date` must be a valid date in supported formats
- `symbol` must be 1-10 alphanumeric characters
- `quantity` must be a non-zero number
- `price` must be a non-negative number
- `type` must map to valid TransactionType or be inferred
- `fees` if present must be a non-negative number

---

### 4. ImportError

Records a failed row with full context for user review.

```typescript
interface ImportError {
  rowNumber: number;
  originalData: Record<string, string>;
  field: TransactionField;
  value: string;
  message: string;
  severity: 'error' | 'warning';
}
```

**Error Types**:
| Field | Condition | Severity | Message Template |
|-------|-----------|----------|------------------|
| date | Unparseable | error | "Could not parse date '{value}'. Expected: YYYY-MM-DD, MM/DD/YYYY, etc." |
| date | Future date | warning | "Date '{value}' is in the future" |
| symbol | Empty | error | "Symbol is required" |
| symbol | Invalid chars | error | "Symbol '{value}' contains invalid characters. Use letters and numbers only." |
| symbol | Too long | error | "Symbol '{value}' exceeds 10 character limit" |
| quantity | Not a number | error | "Quantity '{value}' is not a valid number" |
| quantity | Zero | error | "Quantity cannot be zero" |
| price | Not a number | error | "Price '{value}' is not a valid number" |
| price | Negative | error | "Price cannot be negative" |
| type | Unknown | warning | "Unknown type '{value}', defaulting to Buy/Sell based on quantity" |
| fees | Not a number | warning | "Could not parse fees '{value}', using 0" |

---

### 5. DuplicateMatch

Records a potential duplicate transaction for user review.

```typescript
interface DuplicateMatch {
  importRowNumber: number;
  importData: ParsedRow;
  existingTransaction: {
    id: string;
    date: Date;
    symbol: string;
    type: TransactionType;
    quantity: Decimal;
    price: Decimal;
  };
  matchConfidence: 'exact' | 'likely';
}
```

**Match Criteria**:
- `exact`: date + symbol + quantity + price all match
- `likely`: date + symbol match, quantity or price within 1% (future enhancement)

---

### 6. ImportResult

Final result of an import operation.

```typescript
interface ImportResult {
  sessionId: string;
  success: boolean;
  totalRows: number;
  importedCount: number;
  skippedDuplicates: number;
  errorCount: number;
  errors: ImportError[];
  transactions: Transaction[];      // The successfully imported transactions
  failedRowsCsv?: string;           // CSV content of failed rows for download
}
```

---

## Type Extensions

### Extend existing Transaction type

The existing `Transaction` type (in `src/types/transaction.ts`) already supports import tracking via `importSource`. No changes needed to the core type.

```typescript
// Existing field in Transaction interface:
importSource?: string; // CSV import tracking - will store session ID
```

---

## Zod Validation Schemas

```typescript
// CSV row validation schema (flexible for various formats)
const csvRowSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  symbol: z.string()
    .min(1, 'Symbol is required')
    .max(10, 'Symbol too long')
    .regex(/^[A-Za-z0-9.]+$/, 'Invalid symbol format'),
  type: z.string().optional(),
  quantity: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) !== 0,
    'Quantity must be a non-zero number'
  ),
  price: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    'Price must be a non-negative number'
  ),
  fees: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

// Column mapping validation
const columnMappingSchema = z.object({
  csvColumn: z.string(),
  csvColumnIndex: z.number().int().min(0),
  transactionField: z.enum(['date', 'symbol', 'type', 'quantity', 'price', 'fees', 'notes']).nullable(),
  confidence: z.number().min(0).max(1),
  isUserOverride: z.boolean(),
});

// Import session validation
const importSessionSchema = z.object({
  portfolioId: z.string().uuid(),
  fileName: z.string().endsWith('.csv'),
  fileSize: z.number().max(10 * 1024 * 1024, 'File size exceeds 10MB limit'),
  columnMappings: z.array(columnMappingSchema),
  duplicateHandling: z.enum(['skip', 'import', 'review']).default('skip'),
});
```

---

## State Management (Zustand Store)

```typescript
interface CsvImportState {
  // Session state
  session: ImportSession | null;
  isProcessing: boolean;
  progress: number; // 0-100

  // Actions
  startImport: (file: File, portfolioId: string) => Promise<void>;
  updateMapping: (columnIndex: number, field: TransactionField | null) => void;
  setDuplicateHandling: (handling: 'skip' | 'import' | 'review') => void;
  confirmImport: () => Promise<ImportResult>;
  cancelImport: () => void;
  downloadFailedRows: () => void;
  reset: () => void;
}
```

---

## Database Considerations

### No Schema Changes Required

The import feature uses existing tables:
- `transactions` - stores imported transactions (existing)
- No new IndexedDB tables needed

### Query Patterns

```typescript
// Load existing transactions for duplicate detection
db.transactions
  .where('portfolioId')
  .equals(portfolioId)
  .filter(t => t.date >= twoYearsAgo)
  .toArray();

// Bulk insert imported transactions
db.transactions.bulkAdd(transactions);
```

---

## UI Component Props

### CsvImportDialog

```typescript
interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolioId: string;
  onImportComplete?: (result: ImportResult) => void;
}
```

### ColumnMappingEditor

```typescript
interface ColumnMappingEditorProps {
  mappings: ColumnMapping[];
  previewRows: ParsedRow[];
  onMappingChange: (columnIndex: number, field: TransactionField | null) => void;
  requiredFieldsMissing: TransactionField[];
}
```

### ImportPreviewTable

```typescript
interface ImportPreviewTableProps {
  rows: ParsedRow[];
  errors: ImportError[];
  maxRows?: number; // Default 10
}
```

### ImportResults

```typescript
interface ImportResultsProps {
  result: ImportResult;
  onClose: () => void;
  onDownloadFailed: () => void;
}
```
