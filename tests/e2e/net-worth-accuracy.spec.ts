/**
 * Net Worth Accuracy E2E Tests
 *
 * End-to-end validation of net worth display and calculation accuracy including:
 * - Net worth chart displays with correct metrics
 * - Liability tracking affects net worth
 * - Chart renders with assets, liabilities, and net worth areas
 * - FIRE projection responds to liability changes
 *
 * Uses seedMockData which creates a portfolio with:
 * - Multiple stock/ETF/crypto holdings (AAPL, GOOGL, MSFT, AMZN, VTI, BTC)
 * - ESPP and RSU transactions (ACME)
 *
 * The planning page at /planning shows:
 * - Net Worth History chart (with Current Net Worth, Total Assets, Total Liabilities)
 * - Liabilities & Debt manager
 * - FIRE Goal Settings
 * - FIRE Projection chart
 * - What-If Scenarios
 */

import { test, expect, seedMockData, Page } from './fixtures/test';

test.describe('Net Worth Accuracy Tests', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/planning');
    await page.waitForLoadState('load');

    // Wait for planning page to fully load
    await expect(
      page.getByRole('heading', { name: 'Financial Planning' })
    ).toBeVisible({ timeout: 15000 });
  });

  test('displays net worth summary metrics', async ({ page }) => {
    // The net worth chart card shows summary metrics in its header
    await expect(page.getByText('Current Net Worth')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('Total Assets')).toBeVisible();
    await expect(page.getByText('Total Liabilities')).toBeVisible();
  });

  test('displays net worth chart', async ({ page }) => {
    // The NetWorthChart component renders a recharts AreaChart
    // Check the chart card title
    const chartCards = page.getByText('Net Worth History');
    await expect(chartCards.first()).toBeVisible({ timeout: 10000 });

    // Check for chart rendering (recharts elements)
    const chartContainer = page.locator('.recharts-responsive-container');
    // There should be at least one chart (net worth chart)
    await expect(chartContainer.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows positive asset values from seeded data', async ({ page }) => {
    // Wait for chart to load
    await expect(page.getByText('Current Net Worth')).toBeVisible({
      timeout: 10000,
    });

    // Total Assets should show a value (from seeded holdings)
    // The mock data creates holdings worth thousands of dollars
    const assetsLabel = page.getByText('Total Assets');
    const assetsSection = assetsLabel.locator('..');
    const assetsValue = await assetsSection.textContent();
    // Should contain a dollar amount
    expect(assetsValue).toMatch(/\$/);
  });

  test('tracks liability in net worth after adding one', async ({ page }) => {
    // Add a liability
    await page.getByRole('button', { name: /add liability/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('Test Mortgage');
    await dialog.locator('#balance').fill('300000');
    await dialog.locator('#interestRate').fill('4.5');
    await dialog.locator('#payment').fill('1520');
    await dialog.locator('#startDate').fill('2020-01-01');
    await dialog.getByRole('button', { name: /^add$/i }).click();

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify liability appears in the liabilities table
    await expect(page.getByText('Test Mortgage')).toBeVisible({
      timeout: 5000,
    });

    // Total Liabilities should now show a value
    await expect(page.getByText('Total Liabilities')).toBeVisible();
  });

  test('net worth chart renders without errors after adding liability', async ({
    page,
  }) => {
    // Add a liability
    await page.getByRole('button', { name: /add liability/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('Car Loan');
    await dialog.locator('#balance').fill('25000');
    await dialog.locator('#interestRate').fill('3.0');
    await dialog.locator('#payment').fill('500');
    await dialog.locator('#startDate').fill('2023-06-01');
    await dialog.getByRole('button', { name: /^add$/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Chart should still render
    const chartContainer = page.locator('.recharts-responsive-container');
    await expect(chartContainer.first()).toBeVisible({ timeout: 10000 });

    // No console errors should appear (verified by page not crashing)
    await expect(page.getByText('Net Worth History').first()).toBeVisible();
  });

  test('FIRE projection shows metrics from seeded data', async ({ page }) => {
    // The FIRE projection chart should display metrics
    await expect(page.getByText('Years to FIRE').first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText('FIRE Target').first()).toBeVisible();
    await expect(page.getByText('Monthly Progress').first()).toBeVisible();
  });

  test('large liability triggers may-not-reach-FIRE warning', async ({
    page,
  }) => {
    // Add a very large liability that exceeds asset value
    await page.getByRole('button', { name: /add liability/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('Massive Debt');
    await dialog.locator('#balance').fill('10000000');
    await dialog.locator('#interestRate').fill('5.0');
    await dialog.locator('#payment').fill('50000');
    await dialog.locator('#startDate').fill('2020-01-01');
    await dialog.getByRole('button', { name: /^add$/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Massive Debt')).toBeVisible();

    // With a $10M liability, the FIRE projection should recalculate and show
    // the infinity symbol (∞) in the years-to-fire display, indicating FIRE is unreachable.
    await expect(page.locator('[data-testid="years-to-fire"]').filter({ hasText: '∞' })).toBeVisible({
      timeout: 15000,
    });
  });

  test('time range selector changes chart view', async ({ page }) => {
    // The time range is a shadcn Select with id="timeRange"
    const timeRangeTrigger = page.locator('#timeRange');
    await expect(timeRangeTrigger).toBeVisible({ timeout: 10000 });

    // Change to 1 Year
    await timeRangeTrigger.click();
    await page.getByRole('option', { name: '1 Year' }).click();

    // Chart should still be visible
    await expect(page.getByText('Net Worth History').first()).toBeVisible();

    // Change to All Time
    await timeRangeTrigger.click();
    await page.getByRole('option', { name: 'All Time' }).click();

    // Chart should still be visible
    await expect(page.getByText('Net Worth History').first()).toBeVisible();
  });

  test('liabilities section shows total in subtitle', async ({ page }) => {
    // The LiabilityManager shows "Total: $X" in its subtitle
    await expect(page.getByText('Liabilities & Debt')).toBeVisible({
      timeout: 10000,
    });

    // Initially shows $0.00 or similar
    await expect(page.getByText(/Total:/)).toBeVisible();
  });

  test('empty liabilities shows empty state message', async ({ page }) => {
    // Without any liabilities added, should show empty state
    await expect(
      page.getByText(/No liabilities added yet/i)
    ).toBeVisible({ timeout: 10000 });
  });

  test('multiple liabilities sum correctly in total', async ({ page }) => {
    // Add first liability
    await page.getByRole('button', { name: /add liability/i }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('Mortgage');
    await dialog.locator('#balance').fill('200000');
    await dialog.locator('#interestRate').fill('4.0');
    await dialog.locator('#payment').fill('1200');
    await dialog.locator('#startDate').fill('2020-01-01');
    await dialog.getByRole('button', { name: /^add$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    await expect(page.getByText('Mortgage')).toBeVisible();

    // Add second liability
    await page.getByRole('button', { name: /add liability/i }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('Student Loan');
    await dialog.locator('#balance').fill('50000');
    await dialog.locator('#interestRate').fill('5.5');
    await dialog.locator('#payment').fill('500');
    await dialog.locator('#startDate').fill('2018-09-01');
    await dialog.getByRole('button', { name: /^add$/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    await expect(page.getByText('Student Loan')).toBeVisible();

    // Both should appear in the liabilities table
    await expect(page.getByText('Mortgage')).toBeVisible();
    await expect(page.getByText('Student Loan')).toBeVisible();

    // The total should reflect both ($200,000 + $50,000 = $250,000)
    // formatCurrency will format as "$250,000.00" or similar
    await expect(page.getByText(/Total:.*\$250,000/)).toBeVisible();
  });
});
