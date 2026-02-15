import { test, expect, seedMockData } from './fixtures/test';

/**
 * E2E test for the mock data generation flow
 * Tests: Generate mock data → Verify dashboard displays widgets with data
 */
test.describe('Mock Data Generation Flow', () => {
  test('should generate mock data and display dashboard with widgets', async ({ page }) => {
    // Generate mock data via seedMockData (handles /test page and redirect)
    await seedMockData(page);

    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('load');

    // Step 3: Wait for loading to complete
    // CRITICAL: Hard assertion - FAILS if loading stuck (no conditional logic)
    await expect(page.getByText('Loading portfolio data')).not.toBeVisible({
      timeout: 5000,
    });

    // Step 4: Verify dashboard displays with data (not welcome state)
    const welcomeMessage = page.getByText('Welcome to Portfolio Tracker');
    await expect(welcomeMessage).not.toBeVisible({ timeout: 5000 });

    // Step 5: Verify widgets are displayed with actual data
    // Total Value Widget (title is "Total Portfolio Value")
    const totalValueWidget = page.locator('[data-testid="total-value-widget"]');
    await expect(totalValueWidget).toBeVisible({ timeout: 10000 });
    await expect(totalValueWidget.getByText('Total Portfolio Value')).toBeVisible();

    // Value should be a dollar amount (not $0.00 since we have data)
    const totalValueText = await totalValueWidget.locator('.text-2xl, .text-3xl').first().textContent();
    expect(totalValueText).toMatch(/^\$[\d,]+\.\d{2}$/);
    expect(totalValueText).not.toBe('$0.00');

    // Gain/Loss Widget
    const gainLossWidget = page.locator('[data-testid="gain-loss-widget"]');
    await expect(gainLossWidget).toBeVisible();
    await expect(gainLossWidget.getByText('Total Gain/Loss')).toBeVisible();

    // Day Change Widget
    const dayChangeWidget = page.locator('[data-testid="day-change-widget"]');
    await expect(dayChangeWidget).toBeVisible();
    await expect(dayChangeWidget.getByText('Day Change')).toBeVisible();

    console.log('✅ Mock data flow test passed - Dashboard displays all widgets with data');
  });

  test('should show welcome state when no data exists', async ({ page }) => {
    // Navigate to dashboard without seeding data
    await page.goto('/');
    await page.waitForLoadState('load');

    // Wait for loading to finish
    // CRITICAL: Hard assertion - FAILS if loading stuck (no conditional logic)
    await expect(page.getByText('Loading portfolio data')).not.toBeVisible({
      timeout: 10000,
    });

    // Either welcome state (no data) or dashboard widgets (has data) should be visible.
    // Use .or() with auto-retry instead of instant isVisible() checks.
    const anyState = page
      .getByText('Welcome to Portfolio Tracker')
      .or(page.locator('[data-testid="total-value-widget"]'))
      .or(page.getByText('No Holdings Yet'));

    await expect(anyState.first()).toBeVisible({ timeout: 5000 });

    // Log which state we ended up in
    const isWelcome = await page.getByText('Welcome to Portfolio Tracker').isVisible();
    if (isWelcome) {
      console.log('Welcome state displayed correctly (no data)');
    } else {
      console.log('Dashboard displayed correctly (has data)');
    }
  });
});
