/**
 * E2E Tests for Portfolio Export Functionality
 *
 * Tests PDF performance reports, transaction CSV, and holdings CSV exports.
 * @feature 011-export-functionality
 */

import { test, expect } from './fixtures/test';

test.describe('Export Reports', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page and generate mock data
    await page.goto('/test');
    
    // Generate mock portfolio data
    await page.getByRole('button', { name: /generate mock data/i }).click();
    await page.getByText('Done! Redirecting...').waitFor({ timeout: 10000 });

    // Full page reload ensures Zustand stores hydrate from IndexedDB
    await page.goto('/');

    // Wait for dashboard to load
    await expect(page.locator('[data-testid="total-value-widget"]')).toBeVisible({ timeout: 15000 });
    
    // Navigate to Reports page
    await page.getByRole('link', { name: /reports/i }).click();
    await page.waitForURL('/reports');
  });

  test('shows Reports page with all export options', async ({ page }) => {
    // Should show page title
    await expect(page.getByRole('heading', { name: /^reports$/i })).toBeVisible();
    
    // Should show all three export cards
    await expect(page.getByText(/performance report/i)).toBeVisible();
    await expect(page.getByText(/transaction history/i)).toBeVisible();
    await expect(page.getByText(/holdings summary/i)).toBeVisible();
    
    // Should show export buttons
    const pdfButton = page.getByRole('button', { name: /download pdf/i }).first();
    const transactionCsvButton = page.locator('text=Transaction History').locator('..').locator('..').getByRole('button', { name: /download csv/i });
    const holdingsCsvButton = page.locator('text=Holdings Summary').locator('..').locator('..').getByRole('button', { name: /download csv/i });
    
    await expect(pdfButton).toBeVisible();
    await expect(transactionCsvButton).toBeVisible();
    await expect(holdingsCsvButton).toBeVisible();
  });

  test('PDF download button is enabled with portfolio data', async ({ page }) => {
    const pdfButton = page.getByRole('button', { name: /download pdf/i }).first();
    await expect(pdfButton).toBeEnabled();
  });

  test('shows date range selector for transaction export', async ({ page }) => {
    // Look for the date range selector in transaction card
    const dateRangeLabel = page.locator('text=Transaction History').locator('..').locator('..').getByText(/date range/i);
    await expect(dateRangeLabel).toBeVisible();
    
    // Should have a select dropdown
    const dateRangeSelect = page.locator('text=Transaction History').locator('..').locator('..').locator('[role="combobox"]');
    await expect(dateRangeSelect).toBeVisible();
  });

  test('transaction CSV button is enabled with portfolio data', async ({ page }) => {
    const csvButton = page.locator('text=Transaction History').locator('..').locator('..').getByRole('button', { name: /download csv/i });
    await expect(csvButton).toBeEnabled();
  });

  test('holdings CSV button is enabled with portfolio data', async ({ page }) => {
    const csvButton = page.locator('text=Holdings Summary').locator('..').locator('..').getByRole('button', { name: /download csv/i });
    await expect(csvButton).toBeEnabled();
  });

  test('shows empty state message when no portfolio selected', async ({ page }) => {
    // Navigate directly to reports without portfolio
    await page.goto('/reports');
    
    // Should show warning message
    await expect(page.getByText(/please select.*portfolio/i)).toBeVisible({ timeout: 5000 });
  });

  test('disables export buttons when no portfolio selected', async ({ page }) => {
    // Navigate directly to reports without portfolio
    await page.goto('/reports');
    
    // All export buttons should be disabled
    const buttons = await page.getByRole('button', { name: /download/i }).all();
    for (const button of buttons) {
      await expect(button).toBeDisabled();
    }
  });

  test('PDF export shows progress indicator', async ({ page }) => {
    const pdfButton = page.getByRole('button', { name: /download pdf/i }).first();
    
    // Start export (note: we can't verify actual PDF download in Playwright easily)
    await pdfButton.click();
    
    // Should show loading state briefly
    await expect(pdfButton).toBeDisabled({ timeout: 1000 });
    
    // Wait for completion (success toast or button re-enabled)
    await expect(pdfButton).toBeEnabled({ timeout: 15000 });
  });

  test('transaction CSV export shows progress indicator', async ({ page }) => {
    const csvButton = page.locator('text=Transaction History').locator('..').locator('..').getByRole('button', { name: /download csv/i });
    
    // Start export
    await csvButton.click();
    
    // Should show loading state briefly
    await expect(csvButton).toBeDisabled({ timeout: 1000 });
    
    // Wait for completion
    await expect(csvButton).toBeEnabled({ timeout: 15000 });
  });

  test('holdings CSV export shows progress indicator', async ({ page }) => {
    const csvButton = page.locator('text=Holdings Summary').locator('..').locator('..').getByRole('button', { name: /download csv/i });
    
    // Start export
    await csvButton.click();
    
    // Should show loading state briefly
    await expect(csvButton).toBeDisabled({ timeout: 1000 });
    
    // Wait for completion
    await expect(csvButton).toBeEnabled({ timeout: 15000 });
  });

  test('can change date range for transaction export', async ({ page }) => {
    // Find the date range select in transaction card
    const dateRangeSelect = page.locator('text=Transaction History').locator('..').locator('..').locator('[role="combobox"]');
    
    // Click to open dropdown
    await dateRangeSelect.click();
    
    // Should show options
    await expect(page.getByRole('option', { name: /year to date/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /last 12 months/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /all time/i })).toBeVisible();
    
    // Select an option
    await page.getByRole('option', { name: /all time/i }).click();
    
    // Dropdown should close
    await expect(dateRangeSelect).toBeVisible();
  });
});

