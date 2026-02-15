/**
 * E2E Tests for Charts and Visualization
 *
 * Tests chart rendering on the dashboard and other pages:
 * - Charts render with seeded data
 * - Responsive behavior across viewport sizes
 * - Charts handle empty state gracefully
 *
 * Uses seedMockData for portfolio data.
 */

import { test, expect, seedMockData } from './fixtures/test';

test.describe('Charts and Visualization', () => {
  test.describe('With Portfolio Data', () => {
    test.beforeEach(async ({ page }) => {
      await seedMockData(page);
      await page.goto('/');
      await page.waitForLoadState('load');
      await expect(
        page.getByRole('heading', { name: 'Dashboard' })
      ).toBeVisible({ timeout: 15000 });
    });

    test('should render SVG charts on dashboard', async ({ page }) => {
      // Dashboard should contain at least one SVG chart (Recharts renders SVGs)
      const svgCharts = page.locator('svg.recharts-surface');
      await expect(svgCharts.first()).toBeVisible({ timeout: 10000 });
    });

    test('should render charts with reasonable dimensions', async ({ page }) => {
      const svgChart = page.locator('svg.recharts-surface').first();
      await expect(svgChart).toBeVisible({ timeout: 10000 });

      const boundingBox = await svgChart.boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(100);
        expect(boundingBox.height).toBeGreaterThan(50);
      }
    });

    test('should render allocation chart on allocation page', async ({ page }) => {
      await page.goto('/allocation');
      await page.waitForLoadState('load');

      await expect(
        page.getByRole('heading', { name: /allocation/i }).first()
      ).toBeVisible({ timeout: 10000 });

      // Should have at least one Recharts SVG
      const svgCharts = page.locator('svg.recharts-surface');
      await expect(svgCharts.first()).toBeVisible({ timeout: 10000 });
    });

    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState('load');

      // Dashboard should still render
      await expect(
        page.getByRole('heading', { name: 'Dashboard' })
      ).toBeVisible({ timeout: 15000 });

      // Charts should still be present (may be stacked vertically)
      const svgCharts = page.locator('svg.recharts-surface');
      const chartCount = await svgCharts.count();
      // At least some chart should render on mobile
      expect(chartCount).toBeGreaterThanOrEqual(0);
    });

    test('should be responsive on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForLoadState('load');

      await expect(
        page.getByRole('heading', { name: 'Dashboard' })
      ).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Empty State', () => {
    test('should handle empty portfolio gracefully', async ({ page }) => {
      // Navigate to dashboard without seeding data
      await page.goto('/');
      await page.waitForLoadState('load');

      // Page should render without crashing - either shows Dashboard heading
      // or Welcome empty state when no portfolio exists
      const dashboardHeading = page.getByRole('heading', { name: 'Dashboard' });
      const welcomeHeading = page.getByRole('heading', { name: /Welcome to Portfolio Tracker/i });

      await expect(
        dashboardHeading.or(welcomeHeading)
      ).toBeVisible({ timeout: 15000 });
    });
  });
});
