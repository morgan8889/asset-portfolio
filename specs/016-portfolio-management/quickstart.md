# Quickstart: Portfolio Management Implementation

**Feature**: 016-portfolio-management
**Branch**: `016-portfolio-management`
**Target**: MVP (US1) → Full Feature (US2-US4)

## Implementation Phases

### Phase 1: Database & Store Foundation (US1 Support)
**Goal**: Add lastAccessedAt tracking, update portfolioStore with new actions

**Files to Modify**:
1. `src/lib/db/schema.ts` - Add lastAccessedAt index to portfolios table
2. `src/lib/db/migrations.ts` - Create migration v4→v5
3. `src/lib/stores/portfolio.ts` - Add updatePortfolio, deletePortfolio, getSortedPortfolios
4. `src/types/portfolio.ts` - Update Portfolio interface with lastAccessedAt

**Steps**:

#### 1.1 Update Portfolio Type
```typescript
// src/types/portfolio.ts
export interface Portfolio {
  id: string;
  name: string;
  type: PortfolioType;
  currency: string;
  settings: PortfolioSettings;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date | null; // NEW
}
```

#### 1.2 Update Database Schema
```typescript
// src/lib/db/schema.ts
export class PortfolioTrackerDB extends Dexie {
  constructor() {
    super('PortfolioTrackerDB');

    // Bump version to 5
    this.version(5).stores({
      portfolios: '++id, name, lastAccessedAt', // Add lastAccessedAt index
      // ... other tables unchanged
    });
  }
}
```

#### 1.3 Create Migration
```typescript
// src/lib/db/migrations.ts
export const migrations = [
  // ... existing migrations v1-v4

  {
    version: 5,
    description: 'Add lastAccessedAt to portfolios for recency sorting',
    up: async (db: Dexie) => {
      const portfolios = await db.table('portfolios').toArray();
      for (const portfolio of portfolios) {
        await db.table('portfolios').update(portfolio.id, {
          lastAccessedAt: null
        });
      }
      logger.info('Migration v5: Added lastAccessedAt field to portfolios table');
    },
    down: async (db: Dexie) => {
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

#### 1.4 Update portfolioStore
```typescript
// src/lib/stores/portfolio.ts

// Add to interface
interface PortfolioStore {
  // ... existing state

  // NEW actions
  updatePortfolio: (id: string, data: Partial<Portfolio>) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  getSortedPortfolios: () => Portfolio[];
}

// Modify setCurrentPortfolio
setCurrentPortfolio: (portfolio) => {
  set({ currentPortfolio: portfolio });

  // NEW: Track lastAccessedAt
  if (portfolio) {
    const now = new Date();
    db.portfolios.update(portfolio.id, { lastAccessedAt: now });

    set(state => ({
      portfolios: state.portfolios.map(p =>
        p.id === portfolio.id ? { ...p, lastAccessedAt: now } : p
      )
    }));
  }
},