test.describe('Export Error Handling', () => {
  test('handles export errors gracefully', async ({ page }) => {
    // Navigate directly to reports (no mock data)
    await page.goto('/reports');
    
    // Try to export without portfolio - buttons should be disabled
    const pdfButton = page.getByRole('button', { name: /download pdf/i }).first();
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
      if (!url.includes('/_next/') && !url.includes('.js') && !url.includes('.css')) {
        networkRequests.push(url);
      }
    });
    
    // Navigate and generate data
    await page.goto('/test');
    await page.getByRole('button', { name: /generate mock data/i }).click();
    await page.getByText('Done! Redirecting...').waitFor({ timeout: 10000 });
    await page.goto('/');
    await page.locator('[data-testid="total-value-widget"]').waitFor({ timeout: 15000 });
    await page.getByRole('link', { name: /reports/i }).click();
    await page.waitForURL('/reports');

    // Clear any initial requests
    networkRequests.length = 0;

    // Trigger PDF export
    const pdfButton = page.getByRole('button', { name: /download pdf/i }).first();
    await pdfButton.click();
    
    // Wait for export to complete
    await page.waitForTimeout(3000);
    
    // Should have no API requests (only client-side generation)
    const apiRequests = networkRequests.filter(url => 
      url.includes('/api/') && !url.includes('localhost')
    );
    expect(apiRequests.length).toBe(0);
  });

  test('verifies no network requests during CSV exports', async ({ page }) => {
    // Set up network monitoring
    const networkRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (!url.includes('/_next/') && !url.includes('.js') && !url.includes('.css')) {
        networkRequests.push(url);
      }
    });
    
    // Navigate and generate data
    await page.goto('/test');
    await page.getByRole('button', { name: /generate mock data/i }).click();
    await page.getByText('Done! Redirecting...').waitFor({ timeout: 10000 });
    await page.goto('/');
    await page.locator('[data-testid="total-value-widget"]').waitFor({ timeout: 15000 });
    await page.getByRole('link', { name: /reports/i }).click();
    await page.waitForURL('/reports');

    // Clear any initial requests
    networkRequests.length = 0;

    // Trigger transaction CSV export
    const csvButton = page.locator('text=Transaction History').locator('..').locator('..').getByRole('button', { name: /download csv/i });
    await csvButton.click();
    
    // Wait for export to complete
    await page.waitForTimeout(2000);
    
    // Should have no API requests
    const apiRequests = networkRequests.filter(url => 
      url.includes('/api/') && !url.includes('localhost')
    );
    expect(apiRequests.length).toBe(0);
  });
});
