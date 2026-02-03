# Component Contracts: Edit & Delete Dialogs

## EditPortfolioDialog

**Component**: `src/components/forms/create-portfolio.tsx` (extended for edit mode)

**Purpose**: Reuse CreatePortfolioDialog with edit mode for portfolio modifications

### Props API

```typescript
interface CreatePortfolioDialogProps {
  // Existing props
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // NEW: Edit mode props
  mode?: 'create' | 'edit';  // Default: 'create'
  portfolio?: Portfolio;      // Required when mode='edit'
  onSave?: (portfolio: Portfolio) => void;  // Callback after successful save
}
```

### Mode Behavior

**Create Mode** (existing):
- Dialog title: "Create Portfolio"
- Button text: "Create Portfolio"
- Default values: Empty form
- Action: `portfolioStore.createPortfolio()`

**Edit Mode** (new):
- Dialog title: "Edit Portfolio"
- Button text: "Save Changes"
- Default values: Populate from `portfolio` prop
- Action: `portfolioStore.updatePortfolio()`

### Form Fields

**Unchanged Fields**:
- Portfolio Name (text input, 1-100 chars, required)
- Portfolio Type (select: taxable, ira, 401k, roth)
- Currency (text input, 3 chars, default: 'USD')

**Settings Section**:
- Rebalance Threshold (number input, 0-100%, default: 5)
- Tax Strategy (select: fifo, lifo, specific, default: fifo)
- Auto Rebalance (checkbox, default: false)
- Dividend Reinvestment (checkbox, default: false)

### Type Change Validation

**NEW Logic for Edit Mode**:
```typescript
const onSubmit = async (data: PortfolioFormData) => {
  if (mode === 'edit' && portfolio) {
    // Check if type changed
    if (data.type !== portfolio.type) {
      // Count transactions
      const transactionCount = await db.transactions
        .where('portfolioId')
        .equals(portfolio.id)
        .count();

      if (transactionCount > 0) {
        // Show confirmation dialog
        const confirmed = await showConfirmDialog({
          title: 'Change Portfolio Type?',
          message: `This portfolio has ${transactionCount} transaction(s). Changing the type may affect tax calculations. Are you sure?`,
          confirmText: 'Change Type',
          variant: 'warning',
        });

        if (!confirmed) return; // User cancelled
      }
    }

    // Proceed with update
    await portfolioStore.updatePortfolio(portfolio.id, data);
    onSave?.(updatedPortfolio);
  } else {
    // Create mode
    await portfolioStore.createPortfolio(data);
  }

  onOpenChange(false);
};
```

### Form Validation (Zod)

**Reuse Existing Schemas**:
```typescript
import {
  portfolioTypeSchema,
  portfolioSettingsSchema,
  createPortfolioSchema,
} from '@/lib/db/validation';

const formSchema = createPortfolioSchema;
```

**Additional Validation for Edit Mode**:
- Name uniqueness check (exclude current portfolio)
- Type change warning (handled in onSubmit, not schema)

### Component Structure

