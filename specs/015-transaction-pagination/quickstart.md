# Quickstart: Transaction Page Pagination

## Development Setup

### Prerequisites
- Node.js 18+ installed
- Repository cloned and dependencies installed (`npm install`)
- Familiarity with Next.js 14 App Router, React, Zustand, Dexie.js

### Development Commands
```bash
# Start dev server
npm run dev  # http://localhost:3000

# Type checking (run frequently during development)
npm run type-check

# Unit tests (write tests first per TDD)
npm run test  # Vitest
npm run test:watch  # Watch mode

# E2E tests
npm run test:e2e  # Playwright

# Linting
npm run lint
npm run lint:fix
```

## Implementation Order (TDD Approach)

### Phase 1: Data Layer (Zustand Store)
**Duration**: ~2-3 hours | **Files**: `src/lib/stores/transaction.ts`, `src/types/transaction.ts`

1. **Write Tests First** (`src/lib/stores/__tests__/transaction-pagination.test.ts`):
   ```typescript
   describe('Transaction Pagination', () => {
     it('should initialize with default pagination state', () => {
       // Test: page 1, size 25, count 0, pages 0
     });

     it('should calculate total pages correctly', () => {
       // Test: 100 transactions, 25/page = 4 pages
     });

     it('should preserve position when changing page size', () => {
       // Test: Page 3 (51-75 of 100, size 25) → Page 2 (51-100, size 50)
     });

     it('should reset to page 1 when filter changes', () => {
       // Test: On page 3, change filter → page 1
     });

     it('should handle out-of-bounds page navigation', () => {
       // Test: Navigate to page 10 when only 5 pages exist → clamp to 5
     });
   });
   ```

2. **Add Types** (`src/types/transaction.ts`):
   ```typescript
   export interface PaginationState {
     currentPage: number;
     pageSize: number;
     totalCount: number;
     totalPages: number;
   }

   export interface PaginationOptions {
     page: number;
     pageSize: number;
     portfolioId: string;
     sortBy?: 'date' | 'symbol' | 'amount';
     sortOrder?: 'asc' | 'desc';
     filterType?: TransactionType | 'all';
     searchTerm?: string;
   }
   ```

3. **Implement Store** (`src/lib/stores/transaction.ts`):
   ```typescript
   interface TransactionStore {
     // Add pagination state
     pagination: PaginationState;

     // Add pagination actions
     loadPaginatedTransactions: (
       portfolioId: string,
       options: PaginationOptions
     ) => Promise<void>;
     setCurrentPage: (page: number) => void;
     setPageSize: (size: number) => void;
     resetPagination: () => void;
   }

   // Implementation details in data-model.md
   ```

4. **Add SessionStorage Persistence**:
   ```typescript
   import { persist } from 'zustand/middleware';

   // Persist pagination to SessionStorage (not localStorage)
   export const useTransactionStore = create<TransactionStore>()(
     persist(
       (set, get) => ({ /* implementation */ }),
       {
         name: 'transaction-pagination-state',
         storage: createJSONStorage(() => sessionStorage),
         partialize: (state) => ({ pagination: state.pagination })
       }
     )
   );
   ```

5. **Verify**: Run `npm run test` - all pagination tests should pass.

### Phase 2: Database Queries (Dexie)
**Duration**: ~1-2 hours | **Files**: `src/lib/db/queries.ts`

1. **Write Tests First** (`src/lib/db/__tests__/pagination-queries.test.ts`):
   ```typescript
   describe('Paginated Transaction Queries', () => {
     beforeEach(async () => {
       // Setup: Create 100 mock transactions in test DB
     });

     it('should return correct page of transactions', async () => {
       // Test: Page 2, size 25 → transactions 26-50
     });

     it('should count total transactions correctly', async () => {
       // Test: 100 transactions → count = 100
     });

     it('should apply type filter before pagination', async () => {
       // Test: 20 "buy" transactions → page 1 size 10 → 10 "buy" transactions
     });

     it('should sort by date DESC by default', async () => {
       // Test: Most recent transaction first
     });
   });
   ```

