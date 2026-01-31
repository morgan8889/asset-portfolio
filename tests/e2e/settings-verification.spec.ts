import { test, expect } from '@playwright/test';

test.describe('Settings Page', () => {
  test('should load without errors', async ({ page }) => {
    // Navigate to settings page
    await page.goto('/settings');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any async errors
    await page.waitForTimeout(2000);

    // Check that page title is present
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

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
    await page.waitForLoadState('networkidle');

    // Find dark mode switch
    const darkModeSwitch = page.locator('[role="switch"]').first();

    // Get initial state
    const initialState = await darkModeSwitch.getAttribute('aria-checked');

    // Click to toggle
    await darkModeSwitch.click();

    // Wait for change
    await page.waitForTimeout(500);

    // Verify state changed
    const newState = await darkModeSwitch.getAttribute('aria-checked');
    expect(newState).not.toBe(initialState);
  });

  test('should show reset confirmation dialog', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Click Reset All Data button
    await page.getByRole('button', { name: /Reset All Data/i }).click();

    // Wait for dialog to appear
    await page.waitForTimeout(500);

    // Check dialog is visible
    await expect(page.getByText('Are you absolutely sure?')).toBeVisible();

    // Check dialog content
    await expect(page.getByText(/permanently delete all your portfolios/i)).toBeVisible();

    // Check Cancel button exists
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    // Click Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Dialog should close
    await page.waitForTimeout(500);
    await expect(page.getByText('Are you absolutely sure?')).not.toBeVisible();
  });
});
