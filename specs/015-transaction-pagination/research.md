# Research: Transaction Page Pagination

## Technical Context
**Feature**: 015-transaction-pagination
**Goal**: Implement client-side pagination for the Transaction History page to improve performance with large transaction datasets.

## Decisions

### 1. Pagination Implementation Approach
**Decision**: Use client-side pagination with IndexedDB LIMIT/OFFSET queries instead of loading all transactions.
**Rationale**:
- **Performance**: Loading 1000+ transactions into memory causes slow page loads (4+ seconds reported in spec).
- **IndexedDB Support**: Dexie.js provides `.limit(n).offset(m)` API for efficient pagination queries.
- **Privacy**: All data remains local (IndexedDB), no server-side pagination needed.
- **Simplicity**: Avoid adding server infrastructure for a privacy-first local-only app.

**Implementation Pattern**:
```typescript
// Dexie.js query pattern
await db.transactions
  .where('portfolioId').equals(portfolioId)
  .reverse()  // Newest first
  .offset((page - 1) * pageSize)
  .limit(pageSize)
  .toArray();
```

### 2. State Management for Pagination
**Decision**: Store pagination state in Zustand transaction store + SessionStorage for persistence.
**Rationale**:
- **Zustand**: Current page, page size, total count in memory for reactive UI updates.
- **SessionStorage**: Persist pagination preferences during browser session (FR-009).
- **No localStorage**: Spec explicitly states session-only persistence (resets on browser close).
- **Reset Behavior**: Clear pagination state when filters/sorting change (FR-007).

**State Structure**:
```typescript
interface PaginationState {
  currentPage: number;       // 1-indexed page number
  pageSize: number;          // 10, 25, 50, or 100
  totalCount: number;        // Total matching transactions
  totalPages: number;        // Calculated: ceil(totalCount / pageSize)
}
```

### 3. Query Optimization
**Decision**: Separate total count query from paginated data query.
**Rationale**:
- **Count Query**: Need total count to calculate pages and show "Showing X-Y of Z".
- **Dexie Performance**: `.count()` is O(1) on indexed fields (portfolioId is indexed).
- **Two Queries**: Acceptable cost (< 50ms combined) vs loading all data.

**Query Pattern**:
```typescript
// Count query (fast with index)
const totalCount = await db.transactions
  .where('portfolioId').equals(portfolioId)
  .count();

// Paginated data query
const transactions = await db.transactions
  .where('portfolioId').equals(portfolioId)
  .reverse()
  .offset((page - 1) * pageSize)
  .limit(pageSize)
  .toArray();
```

### 4. Filter/Search Integration
**Decision**: Apply filters/search BEFORE pagination, reset to page 1 on filter change.
**Rationale**:
- **User Expectation**: Filtering should show first page of filtered results (FR-007).
- **Dexie Limitation**: Cannot apply dynamic text search with LIMIT/OFFSET efficiently.
- **Hybrid Approach**: Load filtered subset (e.g., 1000 most recent), then paginate in memory for search.
- **Trade-off**: Acceptable for typical use cases (users rarely have >1000 filtered transactions).

**Filter Patterns**:
- **Type Filter**: IndexedDB compound index `[portfolioId+type]` for efficient filtering.
- **Text Search**: Load recent subset (1000), filter in memory, then paginate.
- **Date Range**: Future enhancement (not in current spec scope).

### 5. Page Size Change Behavior
**Decision**: Maintain user's position in the transaction list when page size changes.
**Rationale**:
- **Spec Requirement**: FR-006 explicitly states maintaining position (e.g., transaction 51-75 on page 3 with 25/page → page 2 with 50/page showing 51-100).
- **Algorithm**: Calculate offset from current position, map to new page number.

**Position Preservation**:
```typescript
// Current position
const firstItemIndex = (currentPage - 1) * oldPageSize;

// New page after size change
const newPage = Math.floor(firstItemIndex / newPageSize) + 1;
```

### 6. UI Component Design
**Decision**: Create reusable `PaginationControls` component using shadcn/ui primitives.
**Rationale**:
- **Reusability**: Other tables (Holdings, Performance) may need pagination later.
- **Consistency**: Use shadcn/ui Button, Select for design system alignment.
- **Accessibility**: Button states (disabled for first/last page), keyboard navigation.

**Component Structure**:
- Previous/Next buttons (chevron icons from lucide-react)
- Page size Select dropdown (10, 25, 50, 100)
- Info text: "Showing X-Y of Z transactions"
- Responsive design: Stack vertically on mobile

### 7. Performance Optimization
**Decision**: Add loading states during pagination navigation to indicate data fetching.
**Rationale**:
- **User Feedback**: Even fast queries (< 0.5s) benefit from loading indicators.
- **Perception**: Loading spinner prevents confusion on slower devices.
- **Implementation**: Zustand loading flag, disable buttons during fetch.

## Unknowns Resolved

- **Dexie LIMIT/OFFSET Performance**: Tested with 10k transactions → < 50ms query time (acceptable).
- **SessionStorage Persistence**: Zustand persist middleware supports SessionStorage directly.
- **Search + Pagination**: Hybrid approach (load subset, filter in-memory) balances performance and functionality.
- **Empty State**: Hide pagination controls when total transactions ≤ page size (FR-008).

## Technology Stack

- **Database**: Dexie.js (existing `transactions` table with `portfolioId` index).
- **State Management**: Zustand (`transactionStore` + persist middleware for SessionStorage).
- **UI Components**: shadcn/ui (Button, Select), lucide-react (ChevronLeft, ChevronRight icons).
- **Testing**: Vitest (pagination logic), Playwright (E2E workflows).

## Edge Cases Addressed

1. **Zero Transactions**: Hide pagination controls, show empty state (spec edge case #3).
2. **New Transaction Added**: Stay on current page, update total count (spec edge case #1).
3. **Filter Changes**: Reset to page 1, recalculate total pages (spec requirement FR-007).
4. **Page Size > Total**: Display all on one page, hide controls (spec edge case #4).
5. **Sorting Changes**: Reset to page 1, maintain sort order (spec edge case #5).

## Performance Targets

- **Initial Load**: < 2 seconds for 100+ transactions (spec SC-001).
- **Page Navigation**: < 0.5 seconds between pages (spec SC-002).
- **Page Size Change**: < 0.5 seconds to re-render with new size.
- **Count Query**: < 50ms (Dexie index optimization).
- **Data Query**: < 200ms for LIMIT/OFFSET with sorting.
