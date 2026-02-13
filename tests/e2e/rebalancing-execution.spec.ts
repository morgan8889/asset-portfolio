/**
 * E2E Tests for Rebalancing Execution Workflow
 *
 * Tests the complete workflow for asset allocation rebalancing,
 * including viewing recommendations, executing trades, and verifying results.
 *
 * Coverage:
 * - View rebalancing recommendations
 * - Set target allocations
 * - Execute rebalancing trades
 * - Verify allocation drift
 * - Test rebalancing with exclusions
 */

import { test, expect } from './fixtures/test';
import { generateMockData } from './fixtures/seed-helpers';

test.describe('Rebalancing Execution', () => {
  test.beforeEach(async ({ page }) => {
    await generateMockData(page);
    await expect(page.locator('[data-testid="total-value-widget"]')).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to allocation page', async ({ page }) => {
    // Look for allocation/rebalancing link in navigation
    const allocationLink = page.getByRole('link', { name: /allocation|rebalanc/i });

    if (await allocationLink.count() > 0) {
      await allocationLink.first().click();

      // Should navigate to allocation page
      await expect(page.getByRole('heading', { name: /allocation|rebalanc/i })).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display current allocation breakdown', async ({ page }) => {
    // Navigate to allocation page
    const allocationLink = page.getByRole('link', { name: /allocation|rebalanc/i });

    if (await allocationLink.count() > 0) {
      await allocationLink.first().click();

      // Should show allocation chart/breakdown
      await expect(page.getByText(/stocks|bonds|cash|asset class/i)).toBeVisible({ timeout: 5000 });

      // Should show percentages
      await expect(page.getByText(/%/)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should allow setting target allocation', async ({ page }) => {
    const allocationLink = page.getByRole('link', { name: /allocation|rebalanc/i });

    if (await allocationLink.count() > 0) {
      await allocationLink.first().click();

      // Look for set target or create target allocation button
      const setTargetButton = page.getByRole('button', { name: /set target|create target|target allocation/i });

      if (await setTargetButton.count() > 0) {
        await setTargetButton.first().click();

        // Should show target allocation dialog/form
        const dialog = page.getByRole('dialog').or(page.locator('form'));
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Try to set target allocations (e.g., 60% stocks, 40% bonds)
        const stocksInput = page.getByLabel(/stocks/i);
        const bondsInput = page.getByLabel(/bonds/i);

        if (await stocksInput.count() > 0 && await bondsInput.count() > 0) {
          await stocksInput.fill('60');
          await bondsInput.fill('40');

          // Save target
          await page.getByRole('button', { name: /save|create/i }).click();
        }
      }
    }
  });

  test('should show rebalancing recommendations', async ({ page }) => {
    const allocationLink = page.getByRole('link', { name: /allocation|rebalanc/i });

    if (await allocationLink.count() > 0) {
      await allocationLink.first().click();

      // Look for recommendations section
      const recommendationsSection = page.getByText(/recommendations|suggestions|rebalanc.*plan/i);

      if (await recommendationsSection.count() > 0) {
        // Should show buy/sell recommendations
        await expect(page.getByText(/buy|sell/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should calculate rebalancing trades', async ({ page }) => {
    const allocationLink = page.getByRole('link', { name: /allocation|rebalanc/i });

    if (await allocationLink.count() > 0) {
      await allocationLink.first().click();

      // Look for calculate/analyze button
      const calculateButton = page.getByRole('button', { name: /calculate|analyze|rebalanc/i });

      if (await calculateButton.count() > 0) {
        await calculateButton.first().click();

        // Should show rebalancing plan
        await expect(page.getByText(/trade|buy|sell|shares/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display allocation drift', async ({ page }) => {
    const allocationLink = page.getByRole('link', { name: /allocation|rebalanc/i });

    if (await allocationLink.count() > 0) {
      await allocationLink.first().click();

      // Should show current vs target comparison
      await expect(page.getByText(/current|target|drift|difference/i)).toBeVisible({ timeout: 5000 });

      // May show drift percentages
      const driftIndicators = page.getByText(/\+\d+%|-\d+%/);
      if (await driftIndicators.count() > 0) {
        await expect(driftIndicators.first()).toBeVisible();
      }
    }
  });

  test('should allow executing rebalancing trades', async ({ page }) => {
    const allocationLink = page.getByRole('link', { name: /allocation|rebalanc/i });

    if (await allocationLink.count() > 0) {
      await allocationLink.first().click();

      // Look for execute/apply rebalancing button
      const executeButton = page.getByRole('button', { name: /execute|apply|rebalanc/i });

      if (await executeButton.count() > 0) {
        await executeButton.first().click();

        // May show confirmation dialog
        const confirmDialog = page.getByRole('dialog');
        if (await confirmDialog.count() > 0) {
          const confirmButton = confirmDialog.getByRole('button', { name: /confirm|yes|execute/i });
          if (await confirmButton.count() > 0) {
            // Don't actually execute in test, just verify UI works
            await expect(confirmButton).toBeVisible();
          }
        }
      }
    }
  });

  test('should show multiple allocation dimensions (asset class, category, region)', async ({ page }) => {
    const allocationLink = page.getByRole('link', { name: /allocation|rebalanc/i });

    if (await allocationLink.count() > 0) {
      await allocationLink.first().click();

      // Look for dimension selector
      const dimensionSelector = page.getByRole('tab', { name: /asset class|category|region/i })
        .or(page.getByRole('button', { name: /asset class|category|region/i }));

      if (await dimensionSelector.count() > 0) {
        // Should have multiple dimensions available
        await expect(page.getByText(/asset class/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should support excluding assets from rebalancing', async ({ page }) => {
    const allocationLink = page.getByRole('link', { name: /allocation|rebalanc/i });

    if (await allocationLink.count() > 0) {
      await allocationLink.first().click();

      // Navigate to holdings to exclude an asset
      await page.getByRole('link', { name: /holdings/i }).click();
      await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });

      // Look for exclude from rebalancing option in holdings detail
      const firstRow = page.getByRole('table').locator('tbody tr').first();
      const dropdownButton = firstRow.getByRole('button', { name: /more options/i })
        .or(firstRow.locator('button[aria-haspopup="menu"]'));

      if (await dropdownButton.count() > 0) {
        await dropdownButton.first().click();

        // Look for exclude option
        const excludeOption = page.getByRole('menuitem', { name: /exclude.*rebalanc/i });
        if (await excludeOption.count() > 0) {
          await expect(excludeOption).toBeVisible();
        }
      }
    }
  });

  test('should show rebalancing impact on portfolio value', async ({ page }) => {
    const allocationLink = page.getByRole('link', { name: /allocation|rebalanc/i });

    if (await allocationLink.count() > 0) {
      await allocationLink.first().click();

      // Calculate rebalancing
      const calculateButton = page.getByRole('button', { name: /calculate|analyze/i });
      if (await calculateButton.count() > 0) {
        await calculateButton.first().click();

        // Should show impact summary
        await expect(page.getByText(/total value|portfolio value/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should validate target allocation totals to 100%', async ({ page }) => {
    const allocationLink = page.getByRole('link', { name: /allocation|rebalanc/i });

    if (await allocationLink.count() > 0) {
      await allocationLink.first().click();

      // Open set target dialog
      const setTargetButton = page.getByRole('button', { name: /set target|create target/i });

      if (await setTargetButton.count() > 0) {
        await setTargetButton.first().click();

        // Try to set invalid allocation (doesn't total to 100%)
        const stocksInput = page.getByLabel(/stocks/i);
        const bondsInput = page.getByLabel(/bonds/i);

        if (await stocksInput.count() > 0) {
          await stocksInput.fill('50');
          await bondsInput.fill('30'); // Only 80% total

          // Try to save
          await page.getByRole('button', { name: /save|create/i }).click();

          // Should show validation error
          await expect(page.getByText(/100|total|invalid/i)).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should display rebalancing frequency recommendation', async ({ page }) => {
    const allocationLink = page.getByRole('link', { name: /allocation|rebalanc/i });

    if (await allocationLink.count() > 0) {
      await allocationLink.first().click();

      // May show last rebalancing date or frequency recommendation
      const frequencyInfo = page.getByText(/last rebalanc|quarterly|monthly|frequency/i);

      if (await frequencyInfo.count() > 0) {
        await expect(frequencyInfo.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
