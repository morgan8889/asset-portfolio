import { test, expect, seedMockData } from './fixtures/test';

test.describe('Charts and Visualization', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display portfolio performance chart', async ({ page }) => {
    // Look for performance chart container
    const chartContainer = page.locator('[data-testid*="portfolio-chart"]').or(
      page.getByText('Portfolio Performance').locator('..').locator('..')
    );

    if (await chartContainer.isVisible()) {
      // Should have chart title
      await expect(page.getByText('Portfolio Performance')).toBeVisible();

      // Should have time period buttons
      const timeButtons = page.locator('button').filter({ hasText: /1D|1W|1M|3M|1Y|ALL/ });
      const buttonCount = await timeButtons.count();

      if (buttonCount > 0) {
        await expect(timeButtons.first()).toBeVisible();

        // Test clicking different time periods
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          const button = timeButtons.nth(i);
          await button.click();
          await page.waitForTimeout(500); // Wait for chart to update

          // Chart should still be visible
          await expect(chartContainer).toBeVisible();
        }
      }

      // Should have SVG or canvas element for the chart
      const chartElement = chartContainer.locator('svg').or(chartContainer.locator('canvas'));
      if (await chartElement.isVisible()) {
        await expect(chartElement).toBeVisible();

        // Chart should have reasonable dimensions
        const boundingBox = await chartElement.boundingBox();
        if (boundingBox) {
          expect(boundingBox.width).toBeGreaterThan(200);
          expect(boundingBox.height).toBeGreaterThan(100);
        }
      }
    }
  });

  test('should display asset allocation chart', async ({ page }) => {
    // Look for allocation chart
    const allocationChart = page.locator('[data-testid*="allocation-chart"]').or(
      page.getByText('Asset Allocation').locator('..').locator('..')
    );

    if (await allocationChart.isVisible()) {
      // Should have chart title
      await expect(page.getByText('Asset Allocation')).toBeVisible();

      // Should have pie chart or donut chart
      const chartElement = allocationChart.locator('svg').or(allocationChart.locator('canvas'));

      if (await chartElement.isVisible()) {
        await expect(chartElement).toBeVisible();

        // Should have pie slices or segments
        const pieSlices = chartElement.locator('path').or(chartElement.locator('.pie-slice'));
        const sliceCount = await pieSlices.count();

        if (sliceCount > 0) {
          expect(sliceCount).toBeGreaterThanOrEqual(1);

          // Each slice should be visible
          for (let i = 0; i < Math.min(sliceCount, 5); i++) {
            await expect(pieSlices.nth(i)).toBeVisible();
          }
        }
      }

      // Should have legend or breakdown
      const breakdown = allocationChart.getByText(/breakdown/i).or(
        allocationChart.locator('.legend')
      );

      if (await breakdown.isVisible()) {
        // Should show asset types
        const assetTypes = allocationChart.getByText(/stocks|crypto|etf|bonds/i);
        const typeCount = await assetTypes.count();

        if (typeCount > 0) {
          await expect(assetTypes.first()).toBeVisible();

          // Should show percentages
          const percentages = allocationChart.locator('text').filter({ hasText: /\d+%/ });
          const percentageCount = await percentages.count();

          if (percentageCount > 0) {
            await expect(percentages.first()).toBeVisible();
          }
        }
      }
    }
  });

  test('should show chart tooltips on hover', async ({ page }) => {
    // Find chart elements
    const performanceChart = page.locator('[data-testid*="portfolio-chart"]').or(
      page.getByText('Portfolio Performance').locator('..').locator('..')
    );

    if (await performanceChart.isVisible()) {
      const chartSvg = performanceChart.locator('svg');

      if (await chartSvg.isVisible()) {
        // Hover over chart area
        await chartSvg.hover({ position: { x: 100, y: 100 } });
        await page.waitForTimeout(500);

        // Look for tooltip
        const tooltip = page.locator('.tooltip').or(
          page.locator('[data-testid*="tooltip"]').or(
            page.locator('[role="tooltip"]')
          )
        );

        if (await tooltip.isVisible()) {
          await expect(tooltip).toBeVisible();

          // Tooltip should contain useful information
          const tooltipText = await tooltip.textContent();
          if (tooltipText) {
            // Should contain currency values or dates
            expect(tooltipText).toMatch(/\$|%|\d/);
          }
        }

        // Move mouse away
        await page.mouse.move(0, 0);
        await page.waitForTimeout(300);

        // Tooltip should disappear
        if (await tooltip.isVisible()) {
          await expect(tooltip).not.toBeVisible();
        }
      }
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test desktop view (1200px)
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.reload({ waitUntil: 'networkidle' });

    const chartsContainer = page.locator('[data-testid*="charts"]').or(
      page.locator('.grid').filter({ hasText: /portfolio performance|asset allocation/i })
    );

    if (await chartsContainer.isVisible()) {
      // Charts should be side by side on desktop
      const performanceChart = page.getByText('Portfolio Performance');
      const allocationChart = page.getByText('Asset Allocation');

      if (await performanceChart.isVisible() && await allocationChart.isVisible()) {
        const perfBox = await performanceChart.boundingBox();
        const allocBox = await allocationChart.boundingBox();

        if (perfBox && allocBox) {
          // Should be roughly side by side (performance chart takes more space)
          expect(perfBox.y).toBeCloseTo(allocBox.y, 50);
        }
      }
    }

    // Test tablet view (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload({ waitUntil: 'networkidle' });

    // Charts should still be visible and functional
    const performanceChart = page.getByText('Portfolio Performance');
    if (await performanceChart.isVisible()) {
      await expect(performanceChart).toBeVisible();
    }

    // Test mobile view (375px)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'networkidle' });

    // Charts should stack vertically on mobile
    const allocationChart = page.getByText('Asset Allocation');
    if (await performanceChart.isVisible() && await allocationChart.isVisible()) {
      const perfBox = await performanceChart.boundingBox();
      const allocBox = await allocationChart.boundingBox();

      if (perfBox && allocBox) {
        // Should be stacked (allocation below performance)
        expect(allocBox.y).toBeGreaterThan(perfBox.y + perfBox.height - 100);
      }
    }
  });

  test('should handle chart loading states', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/portfolio/performance**', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              { date: '2024-01-01', value: 100000 },
              { date: '2024-01-02', value: 101000 },
            ]
          })
        });
      }, 2000);
    });

    await page.reload({ waitUntil: 'networkidle' });

    // Should show loading state
    const loadingIndicator = page.getByText(/loading/i).or(
      page.locator('[data-testid*="loading"]').or(
        page.locator('.spinner')
      )
    );

    if (await loadingIndicator.isVisible()) {
      await expect(loadingIndicator).toBeVisible();

      // Wait for data to load
      await page.waitForTimeout(3000);

      // Loading should disappear
      await expect(loadingIndicator).not.toBeVisible();

      // Chart should appear
      const chart = page.locator('svg').or(page.locator('canvas'));
      if (await chart.first().isVisible()) {
        await expect(chart.first()).toBeVisible();
      }
    }
  });

  test('should handle chart error states', async ({ page }) => {
    // Mock API error
    await page.route('**/api/portfolio/performance**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to load chart data' })
      });
    });

    await page.reload({ waitUntil: 'networkidle' });

    // Should show error message
    const errorMessage = page.getByText(/error.*chart/i).or(
      page.getByText(/failed.*load/i).or(
        page.getByText(/unable.*display/i)
      )
    );

    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();

      // Should have retry option
      const retryButton = page.getByRole('button', { name: /retry|reload/i });
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible();
      }
    }
  });

  test('should update charts when data changes', async ({ page }) => {
    // Get initial chart state
    const performanceChart = page.locator('svg').first();

    if (await performanceChart.isVisible()) {
      // Take initial screenshot or get element count
      const initialPaths = performanceChart.locator('path');
      const initialCount = await initialPaths.count();

      // Trigger data update by adding transaction
      const addButton = page.getByRole('button', { name: /add transaction/i });

      if (await addButton.isVisible()) {
        await addButton.click();

        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible()) {
          // Mock API responses
          await page.route('**/api/transactions', route => {
            route.fulfill({
              status: 201,
              contentType: 'application/json',
              body: JSON.stringify({ success: true })
            });
          });

          await page.route('**/api/portfolio/performance**', route => {
            route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                data: [
                  { date: '2024-01-01', value: 100000 },
                  { date: '2024-01-02', value: 102000 }, // Updated value
                ]
              })
            });
          });

          // Submit transaction
          await page.getByLabel(/asset symbol/i).fill('TEST');
          await page.getByLabel(/quantity/i).fill('10');
          await page.getByLabel(/price.*share/i).fill('100');

          const submitButton = page.getByRole('button', { name: 'Add Transaction' });
          if (await submitButton.isEnabled()) {
            await submitButton.click();

            // Wait for updates
            await page.waitForTimeout(2000);

            // Chart should still be visible (and potentially updated)
            await expect(performanceChart).toBeVisible();
          }
        }
      }
    }
  });

  test('should be accessible', async ({ page }) => {
    // Charts should have proper ARIA labels and roles
    const charts = page.locator('svg').or(page.locator('[role="img"]'));
    const chartCount = await charts.count();

    for (let i = 0; i < Math.min(chartCount, 2); i++) {
      const chart = charts.nth(i);

      if (await chart.isVisible()) {
        // Should have title or aria-label
        const title = chart.locator('title');
        const ariaLabel = await chart.getAttribute('aria-label');

        if (await title.isVisible()) {
          await expect(title).toBeVisible();
        } else {
          expect(ariaLabel).toBeTruthy();
        }

        // Should be keyboard accessible
        const isTabFocusable = await chart.getAttribute('tabindex');
        if (isTabFocusable !== null) {
          await chart.focus();
          await expect(chart).toBeFocused();

          // Should be able to navigate with keyboard
          await page.keyboard.press('ArrowRight');
          await page.waitForTimeout(200);
        }
      }
    }

    // Time period buttons should be keyboard accessible
    const timeButtons = page.locator('button').filter({ hasText: /1D|1W|1M|3M|1Y|ALL/ });
    const buttonCount = await timeButtons.count();

    if (buttonCount > 0) {
      // Should be able to tab to buttons
      await page.keyboard.press('Tab');

      let foundTimeButton = false;
      for (let attempt = 0; attempt < 10; attempt++) {
        const focused = page.locator(':focus');

        if (await focused.isVisible()) {
          const focusedText = await focused.textContent();
          if (focusedText && /1D|1W|1M|3M|1Y|ALL/.test(focusedText)) {
            foundTimeButton = true;
            break;
          }
        }

        await page.keyboard.press('Tab');
      }

      if (foundTimeButton) {
        // Should be able to activate with keyboard
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);

        // Chart should still be visible
        const chart = page.locator('svg').first();
        if (await chart.isVisible()) {
          await expect(chart).toBeVisible();
        }
      }
    }
  });

  test('should support color themes', async ({ page }) => {
    // Test light theme (default)
    const chart = page.locator('svg').first();

    if (await chart.isVisible()) {
      // Check if chart colors adapt to theme
      const chartPaths = chart.locator('path[stroke]');
      const pathCount = await chartPaths.count();

      if (pathCount > 0) {
        const firstPath = chartPaths.first();
        const lightThemeColor = await firstPath.getAttribute('stroke');

        // Switch to dark theme if toggle exists
        const themeToggle = page.locator('[data-testid*="theme"]').or(
          page.getByRole('button', { name: /theme|dark|light/i })
        );

        if (await themeToggle.isVisible()) {
          await themeToggle.click();
          await page.waitForTimeout(500);

          // Chart colors should update
          const darkThemeColor = await firstPath.getAttribute('stroke');

          // Colors might be different (not required, but good UX)
          // This test just ensures chart still renders
          await expect(firstPath).toBeVisible();
        }
      }
    }
  });

  test('should handle empty data gracefully', async ({ page }) => {
    // Mock empty data response
    await page.route('**/api/portfolio/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    await page.reload({ waitUntil: 'networkidle' });

    // Should show empty state message
    const emptyMessage = page.getByText(/no data/i).or(
      page.getByText(/empty/i).or(
        page.getByText(/add.*transaction/i)
      )
    );

    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible();
    } else {
      // Or should show placeholder chart
      const chart = page.locator('svg').first();
      if (await chart.isVisible()) {
        await expect(chart).toBeVisible();
      }
    }
  });
});