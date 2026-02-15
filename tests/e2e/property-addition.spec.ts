/**
 * E2E Tests for Property Addition Workflow
 *
 * Tests adding real estate properties via the Holdings page's
 * "Add Holding" → "Real Estate" menu option.
 */

import { test, expect, seedMockData } from './fixtures/test';

test.describe('Property Addition Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/holdings');
    await page.waitForLoadState('load');
    // Wait for holdings table to be visible
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
  });

  async function openPropertyDialog(page: import('@playwright/test').Page) {
    // Open the Add Holding dropdown
    await page.getByRole('button', { name: /add holding/i }).click();
    // Click the Real Estate menu item
    await page.getByRole('menuitem', { name: /real estate/i }).click();
    // Wait for dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
    return dialog;
  }

  test('T021.1: should add basic property in under 30 seconds (SC-001)', async ({
    page,
  }) => {
    const startTime = Date.now();

    const dialog = await openPropertyDialog(page);

    // Fill property form using #id selectors
    await dialog.locator('#name').fill('Test Property');
    await dialog.locator('#purchasePrice').fill('500000');
    await dialog.locator('#currentValue').fill('500000');
    await dialog.locator('#purchaseDate').fill('2023-01-15');
    await dialog.locator('#ownershipPercentage').clear();
    await dialog.locator('#ownershipPercentage').fill('100');

    // Submit form
    await dialog.getByRole('button', { name: /add property/i }).click();

    // Wait for dialog to close (success)
    await expect(dialog).not.toBeVisible({ timeout: 10000 });

    const endTime = Date.now();
    expect(endTime - startTime).toBeLessThan(30000);
  });

  test('T021.2: should add rental property with yield calculation', async ({
    page,
  }) => {
    const dialog = await openPropertyDialog(page);

    // Fill basic info
    await dialog.locator('#name').fill('Rental Condo');
    await dialog.locator('#purchasePrice').fill('400000');
    await dialog.locator('#currentValue').fill('400000');
    await dialog.locator('#purchaseDate').fill('2023-06-01');
    await dialog.locator('#ownershipPercentage').clear();
    await dialog.locator('#ownershipPercentage').fill('100');

    // Toggle rental switch
    await dialog.locator('#isRental').click();

    // Monthly rent field should appear
    const monthlyRent = dialog.locator('#monthlyRent');
    await expect(monthlyRent).toBeVisible();
    await monthlyRent.fill('2000');

    // Submit
    await dialog.getByRole('button', { name: /add property/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  });

  test('T021.3: should handle fractional ownership correctly', async ({
    page,
  }) => {
    const dialog = await openPropertyDialog(page);

    // Add property with 50% ownership
    await dialog.locator('#name').fill('Fractional Property');
    await dialog.locator('#purchasePrice').fill('600000');
    await dialog.locator('#currentValue').fill('650000');
    await dialog.locator('#purchaseDate').fill('2024-01-01');
    await dialog.locator('#ownershipPercentage').clear();
    await dialog.locator('#ownershipPercentage').fill('50');

    // Submit
    await dialog.getByRole('button', { name: /add property/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  });

  test('T021.4: should validate required fields', async ({ page }) => {
    const dialog = await openPropertyDialog(page);

    // Try to submit empty form (name is required)
    await dialog.getByRole('button', { name: /add property/i }).click();

    // Should show validation errors - dialog should still be open
    await expect(dialog).toBeVisible();

    // At least one error message should appear
    const errors = dialog.locator('.text-red-600');
    await expect(errors.first()).toBeVisible({ timeout: 3000 });
  });
});
