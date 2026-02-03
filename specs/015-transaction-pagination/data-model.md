# Data Model: Transaction Page Pagination

## Entity Overview

This feature introduces pagination metadata and state management for the existing `Transaction` entity. No database schema changes are required - pagination is implemented via query parameters (LIMIT/OFFSET) on the existing `transactions` table.

## Core Entities

### PaginationState (New Interface)

Represents the current pagination state in the Zustand transaction store.

```typescript
interface PaginationState {
  currentPage: number;       // 1-indexed page number (default: 1)
  pageSize: number;          // Items per page: 10 | 25 | 50 | 100 (default: 25)
  totalCount: number;        // Total transactions matching current filters
  totalPages: number;        // Calculated: Math.ceil(totalCount / pageSize)
}
```

**Business Rules**:
- `currentPage` must be ≥ 1 and ≤ `totalPages`
- `pageSize` must be one of: 10, 25, 50, 100
- `totalPages` is always calculated, never set directly
- When `totalCount` changes, `currentPage` may need adjustment (e.g., if on page 10 but only 5 pages remain)

**Lifecycle**:
- **Initialization**: Load from SessionStorage or use defaults (page 1, size 25)
- **Persistence**: Save to SessionStorage on every change
- **Reset**: On browser close (session ends), on filter/sort changes
- **Updates**: On page navigation, page size change, transaction add/delete

### PaginationOptions (Query Parameters)

Parameters passed to IndexedDB queries for paginated data retrieval.

```typescript
interface PaginationOptions {
  page: number;              // Current page (1-indexed)
  pageSize: number;          // Items per page
  portfolioId: string;       // Filter by portfolio
  sortBy?: 'date' | 'symbol' | 'amount';  // Sort field (default: 'date')
  sortOrder?: 'asc' | 'desc'; // Sort direction (default: 'desc')
  filterType?: TransactionType | 'all'; // Transaction type filter
  searchTerm?: string;       // Text search (symbol or notes)
}
```

**Derived Calculations**:
```typescript
// Calculate offset for LIMIT/OFFSET query
const offset = (page - 1) * pageSize;
const limit = pageSize;

// Calculate item range for display
const firstItem = offset + 1;
const lastItem = Math.min(offset + pageSize, totalCount);
// Display: "Showing {firstItem}-{lastItem} of {totalCount}"
```

### Transaction (Existing Entity - No Changes)

The existing `Transaction` entity remains unchanged. Pagination queries use the existing schema:

```typescript
interface Transaction {
  id: string;
  portfolioId: string;       // Indexed for efficient filtering
  assetId: string;
  type: TransactionType;
  date: Date;                // Indexed for sorting
  quantity: Decimal;
  price: Decimal;
  totalAmount: Decimal;
  fees: Decimal;
  notes?: string;
  // ... other fields (tax metadata, etc.)
}
```

**Indexed Fields** (relevant for pagination performance):
- `portfolioId`: Primary filter for all queries
- `date`: Used for default sorting (DESC)
- Compound index `[portfolioId+type]`: For type filtering

## State Management

### Zustand TransactionStore Additions

New state properties and actions added to the existing `transactionStore`:

```typescript
interface TransactionStore {
  // Existing state...
  transactions: Transaction[];
  loading: boolean;
  error: string | null;

  // NEW: Pagination state
  pagination: PaginationState;

  // NEW: Pagination actions
  loadPaginatedTransactions: (
    portfolioId: string,
    options: PaginationOptions
  ) => Promise<void>;

  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  resetPagination: () => void;

  // Existing actions...
  loadTransactions: (portfolioId: string) => Promise<void>;
  // ... other actions
}
```

**Action Implementations**:

1. **loadPaginatedTransactions**:
   - Executes count query to get `totalCount`
   - Calculates `totalPages` from `totalCount` and `pageSize`
   - Executes paginated query with LIMIT/OFFSET
   - Updates `transactions` array with paginated results
   - Updates `pagination` state
   - Persists to SessionStorage

2. **setCurrentPage**:
   - Validates page number (1 ≤ page ≤ totalPages)
   - Updates `currentPage` in state
   - Triggers `loadPaginatedTransactions` with new page
   - Persists to SessionStorage

3. **setPageSize**:
   - Validates page size (10, 25, 50, or 100)
   - Calculates new page number to maintain position (FR-006)
   - Updates `pageSize` and `currentPage` in state
   - Triggers `loadPaginatedTransactions` with new parameters
   - Persists to SessionStorage

4. **resetPagination**:
   - Resets to defaults (page 1, size 25)
   - Clears SessionStorage
   - Triggers `loadPaginatedTransactions`

### SessionStorage Schema

