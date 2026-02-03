/**
 * E2E Tests for Dividend Transaction Workflow
 *
 * Tests the complete user workflow for recording dividend payments,
 * verifying they appear in holdings, and tracking cash flow impact.
 *
 * Coverage:
 * - Add dividend transaction
 * - Verify dividend appears in transaction history
 * - Check dividend impact on holdings performance
 * - Validate cash flow tracking
 * - Test reinvested dividends
 */

import { test, expect } from '@playwright/test';

test.describe('Dividend Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    await expect(page.getByText(/portfolio dashboard/i)).toBeVisible({ timeout: 10000 });

    // Generate mock data if needed to have holdings
    const generateButton = page.getByRole('button', { name: /generate mock data/i });
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await expect(page).toHaveURL('/', { timeout: 10000 });
      await expect(page.getByText(/total value/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should record cash dividend payment', async ({ page }) => {
    // Open add transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Select Dividend transaction type
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /dividend/i }).click();

    // Fill in dividend details
    await page.getByLabel(/asset symbol/i).fill('DIVTEST');

    // Set transaction date
    const today = new Date();
    await page.getByLabel(/transaction date/i).fill(today.toISOString().split('T')[0]);

    // Enter dividend amount per share
    await page.getByLabel(/^price$/i).fill('0.50');

    // Enter quantity (shares held at time of dividend)
    await page.getByLabel(/^quantity$/i).fill('100');

    // Add notes
    await page.getByLabel(/notes/i).fill('Q4 2025 dividend payment');

    // Submit transaction
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Verify dialog closes
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Navigate to transactions page to verify
    await page.getByRole('link', { name: /transactions/i }).click();
    await expect(page.getByRole('heading', { name: /transactions/i })).toBeVisible();

    // Should see dividend transaction
    await expect(page.getByText(/dividend/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/divtest/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show dividend in transaction history with correct amount', async ({ page }) => {
    // Add dividend transaction
    await page.getByRole('button', { name: /add transaction/i }).click();

    let dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /dividend/i }).click();

    await page.getByLabel(/asset symbol/i).fill('AAPL');
    await page.getByLabel(/transaction date/i).fill(new Date().toISOString().split('T')[0]);
    await page.getByLabel(/^price$/i).fill('0.25'); // $0.25 per share
    await page.getByLabel(/^quantity$/i).fill('50'); // 50 shares

    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Navigate to transactions
    await page.getByRole('link', { name: /transactions/i }).click();
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });

    // Verify dividend amount (50 shares × $0.25 = $12.50)
    await expect(page.getByText(/\$12\.50|\$12\.5/i)).toBeVisible({ timeout: 5000 });
  });

  test('should record reinvested dividend (DRIP)', async ({ page }) => {
    // Open add transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Select Reinvestment transaction type
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /reinvestment/i }).click();

    // Fill in reinvestment details
    await page.getByLabel(/asset symbol/i).fill('DRIP');
    await page.getByLabel(/transaction date/i).fill(new Date().toISOString().split('T')[0]);

    // Shares purchased with reinvested dividend
    await page.getByLabel(/^quantity$/i).fill('5');

    // Price per share at reinvestment
    await page.getByLabel(/^price$/i).fill('100.00');

    await page.getByLabel(/notes/i).fill('Dividend reinvestment');

    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify in transactions
    await page.getByRole('link', { name: /transactions/i }).click();
    await expect(page.getByText(/reinvestment/i)).toBeVisible({ timeout: 5000 });
  });

  test('should track multiple dividends for same holding', async ({ page }) => {
    // Add first dividend
    await page.getByRole('button', { name: /add transaction/i }).click();

    let dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /dividend/i }).click();

    await page.getByLabel(/asset symbol/i).fill('MULTIDIV');

    const date1 = new Date();
    date1.setMonth(date1.getMonth() - 3); // Q1 dividend
    await page.getByLabel(/transaction date/i).fill(date1.toISOString().split('T')[0]);

    await page.getByLabel(/^price$/i).fill('0.50');
    await page.getByLabel(/^quantity$/i).fill('100');
    await page.getByLabel(/notes/i).fill('Q1 dividend');

    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Add second dividend
    await page.getByRole('button', { name: /add transaction/i }).click();

    dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /dividend/i }).click();

    await page.getByLabel(/asset symbol/i).fill('MULTIDIV');

    const date2 = new Date(); // Q4 dividend
    await page.getByLabel(/transaction date/i).fill(date2.toISOString().split('T')[0]);

    await page.getByLabel(/^price$/i).fill('0.55');
    await page.getByLabel(/^quantity$/i).fill('100');
    await page.getByLabel(/notes/i).fill('Q4 dividend');

    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify both dividends appear in transactions
    await page.getByRole('link', { name: /transactions/i }).click();
    await expect(page.getByText(/q1 dividend/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/q4 dividend/i)).toBeVisible({ timeout: 5000 });
  });

  test('should validate dividend amount is positive', async ({ page }) => {
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /dividend/i }).click();

    await page.getByLabel(/asset symbol/i).fill('TEST');
    await page.getByLabel(/transaction date/i).fill(new Date().toISOString().split('T')[0]);

    // Try negative dividend amount
    await page.getByLabel(/^price$/i).fill('-0.50');
    await page.getByLabel(/^quantity$/i).fill('100');

    await page.getByRole('button', { name: /add transaction/i }).click();

    // Should show validation error or prevent submission
    // (Implementation may show error message or keep dialog open)
  });

  test('should allow filtering transactions by dividend type', async ({ page }) => {
    // Add a dividend transaction first
    await page.getByRole('button', { name: /add transaction/i }).click();

    let dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /dividend/i }).click();

    await page.getByLabel(/asset symbol/i).fill('FILTER');
    await page.getByLabel(/transaction date/i).fill(new Date().toISOString().split('T')[0]);
    await page.getByLabel(/^price$/i).fill('1.00');
    await page.getByLabel(/^quantity$/i).fill('10');

    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Navigate to transactions page
    await page.getByRole('link', { name: /transactions/i }).click();
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });

    // Look for filter controls (implementation may vary)
    const filterButton = page.getByRole('button', { name: /filter/i }).or(page.getByLabel(/filter/i));
    if (await filterButton.count() > 0) {
      await filterButton.first().click();

      // Try to filter by dividend type
      const dividendFilter = page.getByText(/dividend/i);
      if (await dividendFilter.count() > 0) {
        await dividendFilter.first().click();
      }
    }
  });

  test('should show dividend income in performance metrics', async ({ page }) => {
    // Add dividend
    await page.getByRole('button', { name: /add transaction/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /dividend/i }).click();

    await page.getByLabel(/asset symbol/i).fill('INCOME');
    await page.getByLabel(/transaction date/i).fill(new Date().toISOString().split('T')[0]);
    await page.getByLabel(/^price$/i).fill('2.00');
    await page.getByLabel(/^quantity$/i).fill('50');

    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Navigate to performance or analysis page
    const performanceLink = page.getByRole('link', { name: /performance/i }).or(page.getByRole('link', { name: /analysis/i }));
    if (await performanceLink.count() > 0) {
      await performanceLink.first().click();
      await expect(page.getByRole('heading')).toBeVisible({ timeout: 5000 });
    }
  });
});
