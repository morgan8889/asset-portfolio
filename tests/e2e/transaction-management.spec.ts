import { test, expect, seedMockData } from './fixtures/test';
import {
  selectTransactionType,
  fillTransactionFields,
  fillTransactionDate,
  submitTransaction,
} from './fixtures/form-helpers';

test.describe('Transaction Management', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/transactions');
    await page.waitForLoadState('load');
  });

  test('should open add transaction dialog', async ({ page }) => {
    // Find and click the "Add Transaction" button
    const addTransactionButton = page.getByRole('button', { name: /add transaction/i });

    // Wait for the button to be visible and click it
    await expect(addTransactionButton).toBeVisible();
    await addTransactionButton.click();

    // Dialog should open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Should have form fields
    await expect(page.locator('#type')).toBeVisible();
    await expect(page.locator('#assetSymbol')).toBeVisible();
    await expect(page.locator('#quantity')).toBeVisible();
    await expect(page.locator('#price')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Submit button inside the dialog should be disabled initially
    const submitButton = dialog.getByRole('button', { name: /add transaction/i });
    await expect(submitButton).toBeDisabled();

    // Fill asset symbol
    await page.locator('#assetSymbol').fill('AAPL');

    // Submit should still be disabled
    await expect(submitButton).toBeDisabled();

    // Fill quantity
    await page.locator('#quantity').fill('100');

    // Submit should still be disabled
    await expect(submitButton).toBeDisabled();

    // Fill price
    await page.locator('#price').fill('150.00');

    // Now submit should be enabled
    await expect(submitButton).toBeEnabled();
  });

  test('should validate input formats', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Test invalid quantity
    const quantityField = page.locator('#quantity');
    await quantityField.fill('-5');
    await quantityField.blur();

    // Should show validation error
    await expect(page.getByText(/quantity must be.*positive/i)).toBeVisible();

    // Test valid quantity
    await quantityField.fill('100');
    await quantityField.blur();

    // Error should disappear
    await expect(page.getByText(/quantity must be.*positive/i)).not.toBeVisible();

    // Test invalid price
    const priceField = page.locator('#price');
    await priceField.fill('-10');
    await priceField.blur();

    // Should show validation error
    await expect(page.getByText(/price must be.*non-negative/i)).toBeVisible();

    // Test valid price
    await priceField.fill('150.50');
    await priceField.blur();

    // Error should disappear
    await expect(page.getByText(/price must be.*non-negative/i)).not.toBeVisible();
  });

  test('should calculate total transaction value', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill in transaction details
    await page.locator('#assetSymbol').fill('AAPL');
    await page.locator('#quantity').fill('100');
    await page.locator('#price').fill('150.00');

    // The total container holds both the label and the calculated value.
    // calculateTotal().toFixed(2) renders without comma separators (e.g. "$15000.00").
    const totalContainer = page.locator('.space-y-2').filter({ hasText: 'Total Transaction Value' });
    await expect(totalContainer).toContainText('$15000.00');

    // Add fees and check total updates (buy: subtotal + fees)
    await page.locator('#fees').fill('9.99');
    await expect(totalContainer).toContainText('$15009.99');
  });

  test('should handle different transaction types', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Test selecting different transaction types via shadcn Select
    await page.locator('#type').click();

    // Should have different options
    await expect(page.getByRole('option', { name: /^Buy$/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /^Sell$/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /^Dividend$/i })).toBeVisible();

    // Select dividend type
    await page.getByRole('option', { name: /^Dividend$/i }).click();

    // Price label should update to "Dividend per Share"
    await expect(page.getByText(/dividend per share/i)).toBeVisible();
  });

  test('should handle date picker', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // The form defaults date to today, so the button shows a formatted date
    // (e.g. "February 15, 2026"), not "Pick a date". Locate it via the
    // Transaction Date label section, matching the form-helpers pattern.
    const dateButton = page.locator('.space-y-2')
      .filter({ hasText: 'Transaction Date' })
      .getByRole('button');
    await expect(dateButton).toBeVisible();

    // Remember the initial button text (today's date)
    const initialText = await dateButton.textContent();
    await dateButton.click();

    // Date input should be visible inside popover
    const dateInput = page.locator('[data-radix-popper-content-wrapper] input[type="date"]').last();
    await expect(dateInput).toBeVisible();
    await dateInput.fill('2024-01-15');
    await page.keyboard.press('Escape');

    // Date button text should now show the new date (contains "2024"),
    // different from today's date
    await expect(dateButton).toContainText('2024');
    await expect(dateButton).not.toContainText(initialText!);
  });

  test('should submit transaction successfully', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill required fields using correct selectors
    await fillTransactionFields(page, {
      symbol: 'AAPL',
      quantity: '100',
      price: '150.00',
    });

    // Submit transaction
    await submitTransaction(page);

    // Dialog should close (transaction saved to IndexedDB)
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('should show transaction in table after creation', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill required fields
    await fillTransactionFields(page, {
      symbol: 'MSFT',
      quantity: '50',
      price: '415.00',
    });

    // Submit transaction
    await submitTransaction(page);

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Transaction should appear in the table - scope to table to avoid
    // strict mode violation from MSFT appearing in multiple places on the page
    const table = page.getByRole('table');
    await expect(table).toBeVisible({ timeout: 5000 });
    await expect(table.getByText(/MSFT/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should close dialog on cancel', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill some data
    await page.locator('#assetSymbol').fill('AAPL');

    // Click cancel
    const cancelButton = dialog.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();
  });

  test('should handle symbol input', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Type in symbol field
    const symbolField = page.locator('#assetSymbol');
    await symbolField.fill('AAPL');

    // Symbol field should have the value
    await expect(symbolField).toHaveValue('AAPL');
  });

  test('should be accessible', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Check for proper ARIA roles
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Should have accessible form inputs with IDs
    await expect(page.locator('#type')).toBeVisible();
    await expect(page.locator('#assetSymbol')).toBeVisible();
    await expect(page.locator('#quantity')).toBeVisible();
    await expect(page.locator('#price')).toBeVisible();

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();

    // Should be able to navigate through form with keyboard
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      const newFocused = page.locator(':focus');
      await expect(newFocused).toBeVisible();
    }

    // Escape key should close dialog
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/transactions');
    await page.waitForLoadState('load');

    // Find add transaction button
    const addButton = page.getByRole('button', { name: /add transaction/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Dialog should be responsive
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Form should be usable on mobile
    await page.locator('#assetSymbol').fill('AAPL');
    await page.locator('#quantity').fill('100');

    // Should be able to scroll if needed
    await page.mouse.wheel(0, 100);

    // Fields should still be accessible
    await expect(page.locator('#price')).toBeVisible();
  });
});
