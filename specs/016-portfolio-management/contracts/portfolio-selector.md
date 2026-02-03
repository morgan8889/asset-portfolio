# Component Contract: PortfolioSelector

**Component**: `src/components/portfolio/portfolio-selector.tsx`

**Purpose**: Dropdown selector for switching between portfolios with sorted list display

## Props API

```typescript
interface PortfolioSelectorProps {
  // Optional className for styling
  className?: string;

  // Disabled state (e.g., during CSV import)
  disabled?: boolean;

  // Optional callback after portfolio switch
  onPortfolioChange?: (portfolio: Portfolio) => void;
}
```

## Behavior Specification

### Display Rules
- **Trigger Display**: Always shows current portfolio name and type
- **Format**: `{name} • {TYPE}` (e.g., "Main Portfolio • TAXABLE")
- **Dropdown List**: Sorted portfolios (current first, then by lastAccessedAt, then alphabetical)
- **Empty State**: If no portfolios exist, component should not render (handled by parent)

### Interaction Flow
1. User clicks selector trigger
2. Dropdown opens with sorted portfolio list
3. User selects portfolio
4. `portfolioStore.setCurrentPortfolio()` called
5. Dashboard updates to show new portfolio data
6. Optional `onPortfolioChange` callback fires

### Disabled State
- **Trigger**: `disabled={true}` prop OR `csvImportStore.isProcessing === true`
- **Visual**: Grayed out trigger, spinner icon
- **Overlay**: Display "Import in progress..." message
- **Behavior**: Click events blocked, no dropdown opening

### Keyboard Navigation
- **Arrow Down/Up**: Navigate through portfolio list
- **Enter**: Select highlighted portfolio
- **Escape**: Close dropdown without selection
- **Tab**: Move focus to next element (closes dropdown)

## State Dependencies

### Zustand Stores
```typescript
// portfolioStore
const { portfolios, currentPortfolio, setCurrentPortfolio } = usePortfolioStore();

// csvImportStore (for disabled state)
const { isProcessing } = useCsvImportStore();
```

### Derived State
```typescript
// Sorted portfolios for dropdown
const sortedPortfolios = useMemo(() => {
  return [...portfolios].sort((a, b) => {
    // Current portfolio always first
    if (a.id === currentPortfolio?.id) return -1;
    if (b.id === currentPortfolio?.id) return 1;

    // Then by lastAccessedAt (most recent first)
    const aTime = a.lastAccessedAt?.getTime() || 0;
    const bTime = b.lastAccessedAt?.getTime() || 0;
    if (aTime !== bTime) return bTime - aTime;

    // Alphabetical fallback
    return a.name.localeCompare(b.name);
  });
}, [portfolios, currentPortfolio?.id]);
```

## shadcn/ui Components

### Primary Component
```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
```

### Usage Pattern
```typescript
<Select
  value={currentPortfolio?.id}
  onValueChange={handlePortfolioSwitch}
  disabled={disabled || isImporting}
>
  <SelectTrigger className={cn("w-[280px]", className)}>
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

## Error Handling

### Portfolio Not Found
```typescript
const handlePortfolioSwitch = (portfolioId: string) => {
  const portfolio = portfolios.find(p => p.id === portfolioId);
  if (!portfolio) {
    logger.error('Portfolio not found:', portfolioId);
    return; // Graceful degradation - keep current portfolio
  }
  setCurrentPortfolio(portfolio);
  onPortfolioChange?.(portfolio);
};
```

### Store Action Failure
- `setCurrentPortfolio()` should handle IndexedDB errors internally
- Component assumes optimistic UI update (Zustand state updates immediately)

## Accessibility

- **ARIA Role**: `combobox` (handled by shadcn/ui Select)
- **Keyboard Navigation**: Full arrow key support
- **Screen Reader**: Announces current portfolio and available options
- **Focus Management**: Returns focus to trigger after selection

## Testing Contracts

### Unit Tests (Vitest)
```typescript
describe('PortfolioSelector', () => {
  it('should render current portfolio name and type', () => {
    // Verify trigger displays "{name} • {TYPE}"
  });

  it('should sort portfolios correctly', () => {
    // Current first → by lastAccessedAt → alphabetical
  });

  it('should call setCurrentPortfolio on selection', () => {
    // Mock portfolioStore, verify action called
  });

  it('should be disabled during CSV import', () => {
    // Mock csvImportStore.isProcessing = true
    // Verify disabled state and overlay message
  });

  it('should support keyboard navigation', () => {
    // Arrow keys, Enter, Escape
  });
});
```

### E2E Tests (Playwright)
```typescript
test('should switch portfolios', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: /portfolio/i }).click();
  await page.getByRole('option', { name: /IRA Portfolio/i }).click();
  await expect(page.getByText('IRA Portfolio')).toBeVisible();
});

test('should block switching during CSV import', async ({ page }) => {
  // Start CSV import
  // Verify selector disabled with message
});
```

## Performance Considerations

- **Memoization**: `sortedPortfolios` memoized to avoid re-sorting on every render
- **Component Size**: Lightweight (<100 lines), no performance concerns
- **Re-render Optimization**: Use React.memo if parent re-renders frequently

## Integration Points

### DashboardHeader
- Replace static portfolio badges (lines 34-41) with `<PortfolioSelector />`
- Maintain position and styling consistency

### CSV Import Dialog
- No direct integration - disabled state via csvImportStore

### Price Polling
- No direct integration - polling update handled by priceStore watching holdings
