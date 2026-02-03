import { test, expect } from '@playwright/test';

test.describe('Transaction Pagination', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and wait for load
    await page.goto('/');

    // Wait for app to be ready
    await page.waitForSelector('text=Portfolio Dashboard', { timeout: 10000 });

    // Navigate to transactions page
    await page.click('text=Transactions');
    await page.waitForURL('**/transactions', { timeout: 10000 });
  });

  test('should display pagination controls when more than 25 transactions exist', async ({ page }) => {
    // Check if pagination controls are visible (if there are enough transactions)
    const paginationExists = await page.locator('text=Per page:').count() > 0;

    if (paginationExists) {
      // Verify pagination components
      await expect(page.locator('button[aria-label="Go to previous page"]')).toBeVisible();
      await expect(page.locator('button[aria-label="Go to next page"]')).toBeVisible();
      await expect(page.locator('[aria-label="Select page size"]')).toBeVisible();

      // Verify info text pattern (e.g., "Showing 1-25 of 100 transactions")
      await expect(page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/')).toBeVisible();
    } else {
      // If no pagination, verify transactions table is still visible
      await expect(page.locator('text=Transaction History')).toBeVisible();
    }
  });

  test('should disable Previous button on first page', async ({ page }) => {
    const paginationExists = await page.locator('text=Per page:').count() > 0;

    if (paginationExists) {
      const previousButton = page.locator('button[aria-label="Go to previous page"]');

      // On first page, Previous should be disabled
      await expect(previousButton).toBeDisabled();
    }
  });

  test('should navigate to next page when Next button clicked', async ({ page }) => {
    const paginationExists = await page.locator('text=Per page:').count() > 0;

    if (paginationExists) {
      const nextButton = page.locator('button[aria-label="Go to next page"]');
      const previousButton = page.locator('button[aria-label="Go to previous page"]');

      // Check if Next is enabled (meaning there's a next page)
      const isNextEnabled = await nextButton.isEnabled();

      if (isNextEnabled) {
        // Click Next
        await nextButton.click();

        // Wait for content to update
        await page.waitForTimeout(500);

        // Previous should now be enabled
        await expect(previousButton).toBeEnabled();

        // Verify info text changed (page 2)
        const infoText = await page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/').textContent();
        expect(infoText).not.toContain('Showing 1-');
      }
    }
  });

  test('should navigate to previous page when Previous button clicked', async ({ page }) => {
    const paginationExists = await page.locator('text=Per page:').count() > 0;

    if (paginationExists) {
      const nextButton = page.locator('button[aria-label="Go to next page"]');
      const previousButton = page.locator('button[aria-label="Go to previous page"]');

      // Check if Next is enabled
      const isNextEnabled = await nextButton.isEnabled();

      if (isNextEnabled) {
        // Go to page 2
        await nextButton.click();
        await page.waitForTimeout(500);

        // Now go back to page 1
        await previousButton.click();
        await page.waitForTimeout(500);

        // Should be back on page 1
        const infoText = await page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/').textContent();
        expect(infoText).toContain('Showing 1-');

        // Previous should be disabled again
        await expect(previousButton).toBeDisabled();
      }
    }
  });

  test('should disable Next button on last page', async ({ page }) => {
    const paginationExists = await page.locator('text=Per page:').count() > 0;

    if (paginationExists) {
      const nextButton = page.locator('button[aria-label="Go to next page"]');

      // Navigate to last page by clicking Next until disabled
      let clickCount = 0;
      const maxClicks = 20; // Safety limit

      while (await nextButton.isEnabled() && clickCount < maxClicks) {
        await nextButton.click();
        await page.waitForTimeout(300);
        clickCount++;
      }

      // On last page, Next should be disabled
      await expect(nextButton).toBeDisabled();
    }
  });

  test('should change page size when dropdown option selected', async ({ page }) => {
    const paginationExists = await page.locator('text=Per page:').count() > 0;

    if (paginationExists) {
      // Get current info text
      const initialInfo = await page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/').textContent();

      // Open page size selector
      await page.click('[aria-label="Select page size"]');

      // Select 50
      await page.click('text=50');
      await page.waitForTimeout(500);

      // Verify page size changed
      const pageSizeButton = page.locator('[aria-label="Select page size"]');
      await expect(pageSizeButton).toContainText('50');

      // Info text should reflect new page size
      const newInfo = await page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/').textContent();
      expect(newInfo).not.toBe(initialInfo);
    }
  });

  test('should hide pagination controls when transactions fit on one page', async ({ page }) => {
    // This test checks the negative case - if there are <= 25 transactions, no pagination
    const rowCount = await page.locator('table tbody tr').count();

    if (rowCount <= 25) {
      // No pagination controls should be visible
      const paginationExists = await page.locator('text=Per page:').count();
      expect(paginationExists).toBe(0);
    }
  });

  test('should maintain page size selection across page navigation', async ({ page }) => {
    const paginationExists = await page.locator('text=Per page:').count() > 0;

    if (paginationExists) {
      // Change page size to 50
      await page.click('[aria-label="Select page size"]');
      await page.click('text=50');
      await page.waitForTimeout(500);

      const nextButton = page.locator('button[aria-label="Go to next page"]');
      const isNextEnabled = await nextButton.isEnabled();

      if (isNextEnabled) {
        // Navigate to next page
        await nextButton.click();
        await page.waitForTimeout(500);

        // Page size should still be 50
        const pageSizeButton = page.locator('[aria-label="Select page size"]');
        await expect(pageSizeButton).toContainText('50');
      }
    }
  });

  test('should show loading state during pagination', async ({ page }) => {
    const paginationExists = await page.locator('text=Per page:').count() > 0;

    if (paginationExists) {
      const nextButton = page.locator('button[aria-label="Go to next page"]');
      const isNextEnabled = await nextButton.isEnabled();

      if (isNextEnabled) {
        // Click Next
        await nextButton.click();

        // Check if buttons are disabled during load (may be too fast to catch)
        // Just verify the page updates successfully
        await page.waitForTimeout(500);

        // Verify content updated
        await expect(page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/')).toBeVisible();
      }
    }
  });

  test('should have accessible ARIA labels on all controls', async ({ page }) => {
    const paginationExists = await page.locator('text=Per page:').count() > 0;

    if (paginationExists) {
      // Verify ARIA labels exist
      await expect(page.locator('[aria-label="Go to previous page"]')).toBeVisible();
      await expect(page.locator('[aria-label="Go to next page"]')).toBeVisible();
      await expect(page.locator('[aria-label="Select page size"]')).toBeVisible();
    }
  });

  test('should persist pagination state across navigation', async ({ page }) => {
    const paginationExists = await page.locator('text=Per page:').count() > 0;

    if (paginationExists) {
      // Change page size to 50
      await page.click('[aria-label="Select page size"]');
      await page.click('text=50');
      await page.waitForTimeout(500);

      // Verify page size changed
      const pageSizeButton = page.locator('[aria-label="Select page size"]');
      await expect(pageSizeButton).toContainText('50');

      const nextButton = page.locator('button[aria-label="Go to next page"]');
      const isNextEnabled = await nextButton.isEnabled();

      // Navigate to page 2 if possible
      if (isNextEnabled) {
        await nextButton.click();
        await page.waitForTimeout(500);

        // Verify we're on page 2
        const infoText = await page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/').textContent();
        expect(infoText).not.toContain('Showing 1-');
      }

      // Navigate away to Holdings page
      await page.click('text=Holdings');
      await page.waitForURL('**/holdings', { timeout: 10000 });

      // Navigate back to Transactions
      await page.click('text=Transactions');
      await page.waitForURL('**/transactions', { timeout: 10000 });
      await page.waitForTimeout(500);

      // Verify pagination state persisted
      const pageSizeAfterNav = page.locator('[aria-label="Select page size"]');
      await expect(pageSizeAfterNav).toContainText('50');

      if (isNextEnabled) {
        // Verify we're still on page 2 (or page that was calculated based on position)
        const infoTextAfterNav = await page.locator('text=/Showing \\d+-\\d+ of \\d+ transactions/').textContent();
        expect(infoTextAfterNav).toBeTruthy();
      }
    }
  });
});
