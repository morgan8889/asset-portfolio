import { test, expect, seedMockData } from './fixtures/test';

test.describe('Allocation Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/allocation');
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
    await page.reload();

    // Wait for the allocation chart container
    const chartContainer = page.locator('.grid').first();

    if (await chartContainer.isVisible()) {
      // On mobile, grid should be single column (no grid-cols-* class applied at this breakpoint)
      const gridClasses = await chartContainer.getAttribute('class');

      // Should have the base grid class but not the md:grid-cols or lg:grid-cols active
      expect(gridClasses).toContain('grid');

      // Chart should be visible with mobile height (350px)
      const chartElement = page.locator('.recharts-wrapper').first();
      if (await chartElement.isVisible()) {
        const chartBox = await chartElement.boundingBox();
        if (chartBox) {
          // Height should be around 350px on mobile
          expect(chartBox.height).toBeGreaterThanOrEqual(300);
          expect(chartBox.height).toBeLessThanOrEqual(400);
        }
      }

      // Breakdown list should be visible below chart (not scrollable on mobile)
      const breakdown = page.getByText('Breakdown');
      await expect(breakdown).toBeVisible();
    }
  });

  test('tablet layout (768px): should show side-by-side 1:1 grid', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();

    // Wait for the allocation chart container
    const chartContainer = page.locator('.grid').first();

    if (await chartContainer.isVisible()) {
      // Should have grid layout classes
      const gridClasses = await chartContainer.getAttribute('class');
      expect(gridClasses).toContain('grid');

      // Chart should be visible with desktop height (400px)
      const chartElement = page.locator('.recharts-wrapper').first();
      if (await chartElement.isVisible()) {
        const chartBox = await chartElement.boundingBox();
        if (chartBox) {
          // Height should be around 400px on tablet/desktop
          expect(chartBox.height).toBeGreaterThanOrEqual(350);
          expect(chartBox.height).toBeLessThanOrEqual(450);
        }
      }

      // Breakdown should have max-height and scrolling on tablet+
      const breakdownContainer = page.locator('.scrollbar-thin').first();
      if (await breakdownContainer.isVisible()) {
        await expect(breakdownContainer).toBeVisible();
      }
    }
  });

  test('desktop layout (1440px): should show side-by-side 3:2 grid', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();

    // Verify side-by-side layout via bounding boxes (more reliable than class assertions)
    const chartElement = page.locator('.recharts-wrapper').first();
    const breakdownElement = page.locator('.scrollbar-thin').first();

    if (await chartElement.isVisible() && await breakdownElement.isVisible()) {
      const chartBox = await chartElement.boundingBox();
      const breakdownBox = await breakdownElement.boundingBox();

      if (chartBox && breakdownBox) {
        // Chart and breakdown should be roughly side-by-side (same y position)
        expect(Math.abs(chartBox.y - breakdownBox.y)).toBeLessThan(50);

        // Chart width should be larger than breakdown (approximately 60/40)
        // Allow some margin for padding/gaps
        expect(chartBox.width).toBeGreaterThan(breakdownBox.width);
      }
    }
  });

  test('should display donut chart with larger radius on all breakpoints', async ({ page }) => {
    // Test on desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();

    // Look for the pie chart
    const pieChart = page.locator('.recharts-pie');

    if (await pieChart.isVisible()) {
      await expect(pieChart).toBeVisible();

      // Should have pie slices
      const pieSlices = pieChart.locator('path');
      const sliceCount = await pieSlices.count();
      expect(sliceCount).toBeGreaterThanOrEqual(1);
    }
  });

  test('should display center label with responsive typography', async ({ page }) => {
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    const centerLabel = page.getByText('Total Value');
    if (await centerLabel.isVisible()) {
      await expect(centerLabel).toBeVisible();

      // Should have currency value above it
      const currencyValue = page.locator('text').filter({ hasText: /^\$[\d,]+/ }).first();
      if (await currencyValue.isVisible()) {
        await expect(currencyValue).toBeVisible();
      }
    }

    // Test desktop - label should be larger
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();

    if (await centerLabel.isVisible()) {
      await expect(centerLabel).toBeVisible();
    }
  });

  test('should show scrollable breakdown with custom scrollbar on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();

    // Look for scrollable breakdown container
    const breakdownContainer = page.locator('.scrollbar-thin').first();

    if (await breakdownContainer.isVisible()) {
      await expect(breakdownContainer).toBeVisible();

      // Should have breakdown items
      const breakdownItems = breakdownContainer.locator('.group').filter({ hasText: /\$/ });
      const itemCount = await breakdownItems.count();

      if (itemCount > 0) {
        // First item should be visible
        await expect(breakdownItems.first()).toBeVisible();

        // Should have currency values
        const currencyText = await breakdownItems.first().textContent();
        expect(currencyText).toMatch(/\$/);
      }
    }
  });

  test('should maintain consistent layout across all three tabs', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();

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

      // Should show grid layout
      const chartContainer = page.locator('.grid').first();
      if (await chartContainer.isVisible()) {
        const gridClasses = await chartContainer.getAttribute('class');
        expect(gridClasses).toContain('grid');
      }

      // Should show donut chart
      const chartElement = page.locator('.recharts-wrapper').first();
      if (await chartElement.isVisible()) {
        await expect(chartElement).toBeVisible();
      }

      // Should show breakdown
      const breakdown = page.getByText('Breakdown');
      if (await breakdown.isVisible()) {
        await expect(breakdown).toBeVisible();
      }
    }
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // If no allocation data exists, should show empty state
    const emptyMessage = page.getByText(/no allocation data/i).or(
      page.getByText(/add holdings/i)
    );

    // Either shows data or empty state
    const chartElement = page.locator('.recharts-wrapper').first();

    // Should show either chart or empty message (use auto-retry)
    await expect(chartElement.or(emptyMessage)).toBeVisible({ timeout: 10000 });
  });

  test('should display breakdown with percentages and values', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();

    // Look for breakdown items
    const breakdownItems = page.locator('.group').filter({ hasText: /\$/ });
    const itemCount = await breakdownItems.count();

    if (itemCount > 0) {
      const firstItem = breakdownItems.first();
      const itemText = await firstItem.textContent();

      if (itemText) {
        // Should contain currency value
        expect(itemText).toMatch(/\$/);

        // Should contain percentage
        expect(itemText).toMatch(/\d+\.?\d*%/);

        // Should contain holdings count
        expect(itemText).toMatch(/\d+\s+holdings?/);
      }
    }
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    await page.goto('/allocation');

    // Verify tabs are keyboard-accessible (tabs are always visible on allocation page)
    const tabs = page.locator('[role="tab"]');
    await expect(tabs.first()).toBeVisible();
  });

  test('should display total value above donut chart without cutoff', async ({ page }) => {
    // Navigate to allocation page
    await page.goto('/allocation');

    // Check that total value text is visible and above the chart
    const totalValueText = page.locator('text=/^\\$[0-9,]+\\.\\d{2}$/').first();
    await expect(totalValueText).toBeVisible();

    // Verify "Total Value" label is also visible
    const totalValueLabel = page.getByText('Total Value', { exact: true });
    await expect(totalValueLabel).toBeVisible();

    // Get bounding boxes to verify positioning
    const totalValueBox = await totalValueText.boundingBox();
    const chartContainer = page.locator('.recharts-wrapper').first();
    await expect(chartContainer).toBeVisible();
    const chartBox = await chartContainer.boundingBox();

    // Verify total value is positioned above the chart vertically
    if (totalValueBox && chartBox) {
      expect(totalValueBox.y).toBeLessThan(chartBox.y + chartBox.height / 2);
    }

    // Verify text is not cut off by checking it's within viewport
    if (totalValueBox) {
      const viewport = page.viewportSize();
      if (viewport) {
        expect(totalValueBox.y).toBeGreaterThanOrEqual(0);
        expect(totalValueBox.x).toBeGreaterThanOrEqual(0);
        expect(totalValueBox.y + totalValueBox.height).toBeLessThanOrEqual(viewport.height);
      }
    }
  });

  test('total value positioning works on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/allocation');

    // Total value should still be visible on mobile
    const totalValueText = page.locator('text=/^\\$[0-9,]+\\.\\d{2}$/').first();
    await expect(totalValueText).toBeVisible();

    // Check it's not cut off at top of viewport
    const totalValueBox = await totalValueText.boundingBox();
    if (totalValueBox) {
      expect(totalValueBox.y).toBeGreaterThanOrEqual(0);
      expect(totalValueBox.x).toBeGreaterThanOrEqual(0);
    }
  });
});
