import { test, expect, seedMockData } from './fixtures/test';

test.describe('Portfolios Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/portfolios');
    await page.waitForLoadState('load');
  });

  test('should navigate to /portfolios route', async ({ page }) => {
    await expect(page).toHaveURL(/\/portfolios/);
    // Use locator('h1') to avoid matching sidebar nav heading
    await expect(page.locator('h1')).toContainText(/portfolios/i);
  });

  test('should display portfolio list with metrics', async ({ page }) => {
    // Wait for the table to render with data
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Check for table headers using th locators (more reliable than columnheader role)
    await expect(page.locator('th').filter({ hasText: 'Name' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Type' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'Total Value' })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: 'YTD Return' })).toBeVisible();

    // Check for at least one portfolio row
    const dataRows = page.locator('tbody tr');
    const count = await dataRows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should switch to portfolio when clicking View action', async ({ page }) => {
    // Wait for the table to load with data
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Click View button on first portfolio row
    const firstRow = page.locator('tbody tr').first();
    const viewButton = firstRow.getByRole('button', { name: /view/i });
    await viewButton.click();

    // Should navigate to dashboard
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('should show Create Portfolio button', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create portfolio/i });
    await expect(createButton).toBeVisible({ timeout: 10000 });
  });

  test('should highlight current portfolio with badge', async ({ page }) => {
    // Wait for table to load
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Look for "Current" badge in the table body
    const currentBadge = page.locator('tbody').getByText('Current');
    await expect(currentBadge).toBeVisible();
  });
});
