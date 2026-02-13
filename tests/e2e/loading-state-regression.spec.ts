import { test, expect } from './fixtures/test';

/**
 * Regression test for loading state completion.
 * Catches bugs where loading gets stuck due to effect dependency issues.
 *
 * Key design decisions:
 * - 5 second hard timeout: Strict enough to catch stuck loading, lenient for CI
 * - No conditional logic: `if (loading.isVisible())` masks failures
 * - Page reload test: Exercises persist middleware rehydration path
 * - Value assertion: Verifies real data loaded, not empty state
 */
test.describe('Loading State Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Generate fresh test data
    await page.goto('/test');

    const generateButton = page.getByRole('button', {
      name: 'Generate Mock Data',
    });
    if (await generateButton.isEnabled()) {
      await generateButton.click();
      await expect(page.getByText('Done! Redirecting...')).toBeVisible({
        timeout: 10000,
      });
      // Full page reload ensures Zustand stores hydrate from IndexedDB
      await page.goto('/');
    } else {
      await page.goto('/');
    }
  });

  test('loading completes within 5 seconds', async ({ page }) => {

    // CRITICAL: Hard assertion - FAILS if loading stuck
    await expect(page.getByText('Loading portfolio data')).not.toBeVisible({
      timeout: 5000,
    });

    // Verify widgets show real data
    const widget = page.locator('[data-testid="total-value-widget"]');
    await expect(widget).toBeVisible({ timeout: 3000 });
    const value = await widget
      .locator('.text-2xl, .text-3xl')
      .first()
      .textContent();
    expect(value).toMatch(/^\$[\d,]+\.\d{2}$/);
    expect(value).not.toBe('$0.00');
  });

  test('page reload completes loading (persist rehydration)', async ({
    page,
  }) => {
    // Verify initial state
    await expect(
      page.locator('[data-testid="total-value-widget"]')
    ).toBeVisible({ timeout: 5000 });

    // Reload triggers persist middleware rehydration
    await page.reload();

    // Must complete within 5 seconds
    await expect(page.getByText('Loading portfolio data')).not.toBeVisible({
      timeout: 5000,
    });
    await expect(
      page.locator('[data-testid="total-value-widget"]')
    ).toBeVisible({ timeout: 3000 });
  });
});
