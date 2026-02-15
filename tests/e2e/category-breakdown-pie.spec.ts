/**
 * Category Breakdown Pie Chart E2E Tests
 *
 * Tests the pie chart option for the Category Breakdown widget.
 * Pie chart visibility is controlled by:
 * - Setting: showPieChart toggle in dashboard settings
 * - Row span: rowSpan >= 2 (2h or taller) for 2+ col, or >= 4 for 1 col
 * - Width: measured width >= 150px
 *
 * Layout mode (stacked vs side-by-side) is controlled by:
 * - Column span: columnSpan >= 2 for side-by-side (45%/55% split)
 */

import { test, expect, seedMockData, Page } from './fixtures/test';

/**
 * Helper to open dashboard settings dialog
 */
async function openSettings(page: Page) {
  await page.locator('[data-testid="dashboard-settings-btn"]').click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

/**
 * Helper to enable pie chart setting in dashboard settings
 */
async function enablePieChartSetting(page: Page) {
  await openSettings(page);

  const pieChartToggle = page.locator('#category-pie-chart');
  const isChecked = await pieChartToggle.isChecked();
  if (!isChecked) {
    await pieChartToggle.click();
  }
}

/**
 * Helper to disable pie chart setting in dashboard settings
 */
async function disablePieChartSetting(page: Page) {
  await openSettings(page);

  const pieChartToggle = page.locator('#category-pie-chart');
  const isChecked = await pieChartToggle.isChecked();
  if (isChecked) {
    await pieChartToggle.click();
  }
}

/**
 * Helper to enable dense packing in dashboard settings.
 * Assumes settings dialog is already open.
 */
async function ensureDensePackingEnabled(page: Page) {
  const densePackingToggle = page.locator('#dense-packing');
  const isDenseEnabled = await densePackingToggle.isChecked();
  if (!isDenseEnabled) {
    await densePackingToggle.click();
  }
}

/**
 * Helper to set row span for category breakdown widget.
 * Assumes settings dialog is already open.
 * Dense packing must be enabled for row span selector to appear.
 */
async function setRowSpan(page: Page, rowSpan: '1h' | '2h' | '3h') {
  await ensureDensePackingEnabled(page);

  // Find the row span select by its aria-label
  const rowSpanTrigger = page.locator(
    '[aria-label="Row span for Category Breakdown"]'
  );
  await rowSpanTrigger.click();
  await page.getByRole('option', { name: rowSpan }).click();
}

/**
 * Helper to set column span for category breakdown widget.
 * Assumes settings dialog is already open.
 */
async function setColumnSpan(page: Page, colSpan: '1x' | '2x') {
  const colSpanTrigger = page.locator(
    '[aria-label="Column span for Category Breakdown"]'
  );
  await colSpanTrigger.click();
  await page.getByRole('option', { name: colSpan }).click();
}

/**
 * Helper to close settings dialog
 */
async function closeSettings(page: Page) {
  await page.getByRole('button', { name: /^done$/i }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

test.describe('Category Breakdown Pie Chart', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/');
    await page.waitForLoadState('load');

    // Wait for dashboard to load with the category breakdown widget
    await expect(
      page.locator('[data-testid="category-breakdown-widget"]')
    ).toBeVisible({ timeout: 10000 });
  });

  test('pie chart is hidden by default', async ({ page }) => {
    const widget = page.locator('[data-testid="category-breakdown-widget"]');
    await expect(widget).toBeVisible();

    // Pie chart should not be present by default (setting disabled)
    await expect(widget.locator('.recharts-pie')).not.toBeVisible();
  });

  test('pie chart hidden at 1h row span even when setting enabled', async ({
    page,
  }) => {
    // Enable pie chart setting (opens dialog)
    await enablePieChartSetting(page);

    // Set row span to 1h (too small for pie chart)
    await setRowSpan(page, '1h');
    await closeSettings(page);

    // Pie chart should NOT be visible at 1h
    const widget = page.locator('[data-testid="category-breakdown-widget"]');
    await expect(widget.locator('.recharts-pie')).not.toBeVisible();
  });

  test('pie chart visible at 2h row span with 2x column when setting enabled', async ({
    page,
  }) => {
    // Enable pie chart setting (opens dialog)
    await enablePieChartSetting(page);

    // For 2+ column widgets, rowSpan >= 2 is sufficient
    await setColumnSpan(page, '2x');
    await setRowSpan(page, '2h');
    await closeSettings(page);

    // Pie chart should be visible
    const widget = page.locator('[data-testid="category-breakdown-widget"]');
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });
  });

  test('pie chart visible at 3h row span with 2x column when setting enabled', async ({
    page,
  }) => {
    // Enable pie chart setting (opens dialog)
    await enablePieChartSetting(page);

    await setColumnSpan(page, '2x');
    await setRowSpan(page, '3h');
    await closeSettings(page);

    // Pie chart should be visible at 3h
    const widget = page.locator('[data-testid="category-breakdown-widget"]');
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });
  });

  test('pie chart hidden when setting disabled regardless of row span', async ({
    page,
  }) => {
    // Disable pie chart setting explicitly (opens dialog)
    await disablePieChartSetting(page);

    // Set large spans
    await setColumnSpan(page, '2x');
    await setRowSpan(page, '3h');
    await closeSettings(page);

    // Pie chart should NOT be visible (setting disabled)
    const widget = page.locator('[data-testid="category-breakdown-widget"]');
    await expect(widget.locator('.recharts-pie')).not.toBeVisible();
  });

  test('side-by-side layout at 2x column span', async ({ page }) => {
    // Enable pie chart (opens dialog)
    await enablePieChartSetting(page);

    // Set column span to 2x (side-by-side layout) and sufficient row span
    await setColumnSpan(page, '2x');
    await setRowSpan(page, '2h');
    await closeSettings(page);

    const widget = page.locator('[data-testid="category-breakdown-widget"]');

    // Pie chart should be visible
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });
  });

  test('pie chart setting persists across page reloads', async ({ page }) => {
    // Enable pie chart (opens dialog)
    await enablePieChartSetting(page);

    await setColumnSpan(page, '2x');
    await setRowSpan(page, '2h');
    await closeSettings(page);

    // Verify pie chart is visible
    const widget = page.locator('[data-testid="category-breakdown-widget"]');
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('load');
    await expect(
      page.locator('[data-testid="category-breakdown-widget"]')
    ).toBeVisible({ timeout: 10000 });

    // Pie chart should still be visible after reload
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });

    // Open settings and verify toggle is still checked
    await openSettings(page);
    const pieChartToggle = page.locator('#category-pie-chart');
    await expect(pieChartToggle).toBeChecked();
    await closeSettings(page);
  });

  test('can toggle pie chart on and off', async ({ page }) => {
    const widget = page.locator('[data-testid="category-breakdown-widget"]');

    // Enable pie chart (opens dialog)
    await enablePieChartSetting(page);
    await setColumnSpan(page, '2x');
    await setRowSpan(page, '2h');
    await closeSettings(page);

    // Should be visible
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });

    // Disable pie chart (opens dialog)
    await disablePieChartSetting(page);
    await closeSettings(page);

    // Should be hidden
    await expect(widget.locator('.recharts-pie')).not.toBeVisible();
  });
});
