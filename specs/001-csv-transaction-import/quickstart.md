# Quickstart: CSV Transaction Import Implementation

**Feature**: CSV Transaction Import with Automatic Column Detection
**Date**: 2026-01-22

## Prerequisites

Before implementing this feature, ensure you understand:

1. **Project Constitution** - Read `.specify/memory/constitution.md`
2. **Feature Spec** - Read `specs/001-csv-transaction-import/spec.md`
3. **Data Model** - Read `specs/001-csv-transaction-import/data-model.md`
4. **Existing Patterns** - Review `src/components/forms/add-transaction.tsx` for form patterns

## Quick Reference

### Key Dependencies (already installed)

```bash
# CSV Parsing
papaparse@^5.4.1

# Date handling
date-fns@^3.6.0

# Financial precision
decimal.js@^10.4.3

# Form handling
react-hook-form@^7.63.0
@hookform/resolvers@^3.10.0
zod@^3.25.76

# State management
zustand@^4.5.4

# UI components
shadcn/ui (various @radix-ui/* packages)
```

### File Structure to Create

```bash
# Types
src/types/csv-import.ts                    # Copy from contracts/csv-import-types.ts

# Services (create in order)
src/lib/services/csv-parser.ts             # 1. Parse CSV files
src/lib/utils/date-parser.ts               # 2. Multi-format date parsing
src/lib/services/column-detector.ts        # 3. Auto-detect column mappings
src/lib/services/csv-validator.ts          # 4. Validate parsed rows
src/lib/services/csv-importer.ts           # 5. Orchestrate full import

# Store
src/lib/stores/csv-import.ts               # Import session state

# Components (create in order)
src/components/forms/csv-import-dialog.tsx          # Main dialog
src/components/forms/column-mapping-editor.tsx      # Mapping UI
src/components/forms/import-preview-table.tsx       # Preview grid
src/components/forms/import-results.tsx             # Results summary
```

### Implementation Order

```
1. Types → 2. Date Parser → 3. CSV Parser → 4. Column Detector →
5. Validator → 6. Zustand Store → 7. UI Components → 8. Wire to page
```

## Key Implementation Notes

### 1. All Processing is Client-Side

Per the constitution's Privacy-First principle, **no data leaves the browser**:

```typescript
// ✅ CORRECT: Parse CSV in browser
const result = Papa.parse(file, { header: true, skipEmptyLines: true });

// ❌ WRONG: Never upload to server
// await fetch('/api/import', { body: file });
```

### 2. Use decimal.js for All Numbers

Per the Financial Precision principle:

```typescript
// ✅ CORRECT
import Decimal from 'decimal.js';
const quantity = new Decimal(row.quantity);
const price = new Decimal(row.price);
const total = quantity.mul(price);

// ❌ WRONG
const total = parseFloat(row.quantity) * parseFloat(row.price);
```

### 3. Follow Existing Patterns

The codebase has established patterns. Follow them:

```typescript
// Store pattern (see src/lib/stores/portfolio.ts)
import { create } from 'zustand';

interface CsvImportState {
  session: ImportSession | null;
  // ...
}

export const useCsvImportStore = create<CsvImportState>((set, get) => ({
  session: null,
  // ...
}));

// Form pattern (see src/components/forms/add-transaction.tsx)
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});
```

### 4. Test As You Go

Per the Test-Driven Quality principle:

```bash
# Run tests continuously
npm run test:watch

# Add tests alongside each service
src/lib/services/csv-parser.ts
src/lib/services/__tests__/csv-parser.test.ts
```

## Example: CSV Parser Service

```typescript
// src/lib/services/csv-parser.ts
import Papa from 'papaparse';
import type { CsvParserResult } from '@/types/csv-import';

export async function parseCsvFile(file: File): Promise<CsvParserResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(results.errors[0].message));
          return;
        }

        resolve({
          headers: results.meta.fields || [],
          rows: results.data as Record<string, string>[],
          delimiter: results.meta.delimiter as ',' | ';' | '\t',
          rowCount: results.data.length,
        });
      },
      error: (error) => reject(error),
    });
  });
}
```

## Example: Column Detection

```typescript
// src/lib/services/column-detector.ts
import { HEADER_KEYWORDS, REQUIRED_FIELDS } from '@/lib/utils/validation';
import type { ColumnMapping, ColumnDetectionResult, TransactionField } from '@/types/csv-import';

export function detectColumnMappings(headers: string[]): ColumnDetectionResult {
  const mappings: ColumnMapping[] = headers.map((header, index) => {
    const normalizedHeader = header.toLowerCase().trim();
    let bestMatch: TransactionField | null = null;
    let confidence = 0;

    // Check each field's keywords
    for (const [field, keywords] of Object.entries(HEADER_KEYWORDS)) {
      for (const keyword of keywords) {
        if (normalizedHeader === keyword) {
          bestMatch = field as TransactionField;
          confidence = 1.0;
          break;
        }
        if (normalizedHeader.includes(keyword) && confidence < 0.8) {
          bestMatch = field as TransactionField;
          confidence = 0.8;
        }
      }
      if (confidence === 1.0) break;
    }

    return {
      csvColumn: header,
      csvColumnIndex: index,
      transactionField: bestMatch,
      confidence,
      isUserOverride: false,
    };
  });

  const mappedFields = mappings
    .filter((m) => m.transactionField !== null)
    .map((m) => m.transactionField);

  const missingRequiredFields = REQUIRED_FIELDS.filter(
    (field) => !mappedFields.includes(field)
  );

  const unmappedColumns = mappings
    .filter((m) => m.transactionField === null)
    .map((m) => m.csvColumn);

  return { mappings, unmappedColumns, missingRequiredFields };
}
```

## Common Pitfalls

### 1. File Input Handling

```typescript
// ✅ CORRECT: Use native file input with accept
<input
  type="file"
  accept=".csv,text/csv"
  onChange={(e) => handleFileSelect(e.target.files?.[0])}
/>

// ❌ WRONG: Don't use drag-and-drop without type checking
```

### 2. Error Boundaries

The import process should never crash the app:

```typescript
// ✅ CORRECT: Wrap in try-catch, return structured errors
try {
  const result = await importCsv(file);
  return result;
} catch (error) {
  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error',
  };
}
```

### 3. Progress Updates

For large files, keep UI responsive:

```typescript
// ✅ CORRECT: Yield to UI thread between chunks
for (let i = 0; i < rows.length; i += 100) {
  await processChunk(rows.slice(i, i + 100));
  await new Promise((resolve) => setTimeout(resolve, 0)); // Yield
  setProgress(Math.round((i / rows.length) * 100));
}
```

## Next Steps

1. Run `/speckit.tasks` to generate the task breakdown
2. Create a feature branch if not already on one
3. Implement in the order specified above
4. Write tests alongside each service
5. Run E2E tests before marking complete
