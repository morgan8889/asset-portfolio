# E2E Test Specifications: Holdings Property Feature

**Feature**: 009-holdings-property
**Framework**: Playwright
**Location**: `tests/e2e/property-*.spec.ts`
**Created**: 2026-01-30

---

## Test Configuration

```typescript
// playwright.config.ts addition
{
  name: 'property-tests',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  timeout: 30000, // SC-001 requirement: < 30s
}
```

---

## T021: Property Addition Workflow (SC-001)

**File**: `tests/e2e/property-addition.spec.ts`
**Success Criteria**: SC-001 - Complete property addition in < 30 seconds
**Priority**: P1 (Critical user workflow)

### Test Suite Structure

```typescript
import { test, expect } from '@playwright/test';

describe('Property Addition Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and ensure clean state
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Create or select test portfolio
    await setupTestPortfolio(page);
  });

  test('should add basic property in under 30 seconds', async ({ page }) => {
    // SC-001 Test
  });

  test('should add rental property with yield calculation', async ({ page }) => {
    // T013 verification
  });

  test('should handle fractional ownership correctly', async ({ page }) => {
    // T009 verification
  });

  test('should validate required fields', async ({ page }) => {
    // Form validation test
  });
});
```

### Test Case T021.1: Basic Property Addition

```typescript
test('should add basic property in under 30 seconds', async ({ page }) => {
  const startTime = Date.now();

  // Navigate to holdings page
  await page.goto('/holdings');
  await page.waitForSelector('[data-testid="holdings-table"]');

  // Open add property dialog
  await page.click('[data-testid="add-asset-button"]');
  await page.click('[data-testid="add-real-estate-option"]');

  // Wait for dialog
  await page.waitForSelector('[data-testid="add-property-dialog"]');

  // Fill property form
  await page.fill('[name="name"]', 'Test Property');
  await page.fill('[name="purchasePrice"]', '500000');
  await page.fill('[name="currentValue"]', '500000');
  await page.fill('[name="purchaseDate"]', '2023-01-15');
  await page.fill('[name="ownershipPercentage"]', '100');

  // Submit form
  await page.click('[data-testid="submit-property"]');

  // Wait for success and table update
  await page.waitForSelector('text=Test Property');

  const endTime = Date.now();
  const duration = endTime - startTime;

  // SC-001 Assertion
  expect(duration).toBeLessThan(30000);

  // Verify property appears in list
  const propertyRow = page.locator('[data-testid="holding-row"]', {
    hasText: 'Test Property',
  });
  await expect(propertyRow).toBeVisible();

  // Verify net value displayed
  await expect(propertyRow.locator('[data-testid="net-value"]')).toContainText(
    '$500,000'
  );

  // Verify type badge
  await expect(propertyRow.locator('[data-testid="type-badge"]')).toContainText(
    'REAL ESTATE'
  );

  // Verify manual badge
  await expect(propertyRow.locator('[data-testid="manual-badge"]')).toBeVisible();
});
```

### Test Case T021.2: Rental Property with Yield

```typescript
test('should add rental property with yield calculation', async ({ page }) => {
  await page.goto('/holdings');

  // Open add property dialog
  await page.click('[data-testid="add-asset-button"]');
  await page.click('[data-testid="add-real-estate-option"]');

  // Fill basic info
  await page.fill('[name="name"]', 'Rental Condo');
  await page.fill('[name="purchasePrice"]', '400000');
  await page.fill('[name="currentValue"]', '400000');
  await page.fill('[name="purchaseDate"]', '2023-06-01');
  await page.fill('[name="ownershipPercentage"]', '100');

  // Toggle rental property
  await page.check('[name="isRental"]');

  // Verify monthly rent field appears
  await expect(page.locator('[name="monthlyRent"]')).toBeVisible();

  // Enter monthly rent
  await page.fill('[name="monthlyRent"]', '2000');

  // Submit
  await page.click('[data-testid="submit-property"]');

  // Verify property added
  await page.waitForSelector('text=Rental Condo');

  // Verify yield badge
  const rentalBadge = page.locator('[data-testid="rental-badge"]', {
    hasText: 'Rental',
  });
  await expect(rentalBadge).toBeVisible();

  // Verify yield calculation: (2000 * 12 / 400000) * 100 = 6%
  await expect(rentalBadge).toContainText('6.00%');
});
```

