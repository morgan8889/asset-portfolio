import { test, expect } from './fixtures/test';

/**
 * Regression test for navigation bug where AppInitializer
 * prevents pages from loading after initial dashboard load.
 *
 * Bug: AppInitializer uses component-local useRef that resets on
 * remount, causing pages to hang on "Initializing..." forever.
 */
test.describe('Navigation across dashboard pages', () => {
  test('should navigate to Holdings page without timeout', async ({ page }) => {
    // Navigate to dashboard first
    await page.goto('/');

    // Wait for dashboard to initialize
    await page.waitForSelector('text=Portfolio Tracker', { timeout: 10000 });
    await expect(page.getByText('Initializing')).not.toBeVisible({ timeout: 10000 });

    // Navigate to Holdings page
    await page.getByRole('link', { name: /Holdings/i }).click();

    // Should load Holdings page without timeout (5s max)
    await expect(page.getByRole('heading', { name: 'Holdings', exact: true, level: 1 })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Initializing')).not.toBeVisible();
  });

  test('should navigate to Analysis page without timeout', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Initializing')).not.toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: /Analysis/i }).first().click();

    await expect(page.getByRole('heading', { name: 'Analysis', exact: true, level: 1 })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Initializing')).not.toBeVisible();
  });

  test('should navigate to Performance page without timeout', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Initializing')).not.toBeVisible({ timeout: 10000 });

    await page.getByRole('link', { name: /Performance/i }).click();

    await expect(page.getByRole('heading', { name: 'Performance', exact: true, level: 1 })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Initializing')).not.toBeVisible();
  });

  test('should navigate between multiple pages successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Initializing')).not.toBeVisible({ timeout: 10000 });

    // Navigate to Transactions
    await page.getByRole('link', { name: /Transactions/i }).click();
    await page.waitForURL('/transactions', { timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Transactions', exact: true, level: 1 })).toBeVisible({ timeout: 5000 });

    // Navigate to Settings
    await page.getByRole('link', { name: /Settings/i }).click();
    await page.waitForURL('/settings', { timeout: 5000 });
    await expect(page.getByRole('heading', { name: 'Settings', exact: true, level: 1 })).toBeVisible({ timeout: 5000 });

    // Navigate back to Dashboard - just verify URL changes and no hang
    await page.getByRole('link', { name: /Dashboard/i }).click();
    await page.waitForURL('/', { timeout: 5000 });

    // Key assertion: pages should complete loading without hanging on "Initializing..."
    await expect(page.getByText('Initializing')).not.toBeVisible();
  });
});
