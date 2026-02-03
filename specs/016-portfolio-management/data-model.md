# Data Model: Portfolio Management

**Feature**: 016-portfolio-management
**Date**: February 3, 2026
**Database Schema**: v5 (adds `lastAccessedAt` to portfolios table)

## Overview

This document defines the data model for portfolio management, including entity modifications, state management, and persistence strategies. The feature extends the existing `Portfolio` entity and adds tracking for user access patterns.

## Entity Definitions

### Portfolio (Modified)

Represents a financial account (taxable, IRA, 401k, Roth IRA) with investment holdings.

**Storage**: IndexedDB table `portfolios` (Dexie.js)

**Schema**:
```typescript
interface Portfolio {
  id: string;                    // UUID, primary key
  name: string;                  // User-defined name, required, 1-100 chars
  type: PortfolioType;           // 'taxable' | 'ira' | '401k' | 'roth'
  currency: string;              // ISO 4217 code (default: 'USD')

  // Settings (nested object)
  settings: {
    rebalanceThreshold: number;  // Percentage (0-100), default: 5
    taxStrategy: 'fifo' | 'lifo' | 'specific'; // Default: 'fifo'
    autoRebalance: boolean;      // Default: false
    dividendReinvestment: boolean; // Default: false
  };

  // Timestamps
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last modification timestamp

  // NEW: Access tracking for recency sorting
  lastAccessedAt: Date | null;   // Last selection timestamp, nullable
}

type PortfolioType = 'taxable' | 'ira' | '401k' | 'roth';
```

**Indexes**:
- Primary: `++id` (auto-incrementing UUID)
- Secondary: `name` (for alphabetical fallback sorting)
- NEW: `lastAccessedAt` (for recency sorting, sparse index)

**Validation Rules**:
- `name`: Required, trimmed, 1-100 characters, no leading/trailing whitespace
- `type`: Must be one of: 'taxable', 'ira', '401k', 'roth'
- `currency`: Must be valid ISO 4217 code (3 uppercase letters)
- `settings.rebalanceThreshold`: Number 0-100 (percentage)
- `settings.taxStrategy`: Must be 'fifo', 'lifo', or 'specific'
- `settings.autoRebalance`: Boolean
- `settings.dividendReinvestment`: Boolean
- `lastAccessedAt`: Date or null (nullable for backward compatibility)

**Business Rules**:
- Portfolio name must be unique per user (client-side uniqueness check)
- Changing `type` when transactions exist requires explicit user confirmation (tax implications)
- Portfolio cannot be deleted if currently selected by another browser tab (graceful fallback to next portfolio)
- Last portfolio can be deleted (user sees empty state)

---

### PortfolioMetrics (Computed)

Aggregated metrics for portfolio list view. Not persisted - computed on demand.

**Source**: Derived from holdings, transactions, and price data

**Schema**:
```typescript
interface PortfolioMetrics {
  portfolioId: string;
  totalValue: Decimal;           // Sum of all holding values (quantity × current price)
  ytdReturn: Decimal;            // Year-to-date return percentage
  totalCostBasis: Decimal;       // Sum of all cost bases
  unrealizedGain: Decimal;       // totalValue - totalCostBasis
  holdingsCount: number;         // Number of holdings
  transactionCount: number;      // Number of transactions
}
```

**Calculation Logic**:
```typescript
// In src/lib/services/portfolio-metrics.ts
export async function calculatePortfolioMetrics(portfolioId: string): Promise<PortfolioMetrics> {
  const holdings = await db.holdings.where('portfolioId').equals(portfolioId).toArray();
  const transactions = await db.transactions.where('portfolioId').equals(portfolioId).count();

  let totalValue = new Decimal(0);
  let totalCostBasis = new Decimal(0);

  for (const holding of holdings) {
    const asset = await db.assets.get(holding.assetId);
    const currentPrice = await getCurrentPrice(asset.symbol);
    totalValue = totalValue.plus(holding.quantity.mul(currentPrice));
    totalCostBasis = totalCostBasis.plus(holding.costBasis);
  }

  const ytdReturn = totalValue.minus(totalCostBasis).div(totalCostBasis).mul(100);

  return {
    portfolioId,
    totalValue,
    ytdReturn,
    totalCostBasis,
    unrealizedGain: totalValue.minus(totalCostBasis),
    holdingsCount: holdings.length,
    transactionCount: transactions
  };
}
```

---

## State Management

### PortfolioStore (Modified)

Zustand store managing portfolio CRUD operations and selection state.

**Location**: `src/lib/stores/portfolio.ts`

**State Interface**:
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

**New Actions**:

