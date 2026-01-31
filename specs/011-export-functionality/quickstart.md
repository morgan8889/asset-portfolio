# Quickstart: Portfolio Export Functionality

**Feature**: 011-export-functionality
**Date**: 2026-01-30

## Prerequisites

Before starting implementation, ensure:

1. You're on the `011-export-functionality` branch
2. Dependencies are installed: `npm install`
3. Dev server runs: `npm run dev`

## New Dependencies

Install the PDF generation libraries:

```bash
npm install jspdf html2canvas jspdf-autotable
npm install -D @types/jspdf @types/html2canvas
```

Note: PapaParse is already installed for CSV generation.

## Implementation Order

### Phase 1: Types and Service Foundation

1. **Add export types** to `src/types/export.ts`:
   - Copy types from `contracts/export-service.ts`
   - Add to `src/types/index.ts` barrel export

2. **Create export service** at `src/lib/services/export-service.ts`:
   - Implement `IExportService` interface
   - Start with data preparation methods (no file generation)

3. **Add unit tests** at `src/lib/services/__tests__/export-service.test.ts`:
   - Test data formatting (dates, decimals)
   - Test empty portfolio handling
   - Test date range filtering

### Phase 2: CSV Export

4. **Implement CSV generators**:
   - `exportTransactionsCsv()` - uses existing `generateCsv()` from csv-parser
   - `exportHoldingsCsv()` - uses existing `downloadCsv()` from csv-export

5. **Wire up Reports page buttons**:
   - Add click handlers to existing stub buttons
   - Add loading states and error toasts

6. **Add date range selector**:
   - Dropdown for YTD/1Y/All selection
   - Only visible for transaction exports

### Phase 3: PDF Export

7. **Create PDF report component** at `src/components/reports/performance-report.tsx`:
   - Renderable version of performance charts for capture
   - Fixed dimensions for consistent output

8. **Implement PDF generator**:
   - Lazy-load jsPDF and html2canvas
   - Capture charts with html2canvas
   - Add tables with jspdf-autotable
   - Trigger download

9. **Add E2E tests** at `tests/e2e/export-reports.spec.ts`:
   - Test PDF download triggers
   - Test CSV content validation
   - Test empty state handling

### Phase 4: Polish

10. **Add progress feedback**:
    - Export progress store
    - Progress indicator in UI
    - Cancel capability for long exports

11. **Handle edge cases**:
    - Empty portfolio messaging
    - Large dataset streaming (if needed)
    - Error recovery and retry

## Key Files to Create

```
src/
├── types/
│   └── export.ts                    # Export types
├── lib/
│   └── services/
│       ├── export-service.ts        # Main export service
│       └── __tests__/
│           └── export-service.test.ts
├── components/
│   └── reports/
│       ├── performance-report.tsx   # PDF-capturable report view
│       ├── export-button.tsx        # Reusable export button with progress
│       └── date-range-select.tsx    # Date range dropdown
tests/
└── e2e/
    └── export-reports.spec.ts       # E2E tests
```

## Key Files to Modify

```
src/
├── app/(dashboard)/reports/
│   └── page.tsx                     # Wire up export handlers
├── lib/stores/
│   └── export.ts                    # New store for progress tracking
└── types/
    └── index.ts                     # Add export types to barrel
```

## Code Patterns

### Lazy Loading PDF Libraries

```typescript
const generatePdf = async () => {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  // Use libraries...
};
```

### CSV Generation with Formatting

```typescript
import Papa from 'papaparse';
import { format } from 'date-fns';
import Decimal from 'decimal.js';

const formattedRows = transactions.map((tx) => ({
  Date: format(tx.date, 'yyyy-MM-dd'),
  Type: tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
  Quantity: new Decimal(tx.quantity).toFixed(4),
  Price: new Decimal(tx.price).toFixed(2),
  // ...
}));

const csv = Papa.unparse(formattedRows, { escapeFormulae: true });
```

### Chart Capture for PDF

```typescript
const captureChart = async (
  elementRef: React.RefObject<HTMLDivElement>
): Promise<string> => {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(elementRef.current!, {
    scale: 2,
    useCORS: true,
    logging: false,
  });
  return canvas.toDataURL('image/png');
};
```

## Testing Commands

```bash
# Unit tests for export service
npm run test -- --run src/lib/services/__tests__/export-service.test.ts

# E2E tests for export workflow
npx playwright test tests/e2e/export-reports.spec.ts --project=chromium

# Type checking
npm run type-check
```

## Success Criteria Verification

| Criteria | How to Verify |
|----------|---------------|
| SC-001: PDF < 3s | Console.time in generatePerformancePdf |
| SC-002: CSV 5K rows < 1s | Unit test with mock 5K transactions |
| SC-003: CSV validates | Open in Excel/Numbers/Sheets |
| SC-004: No network | DevTools Network tab during export |

## Common Pitfalls

1. **Don't forget `escapeFormulae: true`** in Papa.unparse to prevent CSV injection
2. **Use `scale: 2`** in html2canvas options for crisp PDF output
3. **Pre-format Decimal.js values** before passing to Papa.unparse
4. **Handle empty portfolios gracefully** - disable buttons or show message
5. **Lazy load PDF libraries** to avoid initial bundle bloat