### Test Case T021.3: Fractional Ownership

```typescript
test('should handle fractional ownership correctly', async ({ page }) => {
  await page.goto('/holdings');

  // Add property with 50% ownership
  await page.click('[data-testid="add-asset-button"]');
  await page.click('[data-testid="add-real-estate-option"]');

  await page.fill('[name="name"]', 'Fractional Property');
  await page.fill('[name="purchasePrice"]', '600000');
  await page.fill('[name="currentValue"]', '650000');
  await page.fill('[name="purchaseDate"]', '2024-01-01');
  await page.fill('[name="ownershipPercentage"]', '50');

  await page.click('[data-testid="submit-property"]');

  // Verify net value calculation
  const propertyRow = page.locator('[data-testid="holding-row"]', {
    hasText: 'Fractional Property',
  });

  // Net value should be 50% of $650,000 = $325,000
  await expect(propertyRow.locator('[data-testid="net-value"]')).toContainText(
    '$325,000'
  );

  // Verify ownership badge
  await expect(
    propertyRow.locator('[data-testid="ownership-badge"]')
  ).toContainText('50% owned');

  // Verify gain/loss calculation
  // Cost basis: 50% of $600,000 = $300,000
  // Gain: $325,000 - $300,000 = $25,000
  await expect(propertyRow.locator('[data-testid="gain-loss"]')).toContainText(
    '$25,000'
  );
});
```

### Test Case T021.4: Form Validation

```typescript
test('should validate required fields', async ({ page }) => {
  await page.goto('/holdings');
  await page.click('[data-testid="add-asset-button"]');
  await page.click('[data-testid="add-real-estate-option"]');

  // Try to submit empty form
  await page.click('[data-testid="submit-property"]');

  // Verify error messages
  await expect(page.locator('text=Property name is required')).toBeVisible();
  await expect(page.locator('text=Enter a valid amount')).toBeVisible();

  // Test invalid ownership percentage
  await page.fill('[name="ownershipPercentage"]', '150');
  await page.click('[data-testid="submit-property"]');
  await expect(page.locator('text=Cannot exceed 100')).toBeVisible();

  // Test rental without monthly rent
  await page.fill('[name="name"]', 'Test');
  await page.fill('[name="purchasePrice"]', '500000');
  await page.fill('[name="currentValue"]', '500000');
  await page.check('[name="isRental"]');
  // Don't fill monthlyRent
  await page.click('[data-testid="submit-property"]');
  await expect(
    page.locator('text=enter a valid monthly rent')
  ).toBeVisible();
});
```

---

## T022: Holdings List Performance (SC-002)

**File**: `tests/e2e/holdings-performance.spec.ts`
**Success Criteria**: SC-002 - Render < 200ms for 100 items
**Priority**: P1 (Performance requirement)

### Test Suite Structure

```typescript
import { test, expect } from '@playwright/test';

describe('Holdings List Performance', () => {
  test('should render 100 holdings in under 200ms', async ({ page }) => {
    // SC-002 Test
  });

  test('should handle large portfolios without lag', async ({ page }) => {
    // Stress test
  });

  test('should maintain performance with mixed asset types', async ({ page }) => {
    // Mixed asset test
  });
});
```

### Test Case T022.1: 100 Holdings Render Time

```typescript
test('should render 100 holdings in under 200ms', async ({ page }) => {
  // Generate mock data
  await page.goto('/test');
  await page.click('[data-testid="generate-mock-data"]');

  // Select configuration
  await page.selectOption('[data-testid="holding-count"]', '100');
  await page.selectOption('[data-testid="property-count"]', '10');
  await page.click('[data-testid="generate-button"]');

  // Wait for generation complete
  await page.waitForSelector('text=Data generated successfully');

  // Measure navigation and render time
  const navigationStart = Date.now();

  await page.goto('/holdings');

  // Wait for table to be interactive (not just visible)
  await page.waitForSelector('[data-testid="holdings-table"]', {
    state: 'visible',
  });
  await page.waitForFunction(
    () => document.querySelectorAll('[data-testid="holding-row"]').length > 0
  );

  const renderComplete = Date.now();
  const renderTime = renderComplete - navigationStart;

  // SC-002 Assertion
  expect(renderTime).toBeLessThan(200);

  // Verify all holdings loaded
  const rowCount = await page.locator('[data-testid="holding-row"]').count();
  expect(rowCount).toBe(100);

  // Verify table is interactive
  await page.click('[data-testid="filter-dropdown"]');
  await expect(page.locator('[data-testid="filter-options"]')).toBeVisible();
});
```

