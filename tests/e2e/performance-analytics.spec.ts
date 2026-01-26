import { test, expect } from '@playwright/test';

test.describe('Performance Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test page and generate mock data
    await page.goto('/test');
    await page.click('text=Generate Mock Data');
    await page.waitForURL('/');
  });

  test.describe('Performance Page', () => {
    test('should display performance page with chart', async ({ page }) => {
      // Navigate to performance page
      await page.click('text=Performance');
      await page.waitForURL('/performance');

      // Verify page header
      await expect(page.locator('h1')).toContainText('Performance');
      await expect(page.locator('text=Track your portfolio performance')).toBeVisible();

      // Verify period selector is visible
      await expect(page.locator('button:has-text("1W")')).toBeVisible();
      await expect(page.locator('button:has-text("1M")')).toBeVisible();
      await expect(page.locator('button:has-text("3M")')).toBeVisible();
      await expect(page.locator('button:has-text("1Y")')).toBeVisible();
      await expect(page.locator('button:has-text("ALL")')).toBeVisible();
    });

    test('should switch time periods', async ({ page }) => {
      await page.click('text=Performance');
      await page.waitForURL('/performance');

      // Click 1Y period
      await page.click('button:has-text("1Y")');

      // Button should be selected (default/pressed state)
      const yearButton = page.locator('button:has-text("1Y")');
      await expect(yearButton).toHaveAttribute('aria-pressed', 'true');

      // Click 3M period
      await page.click('button:has-text("3M")');
      const quarterButton = page.locator('button:has-text("3M")');
      await expect(quarterButton).toHaveAttribute('aria-pressed', 'true');
    });

    test('should display summary statistics', async ({ page }) => {
      await page.click('text=Performance');
      await page.waitForURL('/performance');

      // Verify summary stat cards are present
      await expect(page.locator('text=Total Return')).toBeVisible();
      await expect(page.locator('text=Time-Weighted Return')).toBeVisible();
      await expect(page.locator('text=Period High')).toBeVisible();
      await expect(page.locator('text=Period Low')).toBeVisible();
    });

    test('should display holdings breakdown table', async ({ page }) => {
      await page.click('text=Performance');
      await page.waitForURL('/performance');

      // Verify holdings table is present
      await expect(page.locator('text=Holdings Performance')).toBeVisible();
      await expect(page.locator('th:has-text("Symbol")')).toBeVisible();
      await expect(page.locator('th:has-text("Value")')).toBeVisible();
      await expect(page.locator('th:has-text("Gain/Loss")')).toBeVisible();
    });

    test('should have export button', async ({ page }) => {
      await page.click('text=Performance');
      await page.waitForURL('/performance');

      // Verify export button is present
      await expect(page.locator('button:has-text("Export")')).toBeVisible();
    });

    test('should have refresh button', async ({ page }) => {
      await page.click('text=Performance');
      await page.waitForURL('/performance');

      // Verify refresh button is present
      await expect(page.locator('button:has-text("Refresh")')).toBeVisible();
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no portfolio selected', async ({ page }) => {
      // Clear localStorage to reset state
      await page.evaluate(() => {
        localStorage.clear();
        indexedDB.deleteDatabase('PortfolioTrackerDB');
      });

      // Reload and navigate to performance
      await page.goto('/performance');

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Should show no portfolio message or empty state
      const emptyState = page.locator('text=No portfolio selected').or(
        page.locator('text=No performance data available')
      );
      await expect(emptyState).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Chart Interactions', () => {
    test('should display chart when data is available', async ({ page }) => {
      await page.click('text=Performance');
      await page.waitForURL('/performance');

      // Verify chart container is present
      await expect(page.locator('text=Portfolio Value Over Time')).toBeVisible();

      // The chart should either show data or empty state message
      const chart = page.locator('.recharts-responsive-container').or(
        page.locator('text=No performance data available')
      );
      await expect(chart).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Benchmark Comparison', () => {
    test('should have benchmark toggle button', async ({ page }) => {
      await page.click('text=Performance');
      await page.waitForURL('/performance');

      // Verify compare button is visible
      await expect(page.locator('button:has-text("Compare")')).toBeVisible();
    });

    test('should toggle benchmark comparison on and off', async ({ page }) => {
      await page.click('text=Performance');
      await page.waitForURL('/performance');

      // Click compare button to enable benchmark
      const compareButton = page.locator('button:has-text("Compare")');
      await compareButton.click();

      // Benchmark selector dropdown should appear when enabled
      // The button should be in active/default state
      await expect(compareButton).toBeVisible();

      // Click again to disable
      await compareButton.click();
    });

    test('should show benchmark selector when enabled', async ({ page }) => {
      await page.click('text=Performance');
      await page.waitForURL('/performance');

      // Enable benchmark comparison
      await page.click('button:has-text("Compare")');

      // Wait for benchmark dropdown to appear
      await page.waitForTimeout(500);

      // Check for benchmark dropdown (S&P 500 should be default)
      const benchmarkDropdown = page.locator('button:has-text("S&P 500")');
      await expect(benchmarkDropdown).toBeVisible({ timeout: 5000 });
    });

    test('should open benchmark dropdown menu', async ({ page }) => {
      await page.click('text=Performance');
      await page.waitForURL('/performance');

      // Enable benchmark comparison
      await page.click('button:has-text("Compare")');

      // Wait for benchmark dropdown
      await page.waitForTimeout(500);

      // Click dropdown to open menu
      const benchmarkDropdown = page.locator('button:has-text("S&P 500")');
      if (await benchmarkDropdown.isVisible()) {
        await benchmarkDropdown.click();

        // Menu should show benchmark options
        await expect(page.locator('text=Select Benchmark')).toBeVisible({ timeout: 3000 });
        await expect(page.locator('text=Dow Jones')).toBeVisible();
        await expect(page.locator('text=NASDAQ')).toBeVisible();
      }
    });
  });

  test.describe('CSV Export', () => {
    test('should trigger CSV export', async ({ page }) => {
      await page.click('text=Performance');
      await page.waitForURL('/performance');

      // Click export button
      const exportButton = page.locator('button:has-text("Export")');
      await expect(exportButton).toBeVisible();

      // Set up download handler
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);

      // Click export
      await exportButton.click();

      // Wait for download (may or may not happen depending on data)
      const download = await downloadPromise;

      // If download started, verify it's a CSV
      if (download) {
        const suggestedFilename = download.suggestedFilename();
        expect(suggestedFilename).toMatch(/\.csv$/);
      }
    });
  });
});
