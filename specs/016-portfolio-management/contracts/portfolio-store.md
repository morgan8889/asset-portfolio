# Store Contract: portfolioStore

**Store**: `src/lib/stores/portfolio.ts`

**Purpose**: Manage portfolio CRUD operations, selection state, and access tracking

## State Interface

```typescript
interface PortfolioStore {
  // Existing state
  portfolios: Portfolio[];
  currentPortfolio: Portfolio | null;
  holdings: Holding[];
  loading: boolean;
  error: string | null;

  // Existing actions
  loadPortfolios: () => Promise<void>;
  createPortfolio: (data: CreatePortfolioData) => Promise<Portfolio>;
  setCurrentPortfolio: (portfolio: Portfolio | null) => void;
  loadHoldings: (portfolioId: string) => Promise<void>;

  // NEW: Portfolio management actions
  updatePortfolio: (id: string, data: Partial<Portfolio>) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;

  // NEW: Helper for sorted portfolio list
  getSortedPortfolios: () => Portfolio[];
}
```

## Action Contracts

### updatePortfolio (NEW)

**Signature**:
```typescript
updatePortfolio: (id: string, data: Partial<Portfolio>) => Promise<void>
```

**Purpose**: Update portfolio properties with validation and type change warnings

**Parameters**:
- `id` (string): Portfolio UUID
- `data` (Partial<Portfolio>): Fields to update (name, type, currency, settings)

**Behavior**:
1. Find portfolio by id, throw if not found
2. If `type` changed and transactions exist:
   - Count transactions for portfolio
   - If count > 0: Caller must handle confirmation dialog BEFORE calling
   - This check is defensive - UI should prevent reaching here without confirmation
3. Merge updated fields with existing portfolio
4. Set `updatedAt` to current timestamp
5. Persist to IndexedDB via `db.portfolios.update()`
6. Update Zustand state:
   - Replace portfolio in `portfolios` array
   - Update `currentPortfolio` if this is the selected portfolio

**Error Handling**:
```typescript
if (!portfolio) {
  throw new Error('Portfolio not found');
}
```

**Example Usage**:
```typescript
// Edit portfolio name
await updatePortfolio('portfolio-id', { name: 'New Name' });

// Change rebalance threshold
await updatePortfolio('portfolio-id', {
  settings: { ...portfolio.settings, rebalanceThreshold: 10 }
});

// Type change (UI should confirm first if transactions exist)
await updatePortfolio('portfolio-id', { type: 'ira' });
```

**Testing Contract**:
```typescript
it('should update portfolio name', async () => {
  await updatePortfolio(portfolio.id, { name: 'Updated Name' });
  expect(usePortfolioStore.getState().portfolios[0].name).toBe('Updated Name');
});

it('should update currentPortfolio if editing selected portfolio', async () => {
  await updatePortfolio(currentPortfolio.id, { name: 'New Name' });
  expect(usePortfolioStore.getState().currentPortfolio?.name).toBe('New Name');
});

it('should set updatedAt timestamp', async () => {
  const before = new Date();
  await updatePortfolio(portfolio.id, { name: 'Test' });
  const after = usePortfolioStore.getState().portfolios[0].updatedAt;
  expect(after.getTime()).toBeGreaterThanOrEqual(before.getTime());
});
```

---

### deletePortfolio (NEW)

**Signature**:
```typescript
deletePortfolio: (id: string) => Promise<void>
```

**Purpose**: Delete portfolio and handle current portfolio fallback

**Parameters**:
- `id` (string): Portfolio UUID to delete

**Behavior**:
1. Delete portfolio from IndexedDB via `db.portfolios.delete(id)`
2. Remove portfolio from `portfolios` array
3. If deleting currently selected portfolio:
   - If other portfolios exist: Switch to most recently used portfolio
   - If no portfolios remain: Set `currentPortfolio` to null (triggers empty state)
4. If deleting non-selected portfolio: Keep `currentPortfolio` unchanged

