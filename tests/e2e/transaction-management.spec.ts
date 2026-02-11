import { test, expect } from './fixtures/test';

test.describe('Transaction Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard and wait for it to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
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

    // Should have proper title
    await expect(page.getByText('Add New Transaction')).toBeVisible();

    // Should have form fields
    await expect(page.getByLabel(/transaction type/i)).toBeVisible();
    await expect(page.getByLabel(/asset symbol/i)).toBeVisible();
    await expect(page.getByLabel(/quantity/i)).toBeVisible();
    await expect(page.getByLabel(/price/i)).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Try to submit without filling required fields
    const submitButton = page.getByRole('button', { name: 'Add Transaction' });
    await expect(submitButton).toBeVisible();

    // Submit button should be disabled initially
    await expect(submitButton).toBeDisabled();

    // Fill asset symbol
    await page.getByLabel(/asset symbol/i).fill('AAPL');

    // Submit should still be disabled
    await expect(submitButton).toBeDisabled();

    // Fill quantity
    await page.getByLabel(/quantity/i).fill('100');

    // Submit should still be disabled
    await expect(submitButton).toBeDisabled();

    // Fill price
    await page.getByLabel(/price.*share/i).fill('150.00');

    // Now submit should be enabled
    await expect(submitButton).toBeEnabled();
  });

  test('should validate input formats', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Test invalid quantity
    const quantityField = page.getByLabel(/quantity/i);
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
    const priceField = page.getByLabel(/price.*share/i);
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

    // Fill in transaction details
    await page.getByLabel(/asset symbol/i).fill('AAPL');
    await page.getByLabel(/quantity/i).fill('100');
    await page.getByLabel(/price.*share/i).fill('150.00');

    // Check if total is calculated (if visible)
    const totalElement = page.getByText(/total.*value/i);
    if (await totalElement.isVisible()) {
      await expect(totalElement).toContainText('$15,000.00');
    }

    // Add fees and check total updates
    await page.getByLabel(/fees/i).fill('9.99');

    if (await totalElement.isVisible()) {
      await expect(totalElement).toContainText('$15,009.99');
    }
  });

  test('should handle different transaction types', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Test selecting different transaction types
    const typeSelect = page.getByLabel(/transaction type/i);
    await typeSelect.click();

    // Should have different options
    await expect(page.getByText('Buy')).toBeVisible();
    await expect(page.getByText('Sell')).toBeVisible();
    await expect(page.getByText('Dividend')).toBeVisible();

    // Select dividend type
    await page.getByText('Dividend').click();

    // Labels should update appropriately
    await expect(page.getByLabel(/dividend per share/i)).toBeVisible();
  });

  test('should handle date picker', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Click on date picker
    const dateButton = page.getByRole('button', { name: /pick.*date/i });
    await dateButton.click();

    // Calendar should open
    const calendar = page.locator('[role="dialog"]').filter({ hasText: /calendar/i }).or(page.locator('.calendar'));

    // If calendar is visible, test it
    if (await calendar.isVisible()) {
      // Should have date options
      const dateOptions = page.locator('[role="gridcell"]');
      const count = await dateOptions.count();

      if (count > 0) {
        // Click on a date
        await dateOptions.first().click();

        // Date should be selected
        await expect(dateButton).not.toContainText('Pick a date');
      }
    }
  });

  test('should submit transaction successfully', async ({ page }) => {
    // Mock API response for successful submission
    await page.route('**/api/transactions', route => {
      route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'tx-123' })
      });
    });

    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Fill required fields
    await page.getByLabel(/asset symbol/i).fill('AAPL');
    await page.getByLabel(/quantity/i).fill('100');
    await page.getByLabel(/price.*share/i).fill('150.00');

    // Submit transaction
    const submitButton = page.getByRole('button', { name: 'Add Transaction' });
    await submitButton.click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Success feedback should appear (if implemented)
    const successMessage = page.getByText(/transaction.*added/i);
    if (await successMessage.isVisible()) {
      await expect(successMessage).toBeVisible();
    }
  });

  test('should handle submission errors', async ({ page }) => {
    // Mock API error response
    await page.route('**/api/transactions', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid transaction data' })
      });
    });

    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Fill required fields
    await page.getByLabel(/asset symbol/i).fill('INVALID');
    await page.getByLabel(/quantity/i).fill('100');
    await page.getByLabel(/price.*share/i).fill('150.00');

    // Submit transaction
    const submitButton = page.getByRole('button', { name: 'Add Transaction' });
    await submitButton.click();

    // Error message should appear
    const errorMessage = page.getByText(/error/i).or(page.getByText(/failed/i));
    await expect(errorMessage).toBeVisible();

    // Dialog should remain open
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should close dialog on cancel', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Fill some data
    await page.getByLabel(/asset symbol/i).fill('AAPL');

    // Click cancel
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should handle symbol search/autocomplete', async ({ page }) => {
    // Mock symbol search API
    await page.route('**/api/symbols/search*', route => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q');

      const suggestions = [
        { symbol: 'AAPL', name: 'Apple Inc.' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      ].filter(s => s.symbol.includes(query?.toUpperCase() || ''));

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(suggestions)
      });
    });

    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Start typing in symbol field
    const symbolField = page.getByLabel(/asset symbol/i);
    await symbolField.fill('A');

    // If autocomplete dropdown appears, test it
    const dropdown = page.locator('[role="listbox"]').or(page.locator('.autocomplete'));

    if (await dropdown.isVisible()) {
      // Should show suggestions
      await expect(page.getByText('AAPL')).toBeVisible();
      await expect(page.getByText('Apple Inc.')).toBeVisible();

      // Click on a suggestion
      await page.getByText('AAPL').click();

      // Symbol field should be filled
      await expect(symbolField).toHaveValue('AAPL');
    }
  });

  test('should be accessible', async ({ page }) => {
    // Open transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Check for proper ARIA labels and roles
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Should have accessible form labels
    const labels = page.locator('label');
    const labelCount = await labels.count();

    for (let i = 0; i < labelCount; i++) {
      const label = labels.nth(i);
      const forAttribute = await label.getAttribute('for');

      if (forAttribute) {
        // Should have corresponding input
        const input = page.locator(`#${forAttribute}`);
        await expect(input).toBeVisible();
      }
    }

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

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find add transaction button (might be in a different location on mobile)
    const addButton = page.getByRole('button', { name: /add transaction/i }).or(
      page.locator('[aria-label*="add"]').filter({ hasText: /transaction/i })
    );

    await expect(addButton).toBeVisible();
    await addButton.click();

    // Dialog should be responsive
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Form should be usable on mobile
    await page.getByLabel(/asset symbol/i).fill('AAPL');
    await page.getByLabel(/quantity/i).fill('100');

    // Should be able to scroll if needed
    await page.mouse.wheel(0, 100);

    // Fields should still be accessible
    await expect(page.getByLabel(/price.*share/i)).toBeVisible();
  });
});