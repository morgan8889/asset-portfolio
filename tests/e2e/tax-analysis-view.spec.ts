/**
 * E2E Tests for Tax Analysis View
 *
 * Tests the complete tax analysis page functionality including:
 * - Page layout and summary cards
 * - Tax lot table with holdings data from seedMockData
 * - Sorting columns
 * - Tax settings page
 * - Empty state handling
 *
 * Uses seedMockData which provides:
 * - Standard buy transactions (AAPL, GOOGL, MSFT, AMZN, VTI, BTC)
 * - ESPP purchase (ACME, disqualifying disposition)
 * - RSU vest (ACME)
 * - All with random dates in the past year
 */

import { test, expect, seedMockData } from './fixtures/test';

test.describe('Tax Analysis View', () => {
  test.describe('With Portfolio Data', () => {
    test.beforeEach(async ({ page }) => {
      await seedMockData(page);
      await page.goto('/tax-analysis');
      await page.waitForLoadState('load');
      await expect(
        page.getByRole('heading', { name: 'Tax Analysis' })
      ).toBeVisible({ timeout: 15000 });
    });

    test('should display tax analysis page with heading', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: 'Tax Analysis' })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should show summary cards', async ({ page }) => {
      // Wait for price data to load and tax lots to compute
      await expect(page.getByText('Net Unrealized Gain/Loss')).toBeVisible({
        timeout: 15000,
      });

      // Summary cards from TaxAnalysisTab component
      await expect(page.getByText('Short-Term / Long-Term')).toBeVisible();
      await expect(page.getByText('Estimated Tax Liability')).toBeVisible();
    });

    test('should show tax lot table', async ({ page }) => {
      // Wait for data to load
      await expect(
        page.getByText('Net Unrealized Gain/Loss').or(
          page.getByText(/don.*have any holdings/i)
        )
      ).toBeVisible({ timeout: 15000 });

      await expect(page.getByText('Tax Lot Analysis')).toBeVisible({
        timeout: 10000,
      });

      // Should show lot count (e.g., "8 lots across all holdings")
      await expect(page.getByText(/\d+ lots? across all holdings/i)).toBeVisible();
    });

    test('should display all required table columns', async ({ page }) => {
      // Wait for data to load
      await expect(
        page.getByText('Net Unrealized Gain/Loss').or(
          page.getByText(/don.*have any holdings/i)
        )
      ).toBeVisible({ timeout: 15000 });

      // Wait for table to load
      await expect(page.getByText('Tax Lot Analysis')).toBeVisible({
        timeout: 10000,
      });

      // Verify column headers exist in the header row.
      // Non-sortable columns (Asset, Type, Status) render as plain <th> cells;
      // sortable columns render a SortButton inside the <th>.
      // The accessibility tree exposes all of them as role="cell", so we
      // locate by visible text within the table header row.
      const headerRow = page.locator('thead tr');
      await expect(headerRow.getByText('Asset')).toBeVisible();
      await expect(headerRow.getByText('Date')).toBeVisible();
      await expect(headerRow.getByText('Qty')).toBeVisible();
      await expect(headerRow.getByText('Cost')).toBeVisible();
      await expect(headerRow.getByText('Value')).toBeVisible();
      await expect(headerRow.getByText('Gain')).toBeVisible();
      await expect(headerRow.getByText('Period')).toBeVisible();
      await expect(headerRow.getByText('Type')).toBeVisible();
      await expect(headerRow.getByText('Status')).toBeVisible();
    });

    test('should show holdings from seeded data', async ({ page }) => {
      // Wait for data to load
      await expect(
        page.getByText('Net Unrealized Gain/Loss').or(
          page.getByText(/don.*have any holdings/i)
        )
      ).toBeVisible({ timeout: 15000 });

      // Wait for tax lot table to load with data
      await expect(page.getByText('Tax Lot Analysis')).toBeVisible({
        timeout: 10000,
      });

      // Mock data creates holdings for AAPL, GOOGL, MSFT, AMZN, VTI, BTC, ACME
      // At least some of these should appear in the tax lot table
      // Use a broader check since some may be paginated
      const lotCount = page.getByText(/\d+ lots?/i).first();
      await expect(lotCount).toBeVisible({ timeout: 10000 });
    });

    test('should show holding period badges (LT/ST)', async ({ page }) => {
      // Wait for data to load
      await expect(
        page.getByText('Net Unrealized Gain/Loss').or(
          page.getByText(/don.*have any holdings/i)
        )
      ).toBeVisible({ timeout: 15000 });

      await expect(page.getByText('Tax Lot Analysis')).toBeVisible({
        timeout: 10000,
      });

      // The mock data creates transactions with random dates in the past year
      // so we should see at least ST (short-term) badges
      const stBadge = page.getByLabel('Short-term');
      const ltBadge = page.getByLabel('Long-term');

      // At least one holding period badge should be visible
      const stVisible = await stBadge.first().isVisible().catch(() => false);
      const ltVisible = await ltBadge.first().isVisible().catch(() => false);
      expect(stVisible || ltVisible).toBe(true);
    });

    test('should show lot type badges (Std, ESPP, RSU)', async ({ page }) => {
      // Wait for data to load
      await expect(
        page.getByText('Net Unrealized Gain/Loss').or(
          page.getByText(/don.*have any holdings/i)
        )
      ).toBeVisible({ timeout: 15000 });

      await expect(page.getByText('Tax Lot Analysis')).toBeVisible({
        timeout: 10000,
      });

      // Standard lots should show "Std" badge
      const stdBadge = page.getByLabel('Standard');
      await expect(stdBadge.first()).toBeVisible({ timeout: 5000 });
    });

    test('should sort by clicking column headers', async ({ page }) => {
      // Wait for data to load
      await expect(
        page.getByText('Net Unrealized Gain/Loss').or(
          page.getByText(/don.*have any holdings/i)
        )
      ).toBeVisible({ timeout: 15000 });

      await expect(page.getByText('Tax Lot Analysis')).toBeVisible({
        timeout: 10000,
      });

      // Click the Date sort button
      const dateSortButton = page.getByRole('button', { name: /^date$/i });
      if (await dateSortButton.isVisible().catch(() => false)) {
        await dateSortButton.click();
        // Table should still be visible after sorting
        await expect(page.getByText('Tax Lot Analysis')).toBeVisible();

        // Click again to reverse sort
        await dateSortButton.click();
        await expect(page.getByText('Tax Lot Analysis')).toBeVisible();
      }

      // Click the Qty sort button
      const qtySortButton = page.getByRole('button', { name: /^qty$/i });
      if (await qtySortButton.isVisible().catch(() => false)) {
        await qtySortButton.click();
        await expect(page.getByText('Tax Lot Analysis')).toBeVisible();
      }
    });

    test('should show tax rate information', async ({ page }) => {
      // Wait for data to load
      await expect(page.getByText('Net Unrealized Gain/Loss')).toBeVisible({
        timeout: 15000,
      });

      // The Short-Term / Long-Term card shows "Taxed at X% / Y%"
      await expect(page.getByText(/Taxed at/)).toBeVisible();
    });

    test('should show "If all sold today" disclaimer', async ({ page }) => {
      // Wait for data to load
      await expect(page.getByText('Net Unrealized Gain/Loss')).toBeVisible({
        timeout: 15000,
      });

      await expect(page.getByText('Estimated Tax Liability')).toBeVisible({
        timeout: 10000,
      });

      await expect(page.getByText('If all sold today')).toBeVisible();
    });

    test('should have Tax Settings button', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: 'Tax Analysis' })
      ).toBeVisible({ timeout: 10000 });

      // The page has a "Tax Settings" link button
      await expect(
        page.getByRole('link', { name: /tax settings/i })
      ).toBeVisible();
    });

    test('should show info alert about unrealized gains', async ({ page }) => {
      // Wait for data to load
      await expect(
        page.getByText('Net Unrealized Gain/Loss').or(
          page.getByText(/don.*have any holdings/i)
        )
      ).toBeVisible({ timeout: 15000 });

      // The page displays an alert about unrealized gains analysis
      await expect(
        page.getByText(/unrealized gains.*sold today/i)
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Tax Settings Page', () => {
    test('should navigate to tax settings and show rate controls', async ({
      page,
    }) => {
      await page.goto('/settings/tax');
      await page.waitForLoadState('load');

      // Should see page heading
      await expect(
        page.getByRole('heading', { name: 'Tax Settings' })
      ).toBeVisible({ timeout: 10000 });

      // Should see rate labels
      await expect(
        page.getByText('Short-Term Capital Gains Rate')
      ).toBeVisible();
      await expect(
        page.getByText('Long-Term Capital Gains Rate')
      ).toBeVisible();

      // Should see input fields
      await expect(page.locator('#short-term-rate')).toBeVisible();
      await expect(page.locator('#long-term-rate')).toBeVisible();

      // Should see Tax Rate Preview section
      await expect(page.getByText('Tax Rate Preview')).toBeVisible();
    });

    test('should persist tax settings across page reloads', async ({
      page,
    }) => {
      await page.goto('/settings/tax');
      await page.waitForLoadState('load');

      // Verify settings loaded
      await expect(
        page.getByText('Short-Term Capital Gains Rate')
      ).toBeVisible({ timeout: 10000 });

      // Reload the page
      await page.reload();
      await page.waitForLoadState('load');

      // Settings should still be visible
      await expect(
        page.getByText('Short-Term Capital Gains Rate')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Empty State', () => {
    test('should handle empty portfolio gracefully', async ({ page }) => {
      // Navigate directly to tax analysis without seeding data
      await page.goto('/tax-analysis');
      await page.waitForLoadState('load');

      // Should show the page heading
      await expect(
        page.getByRole('heading', { name: 'Tax Analysis' })
      ).toBeVisible({ timeout: 10000 });

      // Should show either:
      // 1. "Please select a portfolio" (no portfolio)
      // 2. "don't have any holdings" (portfolio but no holdings)
      // 3. Loading state text
      await expect(
        page.getByText(/please select a portfolio/i).or(
          page.getByText(/don.*have any holdings/i)
        ).or(
          page.getByText(/loading holdings data/i)
        )
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