**Fallback Logic**:
```typescript
const remainingPortfolios = portfolios.filter(p => p.id !== id);

let newCurrentPortfolio: Portfolio | null = null;
if (currentPortfolio?.id === id) {
  if (remainingPortfolios.length > 0) {
    // Switch to most recently used
    const sorted = remainingPortfolios.sort((a, b) =>
      (b.lastAccessedAt?.getTime() || 0) - (a.lastAccessedAt?.getTime() || 0)
    );
    newCurrentPortfolio = sorted[0];
  }
  // else: newCurrentPortfolio remains null → empty state
} else {
  newCurrentPortfolio = currentPortfolio;
}
```

**State Updates**:
```typescript
set({
  portfolios: remainingPortfolios,
  currentPortfolio: newCurrentPortfolio
});
```

**Example Usage**:
```typescript
// Delete non-selected portfolio
await deletePortfolio('portfolio-2-id');
// currentPortfolio unchanged

// Delete last portfolio
await deletePortfolio('last-portfolio-id');
// currentPortfolio = null, empty state shown

// Delete current portfolio with others remaining
await deletePortfolio(currentPortfolio.id);
// Switches to most recently used portfolio
```

**Testing Contract**:
```typescript
it('should delete portfolio from database and state', async () => {
  const portfolioId = 'test-id';
  await deletePortfolio(portfolioId);
  expect(usePortfolioStore.getState().portfolios).not.toContainEqual(
    expect.objectContaining({ id: portfolioId })
  );
});

it('should switch to most recently used portfolio when deleting current', async () => {
  const recentPortfolio = { ...portfolio, lastAccessedAt: new Date() };
  const oldPortfolio = { ...portfolio2, lastAccessedAt: null };

  setCurrentPortfolio(recentPortfolio);
  await deletePortfolio(recentPortfolio.id);

  expect(usePortfolioStore.getState().currentPortfolio?.id).toBe(oldPortfolio.id);
});

it('should set currentPortfolio to null when deleting last portfolio', async () => {
  await deletePortfolio(lastPortfolio.id);
  expect(usePortfolioStore.getState().currentPortfolio).toBeNull();
});
```

---

### getSortedPortfolios (NEW)

**Signature**:
```typescript
getSortedPortfolios: () => Portfolio[]
```

**Purpose**: Return portfolios sorted by: current first → recency → alphabetical

**Returns**: Sorted array of Portfolio objects (does not mutate state)

**Sort Logic**:
```typescript
const portfolios = get().portfolios;
const currentId = get().currentPortfolio?.id;

return portfolios.sort((a, b) => {
  // Current portfolio always first
  if (a.id === currentId) return -1;
  if (b.id === currentId) return 1;

  // Then by lastAccessedAt (most recent first)
  const aTime = a.lastAccessedAt?.getTime() || 0;
  const bTime = b.lastAccessedAt?.getTime() || 0;
  if (aTime !== bTime) return bTime - aTime;

  // Alphabetical fallback
  return a.name.localeCompare(b.name);
});
```

**Example Usage**:
```typescript
// In PortfolioSelector component
const sortedPortfolios = portfolioStore.getSortedPortfolios();

// In PortfoliosPage table
const sorted = portfolioStore.getSortedPortfolios();
```

**Testing Contract**:
```typescript
it('should place current portfolio first', () => {
  setCurrentPortfolio(portfolio2);
  const sorted = getSortedPortfolios();
  expect(sorted[0].id).toBe(portfolio2.id);
});

it('should sort by lastAccessedAt after current', () => {
  const recent = { ...portfolio1, lastAccessedAt: new Date('2026-02-03') };
  const old = { ...portfolio2, lastAccessedAt: new Date('2026-01-01') };

  const sorted = getSortedPortfolios();
  expect(sorted.findIndex(p => p.id === recent.id))
    .toBeLessThan(sorted.findIndex(p => p.id === old.id));
});

it('should use alphabetical fallback for never-accessed portfolios', () => {
  const portfolioA = { ...portfolio, name: 'Alpha', lastAccessedAt: null };
  const portfolioZ = { ...portfolio2, name: 'Zulu', lastAccessedAt: null };

  const sorted = getSortedPortfolios();
  expect(sorted.findIndex(p => p.name === 'Alpha'))
    .toBeLessThan(sorted.findIndex(p => p.name === 'Zulu'));
});
```

