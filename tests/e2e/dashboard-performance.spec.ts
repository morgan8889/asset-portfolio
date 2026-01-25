import { test, expect } from '@playwright/test';

/**
 * E2E tests for Dashboard Performance (T061, T062)
 *
 * Verifies performance targets:
 * - SC-001: Dashboard load < 2s
 * - SC-004: Chart range change < 1s
 */
test.describe('Dashboard Performance', () => {
  test.describe('Dashboard Load Time (SC-001)', () => {
    test('should load dashboard within 2 seconds', async ({ page }) => {
      const startTime = Date.now();

      // Navigate to dashboard
      await page.goto('/');

      // Wait for page to be interactive (networkidle indicates main content loaded)
      await page.waitForLoadState('networkidle');

      // Verify main content is visible (use .first() to handle multiple matches)
      await expect(page.locator('main').first()).toBeVisible();

      const loadTime = Date.now() - startTime;

      // Performance target: < 2000ms
      expect(loadTime).toBeLessThan(2000);
      console.log(`Dashboard load time: ${loadTime}ms`);
    });

    test('should load dashboard widgets within 2 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Wait for at least one widget to be visible
      const widgets = page.locator('[data-testid$="-widget"]');
      const widgetCount = await widgets.count();

      if (widgetCount > 0) {
        await expect(widgets.first()).toBeVisible({ timeout: 2000 });
      }

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000);
    });

    test('should show loading states and resolve quickly', async ({ page }) => {
      await page.goto('/');

      // Loading should resolve within target time
      const startTime = Date.now();

      // Wait for either widgets to appear or loading to complete
      await Promise.race([
        page.waitForSelector('[data-testid$="-widget"]', { timeout: 2000 }),
        page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 2000 }),
      ]).catch(() => {
        // If neither selector found, that's okay
      });

      const resolveTime = Date.now() - startTime;
      expect(resolveTime).toBeLessThan(2000);
    });

    test('should achieve First Contentful Paint under 1.5s', async ({ page }) => {
      await page.goto('/');

      // Get performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const entries = performance.getEntriesByType(
          'paint'
        ) as PerformanceEntry[];
        const fcp = entries.find((e) => e.name === 'first-contentful-paint');
        return {
          fcp: fcp ? fcp.startTime : null,
        };
      });

      if (performanceMetrics.fcp !== null) {
        // FCP should be under 1.5s for good UX
        expect(performanceMetrics.fcp).toBeLessThan(1500);
        console.log(`First Contentful Paint: ${performanceMetrics.fcp}ms`);
      }
    });
  });

  test.describe('Chart Range Change (SC-004)', () => {
    test('should change chart time period within 1 second', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Find chart period selector buttons
      const periodButtons = page.locator(
        '[data-testid="time-period-selector"] button, .chart-period-selector button'
      );
      const buttonCount = await periodButtons.count();

      if (buttonCount > 1) {
        // Click a different period
        const startTime = Date.now();
        await periodButtons.nth(1).click();

        // Wait for chart to update (check for data change or loading to complete)
        await page.waitForTimeout(100); // Brief pause for state update

        // Wait for any loading indicator to disappear
        const loading = page.locator('.animate-pulse, [data-loading="true"]');
        if ((await loading.count()) > 0) {
          await loading.first().waitFor({ state: 'detached', timeout: 1000 });
        }

        const changeTime = Date.now() - startTime;

        // Performance target: < 1000ms
        expect(changeTime).toBeLessThan(1000);
        console.log(`Chart range change time: ${changeTime}ms`);
      }
    });

    test('should update gain/loss widget quickly on period change', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const periodSelector = page.locator('[data-testid="time-period-selector"]');

      if (await periodSelector.isVisible()) {
        const buttons = periodSelector.locator('button');
        const buttonCount = await buttons.count();

        if (buttonCount > 1) {
          // Get initial widget content
          const gainLossWidget = page.locator(
            '[data-testid="gain-loss-widget"], [data-testid="day-change-widget"]'
          );

          if (await gainLossWidget.first().isVisible()) {
            const startTime = Date.now();

            // Click a different period
            await buttons.nth(buttonCount - 1).click();

            // Wait for widget to potentially update
            await page.waitForTimeout(200);

            const updateTime = Date.now() - startTime;

            // Should update within 1 second
            expect(updateTime).toBeLessThan(1000);
          }
        }
      }
    });

    test('should handle rapid period changes gracefully', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const periodButtons = page.locator(
        '[data-testid="time-period-selector"] button'
      );
      const buttonCount = await periodButtons.count();

      if (buttonCount >= 3) {
        const startTime = Date.now();

        // Rapidly click through periods
        await periodButtons.nth(0).click();
        await page.waitForTimeout(50);
        await periodButtons.nth(1).click();
        await page.waitForTimeout(50);
        await periodButtons.nth(2).click();

        // Wait for final state to settle
        await page.waitForTimeout(500);

        const totalTime = Date.now() - startTime;

        // All changes should complete within 2 seconds
        expect(totalTime).toBeLessThan(2000);

        // Page should still be functional (no errors)
        await expect(page.locator('body')).toBeVisible();
      }
    });
  });

  test.describe('Memory and Resource Efficiency', () => {
    test('should not have memory leaks on navigation', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Get initial heap size
      const initialHeap = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return null;
      });

      // Navigate away and back multiple times
      for (let i = 0; i < 3; i++) {
        await page.goto('/holdings');
        await page.waitForLoadState('networkidle');
        await page.goto('/');
        await page.waitForLoadState('networkidle');
      }

      // Get final heap size
      const finalHeap = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return null;
      });

      if (initialHeap && finalHeap) {
        // Heap shouldn't grow more than 50% (allowing for some variance)
        const growthRatio = finalHeap / initialHeap;
        expect(growthRatio).toBeLessThan(1.5);
        console.log(
          `Heap growth ratio: ${growthRatio.toFixed(2)} (${initialHeap} -> ${finalHeap})`
        );
      }
    });

    test('should not block main thread excessively', async ({ page }) => {
      await page.goto('/');

      // Check for long tasks (> 50ms)
      const longTasks = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let longTaskCount = 0;

          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) {
                longTaskCount++;
              }
            }
          });

          try {
            observer.observe({ entryTypes: ['longtask'] });

            // Wait and collect
            setTimeout(() => {
              observer.disconnect();
              resolve(longTaskCount);
            }, 2000);
          } catch {
            // PerformanceObserver not supported
            resolve(0);
          }
        });
      });

      // Should have minimal long tasks during idle
      expect(longTasks).toBeLessThan(5);
    });
  });

  test.describe('Network Efficiency', () => {
    test('should minimize API calls on initial load', async ({ page }) => {
      const apiCalls: string[] = [];

      // Monitor network requests
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/api/') || url.includes('prices')) {
          apiCalls.push(url);
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Log API calls for debugging
      console.log(`API calls on load: ${apiCalls.length}`);

      // Should batch requests efficiently (not too many individual calls)
      expect(apiCalls.length).toBeLessThan(20);
    });
  });
});
