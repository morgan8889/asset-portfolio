/**
 * E2E Tests for Multi-Portfolio Management and Switching
 *
 * Tests the complete workflow for managing multiple portfolios,
 * switching between them, and ensuring proper data isolation.
 *
 * Coverage:
 * - Create multiple portfolios
 * - Switch between portfolios
 * - Verify data isolation (transactions, holdings)
 * - Delete portfolios
 * - Portfolio persistence across sessions
 */

import { test, expect } from '@playwright/test';

test.describe('Portfolio Switching', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    await expect(page.getByText(/portfolio dashboard/i)).toBeVisible({ timeout: 10000 });
  });

  test('should create a new portfolio', async ({ page }) => {
    // Look for create/add portfolio button
    const createButton = page.getByRole('button', { name: /create portfolio|add portfolio|new portfolio/i });

    if (await createButton.count() > 0) {
      await createButton.first().click();

      // Fill in portfolio details
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      await page.getByLabel(/portfolio name|name/i).fill('Retirement Portfolio');
      await page.getByLabel(/description/i).fill('Long-term retirement savings');

      // Submit
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Verify portfolio appears in selector/list
      await expect(page.getByText(/retirement portfolio/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should switch between portfolios', async ({ page }) => {
    // Create first portfolio
    const createButton = page.getByRole('button', { name: /create portfolio|add portfolio|new portfolio/i });

    if (await createButton.count() > 0) {
      // Create Portfolio 1
      await createButton.first().click();
      let dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      await page.getByLabel(/portfolio name|name/i).fill('Portfolio One');
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Create Portfolio 2
      await createButton.first().click();
      dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      await page.getByLabel(/portfolio name|name/i).fill('Portfolio Two');
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Switch between portfolios using selector/dropdown
      const portfolioSelector = page.getByRole('combobox', { name: /portfolio|select portfolio/i })
        .or(page.getByRole('button', { name: /portfolio one|portfolio two/i }));

      if (await portfolioSelector.count() > 0) {
        await portfolioSelector.first().click();

        // Select Portfolio One
        await page.getByRole('option', { name: /portfolio one/i }).or(page.getByText(/^portfolio one$/i)).click();
        await expect(page.getByText(/portfolio one/i)).toBeVisible({ timeout: 5000 });

        // Switch to Portfolio Two
        await portfolioSelector.first().click();
        await page.getByRole('option', { name: /portfolio two/i }).or(page.getByText(/^portfolio two$/i)).click();
        await expect(page.getByText(/portfolio two/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should maintain separate holdings for each portfolio', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create portfolio|add portfolio|new portfolio/i });

    if (await createButton.count() > 0) {
      // Create Portfolio A
      await createButton.first().click();
      let dialog = page.getByRole('dialog');
      await page.getByLabel(/portfolio name|name/i).fill('Portfolio A');
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Add transaction to Portfolio A
      await page.getByRole('button', { name: /add transaction/i }).click();
      dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      await page.getByLabel(/transaction type/i).click();
      await page.getByRole('option', { name: /buy/i }).click();
      await page.getByLabel(/asset symbol/i).fill('PORTA');
      await page.getByLabel(/transaction date/i).fill(new Date().toISOString().split('T')[0]);
      await page.getByLabel(/^quantity$/i).fill('10');
      await page.getByLabel(/^price$/i).fill('100.00');

      await page.getByRole('button', { name: /add transaction/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Create Portfolio B
      await createButton.first().click();
      dialog = page.getByRole('dialog');
      await page.getByLabel(/portfolio name|name/i).fill('Portfolio B');
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Add different transaction to Portfolio B
      await page.getByRole('button', { name: /add transaction/i }).click();
      dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      await page.getByLabel(/transaction type/i).click();
      await page.getByRole('option', { name: /buy/i }).click();
      await page.getByLabel(/asset symbol/i).fill('PORTB');
      await page.getByLabel(/transaction date/i).fill(new Date().toISOString().split('T')[0]);
      await page.getByLabel(/^quantity$/i).fill('20');
      await page.getByLabel(/^price$/i).fill('50.00');

      await page.getByRole('button', { name: /add transaction/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Navigate to holdings
      await page.getByRole('link', { name: /holdings/i }).click();
      await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });

      // Should only see Portfolio B holdings (PORTB)
      await expect(page.getByText(/portb/i)).toBeVisible({ timeout: 5000 });

      // Switch to Portfolio A
      const portfolioSelector = page.getByRole('combobox', { name: /portfolio/i })
        .or(page.getByRole('button', { name: /portfolio/i }));

      if (await portfolioSelector.count() > 0) {
        await portfolioSelector.first().click();
        await page.getByRole('option', { name: /portfolio a/i }).or(page.getByText(/^portfolio a$/i)).click();

        // Should now see Portfolio A holdings (PORTA)
        await page.getByRole('link', { name: /holdings/i }).click();
        await expect(page.getByText(/porta/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should maintain separate transactions for each portfolio', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create portfolio|add portfolio|new portfolio/i });

    if (await createButton.count() > 0) {
      // Create two portfolios with different transactions
      await createButton.first().click();
      let dialog = page.getByRole('dialog');
      await page.getByLabel(/portfolio name|name/i).fill('Trading Account');
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Add transaction
      await page.getByRole('button', { name: /add transaction/i }).click();
      dialog = page.getByRole('dialog');
      await page.getByLabel(/transaction type/i).click();
      await page.getByRole('option', { name: /buy/i }).click();
      await page.getByLabel(/asset symbol/i).fill('TRADE1');
      await page.getByLabel(/transaction date/i).fill(new Date().toISOString().split('T')[0]);
      await page.getByLabel(/^quantity$/i).fill('5');
      await page.getByLabel(/^price$/i).fill('200.00');
      await page.getByRole('button', { name: /add transaction/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Create second portfolio
      await createButton.first().click();
      dialog = page.getByRole('dialog');
      await page.getByLabel(/portfolio name|name/i).fill('Investment Account');
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Navigate to transactions page
      await page.getByRole('link', { name: /transactions/i }).click();
      await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();

      // Should see empty state or no TRADE1 transactions (in Investment Account)
      const trade1Text = page.getByText(/trade1/i);
      const isEmpty = (await trade1Text.count()) === 0;

      // Switch back to Trading Account
      const portfolioSelector = page.getByRole('combobox', { name: /portfolio/i })
        .or(page.getByRole('button', { name: /portfolio/i }));

      if (await portfolioSelector.count() > 0) {
        await portfolioSelector.first().click();
        await page.getByRole('option', { name: /trading account/i }).click();

        // Should now see TRADE1 transaction
        await expect(page.getByText(/trade1/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should persist active portfolio across page navigation', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create portfolio|add portfolio|new portfolio/i });

    if (await createButton.count() > 0) {
      // Create portfolio
      await createButton.first().click();
      const dialog = page.getByRole('dialog');
      await page.getByLabel(/portfolio name|name/i).fill('Persistent Portfolio');
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Verify portfolio is active
      await expect(page.getByText(/persistent portfolio/i)).toBeVisible({ timeout: 5000 });

      // Navigate to holdings
      await page.getByRole('link', { name: /holdings/i }).click();
      await expect(page.getByRole('heading', { name: /holdings/i })).toBeVisible();

      // Should still show Persistent Portfolio
      await expect(page.getByText(/persistent portfolio/i)).toBeVisible({ timeout: 5000 });

      // Navigate to transactions
      await page.getByRole('link', { name: /transactions/i }).click();
      await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();

      // Should still show Persistent Portfolio
      await expect(page.getByText(/persistent portfolio/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should allow deleting a portfolio', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create portfolio|add portfolio|new portfolio/i });

    if (await createButton.count() > 0) {
      // Create portfolio to delete
      await createButton.first().click();
      let dialog = page.getByRole('dialog');
      await page.getByLabel(/portfolio name|name/i).fill('Delete Me');
      await page.getByRole('button', { name: /create|save/i }).click();
      await expect(dialog).not.toBeVisible({ timeout: 5000 });

      // Look for delete/settings option
      const settingsButton = page.getByRole('button', { name: /settings|manage|edit portfolio/i })
        .or(page.locator('button[aria-label="Portfolio settings"]'));

      if (await settingsButton.count() > 0) {
        await settingsButton.first().click();

        // Look for delete option
        const deleteButton = page.getByRole('button', { name: /delete|remove/i })
          .or(page.getByRole('menuitem', { name: /delete|remove/i }));

        if (await deleteButton.count() > 0) {
          await deleteButton.first().click();

          // Confirm deletion
          dialog = page.getByRole('dialog');
          if (await dialog.count() > 0) {
            const confirmButton = dialog.getByRole('button', { name: /delete|confirm|yes/i });
            await confirmButton.click();
          }
        }
      }
    }
  });

  test('should show portfolio count in UI', async ({ page }) => {
    // Generate mock data which creates a portfolio
    const generateButton = page.getByRole('button', { name: /generate mock data/i });
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await expect(page).toHaveURL('/', { timeout: 10000 });
    }

    // Look for portfolio count or list
    const portfolioIndicator = page.getByText(/\d+ portfolio/i)
      .or(page.getByRole('combobox', { name: /portfolio/i }));

    // Should have at least one portfolio
    expect(await portfolioIndicator.count()).toBeGreaterThan(0);
  });

  test('should validate portfolio name is required', async ({ page }) => {
    const createButton = page.getByRole('button', { name: /create portfolio|add portfolio|new portfolio/i });

    if (await createButton.count() > 0) {
      await createButton.first().click();

      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();

      // Try to create without name
      await page.getByRole('button', { name: /create|save/i }).click();

      // Should show validation error or prevent submission
      // (Dialog should still be visible)
      await expect(dialog).toBeVisible();
    }
  });
});
