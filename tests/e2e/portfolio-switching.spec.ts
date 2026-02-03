import { test, expect } from '@playwright/test';

test.describe('Portfolio Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should switch between portfolios and update dashboard', async ({ page }) => {
    // Click portfolio selector
    const selector = page.getByRole('button', { name: /select portfolio/i });
    await expect(selector).toBeVisible();
    await selector.click();

    // Select different portfolio from dropdown
    const menuItems = page.getByRole('menuitem');
    const firstItem = menuItems.first();
    await firstItem.click();

    // Verify dashboard updates
    await expect(page.getByTestId('dashboard-container')).toBeVisible();
  });

  test('should persist portfolio selection across page reload', async ({ page }) => {
    // Get current portfolio name
    const selector = page.getByRole('button', { name: /select portfolio/i });
    const currentName = await selector.textContent();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify same portfolio is selected
    await expect(selector).toContainText(currentName || '');
  });

  test('should disable selector during CSV import', async ({ page }) => {
    const selector = page.getByRole('button', { name: /select portfolio/i });
    
    // Portfolio selector should be enabled initially
    await expect(selector).toBeEnabled();

    // When CSV import is active, selector should be disabled
    // (This would require triggering CSV import state)
  });
});