**updatePortfolio**:
```typescript
updatePortfolio: async (id: string, data: Partial<Portfolio>) => {
  const portfolio = get().portfolios.find(p => p.id === id);
  if (!portfolio) throw new Error('Portfolio not found');

  // Validate type change if transactions exist
  if (data.type && data.type !== portfolio.type) {
    const transactionCount = await db.transactions
      .where('portfolioId').equals(id).count();

    if (transactionCount > 0) {
      // Caller must handle confirmation dialog before calling this
      // This check is defensive - UI should prevent reaching here without confirmation
    }
  }

  const updated = {
    ...portfolio,
    ...data,
    updatedAt: new Date()
  };

  await db.portfolios.update(id, updated);

  set(state => ({
    portfolios: state.portfolios.map(p => p.id === id ? updated : p),
    currentPortfolio: state.currentPortfolio?.id === id ? updated : state.currentPortfolio
  }));
}
```

**deletePortfolio**:
```typescript
deletePortfolio: async (id: string) => {
  const portfolios = get().portfolios;
  const currentPortfolio = get().currentPortfolio;

  // Delete portfolio from database
  await db.portfolios.delete(id);

  // Update state
  const remainingPortfolios = portfolios.filter(p => p.id !== id);

  // Handle current portfolio deletion
  let newCurrentPortfolio: Portfolio | null = null;
  if (currentPortfolio?.id === id) {
    if (remainingPortfolios.length > 0) {
      // Switch to most recently used portfolio
      const sorted = remainingPortfolios.sort((a, b) =>
        (b.lastAccessedAt?.getTime() || 0) - (a.lastAccessedAt?.getTime() || 0)
      );
      newCurrentPortfolio = sorted[0];
    }
    // else: newCurrentPortfolio remains null → triggers empty state
  } else {
    newCurrentPortfolio = currentPortfolio;
  }

  set({
    portfolios: remainingPortfolios,
    currentPortfolio: newCurrentPortfolio
  });
}
```

**getSortedPortfolios**:
```typescript
getSortedPortfolios: () => {
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
}
```

**Modified Actions**:

**setCurrentPortfolio** (add lastAccessedAt tracking):
```typescript
setCurrentPortfolio: (portfolio) => {
  set({ currentPortfolio: portfolio });

  // Update lastAccessedAt timestamp
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

**Persistence**:
- Existing: `currentPortfolio` persisted to localStorage via Zustand persist middleware
- NEW: `lastAccessedAt` persisted to IndexedDB (portfolios table)

---

## Page-Level State

### Transaction Filters (Component State)

Filter and sort state for transactions page. **Not persisted to Zustand** - component-local state.

**Schema**:
```typescript
interface TransactionFilters {
  type: 'all' | 'buy' | 'sell' | 'dividend' | 'split' | 'espp' | 'rsu';
  searchTerm: string;
  dateRange: { start: Date; end: Date } | null;
  sortBy: 'date' | 'symbol' | 'amount';
  sortOrder: 'asc' | 'desc';
}
```

**Behavior on Portfolio Switch**:
- **Preserved**: `type`, `searchTerm`, `sortBy`, `sortOrder`
- **Reset**: `dateRange` (set to null or default range)
- **Reset**: Pagination (back to page 1)

**Implementation**:
```typescript
// In TransactionTable component
const [filters, setFilters] = useState<TransactionFilters>({
  type: 'all',
  searchTerm: '',
  dateRange: null,
  sortBy: 'date',
  sortOrder: 'desc'
});

useEffect(() => {
  // Reset date range and pagination on portfolio switch
  setFilters(prev => ({ ...prev, dateRange: null }));
  // type, searchTerm, sortBy, sortOrder preserved automatically
}, [currentPortfolio?.id]);
```

---

## Database Migrations

### Migration v4 → v5

**Changes**:
- Add `lastAccessedAt` column to `portfolios` table (nullable DATE)

**Migration Script** (`src/lib/db/migrations.ts`):
```typescript
import Dexie from 'dexie';
import { logger } from '@/lib/utils/logger';

export const migrations = [
  // ... existing migrations v1-v4

  {
    version: 5,
    description: 'Add lastAccessedAt to portfolios for recency sorting',
    up: async (db: Dexie) => {
      // Dexie automatically handles schema changes
      // lastAccessedAt is added as optional field in schema.ts

      // Set lastAccessedAt to null for all existing portfolios
      const portfolios = await db.table('portfolios').toArray();
      for (const portfolio of portfolios) {
        await db.table('portfolios').update(portfolio.id, {
          lastAccessedAt: null
        });
      }

      logger.info('Migration v5: Added lastAccessedAt field to portfolios table');
    },
    down: async (db: Dexie) => {
      // Rollback: Remove lastAccessedAt field
      const portfolios = await db.table('portfolios').toArray();
      for (const portfolio of portfolios) {
        const { lastAccessedAt, ...rest } = portfolio;
        await db.table('portfolios').put(rest);
      }

      logger.info('Migration v5 rollback: Removed lastAccessedAt field');
    }
  }
];
```

**Schema Update** (`src/lib/db/schema.ts`):
```typescript
export class PortfolioTrackerDB extends Dexie {
  portfolios!: Dexie.Table<Portfolio, string>;

