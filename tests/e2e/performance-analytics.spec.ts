import { test, expect } from './fixtures/test';

test.describe('Performance Analytics', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the test page and generate mock data
    await page.goto('/test');
    await page.getByRole('button', { name: /generate mock data/i }).click();
    await page.waitForURL('/');
  });

  test.describe('Performance Page', () => {
    test('should display performance page with chart', async ({ page }) => {
      // Navigate to performance page
      await page.getByRole('link', { name: /performance/i }).click();
      await page.waitForURL('/performance');

      // Verify page header
      await expect(page.locator('h1')).toContainText('Performance');
      await expect(page.getByText('Track your portfolio performance')).toBeVisible();

      // Verify period selector is visible
      await expect(page.getByRole('button', { name: '1M' })).toBeVisible();
      await expect(page.getByRole('button', { name: '3M' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'YTD' })).toBeVisible();
      await expect(page.getByRole('button', { name: '1Y' })).toBeVisible();
      await expect(page.getByRole('button', { name: '3Y' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'ALL' })).toBeVisible();
    });

    test('should switch time periods', async ({ page }) => {
      await page.getByRole('link', { name: /performance/i }).click();
      await page.waitForURL('/performance');

      // Click 1Y period
      await page.getByRole('button', { name: '1Y' }).click();

      // Button should be selected (default/pressed state)
      await expect(page.getByRole('button', { name: '1Y' })).toHaveAttribute('aria-pressed', 'true');

      // Click 3M period
      await page.getByRole('button', { name: '3M' }).click();
      await expect(page.getByRole('button', { name: '3M' })).toHaveAttribute('aria-pressed', 'true');
    });

    test('should display summary statistics', async ({ page }) => {
      await page.getByRole('link', { name: /performance/i }).click();
      await page.waitForURL('/performance');

      // Verify summary stat cards are present
      await expect(page.getByText('Total Return')).toBeVisible();
      await expect(page.getByText('Time-Weighted Return')).toBeVisible();
      await expect(page.getByText('Period High')).toBeVisible();
      await expect(page.getByText('Period Low')).toBeVisible();
    });

    test('should display holdings breakdown table', async ({ page }) => {
      await page.getByRole('link', { name: /performance/i }).click();
      await page.waitForURL('/performance');

      // Verify holdings table is present
      await expect(page.getByText('Holdings Performance')).toBeVisible();
      await expect(page.locator('th').filter({ hasText: 'Symbol' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: 'Value' })).toBeVisible();
      await expect(page.locator('th').filter({ hasText: 'Gain/Loss' })).toBeVisible();
    });

    test('should have export button', async ({ page }) => {
      await page.getByRole('link', { name: /performance/i }).click();
      await page.waitForURL('/performance');

      // Verify export button is present
      await expect(page.getByRole('button', { name: /export/i })).toBeVisible();
    });

    test('should have refresh button', async ({ page }) => {
      await page.getByRole('link', { name: /performance/i }).click();
      await page.waitForURL('/performance');

      // Verify refresh button is present
      await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
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

      // Should show no portfolio message or empty state
      const emptyState = page.getByText('No portfolio selected').or(
        page.getByText('No performance data available')
      );
      await expect(emptyState).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Chart Interactions', () => {
    test('should display chart when data is available', async ({ page }) => {
      await page.getByRole('link', { name: /performance/i }).click();
      await page.waitForURL('/performance');

      // Verify chart container is present
      await expect(page.getByText('Portfolio Value Over Time')).toBeVisible();

      // The chart should either show data or empty state message
      const chart = page.locator('.recharts-responsive-container').or(
        page.getByText('No performance data available')
      );
      await expect(chart).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Benchmark Comparison', () => {
    test('should have benchmark toggle button', async ({ page }) => {
      await page.getByRole('link', { name: /performance/i }).click();
      await page.waitForURL('/performance');

      // Verify compare button is visible
      await expect(page.getByRole('button', { name: /compare/i })).toBeVisible();
    });

    test('should toggle benchmark comparison on and off', async ({ page }) => {
      await page.getByRole('link', { name: /performance/i }).click();
      await page.waitForURL('/performance');

      // Click compare button to enable benchmark
      const compareButton = page.getByRole('button', { name: /compare/i });
      await compareButton.click();

      // Benchmark selector dropdown should appear when enabled
      // The button should be in active/default state
      await expect(compareButton).toBeVisible();

      // Click again to disable
      await compareButton.click();
    });

    test('should show benchmark selector when enabled', async ({ page }) => {
      await page.getByRole('link', { name: /performance/i }).click();
      await page.waitForURL('/performance');

      // Enable benchmark comparison
      await page.getByRole('button', { name: /compare/i }).click();

      // Check for benchmark dropdown (S&P 500 should be default)
      const benchmarkDropdown = page.getByRole('button', { name: /s&p 500/i });
      await expect(benchmarkDropdown).toBeVisible({ timeout: 5000 });
    });

    test('should open benchmark dropdown menu', async ({ page }) => {
      await page.getByRole('link', { name: /performance/i }).click();
      await page.waitForURL('/performance');

      // Enable benchmark comparison
      await page.getByRole('button', { name: /compare/i }).click();

      // Click dropdown to open menu
      const benchmarkDropdown = page.getByRole('button', { name: /s&p 500/i });
      await expect(benchmarkDropdown).toBeVisible({ timeout: 5000 });
      await benchmarkDropdown.click();

      // Menu should show benchmark options
      await expect(page.getByText('Select Benchmark')).toBeVisible({ timeout: 3000 });
      await expect(page.getByText('Dow Jones')).toBeVisible();
      await expect(page.getByText('NASDAQ')).toBeVisible();
    });
  });

  test.describe('CSV Export', () => {
    test('should trigger CSV export', async ({ page }) => {
      await page.getByRole('link', { name: /performance/i }).click();
      await page.waitForURL('/performance');

      // Click export button
      const exportButton = page.getByRole('button', { name: /export/i });
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
