/**
 * E2E Tests for ESPP Transaction Workflow
 *
 * Tests the complete user workflow for ESPP purchase transactions,
 * including metadata entry, lot viewing, and tax analysis.
 */

import { test, expect, seedMockData } from './fixtures/test';
import {
  fillTransactionDate,
  fillGrantDate,
  selectTransactionType,
  openAddTransactionDialog,
  fillTransactionFields,
  submitTransaction,
  getTransactionDialog,
} from './fixtures/form-helpers';

test.describe('ESPP Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
  });

  test('should add ESPP purchase transaction with all metadata', async ({
    page,
  }) => {
    // Navigate to transactions page and open dialog
    await openAddTransactionDialog(page);

    const dialog = getTransactionDialog(page);
    await expect(dialog).toBeVisible();

    // Select ESPP Purchase transaction type
    await selectTransactionType(page, 'ESPP Purchase');

    // Fill base fields
    await page.locator('#assetSymbol').fill('ACME');
    await page.locator('#quantity').fill('100');
    await page.locator('#price').fill('85.00');

    // Fill transaction date (this IS the purchase date)
    await fillTransactionDate(page, '2023-12-01');

    // Fill grant date
    await fillGrantDate(page, '2023-06-01');

    // Fill ESPP-specific fields
    await page.locator('#marketPriceAtGrant').fill('100.00');
    await page.locator('#marketPriceAtPurchase').fill('120.00');
    await page.locator('#discountPercent').fill('15');

    // Submit the transaction via dialog-scoped button
    await submitTransaction(page);

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('should show bargain element calculation for ESPP', async ({
    page,
  }) => {
    await openAddTransactionDialog(page);

    // Select ESPP Purchase
    await selectTransactionType(page, 'ESPP Purchase');

    // Fill in fields
    await page.locator('#assetSymbol').fill('ACME');
    await page.locator('#quantity').fill('100');
    await page.locator('#price').fill('85.00');
    await fillTransactionDate(page, '2023-12-01');
    await fillGrantDate(page, '2023-06-01');
    await page.locator('#marketPriceAtGrant').fill('100.00');
    await page.locator('#marketPriceAtPurchase').fill('120.00');
    await page.locator('#discountPercent').fill('15');

    // Check that bargain element alert is shown
    // Bargain element = marketPriceAtPurchase - purchasePrice = 120 - 85 = $35.00 per share
    await expect(page.getByText(/bargain element/i)).toBeVisible();
    await expect(page.getByText(/35\.00/)).toBeVisible();
  });

  test('should display ESPP lot with metadata in holdings', async ({
    page,
  }) => {
    // The mock data already includes an ESPP transaction for ACME
    // Navigate to holdings page
    await page.goto('/holdings');
    await page.waitForLoadState('load');

    // Should see the ACME holding (created by mock data with ESPP + RSU transactions)
    await expect(page.getByText('ACME').first()).toBeVisible({ timeout: 10000 });

    // Open the dropdown menu for the ACME holding row
    const acmeRow = page.getByRole('table').locator('tbody tr', { hasText: 'ACME' });
    const dropdownButton = acmeRow.locator('button').last();
    await dropdownButton.click();

    // Click "View Details"
    await page.getByRole('menuitem', { name: /view details/i }).click();

    // Modal should open
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Navigate to Tax Lots tab
    await modal.getByRole('tab', { name: /tax lots/i }).click();

    // Should see ESPP badge
    await expect(modal.getByText('ESPP')).toBeVisible();

    // Should see Grant Date label in the ESPP metadata section
    await expect(modal.getByText(/grant date/i)).toBeVisible();
  });

  test('should show disqualifying disposition warning in tax analysis', async ({
    page,
  }) => {
    // The mock data includes a disqualifying ESPP lot (grant 1 year ago, purchase 6 months ago)
    // Navigate to holdings
    await page.goto('/holdings');
    await page.waitForLoadState('load');

    await expect(page.getByText('ACME').first()).toBeVisible({ timeout: 10000 });

    // Open detail modal for ACME
    const acmeRow = page.getByRole('table').locator('tbody tr', { hasText: 'ACME' });
    const dropdownButton = acmeRow.locator('button').last();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Navigate to Tax Analysis tab
    await modal.getByRole('tab', { name: /tax analysis/i }).click();

    // Should see the ESPP lot type badge
    await expect(modal.getByText('ESPP')).toBeVisible({ timeout: 5000 });

    // Should see the disqualifying warning badge (amber warning emoji)
    // The disqualifying lot shows a warning emoji badge
    await expect(
      modal.locator('[aria-label="Disqualifying disposition warning"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should validate ESPP grant date is before purchase date', async ({
    page,
  }) => {
    await openAddTransactionDialog(page);
    await selectTransactionType(page, 'ESPP Purchase');

    // Fill required fields
    await page.locator('#assetSymbol').fill('ACME');
    await page.locator('#quantity').fill('100');
    await page.locator('#price').fill('85.00');
    await page.locator('#marketPriceAtGrant').fill('100.00');
    await page.locator('#marketPriceAtPurchase').fill('120.00');
    await page.locator('#discountPercent').fill('15');

    // Set transaction date (purchase date) to June 2024
    await fillTransactionDate(page, '2024-06-01');

    // Set grant date AFTER purchase date (invalid) - December 2024
    await fillGrantDate(page, '2024-12-01');

    // The submit button should be disabled due to validation error
    const dialog = getTransactionDialog(page);
    const submitButton = dialog.getByRole('button', { name: /add transaction/i });

    // Should show validation error about grant date OR disabled submit button
    // Check each condition independently to avoid strict mode violation
    // when both the error text and disabled button are present simultaneously
    const errorVisible = page.getByText(/grant date must be before purchase date/i);
    const buttonDisabled = submitButton.and(page.locator(':disabled'));
    await expect(
      errorVisible.or(buttonDisabled).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should navigate through all tabs in ESPP holding detail modal', async ({
    page,
  }) => {
    // Use the mock data ACME holding which has ESPP lots
    await page.goto('/holdings');
    await page.waitForLoadState('load');

    await expect(page.getByText('ACME').first()).toBeVisible({ timeout: 10000 });

    // Open detail modal
    const acmeRow = page.getByRole('table').locator('tbody tr', { hasText: 'ACME' });
    const dropdownButton = acmeRow.locator('button').last();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Test Overview tab (default)
    await expect(modal.getByText(/quantity/i)).toBeVisible();
    await expect(modal.getByText(/cost basis/i)).toBeVisible();
    await expect(modal.getByText(/current value/i)).toBeVisible();

    // Test Tax Lots tab
    await modal.getByRole('tab', { name: /tax lots/i }).click();
    await expect(modal.getByText('ESPP')).toBeVisible();
    await expect(modal.getByText(/grant date/i)).toBeVisible();

    // Test Tax Analysis tab
    await modal.getByRole('tab', { name: /tax analysis/i }).click();
    await expect(modal.getByText(/unrealized gain/i)).toBeVisible({ timeout: 5000 });
  });
});