Pagination state is persisted in SessionStorage under the key `transaction-pagination-state`:

```json
{
  "currentPage": 3,
  "pageSize": 50,
  "lastPortfolioId": "portfolio-123",
  "lastUpdated": "2026-02-03T12:34:56.789Z"
}
```

**Lifecycle**:
- **Load**: On TransactionStore initialization, check SessionStorage
- **Save**: On every pagination state change (debounced 100ms)
- **Clear**: On browser close (automatic), on explicit reset
- **Portfolio Switch**: Clear if `currentPortfolioId !== lastPortfolioId`

## Query Patterns

### Count Query (Total Transactions)

```typescript
// Base count (no filters)
const totalCount = await db.transactions
  .where('portfolioId')
  .equals(portfolioId)
  .count();

// With type filter
const totalCount = await db.transactions
  .where(['portfolioId', 'type'])
  .equals([portfolioId, filterType])
  .count();

// With text search (requires in-memory filtering)
const filtered = await db.transactions
  .where('portfolioId')
  .equals(portfolioId)
  .filter(t =>
    t.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  .toArray();
const totalCount = filtered.length;
```

### Paginated Data Query

```typescript
// Basic pagination (newest first)
const transactions = await db.transactions
  .where('portfolioId')
  .equals(portfolioId)
  .reverse()  // DESC date order
  .offset((page - 1) * pageSize)
  .limit(pageSize)
  .toArray();

// With type filter
const transactions = await db.transactions
  .where(['portfolioId', 'type'])
  .equals([portfolioId, filterType])
  .reverse()
  .offset((page - 1) * pageSize)
  .limit(pageSize)
  .toArray();

// With sorting (ascending date)
const transactions = await db.transactions
  .where('portfolioId')
  .equals(portfolioId)
  .sortBy('date')  // ASC order
  .then(sorted =>
    sorted.slice((page - 1) * pageSize, page * pageSize)
  );
```

### Combined Query Performance

```typescript
async function loadPage(portfolioId: string, page: number, pageSize: number) {
  // Query 1: Count (O(1) with index) - ~10ms
  const totalCount = await db.transactions
    .where('portfolioId').equals(portfolioId)
    .count();

  // Query 2: Paginated data (O(log n) + O(pageSize)) - ~50ms
  const transactions = await db.transactions
    .where('portfolioId').equals(portfolioId)
    .reverse()
    .offset((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();

  // Total: ~60ms (well under 200ms target)
  return { transactions, totalCount };
}
```

## Edge Case Handling

### 1. Page Out of Bounds
```typescript
// After deleting transactions, current page may exceed totalPages
if (pagination.currentPage > pagination.totalPages && pagination.totalPages > 0) {
  // Auto-navigate to last page
  setCurrentPage(pagination.totalPages);
}
```

### 2. Empty Result Set
```typescript
if (totalCount === 0) {
  // Hide pagination controls (FR-008)
  // Show "No transactions found" message
  return null;  // Don't render PaginationControls
}
```

### 3. Single Page Result
```typescript
if (totalPages <= 1) {
  // Hide pagination controls (FR-008)
  return null;
}
```

### 4. Filter Change
```typescript
// When filter or search changes
function onFilterChange(newFilter: TransactionType | 'all') {
  resetPagination();  // Back to page 1
  loadPaginatedTransactions(portfolioId, {
    page: 1,
    pageSize: pagination.pageSize,
    filterType: newFilter
  });
}
```

## Validation Rules

### Page Number Validation
```typescript
function validatePageNumber(page: number, totalPages: number): number {
  // Ensure within bounds
  if (page < 1) return 1;
  if (page > totalPages && totalPages > 0) return totalPages;
  return page;
}
```

### Page Size Validation
```typescript
const VALID_PAGE_SIZES = [10, 25, 50, 100] as const;

function validatePageSize(size: number): number {
  // Ensure valid option
  if (VALID_PAGE_SIZES.includes(size as any)) {
    return size;
  }
  return 25;  // Default fallback
}
```

## Testing Considerations

### Unit Tests (Vitest)
- `calculatePaginationMetadata(totalCount, pageSize, currentPage)`: Verify calculations
- `preservePositionOnPageSizeChange(oldPage, oldSize, newSize)`: Verify position logic
- `validatePaginationState(state)`: Verify validation rules
- Query performance benchmarks with mock data (100, 1000, 10000 transactions)

### E2E Tests (Playwright)
- Navigate between pages, verify data updates
- Change page size, verify position preservation
- Add transaction on last page, verify count updates
- Filter transactions, verify reset to page 1
- Browser refresh, verify SessionStorage persistence
- Open in new tab, verify fresh pagination state (session-only)
