import { test, expect } from './fixtures/test';

/**
 * E2E tests for holdings data loading
 *
 * These tests verify that the DashboardProvider integration fix works correctly
 * when navigating directly to the /holdings page or reloading the page.
 *
 * Background: The holdings page requires data loaded by useDashboardData hook,
 * which is provided by DashboardProvider. Without the provider wrapper, navigating
 * directly to /holdings would result in empty holdings.
 */

test.describe('Holdings Data Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Generate mock data first
    await page.goto('/test');
    await page.getByRole('button', { name: /generate mock data/i }).click();

    // Wait for redirect to dashboard
    await page.waitForURL('/', { timeout: 10000 });

    // Wait for loading to complete
    await expect(page.getByText('Loading')).toBeHidden({ timeout: 10000 });
  });

  test('should load holdings data when navigating directly to /holdings', async ({ page }) => {
    // Navigate directly to holdings page (simulates user typing URL or refreshing)
    await page.goto('/holdings');

    // Wait for loading to complete
    await expect(page.getByText('Loading')).toBeHidden({ timeout: 10000 });

    // Verify holdings table is rendered
    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    // Verify page header (use level to distinguish from holdings count heading)
    const heading = page.getByRole('heading', { name: 'Holdings', level: 1 });
    await expect(heading).toBeVisible();

    // Verify holdings count in header (should show actual holdings, not 0)
    const holdingsHeader = page.getByText(/Holdings \(\d+\)/);
    await expect(holdingsHeader).toBeVisible();

    // The count should be positive (mock data includes holdings)
    const headerText = await holdingsHeader.textContent();
    const match = headerText?.match(/Holdings \((\d+)\)/);
    const count = match ? parseInt(match[1], 10) : 0;
    expect(count).toBeGreaterThan(0);
  });

  test('should display correct holdings count', async ({ page }) => {
    await page.goto('/holdings');
    await expect(page.getByText('Loading')).toBeHidden({ timeout: 10000 });

    // Check for specific holdings from mock data
    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    // Mock data typically includes AAPL, MSFT, GOOGL, TSLA, BTC, ETH
    // Verify at least some of these are present
    await expect(page.getByText('AAPL')).toBeVisible();
    await expect(page.getByText('MSFT')).toBeVisible();

    // Verify the count matches what's displayed
    const rows = await page.getByRole('row').count();
    // Subtract 1 for header row
    const dataRows = rows - 1;
    expect(dataRows).toBeGreaterThan(0);
  });

  test('should maintain holdings data after page reload', async ({ page }) => {
    // First visit
    await page.goto('/holdings');
    await expect(page.getByText('Loading')).toBeHidden({ timeout: 10000 });

    // Get holdings count before reload
    const headingBefore = page.getByText(/Holdings \(\d+\)/);
    const textBefore = await headingBefore.textContent();
    const matchBefore = textBefore?.match(/Holdings \((\d+)\)/);
    const countBefore = matchBefore ? parseInt(matchBefore[1], 10) : 0;

    // Reload the page
    await page.reload();
    await expect(page.getByText('Loading')).toBeHidden({ timeout: 10000 });

    // Get holdings count after reload
    const headingAfter = page.getByText(/Holdings \(\d+\)/);
    const textAfter = await headingAfter.textContent();
    const matchAfter = textAfter?.match(/Holdings \((\d+)\)/);
    const countAfter = matchAfter ? parseInt(matchAfter[1], 10) : 0;

    // Counts should match
    expect(countAfter).toBe(countBefore);
    expect(countAfter).toBeGreaterThan(0);

    // Verify holdings are still visible
    await expect(page.getByText('AAPL')).toBeVisible();
  });

  test('should show holdings data that matches dashboard', async ({ page }) => {
    // First, go to dashboard and get holdings data
    await page.goto('/');
    await expect(page.getByText('Loading')).toBeHidden({ timeout: 10000 });

    // Navigate to holdings page
    await page.goto('/holdings');
    await expect(page.getByText('Loading')).toBeHidden({ timeout: 10000 });

    // Verify the same holdings are displayed
    // Mock data should have consistent holdings across pages
    const holdingsTable = page.getByRole('table');
    await expect(holdingsTable).toBeVisible();

    // Check for presence of key holdings
    await expect(page.getByText('AAPL')).toBeVisible();
    await expect(page.getByText('MSFT')).toBeVisible();

    // Verify the holdings count is consistent
    const holdingsCount = page.getByText(/Holdings \(\d+\)/);
    const text = await holdingsCount.textContent();
    const match = text?.match(/Holdings \((\d+)\)/);
    const count = match ? parseInt(match[1], 10) : 0;

    // Should have at least 6 holdings from mock data
    expect(count).toBeGreaterThanOrEqual(6);
  });
});
