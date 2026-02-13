import { test, expect } from './fixtures/test';

test.describe('Settings Page', () => {
  test('should load without errors', async ({ page }) => {
    // Set up console error listener BEFORE navigation
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to settings page
    await page.goto('/settings');

    // Check that page title is present
    await expect(page.getByRole('heading', { name: 'Settings' }).first()).toBeVisible();

    // Check that cards are rendered
    await expect(page.getByText('General Settings')).toBeVisible();
    await expect(page.getByText('Data Management')).toBeVisible();

    // Check that Dark Mode switch exists
    await expect(page.getByText('Dark Mode')).toBeVisible();

    // Check that Base Currency selector exists
    await expect(page.getByText('Base Currency')).toBeVisible();

    // Check that Import Data button exists
    await expect(page.getByRole('button', { name: /Import Data/i })).toBeVisible();

    // Check that Clear Cache button exists
    await expect(page.getByRole('button', { name: /Clear Cache/i })).toBeVisible();

    // Check that Reset All Data button exists
    await expect(page.getByRole('button', { name: /Reset All Data/i })).toBeVisible();

    // Print any console errors
    if (errors.length > 0) {
      console.error('Console errors found:', errors);
    }

    // Fail test if there are errors
    expect(errors).toHaveLength(0);
  });

  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/settings');

    // Find dark mode switch
    const darkModeSwitch = page.locator('[role="switch"]').first();

    // Get initial state
    const initialState = await darkModeSwitch.getAttribute('aria-checked');

    // Click to toggle
    await darkModeSwitch.click();

    // Wait for state to change
    const expectedState = initialState === 'true' ? 'false' : 'true';
    await expect(darkModeSwitch).toHaveAttribute('aria-checked', expectedState);
  });

  test('should show reset confirmation dialog', async ({ page }) => {
    await page.goto('/settings');

    // Click Reset All Data button
    await page.getByRole('button', { name: /Reset All Data/i }).click();

    // Check dialog is visible (auto-retries, no timeout needed)
    await expect(page.getByText('Are you absolutely sure?')).toBeVisible();

    // Check dialog content
    await expect(page.getByText(/permanently delete all your portfolios/i)).toBeVisible();

    // Check Cancel button exists
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Dialog should close (auto-retries)
    await expect(page.getByText('Are you absolutely sure?')).not.toBeVisible();
  });
});