### Test Case T022.2: Performance with Filtering

```typescript
test('should maintain performance when filtering large portfolios', async ({
  page,
}) => {
  // Setup 100 holdings
  await setupMockPortfolio(page, 100);

  await page.goto('/holdings');
  await page.waitForSelector('[data-testid="holdings-table"]');

  // Measure filter application time
  const filterStart = performance.now();

  await page.selectOption('[data-testid="type-filter"]', 'real_estate');

  // Wait for filtered results
  await page.waitForFunction(
    (filterType) => {
      const badges = document.querySelectorAll('[data-testid="type-badge"]');
      return Array.from(badges).every((badge) =>
        badge.textContent?.includes(filterType)
      );
    },
    'REAL ESTATE'
  );

  const filterEnd = performance.now();
  const filterTime = filterEnd - filterStart;

  // Filter should complete quickly
  expect(filterTime).toBeLessThan(100);

  // Verify filtered count
  const filteredCount = await page
    .locator('[data-testid="holding-row"]')
    .count();
  expect(filteredCount).toBe(10); // 10 properties in mock data
});
```

### Test Case T022.3: Scroll Performance

```typescript
test('should maintain smooth scrolling with 100+ items', async ({ page }) => {
  await setupMockPortfolio(page, 150);
  await page.goto('/holdings');

  // Measure scroll performance
  const scrollMetrics = await page.evaluate(async () => {
    const table = document.querySelector('[data-testid="holdings-table"]');
    if (!table) return { fps: 0 };

    let frameCount = 0;
    let startTime = performance.now();

    // Scroll to bottom
    const scrollPromise = new Promise((resolve) => {
      const checkScroll = () => {
        frameCount++;
        if (table.scrollTop < table.scrollHeight - table.clientHeight) {
          table.scrollTop += 50;
          requestAnimationFrame(checkScroll);
        } else {
          resolve(null);
        }
      };
      requestAnimationFrame(checkScroll);
    });

    await scrollPromise;

    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000;
    const fps = frameCount / duration;

    return { fps, duration };
  });

  // Should maintain at least 30 FPS
  expect(scrollMetrics.fps).toBeGreaterThan(30);
});
```

---

## T023: Real Estate Filter (SC-003)

**File**: `tests/e2e/holdings-filter.spec.ts`
**Success Criteria**: SC-003 - Filter correctly hides non-property assets
**Priority**: P1 (Core functionality)

### Test Suite Structure

```typescript
import { test, expect } from '@playwright/test';

describe('Holdings Type Filter', () => {
  test('should filter to show only Real Estate', async ({ page }) => {
    // SC-003 Test
  });

  test('should return to all assets when filter cleared', async ({ page }) => {
    // Reset test
  });

  test('should preserve filter during search', async ({ page }) => {
    // Combined filter test
  });

  test('should update totals based on filtered view', async ({ page }) => {
    // Calculation test
  });
});
```

### Test Case T023.1: Real Estate Filter

