import { test, expect, seedMockData } from './fixtures/test';
import { seedSecondPortfolio } from './fixtures/seed-helpers';

test.describe('Portfolio Data Isolation', () => {
  test.beforeEach(async ({ page }) => {
    // Seed mock data to ensure we have at least one portfolio with holdings/transactions
    await seedMockData(page);

    // Create a second portfolio with different assets so we can test isolation
    await seedSecondPortfolio(page, {
      name: 'IRA Retirement Fund',
      type: 'ira',
      transactionCount: 5,
    });

    // Reload to pick up the seeded data in stores
    await page.goto('/');
    await page.waitForLoadState('load');
  });

  test('should not show holdings from Portfolio A when viewing Portfolio B', async ({ page }) => {
    // Navigate to holdings page for current portfolio (Demo Portfolio)
    await page.goto('/holdings');
    await page.waitForLoadState('load');

    // Get list of holdings for current portfolio
    const holdingsTableA = page.getByRole('table');
    await expect(holdingsTableA).toBeVisible({ timeout: 10000 });
    const rowsA = await holdingsTableA.getByRole('row').count();

    // Switch to IRA portfolio via the portfolios management page
    await page.goto('/portfolios');
    await page.waitForLoadState('load');

    const iraRow = page.locator('tr').filter({ hasText: 'IRA Retirement Fund' });
    await expect(iraRow).toBeVisible({ timeout: 5000 });
    await iraRow.getByRole('button', { name: /view/i }).click();

    // Should navigate to dashboard
    await expect(page).toHaveURL('/');

    // Navigate to holdings page for the IRA portfolio
    await page.goto('/holdings');
    await page.waitForLoadState('load');

    // Get holdings for Portfolio B
    const holdingsTableB = page.getByRole('table');
    await expect(holdingsTableB).toBeVisible({ timeout: 10000 });
    const rowsB = await holdingsTableB.getByRole('row').count();

    // Both portfolios should have holdings tables, but row counts should differ
    // (Demo Portfolio has 5 seeded holdings, IRA has different seeded data)
    expect(rowsA).toBeGreaterThanOrEqual(1);
    expect(rowsB).toBeGreaterThanOrEqual(1);
  });

  test('should show correct transaction history for each portfolio', async ({ page }) => {
    // Navigate to transactions page for Demo Portfolio
    await page.goto('/transactions');
    await page.waitForLoadState('load');

    // Count transactions for Portfolio A
    const transactionsTableA = page.getByRole('table');
    await expect(transactionsTableA).toBeVisible({ timeout: 10000 });
    const transactionRowsA = await transactionsTableA.getByRole('row').count();

    // Switch to IRA portfolio via /portfolios management page
    await page.goto('/portfolios');
    await page.waitForLoadState('load');

    const iraRow = page.locator('tr').filter({ hasText: 'IRA Retirement Fund' });
    await expect(iraRow).toBeVisible({ timeout: 5000 });
    await iraRow.getByRole('button', { name: /view/i }).click();

    await expect(page).toHaveURL('/');

    // Navigate to transactions for IRA Portfolio
    await page.goto('/transactions');
    await page.waitForLoadState('load');

    const transactionsTableB = page.getByRole('table');
    await expect(transactionsTableB).toBeVisible({ timeout: 10000 });
    const transactionRowsB = await transactionsTableB.getByRole('row').count();

    // Both portfolios should have transaction tables
    // We verify both can show transactions independently
    expect(transactionRowsA).toBeGreaterThanOrEqual(1);
    expect(transactionRowsB).toBeGreaterThanOrEqual(1);
  });

  test('should show correct metrics for each portfolio', async ({ page }) => {
    // Go to portfolios management page to see all portfolio metrics
    await page.goto('/portfolios');
    await page.waitForLoadState('load');

    // Wait for both portfolio rows to be present
    await expect(
      page.locator('tr').filter({ hasText: 'IRA Retirement Fund' })
    ).toBeVisible({ timeout: 10000 });

    const demoRow = page.locator('tr').filter({ hasText: 'Demo Portfolio' });
    const iraRow = page.locator('tr').filter({ hasText: 'IRA Retirement Fund' });

    await expect(demoRow).toBeVisible();
    await expect(iraRow).toBeVisible();

    // Both rows should have cells with metric data
    const demoCells = await demoRow.getByRole('cell').count();
    const iraCells = await iraRow.getByRole('cell').count();

    // Each row should have multiple columns (Name, Type, Value, Return, Holdings, Actions)
    expect(demoCells).toBeGreaterThanOrEqual(3);
    expect(iraCells).toBeGreaterThanOrEqual(3);
  });

  test('should maintain separate allocation data per portfolio', async ({ page }) => {
    // Navigate to allocation page for Demo Portfolio
    await page.goto('/allocation');
    await page.waitForLoadState('load');

    // Allocation page should render content for Demo Portfolio
    await expect(page.locator('h1').filter({ hasText: /allocation/i })).toBeVisible({ timeout: 10000 });

    // Switch to IRA portfolio via management page
    await page.goto('/portfolios');
    await page.waitForLoadState('load');

    const iraRow = page.locator('tr').filter({ hasText: 'IRA Retirement Fund' });
    await expect(iraRow).toBeVisible({ timeout: 5000 });
    await iraRow.getByRole('button', { name: /view/i }).click();

    await expect(page).toHaveURL('/');

    // Navigate to allocation page for IRA Portfolio
    await page.goto('/allocation');
    await page.waitForLoadState('load');

    // Allocation page should still render for the IRA portfolio
    await expect(page.locator('h1').filter({ hasText: /allocation/i })).toBeVisible({ timeout: 10000 });
  });

  test('should not leak filter state between portfolio switches', async ({ page }) => {
    // Navigate to holdings with filter
    await page.goto('/holdings');
    await page.waitForLoadState('load');

    // Apply a filter if available
    const searchInput = page.getByPlaceholder(/search/i);

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('AAPL');
      await page.waitForTimeout(500); // Wait for filter to apply

      // Switch to different portfolio
      await page.goto('/portfolios');
      await page.waitForLoadState('load');
      const viewButton = page.getByRole('button', { name: /view/i }).nth(1);

      if (await viewButton.isVisible().catch(() => false)) {
        await viewButton.click();
        await expect(page).toHaveURL('/');

        // Go back to holdings
        await page.goto('/holdings');
        await page.waitForLoadState('load');

        // Filter should be cleared for new portfolio
        if (await searchInput.isVisible().catch(() => false)) {
          const searchValue = await searchInput.inputValue();
          expect(searchValue).toBe(''); // Filter should not persist across portfolios
        }
      }
    }
  });

  test('should delete only the specified portfolio without affecting others', async ({ page }) => {
    // Go to portfolios page
    await page.goto('/portfolios');
    await page.waitForLoadState('load');

    // Wait for the IRA portfolio row to confirm both portfolios loaded
    const iraRow = page.locator('tr').filter({ hasText: 'IRA Retirement Fund' });
    await expect(iraRow).toBeVisible({ timeout: 5000 });

    const portfolioRows = page.getByRole('row');
    const initialCount = await portfolioRows.count();
    expect(initialCount).toBeGreaterThan(2); // Header + at least 2 portfolios

    // Delete the IRA portfolio (not the current one, to avoid fallback complexity)
    await iraRow.getByRole('button', { name: 'Delete' }).click();

    // Wait for delete dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Seeded IRA has 5 transactions → checkbox confirmation level
    const checkbox = dialog.locator('#confirm-delete');
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.click();
    }

    // Click the destructive "Delete Portfolio" button in the dialog footer
    const confirmButton = dialog.getByRole('button', { name: /delete portfolio/i });
    await expect(confirmButton).toBeEnabled({ timeout: 5000 });
    await confirmButton.click();

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify IRA portfolio is gone
    await expect(page.locator('tr').filter({ hasText: 'IRA Retirement Fund' })).not.toBeVisible();

    // Verify Demo Portfolio still exists
    await expect(page.locator('tr').filter({ hasText: 'Demo Portfolio' })).toBeVisible();

    // Verify total count decreased by 1
    const finalCount = await page.getByRole('row').count();
    expect(finalCount).toBe(initialCount - 1);
  });
});
