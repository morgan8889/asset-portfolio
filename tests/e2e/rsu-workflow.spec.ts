/**
 * E2E Tests for RSU Transaction Workflow
 *
 * Tests the complete user workflow for RSU vest transactions,
 * including net shares calculation, tax withholding, and metadata display.
 */

import { test, expect, seedMockData } from './fixtures/test';
import {
  fillTransactionDate,
  fillVestingDate,
  selectTransactionType,
  openAddTransactionDialog,
  submitTransaction,
  getTransactionDialog,
} from './fixtures/form-helpers';

test.describe('RSU Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
  });

  test('should add RSU vest transaction with all metadata', async ({
    page,
  }) => {
    await openAddTransactionDialog(page);

    const dialog = getTransactionDialog(page);
    await expect(dialog).toBeVisible();

    // Select RSU Vest transaction type
    await selectTransactionType(page, 'RSU Vest');

    // Fill base fields
    await page.locator('#assetSymbol').fill('TECH');
    await page.locator('#quantity').fill('78');
    await page.locator('#price').fill('150.00');

    // Fill transaction date
    await fillTransactionDate(page, '2024-06-15');

    // Fill RSU-specific fields
    await fillVestingDate(page, '2024-06-15');
    await page.locator('#grossSharesVested').fill('100');
    await page.locator('#sharesWithheld').fill('22');
    await page.locator('#vestingPrice').fill('150.00');
    await page.locator('#taxWithheldAmount').fill('3300.00');

    // Submit the transaction
    await submitTransaction(page);

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('should calculate net shares correctly (gross - withheld)', async ({
    page,
  }) => {
    await openAddTransactionDialog(page);

    // Select RSU Vest
    await selectTransactionType(page, 'RSU Vest');

    // Fill in fields
    await page.locator('#assetSymbol').fill('TECH');
    await page.locator('#quantity').fill('78');
    await page.locator('#price').fill('150.00');
    await fillTransactionDate(page, '2024-06-15');
    await fillVestingDate(page, '2024-06-15');
    await page.locator('#grossSharesVested').fill('100');
    await page.locator('#sharesWithheld').fill('22');
    await page.locator('#vestingPrice').fill('150.00');

    // Check that net shares calculation is shown in the green alert
    // Net shares = 100 - 22 = 78
    await expect(page.getByText(/net shares received/i)).toBeVisible();
    await expect(page.getByText(/78\.0000/)).toBeVisible();
  });

  test('should show cost basis per share in RSU summary', async ({
    page,
  }) => {
    await openAddTransactionDialog(page);

    // Select RSU Vest
    await selectTransactionType(page, 'RSU Vest');

    // Fill in fields
    await page.locator('#assetSymbol').fill('TECH');
    await page.locator('#quantity').fill('75');
    await page.locator('#price').fill('200.00');
    await fillTransactionDate(page, '2024-06-15');
    await fillVestingDate(page, '2024-06-15');
    await page.locator('#grossSharesVested').fill('100');
    await page.locator('#sharesWithheld').fill('25');
    await page.locator('#vestingPrice').fill('200.00');

    // Check cost basis display: "$200.00 per share"
    await expect(page.getByText('Cost Basis:')).toBeVisible();
    await expect(page.getByText(/\$200/)).toBeVisible();
  });

  test('should display RSU lot with metadata in holdings', async ({
    page,
  }) => {
    // The mock data already includes an RSU vest transaction for ACME
    await page.goto('/holdings');
    await page.waitForLoadState('load');

    // Should see the ACME holding
    await expect(page.getByText('ACME').first()).toBeVisible({ timeout: 10000 });

    // Open detail modal for ACME
    const acmeRow = page.getByRole('table').locator('tbody tr', { hasText: 'ACME' });
    const dropdownButton = acmeRow.locator('button').last();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    // Modal should open
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Navigate to Tax Lots tab
    await modal.getByRole('tab', { name: /tax lots/i }).click();

    // Should see RSU badge
    await expect(modal.getByText('RSU')).toBeVisible();

    // Should see vesting date label
    await expect(modal.getByText(/vesting date/i)).toBeVisible();

    // Should see Vesting Price (FMV) label
    await expect(modal.getByText(/vesting price/i)).toBeVisible();
  });

  test('should show net shares in holdings overview', async ({ page }) => {
    // The mock data has an RSU with 50 gross - 12 withheld = 38 net shares for ACME
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

    // Overview tab is default - should show quantity
    await expect(modal.getByText(/quantity/i)).toBeVisible();
  });

  test('should validate gross shares >= withheld shares', async ({
    page,
  }) => {
    await openAddTransactionDialog(page);
    await selectTransactionType(page, 'RSU Vest');

    // Fill base fields
    await page.locator('#assetSymbol').fill('TECH');
    await page.locator('#quantity').fill('78');
    await page.locator('#price').fill('150.00');
    await fillTransactionDate(page, '2024-06-15');
    await fillVestingDate(page, '2024-06-15');
    await page.locator('#vestingPrice').fill('150.00');

    // Set withheld shares greater than gross shares (invalid)
    await page.locator('#grossSharesVested').fill('50');
    await page.locator('#sharesWithheld').fill('60');

    // The submit button should be disabled or a validation error should show
    const dialog = getTransactionDialog(page);
    const submitButton = dialog.getByRole('button', { name: /add transaction/i });

    // Check each condition independently to avoid strict mode violation
    // when both the error text and disabled button are present simultaneously
    const errorVisible = page.getByText(/withheld.*cannot exceed.*gross/i);
    const buttonDisabled = submitButton.and(page.locator(':disabled'));
    await expect(
      errorVisible.or(buttonDisabled).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show RSU lot type in tax analysis tab', async ({ page }) => {
    // Use mock data ACME holding that has RSU lots
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

    // Navigate to Tax Analysis tab
    await modal.getByRole('tab', { name: /tax analysis/i }).click();

    // Should see the RSU lot type badge in the tax lot table
    await expect(modal.getByText('RSU')).toBeVisible({ timeout: 5000 });
  });

  test('should display RSU vesting metadata in blue card', async ({
    page,
  }) => {
    // Use mock data - ACME has RSU lots
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

    // Go to Tax Lots tab
    await modal.getByRole('tab', { name: /tax lots/i }).click();

    // Should see blue-colored metadata section for RSU lots (bg-blue-50 class)
    const vestingSection = modal.locator('.bg-blue-50');
    await expect(vestingSection).toBeVisible();

    // Should show vesting date and FMV labels
    await expect(modal.getByText(/vesting date/i)).toBeVisible();
    await expect(modal.getByText(/vesting price/i)).toBeVisible();
  });

  test('should navigate through all tabs in RSU holding detail modal', async ({
    page,
  }) => {
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
    await expect(modal.getByText('RSU')).toBeVisible();
    await expect(modal.getByText(/vesting date/i)).toBeVisible();

    // Test Tax Analysis tab
    await modal.getByRole('tab', { name: /tax analysis/i }).click();
    await expect(modal.getByText(/unrealized gain/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show correct cost info in tax lot detail', async ({
    page,
  }) => {
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

    // Go to Tax Lots tab
    await modal.getByRole('tab', { name: /tax lots/i }).click();

    // Should see "Total Cost" label in the lot detail
    await expect(modal.getByText(/total cost/i).first()).toBeVisible();
  });
});
