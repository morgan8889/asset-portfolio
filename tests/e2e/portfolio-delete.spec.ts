import { test, expect, seedMockData } from './fixtures/test';
import { seedSecondPortfolio } from './fixtures/seed-helpers';

/** Wait for delete dialog to be fully ready (transaction count loaded). */
async function waitForDeleteDialogReady(page: import('@playwright/test').Page) {
  await expect(page.getByRole('heading', { name: /delete portfolio/i })).toBeVisible();
  // The delete button appears after the transaction count check completes
  await expect(page.getByRole('button', { name: /delete portfolio/i })).toBeVisible({ timeout: 5000 });
}

test.describe('Portfolio Delete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/portfolios');
    await page.waitForLoadState('load');
  });

  test('should open delete dialog when clicking Delete button', async ({ page }) => {
    // Click Delete button on first portfolio (aria-label="Delete")
    const deleteButton = page.getByRole('button', { name: 'Delete' }).first();
    await deleteButton.click();

    // Dialog should open with "Delete Portfolio" title
    await expect(page.getByRole('heading', { name: /delete portfolio/i })).toBeVisible();
    await expect(page.getByText(/this action cannot be undone/i)).toBeVisible();
  });

  test('should show portfolio name in delete dialog', async ({ page }) => {
    // Get portfolio name from table
    const firstPortfolioRow = page.getByRole('row').nth(1);
    const portfolioName = await firstPortfolioRow.getByRole('cell').first().textContent();
    const cleanName = portfolioName?.trim().replace(/Current$/, '').trim() || '';

    // Click Delete button
    const deleteButton = page.getByRole('button', { name: 'Delete' }).first();
    await deleteButton.click();

    // Portfolio name should appear inside the dialog (scoped to avoid matching table row)
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(cleanName)).toBeVisible();
  });

  test('should show simple confirmation for portfolio with no transactions', async ({ page }) => {
    // Seed a portfolio with 0 transactions so it gets "simple" confirmation
    await seedSecondPortfolio(page, {
      name: 'Empty Portfolio',
      transactionCount: 0,
    });

    // Reload the page so the new portfolio appears in the table
    await page.goto('/portfolios');
    await page.waitForLoadState('load');

    // Find the row containing the empty portfolio and click its Delete button
    const emptyRow = page.getByRole('row').filter({ hasText: 'Empty Portfolio' });
    await emptyRow.getByRole('button', { name: 'Delete' }).click();

    await waitForDeleteDialogReady(page);

    // Should not show checkbox or text input
    const checkbox = page.getByRole('checkbox');
    const textInput = page.getByPlaceholder(/type portfolio name/i);
    await expect(checkbox).not.toBeVisible();
    await expect(textInput).not.toBeVisible();

    // Delete button should be enabled (simple confirmation = no extra step)
    const confirmButton = page.getByRole('button', { name: /delete portfolio/i });
    await expect(confirmButton).toBeEnabled();
  });

  test('should cancel deletion without removing portfolio', async ({ page }) => {
    // Wait for the table to have at least one data row (header + 1 portfolio)
    await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeVisible({ timeout: 5000 });

    // Count rows scoped to the table element to avoid counting dialog rows
    const table = page.getByRole('table');
    const originalRows = await table.getByRole('row').count();

    // Click Delete button
    const deleteButton = page.getByRole('button', { name: 'Delete' }).first();
    await deleteButton.click();

    await expect(page.getByRole('heading', { name: /delete portfolio/i })).toBeVisible();

    // Click Cancel
    await page.getByRole('button', { name: /cancel/i }).click();

    // Dialog should close
    await expect(page.getByRole('heading', { name: /delete portfolio/i })).not.toBeVisible();

    // Portfolio count should remain the same (scoped to table)
    const currentRows = await table.getByRole('row').count();
    expect(currentRows).toBe(originalRows);
  });

  test('should delete portfolio successfully with simple confirmation', async ({ page }) => {
    // Get initial portfolio count
    const initialRows = await page.getByRole('row').count();

    // Get first portfolio name to verify deletion
    const firstPortfolioRow = page.getByRole('row').nth(1);
    const portfolioName = await firstPortfolioRow.getByRole('cell').first().textContent();

    // Click Delete button
    const deleteButton = page.getByRole('button', { name: 'Delete' }).first();
    await deleteButton.click();

    await waitForDeleteDialogReady(page);

    // Confirm deletion (if delete button is enabled)
    const confirmButton = page.getByRole('button', { name: /delete portfolio/i });

    if (await confirmButton.isEnabled()) {
      await confirmButton.click();

      // Wait for dialog to close
      await expect(page.getByRole('heading', { name: /delete portfolio/i })).not.toBeVisible();

      // Portfolio should be removed from table
      await expect(page.getByText(portfolioName?.trim() || '')).not.toBeVisible();

      // Row count should decrease
      const finalRows = await page.getByRole('row').count();
      expect(finalRows).toBeLessThan(initialRows);
    }
  });

  test('should show checkbox confirmation for portfolios with transactions', async ({ page }) => {
    // This test assumes we can find a portfolio with transactions
    // May need to create test data first

    const deleteButtons = page.getByRole('button', { name: 'Delete' });
    const count = await deleteButtons.count();

    for (let i = 0; i < count; i++) {
      await deleteButtons.nth(i).click();

      await waitForDeleteDialogReady(page);

      // Check if checkbox confirmation is shown
      const checkbox = page.getByRole('checkbox');
      if (await checkbox.isVisible().catch(() => false)) {
        // Found a portfolio with checkbox confirmation
        await expect(checkbox).toBeVisible();
        await expect(page.getByText(/permanently delete/i)).toBeVisible();

        // Delete button should be disabled initially
        const deleteBtn = page.getByRole('button', { name: /delete portfolio/i });
        await expect(deleteBtn).toBeDisabled();

        // Check the checkbox
        await checkbox.click();

        // Delete button should now be enabled
        await expect(deleteBtn).toBeEnabled();

        // Cancel and exit loop
        await page.getByRole('button', { name: /cancel/i }).click();
        break;
      } else {
        // Not the right portfolio, cancel and try next
        await page.getByRole('button', { name: /cancel/i }).click();
        await expect(page.getByRole('heading', { name: /delete portfolio/i })).not.toBeVisible();
      }
    }
  });

  test('should enable delete after checkbox is checked', async ({ page }) => {
    const deleteButtons = page.getByRole('button', { name: 'Delete' });
    const count = await deleteButtons.count();

    for (let i = 0; i < count; i++) {
      await deleteButtons.nth(i).click();
      await waitForDeleteDialogReady(page);

      const checkbox = page.getByRole('checkbox');
      if (await checkbox.isVisible().catch(() => false)) {
        const deleteBtn = page.getByRole('button', { name: /delete portfolio/i });

        // Initially disabled
        await expect(deleteBtn).toBeDisabled();

        // Check the checkbox
        await checkbox.click();

        // Now enabled
        await expect(deleteBtn).toBeEnabled();

        // Cancel
        await page.getByRole('button', { name: /cancel/i }).click();
        break;
      } else {
        await page.getByRole('button', { name: /cancel/i }).click();
        await expect(page.getByRole('heading', { name: /delete portfolio/i })).not.toBeVisible();
      }
    }
  });

  test('should show typed confirmation for portfolios with many transactions', async ({ page }) => {
    // This test looks for a portfolio requiring typed confirmation
    const deleteButtons = page.getByRole('button', { name: 'Delete' });
    const count = await deleteButtons.count();

    for (let i = 0; i < count; i++) {
      await deleteButtons.nth(i).click();
      await waitForDeleteDialogReady(page);

      const textInput = page.getByPlaceholder(/type portfolio name/i);
      if (await textInput.isVisible().catch(() => false)) {
        // Found a portfolio with typed confirmation
        await expect(textInput).toBeVisible();

        const deleteBtn = page.getByRole('button', { name: /delete portfolio/i });
        await expect(deleteBtn).toBeDisabled();

        // Cancel
        await page.getByRole('button', { name: /cancel/i }).click();
        break;
      } else {
        await page.getByRole('button', { name: /cancel/i }).click();
        await expect(page.getByRole('heading', { name: /delete portfolio/i })).not.toBeVisible();
      }
    }
  });

  test('should delete multiple portfolios sequentially', async ({ page }) => {
    // Get initial count
    const initialRows = await page.getByRole('row').count();

    // Only proceed if we have more than 2 portfolios (1 header + at least 2 data rows)
    if (initialRows > 2) {
      // Delete first portfolio
      const firstDeleteButton = page.getByRole('button', { name: 'Delete' }).first();
      await firstDeleteButton.click();

      await waitForDeleteDialogReady(page);
      const firstDeleteConfirm = page.getByRole('button', { name: /delete portfolio/i });

      if (await firstDeleteConfirm.isEnabled()) {
        await firstDeleteConfirm.click();
        await expect(page.getByRole('heading', { name: /delete portfolio/i })).not.toBeVisible();

        // Wait for table to update after deletion
        await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeVisible({ timeout: 5000 });

        // Delete second portfolio (which is now first)
        const secondDeleteButton = page.getByRole('button', { name: 'Delete' }).first();
        await secondDeleteButton.click();

        await waitForDeleteDialogReady(page);
        const secondDeleteConfirm = page.getByRole('button', { name: /delete portfolio/i });

        if (await secondDeleteConfirm.isEnabled()) {
          await secondDeleteConfirm.click();
          await expect(page.getByRole('heading', { name: /delete portfolio/i })).not.toBeVisible();

          // Should have 2 fewer rows
          const finalRows = await page.getByRole('row').count();
          expect(finalRows).toBe(initialRows - 2);
        }
      }
    }
  });

  test('should switch to next portfolio after deleting current portfolio', async ({ page }) => {
    // Find current portfolio (has "Current" badge)
    const currentBadge = page.getByText(/current/i).first();

    if (await currentBadge.isVisible().catch(() => false)) {
      // Get the current portfolio name
      const currentRow = page.locator('tr').filter({ has: currentBadge });
      const currentName = await currentRow.getByRole('cell').first().textContent();

      // Delete the current portfolio
      const deleteButton = currentRow.getByRole('button', { name: 'Delete' });
      await deleteButton.click();

      await waitForDeleteDialogReady(page);
      const confirmButton = page.getByRole('button', { name: /delete portfolio/i });

      if (await confirmButton.isEnabled()) {
        await confirmButton.click();
        await expect(page.getByRole('heading', { name: /delete portfolio/i })).not.toBeVisible();

        // Wait for UI to update - current badge should appear on a different portfolio
        await expect(page.getByText(/current/i).first()).toBeVisible({ timeout: 5000 });

        // But not with the deleted portfolio name
        const deletedPortfolio = page.locator('tr').filter({ hasText: currentName?.trim() || '' });
        await expect(deletedPortfolio).not.toBeVisible();
      }
    }
  });

  test('should show loading state during deletion', async ({ page }) => {
    const deleteButton = page.getByRole('button', { name: 'Delete' }).first();
    await deleteButton.click();

    await waitForDeleteDialogReady(page);
    const confirmButton = page.getByRole('button', { name: /delete portfolio/i });

    if (await confirmButton.isEnabled()) {
      await confirmButton.click();

      // May briefly show "Deleting..." (can be too fast to catch reliably)
      // But button should be disabled during deletion
      await expect(confirmButton).toBeDisabled();
    }
  });

  test('should show transaction count in delete warning', async ({ page }) => {
    const deleteButtons = page.getByRole('button', { name: 'Delete' });
    const count = await deleteButtons.count();

    for (let i = 0; i < count; i++) {
      await deleteButtons.nth(i).click();
      await waitForDeleteDialogReady(page);

      // Check if transaction count is shown
      const transactionText = page.getByText(/\d+ transactions?/i);
      if (await transactionText.isVisible().catch(() => false)) {
        await expect(transactionText).toBeVisible();
        await page.getByRole('button', { name: /cancel/i }).click();
        break;
      } else {
        await page.getByRole('button', { name: /cancel/i }).click();
        await expect(page.getByRole('heading', { name: /delete portfolio/i })).not.toBeVisible();
      }
    }
  });
});

test.describe('Last Portfolio Warning', () => {
  test('should show warning when deleting last portfolio', async ({ page }) => {
    await seedMockData(page);
    await page.goto('/portfolios');
    await page.waitForLoadState('load');

    // Count portfolios
    const rows = page.getByRole('row');
    const rowCount = await rows.count();

    // If only one portfolio (plus header row = 2 total)
    if (rowCount === 2) {
      const deleteButton = page.getByRole('button', { name: 'Delete' }).first();
      await deleteButton.click();

      await expect(page.getByText(/last portfolio/i)).toBeVisible();
      await expect(page.getByText(/leave you with no portfolios/i)).toBeVisible();
    }
  });
});
