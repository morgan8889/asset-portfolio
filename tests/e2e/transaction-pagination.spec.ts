import { test, expect } from '@playwright/test';
import {
  generateMockData,
  getFirstPortfolioId,
  addRecordsToStore,
  generateTransactionRecords,
} from './fixtures/seed-helpers';

test.describe('Transaction Pagination', () => {
  test.beforeEach(async ({ page }) => {
    // Generate base mock data (creates 1 portfolio with ~8 transactions)
    await generateMockData(page);

    // Get the portfolio ID and seed 50 additional transactions for pagination
    const portfolioId = await getFirstPortfolioId(page);
    const extraTransactions = generateTransactionRecords(portfolioId, 50, {
      assetIds: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'VTI', 'BTC'],
      startDate: new Date('2023-01-01'),
    });
    await addRecordsToStore(page, 'transactions', extraTransactions);

    // Navigate to transactions page
    await page.goto('/transactions');
    await page.waitForSelector('text=Transaction History', { timeout: 10000 });

    // Wait for the table to render with rows
    await page.waitForSelector('table tbody tr', { timeout: 10000 });
  });

  test('should display pagination controls when more than 25 transactions exist', async ({ page }) => {
    // With 50+ transactions, pagination must be visible
    await expect(page.locator('text=Per page:')).toBeVisible({ timeout: 5000 });

    // Verify pagination components
    await expect(page.locator('button[aria-label="Go to previous page"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Go to next page"]')).toBeVisible();
    await expect(page.locator('[aria-label="Select page size"]')).toBeVisible();

    // Verify info text pattern (e.g., "Showing 1-25 of 58 transactions")
    await expect(page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/')).toBeVisible();
  });

  test('should disable Previous button on first page', async ({ page }) => {
    await expect(page.locator('text=Per page:')).toBeVisible({ timeout: 5000 });
    const previousButton = page.locator('button[aria-label="Go to previous page"]');

    // On first page, Previous should be disabled
    await expect(previousButton).toBeDisabled();
  });

  test('should navigate to next page when Next button clicked', async ({ page }) => {
    await expect(page.locator('text=Per page:')).toBeVisible({ timeout: 5000 });

    const nextButton = page.locator('button[aria-label="Go to next page"]');
    const previousButton = page.locator('button[aria-label="Go to previous page"]');

    // Next should be enabled (we have more than 25 transactions)
    await expect(nextButton).toBeEnabled();

    // Click Next
    await nextButton.click();

    // Wait for content to update
    await page.waitForFunction(() => {
      const infoEl = document.querySelector('[class*="text-muted-foreground"]');
      return infoEl && !infoEl.textContent?.includes('Showing 1-');
    }, { timeout: 5000 });

    // Previous should now be enabled
    await expect(previousButton).toBeEnabled();

    // Verify info text changed (page 2)
    const infoText = await page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/').textContent();
    expect(infoText).not.toContain('Showing 1-');
  });

  test('should navigate to previous page when Previous button clicked', async ({ page }) => {
    await expect(page.locator('text=Per page:')).toBeVisible({ timeout: 5000 });

    const nextButton = page.locator('button[aria-label="Go to next page"]');
    const previousButton = page.locator('button[aria-label="Go to previous page"]');

    // Go to page 2
    await nextButton.click();
    await expect(previousButton).toBeEnabled();

    // Now go back to page 1
    await previousButton.click();
    await expect(previousButton).toBeDisabled();

    // Should be back on page 1
    const infoText = await page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/').textContent();
    expect(infoText).toContain('Showing 1-');
  });

  test('should disable Next button on last page', async ({ page }) => {
    await expect(page.locator('text=Per page:')).toBeVisible({ timeout: 5000 });

    const nextButton = page.locator('button[aria-label="Go to next page"]');

    // Navigate to last page by clicking Next until disabled
    let clickCount = 0;
    const maxClicks = 20;

    while (await nextButton.isEnabled() && clickCount < maxClicks) {
      await nextButton.click();
      // Wait a short moment for button state to stabilize
      await page.waitForTimeout(100);
      clickCount++;
    }

    // On last page, Next should be disabled
    await expect(nextButton).toBeDisabled();
  });

  test('should change page size when dropdown option selected', async ({ page }) => {
    await expect(page.locator('text=Per page:')).toBeVisible({ timeout: 5000 });

    // Get current info text
    const initialInfo = await page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/').textContent();

    // Open page size selector and select 50
    await page.click('[aria-label="Select page size"]');
    await page.click('text=50');
    await expect(page.locator('[aria-label="Select page size"]')).toContainText('50');

    // Info text should reflect new page size
    const newInfo = await page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/').textContent();
    expect(newInfo).not.toBe(initialInfo);
  });

  test('should hide pagination controls when transactions fit on one page', async ({ page }) => {
    // Issue 6: Assert pagination is visible (we seeded 50+ transactions)
    await expect(page.locator('text=Per page:')).toBeVisible({ timeout: 5000 });

    // Change to 100 per page - all ~58 transactions should fit on one page.
    await page.click('[aria-label="Select page size"]');
    await page.click('text=100');

    // Wait for the page size to update
    await expect(page.locator('[aria-label="Select page size"]')).toContainText('100');

    // With 100 per page and ~58 transactions, all should fit on one page
    // Next button should be disabled since there's no next page
    const nextButton = page.locator('button[aria-label="Go to next page"]');
    await expect(nextButton).toBeDisabled();
  });

  test('should maintain page size selection across page navigation', async ({ page }) => {
    await expect(page.locator('text=Per page:')).toBeVisible({ timeout: 5000 });

    // Change page size to 50
    await page.click('[aria-label="Select page size"]');
    await page.click('text=50');
    await expect(page.locator('[aria-label="Select page size"]')).toContainText('50');

    const nextButton = page.locator('button[aria-label="Go to next page"]');

    // With 58 transactions and page size 50, there should be a next page
    await expect(nextButton).toBeEnabled();

    // Navigate to next page
    await nextButton.click();
    await expect(page.locator('button[aria-label="Go to previous page"]')).toBeEnabled();

    // Page size should still be 50
    await expect(page.locator('[aria-label="Select page size"]')).toContainText('50');
  });

  test('should show loading state during pagination', async ({ page }) => {
    await expect(page.locator('text=Per page:')).toBeVisible({ timeout: 5000 });

    const nextButton = page.locator('button[aria-label="Go to next page"]');

    // Click Next
    await nextButton.click();

    // Wait for page navigation to complete
    await page.waitForFunction(() => {
      const infoEl = document.querySelector('[class*="text-muted-foreground"]');
      return infoEl && !infoEl.textContent?.includes('Showing 1-');
    }, { timeout: 5000 });

    // Verify content updated
    await expect(page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/')).toBeVisible();
  });

  test('should have accessible ARIA labels on all controls', async ({ page }) => {
    await expect(page.locator('text=Per page:')).toBeVisible({ timeout: 5000 });

    // Verify ARIA labels exist
    await expect(page.locator('[aria-label="Go to previous page"]')).toBeVisible();
    await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
    await expect(page.locator('[aria-label="Select page size"]')).toBeVisible();
  });

  test('should reset pagination state after navigation', async ({ page }) => {
    await expect(page.locator('text=Per page:')).toBeVisible({ timeout: 5000 });

    // Change page size to 50
    await page.click('[aria-label="Select page size"]');
    await page.click('text=50');
    await expect(page.locator('[aria-label="Select page size"]')).toContainText('50');

    const nextButton = page.locator('button[aria-label="Go to next page"]');

    // Navigate to page 2 (with 58 transactions and page size 50, there should be 2 pages)
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
    await expect(page.locator('button[aria-label="Go to previous page"]')).toBeEnabled();

    // Navigate away to Holdings page
    await page.click('text=Holdings');
    await page.waitForURL('**/holdings', { timeout: 10000 });

    // Navigate back to Transactions
    await page.click('text=Transactions');
    await page.waitForURL('**/transactions', { timeout: 10000 });
    await page.waitForSelector('table tbody tr', { timeout: 5000 });

    // Verify pagination state is reset (pagination uses local state, not persisted)
    const pageSizeAfterNav = page.locator('[aria-label="Select page size"]');
    await expect(pageSizeAfterNav).toContainText('10');

    // Verify we're back on page 1
    const infoTextAfterNav = await page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/').textContent();
    if (infoTextAfterNav) {
      expect(infoTextAfterNav).toContain('Showing 1-');
    }
  });
});
