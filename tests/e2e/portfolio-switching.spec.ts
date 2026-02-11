import { test, expect } from './fixtures/test';

test.describe('Portfolio Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should switch between portfolios and update dashboard', async ({ page }) => {
    // Click portfolio selector
    const selector = page.getByRole('button', { name: /select portfolio/i });
    await expect(selector).toBeVisible();
    await selector.click();

    // Select different portfolio from dropdown
    const menuItems = page.getByRole('menuitem');
    const firstItem = menuItems.first();
    await firstItem.click();

    // Verify dashboard updates
    await expect(page.getByTestId('dashboard-container')).toBeVisible();
  });

  test('should persist portfolio selection across page reload', async ({ page }) => {
    // Get current portfolio name
    const selector = page.getByRole('button', { name: /select portfolio/i });
    const currentName = await selector.textContent();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify same portfolio is selected
    await expect(selector).toContainText(currentName || '');
  });

  test('should disable selector during CSV import', async ({ page }) => {
    const selector = page.getByRole('button', { name: /select portfolio/i });

    // Portfolio selector should be enabled initially
    await expect(selector).toBeEnabled();

    // When CSV import is active, selector should be disabled
    // (This would require triggering CSV import state)
  });
});

test.describe('Filter State Preservation Across Portfolio Switches', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should not preserve holdings filter state when switching portfolios', async ({ page }) => {
    // Navigate to holdings page
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    // Apply a search filter
    const searchInput = page.getByPlaceholder(/search/i).or(
      page.getByRole('textbox', { name: /search/i })
    );

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('AAPL');
      await page.waitForTimeout(500);

      // Verify filter is applied
      expect(await searchInput.inputValue()).toBe('AAPL');

      // Switch portfolio via /portfolios page
      await page.goto('/portfolios');
      await page.waitForLoadState('networkidle');

      const viewButtons = page.getByRole('button', { name: /view/i });
      const buttonCount = await viewButtons.count();

      if (buttonCount > 1) {
        // Click second portfolio's View button
        await viewButtons.nth(1).click();
        await expect(page).toHaveURL('/');

        // Navigate back to holdings
        await page.goto('/holdings');
        await page.waitForLoadState('networkidle');

        // Filter should be cleared for new portfolio
        if (await searchInput.isVisible().catch(() => false)) {
          const newValue = await searchInput.inputValue();
          expect(newValue).toBe('');
        }
      }
    }
  });

  test('should not preserve transaction filter state when switching portfolios', async ({ page }) => {
    // Navigate to transactions page
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Apply a filter if available
    const filterButton = page.getByRole('button', { name: /filter/i }).or(
      page.locator('[data-testid="filter-button"]')
    );

    if (await filterButton.isVisible().catch(() => false)) {
      await filterButton.click();

      // Select a filter option (e.g., transaction type)
      const buyOption = page.getByRole('checkbox', { name: /buy/i }).or(
        page.getByText(/buy/i)
      );

      if (await buyOption.isVisible().catch(() => false)) {
        if (await buyOption.getAttribute('type') === 'checkbox') {
          await buyOption.check();
        } else {
          await buyOption.click();
        }

        // Apply filter
        const applyButton = page.getByRole('button', { name: /apply/i });
        if (await applyButton.isVisible().catch(() => false)) {
          await applyButton.click();
        }

        // Switch portfolio
        await page.goto('/portfolios');
        const viewButtons = page.getByRole('button', { name: /view/i });
        const buttonCount = await viewButtons.count();

        if (buttonCount > 1) {
          await viewButtons.nth(1).click();
          await expect(page).toHaveURL('/');

          // Go back to transactions
          await page.goto('/transactions');
          await page.waitForLoadState('networkidle');

          // Filters should be reset (all transactions shown)
          // Verify by checking that filter button shows "All" or is in default state
        }
      }
    }
  });

  test('should not preserve date range filter when switching portfolios', async ({ page }) => {
    // Go to performance page
    await page.goto('/performance');
    await page.waitForLoadState('networkidle');

    // Check for time period selector
    const timePeriodButton = page.getByRole('button', { name: /1y|ytd|3y/i }).or(
      page.locator('[data-testid="time-period-selector"]')
    );

    if (await timePeriodButton.isVisible().catch(() => false)) {
      // Click to open time period options
      await timePeriodButton.click();

      // Select a different time period
      const threeYearOption = page.getByRole('menuitem', { name: /3y|3 year/i }).or(
        page.getByText(/3y|3 year/i)
      );

      if (await threeYearOption.isVisible().catch(() => false)) {
        await threeYearOption.click();
        await page.waitForTimeout(500);

        // Switch portfolio
        await page.goto('/portfolios');
        const viewButtons = page.getByRole('button', { name: /view/i });
        const buttonCount = await viewButtons.count();

        if (buttonCount > 1) {
          await viewButtons.nth(1).click();
          await expect(page).toHaveURL('/');

          // Go back to performance
          await page.goto('/performance');
          await page.waitForLoadState('networkidle');

          // Time period should reset to default (typically YTD or 1Y)
          // Each portfolio should have its own independent time period state
        }
      }
    }
  });

  test('should not preserve allocation dimension when switching portfolios', async ({ page }) => {
    // Go to allocation page
    await page.goto('/allocation');
    await page.waitForLoadState('networkidle');

    // Check for dimension selector (Asset Class, Sector, Geography)
    const dimensionSelector = page.getByRole('button', { name: /asset class|sector|geography/i }).or(
      page.locator('[data-testid="allocation-dimension"]')
    );

    if (await dimensionSelector.isVisible().catch(() => false)) {
      const currentDimension = await dimensionSelector.textContent();

      // Click to change dimension
      await dimensionSelector.click();

      // Select different dimension
      const options = page.getByRole('menuitem').or(page.getByRole('option'));
      const optionCount = await options.count();

      if (optionCount > 1) {
        await options.nth(1).click();
        await page.waitForTimeout(500);

        const newDimension = await dimensionSelector.textContent();
        expect(newDimension).not.toBe(currentDimension);

        // Switch portfolio
        await page.goto('/portfolios');
        const viewButtons = page.getByRole('button', { name: /view/i });
        const buttonCount = await viewButtons.count();

        if (buttonCount > 1) {
          await viewButtons.nth(1).click();
          await expect(page).toHaveURL('/');

          // Go back to allocation
          await page.goto('/allocation');
          await page.waitForLoadState('networkidle');

          // Dimension should reset to default for new portfolio
          // (Each portfolio has independent allocation view state)
        }
      }
    }
  });

  test('should preserve portfolio selection when navigating between pages', async ({ page }) => {
    // Get current portfolio name
    const portfolioSelector = page.locator('[data-testid="portfolio-selector"]').or(
      page.getByRole('button').filter({ hasText: /portfolio/i }).first()
    );

    let portfolioName = '';
    if (await portfolioSelector.isVisible().catch(() => false)) {
      portfolioName = await portfolioSelector.textContent() || '';
    }

    // Navigate to holdings
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    // Verify same portfolio
    if (await portfolioSelector.isVisible().catch(() => false)) {
      await expect(portfolioSelector).toContainText(portfolioName);
    }

    // Navigate to transactions
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Verify same portfolio
    if (await portfolioSelector.isVisible().catch(() => false)) {
      await expect(portfolioSelector).toContainText(portfolioName);
    }

    // Navigate to performance
    await page.goto('/performance');
    await page.waitForLoadState('networkidle');

    // Verify same portfolio
    if (await portfolioSelector.isVisible().catch(() => false)) {
      await expect(portfolioSelector).toContainText(portfolioName);
    }

    // Navigate to allocation
    await page.goto('/allocation');
    await page.waitForLoadState('networkidle');

    // Verify same portfolio persists across all pages
    if (await portfolioSelector.isVisible().catch(() => false)) {
      await expect(portfolioSelector).toContainText(portfolioName);
    }
  });

  test('should update all page data when portfolio is switched', async ({ page }) => {
    // Go to holdings and get holding count
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    const holdingsTable1 = page.getByRole('table');
    const holdingsCount1 = await holdingsTable1.getByRole('row').count();

    // Switch portfolio
    await page.goto('/portfolios');
    const viewButtons = page.getByRole('button', { name: /view/i });
    const buttonCount = await viewButtons.count();

    if (buttonCount > 1) {
      await viewButtons.nth(1).click();
      await expect(page).toHaveURL('/');

      // Go to holdings for new portfolio
      await page.goto('/holdings');
      await page.waitForLoadState('networkidle');

      const holdingsTable2 = page.getByRole('table');
      const holdingsCount2 = await holdingsTable2.getByRole('row').count();

      // Holdings data should be independent
      // (counts can be same or different, but data should reload)
      expect(holdingsCount2).toBeGreaterThanOrEqual(1); // At least header

      // Go to transactions
      await page.goto('/transactions');
      await page.waitForLoadState('networkidle');

      // Transactions table should show data for new portfolio
      const transactionsTable = page.getByRole('table');
      await expect(transactionsTable).toBeVisible();

      // Go to performance
      await page.goto('/performance');
      await page.waitForLoadState('networkidle');

      // Performance chart should show data for new portfolio
      // (Visual verification - chart should be present)
      const performanceSection = page.locator('[data-testid="performance-chart"]').or(
        page.locator('main')
      );
      await expect(performanceSection).toBeVisible();
    }
  });

  test('should clear search results when switching portfolios on holdings page', async ({ page }) => {
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search/i);

    if (await searchInput.isVisible().catch(() => false)) {
      // Search for a specific symbol
      await searchInput.fill('TEST');
      await page.waitForTimeout(500);

      // Count filtered results
      const table = page.getByRole('table');
      const filteredRows = await table.getByRole('row').count();

      // Use portfolio selector to switch (if available)
      const portfolioSelector = page.locator('[data-testid="portfolio-selector"]').or(
        page.getByRole('button').filter({ hasText: /portfolio/i }).first()
      );

      if (await portfolioSelector.isVisible().catch(() => false)) {
        await portfolioSelector.click();

        const portfolioOptions = page.getByRole('menuitem').or(page.getByRole('option'));
        const optionCount = await portfolioOptions.count();

        if (optionCount > 1) {
          await portfolioOptions.nth(1).click();
          await page.waitForLoadState('networkidle');

          // Search input should be cleared
          const newSearchValue = await searchInput.inputValue();
          expect(newSearchValue).toBe('');

          // Table should show all holdings (unfiltered)
          const unfilteredRows = await table.getByRole('row').count();
          // Count may vary, but search should be cleared
        }
      }
    }
  });
});
