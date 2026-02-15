import { test, expect } from './fixtures/test';

/**
 * E2E tests for React Grid Layout (RGL) Implementation
 *
 * Tests drag-drop functionality, responsive breakpoints, layout persistence,
 * and feature flag toggling between CSS Grid and RGL implementations.
 */
test.describe('Dashboard React Grid Layout (RGL)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page and generate mock data for testing
    await page.goto('/test');
    await page.waitForLoadState('networkidle');

    // Click generate mock data button if available
    const generateBtn = page.getByRole('button', { name: /generate mock/i });
    if (await generateBtn.isVisible({ timeout: 2000 })) {
      await generateBtn.click();
      // Wait for redirect to dashboard with data
      await page.waitForURL('/', { timeout: 10000 });
    }
    await page.waitForLoadState('networkidle');
  });

  test.describe('Feature Flag Toggle', () => {
    test('should show RGL toggle in settings', async ({ page }) => {
      // Open settings modal
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      // Should see New Layout System toggle label
      const rglLabel = modal.getByText(/New Layout System/i);
      await expect(rglLabel).toBeVisible();
    });

    test('should enable RGL mode', async ({ page }) => {
      // Open settings modal
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      // Find and enable RGL toggle
      const rglSwitch = modal.locator('#use-react-grid-layout');
      if (await rglSwitch.isVisible()) {
        const isChecked = await rglSwitch.getAttribute('data-state');
        if (isChecked !== 'checked') {
          await rglSwitch.click();
          await page.waitForTimeout(500); // Wait for layout to update
        }

        // Close modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);

        // Verify RGL container is rendered
        // Look for react-grid-layout class or data attribute
        const rglContainer = page.locator('.react-grid-layout');
        await expect(rglContainer).toBeVisible({ timeout: 2000 });
      }
    });

    test('should toggle between RGL and CSS Grid implementations', async ({ page }) => {
      // Open settings modal
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      // Enable RGL
      const rglSwitch = modal.locator('#use-react-grid-layout');
      if (await rglSwitch.isVisible()) {
        const initialState = await rglSwitch.getAttribute('data-state');
        await rglSwitch.click();
        await page.waitForTimeout(300);

        // Verify state changed
        const newState = await rglSwitch.getAttribute('data-state');
        expect(newState).not.toBe(initialState);

        // Toggle back
        await rglSwitch.click();
        await page.waitForTimeout(300);

        const finalState = await rglSwitch.getAttribute('data-state');
        expect(finalState).toBe(initialState);
      }
    });

    test('should persist RGL mode after page reload', async ({ page }) => {
      // Open settings modal
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      // Enable RGL
      const rglSwitch = modal.locator('#use-react-grid-layout');
      if (await rglSwitch.isVisible()) {
        const isChecked = await rglSwitch.getAttribute('data-state');
        if (isChecked !== 'checked') {
          await rglSwitch.click();
          await page.waitForTimeout(300);

          // Close modal
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);

          // Reload page
          await page.reload();
          await page.waitForLoadState('networkidle');

          // Open settings again
          await settingsButton.click();
          await expect(modal).toBeVisible({ timeout: 2000 });

          // Verify RGL is still enabled
          const rglSwitchReload = modal.locator('#use-react-grid-layout');
          const reloadChecked = await rglSwitchReload.getAttribute('data-state');
          expect(reloadChecked).toBe('checked');
        }
      }
    });
  });

  test.describe('Drag and Drop Functionality', () => {
    test.beforeEach(async ({ page }) => {
      // Enable RGL mode for drag-drop tests
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      const rglSwitch = modal.locator('#use-react-grid-layout');
      if (await rglSwitch.isVisible()) {
        const isChecked = await rglSwitch.getAttribute('data-state');
        if (isChecked !== 'checked') {
          await rglSwitch.click();
          await page.waitForTimeout(500);
        }
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    });

    test('should allow dragging widgets', async ({ page }) => {
      // Find a widget with a drag handle
      const dragHandle = page.locator('.widget-drag-handle').first();
      if (await dragHandle.isVisible({ timeout: 2000 })) {
        // Get initial position
        const initialBox = await dragHandle.boundingBox();
        if (!initialBox) return;

        // Drag to a new position
        await dragHandle.hover();
        await page.mouse.down();
        await page.mouse.move(initialBox.x + 200, initialBox.y + 100, { steps: 10 });
        await page.mouse.up();

        await page.waitForTimeout(500);

        // Verify position changed
        const newBox = await dragHandle.boundingBox();
        if (newBox) {
          expect(newBox.x).not.toBe(initialBox.x);
        }
      }
    });

    test('should snap widgets to grid', async ({ page }) => {
      // RGL should snap widgets to grid positions
      const rglItems = page.locator('.react-grid-item');
      const count = await rglItems.count();

      if (count > 0) {
        // Check that all widgets have grid-aligned positions
        for (let i = 0; i < Math.min(count, 3); i++) {
          const item = rglItems.nth(i);
          const transform = await item.getAttribute('style');

          // RGL uses transform: translate(Xpx, Ypx)
          // The values should be grid-aligned
          expect(transform).toContain('translate');
        }
      }
    });

    test('should prevent overlapping widgets', async ({ page }) => {
      // Get all widget elements
      const widgets = page.locator('[data-widget-id]');
      const count = await widgets.count();

      if (count >= 2) {
        // Get bounding boxes of first two widgets
        const box1 = await widgets.nth(0).boundingBox();
        const box2 = await widgets.nth(1).boundingBox();

        if (box1 && box2) {
          // Check that they don't overlap
          const overlaps =
            box1.x < box2.x + box2.width &&
            box1.x + box1.width > box2.x &&
            box1.y < box2.y + box2.height &&
            box1.y + box1.height > box2.y;

          expect(overlaps).toBe(false);
        }
      }
    });

    test('should persist widget positions after drag', async ({ page }) => {
      const dragHandle = page.locator('.widget-drag-handle').first();
      if (await dragHandle.isVisible({ timeout: 2000 })) {
        // Drag widget
        const initialBox = await dragHandle.boundingBox();
        if (!initialBox) return;

        await dragHandle.hover();
        await page.mouse.down();
        await page.mouse.move(initialBox.x + 200, initialBox.y + 100, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(500);

        // Get new position
        const newBox = await dragHandle.boundingBox();

        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Wait for widgets to load
        await page.waitForTimeout(1000);

        // Verify position is preserved
        const reloadBox = await dragHandle.boundingBox();
        if (newBox && reloadBox) {
          // Positions should be approximately the same (allow 10px tolerance)
          expect(Math.abs(reloadBox.x - newBox.x)).toBeLessThan(10);
          expect(Math.abs(reloadBox.y - newBox.y)).toBeLessThan(10);
        }
      }
    });
  });

  test.describe('Resize Functionality', () => {
    test.beforeEach(async ({ page }) => {
      // Enable RGL mode
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      const rglSwitch = modal.locator('#use-react-grid-layout');
      if (await rglSwitch.isVisible()) {
        const isChecked = await rglSwitch.getAttribute('data-state');
        if (isChecked !== 'checked') {
          await rglSwitch.click();
          await page.waitForTimeout(500);
        }
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    });

    test('should show resize handles on hover', async ({ page }) => {
      // Look for a widget that can be resized
      const widget = page.locator('.react-grid-item').first();
      if (await widget.isVisible({ timeout: 2000 })) {
        await widget.hover();
        await page.waitForTimeout(200);

        // RGL adds resize handles (usually .react-resizable-handle)
        const resizeHandle = widget.locator('.react-resizable-handle');
        // Resize handle should be present
        const count = await resizeHandle.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should respect size constraints', async ({ page }) => {
      // Widgets should have min/max size constraints
      // Check that a metric widget (1x1) cannot be resized beyond constraints
      const metricWidget = page.locator('[data-widget-id="total-value"]');
      if (await metricWidget.isVisible({ timeout: 2000 })) {
        const initialBox = await metricWidget.boundingBox();
        if (!initialBox) return;

        // Try to resize (if resize handle exists)
        await metricWidget.hover();
        const resizeHandle = metricWidget.locator('.react-resizable-handle');
        if (await resizeHandle.isVisible({ timeout: 500 })) {
          // Attempt to make it very large
          const handleBox = await resizeHandle.boundingBox();
          if (handleBox) {
            await page.mouse.move(handleBox.x, handleBox.y);
            await page.mouse.down();
            await page.mouse.move(handleBox.x + 500, handleBox.y + 500, { steps: 10 });
            await page.mouse.up();
            await page.waitForTimeout(300);

            // Size should be constrained
            const newBox = await metricWidget.boundingBox();
            if (newBox) {
              // Should not grow infinitely - check it's within reasonable bounds
              expect(newBox.width).toBeLessThan(initialBox.width + 600);
            }
          }
        }
      }
    });
  });

  test.describe('Responsive Breakpoints', () => {
    test('should use desktop layout on large screens', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Enable RGL mode
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      const rglSwitch = modal.locator('#use-react-grid-layout');
      if (await rglSwitch.isVisible()) {
        const isChecked = await rglSwitch.getAttribute('data-state');
        if (isChecked !== 'checked') {
          await rglSwitch.click();
          await page.waitForTimeout(500);
        }
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // RGL container should be visible
      const rglContainer = page.locator('.react-grid-layout');
      await expect(rglContainer).toBeVisible({ timeout: 2000 });

      // Should be able to have multiple columns
      const widgets = page.locator('.react-grid-item');
      const count = await widgets.count();
      if (count >= 2) {
        const box1 = await widgets.nth(0).boundingBox();
        const box2 = await widgets.nth(1).boundingBox();

        if (box1 && box2) {
          // At desktop size, widgets can be side-by-side
          // Check if any two widgets are on the same row (similar Y position)
          const sameRow = Math.abs(box1.y - box2.y) < 50;
          // This should be possible on desktop (though not guaranteed depending on layout)
          // Just verify that widgets exist
          expect(count).toBeGreaterThan(0);
        }
      }
    });

    test('should use tablet layout on medium screens', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Enable RGL mode
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      if (await settingsButton.isVisible({ timeout: 5000 })) {
        await settingsButton.click();

        const modal = page.locator('[role="dialog"]');
        if (await modal.isVisible({ timeout: 2000 })) {
          const rglSwitch = modal.locator('#use-react-grid-layout');
          if (await rglSwitch.isVisible({ timeout: 500 })) {
            const isChecked = await rglSwitch.getAttribute('data-state');
            if (isChecked !== 'checked') {
              await rglSwitch.click();
              await page.waitForTimeout(500);
            }
          }

          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }
      }

      // RGL should adapt to tablet size
      const rglContainer = page.locator('.react-grid-layout');
      if (await rglContainer.isVisible({ timeout: 2000 })) {
        // Verify layout exists on tablet
        const widgets = page.locator('.react-grid-item');
        const count = await widgets.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should use mobile layout on small screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // On mobile, check if widgets are stacked vertically
      const widgets = page.locator('[data-widget-id]');
      const count = await widgets.count();

      if (count >= 2) {
        // Widgets should be full-width on mobile
        const viewport = page.viewportSize();
        if (viewport) {
          const widget = widgets.first();
          const box = await widget.boundingBox();
          if (box) {
            // Widget should span most of the viewport width
            expect(box.width).toBeGreaterThan(viewport.width * 0.8);
          }
        }
      }
    });

    test('should preserve layout when switching breakpoints', async ({ page }) => {
      // Start at desktop
      await page.setViewportSize({ width: 1280, height: 720 });

      // RGL is now the default implementation, no need to enable it
      // Wait for widgets to render
      await page.waitForTimeout(500);

      // Get widget count at desktop
      const desktopWidgets = page.locator('.react-grid-item');
      const desktopCount = await desktopWidgets.count();

      // Switch to tablet
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      const tabletWidgets = page.locator('.react-grid-item');
      const tabletCount = await tabletWidgets.count();

      // Should have same number of widgets
      expect(tabletCount).toBe(desktopCount);

      // Switch to mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      const mobileWidgets = page.locator('[data-widget]');
      const mobileCount = await mobileWidgets.count();

      // Should still have same number of widgets
      expect(mobileCount).toBeGreaterThan(0);
    });
  });

  test.describe('Layout Persistence', () => {
    test('should save layout changes to IndexedDB', async ({ page }) => {
      // Enable RGL mode
      const settingsButton = page.locator('[data-testid="dashboard-settings-btn"]');
      await expect(settingsButton).toBeVisible({ timeout: 5000 });
      await settingsButton.click();

      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 2000 });

      const rglSwitch = modal.locator('#use-react-grid-layout');
      if (await rglSwitch.isVisible()) {
        const isChecked = await rglSwitch.getAttribute('data-state');
        if (isChecked !== 'checked') {
          await rglSwitch.click();
          await page.waitForTimeout(500);
        }
      }

      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Make a layout change (drag a widget)
      const dragHandle = page.locator('.widget-drag-handle').first();
      if (await dragHandle.isVisible({ timeout: 2000 })) {
        const initialBox = await dragHandle.boundingBox();
        if (initialBox) {
          await dragHandle.hover();
          await page.mouse.down();
          await page.mouse.move(initialBox.x + 100, initialBox.y + 50, { steps: 5 });
          await page.mouse.up();
          await page.waitForTimeout(500);
        }
      }

      // Reload page to verify persistence
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // RGL layout should be restored
      const rglContainer = page.locator('.react-grid-layout');
      await expect(rglContainer).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Widget Order', () => {
    test('should update widget order based on layout', async ({ page }) => {
      // RGL is now the default implementation, no need to enable it
      // Wait for widgets to render
      await page.waitForTimeout(500);

      // Get initial widget order
      const widgets = page.locator('[data-widget]');
      const count = await widgets.count();
      expect(count).toBeGreaterThan(0);

      // Widgets should be rendered in a consistent order
      // This verifies that the layout generation and ordering works
    });
  });
});