2. **Add Paginated Query Functions** (`src/lib/db/queries.ts`):
   ```typescript
   export async function getPaginatedTransactions(
     portfolioId: string,
     options: PaginationOptions
   ): Promise<{ transactions: Transaction[]; totalCount: number }> {
     const { page, pageSize, filterType, searchTerm } = options;
     const offset = (page - 1) * pageSize;

     // Count query
     let countQuery = db.transactions.where('portfolioId').equals(portfolioId);
     if (filterType && filterType !== 'all') {
       countQuery = db.transactions.where(['portfolioId', 'type'])
         .equals([portfolioId, filterType]);
     }
     const totalCount = await countQuery.count();

     // Data query
     let dataQuery = db.transactions.where('portfolioId').equals(portfolioId);
     if (filterType && filterType !== 'all') {
       dataQuery = db.transactions.where(['portfolioId', 'type'])
         .equals([portfolioId, filterType]);
     }

     const transactions = await dataQuery
       .reverse()  // DESC date order
       .offset(offset)
       .limit(pageSize)
       .toArray();

     return { transactions, totalCount };
   }
   ```

3. **Verify**: Run `npm run test` - all query tests should pass.

### Phase 3: UI Components
**Duration**: ~3-4 hours | **Files**: `src/components/tables/pagination-controls.tsx`, `src/components/tables/transaction-table.tsx`

1. **Create PaginationControls Component** (`src/components/tables/pagination-controls.tsx`):
   ```typescript
   interface PaginationControlsProps {
     currentPage: number;
     totalPages: number;
     pageSize: number;
     totalCount: number;
     onPageChange: (page: number) => void;
     onPageSizeChange: (size: number) => void;
   }

   export function PaginationControls({ ... }: PaginationControlsProps) {
     const firstItem = (currentPage - 1) * pageSize + 1;
     const lastItem = Math.min(currentPage * pageSize, totalCount);

     return (
       <div className="flex items-center justify-between">
         {/* Info text: "Showing X-Y of Z transactions" */}
         <div className="text-sm text-muted-foreground">
           Showing {firstItem}-{lastItem} of {totalCount} transactions
         </div>

         {/* Navigation controls */}
         <div className="flex items-center gap-4">
           {/* Page size selector */}
           <Select value={pageSize.toString()} onValueChange={...}>
             <option value="10">10 per page</option>
             <option value="25">25 per page</option>
             <option value="50">50 per page</option>
             <option value="100">100 per page</option>
           </Select>

           {/* Previous/Next buttons */}
           <div className="flex gap-2">
             <Button
               variant="outline"
               size="sm"
               onClick={() => onPageChange(currentPage - 1)}
               disabled={currentPage === 1}
             >
               <ChevronLeft className="h-4 w-4" />
               Previous
             </Button>
             <Button
               variant="outline"
               size="sm"
               onClick={() => onPageChange(currentPage + 1)}
               disabled={currentPage === totalPages}
             >
               Next
               <ChevronRight className="h-4 w-4" />
             </Button>
           </div>
         </div>
       </div>
     );
   }
   ```

2. **Integrate into TransactionTable** (`src/components/tables/transaction-table.tsx`):
   ```typescript
   // Replace loadTransactions() with loadPaginatedTransactions()
   const {
     transactions,
     pagination,
     loading,
     loadPaginatedTransactions,
     setCurrentPage,
     setPageSize,
     resetPagination
   } = useTransactionStore();

   // Load paginated data
   useEffect(() => {
     if (currentPortfolio?.id) {
       loadPaginatedTransactions(currentPortfolio.id, {
         page: pagination.currentPage,
         pageSize: pagination.pageSize,
         filterType,
         searchTerm
       });
     }
   }, [currentPortfolio?.id, pagination.currentPage, pagination.pageSize, filterType, searchTerm]);

   // Reset pagination when filters change
   useEffect(() => {
     resetPagination();
   }, [filterType, searchTerm]);

   // Render pagination controls (hide if totalPages <= 1)
   return (
     <Card>
       {/* ... table content ... */}

       {pagination.totalPages > 1 && (
         <CardFooter>
           <PaginationControls
             currentPage={pagination.currentPage}
             totalPages={pagination.totalPages}
             pageSize={pagination.pageSize}
             totalCount={pagination.totalCount}
             onPageChange={setCurrentPage}
             onPageSizeChange={setPageSize}
           />
         </CardFooter>
       )}
     </Card>
   );
   ```

3. **Write Component Tests** (`src/components/tables/__tests__/pagination-controls.test.tsx`):
   ```typescript
   describe('PaginationControls', () => {
     it('should render info text correctly', () => {
       // Test: "Showing 1-25 of 100 transactions"
     });

     it('should disable Previous button on first page', () => {
       // Test: currentPage = 1 → Previous disabled
     });

     it('should disable Next button on last page', () => {
       // Test: currentPage = totalPages → Next disabled
     });

     it('should call onPageChange when clicking Next', () => {
       // Test: Click Next → onPageChange(currentPage + 1)
     });

     it('should call onPageSizeChange when selecting new size', () => {
       // Test: Select 50 → onPageSizeChange(50)
     });
   });
   ```

