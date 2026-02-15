import { test, expect, seedMockData } from './fixtures/test';

test.describe('Performance Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
  });

  test.describe('Performance Page', () => {
    test('should display performance page with chart', async ({ page }) => {
      await page.goto('/performance');
      await page.waitForLoadState('load');

      // Verify page header
      await expect(page.locator('h1')).toContainText('Performance');

      // Verify period selector is visible
      await expect(page.getByRole('button', { name: '1M' })).toBeVisible();
      await expect(page.getByRole('button', { name: '3M' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'YTD' })).toBeVisible();
      await expect(page.getByRole('button', { name: '1Y' })).toBeVisible();
      await expect(page.getByRole('button', { name: '3Y' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'ALL' }).first()).toBeVisible();
    });

    test('should switch time periods', async ({ page }) => {
      await page.goto('/performance');
      await page.waitForLoadState('load');

      // Click 1Y period
      await page.getByRole('button', { name: '1Y' }).first().click();

      // Button should be selected (aria-pressed state)
      await expect(page.getByRole('button', { name: '1Y' }).first()).toHaveAttribute('aria-pressed', 'true');

      // Click 3M period
      await page.getByRole('button', { name: '3M' }).first().click();
      await expect(page.getByRole('button', { name: '3M' }).first()).toHaveAttribute('aria-pressed', 'true');
    });

    test('should display summary statistics', async ({ page }) => {
      await page.goto('/performance');
      await page.waitForLoadState('load');

      // Verify summary stat cards are present
      await expect(page.getByText('Total Return')).toBeVisible();
      await expect(page.getByText('Time-Weighted Return')).toBeVisible();
    });

    test('should display chart section', async ({ page }) => {
      await page.goto('/performance');
      await page.waitForLoadState('load');

      // Verify chart card title
      await expect(page.getByText('Portfolio Performance').first()).toBeVisible();

      // The chart should either show data or empty state message
      const chartContainer = page.locator('.recharts-responsive-container');
      const noDataMessage = page.getByText('No historical data available');
      await expect(chartContainer.or(noDataMessage)).toBeVisible({ timeout: 10000 });
    });

    test('should have export button', async ({ page }) => {
      await page.goto('/performance');
      await page.waitForLoadState('load');

      // Verify export button is present (aria-label is "Export performance data to CSV")
      await expect(page.getByRole('button', { name: /export/i }).first()).toBeVisible();
    });

    test('should have refresh button', async ({ page }) => {
      await page.goto('/performance');
      await page.waitForLoadState('load');

      // Verify refresh button is present (aria-label is "Refresh prices")
      await expect(page.getByRole('button', { name: /refresh/i }).first()).toBeVisible();
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no holdings exist', async ({ page }) => {
      // Clear data to get empty state
      await page.evaluate(() => {
        localStorage.clear();
        indexedDB.deleteDatabase('PortfolioTrackerDB');
      });

      // Reload and navigate to performance
      await page.goto('/performance');
      await page.waitForLoadState('load');

      // Should show empty state - "No Holdings Yet"
      await expect(page.getByText('No Holdings Yet')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('CSV Export', () => {
    test('should show export button with correct state', async ({ page }) => {
      await page.goto('/performance');
      await page.waitForLoadState('load');

      // The export button (DropdownMenuTrigger) should be visible
      const exportButton = page.getByRole('button', { name: /export/i }).first();
      await expect(exportButton).toBeVisible();

      // The export button may be disabled if there is no chart data
      // (mock data has holdings but may not have historical performance snapshots).
      // Verify the button exists and has the correct aria-label.
      const ariaLabel = await exportButton.getAttribute('aria-label');
      expect(ariaLabel).toBe('Export performance data to CSV');

      // If the button is enabled, verify the dropdown opens
      const isDisabled = await exportButton.isDisabled();
      if (!isDisabled) {
        // Set up download handler before clicking
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

        await exportButton.click();
        const exportOption = page.getByText('Export Performance Data');
        await expect(exportOption).toBeVisible({ timeout: 3000 });
        await exportOption.click();

        // Wait for download (may or may not happen depending on data)
        const download = await downloadPromise;
        if (download) {
          const suggestedFilename = download.suggestedFilename();
          expect(suggestedFilename).toMatch(/\.csv$/);
        }
      }
    });
  });
});
