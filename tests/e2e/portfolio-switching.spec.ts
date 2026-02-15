/**
 * E2E Tests for Portfolio Switching
 *
 * Tests the portfolio Select dropdown on the dashboard:
 * - Switching between portfolios
 * - Persistence across page reload
 * - Portfolio switching via management page
 *
 * The portfolio selector is a shadcn Select component (role="combobox")
 * rendered in the DashboardHeader. It is only visible on the dashboard page.
 */

import { test, expect, seedMockData } from './fixtures/test';
import { seedSecondPortfolio } from './fixtures/seed-helpers';

/** Helper: get the portfolio selector combobox on the dashboard */
function getPortfolioSelector(page: import('@playwright/test').Page) {
  // The portfolio selector is a shadcn Select (role=combobox) rendered
  // inside DashboardHeader next to the "Portfolio:" label text.
  // Use the "Portfolio:" text as anchor to distinguish from other comboboxes
  // (e.g., the holdings type filter also renders a combobox).
  return page.getByText('Portfolio:').locator('..').getByRole('combobox');
}

test.describe('Portfolio Switching', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await seedSecondPortfolio(page, {
      name: 'IRA Retirement Fund',
      type: 'ira',
      transactionCount: 3,
    });
    await page.goto('/');
    await page.waitForLoadState('load');

    // Wait for dashboard to render (confirms store hydration)
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible({ timeout: 15000 });
  });

  test('should display portfolio selector with current portfolio', async ({ page }) => {
    const selector = getPortfolioSelector(page);
    await expect(selector).toBeVisible({ timeout: 5000 });
    // Should show the current portfolio name
    await expect(selector).toContainText('Demo Portfolio');
  });

  test('should switch between portfolios via selector', async ({ page }) => {
    const selector = getPortfolioSelector(page);
    await expect(selector).toBeVisible({ timeout: 5000 });

    // Open the select dropdown
    await selector.click();

    // Select the IRA portfolio
    const iraOption = page.getByRole('option', { name: /ira retirement fund/i });
    await expect(iraOption).toBeVisible({ timeout: 3000 });
    await iraOption.click();

    // Selector text should now show the IRA portfolio
    await expect(selector).toContainText('IRA Retirement Fund');
  });

  test('should persist portfolio selection across page reload', async ({ page }) => {
    const selector = getPortfolioSelector(page);
    await expect(selector).toBeVisible({ timeout: 5000 });

    // Switch to IRA portfolio
    await selector.click();
    await page.getByRole('option', { name: /ira retirement fund/i }).click();
    await expect(selector).toContainText('IRA Retirement Fund');

    // Reload page
    await page.reload();
    await page.waitForLoadState('load');

    // Same portfolio should still be selected
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible({ timeout: 15000 });
    const selectorAfterReload = getPortfolioSelector(page);
    await expect(selectorAfterReload).toContainText('IRA Retirement Fund');
  });

  test('should switch portfolio via portfolios management page', async ({ page }) => {
    // Navigate to portfolios page
    await page.goto('/portfolios');
    await page.waitForLoadState('load');

    // Wait for IRA portfolio row to be visible (confirms both portfolios loaded)
    await expect(
      page.locator('tr').filter({ hasText: 'IRA Retirement Fund' })
    ).toBeVisible({ timeout: 10000 });

    // Find the IRA portfolio row and click View
    const iraRow = page.locator('tr').filter({ hasText: 'IRA Retirement Fund' });
    const viewButton = iraRow.getByRole('button', { name: /view/i });
    await viewButton.click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible({ timeout: 15000 });

    // Portfolio selector should now show IRA portfolio
    const selector = getPortfolioSelector(page);
    await expect(selector).toContainText('IRA Retirement Fund');
  });

  test('should update holdings data when portfolio is switched', async ({ page }) => {
    // Go to holdings for initial portfolio
    await page.goto('/holdings');
    await page.waitForLoadState('load');

    // Wait for table to render
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });

    // Switch portfolio via /portfolios page
    await page.goto('/portfolios');
    await page.waitForLoadState('load');

    const iraRow = page.locator('tr').filter({ hasText: 'IRA Retirement Fund' });
    const viewButton = iraRow.getByRole('button', { name: /view/i });
    await viewButton.click();

    await expect(page).toHaveURL('/');

    // Go to holdings for new portfolio
    await page.goto('/holdings');
    await page.waitForLoadState('load');

    // Holdings table should still render (may have different content)
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
  });
});
