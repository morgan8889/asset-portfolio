# API Contract: Transaction Store Pagination

## Overview

This contract defines the public API surface for pagination functionality in the `transactionStore`. All pagination operations are exposed through the Zustand store and can be consumed by React components via the `useTransactionStore` hook.

## Store State

### PaginationState

```typescript
interface PaginationState {
  currentPage: number;       // 1-indexed page number
  pageSize: number;          // Items per page (10, 25, 50, or 100)
  totalCount: number;        // Total transactions matching current filters
  totalPages: number;        // Calculated: ceil(totalCount / pageSize)
}
```

**Invariants**:
- `currentPage` ≥ 1
- `currentPage` ≤ `totalPages` (when `totalPages` > 0)
- `pageSize` ∈ {10, 25, 50, 100}
- `totalPages` = `Math.ceil(totalCount / pageSize)`

**Default Values**:
```typescript
{
  currentPage: 1,
  pageSize: 25,
  totalCount: 0,
  totalPages: 0
}
```

## Store Actions

### loadPaginatedTransactions

Load a specific page of transactions with optional filters and sorting.

```typescript
loadPaginatedTransactions: (
  portfolioId: string,
  options: PaginationOptions
) => Promise<void>
```

**Parameters**:
```typescript
interface PaginationOptions {
  page: number;              // Target page (1-indexed)
  pageSize: number;          // Items per page
  sortBy?: 'date' | 'symbol' | 'amount';
  sortOrder?: 'asc' | 'desc';
  filterType?: TransactionType | 'all';
  searchTerm?: string;
}
```

**Behavior**:
1. Validates `portfolioId` (non-empty string)
2. Validates `page` (1 ≤ page ≤ totalPages or page = 1 if totalPages = 0)
3. Validates `pageSize` (10, 25, 50, or 100)
4. Executes count query to get `totalCount`
5. Calculates `totalPages` from `totalCount` and `pageSize`
6. Adjusts `page` if out of bounds (e.g., page 10 when only 5 pages)
7. Executes paginated data query with LIMIT/OFFSET
8. Updates `transactions` array with paginated results
9. Updates `pagination` state
10. Persists pagination state to SessionStorage

**Error Handling**:
- Throws error if `portfolioId` is null or empty
- Throws error if database query fails
- Sets `error` state property with error message

**Example**:
```typescript
const { loadPaginatedTransactions } = useTransactionStore();

await loadPaginatedTransactions('portfolio-123', {
  page: 2,
  pageSize: 50,
  filterType: 'buy',
  sortOrder: 'desc'
});
```

---

### setCurrentPage

Navigate to a specific page without changing filters or page size.

```typescript
setCurrentPage: (page: number) => void
```

**Parameters**:
- `page`: Target page number (1-indexed)

**Behavior**:
1. Validates `page` (1 ≤ page ≤ totalPages)
2. Clamps to valid range if out of bounds
3. Updates `pagination.currentPage`
4. Calls `loadPaginatedTransactions` with updated page
5. Persists to SessionStorage

**Example**:
```typescript
const { setCurrentPage } = useTransactionStore();

// Navigate to next page
setCurrentPage(currentPage + 1);

// Navigate to previous page
setCurrentPage(currentPage - 1);
```

---

### setPageSize

Change the number of items displayed per page, preserving the user's position in the transaction list (FR-006).

```typescript
setPageSize: (size: number) => void
```

**Parameters**:
- `size`: New page size (must be 10, 25, 50, or 100)

**Behavior**:
1. Validates `size` (10, 25, 50, or 100)
2. Falls back to 25 if invalid
3. Calculates new page number to preserve position:
   ```typescript
   const firstItemIndex = (currentPage - 1) * oldPageSize;
   const newPage = Math.floor(firstItemIndex / newSize) + 1;
   ```
4. Updates `pagination.pageSize` and `pagination.currentPage`
5. Calls `loadPaginatedTransactions` with updated parameters
6. Persists to SessionStorage

**Example**:
```typescript
const { setPageSize } = useTransactionStore();

// User on page 3 (51-75) with size 25
// Changes to size 50
setPageSize(50);
// Result: Now on page 2 (51-100) - position preserved
```

---

### resetPagination

Reset pagination to default state (page 1, size 25).

```typescript
resetPagination: () => void
```

**Behavior**:
1. Resets `pagination` to defaults (page 1, size 25, count 0, pages 0)
2. Clears SessionStorage pagination state
3. Calls `loadPaginatedTransactions` with default parameters

**Use Cases**:
- Filter changes (FR-007)
- Search term changes (FR-007)
- Sorting changes (FR-007)
- Portfolio switch

**Example**:
```typescript
const { resetPagination } = useTransactionStore();

// User changes transaction type filter
function handleFilterChange(newType: TransactionType | 'all') {
  resetPagination();  // Back to page 1
  // ... apply new filter
}
```

