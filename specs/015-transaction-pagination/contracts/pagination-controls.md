# Component Contract: PaginationControls

## Overview

Reusable pagination UI component for displaying page navigation controls, page size selection, and transaction count information. Built with shadcn/ui primitives (Button, Select) and follows accessibility best practices.

## Component API

```typescript
interface PaginationControlsProps {
  currentPage: number;       // Current page (1-indexed)
  totalPages: number;        // Total number of pages
  pageSize: number;          // Current page size (10, 25, 50, 100)
  totalCount: number;        // Total number of items
  onPageChange: (page: number) => void;    // Callback when page changes
  onPageSizeChange: (size: number) => void; // Callback when page size changes
  isLoading?: boolean;       // Optional: Show loading state during navigation
  className?: string;        // Optional: Additional CSS classes
}

export function PaginationControls(props: PaginationControlsProps): JSX.Element
```

## Visual Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Showing 26-50 of 150 transactions    [25 per page ▼]  [◀ Previous] [Next ▶] │
└─────────────────────────────────────────────────────────────────┘
```

**Layout**:
- **Left**: Info text showing current range and total count
- **Right**: Page size selector + navigation buttons
- **Spacing**: `gap-4` between elements, `justify-between` for left/right alignment

## Behavior Specification

### Info Text Display

```typescript
const firstItem = (currentPage - 1) * pageSize + 1;
const lastItem = Math.min(currentPage * pageSize, totalCount);

// Display: "Showing {firstItem}-{lastItem} of {totalCount} transactions"
```

**Examples**:
- Page 1, size 25, total 100: "Showing 1-25 of 100 transactions"
- Page 4, size 25, total 100: "Showing 76-100 of 100 transactions"
- Page 2, size 50, total 80: "Showing 51-80 of 80 transactions"

### Previous Button

**State: Enabled**
- Condition: `currentPage > 1`
- Click: Calls `onPageChange(currentPage - 1)`
- Visual: Default button styling
- Aria: `aria-label="Go to previous page"`

**State: Disabled**
- Condition: `currentPage === 1`
- Click: No-op
- Visual: Grayed out, not clickable
- Aria: `aria-disabled="true"`

### Next Button

**State: Enabled**
- Condition: `currentPage < totalPages`
- Click: Calls `onPageChange(currentPage + 1)`
- Visual: Default button styling
- Aria: `aria-label="Go to next page"`

**State: Disabled**
- Condition: `currentPage === totalPages`
- Click: No-op
- Visual: Grayed out, not clickable
- Aria: `aria-disabled="true"`

### Page Size Selector

**Options**: 10, 25, 50, 100 transactions per page

**Rendering**:
```tsx
<Select value={pageSize.toString()} onValueChange={(val) => onPageSizeChange(Number(val))}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="10">10 per page</SelectItem>
    <SelectItem value="25">25 per page</SelectItem>
    <SelectItem value="50">50 per page</SelectItem>
    <SelectItem value="100">100 per page</SelectItem>
  </SelectContent>
