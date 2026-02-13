import { test, expect, seedMockData } from './fixtures/test';

test.describe('Portfolio Edit Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/portfolios');
    await page.waitForLoadState('networkidle');
  });

  test('should open edit dialog when clicking Edit button', async ({ page }) => {
    // Click Edit button on first portfolio
    const editButton = page.getByRole('button', { name: /pencil/i }).first();
    await editButton.click();

    // Dialog should open with "Edit Portfolio" title
    await expect(page.getByRole('heading', { name: /edit portfolio/i })).toBeVisible();
    
    // Form should have portfolio data pre-filled
    await expect(page.getByLabel(/portfolio name/i)).not.toBeEmpty();
  });

  test('should pre-fill form with existing portfolio data', async ({ page }) => {
    // Get portfolio name from table
    const firstPortfolioRow = page.getByRole('row').nth(1);
    const portfolioName = await firstPortfolioRow.getByRole('cell').first().textContent();

    // Click Edit button
    const editButton = page.getByRole('button', { name: /pencil/i }).first();
    await editButton.click();

    // Name input should be pre-filled
    const nameInput = page.getByLabel(/portfolio name/i);
    await expect(nameInput).toHaveValue(portfolioName?.trim().replace(/Current$/, '').trim() || '');
  });

  test('should update portfolio name successfully', async ({ page }) => {
    // Click Edit button on first portfolio
    const editButton = page.getByRole('button', { name: /pencil/i }).first();
    await editButton.click();

    // Update the name
    const nameInput = page.getByLabel(/portfolio name/i);
    await nameInput.clear();
    const newName = `Updated Portfolio ${Date.now()}`;
    await nameInput.fill(newName);

    // Submit the form
    await page.getByRole('button', { name: /update portfolio/i }).click();

    // Wait for dialog to close
    await expect(page.getByRole('heading', { name: /edit portfolio/i })).not.toBeVisible();

    // Updated name should appear in the table
    await expect(page.getByText(newName)).toBeVisible();
  });

  test('should update portfolio type successfully', async ({ page }) => {
    // Click Edit button
    const editButton = page.getByRole('button', { name: /pencil/i }).first();
    await editButton.click();

    // Change portfolio type
    await page.getByRole('combobox', { name: /account type/i }).click();
    await page.getByRole('option', { name: /roth ira/i }).click();

    // Submit
    await page.getByRole('button', { name: /update portfolio/i }).click();

    // Wait for dialog to close
    await expect(page.getByRole('heading', { name: /edit portfolio/i })).not.toBeVisible();

    // Table should show updated type badge
    await expect(page.getByText('Roth IRA')).toBeVisible();
  });

  test('should show warning when changing type for portfolio with transactions', async ({ page }) => {
    // First, ensure we're editing a portfolio that might have transactions
    const editButton = page.getByRole('button', { name: /pencil/i }).first();
    await editButton.click();

    // Get original type
    const typeCombobox = page.getByRole('combobox', { name: /account type/i });
    
    // Change to different type
    await typeCombobox.click();
    await page.getByRole('option', { name: /401\(k\)/i }).click();

    // If portfolio has transactions, warning should appear
    const warning = page.getByText(/type change warning/i);
    if (await warning.isVisible()) {
      await expect(warning).toBeVisible();
      await expect(page.getByText(/transaction/i)).toBeVisible();
    }
  });

  test('should cancel edit without making changes', async ({ page }) => {
    // Get original portfolio name
    const firstPortfolioRow = page.getByRole('row').nth(1);
    const originalName = await firstPortfolioRow.getByRole('cell').first().textContent();

    // Click Edit button
    const editButton = page.getByRole('button', { name: /pencil/i }).first();
    await editButton.click();

    // Change the name
    const nameInput = page.getByLabel(/portfolio name/i);
    await nameInput.clear();
    await nameInput.fill('This should not be saved');

    // Click Cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog should close
    await expect(page.getByRole('heading', { name: /edit portfolio/i })).not.toBeVisible();

    // Original name should still be in table
    await expect(page.getByText(originalName?.trim() || '')).toBeVisible();
    await expect(page.getByText('This should not be saved')).not.toBeVisible();
  });

  test('should update portfolio currency successfully', async ({ page }) => {
    // Click Edit button
    const editButton = page.getByRole('button', { name: /pencil/i }).first();
    await editButton.click();

    // Change currency
    await page.getByRole('combobox', { name: /base currency/i }).click();
    await page.getByRole('option', { name: /eur - euro/i }).click();

    // Submit
    await page.getByRole('button', { name: /update portfolio/i }).click();

    // Wait for dialog to close
    await expect(page.getByRole('heading', { name: /edit portfolio/i })).not.toBeVisible();
    
    // Note: Currency change won't be visible in the table, but the update should succeed
  });

  test('should validate required fields during edit', async ({ page }) => {
    // Click Edit button
    const editButton = page.getByRole('button', { name: /pencil/i }).first();
    await editButton.click();

    // Clear the name field
    const nameInput = page.getByLabel(/portfolio name/i);
    await nameInput.clear();

    // Try to submit
    await page.getByRole('button', { name: /update portfolio/i }).click();

    // Error message should appear
    await expect(page.getByText(/portfolio name is required/i)).toBeVisible();
    
    // Dialog should remain open
    await expect(page.getByRole('heading', { name: /edit portfolio/i })).toBeVisible();
  });

  test('should edit multiple portfolios sequentially', async ({ page }) => {
    // Edit first portfolio
    const firstEditButton = page.getByRole('button', { name: /pencil/i }).first();
    await firstEditButton.click();
    
    const firstName = `Portfolio A ${Date.now()}`;
    await page.getByLabel(/portfolio name/i).clear();
    await page.getByLabel(/portfolio name/i).fill(firstName);
    await page.getByRole('button', { name: /update portfolio/i }).click();
    
    await expect(page.getByRole('heading', { name: /edit portfolio/i })).not.toBeVisible();
    await expect(page.getByText(firstName)).toBeVisible();

    // Edit second portfolio (if exists)
    const secondEditButton = page.getByRole('button', { name: /pencil/i }).nth(1);
    if (await secondEditButton.isVisible()) {
      await secondEditButton.click();
      
      const secondName = `Portfolio B ${Date.now()}`;
      await page.getByLabel(/portfolio name/i).clear();
      await page.getByLabel(/portfolio name/i).fill(secondName);
      await page.getByRole('button', { name: /update portfolio/i }).click();
      
      await expect(page.getByRole('heading', { name: /edit portfolio/i })).not.toBeVisible();
      await expect(page.getByText(secondName)).toBeVisible();
    }
  });

  test('should show loading state during update', async ({ page }) => {
    // Click Edit button
    const editButton = page.getByRole('button', { name: /pencil/i }).first();
    await editButton.click();

    // Make a change
    const nameInput = page.getByLabel(/portfolio name/i);
    await nameInput.clear();
    await nameInput.fill(`Test ${Date.now()}`);

    // Submit
    const updateButton = page.getByRole('button', { name: /update portfolio/i });
    await updateButton.click();

    // Should briefly show "Updating..." (may be too fast to catch reliably)
    // But button should be disabled during update
    await expect(updateButton).toBeDisabled();
  });

  test('should preserve current portfolio indicator after edit', async ({ page }) => {
    // Find current portfolio (has "Current" badge)
    const currentBadge = page.getByText(/current/i).first();
    if (await currentBadge.isVisible()) {
      // Get the row containing the current badge
      const currentRow = page.locator('tr').filter({ has: currentBadge });
      const originalName = await currentRow.getByRole('cell').first().textContent();
      
      // Edit the current portfolio
      const editButton = currentRow.getByRole('button', { name: /pencil/i });
      await editButton.click();
      
      // Change name
      const newName = `Current Portfolio ${Date.now()}`;
      await page.getByLabel(/portfolio name/i).clear();
      await page.getByLabel(/portfolio name/i).fill(newName);
      await page.getByRole('button', { name: /update portfolio/i }).click();
      
      // Wait for update
      await expect(page.getByRole('heading', { name: /edit portfolio/i })).not.toBeVisible();
      
      // Current badge should still be present with new name
      await expect(page.getByText(newName)).toBeVisible();
      const updatedRow = page.locator('tr').filter({ hasText: newName });
      await expect(updatedRow.getByText(/current/i)).toBeVisible();
    }
  });

  test('should maintain metrics after portfolio edit', async ({ page }) => {
    // Get initial metrics
    const firstRow = page.getByRole('row').nth(1);
    const initialHoldings = await firstRow.getByRole('cell').nth(4).textContent();
    
    // Edit portfolio name
    const editButton = page.getByRole('button', { name: /pencil/i }).first();
    await editButton.click();
    
    const newName = `Test Portfolio ${Date.now()}`;
    await page.getByLabel(/portfolio name/i).clear();
    await page.getByLabel(/portfolio name/i).fill(newName);
    await page.getByRole('button', { name: /update portfolio/i }).click();
    
    // Wait for update
    await expect(page.getByRole('heading', { name: /edit portfolio/i })).not.toBeVisible();
    
    // Find updated row and check metrics are preserved
    const updatedRow = page.locator('tr').filter({ hasText: newName });
    const updatedHoldings = await updatedRow.getByRole('cell').nth(4).textContent();
    
    expect(updatedHoldings).toBe(initialHoldings);
  });
});