```typescript
test('should filter to show only Real Estate', async ({ page }) => {
  // Add mixed assets
  await page.goto('/holdings');

  // Add 3 stocks
  await addStock(page, 'AAPL', 10, 150);
  await addStock(page, 'GOOGL', 5, 120);
  await addStock(page, 'MSFT', 8, 300);

  // Add 2 properties
  await addProperty(page, 'Downtown Condo', 500000);
  await addProperty(page, 'Office Building', 800000);

  // Verify initial state - all 5 assets visible
  const allRows = await page.locator('[data-testid="holding-row"]').count();
  expect(allRows).toBe(5);

  // Apply Real Estate filter
  await page.selectOption('[data-testid="type-filter"]', 'real_estate');

  // Wait for filter to apply
  await page.waitForTimeout(500);

  // SC-003 Assertion: Only properties visible
  const filteredRows = await page.locator('[data-testid="holding-row"]').count();
  expect(filteredRows).toBe(2);

  // Verify only property names visible
  await expect(page.locator('text=Downtown Condo')).toBeVisible();
  await expect(page.locator('text=Office Building')).toBeVisible();

  // Verify stock symbols NOT visible
  await expect(page.locator('text=AAPL')).not.toBeVisible();
  await expect(page.locator('text=GOOGL')).not.toBeVisible();
  await expect(page.locator('text=MSFT')).not.toBeVisible();

  // Verify all type badges show REAL ESTATE
  const typeBadges = page.locator('[data-testid="type-badge"]');
  const badgeCount = await typeBadges.count();

  for (let i = 0; i < badgeCount; i++) {
    const badgeText = await typeBadges.nth(i).textContent();
    expect(badgeText).toContain('REAL ESTATE');
  }
});
```

### Test Case T023.2: Filter Reset

```typescript
test('should return to all assets when filter cleared', async ({ page }) => {
  await page.goto('/holdings');

  // Setup mixed portfolio
  await addStock(page, 'AAPL', 10, 150);
  await addProperty(page, 'Test Property', 500000);

  // Apply filter
  await page.selectOption('[data-testid="type-filter"]', 'real_estate');
  await page.waitForTimeout(300);

  let visibleCount = await page.locator('[data-testid="holding-row"]').count();
  expect(visibleCount).toBe(1);

  // Reset filter to "All"
  await page.selectOption('[data-testid="type-filter"]', 'all');
  await page.waitForTimeout(300);

  // Verify all assets visible again
  visibleCount = await page.locator('[data-testid="holding-row"]').count();
  expect(visibleCount).toBe(2);

  await expect(page.locator('text=AAPL')).toBeVisible();
  await expect(page.locator('text=Test Property')).toBeVisible();
});
```

### Test Case T023.3: Filter with Search

```typescript
test('should preserve filter during search', async ({ page }) => {
  await page.goto('/holdings');

  // Add multiple properties
  await addProperty(page, 'Apartment A', 300000);
  await addProperty(page, 'Apartment B', 350000);
  await addProperty(page, 'Office Building', 800000);
  await addStock(page, 'AAPL', 10, 150);

  // Filter to Real Estate
  await page.selectOption('[data-testid="type-filter"]', 'real_estate');

  // Search for "Apartment"
  await page.fill('[data-testid="search-input"]', 'Apartment');
  await page.waitForTimeout(300);

  // Should show only apartments (2), not office
  const results = await page.locator('[data-testid="holding-row"]').count();
  expect(results).toBe(2);

  await expect(page.locator('text=Apartment A')).toBeVisible();
  await expect(page.locator('text=Apartment B')).toBeVisible();
  await expect(page.locator('text=Office Building')).not.toBeVisible();

  // Stock should not appear even if search matches
  await expect(page.locator('text=AAPL')).not.toBeVisible();
});
```

### Test Case T023.4: Filtered Totals

```typescript
test('should update totals based on filtered view', async ({ page }) => {
  await page.goto('/holdings');

  // Add known values
  await addStock(page, 'AAPL', 10, 150); // $1,500
  await addProperty(page, 'Property A', 500000); // $500,000
  await addProperty(page, 'Property B', 300000); // $300,000

  // Check total for all assets
  let totalValue = await page
    .locator('[data-testid="total-value"]')
    .textContent();
  expect(totalValue).toContain('$801,500');

  // Filter to Real Estate only
  await page.selectOption('[data-testid="type-filter"]', 'real_estate');
  await page.waitForTimeout(300);

  // Total should update to properties only
  totalValue = await page
    .locator('[data-testid="total-value"]')
    .textContent();
  expect(totalValue).toContain('$800,000');

  // Filter to Stocks only
  await page.selectOption('[data-testid="type-filter"]', 'stock');
  await page.waitForTimeout(300);

  totalValue = await page
    .locator('[data-testid="total-value"]')
    .textContent();
  expect(totalValue).toContain('$1,500');
});
```

---

## Test Utilities

### Helper Functions

