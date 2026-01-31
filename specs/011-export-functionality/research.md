# Research: Portfolio Export Functionality

**Feature**: 011-export-functionality
**Date**: 2026-01-30

## Technology Decisions

### 1. PDF Generation Library

**Decision**: html2canvas + jsPDF

**Rationale**:
- Works with existing Recharts components without modification or version constraints
- Low implementation effort - wrap existing chart/table components and capture them
- Combined bundle size ~130KB gzipped is acceptable for on-demand loading
- Well-documented approach for React chart exports
- Can use `scale: 2` option to mitigate blurry text on high-DPI screens

**Alternatives Considered**:

| Library | Rejected Because |
|---------|------------------|
| @react-pdf/renderer | react-pdf-charts does NOT support Recharts v3+; would require rebuilding all chart components |
| pdfmake | Not React-native (JSON-based API); charts require manual conversion to SVG/images |
| jsPDF alone | Requires html2canvas anyway for DOM capture |

**Implementation Notes**:
- Lazy-load both libraries to avoid bundle impact on initial page load
- Use `scale: 2` in html2canvas options for crisp output
- jspdf-autotable plugin for table sections (produces crisp text unlike captured tables)

### 2. CSV Generation Library

**Decision**: PapaParse (Papa.unparse)

**Rationale**:
- Already installed in project (v5.4.1) with TypeScript types
- Proven in codebase - `generateCsv()` exists in `csv-parser.ts`
- Consistency - same library for import and export ensures consistent CSV handling
- Built-in `escapeFormulae` option prevents CSV injection attacks
- Expected export sizes (under 10K transactions) don't require streaming

**Alternatives Considered**:

| Library | Rejected Because |
|---------|------------------|
| csv-stringify | Additional dependency; historical TypeScript issues with browser paths |
| Native Blob API | Must implement RFC 4180 escaping manually; maintenance burden |

**Implementation Notes**:
- Pre-format dates with date-fns before passing to Papa.unparse
- Pre-format Decimal.js values to fixed decimal places
- Use `escapeFormulae: true` to prevent formula injection

### 3. Date/Number Formatting Strategy

**Decision**: Pre-format data before CSV generation

**Rationale**:
- PapaParse doesn't have built-in formatters
- Aligns with existing pattern of using date-fns throughout codebase
- Maintains financial precision by formatting Decimal.js values explicitly

**Pattern**:
```typescript
const formattedData = data.map(row => ({
  Date: format(row.date, 'yyyy-MM-dd'),
  Amount: new Decimal(row.amount).toFixed(2),
  // ...
}));
```

### 4. File Download Strategy

**Decision**: Browser Blob API with dynamic anchor element

**Rationale**:
- Already implemented in codebase (`downloadCsv` in csv-export.ts)
- Works across all modern browsers
- No server involvement - maintains privacy-first architecture

**Pattern**:
```typescript
const blob = new Blob([content], { type: mimeType });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = filename;
link.click();
URL.revokeObjectURL(url);
```

## Existing Codebase Integration

### Available Utilities (No New Code Needed)

| Utility | Location | Purpose |
|---------|----------|---------|
| `generateCsv()` | `src/lib/services/csv-parser.ts` | PapaParse wrapper |
| `downloadCsv()` | `src/lib/utils/csv-export.ts` | Browser download trigger |
| `format()` | date-fns | Date formatting |
| `Decimal` | decimal.js | Financial precision |

### Data Access Patterns

| Data Type | Access Method | Location |
|-----------|---------------|----------|
| Holdings | `getHoldingsByPortfolio(portfolioId)` | `src/lib/db/queries.ts` |
| Transactions | `getTransactionsByPortfolio(portfolioId)` | `src/lib/db/queries.ts` |
| Assets | `getAssetById(assetId)` | `src/lib/db/queries.ts` |
| Allocation | `getAllocationBreakdown()` | `src/lib/services/allocation/` |
| Performance | `usePerformanceStore` | `src/lib/stores/performance.ts` |

### Chart Components for PDF Capture

| Chart | Location | Type |
|-------|----------|------|
| Performance/Growth | `src/components/charts/performance-chart.tsx` | AreaChart |
| Allocation Donut | `src/components/allocation/allocation-donut-chart.tsx` | PieChart |
| Portfolio Value | `src/components/charts/portfolio-chart.tsx` | AreaChart |

## Performance Considerations

### PDF Generation

- **Target**: < 3 seconds for standard portfolios (SC-001)
- **Approach**:
  - Render charts at fixed dimensions for consistent capture
  - Use `scale: 2` for quality without excessive file size
  - Lazy-load jsPDF and html2canvas

### CSV Generation

- **Target**: < 1 second for 5,000 transactions (SC-002)
- **Approach**:
  - PapaParse handles this volume easily (~50ms for 10K rows)
  - Pre-format data before unparse to avoid repeated formatting
  - Generate in single pass, no streaming needed

### Bundle Size Impact

| Library | Size (gzipped) | Loading Strategy |
|---------|----------------|------------------|
| jsPDF | ~90KB | Dynamic import on export click |
| html2canvas | ~40KB | Dynamic import on export click |
| jspdf-autotable | ~15KB | Dynamic import on export click |
| PapaParse | ~7.6KB | Already bundled |

**Total new bundle impact**: ~145KB, loaded on-demand only

## Privacy Verification

All export operations satisfy FR-006 (local-only processing):

- PDF generation: html2canvas captures DOM locally, jsPDF generates file locally
- CSV generation: PapaParse runs entirely in browser
- File download: Blob API creates local file, no network requests
- No telemetry or analytics in any library
