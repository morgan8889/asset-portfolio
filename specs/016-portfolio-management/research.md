# Research & Design Decisions: Portfolio Management

**Feature**: 016-portfolio-management
**Date**: February 3, 2026
**Status**: Complete

## Overview

This document records research findings and design decisions for the portfolio management feature, which adds UI controls for switching between, viewing, editing, and deleting multiple portfolios.

## Technical Research

### 1. Portfolio Selector Component Pattern

**Decision**: Use shadcn/ui Select component with custom trigger in DashboardHeader

**Rationale**:
- Existing project uses shadcn/ui consistently for all form controls
- Select component provides keyboard navigation, accessibility, and search out-of-the-box
- Custom trigger allows displaying current portfolio with badge styling (name + type)
- Supports dropdown positioning, portal rendering for z-index handling

**Alternatives Considered**:
- **Dropdown Menu** (shadcn/ui DropdownMenu): Rejected - designed for actions, not selection. No selected state indication.
- **Combobox**: Rejected - overkill for ~2-5 portfolios (typical), search not needed for small lists
- **Custom dropdown**: Rejected - reinventing shadcn/ui patterns, loses accessibility features

**Implementation Pattern**:
```typescript
<Select value={currentPortfolio?.id} onValueChange={handlePortfolioSwitch}>
  <SelectTrigger className="w-[280px]">
    <SelectValue>
      {currentPortfolio?.name} • {currentPortfolio?.type.toUpperCase()}
    </SelectValue>
  </SelectTrigger>
  <SelectContent>
    {sortedPortfolios.map(p => (
      <SelectItem key={p.id} value={p.id}>
        {p.name} • {p.type.toUpperCase()}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

---

### 2. Portfolio Sort Order Implementation

**Decision**: Track `lastAccessedAt` timestamp in portfolioStore, sort by recency with alphabetical fallback

**Rationale**:
- Clarification confirmed: Most recently used first (US1 acceptance)
- Users typically work with 1-2 portfolios per session
- Recency sorting improves efficiency (fewer clicks to frequently-used portfolios)
- Alphabetical fallback provides predictable ordering for new/unused portfolios

**Implementation Approach**:
- Add `lastAccessedAt: Date` field to Portfolio entity (optional for backward compatibility)
- Update `lastAccessedAt` in `setCurrentPortfolio()` action
- Sort logic: `portfolios.sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0) || a.name.localeCompare(b.name))`
- Current portfolio always shown first regardless of timestamp

**Database Migration**: Schema v5 - Add `lastAccessedAt` column to `portfolios` table (nullable, defaults to null for existing portfolios)

---

### 3. Filter/Sort State Preservation Strategy

**Decision**: Store filter state in page-level component state (not Zustand), selectively preserve on portfolio switch

**Rationale**:
- Clarification confirmed: Preserve type filters and sort, reset date ranges and pagination
- Filter state is page-specific (transactions page filters ≠ holdings page filters)
- Zustand store would create unnecessary coupling between pages
- Component state allows React to handle cleanup naturally on unmount
- Only transaction type and search term preserved - these are cross-portfolio relevant

**Implementation Pattern**:
```typescript
// In TransactionTable component
const [filters, setFilters] = useState({ type: 'all', search: '' });
const [dateRange, setDateRange] = useState(defaultDateRange);

useEffect(() => {
  // Reset date range and pagination on portfolio switch
  setDateRange(defaultDateRange);
  setPagination({ page: 1, pageSize: 25 });
  // filters.type and filters.search preserved automatically (useState)
}, [currentPortfolio?.id]);
```

**Alternative Considered**: URL query parameters for filters - Rejected due to complexity of synchronizing with localStorage persistence and potential for stale state on page refresh.

---

### 4. CSV Import Blocking Mechanism

**Decision**: Use `isImporting` flag in csvImportStore, disable portfolio selector with overlay

**Rationale**:
- Clarification confirmed: Block switching during import to prevent data corruption
- CSV import typically 1-30 seconds - temporary blocking acceptable
- Existing csvImportStore tracks import progress
- Overlay with message provides clear feedback ("Import in progress...")
- Alternative (cancel on switch) risks user frustration and data loss

**Implementation Pattern**:
```typescript
// In PortfolioSelector component
const { isProcessing: isImporting } = useCsvImportStore();

<Select disabled={isImporting}>
  <SelectTrigger>
    {isImporting && <Loader2 className="animate-spin" />}
    <SelectValue />
  </SelectTrigger>
</Select>

