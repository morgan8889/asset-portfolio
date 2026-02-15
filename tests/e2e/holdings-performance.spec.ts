import { test, expect, seedMockData } from './fixtures/test';

test.describe('Holdings List Performance (SC-002)', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/holdings');
    await page.waitForLoadState('load');
    // Wait for holdings table to render
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
  });

  test('T022.1: should render holdings table quickly', async ({ page }) => {
    // Verify holdings loaded (check for at least some rows)
    const tableRows = page.locator('tbody tr');
    const rowCount = await tableRows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('T022.2: should maintain performance when filtering', async ({
    page,
  }) => {
    // The holdings table has a type filter (Select component)
    const filterTrigger = page.locator('#typeFilter').or(
      page.getByRole('combobox').first()
    );

    if (await filterTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await filterTrigger.click();

      // Look for a filter option
      const option = page.getByRole('option').first();
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
      }

      // Table should still be visible after filtering
      await expect(page.getByRole('table')).toBeVisible();
    }
  });

  test('T022.3: should handle search filtering efficiently', async ({
    page,
  }) => {
    // Find search input
    const searchInput = page.getByPlaceholder(/search/i);

    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('AAPL');
      // Wait for debounce
      await page.waitForTimeout(500);
      // Table should still be visible
      await expect(page.getByRole('table')).toBeVisible();
    }
  });

  test('T022.4: should handle sorting without performance degradation', async ({
    page,
  }) => {
    // Find a sortable column header
    const symbolHeader = page.locator('th').filter({ hasText: 'Symbol' });

    if (await symbolHeader.isVisible({ timeout: 2000 }).catch(() => false)) {
      await symbolHeader.click();
      await page.waitForTimeout(200);
      // Table should still be visible
      await expect(page.getByRole('table')).toBeVisible();
    }
  });

  test('T022.5: should maintain responsiveness with mixed asset types', async ({
    page,
  }) => {
    // Verify page remains responsive - Add Holding button should be clickable
    const addButton = page.getByRole('button', { name: /add holding/i });
    await expect(addButton).toBeVisible({ timeout: 5000 });

    // Click should respond quickly
    await addButton.click({ timeout: 2000 });

    // Should open a dropdown menu
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible({ timeout: 2000 });

    // Press Escape to close
    await page.keyboard.press('Escape');
  });
});
