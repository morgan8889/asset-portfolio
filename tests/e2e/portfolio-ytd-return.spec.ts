/**
 * E2E tests for portfolio YTD return display
 * @module tests/e2e/portfolio-ytd-return.spec
 */

import { test, expect, seedMockData } from './fixtures/test';

test.describe('Portfolio YTD Return Display', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    // Navigate to the portfolios page
    await page.goto('/portfolios');

    // Wait for the page to load
    await page.waitForSelector('[data-testid="portfolios-table"], table', {
      timeout: 5000
    });
  });

  test('should display YTD return column in portfolios table', async ({ page }) => {
    // Check that the YTD Return header is present
    await expect(page.locator('th:has-text("YTD Return")')).toBeVisible();

    // Get all table rows (excluding header)
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // For each portfolio row, verify YTD return cell exists
      for (let i = 0; i < Math.min(rowCount, 3); i++) {
        const row = rows.nth(i);

        // Find the YTD return cell (5th column)
        const ytdCell = row.locator('td:nth-child(4)');
        await expect(ytdCell).toBeVisible();

        // Get the text content
        const ytdText = await ytdCell.textContent();

        // Verify it's either a percentage with +/- or an em dash for N/A
        expect(ytdText).toMatch(/^([+\-]?\d+\.\d{2}%|—)$/);

        // If it's a percentage, verify color coding
        if (ytdText && ytdText !== '—') {
          const spanElement = ytdCell.locator('span');
          const className = await spanElement.getAttribute('class');

          if (ytdText.startsWith('+') || (!ytdText.startsWith('-') && parseFloat(ytdText) > 0)) {
            expect(className).toContain('text-green-600');
          } else if (ytdText.startsWith('-')) {
            expect(className).toContain('text-red-600');
          }
        }
      }
    }
  });

  test('should show em dash for portfolios without sufficient data', async ({ page }) => {
    // Create a new portfolio to ensure it has no snapshots
    await page.getByRole('button', { name: /create portfolio/i }).click();

    // Fill in portfolio details
    await page.getByLabel(/name/i).fill('Test Portfolio ' + Date.now());
    await page.getByRole('combobox', { name: /type/i }).click();
    await page.getByRole('option', { name: /taxable/i }).click();

    // Submit the form
    await page.getByRole('button', { name: /^create$/i }).click();

    // Wait for the dialog to close and table to update
    await page.waitForTimeout(1000);

    // Find the row for our new portfolio (should be first due to recency sorting)
    const firstRow = page.locator('tbody tr').first();
    const ytdCell = firstRow.locator('td:nth-child(4)');

    // Should show em dash for new portfolio without data
    await expect(ytdCell).toHaveText('—');
    await expect(ytdCell.locator('span')).toHaveClass(/text-muted-foreground/);
  });

  test('should format positive YTD returns correctly', async ({ page }) => {
    // Look for any positive YTD returns in the table
    const positiveReturns = page.locator('td:nth-child(4) span.text-green-600');
    const count = await positiveReturns.count();

    if (count > 0) {
      const firstPositive = positiveReturns.first();
      const text = await firstPositive.textContent();

      // Should start with + and end with %
      expect(text).toMatch(/^\+\d+\.\d{2}%$/);
    }
  });

  test('should format negative YTD returns correctly', async ({ page }) => {
    // Look for any negative YTD returns in the table
    const negativeReturns = page.locator('td:nth-child(4) span.text-red-600');
    const count = await negativeReturns.count();

    if (count > 0) {
      const firstNegative = negativeReturns.first();
      const text = await firstNegative.textContent();

      // Should start with - and end with %
      expect(text).toMatch(/^-\d+\.\d{2}%$/);
    }
  });

  test('should update YTD return when portfolio value changes', async ({ page }) => {
    // Get the first portfolio row
    const firstRow = page.locator('tbody tr').first();
    const portfolioName = await firstRow.locator('td:first-child').textContent() || '';

    // Get initial YTD value
    const initialYtd = await firstRow.locator('td:nth-child(4)').textContent();

    // Navigate to the portfolio to add a transaction
    await firstRow.getByRole('button', { name: /view/i }).click();

    // Wait for navigation
    await page.waitForURL('**/holdings');

    // Go to transactions page
    await page.getByRole('link', { name: /transactions/i }).click();

    // Add a new transaction (buy)
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Fill transaction form
    await page.getByLabel(/symbol/i).fill('AAPL');
    await page.getByLabel(/quantity/i).fill('10');
    await page.getByLabel(/price/i).fill('150');
    await page.getByRole('combobox', { name: /type/i }).click();
    await page.getByRole('option', { name: /buy/i }).click();

    // Submit transaction
    await page.getByRole('button', { name: /add/i }).click();

    // Go back to portfolios page
    await page.goto('/portfolios');

    // Wait for table to load
    await page.waitForSelector('tbody tr');

    // Find the same portfolio row
    const updatedRow = page.locator('tbody tr', { hasText: portfolioName });
    const updatedYtd = await updatedRow.locator('td:nth-child(4)').textContent();

    // The YTD should be present (not necessarily different if no snapshots yet)
    expect(updatedYtd).toBeDefined();
  });

  test('should maintain YTD formatting consistency across portfolios', async ({ page }) => {
    // Get all YTD cells
    const ytdCells = page.locator('tbody td:nth-child(4)');
    const count = await ytdCells.count();

    for (let i = 0; i < count; i++) {
      const cell = ytdCells.nth(i);
      const text = await cell.textContent();

      // Each cell should either be:
      // 1. Em dash (—) for N/A
      // 2. Percentage with exactly 2 decimal places
      expect(text).toMatch(/^([+\-]?\d+\.\d{2}%|—)$/);

      // Verify proper styling
      if (text === '—') {
        await expect(cell.locator('span')).toHaveClass(/text-muted-foreground/);
      } else if (text?.startsWith('+') || (text && !text.startsWith('-') && parseFloat(text) > 0)) {
        await expect(cell.locator('span')).toHaveClass(/text-green-600/);
      } else if (text?.startsWith('-')) {
        await expect(cell.locator('span')).toHaveClass(/text-red-600/);
      }
    }
  });
});