  constructor() {
    super('PortfolioTrackerDB');

    this.version(5).stores({
      portfolios: '++id, name, lastAccessedAt', // Add lastAccessedAt index
      // ... other tables unchanged
    });
  }
}
```

---

## Data Validation

### Zod Schemas

**Portfolio Validation**:
```typescript
import { z } from 'zod';

export const portfolioTypeSchema = z.enum(['taxable', 'ira', '401k', 'roth']);

export const portfolioSettingsSchema = z.object({
  rebalanceThreshold: z.number().min(0).max(100),
  taxStrategy: z.enum(['fifo', 'lifo', 'specific']),
  autoRebalance: z.boolean(),
  dividendReinvestment: z.boolean()
});

export const createPortfolioSchema = z.object({
  name: z.string().trim().min(1).max(100),
  type: portfolioTypeSchema,
  currency: z.string().length(3).toUpperCase(),
  settings: portfolioSettingsSchema
});

export const updatePortfolioSchema = createPortfolioSchema.partial().extend({
  id: z.string().uuid()
});
```

---

## Query Patterns

### Common Queries

**Get portfolios with metrics**:
```typescript
async function getPortfoliosWithMetrics(): Promise<Array<Portfolio & { metrics: PortfolioMetrics }>> {
  const portfolios = await db.portfolios.toArray();

  return Promise.all(
    portfolios.map(async (portfolio) => ({
      ...portfolio,
      metrics: await calculatePortfolioMetrics(portfolio.id)
    }))
  );
}
```

**Get sorted portfolios for selector**:
```typescript
function useSortedPortfolios() {
  const { portfolios, currentPortfolio } = usePortfolioStore();

  return useMemo(() => {
    return [...portfolios].sort((a, b) => {
      // Current first
      if (a.id === currentPortfolio?.id) return -1;
      if (b.id === currentPortfolio?.id) return 1;

      // Recency
      const aTime = a.lastAccessedAt?.getTime() || 0;
      const bTime = b.lastAccessedAt?.getTime() || 0;
      if (aTime !== bTime) return bTime - aTime;

      // Alphabetical
      return a.name.localeCompare(b.name);
    });
  }, [portfolios, currentPortfolio?.id]);
}
```

---

## Performance Considerations

### Indexing Strategy

- **Primary Index** (`++id`): Fast lookup by portfolio ID (O(log n))
- **Secondary Index** (`name`): Fast alphabetical sorting fallback (O(log n))
- **Sparse Index** (`lastAccessedAt`): Efficient recency sorting, null-tolerant (O(log n))

### Query Optimization

- **Sorted Portfolio List**: Single sort operation, O(n log n) for n=20 portfolios (~1ms)
- **Metrics Calculation**: Parallel queries for holdings and prices (Promise.all)
- **Caching**: Zustand store caches portfolios in memory (no DB queries on re-renders)

### Memory Footprint

- **Typical**: 2-5 portfolios × ~500 bytes = 2.5KB
- **Maximum**: 50 portfolios × ~500 bytes = 25KB (well below concern threshold)

---

## Edge Cases

### Concurrent Deletion

**Scenario**: Portfolio deleted in one tab while selected in another tab

**Handling**:
```typescript
// In setCurrentPortfolio - defensive check
setCurrentPortfolio: (portfolio) => {
  if (portfolio) {
    // Verify portfolio still exists before setting
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

### Data Corruption

**Scenario**: IndexedDB data corrupted or invalid

**Handling**:
```typescript
// In loadPortfolios - validation layer
loadPortfolios: async () => {
  try {
    const portfolios = await db.portfolios.toArray();

    // Validate each portfolio
    const validPortfolios = portfolios.filter(p => {
      try {
        createPortfolioSchema.parse(p);
        return true;
      } catch (err) {
        logger.error('Invalid portfolio data:', p.id, err);
        return false;
      }
    });

    set({ portfolios: validPortfolios, loading: false });
  } catch (err) {
    logger.error('Failed to load portfolios:', err);
    set({ error: 'Failed to load portfolios', loading: false });
  }
}
```

---

## Testing Data

### Test Fixtures

**Minimal Portfolio**:
```typescript
export const minimalPortfolio: Portfolio = {
  id: 'test-portfolio-1',
  name: 'Test Portfolio',
  type: 'taxable',
  currency: 'USD',
  settings: {
    rebalanceThreshold: 5,
    taxStrategy: 'fifo',
    autoRebalance: false,
    dividendReinvestment: false
  },
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  lastAccessedAt: null
};
```

**Portfolio with Recent Access**:
```typescript
export const recentPortfolio: Portfolio = {
  ...minimalPortfolio,
  id: 'test-portfolio-2',
  name: 'Recent Portfolio',
  lastAccessedAt: new Date('2026-02-03T10:00:00Z')
};
```

---

## References

- Dexie.js Documentation: https://dexie.org/
- Zod Validation: https://zod.dev/
- Decimal.js: https://mikemcl.github.io/decimal.js/
- Zustand Persist Middleware: https://docs.pmnd.rs/zustand/integrations/persisting-store-data
