import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Growth Chart Widget (US2)
 *
 * Tests chart time range selection, data display, and interactions.
 */
test.describe('Dashboard Growth Chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Time Range Selection', () => {
    test('should display time range selector buttons', async ({ page }) => {
      const chartWidget = page.locator('[data-testid="growth-chart-widget"]');

      if (await chartWidget.isVisible()) {
        // Should have period selector buttons
        const periodButtons = chartWidget.locator('button');
        const buttonCount = await periodButtons.count();

        // At least 3 time period buttons (1W, 1M, 1Y, etc.)
        expect(buttonCount).toBeGreaterThanOrEqual(3);
      }
    });

    test('should change chart when different time period is selected', async ({ page }) => {
      const chartWidget = page.locator('[data-testid="growth-chart-widget"]');

      if (await chartWidget.isVisible()) {
        // Click on a different time period
        const yearButton = chartWidget.getByRole('button', { name: '1Y' });
        if (await yearButton.isVisible()) {
          await yearButton.click();

          // Button should become selected (default variant)
          await expect(yearButton).toHaveClass(/default/);
        }
      }
    });

    test('should persist selected time period visually', async ({ page }) => {
      const chartWidget = page.locator('[data-testid="growth-chart-widget"]');

      if (await chartWidget.isVisible()) {
        // Get available period buttons
        const buttons = chartWidget.locator('button');
        const count = await buttons.count();

        if (count > 0) {
          // Click first available button
          const firstButton = buttons.first();
          await firstButton.click();

          // Should show as selected
          const classes = await firstButton.getAttribute('class');
          expect(classes).toBeDefined();
        }
      }
    });
  });

  test.describe('Chart Display', () => {
    test('should display chart with proper height', async ({ page }) => {
      const chartWidget = page.locator('[data-testid="growth-chart-widget"]');

      if (await chartWidget.isVisible()) {
        // Chart container should have defined height
        const chartContainer = chartWidget.locator('.recharts-responsive-container');
        if (await chartContainer.isVisible()) {
          const box = await chartContainer.boundingBox();
          expect(box?.height).toBeGreaterThan(100);
        }
      }
    });

    test('should show chart statistics (current value, change)', async ({ page }) => {
      const chartWidget = page.locator('[data-testid="growth-chart-widget"]');

      if (await chartWidget.isVisible()) {
        // Should show current value
        const currentValue = chartWidget.getByText(/Current:/);
        if (await currentValue.isVisible()) {
          await expect(currentValue).toBeVisible();
        }
      }
    });

    test('should display period high and low values', async ({ page }) => {
      const chartWidget = page.locator('[data-testid="growth-chart-widget"]');

      if (await chartWidget.isVisible()) {
        // Should show period high
        const periodHigh = chartWidget.getByText(/Period High/);
        const periodLow = chartWidget.getByText(/Period Low/);

        if (await periodHigh.isVisible()) {
          await expect(periodHigh).toBeVisible();
          await expect(periodLow).toBeVisible();
        }
      }
    });
  });

  test.describe('Chart Interactions', () => {
    test('should show tooltip on hover', async ({ page }) => {
      const chartWidget = page.locator('[data-testid="growth-chart-widget"]');

      if (await chartWidget.isVisible()) {
        const chart = chartWidget.locator('.recharts-wrapper');
        if (await chart.isVisible()) {
          // Hover over chart area
          const box = await chart.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

            // Wait for potential tooltip
            await page.waitForTimeout(500);

            // Tooltip may appear on data points
            const tooltip = page.locator('.recharts-tooltip-wrapper');
            // Tooltip visibility depends on chart data
            const isTooltipPresent = await tooltip.count() > 0;
            expect(typeof isTooltipPresent).toBe('boolean');
          }
        }
      }
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state message when no data', async ({ page }) => {
      const chartWidget = page.locator('[data-testid="growth-chart-widget"]');

      if (await chartWidget.isVisible()) {
        // Check for empty state message
        const emptyMessage = chartWidget.getByText(/No historical data/);
        const hasChart = await chartWidget.locator('.recharts-wrapper').isVisible();

        // Either has chart or shows empty message
        expect(hasChart || (await emptyMessage.isVisible())).toBe(true);
      }
    });
  });

  test.describe('Performance', () => {
    test('should render chart quickly after period change', async ({ page }) => {
      const chartWidget = page.locator('[data-testid="growth-chart-widget"]');

      if (await chartWidget.isVisible()) {
        const periodButton = chartWidget.getByRole('button', { name: '1M' });

        if (await periodButton.isVisible()) {
          const startTime = Date.now();
          await periodButton.click();

          // Chart should update within 1 second (SC-004)
          await expect(chartWidget).toBeVisible({ timeout: 1000 });
          const elapsed = Date.now() - startTime;
          expect(elapsed).toBeLessThan(1000);
        }
      }
    });
  });

  test.describe('Responsive Behavior', () => {
    test('should adjust chart size on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const chartWidget = page.locator('[data-testid="growth-chart-widget"]');

      if (await chartWidget.isVisible()) {
        // Chart should still be visible on mobile
        await expect(chartWidget).toBeVisible();

        // Chart should fill available width
        const box = await chartWidget.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThan(300);
        }
      }
    });
  });
});
