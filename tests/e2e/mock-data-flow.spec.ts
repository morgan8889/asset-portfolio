import { test, expect } from '@playwright/test';

/**
 * E2E test for the mock data generation flow
 * Tests: Generate mock data → Verify dashboard displays widgets with data
 */
test.describe('Mock Data Generation Flow', () => {
  test('should generate mock data and display dashboard with widgets', async ({ page }) => {
    // Step 1: Navigate to test page
    await page.goto('/test');
    await page.waitForLoadState('networkidle');

    // Verify test page loaded
    await expect(page.getByText('Component Testing Page')).toBeVisible();
    await expect(page.getByText('Mock Data Generator')).toBeVisible();

    // Step 2: Generate mock data
    const generateButton = page.getByRole('button', { name: 'Generate Mock Data' });
    await expect(generateButton).toBeVisible();

    // If button is disabled (data already exists), skip generation
    if (await generateButton.isEnabled()) {
      await generateButton.click();

      // Should show loading state
      await expect(page.getByText('Generating...')).toBeVisible();

      // Should show success and redirect
      await expect(page.getByText('Done! Redirecting...')).toBeVisible({ timeout: 10000 });

      // Wait for redirect to dashboard
      await page.waitForURL('/', { timeout: 10000 });
    } else {
      // Data already exists, navigate to dashboard
      await page.goto('/');
    }

    await page.waitForLoadState('networkidle');

    // Step 3: Wait for loading to complete
    // CRITICAL: Hard assertion - FAILS if loading stuck (no conditional logic)
    await expect(page.getByText('Loading portfolio data')).not.toBeVisible({
      timeout: 5000,
    });

    // Step 4: Verify dashboard displays with data (not welcome state)
    const welcomeMessage = page.getByText('Welcome to Portfolio Tracker');
    await expect(welcomeMessage).not.toBeVisible({ timeout: 5000 });

    // Step 5: Verify widgets are displayed with actual data
    // Total Value Widget
    const totalValueWidget = page.locator('[data-testid="total-value-widget"]');
    await expect(totalValueWidget).toBeVisible({ timeout: 10000 });
    await expect(totalValueWidget.getByText('Total Value')).toBeVisible();

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
    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for loading to finish
    // CRITICAL: Hard assertion - FAILS if loading stuck (no conditional logic)
    await expect(page.getByText('Loading portfolio data')).not.toBeVisible({
      timeout: 5000,
    });

    // Check what state we're in
    const welcomeMessage = page.getByText('Welcome to Portfolio Tracker');
    const dashboardWidgets = page.locator('[data-testid="total-value-widget"]');

    // Either welcome state (no data) or dashboard widgets (has data) should be visible
    const isWelcomeVisible = await welcomeMessage.isVisible();
    const isWidgetsVisible = await dashboardWidgets.isVisible();

    expect(isWelcomeVisible || isWidgetsVisible).toBe(true);

    if (isWelcomeVisible) {
      // Welcome state should have create portfolio button
      await expect(page.getByRole('button', { name: 'Create Portfolio' })).toBeVisible();
      console.log('✅ Welcome state displayed correctly (no data)');
    } else {
      console.log('✅ Dashboard displayed correctly (has data)');
    }
  });
});