```typescript
// tests/e2e/helpers/property-helpers.ts

export async function addProperty(
  page: Page,
  name: string,
  currentValue: number,
  options?: {
    purchasePrice?: number;
    ownershipPercentage?: number;
    isRental?: boolean;
    monthlyRent?: number;
  }
) {
  await page.click('[data-testid="add-asset-button"]');
  await page.click('[data-testid="add-real-estate-option"]');

  await page.fill('[name="name"]', name);
  await page.fill(
    '[name="purchasePrice"]',
    (options?.purchasePrice || currentValue).toString()
  );
  await page.fill('[name="currentValue"]', currentValue.toString());
  await page.fill('[name="ownershipPercentage"]', (options?.ownershipPercentage || 100).toString());

  if (options?.isRental) {
    await page.check('[name="isRental"]');
    await page.fill('[name="monthlyRent"]', (options.monthlyRent || 0).toString());
  }

  await page.click('[data-testid="submit-property"]');
  await page.waitForSelector(`text=${name}`);
}

export async function setupMockPortfolio(
  page: Page,
  holdingCount: number
) {
  await page.goto('/test');
  await page.click('[data-testid="generate-mock-data"]');
  await page.fill('[data-testid="holding-count"]', holdingCount.toString());
  await page.click('[data-testid="generate-button"]');
  await page.waitForSelector('text=Data generated successfully');
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/e2e-property-tests.yml
name: E2E Property Tests

on:
  pull_request:
    paths:
      - 'src/lib/services/property-service.ts'
      - 'src/components/holdings/**'
      - 'src/components/tables/holdings-table.tsx'
      - 'tests/e2e/property-*.spec.ts'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npx playwright test tests/e2e/property-*.spec.ts
        env:
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Performance Benchmarks

### Expected Results

| Test | Target | Measured | Status |
|------|--------|----------|--------|
| T021: Property addition | < 30s | TBD | ⏳ |
| T022: 100 holdings render | < 200ms | TBD | ⏳ |
| T023: Filter application | < 100ms | TBD | ⏳ |

### Performance Monitoring

```typescript
// Add to each performance test
test.afterEach(async ({}, testInfo) => {
  if (testInfo.annotations.find((a) => a.type === 'performance')) {
    // Log performance metrics
    console.log(`Duration: ${testInfo.duration}ms`);
  }
});
```

---

## Test Execution Guide

### Run All Property Tests

```bash
# Run all E2E tests for property feature
npx playwright test tests/e2e/property-*.spec.ts

# Run with UI mode for debugging
npx playwright test --ui tests/e2e/property-*.spec.ts

# Run specific test file
npx playwright test tests/e2e/property-addition.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed tests/e2e/property-filter.spec.ts
```

### Run Performance Tests Only

```bash
npx playwright test tests/e2e/holdings-performance.spec.ts --project=chromium
```

### Generate HTML Report

```bash
npx playwright test tests/e2e/property-*.spec.ts
npx playwright show-report
```

---

## Test Coverage Mapping

| Task | Test File | Test Cases | Status |
|------|-----------|------------|--------|
| T001-T004 | N/A (Integration test via other tests) | - | ✅ Implicit |
| T005-T008 | property-addition.spec.ts | T021.1-T021.3 | 📝 Spec ready |
| T009-T011 | holdings-filter.spec.ts | T023.1-T023.4 | 📝 Spec ready |
| T012-T013 | property-addition.spec.ts | T021.1, T021.2 | 📝 Spec ready |
| T016-T018 | manual-price-update.spec.ts | (Not yet specified) | ⏳ Pending |
| T019-T020 | property-addition.spec.ts | T021.2 (badges) | 📝 Spec ready |

---

## Next Steps for Test Implementation

1. **Create test files** in `tests/e2e/`:
   - `property-addition.spec.ts`
   - `holdings-performance.spec.ts`
   - `holdings-filter.spec.ts`

2. **Add test data attributes** to components:
   - `data-testid="holdings-table"`
   - `data-testid="add-property-dialog"`
   - `data-testid="type-filter"`

3. **Implement helper functions** in `tests/e2e/helpers/`

4. **Run initial test suite** and adjust selectors as needed

5. **Add CI/CD integration** for automated testing