---

### setCurrentPortfolio (MODIFIED)

**Signature** (unchanged):
```typescript
setCurrentPortfolio: (portfolio: Portfolio | null) => void
```

**NEW Behavior**: Add lastAccessedAt tracking

**Implementation**:
```typescript
setCurrentPortfolio: (portfolio) => {
  set({ currentPortfolio: portfolio });

  // NEW: Update lastAccessedAt timestamp
  if (portfolio) {
    const now = new Date();
    db.portfolios.update(portfolio.id, { lastAccessedAt: now });

    // Update in-memory portfolio list
    set(state => ({
      portfolios: state.portfolios.map(p =>
        p.id === portfolio.id
          ? { ...p, lastAccessedAt: now }
          : p
      )
    }));
  }
}
```

**Edge Case Handling**:
```typescript
// Defensive check: Portfolio deleted in another tab
setCurrentPortfolio: (portfolio) => {
  if (portfolio) {
    // Verify portfolio still exists
    const exists = get().portfolios.find(p => p.id === portfolio.id);
    if (!exists) {
      // Portfolio was deleted - switch to first available
      const fallback = get().portfolios[0] || null;
      set({ currentPortfolio: fallback });
      return;
    }
  }

  set({ currentPortfolio: portfolio });
  // ... rest of implementation
}
```

**Testing Contract**:
```typescript
it('should update lastAccessedAt when setting current portfolio', async () => {
  const before = new Date();
  setCurrentPortfolio(portfolio);

  await new Promise(resolve => setTimeout(resolve, 10)); // Allow async update

  const updated = usePortfolioStore.getState().portfolios.find(p => p.id === portfolio.id);
  expect(updated?.lastAccessedAt?.getTime()).toBeGreaterThanOrEqual(before.getTime());
});

it('should handle setting null portfolio', () => {
  setCurrentPortfolio(null);
  expect(usePortfolioStore.getState().currentPortfolio).toBeNull();
});

it('should fallback if portfolio does not exist', () => {
  const nonExistent = { ...portfolio, id: 'non-existent-id' };
  setCurrentPortfolio(nonExistent);

  const current = usePortfolioStore.getState().currentPortfolio;
  expect(current?.id).not.toBe('non-existent-id');
});
```

---

## Persistence Behavior

### Zustand Persist Middleware
- `currentPortfolio` persisted to localStorage (existing)
- `portfolios` array NOT persisted (loaded from IndexedDB on mount)

### IndexedDB
- `lastAccessedAt` persisted to portfolios table (new in schema v5)
- All portfolio CRUD operations persist immediately
- No batching or delayed writes

---

## Error Handling Standards

### Database Errors
```typescript
try {
  await db.portfolios.update(id, data);
} catch (err) {
  logger.error('Failed to update portfolio:', err);
  throw new Error('Portfolio update failed');
}
```

### Validation Errors
```typescript
// Name validation
if (data.name && data.name.trim().length === 0) {
  throw new Error('Portfolio name cannot be empty');
}

// Type validation
if (data.type && !['taxable', 'ira', '401k', 'roth'].includes(data.type)) {
  throw new Error('Invalid portfolio type');
}
```

---

## Testing Coverage Requirements

- **Action Coverage**: 100% (all actions tested)
- **Edge Cases**: Portfolio not found, last portfolio deletion, concurrent operations
- **State Transitions**: Verify state updates for all operations
- **Persistence**: Mock IndexedDB, verify database calls
- **Error Handling**: Test all error paths

---

## Performance Considerations

- **getSortedPortfolios()**: O(n log n) sort, acceptable for n=20-50 portfolios (~1ms)
- **lastAccessedAt updates**: Async IndexedDB write, non-blocking
- **State updates**: Zustand updates synchronous, React re-renders batched
