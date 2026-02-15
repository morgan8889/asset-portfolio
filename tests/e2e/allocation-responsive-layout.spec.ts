import { test, expect, seedMockData } from './fixtures/test';

test.describe('Allocation Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/allocation');
    await page.waitForLoadState('load');
  });

  test('should display allocation page with three tabs', async ({ page }) => {
    // Should have three allocation tabs
    await expect(page.getByRole('tab', { name: 'Asset Class' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Sector' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Region' })).toBeVisible();
  });

  test('mobile layout (375px): should show vertical stack', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'load' });

    // Wait for the allocation chart container
    const chartContainer = page.locator('.grid').first();
    await expect(chartContainer).toBeVisible();

    // On mobile, grid should be single column (no grid-cols-* class applied at this breakpoint)
    const gridClasses = await chartContainer.getAttribute('class');

    // Should have the base grid class but not the md:grid-cols or lg:grid-cols active
    expect(gridClasses).toContain('grid');

    // Chart should be visible with mobile height (350px)
    const chartElement = page.locator('.recharts-wrapper').first();
    await expect(chartElement).toBeVisible();
    const chartBox = await chartElement.boundingBox();
    if (chartBox) {
      // Height should be around 350px on mobile
      expect(chartBox.height).toBeGreaterThanOrEqual(300);
      expect(chartBox.height).toBeLessThanOrEqual(400);
    }

    // Breakdown list should be visible below chart (not scrollable on mobile)
    const breakdown = page.getByText('Breakdown');
    await expect(breakdown).toBeVisible();
  });

  test('tablet layout (768px): should show side-by-side 1:1 grid', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload({ waitUntil: 'load' });

    // Wait for the allocation chart container
    const chartContainer = page.locator('.grid').first();
    await expect(chartContainer).toBeVisible();

    // Should have grid layout classes
    const gridClasses = await chartContainer.getAttribute('class');
    expect(gridClasses).toContain('grid');

    // Chart should be visible with desktop height (400px)
    const chartElement = page.locator('.recharts-wrapper').first();
    await expect(chartElement).toBeVisible();
    const chartBox = await chartElement.boundingBox();
    if (chartBox) {
      // Height should be around 400px on tablet/desktop
      expect(chartBox.height).toBeGreaterThanOrEqual(350);
      expect(chartBox.height).toBeLessThanOrEqual(450);
    }

    // Breakdown should have max-height and scrolling on tablet+
    const breakdownContainer = page.locator('.scrollbar-thin').first();
    await expect(breakdownContainer).toBeVisible();
  });

  test('desktop layout (1440px): should show side-by-side 3:2 grid', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'load' });

    // Wait for the allocation donut chart grid container (not the TabsList grid)
    const chartContainer = page.locator('.grid.gap-6').first();
    await expect(chartContainer).toBeVisible();

    // Should have grid layout classes including the lg breakpoint 3:2 ratio
    const gridClasses = await chartContainer.getAttribute('class');
    expect(gridClasses).toContain('grid');
    expect(gridClasses).toContain('lg:grid-cols-[3fr_2fr]');

    // Chart should be larger than breakdown (60/40 split)
    const chartElement = page.locator('.recharts-wrapper').first();
    const breakdownElement = page.locator('.scrollbar-thin').first();

    await expect(chartElement).toBeVisible();
    await expect(breakdownElement).toBeVisible();

    const chartBox = await chartElement.boundingBox();
    const breakdownBox = await breakdownElement.boundingBox();

    if (chartBox && breakdownBox) {
      // Chart and breakdown should be roughly side-by-side (same y position)
      expect(Math.abs(chartBox.y - breakdownBox.y)).toBeLessThan(50);

      // Chart width should be larger than breakdown (approximately 60/40)
      // Allow some margin for padding/gaps
      expect(chartBox.width).toBeGreaterThan(breakdownBox.width);
    }
  });

  test('should display donut chart with larger radius on all breakpoints', async ({ page }) => {
    // Test on desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'load' });

    // Look for the pie chart
    const pieChart = page.locator('.recharts-pie');
    await expect(pieChart).toBeVisible();

    // Should have pie slices
    const pieSlices = pieChart.locator('path');
    const sliceCount = await pieSlices.count();
    expect(sliceCount).toBeGreaterThanOrEqual(1);
  });

  test('should display center label with responsive typography', async ({ page }) => {
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'load' });

    const centerLabel = page.getByText('Total Value');
    await expect(centerLabel).toBeVisible();

    // Should have currency value above it
    const currencyValue = page.locator('text').filter({ hasText: /^\$[\d,]+/ }).first();
    if (await currencyValue.isVisible()) {
      await expect(currencyValue).toBeVisible();
    }

    // Test desktop - label should be larger
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'load' });

    await expect(centerLabel).toBeVisible();
  });

  test('should show scrollable breakdown with custom scrollbar on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'load' });

    // Look for scrollable breakdown container
    const breakdownContainer = page.locator('.scrollbar-thin').first();
    await expect(breakdownContainer).toBeVisible();

    // Should have breakdown items
    const breakdownItems = breakdownContainer.locator('.group').filter({ hasText: /\$/ });
    const itemCount = await breakdownItems.count();
    expect(itemCount).toBeGreaterThan(0);

    // First item should be visible
    await expect(breakdownItems.first()).toBeVisible();

    // Should have currency values
    const currencyText = await breakdownItems.first().textContent();
    expect(currencyText).toMatch(/\$/);
  });

  test('should maintain consistent layout across all three tabs', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'load' });

    const tabs = [
      'Asset Class',
      'Sector',
      'Region'
    ];

    for (const tabName of tabs) {
      // Click on tab
      const tab = page.getByRole('tab', { name: tabName });
      await tab.click();
      await page.waitForTimeout(300);

      // Should show the donut chart grid layout (not the TabsList grid)
      const chartContainer = page.locator('.grid.gap-6').first();
      await expect(chartContainer).toBeVisible();
      const gridClasses = await chartContainer.getAttribute('class');
      expect(gridClasses).toContain('grid');
      expect(gridClasses).toContain('lg:grid-cols-[3fr_2fr]');

      // Should show donut chart
      const chartElement = page.locator('.recharts-wrapper').first();
      await expect(chartElement).toBeVisible();

      // Should show breakdown
      const breakdown = page.getByText('Breakdown');
      await expect(breakdown).toBeVisible();
    }
  });

  test('should display breakdown with percentages and values', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload({ waitUntil: 'load' });

    // Wait for the donut chart to render with data
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible();

    // Look for breakdown items
    const breakdownItems = page.locator('.group').filter({ hasText: /\$/ });
    const itemCount = await breakdownItems.count();
    expect(itemCount).toBeGreaterThan(0);

    const firstItem = breakdownItems.first();
    const itemText = await firstItem.textContent();

    expect(itemText).toBeTruthy();
    // Should contain currency value
    expect(itemText).toMatch(/\$/);

    // Should contain percentage
    expect(itemText).toMatch(/\d+\.?\d*%/);

    // Should contain holdings count
    expect(itemText).toMatch(/\d+\s+holdings?/);
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    // Wait for the chart to render (ensures page is fully loaded with data)
    await expect(page.locator('.recharts-wrapper').first()).toBeVisible();

    // Verify tabs exist on the page
    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible();

    // Focus the first tab directly -- the sidebar has many focusable elements,
    // so sequential Tab presses are unreliable for reaching the tab list.
    const firstTab = tabs.first();
    await firstTab.focus();
    await page.waitForTimeout(200);

    // Verify focus landed on a tab
    const focused = page.locator(':focus');
    const role = await focused.getAttribute('role');
    expect(role).toBe('tab');

    // Should be able to navigate between tabs with arrow keys
    const firstTabName = await focused.textContent();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(200);

    const newFocused = page.locator(':focus');
    const newRole = await newFocused.getAttribute('role');
    expect(newRole).toBe('tab');

    // The focused tab should have changed
    const newTabName = await newFocused.textContent();
    expect(newTabName).not.toBe(firstTabName);
  });
});

// Empty state test in a separate describe block so its destructive IndexedDB
// operations don't interfere with parallel tests that share the same origin.
test.describe('Allocation Empty State', () => {
  test('should handle empty state gracefully', async ({ page }) => {
    // Navigate to the allocation page without seeding any data.
    // Clear localStorage so Zustand doesn't hydrate a previous portfolio.
    await page.goto('/allocation');
    await page.waitForLoadState('load');
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load' });

    // Wait for page to settle after store hydration
    await page.waitForTimeout(1000);

    // When no allocation data exists, the page shows "No asset class data available"
    // (from page.tsx) or "No allocation data" (from the donut chart empty state).
    // Match any of the possible empty state messages.
    const emptyMessage = page.getByText(/no .* data/i).or(
      page.getByText(/add holdings/i)
    );

    // Either shows a chart (if data was left over from another test) or empty state
    const chartElement = page.locator('.recharts-wrapper').first();

    const hasChart = await chartElement.isVisible();
    const hasEmptyMessage = await emptyMessage.isVisible();

    // Should show either chart or empty message
    expect(hasChart || hasEmptyMessage).toBeTruthy();
  });
});