{isImporting && (
  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
    <p className="text-sm text-muted-foreground">Import in progress...</p>
  </div>
)}
```

---

### 5. Price Polling Interruption Handling

**Decision**: Stop old portfolio polling, immediately start new portfolio polling in `setCurrentPortfolio()` action

**Rationale**:
- Clarification confirmed: Immediate switch for seamless transition
- Existing priceStore has `startPolling()` and `stopPolling()` methods
- Polling is asset-based, not portfolio-based - need to update watched symbols
- Current implementation: Dashboard watches holdings → extracts symbols → polls prices
- On portfolio switch: holdings change → symbols change → polling updates automatically

**Implementation Pattern**:
```typescript
// In portfolioStore setCurrentPortfolio action
setCurrentPortfolio: (portfolio) => {
  set({ currentPortfolio: portfolio });

  // Update lastAccessedAt for recency sorting
  if (portfolio) {
    updatePortfolioTimestamp(portfolio.id, new Date());
  }

  // Price polling handled by existing useEffect in DashboardContent
  // which watches holdings and updates priceStore.watchedSymbols
}
```

**No code changes needed** - existing price polling architecture already supports this pattern.

---

### 6. Last Portfolio Deletion Behavior

**Decision**: Allow deletion with confirmation dialog, show empty state with "Create Your First Portfolio" prompt

**Rationale**:
- Clarification confirmed: Allow deletion to respect user autonomy
- Users closing accounts need ability to delete all portfolios
- Empty state (DashboardEmptyState component) already exists and handles this scenario
- Confirmation dialog prevents accidental deletion
- Data remains in IndexedDB (holdings, transactions) until explicitly cleared by user

**Implementation Pattern**:
```typescript
// In DeletePortfolioDialog component
if (portfolios.length === 1) {
  confirmMessage = "This is your last portfolio. If you delete it, you'll see an empty state and will need to create a new portfolio to manage investments.";
}

// After deletion
if (portfolios.length === 0) {
  setCurrentPortfolio(null); // Triggers DashboardEmptyState render
}
```

---

### 7. Portfolios Management Page Layout

**Decision**: Use table layout (shadcn/ui Table) with action column, similar to Holdings/Transactions pages

**Rationale**:
- Consistency with existing Holdings and Transactions pages
- Table provides better scanability for portfolio comparison
- Action buttons (View, Edit, Delete) naturally fit in action column
- Responsive: Stack on mobile (<640px), horizontal scroll on tablet
- Card layout considered but rejected - less efficient use of space for tabular data

**Layout Structure**:
```typescript
Columns:
- Portfolio Name (sortable)
- Type (badge: TAXABLE, IRA, 401K, ROTH)
- Total Value (currency formatted, right-aligned)
- YTD Return (percentage, color-coded: green/red)
- Actions (View button, Edit icon, Delete icon)

Features:
- Sortable columns (name, type, value, return)
- Empty state with "Create Your First Portfolio" button
- Skeleton loading state during data fetch
```

---

### 8. Edit Portfolio Dialog Architecture

**Decision**: Reuse existing CreatePortfolioDialog component with edit mode prop

**Rationale**:
- DRY principle - same form fields (name, type, currency, settings)
- Existing validation logic (React Hook Form + Zod) can be reused
- Mode prop determines: dialog title, button text, initial values, action (create vs update)
- Special handling: Warn if changing type with existing transactions (tax implications)

**Implementation Pattern**:
```typescript
<CreatePortfolioDialog
  mode="edit"
  portfolio={portfolioToEdit}
  onSave={updatePortfolio}
/>

// In dialog component
const title = mode === 'edit' ? 'Edit Portfolio' : 'Create Portfolio';
const defaultValues = mode === 'edit' ? portfolio : defaultPortfolioValues;