</Select>
```

**Behavior**:
- On change: Calls `onPageSizeChange(newSize)`
- Visual feedback: Highlights selected option
- Aria: `aria-label="Select page size"`

### Loading State (Optional)

When `isLoading={true}`:
- Disable all buttons (Previous, Next)
- Show spinner icon next to info text
- Prevent page size changes

```tsx
{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
```

## Accessibility Requirements

### ARIA Labels
- Previous button: `aria-label="Go to previous page"`
- Next button: `aria-label="Go to next page"`
- Page size selector: `aria-label="Select page size"`
- Info text: Wrapped in semantic HTML (no special aria needed)

### Keyboard Navigation
- Tab: Cycle through page size selector → Previous button → Next button
- Enter/Space: Activate focused button or open selector
- Arrow keys: Navigate within page size dropdown
- Esc: Close page size dropdown

### Screen Reader Announcements
- Info text: Automatically read when component updates
- Button states: "Previous page button, disabled" when on first page
- Page size change: Announce new size selection

### Focus Management
- After page navigation: Focus remains on navigation button (no automatic focus jump)
- After page size change: Focus returns to page size selector
- Keyboard users can navigate without mouse

## Styling

### Default Styling (shadcn/ui)
```tsx
className="flex items-center justify-between px-4 py-3 border-t"
```

### Responsive Design
```tsx
// Mobile (< 640px): Stack vertically
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

// Desktop (≥ 640px): Horizontal layout with space-between
```

### Theme Support
- Follows shadcn/ui theming (light/dark mode)
- Uses semantic color tokens (`text-muted-foreground`, `border-input`)
- Button variants: `outline` for Previous/Next

### Custom Styling
Accept `className` prop for additional custom styles:
```tsx
<PaginationControls
  {...props}
  className="bg-gray-50 dark:bg-gray-900"
/>
```

## Edge Cases

### Single Page
**Scenario**: `totalPages === 1` or `totalCount <= pageSize`
**Behavior**: Component should NOT be rendered
```tsx
// In parent component
{pagination.totalPages > 1 && (
  <PaginationControls {...props} />
)}
```

### Zero Transactions
**Scenario**: `totalCount === 0`
**Behavior**: Component should NOT be rendered
```tsx
if (totalCount === 0) return null;
```

### Last Page Partial
**Scenario**: Page 4, size 25, total 85
**Display**: "Showing 76-85 of 85 transactions"
**Calculation**: `lastItem = Math.min(currentPage * pageSize, totalCount)`

### First Page
**Scenario**: `currentPage === 1`
**Previous Button**: Disabled
**Display**: "Showing 1-25 of 100 transactions"

### Last Page
**Scenario**: `currentPage === totalPages`
**Next Button**: Disabled
**Display**: "Showing 76-100 of 100 transactions"

## Usage Examples

### Basic Usage
```tsx
import { PaginationControls } from '@/components/tables/pagination-controls';

function TransactionTable() {
  const { pagination, setCurrentPage, setPageSize } = useTransactionStore();

  return (
    <Card>
      <CardContent>
        {/* Transaction table */}
      </CardContent>

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
}
```

### With Loading State
```tsx
const [isNavigating, setIsNavigating] = useState(false);

async function handlePageChange(page: number) {
  setIsNavigating(true);
  await setCurrentPage(page);
  setIsNavigating(false);
}

<PaginationControls
  {...props}
  onPageChange={handlePageChange}
  isLoading={isNavigating}
/>
```

### Custom Styling
```tsx
<PaginationControls
  {...props}
  className="bg-secondary/50 rounded-lg"
/>
```

## Component Testing

### Unit Tests (Required)
```typescript
describe('PaginationControls', () => {
  test('renders info text correctly', () => {
    // Verify: "Showing 1-25 of 100 transactions"
  });

  test('disables Previous button on first page', () => {
    render(<PaginationControls currentPage={1} totalPages={4} {...} />);
    expect(screen.getByLabelText('Go to previous page')).toBeDisabled();
  });

  test('disables Next button on last page', () => {
    render(<PaginationControls currentPage={4} totalPages={4} {...} />);
    expect(screen.getByLabelText('Go to next page')).toBeDisabled();
  });

  test('calls onPageChange when clicking Next', async () => {
    const handlePageChange = vi.fn();
    render(<PaginationControls currentPage={2} totalPages={4} onPageChange={handlePageChange} {...} />);
    await userEvent.click(screen.getByText('Next'));
    expect(handlePageChange).toHaveBeenCalledWith(3);
  });

  test('calls onPageSizeChange when selecting new size', async () => {
    const handlePageSizeChange = vi.fn();
    render(<PaginationControls pageSize={25} onPageSizeChange={handlePageSizeChange} {...} />);
    await userEvent.selectOptions(screen.getByLabelText('Select page size'), '50');
    expect(handlePageSizeChange).toHaveBeenCalledWith(50);
  });

  test('calculates lastItem correctly for partial last page', () => {
    // Page 4, size 25, total 85 → "Showing 76-85 of 85 transactions"
    const { getByText } = render(<PaginationControls currentPage={4} totalPages={4} pageSize={25} totalCount={85} {...} />);
    expect(getByText(/Showing 76-85 of 85 transactions/)).toBeInTheDocument();
  });
});
```

### Accessibility Tests
```typescript
describe('PaginationControls Accessibility', () => {
  test('has proper ARIA labels', () => {
    render(<PaginationControls {...props} />);
    expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
    expect(screen.getByLabelText('Select page size')).toBeInTheDocument();
  });

  test('supports keyboard navigation', async () => {
    render(<PaginationControls {...props} />);
    // Tab to Next button
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByText('Next')).toHaveFocus();
    // Press Enter
    await userEvent.keyboard('{Enter}');
    expect(props.onPageChange).toHaveBeenCalled();
  });
});
```

### Visual Regression Tests (E2E)
```typescript
test('pagination controls visual appearance', async ({ page }) => {
  await page.goto('/transactions');
  // Take screenshot of pagination controls
  await expect(page.locator('[data-testid="pagination-controls"]')).toHaveScreenshot('pagination-default.png');

  // Hover state
  await page.locator('button:has-text("Next")').hover();
  await expect(page.locator('[data-testid="pagination-controls"]')).toHaveScreenshot('pagination-hover.png');

  // Disabled state
  await page.locator('button:has-text("Previous")').click({ force: true }); // Navigate to page 1
  await expect(page.locator('[data-testid="pagination-controls"]')).toHaveScreenshot('pagination-first-page.png');
});
```

## Performance Considerations

### Rendering Optimization
```typescript
// Use React.memo to prevent unnecessary re-renders
export const PaginationControls = memo(function PaginationControls(props: PaginationControlsProps) {
  // Component implementation
});
```

### Event Handler Optimization
```typescript
// Wrap callbacks in useCallback to prevent re-creation
const handlePageChange = useCallback((page: number) => {
  onPageChange(page);
}, [onPageChange]);
```

### Lazy Loading (Future Enhancement)
```typescript
// For very large page counts (100+ pages), implement lazy loading of page numbers
// Current spec only requires Previous/Next, so this is out of scope
```

## Component Dependencies

### Required Imports
```typescript
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { memo } from 'react';
```

### Peer Dependencies
- `react` ≥ 18.0.0
- `lucide-react` ≥ 0.263.0
- `@radix-ui/react-select` ≥ 2.0.0 (via shadcn/ui)

## Versioning

**Current Version**: 1.0.0

**Breaking Changes**: None (new component)

**Future Enhancements** (not in current scope):
- Page number dropdown (e.g., "Page 2 of 10")
- Jump to page input field
- Keyboard shortcuts (Ctrl+Left/Right for navigation)
- Customizable page size options
- Item type text (e.g., "transactions", "records", "items")
