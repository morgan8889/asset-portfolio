/**
 * Category Breakdown Pie Chart E2E Tests
 *
 * Tests the pie chart option for the Category Breakdown widget.
 * Pie chart visibility is controlled by:
 * - Setting: showPieChart toggle in dashboard settings
 * - Row span: rowSpan >= 2 (2h or taller)
 * - Width: measured width >= 150px
 *
 * Layout mode (stacked vs side-by-side) is controlled by:
 * - Column span: columnSpan >= 2 for side-by-side (45%/55% split)
 */

import { test, expect, Page } from './fixtures/test';

/**
 * Helper to enable pie chart setting in dashboard settings
 */
async function enablePieChartSetting(page: Page) {
  await page.getByRole('button', { name: /settings/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

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
  await page.getByRole('button', { name: /settings/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  const pieChartToggle = page.locator('#category-pie-chart');
  const isChecked = await pieChartToggle.isChecked();
  if (isChecked) {
    await pieChartToggle.click();
  }
}

/**
 * Helper to set row span for category breakdown widget
 */
async function setRowSpan(page: Page, rowSpan: '1h' | '2h' | '3h') {
  // Ensure dense packing is enabled (required for row span selector)
  const densePackingToggle = page.locator('#dense-packing');
  const isDenseEnabled = await densePackingToggle.isChecked();
  if (!isDenseEnabled) {
    await densePackingToggle.click();
  }

  // Find the category breakdown widget row and its row span selector
  const widgetRow = page.locator('label:has-text("Category Breakdown")').locator('..').locator('..').locator('..');
  const rowSpanSelect = widgetRow.locator('[aria-label="Row span for Category Breakdown"]');

  await rowSpanSelect.click();
  await page.getByRole('option', { name: rowSpan }).click();
}

/**
 * Helper to set column span for category breakdown widget
 */
async function setColumnSpan(page: Page, colSpan: '1x' | '2x') {
  const widgetRow = page.locator('label:has-text("Category Breakdown")').locator('..').locator('..').locator('..');
  const colSpanSelect = widgetRow.locator('[aria-label="Column span for Category Breakdown"]');

  await colSpanSelect.click();
  await page.getByRole('option', { name: colSpan }).click();
}

/**
 * Helper to close settings dialog
 */
async function closeSettings(page: Page) {
  await page.getByRole('button', { name: /done/i }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

test.describe('Category Breakdown Pie Chart', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Generate mock data
    await page.getByRole('button', { name: /generate mock data/i }).click();

    // Wait for navigation to dashboard
    await page.waitForURL('/', { timeout: 10000 });

    // Wait for dashboard to load
    await expect(page.locator('[data-testid="category-breakdown-widget"]')).toBeVisible({ timeout: 10000 });
  });

  test('pie chart is hidden by default', async ({ page }) => {
    // Find the category breakdown widget
    const widget = page.locator('[data-testid="category-breakdown-widget"]');
    await expect(widget).toBeVisible();

    // Pie chart should not be present by default (setting disabled)
    await expect(widget.locator('.recharts-pie')).not.toBeVisible();

    // Progress bars should be visible
    await expect(widget.getByRole('progressbar').first()).toBeVisible();
  });

  test('pie chart hidden at 1h row span even when setting enabled', async ({
    page,
  }) => {
    // Enable pie chart setting
    await enablePieChartSetting(page);

    // Set row span to 1h (too small for pie chart)
    await setRowSpan(page, '1h');
    await closeSettings(page);

    // Pie chart should NOT be visible at 1h
    const widget = page.locator('[data-testid="category-breakdown-widget"]');
    await expect(widget.locator('.recharts-pie')).not.toBeVisible();

    // Progress bars should still be visible
    await expect(widget.getByRole('progressbar').first()).toBeVisible();
  });

  test('pie chart visible at 2h row span when setting enabled', async ({
    page,
  }) => {
    // Enable pie chart setting
    await enablePieChartSetting(page);

    // Set row span to 2h (meets height requirement)
    await setRowSpan(page, '2h');
    await closeSettings(page);

    // Pie chart should be visible at 2h
    const widget = page.locator('[data-testid="category-breakdown-widget"]');
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });

    // Progress bars should also be visible
    await expect(widget.getByRole('progressbar').first()).toBeVisible();
  });

  test('pie chart visible at 3h row span when setting enabled', async ({
    page,
  }) => {
    // Enable pie chart setting
    await enablePieChartSetting(page);

    // Set row span to 3h (exceeds height requirement)
    await setRowSpan(page, '3h');
    await closeSettings(page);

    // Pie chart should be visible at 3h
    const widget = page.locator('[data-testid="category-breakdown-widget"]');
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });
  });

  test('pie chart hidden when setting disabled regardless of row span', async ({
    page,
  }) => {
    // Disable pie chart setting explicitly
    await disablePieChartSetting(page);

    // Set row span to 3h (largest)
    await setRowSpan(page, '3h');
    await closeSettings(page);

    // Pie chart should NOT be visible (setting disabled)
    const widget = page.locator('[data-testid="category-breakdown-widget"]');
    await expect(widget.locator('.recharts-pie')).not.toBeVisible();

    // Progress bars should be visible
    await expect(widget.getByRole('progressbar').first()).toBeVisible();
  });

  test('stacked layout at 1x column span', async ({ page }) => {
    // Enable pie chart and set sufficient row span
    await enablePieChartSetting(page);
    await setRowSpan(page, '2h');

    // Set column span to 1x (stacked layout)
    await setColumnSpan(page, '1x');
    await closeSettings(page);

    const widget = page.locator('[data-testid="category-breakdown-widget"]');

    // Both pie chart and progress bars should be visible
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });
    await expect(widget.getByRole('progressbar').first()).toBeVisible();

    // In stacked layout, the container should use flex-column
    // (pie chart below progress bars)
  });

  test('side-by-side layout at 2x column span', async ({ page }) => {
    // Enable pie chart and set sufficient row span
    await enablePieChartSetting(page);
    await setRowSpan(page, '2h');

    // Set column span to 2x (side-by-side layout)
    await setColumnSpan(page, '2x');
    await closeSettings(page);

    const widget = page.locator('[data-testid="category-breakdown-widget"]');

    // Both pie chart and progress bars should be visible
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });
    await expect(widget.getByRole('progressbar').first()).toBeVisible();

    // In side-by-side layout, the container should use flex-row
    // (45%/55% split between chart and progress bars)
  });

  test('pie chart setting persists across page reloads', async ({ page }) => {
    // Enable pie chart and set 2h row span
    await enablePieChartSetting(page);
    await setRowSpan(page, '2h');
    await closeSettings(page);

    // Verify pie chart is visible
    const widget = page.locator('[data-testid="category-breakdown-widget"]');
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });

    // Reload the page
    await page.reload();
    await expect(page.locator('[data-testid="category-breakdown-widget"]')).toBeVisible({ timeout: 10000 });

    // Pie chart should still be visible after reload
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });

    // Open settings and verify toggle is still checked
    await page.getByRole('button', { name: /settings/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const pieChartToggle = page.locator('#category-pie-chart');
    await expect(pieChartToggle).toBeChecked();

    await closeSettings(page);
  });

  test('both progress bars and pie chart visible in split layout', async ({
    page,
  }) => {
    // Enable pie chart with optimal settings
    await enablePieChartSetting(page);
    await setRowSpan(page, '2h');
    await setColumnSpan(page, '2x');
    await closeSettings(page);

    const widget = page.locator('[data-testid="category-breakdown-widget"]');

    // Both visualizations should be present
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });
    await expect(widget.getByRole('progressbar').first()).toBeVisible();

    // Verify all categories are shown in progress bars
    await expect(widget.getByText('Stocks')).toBeVisible();
    await expect(widget.getByText('ETFs')).toBeVisible();
    await expect(widget.getByText('Crypto')).toBeVisible();
  });

  test('can toggle pie chart on and off', async ({ page }) => {
    const widget = page.locator('[data-testid="category-breakdown-widget"]');

    // Enable pie chart
    await enablePieChartSetting(page);
    await setRowSpan(page, '2h');
    await closeSettings(page);

    // Should be visible
    await expect(widget.locator('.recharts-pie')).toBeVisible({ timeout: 5000 });

    // Disable pie chart
    await disablePieChartSetting(page);
    await closeSettings(page);

    // Should be hidden
    await expect(widget.locator('.recharts-pie')).not.toBeVisible();

    // Progress bars should remain visible
    await expect(widget.getByRole('progressbar').first()).toBeVisible();
  });
});
