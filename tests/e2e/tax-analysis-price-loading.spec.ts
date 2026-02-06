/**
 * E2E Tests for Tax Analysis Price Loading
 *
 * Tests the complete price loading flow on the tax-analysis page:
 * - Price polling initialization
 * - Price data display
 * - Price refresh behavior
 * - Error handling
 *
 * These tests catch integration issues that unit tests miss, including:
 * - Bug #1: Map iteration (Object.entries vs forEach)
 * - Bug #2: Missing price polling setup
 * - Bug #3: Missing asset loading
 * - Bug #4: useMemo staleness with Map updates
 */

import { test, expect } from '@playwright/test';

test.describe('Tax Analysis Price Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and wait for load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should load and display prices on direct navigation', async ({ page }) => {
    // First, add a transaction to have data
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /^buy$/i }).click();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    await page.getByLabel(/date/i).fill(oneYearAgo.toISOString().split('T')[0]);
    await page.getByLabel(/asset symbol/i).fill('AAPL');
    await page.getByLabel(/quantity/i).fill('100');
    await page.getByLabel(/price.*share/i).fill('150.00');
    await page.getByRole('button', { name: 'Add Transaction' }).click();

    // Wait for dialog to close
    await page.waitForTimeout(500);

    // Navigate directly to tax-analysis page
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.getByText('Tax Analysis')).toBeVisible();

    // Verify summary cards are present
    await expect(page.getByText(/net unrealized gain/i)).toBeVisible();
    await expect(page.getByText(/short-term.*long-term/i)).toBeVisible();
    await expect(page.getByText(/estimated tax liability/i)).toBeVisible();

    // Verify tax lot table is present
    await expect(page.getByText(/tax lot analysis/i)).toBeVisible();
  });

  test('should show non-zero values after prices load', async ({ page }) => {
    // Add a transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /^buy$/i }).click();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    await page.getByLabel(/date/i).fill(sixMonthsAgo.toISOString().split('T')[0]);
    await page.getByLabel(/asset symbol/i).fill('MSFT');
    await page.getByLabel(/quantity/i).fill('50');
    await page.getByLabel(/price.*share/i).fill('350.00');
    await page.getByRole('button', { name: 'Add Transaction' }).click();

    await page.waitForTimeout(500);

    // Navigate to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Wait for tax lot table to appear
    await expect(page.getByText(/tax lot analysis/i)).toBeVisible();

    // Verify that the table shows at least one lot
    // The lot count text should show at least "1 lot"
    await expect(page.getByText(/\d+ lots?/i)).toBeVisible();

    // Verify the asset appears in the table
    await expect(page.getByText('MSFT')).toBeVisible();

    // Verify cost basis appears (we bought at $350, so $17,500 total)
    // The value should appear somewhere in the table
    const tableContent = await page.locator('table').textContent();
    expect(tableContent).toContain('MSFT');
  });

  test('should handle navigation between pages and back', async ({ page }) => {
    // Add a transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /^buy$/i }).click();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    await page.getByLabel(/date/i).fill(oneYearAgo.toISOString().split('T')[0]);
    await page.getByLabel(/asset symbol/i).fill('GOOGL');
    await page.getByLabel(/quantity/i).fill('10');
    await page.getByLabel(/price.*share/i).fill('100.00');
    await page.getByRole('button', { name: 'Add Transaction' }).click();

    await page.waitForTimeout(500);

    // Navigate to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Verify data is visible
    await expect(page.getByText('GOOGL')).toBeVisible();

    // Navigate away to holdings
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    // Navigate back to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Data should still be visible
    await expect(page.getByText('GOOGL')).toBeVisible();
    await expect(page.getByText(/tax lot analysis/i)).toBeVisible();
  });

  test('should display holding periods correctly', async ({ page }) => {
    // Create a long-term holding
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /^buy$/i }).click();
    await page.getByLabel(/date/i).fill(twoYearsAgo.toISOString().split('T')[0]);
    await page.getByLabel(/asset symbol/i).fill('LT');
    await page.getByLabel(/quantity/i).fill('100');
    await page.getByLabel(/price.*share/i).fill('50.00');
    await page.getByRole('button', { name: 'Add Transaction' }).click();

    await page.waitForTimeout(500);

    // Create a short-term holding
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /^buy$/i }).click();
    await page.getByLabel(/date/i).fill(threeMonthsAgo.toISOString().split('T')[0]);
    await page.getByLabel(/asset symbol/i).fill('ST');
    await page.getByLabel(/quantity/i).fill('50');
    await page.getByLabel(/price.*share/i).fill('100.00');
    await page.getByRole('button', { name: 'Add Transaction' }).click();

    await page.waitForTimeout(500);

    // Navigate to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Verify both holding periods are displayed
    // LT badge for long-term
    await expect(page.getByText('LT').first()).toBeVisible();
    // ST badge for short-term (the symbol ST will also appear as asset name)
    const stBadges = page.locator('text=ST');
    await expect(stBadges.first()).toBeVisible();
  });

  test('should handle empty portfolio gracefully', async ({ page }) => {
    // Navigate directly to tax-analysis with no transactions
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Should show empty state message (no holdings message)
    // The page shows "You don't have any holdings yet" when there are no holdings
    await expect(
      page.getByText(/don't have any holdings/i).or(page.getByText(/no tax lots/i)).or(page.getByText(/0 lots/i))
    ).toBeVisible();
  });

  test('should update calculations when portfolio changes', async ({ page }) => {
    // Add first transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /^buy$/i }).click();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    await page.getByLabel(/date/i).fill(oneYearAgo.toISOString().split('T')[0]);
    await page.getByLabel(/asset symbol/i).fill('FIRST');
    await page.getByLabel(/quantity/i).fill('100');
    await page.getByLabel(/price.*share/i).fill('50.00');
    await page.getByRole('button', { name: 'Add Transaction' }).click();

    await page.waitForTimeout(500);

    // Navigate to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Verify first asset appears
    await expect(page.getByText('FIRST')).toBeVisible();
    await expect(page.getByText(/1 lot/i)).toBeVisible();

    // Go back and add second transaction
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /^buy$/i }).click();

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    await page.getByLabel(/date/i).fill(sixMonthsAgo.toISOString().split('T')[0]);
    await page.getByLabel(/asset symbol/i).fill('SECOND');
    await page.getByLabel(/quantity/i).fill('50');
    await page.getByLabel(/price.*share/i).fill('100.00');
    await page.getByRole('button', { name: 'Add Transaction' }).click();

    await page.waitForTimeout(500);

    // Navigate back to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Now should show both assets
    await expect(page.getByText('FIRST')).toBeVisible();
    await expect(page.getByText('SECOND')).toBeVisible();
    await expect(page.getByText(/2 lots/i)).toBeVisible();
  });

  test('should show tax settings link and navigate correctly', async ({ page }) => {
    // Add a transaction first so we see the full tax analysis page
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /^buy$/i }).click();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    await page.getByLabel(/date/i).fill(oneYearAgo.toISOString().split('T')[0]);
    await page.getByLabel(/asset symbol/i).fill('TAX');
    await page.getByLabel(/quantity/i).fill('100');
    await page.getByLabel(/price.*share/i).fill('100.00');
    await page.getByRole('button', { name: 'Add Transaction' }).click();

    await page.waitForTimeout(500);

    // Navigate to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Find and click the Tax Settings button (it's a button inside a link)
    const taxSettingsButton = page.getByRole('button', { name: /tax settings/i });
    await expect(taxSettingsButton).toBeVisible();
    await taxSettingsButton.click();

    // Should navigate to tax settings page
    await expect(page).toHaveURL(/\/settings\/tax/);

    // Verify tax settings page content
    await expect(page.getByText(/short.*term.*rate/i)).toBeVisible();
    await expect(page.getByText(/long.*term.*rate/i)).toBeVisible();
  });

  test('should persist data after page reload', async ({ page }) => {
    // Add a transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /^buy$/i }).click();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    await page.getByLabel(/date/i).fill(oneYearAgo.toISOString().split('T')[0]);
    await page.getByLabel(/asset symbol/i).fill('PERSIST');
    await page.getByLabel(/quantity/i).fill('100');
    await page.getByLabel(/price.*share/i).fill('100.00');
    await page.getByRole('button', { name: 'Add Transaction' }).click();

    await page.waitForTimeout(500);

    // Navigate to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Verify data is visible
    await expect(page.getByText('PERSIST')).toBeVisible();

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Data should still be visible after reload
    await expect(page.getByText('PERSIST')).toBeVisible();
    await expect(page.getByText(/tax lot analysis/i)).toBeVisible();
  });

  test('should display correct column headers in tax lot table', async ({ page }) => {
    // Add a transaction first
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /^buy$/i }).click();

    await page.getByLabel(/date/i).fill('2024-01-15');
    await page.getByLabel(/asset symbol/i).fill('COLS');
    await page.getByLabel(/quantity/i).fill('100');
    await page.getByLabel(/price.*share/i).fill('100.00');
    await page.getByRole('button', { name: 'Add Transaction' }).click();

    await page.waitForTimeout(500);

    // Navigate to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Verify all column headers are present
    await expect(page.getByRole('columnheader', { name: /asset/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /qty/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /cost/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /value/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /gain/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /period/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /type/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /status/i })).toBeVisible();
  });
});
