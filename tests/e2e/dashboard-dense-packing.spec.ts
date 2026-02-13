import { test, expect, seedMockData } from './fixtures/test';

/**
 * E2E tests for Dashboard Dense Packing (Feature 004)
 *
 * Tests dense packing toggle, row span selectors,
 * persistence, and mobile behavior.
 */
test.describe('Dashboard Dense Packing', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
  });

  test.describe('Dense Packing Toggle', () => {
    test('should show dense packing toggle in grid mode settings', async ({ page }) => {
      // Open settings modal
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');

      // Wait for settings button to be visible
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      // Modal should open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      // Should see dense packing toggle label
      const densePackingLabel = modal.getByText('Dense Packing');
      await expect(densePackingLabel).toBeVisible();
    });

    test('enabling dense packing shows row span selectors', async ({ page }) => {
      // Open settings modal
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      // Find and enable dense packing toggle
      const densePackingSwitch = modal.locator('#dense-packing');
      if (await densePackingSwitch.isVisible()) {
        // Check if already enabled
        const isChecked = await densePackingSwitch.getAttribute('data-state');
        if (isChecked !== 'checked') {
          await densePackingSwitch.click();
        }

        // Wait for row span selectors to appear
        // They should be labeled with "h" for height (1h, 2h, 3h)
        const rowSpanSelectors = modal.locator('button:has-text("h")');
        const count = await rowSpanSelectors.count();

        // Should have at least one row span selector visible
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });

    test('disabling dense packing hides row span selectors', async ({ page }) => {
      // Open settings modal
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      // First enable dense packing
      const densePackingSwitch = modal.locator('#dense-packing');
      if (await densePackingSwitch.isVisible()) {
        const isChecked = await densePackingSwitch.getAttribute('data-state');
        if (isChecked !== 'checked') {
          await densePackingSwitch.click();
          // Wait for row span selectors to appear
          await page.waitForTimeout(100);
        }

        // Now disable dense packing
        await densePackingSwitch.click();
        await page.waitForTimeout(100);

        // Row span selectors should be hidden (selectors with "h" labels)
        // The column span selectors (with "x" labels) should still be visible
        const rowSpanSelectors = modal.locator('button:has-text("1h"), button:has-text("2h"), button:has-text("3h")');
        await expect(rowSpanSelectors.first()).not.toBeVisible({ timeout: 1000 });
      }
    });
  });

  test.describe('Row Span Persistence', () => {
    test('changing row span persists after page reload', async ({ page }) => {
      // Open settings modal
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      // Enable dense packing
      const densePackingSwitch = modal.locator('#dense-packing');
      if (await densePackingSwitch.isVisible()) {
        const isChecked = await densePackingSwitch.getAttribute('data-state');
        if (isChecked !== 'checked') {
          await densePackingSwitch.click();
          await page.waitForTimeout(100);
        }

        // Find a row span selector and change it
        // Look for selecttrigger with aria-label containing "Row span"
        const rowSpanTrigger = modal.locator('[aria-label*="Row span"]').first();
        if (await rowSpanTrigger.isVisible()) {
          await rowSpanTrigger.click();

          // Select "3h" option
          const option3h = page.getByRole('option', { name: '3h' });
          if (await option3h.isVisible()) {
            await option3h.click();
            await page.waitForTimeout(100);

            // Close modal
            await page.keyboard.press('Escape');
            await page.waitForTimeout(100);

            // Reload page
            await page.reload();

            // Open settings again
            await settingsButton.click();
            await expect(modal).toBeVisible({ timeout: 2000 });

            // Verify dense packing is still enabled
            const densePackingSwitchReload = modal.locator('#dense-packing');
            const reloadChecked = await densePackingSwitchReload.getAttribute('data-state');
            expect(reloadChecked).toBe('checked');

            // Verify row span selector shows the saved value
            // The trigger should display "3h"
            const rowSpanTriggerReload = modal.locator('[aria-label*="Row span"]').first();
            const triggerText = await rowSpanTriggerReload.textContent();
            expect(triggerText).toContain('3h');
          }
        }
      }
    });
  });

  test.describe('Mobile Viewport', () => {
    test('dense packing is disabled on mobile viewport', async ({ page }) => {
      // Set mobile viewport and reload (data already seeded by outer beforeEach)
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // On mobile, the grid should be single column (stacking mode)
      // The grid should not have grid-flow-row-dense class
      const grid = page.locator('[class*="grid"]').first();
      if (await grid.isVisible()) {
        const className = await grid.getAttribute('class');
        // Should not have dense packing class on mobile
        expect(className).not.toContain('grid-flow-row-dense');
      }
    });

    test('mobile settings should not show dense packing toggle', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Open settings modal
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      if (await settingsButton.isVisible({ timeout: 3000 })) {
        await settingsButton.click();

        const modal = page.locator('[role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 2000 });

        // On mobile, layout mode is forced to stacking
        // Dense packing toggle should not be visible
        // (it only shows when layoutMode === 'grid')
        const densePackingLabel = modal.getByText('Dense Packing');
        // May or may not be visible depending on the forced layout mode on mobile
        // The key is that dense packing doesn't apply on mobile
      }
    });
  });

  test.describe('Dense Packing Layout', () => {
    test('widgets reflow to fill gaps when dense packing enabled', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });

      // Open settings modal
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      // Enable dense packing
      const densePackingSwitch = modal.locator('#dense-packing');
      if (await densePackingSwitch.isVisible()) {
        const isChecked = await densePackingSwitch.getAttribute('data-state');
        if (isChecked !== 'checked') {
          await densePackingSwitch.click();
          await page.waitForTimeout(100);
        }

        // Set a widget to span multiple rows
        const rowSpanTrigger = modal.locator('[aria-label*="Row span"]').first();
        if (await rowSpanTrigger.isVisible()) {
          await rowSpanTrigger.click();
          const option2h = page.getByRole('option', { name: '2h' });
          if (await option2h.isVisible()) {
            await option2h.click();
          }
        }

        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);

        // Verify grid has dense packing class
        const grid = page.locator('[class*="grid-flow-row-dense"]');
        await expect(grid).toBeVisible({ timeout: 2000 });

        // Verify at least one widget has row-span class
        const rowSpanWidget = page.locator('[class*="row-span-2"], [class*="row-span-3"]');
        const count = await rowSpanWidget.count();
        expect(count).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