// Type change warning
if (mode === 'edit' && hasTransactions && data.type !== portfolio.type) {
  showConfirmDialog('Changing portfolio type may affect tax calculations...');
}
```

---

### 9. Delete Confirmation Patterns

**Decision**: Two-tier confirmation based on transaction count

**Rationale**:
- Spec requirement (FR-011): >10 transactions requires typing portfolio name
- Prevents accidental deletion of portfolios with significant data
- Simple confirmation dialog for empty/small portfolios
- Graduated protection based on data volume

**Implementation Pattern**:
```typescript
if (portfolio.transactionCount === 0) {
  // Immediate deletion with simple confirmation
  confirmDialog.title = "Delete Portfolio?";
  confirmDialog.message = "This portfolio has no transactions.";
  confirmDialog.action = () => deletePortfolio(portfolio.id);
}
else if (portfolio.transactionCount <= 10) {
  // Standard confirmation dialog
  confirmDialog.title = "Delete Portfolio?";
  confirmDialog.message = "This will permanently delete all holdings and transactions.";
  confirmDialog.requireConfirm = true;
}
else {
  // Type portfolio name to confirm (high protection)
  confirmDialog.title = "Delete Portfolio?";
  confirmDialog.message = "Type portfolio name to confirm deletion:";
  confirmDialog.requireTypedConfirmation = portfolio.name;
}
```

---

## Integration Points

### Existing Components to Modify

1. **DashboardHeader** (`src/components/dashboard/DashboardHeader.tsx`):
   - Replace static portfolio badges (lines 34-41) with PortfolioSelector component
   - Keep position and styling consistent with current layout

2. **DashboardProvider** (`src/components/dashboard/DashboardProvider.tsx`):
   - Already exposes `portfolios`, `currentPortfolio`, `setCurrentPortfolio`
   - No changes needed - existing API sufficient

3. **CreatePortfolioDialog** (`src/components/forms/create-portfolio.tsx`):
   - Add `mode` prop: 'create' | 'edit'
   - Add `portfolio` prop for edit mode initial values
   - Add type change warning when editing with transactions

4. **Navigation** (`src/lib/config/navigation.ts`):
   - Add new route: `{ name: 'Portfolios', href: '/portfolios', icon: Briefcase }`
   - Insert in Portfolio group after Holdings

### Existing Stores to Extend

1. **portfolioStore** (`src/lib/stores/portfolio.ts`):
   - Add `lastAccessedAt` field to Portfolio type
   - Update `setCurrentPortfolio()` to track timestamp
   - Add `updatePortfolio()` action (currently only has create, no update)
   - Add `deletePortfolio()` action with cascade handling

2. **csvImportStore** (`src/lib/stores/csv-import.ts`):
   - Already has `isProcessing` flag - use for blocking selector
   - No changes needed

3. **priceStore** (`src/lib/stores/price.ts`):
   - No changes needed - existing polling architecture handles portfolio switches

### New Components to Create

1. **PortfolioSelector** (`src/components/portfolio/portfolio-selector.tsx`):
   - Select component with sorted portfolio list
   - Handles switching via setCurrentPortfolio
   - Disabled state during CSV import
   - Keyboard navigation, accessibility

2. **PortfoliosPage** (`src/app/(dashboard)/portfolios/page.tsx`):
   - Table layout with sortable columns
   - Empty state, loading state
   - Action buttons (View, Edit, Delete)

3. **EditPortfolioDialog** (extend CreatePortfolioDialog):
   - Mode prop for edit vs create
   - Type change warning logic
   - Update action instead of create

4. **DeletePortfolioDialog** (`src/components/portfolio/delete-portfolio-dialog.tsx`):
   - Graduated confirmation based on transaction count
   - Name typing requirement for >10 transactions
   - Last portfolio special handling

---

## Performance Considerations

### Portfolio Switching Performance

**Target**: <2 seconds from click to dashboard update (SC-001)

**Optimization Strategy**:
1. **Parallel data loading**: Load holdings, transactions, performance data concurrently
2. **Zustand persistence**: Current portfolio cached in localStorage - instant on page reload
3. **Incremental UI updates**: Update selector immediately, dashboard components load progressively
4. **Price polling**: Existing architecture already optimized (debounced, cached)

**Measurement Points**:
- Click event → `setCurrentPortfolio()` call: <50ms
- Store update → component re-render: <100ms
- Data queries → UI update: <1.5s (holdings, transactions, charts)
- Total: <2s (within SC-001 target)

### Large Portfolio Lists (SC-005)

**Target**: Support 20+ portfolios without degradation

**Optimization Strategy**:
- Select component uses virtual scrolling (Radix Primitive)
- Sort operation: O(n log n) - acceptable for n=20-50
- No pagination needed for dropdown (20 items fit comfortably)
- Render optimization: React.memo for PortfolioSelector

**Testing**: Create test data with 50 portfolios, verify <100ms render time

---

## Security & Privacy

### Data Isolation

**Requirement**: Zero data leakage between portfolios (SC-007)

**Implementation**:
- All queries filtered by `portfolioId`: `db.holdings.where('portfolioId').equals(currentPortfolio.id)`
- Type-safe query helpers enforce portfolioId parameter
- E2E tests verify isolation: create data in Portfolio A, switch to Portfolio B, verify data not visible

### Local Storage Security

**Existing**: All data in IndexedDB (client-side)
**Enhancement**: Portfolio selection state in localStorage (already client-side)
**No changes needed**: Privacy-first architecture maintained

---

## Testing Strategy

### Unit Tests (Vitest)

**portfolioStore** (`src/lib/stores/__tests__/portfolio.test.ts`):
- `setCurrentPortfolio()` updates lastAccessedAt timestamp
- `updatePortfolio()` validates fields, persists to IndexedDB
- `deletePortfolio()` removes portfolio, switches to next portfolio
- Portfolio sorting: recency + alphabetical fallback

**PortfolioSelector** (`src/components/portfolio/__tests__/portfolio-selector.test.tsx`):
- Renders sorted portfolio list
- Calls setCurrentPortfolio on selection
- Disabled state during CSV import
- Keyboard navigation (Arrow keys, Enter)

### E2E Tests (Playwright)

**Portfolio Switching** (`tests/e2e/portfolio-switching.spec.ts`):
- Switch between 3 portfolios → verify dashboard updates
- Persistence: Switch, reload page → verify portfolio remains selected
- CSV import blocking: Start import → selector disabled
- Price polling: Switch portfolios → verify symbols update

**Portfolios Page** (`tests/e2e/portfolios-management.spec.ts`):
- View portfolio list → verify metrics displayed
- Sort by name, type, value, return
- Edit portfolio → change name → verify persistence
- Delete portfolio → verify confirmation → verify removal

**Data Isolation** (`tests/e2e/portfolio-isolation.spec.ts`):
- Create holdings in Portfolio A
- Switch to Portfolio B
- Verify Portfolio A holdings not visible in Portfolio B
- Switch back to Portfolio A → verify holdings reappear

---

## Migration & Rollout

### Database Migration

**Schema v5**:
- Add `lastAccessedAt DATETIME` to `portfolios` table (nullable)
- Existing portfolios default to `null` (alphabetical fallback applies)

**Migration Script** (`src/lib/db/migrations.ts`):
```typescript
{
  version: 5,
  description: 'Add lastAccessedAt to portfolios for recency sorting',
  up: async (db) => {
    // Dexie auto-migrates schema changes
    // lastAccessedAt added as optional field
    logger.info('Added lastAccessedAt field to portfolios table');
  }
}
```

### Backward Compatibility

- Existing portfolios work without `lastAccessedAt` (alphabetical fallback)
- CreatePortfolioDialog works in both create and edit modes
- No breaking changes to existing store APIs

### Rollout Strategy

**Phase 1 (MVP - US1)**: Portfolio selector in header
- Add PortfolioSelector component to DashboardHeader
- Update portfolioStore with lastAccessedAt tracking
- E2E tests for switching and persistence

**Phase 2 (US2)**: Portfolios management page
- Create /portfolios route and PortfoliosPage component
- Add navigation link
- Table layout with metrics

**Phase 3 (US3)**: Edit functionality
- Extend CreatePortfolioDialog for edit mode
- Add updatePortfolio() action
- Type change warning logic

**Phase 4 (US4)**: Delete functionality
- Create DeletePortfolioDialog with graduated confirmation
- Add deletePortfolio() action
- Cascade handling

---

## Open Questions (Resolved in Clarifications)

All critical questions resolved in `/speckit.clarify` session:
1. ✅ Last portfolio deletion: Allow with confirmation
2. ✅ CSV import conflict: Block switching
3. ✅ Price polling: Immediate switch
4. ✅ Sort order: Most recently used first
5. ✅ Filter state: Preserve type/search, reset date/pagination

---

## Dependencies & Assumptions

**Dependencies**:
- shadcn/ui Select component (already installed)
- Existing portfolioStore, csvImportStore, priceStore (no new dependencies)
- Dexie.js schema v5 (migration required)

**Assumptions**:
- Users manage 2-5 portfolios (per spec assumptions)
- Portfolio switching < 5 times per session
- Mobile responsive design follows existing page patterns
- Test coverage target: 80%+ for new code

---

## References

- Feature Spec: `specs/016-portfolio-management/spec.md`
- Constitution: `.specify/memory/constitution.md`
- CLAUDE.md: Architecture guidance and patterns
- Existing Components: DashboardHeader, CreatePortfolioDialog, DashboardProvider
- Existing Stores: portfolioStore, csvImportStore, priceStore
