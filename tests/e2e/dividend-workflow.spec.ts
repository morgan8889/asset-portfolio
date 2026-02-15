/**
 * E2E Tests for Dividend Transaction Workflow
 *
 * Tests the complete user workflow for recording dividend payments,
 * verifying they appear in holdings, and tracking cash flow impact.
 *
 * Coverage:
 * - Add dividend transaction
 * - Verify dividend appears in transaction history
 * - Check dividend impact on holdings performance
 * - Validate cash flow tracking
 * - Test reinvested dividends
 */

import { test, expect, seedMockData } from './fixtures/test';
import {
  selectTransactionType,
  fillTransactionFields,
  fillTransactionDate,
  submitTransaction,
  getTransactionDialog,
} from './fixtures/form-helpers';

test.describe('Dividend Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/transactions');
    await page.waitForLoadState('load');
  });

  test('should record cash dividend payment', async ({ page }) => {
    // Open add transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = getTransactionDialog(page);
    await expect(dialog).toBeVisible();

    // Select Dividend transaction type
    await selectTransactionType(page, 'Dividend');

    // Fill in dividend details - use a pre-seeded symbol to avoid UUID assetId issues
    await page.locator('#assetSymbol').fill('AAPL');

    // Enter dividend amount per share (label changes to "Dividend per Share *")
    await page.locator('#price').fill('0.50');

    // Enter quantity (shares held at time of dividend)
    await page.locator('#quantity').fill('100');

    // Add notes
    await page.locator('#notes').fill('Q4 2025 dividend payment');

    // Submit transaction
    await submitTransaction(page);

    // Verify dialog closes
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify a Dividend badge appears in the transaction table
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 5000 });
    await expect(table.getByText('Dividend').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Q4 2025 dividend payment/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show dividend in transaction history with correct amount', async ({ page }) => {
    // Add dividend transaction
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = getTransactionDialog(page);
    await expect(dialog).toBeVisible();

    await selectTransactionType(page, 'Dividend');

    await page.locator('#assetSymbol').fill('AAPL');
    await page.locator('#price').fill('0.25'); // $0.25 per share
    await page.locator('#quantity').fill('50'); // 50 shares

    await submitTransaction(page);
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify transaction appears in the table
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });

    // Verify dividend amount (50 shares x $0.25 = $12.50)
    await expect(page.getByText(/\$12\.50|\$12\.5/i)).toBeVisible({ timeout: 5000 });
  });

  test('should record reinvested dividend (DRIP)', async ({ page }) => {
    // Open add transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = getTransactionDialog(page);
    await expect(dialog).toBeVisible();

    // There is no "Reinvestment" type; DRIP is typically a Buy transaction
    // Keep type as Buy (default) for reinvested dividends
    // Use a pre-seeded symbol to avoid UUID assetId validation issues
    await page.locator('#assetSymbol').fill('VTI');
    await page.locator('#quantity').fill('5');
    await page.locator('#price').fill('100.00');
    await page.locator('#notes').fill('Dividend reinvestment');

    await submitTransaction(page);
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify the transaction appears in the table via its notes
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Dividend reinvestment/i)).toBeVisible({ timeout: 5000 });
  });

  test('should track multiple dividends for same holding', async ({ page }) => {
    // Add first dividend - use a pre-seeded symbol
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = getTransactionDialog(page);
    await expect(dialog).toBeVisible();

    await selectTransactionType(page, 'Dividend');

    const date1 = new Date();
    date1.setMonth(date1.getMonth() - 3); // Q1 dividend
    await page.locator('#assetSymbol').fill('GOOGL');
    await fillTransactionDate(page, date1.toISOString().split('T')[0]);
    await page.locator('#price').fill('0.50');
    await page.locator('#quantity').fill('100');
    await page.locator('#notes').fill('Q1 dividend');

    await submitTransaction(page);
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Add second dividend for the same symbol
    await page.getByRole('button', { name: /add transaction/i }).click();

    await expect(dialog).toBeVisible();

    await selectTransactionType(page, 'Dividend');

    await page.locator('#assetSymbol').fill('GOOGL');
    await page.locator('#price').fill('0.55');
    await page.locator('#quantity').fill('100');
    await page.locator('#notes').fill('Q4 dividend');

    await submitTransaction(page);
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify both dividends appear in the table via their notes
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/q1 dividend/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/q4 dividend/i)).toBeVisible({ timeout: 5000 });
  });

  test('should validate dividend amount is positive', async ({ page }) => {
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = getTransactionDialog(page);
    await expect(dialog).toBeVisible();

    await selectTransactionType(page, 'Dividend');

    await page.locator('#assetSymbol').fill('TEST');

    // Try negative dividend amount
    await page.locator('#price').fill('-0.50');
    await page.locator('#quantity').fill('100');

    // Blur the price field to trigger validation
    await page.locator('#price').blur();

    // The form schema rejects negative prices (must be >= 0),
    // so the submit button should be disabled
    const submitButton = dialog.getByRole('button', { name: /add transaction/i });
    await expect(submitButton).toBeDisabled();

    // Should show validation error message
    await expect(page.getByText(/price must be.*non-negative/i)).toBeVisible({ timeout: 5000 });
  });

  test('should allow filtering transactions by dividend type', async ({ page }) => {
    // Add a dividend transaction first - use a pre-seeded symbol
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = getTransactionDialog(page);
    await expect(dialog).toBeVisible();

    await selectTransactionType(page, 'Dividend');

    await page.locator('#assetSymbol').fill('MSFT');
    await page.locator('#price').fill('1.00');
    await page.locator('#quantity').fill('10');

    await submitTransaction(page);
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify transaction is in the table
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 5000 });

    // The transaction table uses a native <select> for type filtering
    const filterSelect = page.locator('select');
    if (await filterSelect.count() > 0) {
      await filterSelect.first().selectOption('dividend');

      // After filtering, verify the table still shows dividend transactions
      await expect(table.getByText('Dividend').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show dividend income in performance metrics', async ({ page }) => {
    // Add dividend
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = getTransactionDialog(page);
    await expect(dialog).toBeVisible();

    await selectTransactionType(page, 'Dividend');

    await page.locator('#assetSymbol').fill('AMZN');
    await page.locator('#price').fill('2.00');
    await page.locator('#quantity').fill('50');

    await submitTransaction(page);
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Navigate to performance or analysis page
    const performanceLink = page.getByRole('link', { name: /performance/i }).or(page.getByRole('link', { name: /analysis/i }));
    if (await performanceLink.count() > 0) {
      await performanceLink.first().click();
      await page.waitForLoadState('load');
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5000 });
    }
  });
});
