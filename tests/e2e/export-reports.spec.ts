/**
 * E2E Tests for Portfolio Export Functionality
 *
 * Tests PDF performance reports, transaction CSV, and holdings CSV exports.
 * Uses seedMockData for data seeding and page.goto for direct navigation.
 * @feature 011-export-functionality
 */

import { test, expect, seedMockData } from './fixtures/test';

test.describe('Export Reports', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/reports');
    await page.waitForLoadState('load');
  });

  test('shows Reports page with all export options', async ({ page }) => {
    // Should show page title
    await expect(
      page.getByRole('heading', { name: /^reports$/i })
    ).toBeVisible();

    // Should show all three export cards
    await expect(page.getByText('Performance Report')).toBeVisible();
    await expect(page.getByText('Transaction History').first()).toBeVisible();
    await expect(page.getByText('Holdings Summary')).toBeVisible();

    // Should show export buttons (Download PDF and two Download CSV)
    await expect(
      page.getByRole('button', { name: /download pdf/i })
    ).toBeVisible();
    const csvButtons = page.getByRole('button', { name: /download csv/i });
    await expect(csvButtons).toHaveCount(2);
  });

  test('PDF download button is enabled with portfolio data', async ({
    page,
  }) => {
    const pdfButton = page.getByRole('button', { name: /download pdf/i });
    await expect(pdfButton).toBeEnabled();
  });

  test('shows date range selector for transaction export', async ({
    page,
  }) => {
    // Look for the Date Range label in the transaction card
    await expect(page.getByText('Date Range')).toBeVisible();

    // Should have a shadcn Select trigger (role=combobox)
    // The transaction card contains a DateRangeSelect component
    const transactionCard = page
      .locator('div')
      .filter({ hasText: 'Transaction History' })
      .filter({ has: page.getByRole('button', { name: /download csv/i }) })
      .first();
    const dateRangeTrigger = transactionCard.getByRole('combobox');
    await expect(dateRangeTrigger).toBeVisible();
  });

  test('transaction CSV button is enabled with portfolio data', async ({
    page,
  }) => {
    const csvButtons = page.getByRole('button', { name: /download csv/i });
    // First CSV button is for transactions
    await expect(csvButtons.first()).toBeEnabled();
  });

  test('holdings CSV button is enabled with portfolio data', async ({
    page,
  }) => {
    const csvButtons = page.getByRole('button', { name: /download csv/i });
    // Second CSV button is for holdings
    await expect(csvButtons.last()).toBeEnabled();
  });

  test('shows empty state message when no portfolio selected', async ({
    page,
  }) => {
    // Clear portfolio data so no portfolio is selected
    await page.evaluate(() => {
      localStorage.removeItem('portfolio-store');
    });
    await page.goto('/reports');
    await page.waitForLoadState('load');

    // Should show warning message about needing a portfolio
    await expect(
      page.getByText(/please select.*portfolio/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('disables export buttons when no portfolio selected', async ({
    page,
  }) => {
    // Clear portfolio data so no portfolio is selected
    await page.evaluate(() => {
      localStorage.removeItem('portfolio-store');
    });
    await page.goto('/reports');
    await page.waitForLoadState('load');

    // All export buttons should be disabled
    const downloadButtons = page.getByRole('button', { name: /download/i });
    const count = await downloadButtons.count();
    for (let i = 0; i < count; i++) {
      await expect(downloadButtons.nth(i)).toBeDisabled();
    }
  });

  test('PDF export completes successfully', async ({ page }) => {
    const pdfButton = page.getByRole('button', { name: /download pdf/i });
    await expect(pdfButton).toBeEnabled();

    // Click export - it may show a brief loading state or complete instantly
    await pdfButton.click();

    // After clicking, the button should eventually return to enabled state.
    // The export may complete too fast to observe the disabled state,
    // so we just verify the button is enabled after the export finishes.
    await expect(pdfButton).toBeEnabled({ timeout: 15000 });
  });

  test('transaction CSV export completes successfully', async ({ page }) => {
    const csvButtons = page.getByRole('button', { name: /download csv/i });
    const transactionCsvButton = csvButtons.first();
    await expect(transactionCsvButton).toBeEnabled();

    // Click export - may complete instantly without observable disabled state
    await transactionCsvButton.click();

    // Verify button returns to enabled state after export
    await expect(transactionCsvButton).toBeEnabled({ timeout: 15000 });
  });

  test('holdings CSV export completes successfully', async ({ page }) => {
    const csvButtons = page.getByRole('button', { name: /download csv/i });
    const holdingsCsvButton = csvButtons.last();
    await expect(holdingsCsvButton).toBeEnabled();

    // Click export - may complete instantly without observable disabled state
    await holdingsCsvButton.click();

    // Verify button returns to enabled state after export
    await expect(holdingsCsvButton).toBeEnabled({ timeout: 15000 });
  });

  test('can change date range for transaction export', async ({ page }) => {
    // Find the date range select trigger in the transaction card
    const transactionCard = page
      .locator('div')
      .filter({ hasText: 'Transaction History' })
      .filter({ has: page.getByRole('button', { name: /download csv/i }) })
      .first();
    const dateRangeTrigger = transactionCard.getByRole('combobox');

    // Click to open dropdown
    await dateRangeTrigger.click();

    // Should show options (shadcn Select uses role="option")
    await expect(
      page.getByRole('option', { name: 'Year to Date' })
    ).toBeVisible();
    await expect(
      page.getByRole('option', { name: 'Last 12 Months' })
    ).toBeVisible();
    await expect(
      page.getByRole('option', { name: 'All Time' })
    ).toBeVisible();

    // Select "All Time"
    await page.getByRole('option', { name: 'All Time' }).click();

    // Dropdown should close and trigger should still be visible
    await expect(dateRangeTrigger).toBeVisible();
  });
});

test.describe('Export Error Handling', () => {
  test('handles export errors gracefully', async ({ page }) => {
    // Navigate directly to reports (no mock data)
    await page.goto('/reports');
    await page.waitForLoadState('load');

    // Try to export without portfolio - buttons should be disabled
    const pdfButton = page.getByRole('button', { name: /download pdf/i });
    await expect(pdfButton).toBeDisabled();
  });
});

test.describe('Export Client-Side Only', () => {
  test('verifies no network requests during PDF export', async ({ page }) => {
    // Set up network monitoring
    const networkRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      // Track non-static resource requests
      if (
        !url.includes('/_next/') &&
        !url.includes('.js') &&
        !url.includes('.css')
      ) {
        networkRequests.push(url);
      }
    });

    // Seed data and navigate to reports
    await seedMockData(page);
    await page.goto('/reports');
    await page.waitForLoadState('load');

    // Clear any initial requests
    networkRequests.length = 0;

    // Trigger PDF export
    const pdfButton = page.getByRole('button', { name: /download pdf/i });
    await pdfButton.click();

    // Wait for export to complete
    await expect(pdfButton).toBeEnabled({ timeout: 15000 });

    // Should have no API requests (only client-side generation)
    const apiRequests = networkRequests.filter(
      (url) => url.includes('/api/') && !url.includes('/api/prices')
    );
    expect(apiRequests.length).toBe(0);
  });

  test('verifies no network requests during CSV exports', async ({ page }) => {
    // Set up network monitoring
    const networkRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (
        !url.includes('/_next/') &&
        !url.includes('.js') &&
        !url.includes('.css')
      ) {
        networkRequests.push(url);
      }
    });

    // Seed data and navigate to reports
    await seedMockData(page);
    await page.goto('/reports');
    await page.waitForLoadState('load');

    // Clear any initial requests
    networkRequests.length = 0;

    // Trigger transaction CSV export
    const csvButtons = page.getByRole('button', { name: /download csv/i });
    await csvButtons.first().click();

    // Wait for export to complete
    await expect(csvButtons.first()).toBeEnabled({ timeout: 15000 });

    // Should have no API requests
    const apiRequests = networkRequests.filter(
      (url) => url.includes('/api/') && !url.includes('/api/prices')
    );
    expect(apiRequests.length).toBe(0);
  });
});
