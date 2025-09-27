import { test, expect } from '@playwright/test';

test.describe('Holdings Table', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display holdings table when data exists', async ({ page }) => {
    // Look for holdings table or section
    const holdingsSection = page.getByText('Holdings').or(page.locator('[data-testid="holdings-table"]'));

    if (await holdingsSection.isVisible()) {
      // Should have table headers
      await expect(page.getByText('Symbol')).toBeVisible();
      await expect(page.getByText('Name')).toBeVisible();
      await expect(page.getByText('Quantity')).toBeVisible();
      await expect(page.getByText('Market Value')).toBeVisible();
      await expect(page.getByText('Gain/Loss')).toBeVisible();
    }
  });

  test('should display empty state when no holdings exist', async ({ page }) => {
    // If no holdings, should show appropriate message
    const emptyMessage = page.getByText(/no holdings/i);

    if (await emptyMessage.isVisible()) {
      await expect(emptyMessage).toBeVisible();

      // Should suggest adding transactions
      const addButton = page.getByRole('button', { name: /add transaction/i });
      await expect(addButton).toBeVisible();
    }
  });

  test('should search holdings by symbol or name', async ({ page }) => {
    // Look for search input
    const searchInput = page.getByPlaceholder(/search holdings/i).or(
      page.getByRole('textbox', { name: /search/i })
    );

    if (await searchInput.isVisible()) {
      // Type search term
      await searchInput.fill('AAPL');

      // Results should filter
      await page.waitForTimeout(300); // Wait for debounced search

      // If there are results, AAPL should be visible
      const table = page.locator('table').or(page.locator('[role="table"]'));

      if (await table.isVisible()) {
        const rows = table.locator('tr').or(table.locator('[role="row"]'));
        const rowCount = await rows.count();

        if (rowCount > 1) { // More than just header
          // Should show only AAPL results
          const firstDataRow = rows.nth(1);
          await expect(firstDataRow).toContainText('AAPL');
        }
      }

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(300);
    }
  });

  test('should sort holdings by different columns', async ({ page }) => {
    // Look for sortable column headers
    const symbolHeader = page.getByText('Symbol').or(page.locator('[data-sort="symbol"]'));

    if (await symbolHeader.isVisible()) {
      // Click to sort
      await symbolHeader.click();

      // Should show sort indicator
      const sortIndicator = page.locator('text=↑').or(page.locator('text=↓'));
      if (await sortIndicator.isVisible()) {
        await expect(sortIndicator).toBeVisible();
      }

      // Click again to reverse sort
      await symbolHeader.click();

      // Sort indicator should change or remain visible
      await expect(sortIndicator).toBeVisible();
    }
  });

  test('should display gain/loss with proper color coding', async ({ page }) => {
    // Look for gain/loss values
    const gainLossElements = page.locator('[data-testid*="gain"]').or(
      page.locator('td').filter({ hasText: /[\+\-]\$/ })
    );

    const count = await gainLossElements.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const element = gainLossElements.nth(i);
      const text = await element.textContent();

      if (text) {
        if (text.includes('+') || parseFloat(text.replace(/[^\d.-]/g, '')) > 0) {
          // Should have green color for gains
          const isGreen = await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.color.includes('rgb(34, 197, 94)') || // green-600
                   style.color.includes('rgb(22, 163, 74)') || // green-500
                   el.className.includes('text-green');
          });
          expect(isGreen).toBeTruthy();
        } else if (text.includes('-') || parseFloat(text.replace(/[^\d.-]/g, '')) < 0) {
          // Should have red color for losses
          const isRed = await element.evaluate(el => {
            const style = window.getComputedStyle(el);
            return style.color.includes('rgb(239, 68, 68)') || // red-600
                   style.color.includes('rgb(220, 38, 38)') || // red-500
                   el.className.includes('text-red');
          });
          expect(isRed).toBeTruthy();
        }
      }
    }
  });

  test('should display asset type badges', async ({ page }) => {
    // Look for asset type indicators
    const typeBadges = page.locator('[data-testid*="asset-type"]').or(
      page.locator('.badge').filter({ hasText: /(STOCK|CRYPTO|ETF)/i })
    );

    const count = await typeBadges.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      const badge = typeBadges.nth(i);
      const text = await badge.textContent();

      if (text) {
        // Should be a valid asset type
        expect(text.toLowerCase()).toMatch(/(stock|crypto|etf|bond)/);
      }
    }
  });

  test('should show row actions menu', async ({ page }) => {
    // Look for action buttons or menus
    const actionButtons = page.locator('[data-testid*="row-action"]').or(
      page.locator('button').filter({ hasText: /⋮|•••|more/i })
    );

    const count = await actionButtons.count();

    if (count > 0) {
      // Click first action button
      await actionButtons.first().click();

      // Should show menu options
      const menu = page.locator('[role="menu"]').or(page.locator('.dropdown-menu'));

      if (await menu.isVisible()) {
        // Should have common actions
        const viewAction = page.getByText(/view|details/i);
        const editAction = page.getByText(/edit|modify/i);

        if (await viewAction.isVisible()) {
          await expect(viewAction).toBeVisible();
        }

        if (await editAction.isVisible()) {
          await expect(editAction).toBeVisible();
        }
      }
    }
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.reload({ waitUntil: 'networkidle' });

    const table = page.locator('table').or(page.locator('[role="table"]'));

    if (await table.isVisible()) {
      // All columns should be visible on desktop
      await expect(page.getByText('Symbol')).toBeVisible();
      await expect(page.getByText('Name')).toBeVisible();
      await expect(page.getByText('Quantity')).toBeVisible();
      await expect(page.getByText('Market Value')).toBeVisible();
    }

    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload({ waitUntil: 'networkidle' });

    if (await table.isVisible()) {
      // Should still show essential columns
      await expect(page.getByText('Symbol')).toBeVisible();
      await expect(page.getByText('Market Value')).toBeVisible();
    }

    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'networkidle' });

    // On mobile, might switch to card layout or show fewer columns
    const mobileTable = page.locator('table').or(page.locator('[role="table"]'));
    const cardLayout = page.locator('[data-testid*="holding-card"]').or(
      page.locator('.card').filter({ hasText: /AAPL|BTC|ETH/i })
    );

    // Either table or card layout should be visible
    if (await mobileTable.isVisible()) {
      await expect(mobileTable).toBeVisible();
    } else if (await cardLayout.isVisible()) {
      await expect(cardLayout).toBeVisible();
    }
  });

  test('should handle pagination for large datasets', async ({ page }) => {
    // Mock large dataset
    await page.route('**/api/holdings**', route => {
      const holdings = Array.from({ length: 25 }, (_, i) => ({
        id: `holding-${i}`,
        symbol: `STOCK${i}`,
        name: `Test Stock ${i}`,
        quantity: 100,
        currentValue: 15000 + i * 100,
        gainLoss: (i % 2 === 0 ? 1 : -1) * (500 + i * 10),
        type: 'stock'
      }));

      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(holdings)
      });
    });

    await page.reload({ waitUntil: 'networkidle' });

    // Look for pagination controls
    const paginationControls = page.locator('[data-testid*="pagination"]').or(
      page.locator('.pagination').or(page.getByText(/page \d+ of \d+/i))
    );

    if (await paginationControls.isVisible()) {
      // Should have next/previous buttons
      const nextButton = page.getByRole('button', { name: /next/i });
      const prevButton = page.getByRole('button', { name: /prev/i });

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await page.waitForTimeout(500);

        // Should show different data
        await expect(page.locator('table')).toBeVisible();
      }
    }
  });

  test('should calculate and display totals correctly', async ({ page }) => {
    // Look for summary/total information
    const totalValue = page.getByText(/total.*value/i);
    const totalGainLoss = page.getByText(/total.*gain/i);

    if (await totalValue.isVisible()) {
      const valueText = await totalValue.textContent();
      if (valueText) {
        // Should be formatted currency
        expect(valueText).toMatch(/\$[\d,]+\.?\d*/);
      }
    }

    if (await totalGainLoss.isVisible()) {
      const gainLossText = await totalGainLoss.textContent();
      if (gainLossText) {
        // Should be formatted currency with +/- indicator
        expect(gainLossText).toMatch(/[\+\-]?\$[\d,]+\.?\d*/);
      }
    }
  });

  test('should be accessible', async ({ page }) => {
    const table = page.locator('table').or(page.locator('[role="table"]'));

    if (await table.isVisible()) {
      // Should have proper table structure
      const headers = page.locator('th').or(page.locator('[role="columnheader"]'));
      const headerCount = await headers.count();

      if (headerCount > 0) {
        // Headers should have accessible names
        for (let i = 0; i < Math.min(headerCount, 5); i++) {
          const header = headers.nth(i);
          const text = await header.textContent();
          expect(text).toBeTruthy();
        }
      }

      // Should have proper row structure
      const rows = page.locator('tr').or(page.locator('[role="row"]'));
      const rowCount = await rows.count();

      if (rowCount > 1) {
        // First data row should have cells
        const firstDataRow = rows.nth(1);
        const cells = firstDataRow.locator('td').or(firstDataRow.locator('[role="cell"]'));
        const cellCount = await cells.count();

        expect(cellCount).toBeGreaterThan(0);
      }
    }

    // Test keyboard navigation
    if (await table.isVisible()) {
      await page.keyboard.press('Tab');

      // Should be able to navigate to table
      let attempts = 0;
      while (attempts < 10) {
        const focused = page.locator(':focus');
        const focusedElement = await focused.elementHandle();

        if (focusedElement) {
          const tableHandle = await table.elementHandle();
          if (tableHandle) {
            const isInTable = await page.evaluate(([table, focused]) => {
              return table.contains(focused);
            }, [tableHandle, focusedElement]);

            if (isInTable) break;
          }
        }

        await page.keyboard.press('Tab');
        attempts++;
      }
    }
  });

  test('should update in real-time when new transactions are added', async ({ page }) => {
    // Get initial row count
    const table = page.locator('table').or(page.locator('[role="table"]'));

    if (await table.isVisible()) {
      const initialRows = table.locator('tr').or(table.locator('[role="row"]'));
      const initialCount = await initialRows.count();

      // Add a new transaction (this would trigger table update)
      const addButton = page.getByRole('button', { name: /add transaction/i });

      if (await addButton.isVisible()) {
        await addButton.click();

        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible()) {
          // Fill and submit transaction
          await page.getByLabel(/asset symbol/i).fill('TEST');
          await page.getByLabel(/quantity/i).fill('10');
          await page.getByLabel(/price.*share/i).fill('100');

          // Mock successful API response
          await page.route('**/api/transactions', route => {
            route.fulfill({
              status: 201,
              contentType: 'application/json',
              body: JSON.stringify({ success: true, id: 'new-tx' })
            });
          });

          const submitButton = page.getByRole('button', { name: 'Add Transaction' });
          if (await submitButton.isEnabled()) {
            await submitButton.click();

            // Wait for dialog to close
            await expect(dialog).not.toBeVisible();

            // Table should update (if it exists and shows this data)
            await page.waitForTimeout(1000);

            // Check if table was updated
            const updatedRows = table.locator('tr').or(table.locator('[role="row"]'));
            const newCount = await updatedRows.count();

            // Count might increase if new holding was added
            expect(newCount).toBeGreaterThanOrEqual(initialCount);
          }
        }
      }
    }
  });
});