// NEW: updatePortfolio action
updatePortfolio: async (id: string, data: Partial<Portfolio>) => {
  const portfolio = get().portfolios.find(p => p.id === id);
  if (!portfolio) throw new Error('Portfolio not found');

  // Check type change with transactions
  if (data.type && data.type !== portfolio.type) {
    const transactionCount = await db.transactions
      .where('portfolioId').equals(id).count();

    // UI should handle confirmation before calling
    if (transactionCount > 0) {
      // Defensive check - UI should prevent reaching here
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
},

// NEW: deletePortfolio action
deletePortfolio: async (id: string) => {
  const portfolios = get().portfolios;
  const currentPortfolio = get().currentPortfolio;

  await db.portfolios.delete(id);

  const remainingPortfolios = portfolios.filter(p => p.id !== id);

  let newCurrentPortfolio: Portfolio | null = null;
  if (currentPortfolio?.id === id) {
    if (remainingPortfolios.length > 0) {
      const sorted = remainingPortfolios.sort((a, b) =>
        (b.lastAccessedAt?.getTime() || 0) - (a.lastAccessedAt?.getTime() || 0)
      );
      newCurrentPortfolio = sorted[0];
    }
  } else {
    newCurrentPortfolio = currentPortfolio;
  }

  set({
    portfolios: remainingPortfolios,
    currentPortfolio: newCurrentPortfolio
  });
},

// NEW: getSortedPortfolios helper
getSortedPortfolios: () => {
  const portfolios = get().portfolios;
  const currentId = get().currentPortfolio?.id;

  return portfolios.sort((a, b) => {
    if (a.id === currentId) return -1;
    if (b.id === currentId) return 1;

    const aTime = a.lastAccessedAt?.getTime() || 0;
    const bTime = b.lastAccessedAt?.getTime() || 0;
    if (aTime !== bTime) return bTime - aTime;

    return a.name.localeCompare(b.name);
  });
}
```

**Testing Phase 1**:
```bash
# Unit tests
npm run test -- --run src/lib/stores/__tests__/portfolio.test.ts

# Create new tests for:
# - updatePortfolio action
# - deletePortfolio action (all scenarios)
# - getSortedPortfolios helper
# - setCurrentPortfolio with lastAccessedAt tracking
```

---

### Phase 2: Portfolio Selector Component (US1)
**Goal**: Create PortfolioSelector component and integrate into DashboardHeader

**Files to Create**:
1. `src/components/portfolio/portfolio-selector.tsx` - Main selector component

**Files to Modify**:
1. `src/components/dashboard/DashboardHeader.tsx` - Replace static badges with selector

**Steps**:

#### 2.1 Create PortfolioSelector Component
```typescript
// src/components/portfolio/portfolio-selector.tsx
'use client';

import { useMemo } from 'react';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { useCsvImportStore } from '@/lib/stores/csv-import';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioSelectorProps {
  className?: string;
}

export function PortfolioSelector({ className }: PortfolioSelectorProps) {
  const { currentPortfolio, setCurrentPortfolio } = usePortfolioStore();
  const { isProcessing: isImporting } = useCsvImportStore();

  const sortedPortfolios = usePortfolioStore(state => state.getSortedPortfolios());

  const handlePortfolioSwitch = (portfolioId: string) => {
    const portfolio = sortedPortfolios.find(p => p.id === portfolioId);
    if (!portfolio) {
      console.error('Portfolio not found:', portfolioId);
      return;
    }
    setCurrentPortfolio(portfolio);
  };

  if (!currentPortfolio) return null;

  return (
    <div className="relative">
      <Select
        value={currentPortfolio.id}
        onValueChange={handlePortfolioSwitch}
        disabled={isImporting}
      >
        <SelectTrigger className={cn("w-[280px]", className)}>
          {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <SelectValue>
            {currentPortfolio.name} • {currentPortfolio.type.toUpperCase()}
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

      {isImporting && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
          <p className="text-sm text-muted-foreground">Import in progress...</p>
        </div>
      )}
    </div>
  );
}
```

#### 2.2 Update DashboardHeader
```typescript
// src/components/dashboard/DashboardHeader.tsx

// Remove static badge display (lines 34-41)
// Replace with:
import { PortfolioSelector } from '@/components/portfolio/portfolio-selector';

// In JSX:
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold">Portfolio Dashboard</h1>
    <div className="mt-2">
      <PortfolioSelector />
    </div>
  </div>
  {/* ... rest of header */}
</div>
```

**Testing Phase 2**:
```bash
# Unit tests
npm run test -- --run src/components/portfolio/__tests__/portfolio-selector.test.tsx

# E2E tests
npx playwright test tests/e2e/portfolio-switching.spec.ts --project=chromium
```

---

### Phase 3: Portfolios Management Page (US2)
**Goal**: Create dedicated /portfolios page with list view

**Files to Create**:
1. `src/app/(dashboard)/portfolios/page.tsx` - Main page component
2. `src/components/portfolio/portfolios-table.tsx` - Portfolio list table

**Files to Modify**:
1. `src/lib/config/navigation.ts` - Add Portfolios route

**Steps**:

#### 3.1 Add Navigation Route
```typescript
// src/lib/config/navigation.ts
{
  id: 'portfolio',
  name: 'Portfolio',
  icon: Briefcase,
  items: [
    { name: 'Holdings', href: '/holdings', icon: Briefcase },
    { name: 'Portfolios', href: '/portfolios', icon: Briefcase }, // NEW
    { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  ]
}
```

#### 3.2 Create Portfolios Page
```typescript
// src/app/(dashboard)/portfolios/page.tsx
'use client';

import { PortfoliosTable } from '@/components/portfolio/portfolios-table';

export default function PortfoliosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Portfolios</h1>
        <p className="text-muted-foreground">
          Manage your portfolios and view performance metrics
        </p>
      </div>

      <PortfoliosTable />
    </div>
  );
}
```

#### 3.3 Create PortfoliosTable Component
```typescript
// src/components/portfolio/portfolios-table.tsx
'use client';

import { useMemo } from 'react';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/currency';
import { Eye, Edit, Trash2 } from 'lucide-react';

export function PortfoliosTable() {
  const router = useRouter();
  const { getSortedPortfolios, setCurrentPortfolio } = usePortfolioStore();

  const sortedPortfolios = getSortedPortfolios();

  // Calculate metrics for each portfolio (mock for now)
  const portfoliosWithMetrics = useMemo(() => {
    return sortedPortfolios.map(p => ({
      ...p,
      totalValue: 0, // TODO: Calculate from calculatePortfolioMetrics
      ytdReturn: 0,
      holdingsCount: 0,
    }));
  }, [sortedPortfolios]);

  const handleView = (portfolio: Portfolio) => {
    setCurrentPortfolio(portfolio);
    router.push('/');
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Portfolio Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Total Value</TableHead>
          <TableHead className="text-right">YTD Return</TableHead>
          <TableHead className="text-right">Holdings</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {portfoliosWithMetrics.map(p => (
          <TableRow key={p.id}>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell>
              <Badge variant="secondary">{p.type.toUpperCase()}</Badge>
            </TableCell>
            <TableCell className="text-right">
              {formatCurrency(p.totalValue, p.currency)}
            </TableCell>
            <TableCell className="text-right">
              <span className={p.ytdReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
                {p.ytdReturn.toFixed(2)}%
              </span>
            </TableCell>
            <TableCell className="text-right">{p.holdingsCount}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleView(p)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

**Testing Phase 3**:
```bash
# E2E tests
npx playwright test tests/e2e/portfolios-management.spec.ts --project=chromium
```

---

### Phase 4: Edit Portfolio Dialog (US3)
**Goal**: Extend CreatePortfolioDialog for edit mode

**Files to Modify**:
1. `src/components/forms/create-portfolio.tsx` - Add mode prop and edit logic

**Steps**:

#### 4.1 Update CreatePortfolioDialog Props
```typescript
// src/components/forms/create-portfolio.tsx

interface CreatePortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'create' | 'edit'; // NEW
  portfolio?: Portfolio;     // NEW
  onSave?: (portfolio: Portfolio) => void; // NEW
}

export function CreatePortfolioDialog({
  open,
  onOpenChange,
  mode = 'create',
  portfolio,
  onSave,
}: CreatePortfolioDialogProps) {
  // Update form default values
  const form = useForm<PortfolioFormData>({
    resolver: zodResolver(createPortfolioSchema),
    defaultValues: mode === 'edit' && portfolio
      ? {
          name: portfolio.name,
          type: portfolio.type,
          currency: portfolio.currency,
          settings: portfolio.settings,
        }
      : {
          // ... existing defaults
        },
  });

  // Update onSubmit logic
  const onSubmit = async (data: PortfolioFormData) => {
    if (mode === 'edit' && portfolio) {
      // Check type change
      if (data.type !== portfolio.type) {
        const transactionCount = await db.transactions
          .where('portfolioId').equals(portfolio.id).count();

        if (transactionCount > 0) {
          // Show confirmation
          const confirmed = await showConfirmDialog({
            title: 'Change Portfolio Type?',
            message: `This portfolio has ${transactionCount} transaction(s). Changing the type may affect tax calculations. Are you sure?`,
            confirmText: 'Change Type',
            variant: 'warning',
          });

          if (!confirmed) return;
        }
      }

      await portfolioStore.updatePortfolio(portfolio.id, data);
      onSave?.(updatedPortfolio);
    } else {
      await portfolioStore.createPortfolio(data);
    }

    onOpenChange(false);
  };

  const title = mode === 'edit' ? 'Edit Portfolio' : 'Create Portfolio';
  const submitText = mode === 'edit' ? 'Save Changes' : 'Create Portfolio';

  // Rest of component...
}
```

#### 4.2 Wire Up Edit Button in PortfoliosTable
```typescript
// src/components/portfolio/portfolios-table.tsx

const [editDialogOpen, setEditDialogOpen] = useState(false);
const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);

const handleEdit = (portfolio: Portfolio) => {
  setEditingPortfolio(portfolio);
  setEditDialogOpen(true);
};

// In button:
<Button variant="ghost" size="sm" onClick={() => handleEdit(p)}>
  <Edit className="h-4 w-4" />
</Button>

// Add dialog:
<CreatePortfolioDialog
  open={editDialogOpen}
  onOpenChange={setEditDialogOpen}
  mode="edit"
  portfolio={editingPortfolio || undefined}
/>
```

**Testing Phase 4**:
```bash
# E2E tests
npx playwright test tests/e2e/portfolio-edit.spec.ts --project=chromium
```

---

### Phase 5: Delete Portfolio Dialog (US4)
**Goal**: Create DeletePortfolioDialog with graduated confirmation

**Files to Create**:
1. `src/components/portfolio/delete-portfolio-dialog.tsx` - Delete confirmation dialog

**Files to Modify**:
1. `src/components/portfolio/portfolios-table.tsx` - Wire up delete button

**Steps**:

#### 5.1 Create DeletePortfolioDialog
```typescript
// src/components/portfolio/delete-portfolio-dialog.tsx
'use client';

import { useState, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import type { Portfolio } from '@/types/portfolio';

interface DeletePortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolio: Portfolio;
  transactionCount: number;
  onDelete: () => void;
}

export function DeletePortfolioDialog({
  open,
  onOpenChange,
  portfolio,
  transactionCount,
  onDelete,
}: DeletePortfolioDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [checkboxChecked, setCheckboxChecked] = useState(false);

  const { portfolios, deletePortfolio } = usePortfolioStore();

  const isLastPortfolio = portfolios.length === 1;
  const requiresTyping = transactionCount > 10;
  const requiresCheckbox = transactionCount > 0 && transactionCount <= 10;

  const canDelete = useMemo(() => {
    if (transactionCount === 0) return true;
    if (requiresCheckbox) return checkboxChecked;
    if (requiresTyping) return confirmText === portfolio.name;
    return false;
  }, [transactionCount, checkboxChecked, confirmText, portfolio.name]);

  const handleDelete = async () => {
    await deletePortfolio(portfolio.id);
    onDelete();
    onOpenChange(false);
  };

  const getMessage = () => {
    let message = '';

    if (transactionCount === 0) {
      message = 'This portfolio has no transactions. Delete it?';
    } else if (transactionCount <= 10) {
      message = `This will permanently delete all holdings and ${transactionCount} transaction(s). This action cannot be undone.`;
    } else {
      message = `This portfolio has ${transactionCount} transactions. Type the portfolio name to confirm deletion:`;
    }

    if (isLastPortfolio) {
      message += `\n\nThis is your last portfolio. If you delete it, you'll see an empty state and will need to create a new portfolio to manage investments.`;
    }

    return message;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Portfolio?</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {getMessage()}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requiresCheckbox && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="confirm-delete"
              checked={checkboxChecked}
              onCheckedChange={(checked) => setCheckboxChecked(checked as boolean)}
            />
            <label
              htmlFor="confirm-delete"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I understand this will delete all data
            </label>
          </div>
        )}

        {requiresTyping && (
          <div className="space-y-2">
            <Label htmlFor="confirm-input">Type portfolio name to confirm:</Label>
            <Input
              id="confirm-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={portfolio.name}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!canDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Portfolio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

#### 5.2 Wire Up Delete Button
```typescript
// src/components/portfolio/portfolios-table.tsx

const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [deletingPortfolio, setDeletingPortfolio] = useState<{
  portfolio: Portfolio;
  transactionCount: number;
} | null>(null);

const handleDelete = async (portfolio: Portfolio) => {
  const count = await db.transactions
    .where('portfolioId').equals(portfolio.id).count();

  setDeletingPortfolio({ portfolio, transactionCount: count });
  setDeleteDialogOpen(true);
};

// In button:
<Button variant="ghost" size="sm" onClick={() => handleDelete(p)}>
  <Trash2 className="h-4 w-4" />
</Button>

// Add dialog:
{deletingPortfolio && (
  <DeletePortfolioDialog
    open={deleteDialogOpen}
    onOpenChange={setDeleteDialogOpen}
    portfolio={deletingPortfolio.portfolio}
    transactionCount={deletingPortfolio.transactionCount}
    onDelete={() => {
      setDeletingPortfolio(null);
      // Refresh table if needed
    }}
  />
)}
```

**Testing Phase 5**:
```bash
# E2E tests
npx playwright test tests/e2e/portfolio-delete.spec.ts --project=chromium
```

---

## Testing Strategy

### Unit Tests (Vitest)
**Target Coverage**: 85%+ for new code

**Test Files to Create**:
1. `src/lib/stores/__tests__/portfolio.test.ts` - Store action tests (updatePortfolio, deletePortfolio, getSortedPortfolios)
2. `src/components/portfolio/__tests__/portfolio-selector.test.tsx` - Selector component tests
3. `src/components/portfolio/__tests__/delete-portfolio-dialog.test.tsx` - Dialog confirmation tests

**Run Tests**:
```bash
npm run test -- --run src/lib/stores/__tests__/portfolio.test.ts
npm run test -- --run src/components/portfolio/
npm run test:coverage -- --include="src/lib/stores/portfolio.ts" --include="src/components/portfolio/**"
```

### E2E Tests (Playwright)
**Test Files to Create**:
1. `tests/e2e/portfolio-switching.spec.ts` - Portfolio selector and switching workflows
2. `tests/e2e/portfolios-management.spec.ts` - Portfolios page, sorting, view action
3. `tests/e2e/portfolio-edit.spec.ts` - Edit portfolio, type change warning
4. `tests/e2e/portfolio-delete.spec.ts` - Delete confirmation levels, last portfolio

**Run Tests**:
```bash
npx playwright test tests/e2e/portfolio-switching.spec.ts --project=chromium
npx playwright test tests/e2e/portfolios-management.spec.ts --project=chromium
npx playwright test tests/e2e/portfolio-edit.spec.ts --project=chromium
npx playwright test tests/e2e/portfolio-delete.spec.ts --project=chromium
```

### Data Isolation Verification
```bash
# Create test to verify holdings/transactions filtered by portfolioId
npx playwright test tests/e2e/portfolio-isolation.spec.ts --project=chromium
```

---

## Verification Checklist

**Before marking feature complete**:

- [ ] Phase 1: Database schema v5, migrations run successfully
- [ ] Phase 1: portfolioStore actions (updatePortfolio, deletePortfolio, getSortedPortfolios) tested
- [ ] Phase 2: PortfolioSelector integrated in DashboardHeader
- [ ] Phase 2: Portfolio switching updates dashboard correctly
- [ ] Phase 2: CSV import blocks portfolio switching
- [ ] Phase 2: Price polling switches immediately
- [ ] Phase 3: /portfolios route navigable
- [ ] Phase 3: Portfolios table displays with metrics
- [ ] Phase 4: Edit portfolio dialog opens and saves changes
- [ ] Phase 4: Type change warning shown when transactions exist
- [ ] Phase 5: Delete confirmation levels work (0, 1-10, >10 transactions)
- [ ] Phase 5: Last portfolio deletion shows empty state
- [ ] Unit test coverage ≥85% for new code
- [ ] All E2E tests passing
- [ ] Data isolation verified (no cross-portfolio leakage)
- [ ] Filter state preservation verified (type/search preserved, date/pagination reset)

---

## Rollback Plan

If issues arise during implementation:

**Phase 1 Rollback**:
```bash
# Revert database schema to v4
# Delete migration v5 from migrations.ts
# Restore original portfolioStore.ts
git checkout main -- src/lib/db/schema.ts src/lib/db/migrations.ts src/lib/stores/portfolio.ts
```

**Phase 2-5 Rollback**:
```bash
# Remove new components
rm -rf src/components/portfolio/
rm -rf src/app/(dashboard)/portfolios/

# Restore DashboardHeader
git checkout main -- src/components/dashboard/DashboardHeader.tsx

# Restore navigation
git checkout main -- src/lib/config/navigation.ts
```

---

## Performance Monitoring

**Key Metrics to Track**:
- Portfolio switching time: <2 seconds (FR-001 requirement)
- getSortedPortfolios() execution: <50ms for 20 portfolios
- Database migration v4→v5: <5 seconds for 50 portfolios
- PortfolioSelector render time: <100ms

**Profiling**:
```typescript
// Add performance logging
const startTime = performance.now();
const sorted = getSortedPortfolios();
const endTime = performance.now();
logger.debug(`getSortedPortfolios took ${endTime - startTime}ms`);
```