4. **Verify**: Run `npm run test` - all component tests should pass.

### Phase 4: E2E Testing
**Duration**: ~2 hours | **Files**: `tests/e2e/transaction-pagination.spec.ts`

1. **Write E2E Test Scenarios**:
   ```typescript
   test('should paginate transactions with default size', async ({ page }) => {
     // Setup: Create 100 transactions
     // 1. Navigate to /transactions
     // 2. Verify: "Showing 1-25 of 100 transactions"
     // 3. Click "Next"
     // 4. Verify: "Showing 26-50 of 100 transactions"
   });

   test('should change page size and preserve position', async ({ page }) => {
     // Setup: Create 100 transactions, navigate to page 3 (51-75)
     // 1. Select "50 per page"
     // 2. Verify: Now on page 2 showing 51-100
   });

   test('should reset to page 1 when filtering', async ({ page }) => {
     // 1. Navigate to page 3
     // 2. Select filter "Buy"
     // 3. Verify: Back to page 1 with filtered results
   });

   test('should persist pagination state in session', async ({ page }) => {
     // 1. Navigate to page 3, size 50
     // 2. Navigate to /holdings
     // 3. Navigate back to /transactions
     // 4. Verify: Still on page 3, size 50
   });

   test('should hide pagination controls for single page', async ({ page }) => {
     // Setup: Create 10 transactions (less than default page size)
     // 1. Navigate to /transactions
     // 2. Verify: No pagination controls visible
   });
   ```

2. **Verify**: Run `npm run test:e2e` - all E2E tests should pass.

## Verification Checklist

Before marking feature complete, verify:

- [ ] All unit tests pass (`npm run test`)
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] Type checking passes (`npm run type-check`)
- [ ] Linting passes (`npm run lint`)
- [ ] Performance: Page load < 2s with 100+ transactions
- [ ] Performance: Navigation < 0.5s between pages
- [ ] UI: Previous button disabled on page 1
- [ ] UI: Next button disabled on last page
- [ ] UI: Page size options: 10, 25, 50, 100
- [ ] UI: Info text displays correct range
- [ ] Edge Case: Zero transactions → no pagination controls
- [ ] Edge Case: Single page → no pagination controls
- [ ] Edge Case: Filter change → reset to page 1
- [ ] Edge Case: Page size change → position preserved
- [ ] SessionStorage: Pagination state persists during session
- [ ] SessionStorage: State clears on browser close

## Common Issues & Solutions

### Issue: Pagination controls not appearing
**Cause**: `totalPages <= 1` or `totalCount === 0`
**Solution**: Check `pagination.totalCount` in store, verify count query returns correct value

### Issue: Wrong page displayed after filter change
**Cause**: Forgot to call `resetPagination()` on filter change
**Solution**: Add `useEffect(() => { resetPagination(); }, [filterType, searchTerm])`

### Issue: Performance slow with large datasets
**Cause**: Loading all transactions, then paginating in-memory
**Solution**: Verify using `getPaginatedTransactions()` from `queries.ts`, not old `loadTransactions()`

### Issue: Position not preserved on page size change
**Cause**: Incorrect calculation of new page number
**Solution**: Use formula: `newPage = Math.floor((currentPage - 1) * oldSize / newSize) + 1`

### Issue: SessionStorage not persisting
**Cause**: Using `localStorage` instead of `sessionStorage` in persist middleware
**Solution**: Verify `storage: createJSONStorage(() => sessionStorage)` in store config

## Performance Optimization

### Debounce SessionStorage Writes
```typescript
// Avoid writing to SessionStorage on every state change
const debouncedSave = debounce((state) => {
  sessionStorage.setItem('pagination-state', JSON.stringify(state));
}, 100);
```

### Optimize Count Query
```typescript
// Use compound index for filtered counts
db.version(5).stores({
  transactions: '++id, portfolioId, [portfolioId+type], [portfolioId+date]'
});
```

### Loading States
```typescript
// Add loading indicator during pagination
const [isNavigating, setIsNavigating] = useState(false);

async function handlePageChange(newPage: number) {
  setIsNavigating(true);
  await setCurrentPage(newPage);
  setIsNavigating(false);
}
```

## Accessibility Considerations

- Pagination buttons must have `aria-label` for screen readers
- Disabled buttons must have `aria-disabled="true"`
- Page info text must be in a `<p>` or `<span>` for proper reading
- Keyboard navigation: Tab to buttons, Enter to activate
- Focus management: Maintain focus on pagination controls after navigation