## Session Persistence

### SessionStorage Key
`transaction-pagination-state`

### Stored Data Structure
```typescript
interface PersistentPaginationState {
  currentPage: number;
  pageSize: number;
  lastPortfolioId: string;
  lastUpdated: string;  // ISO 8601 timestamp
}
```

### Persistence Behavior
- **Save**: On every pagination state change (debounced 100ms)
- **Load**: On store initialization
- **Clear**: On browser close (automatic), on `resetPagination()`, on portfolio switch

### Portfolio Switch Logic
```typescript
// Clear pagination if switching portfolios
if (sessionState.lastPortfolioId !== currentPortfolioId) {
  resetPagination();
}
```

## Component Integration

### Usage in React Components

```typescript
import { useTransactionStore } from '@/lib/stores/transaction';

function TransactionTable() {
  const {
    transactions,
    pagination,
    loading,
    loadPaginatedTransactions,
    setCurrentPage,
    setPageSize,
    resetPagination
  } = useTransactionStore();

  const { currentPortfolio } = usePortfolioStore();

  // Load paginated data
  useEffect(() => {
    if (currentPortfolio?.id) {
      loadPaginatedTransactions(currentPortfolio.id, {
        page: pagination.currentPage,
        pageSize: pagination.pageSize
      });
    }
  }, [currentPortfolio?.id, pagination.currentPage, pagination.pageSize]);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [filterType, searchTerm]);

  return (
    <>
      {/* Transaction table */}
      <Table>
        {transactions.map(t => <TableRow key={t.id} />)}
      </Table>

      {/* Pagination controls (hide if single page) */}
      {pagination.totalPages > 1 && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalCount={pagination.totalCount}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </>
  );
}
```

## Error Scenarios

### Invalid Portfolio ID
```typescript
// Error: Portfolio ID is required
await loadPaginatedTransactions(null, { page: 1, pageSize: 25 });
// Throws: Error('Portfolio ID is required for pagination')
```

### Page Out of Bounds
```typescript
// Scenario: 100 transactions, 25/page = 4 total pages
// User navigates to page 10
setCurrentPage(10);
// Result: Clamped to page 4 (last valid page)
```

### Invalid Page Size
```typescript
// User attempts invalid page size
setPageSize(30);  // Not in [10, 25, 50, 100]
// Result: Falls back to default size 25
```

### Database Query Failure
```typescript
// IndexedDB query fails (rare: corruption, browser bug)
await loadPaginatedTransactions('portfolio-123', { page: 1, pageSize: 25 });
// Result: error property set, loading false, transactions empty
// UI displays error message with retry button
```

## Performance Guarantees

### Query Performance
- **Count Query**: < 50ms (O(1) with index on `portfolioId`)
- **Data Query**: < 200ms (O(log n) + O(pageSize) with index + LIMIT/OFFSET)
- **Total Load Time**: < 250ms per page navigation

### Memory Usage
- **Before Pagination**: O(n) where n = total transactions (1000+ in memory)
- **With Pagination**: O(pageSize) = O(25-100) in memory (constant)
- **Improvement**: ~90% memory reduction for portfolios with 1000+ transactions

### UI Responsiveness
- **Page Navigation**: < 0.5s (spec SC-002)
- **Page Size Change**: < 0.5s (includes re-render)
- **Initial Load**: < 2s for 100+ transactions (spec SC-001)

## Testing Contract

### Unit Tests (Required)
```typescript
describe('Transaction Pagination Store', () => {
  test('loadPaginatedTransactions: loads correct page', async () => {
    // Verify: Page 2 size 25 loads transactions 26-50
  });

  test('setCurrentPage: validates bounds', () => {
    // Verify: Page 10 when max is 5 → clamps to 5
  });

  test('setPageSize: preserves position', () => {
    // Verify: Page 3 size 25 → Page 2 size 50 (position preserved)
  });

  test('resetPagination: clears state', () => {
    // Verify: After reset, page = 1, size = 25
  });

  test('SessionStorage: persists and loads state', () => {
    // Verify: State saved to SessionStorage and loaded on init
  });
});
```

### E2E Tests (Required)
```typescript
test('user navigates between pages', async ({ page }) => {
  // Verify: Clicking Next shows next 25 transactions
});

test('user changes page size', async ({ page }) => {
  // Verify: Position preserved when changing size
});

test('user filters transactions', async ({ page }) => {
  // Verify: Pagination resets to page 1 on filter change
});
```

## Versioning & Compatibility

**Current Version**: 1.0.0

**Breaking Changes**: None (new feature, no existing API modified)

**Deprecations**: None

**Migration Path**: Existing components using `loadTransactions()` can continue working. Pagination is opt-in via new `loadPaginatedTransactions()` action.
