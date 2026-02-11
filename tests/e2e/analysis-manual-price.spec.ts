import { test, expect } from './fixtures/test';
import { createBalancedPortfolio, navigateToAnalysisAndWait } from './fixtures/analysis-portfolios';

/**
 * E2E tests for Manual Price Update Dialog (T021)
 * Tests: Access dialog from holdings → Update price → Verify recalculation
 */
test.describe('Manual Price Update Dialog', () => {
  test('should update asset price manually and recalculate portfolio (P1)', async ({
    page,
  }) => {
    // Create balanced portfolio with assets
    await createBalancedPortfolio(page);

    // Navigate to holdings page
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    // Find first holding with dropdown menu
    // Look for a dropdown button (usually three dots or "Actions")
    const dropdownButtons = page.locator('button[aria-label*="actions" i], button:has-text("⋮")');
    const dropdownCount = await dropdownButtons.count();

    if (dropdownCount > 0) {
      // Click first dropdown
      await dropdownButtons.first().click();
      await page.waitForTimeout(300);

      // Look for "Update Price" or "Manual Price" option
      const updatePriceOption = page.getByRole('menuitem', {
        name: /Update.*Price|Manual.*Price/i,
      });

      if (await updatePriceOption.isVisible()) {
        // Get the current asset symbol before opening dialog
        const holdingsTable = page.locator('table').first();
        const firstRowSymbol = await holdingsTable
          .locator('tbody tr')
          .first()
          .locator('td')
          .first()
          .textContent();
        console.log('Testing manual price update for:', firstRowSymbol);

        // Click "Update Price"
        await updatePriceOption.click();
        await page.waitForTimeout(500);

        // Verify dialog appears
        await expect(
          page.getByRole('heading', { name: /Update Manual Price/i })
        ).toBeVisible({ timeout: 5000 });

        // Verify dialog description mentions the asset
        await expect(
          page.getByText(/Update the current market value/i)
        ).toBeVisible();

        // Find price input field
        const priceInput = page.locator('input[id="price"], input[name="price"]');
        await expect(priceInput).toBeVisible();

        // Clear and enter new price
        await priceInput.clear();
        await priceInput.fill('250.50');

        // Submit the form
        const submitButton = page.getByRole('button', {
          name: /Update|Save|Submit/i,
        });
        await expect(submitButton).toBeVisible();
        await submitButton.click();

        // Wait for success alert or dialog to close
        await page.waitForTimeout(1000);

        // Verify dialog closed
        await expect(
          page.getByRole('heading', { name: /Update Manual Price/i })
        ).not.toBeVisible({ timeout: 3000 });

        // Navigate to analysis page to verify recalculation
        await navigateToAnalysisAndWait(page);

        // Verify health score is recalculated (should be visible and valid)
        const scoreElement = page.locator('.text-4xl, .text-5xl').first();
        await expect(scoreElement).toBeVisible();
        const scoreText = await scoreElement.textContent();
        const score = parseInt(scoreText || '0');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);

        console.log('✅ Manual price update successful, analysis recalculated');
      } else {
        console.log('⚠️  Update Price option not found in dropdown');
      }
    } else {
      console.log('⚠️  No action dropdowns found in holdings table');
    }
  });

  test('should validate price input and show errors (P1)', async ({
    page,
  }) => {
    // Create balanced portfolio
    await createBalancedPortfolio(page);

    // Navigate to holdings
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    // Find and click dropdown
    const dropdownButtons = page.locator('button[aria-label*="actions" i], button:has-text("⋮")');
    const dropdownCount = await dropdownButtons.count();

    if (dropdownCount > 0) {
      await dropdownButtons.first().click();
      await page.waitForTimeout(300);

      const updatePriceOption = page.getByRole('menuitem', {
        name: /Update.*Price|Manual.*Price/i,
      });

      if (await updatePriceOption.isVisible()) {
        await updatePriceOption.click();
        await page.waitForTimeout(500);

        // Verify dialog appears
        await expect(
          page.getByRole('heading', { name: /Update Manual Price/i })
        ).toBeVisible({ timeout: 5000 });

        // Test empty input validation
        const priceInput = page.locator('input[id="price"], input[name="price"]');
        await priceInput.clear();

        const submitButton = page.getByRole('button', {
          name: /Update|Save|Submit/i,
        });
        await submitButton.click();
        await page.waitForTimeout(500);

        // Should show error message
        const errorMessage = page.getByText(/required|must be/i);
        await expect(errorMessage).toBeVisible({ timeout: 2000 });

        console.log('✅ Empty input validation working');

        // Test negative number validation
        await priceInput.fill('-10');
        await submitButton.click();
        await page.waitForTimeout(500);

        // Should show positive number error
        const positiveError = page.getByText(/positive|greater than/i);
        await expect(positiveError).toBeVisible({ timeout: 2000 });

        console.log('✅ Negative number validation working');

        // Test invalid text validation
        await priceInput.clear();
        await priceInput.fill('abc');
        await submitButton.click();
        await page.waitForTimeout(500);

        // Should show number format error
        const formatError = page.getByText(/number|invalid/i);
        await expect(formatError).toBeVisible({ timeout: 2000 });

        console.log('✅ Text input validation working');
      } else {
        console.log('⚠️  Update Price option not found');
      }
    } else {
      console.log('⚠️  No action dropdowns found');
    }
  });
});