```typescript
export function CreatePortfolioDialog({
  open,
  onOpenChange,
  mode = 'create',
  portfolio,
  onSave,
}: CreatePortfolioDialogProps) {
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
          name: '',
          type: 'taxable',
          currency: 'USD',
          settings: {
            rebalanceThreshold: 5,
            taxStrategy: 'fifo',
            autoRebalance: false,
            dividendReinvestment: false,
          },
        },
  });

  const title = mode === 'edit' ? 'Edit Portfolio' : 'Create Portfolio';
  const submitText = mode === 'edit' ? 'Save Changes' : 'Create Portfolio';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Form fields... */}
            <DialogFooter>
              <Button type="submit">{submitText}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### Testing Contract

**Unit Tests**:
```typescript
describe('CreatePortfolioDialog - Edit Mode', () => {
  it('should populate form with portfolio data in edit mode', () => {
    render(<CreatePortfolioDialog mode="edit" portfolio={mockPortfolio} />);
    expect(screen.getByLabelText(/name/i)).toHaveValue(mockPortfolio.name);
  });

  it('should show type change warning when type changed with transactions', async () => {
    // Mock transaction count > 0
    await userEvent.selectOptions(screen.getByLabelText(/type/i), 'ira');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByText(/change portfolio type/i)).toBeVisible();
  });

  it('should call updatePortfolio in edit mode', async () => {
    const mockUpdate = vi.spyOn(portfolioStore, 'updatePortfolio');
    // Fill form and submit
    expect(mockUpdate).toHaveBeenCalledWith(portfolio.id, expect.any(Object));
  });
});
```

**E2E Tests**:
```typescript
test('should edit portfolio name', async ({ page }) => {
  await page.goto('/portfolios');
  await page.getByRole('button', { name: /edit/i }).first().click();
  await page.getByLabel(/name/i).fill('Updated Portfolio');
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText('Updated Portfolio')).toBeVisible();
});
```

---

## DeletePortfolioDialog

**Component**: `src/components/portfolio/delete-portfolio-dialog.tsx`

**Purpose**: Graduated confirmation dialog based on transaction count

### Props API

```typescript
interface DeletePortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portfolio: Portfolio;
  transactionCount: number;  // Fetched by parent component
  onDelete: () => void;      // Callback after successful deletion
}
```

### Confirmation Levels

**Level 1: No Transactions**
- Simple confirmation dialog
- Message: "This portfolio has no transactions. Delete it?"
- Button: "Delete Portfolio" (destructive variant)
- No typing requirement

**Level 2: 1-10 Transactions**
- Standard confirmation dialog with warning
- Message: "This will permanently delete all holdings and X transaction(s). This action cannot be undone."
- Checkbox: "I understand this will delete all data"
- Button: "Delete Portfolio" (disabled until checkbox checked)

**Level 3: >10 Transactions**
- High-protection confirmation with typed name
- Message: "This portfolio has X transactions. Type the portfolio name to confirm deletion:"
- Text Input: Must match portfolio name exactly (case-sensitive)
- Button: "Delete Portfolio" (disabled until name matches)

### Special Cases

**Last Portfolio Warning**:
```typescript
if (isLastPortfolio) {
  message = `This is your last portfolio. If you delete it, you'll see an empty state and will need to create a new portfolio to manage investments.`;
}
```

**Currently Selected Portfolio**:
- Show message: "This is your currently selected portfolio. After deletion, you'll be switched to [next portfolio name]."
- If last portfolio: "After deletion, you'll see the empty state."

### Component Structure

```typescript
export function DeletePortfolioDialog({
  open,
  onOpenChange,
  portfolio,
  transactionCount,
  onDelete,
}: DeletePortfolioDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [checkboxChecked, setCheckboxChecked] = useState(false);

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
    await portfolioStore.deletePortfolio(portfolio.id);
    onDelete();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Portfolio?</AlertDialogTitle>
          <AlertDialogDescription>
            {getMessage()}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {requiresCheckbox && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="confirm-delete"
              checked={checkboxChecked}
              onCheckedChange={setCheckboxChecked}
            />
            <label htmlFor="confirm-delete">
              I understand this will delete all data
            </label>
          </div>
        )}

        {requiresTyping && (
          <div className="space-y-2">
            <Label>Type portfolio name to confirm:</Label>
            <Input
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
            className="bg-destructive text-destructive-foreground"
          >
            Delete Portfolio
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Message Logic

```typescript
function getMessage(): string {
  let message = '';

  // Base message based on transaction count
  if (transactionCount === 0) {
    message = 'This portfolio has no transactions. Delete it?';
  } else if (transactionCount <= 10) {
    message = `This will permanently delete all holdings and ${transactionCount} transaction(s). This action cannot be undone.`;
  } else {
    message = `This portfolio has ${transactionCount} transactions. Type the portfolio name to confirm deletion:`;
  }

  // Add last portfolio warning
  if (isLastPortfolio) {
    message += `\n\nThis is your last portfolio. If you delete it, you'll see an empty state and will need to create a new portfolio to manage investments.`;
  }

  // Add current portfolio notice
  if (portfolio.id === currentPortfolio?.id && !isLastPortfolio) {
    const nextPortfolio = getNextPortfolio(); // Most recently used
    message += `\n\nThis is your currently selected portfolio. After deletion, you'll be switched to "${nextPortfolio.name}".`;
  }

  return message;
}
```

### Testing Contract

**Unit Tests**:
```typescript
describe('DeletePortfolioDialog', () => {
  it('should allow immediate deletion with no transactions', () => {
    render(<DeletePortfolioDialog transactionCount={0} />);
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).not.toBeDisabled();
  });

  it('should require checkbox for 1-10 transactions', () => {
    render(<DeletePortfolioDialog transactionCount={5} />);
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeDisabled();

    const checkbox = screen.getByRole('checkbox');
    userEvent.click(checkbox);
    expect(deleteButton).not.toBeDisabled();
  });

  it('should require typed name for >10 transactions', () => {
    render(<DeletePortfolioDialog transactionCount={50} portfolio={mockPortfolio} />);
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeDisabled();

    const input = screen.getByPlaceholderText(mockPortfolio.name);
    userEvent.type(input, mockPortfolio.name);
    expect(deleteButton).not.toBeDisabled();
  });

  it('should show last portfolio warning', () => {
    // Mock portfolios.length = 1
    render(<DeletePortfolioDialog transactionCount={0} />);
    expect(screen.getByText(/last portfolio/i)).toBeVisible();
  });
});
```

**E2E Tests**:
```typescript
test('should delete portfolio with typing confirmation', async ({ page }) => {
  await page.goto('/portfolios');
  await page.getByRole('button', { name: /delete/i }).first().click();
  await page.getByPlaceholder('Main Portfolio').fill('Main Portfolio');
  await page.getByRole('button', { name: /delete portfolio/i }).click();
  await expect(page.getByText('Main Portfolio')).not.toBeVisible();
});
```

---

## Shared Dependencies

### shadcn/ui Components
- **EditPortfolioDialog**: Dialog, Form, Input, Select, Button
- **DeletePortfolioDialog**: AlertDialog, Checkbox, Input, Label, Button

### Validation
- **EditPortfolioDialog**: Zod schemas from `@/lib/db/validation`
- **DeletePortfolioDialog**: Name matching validation (exact string match)

### Store Integration
- **EditPortfolioDialog**: `portfolioStore.updatePortfolio()`
- **DeletePortfolioDialog**: `portfolioStore.deletePortfolio()`

### Error Handling
- Both dialogs should handle store action failures gracefully
- Show error toast on failure
- Keep dialog open on error (allow user to retry or cancel)

---

## Accessibility

### EditPortfolioDialog
- Form fields properly labeled
- Keyboard navigation (Tab, Enter to submit)
- Error messages announced by screen readers
- Focus management (return to trigger button on close)

### DeletePortfolioDialog
- Clear destructive action indication
- Confirmation input properly labeled
- Cancel button as escape hatch
- Warning text announced by screen readers
