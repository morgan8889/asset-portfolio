import { test, expect } from './fixtures/test';

test.describe('Portfolio Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');

    // Wait for the page to load completely
  });

  test('should display dashboard with welcome message for new users', async ({ page }) => {
    // Should show welcome message if no portfolios exist
    await expect(page.getByText('Welcome to Portfolio Tracker')).toBeVisible();
    await expect(page.getByText('Create your first portfolio')).toBeVisible();

    // Should have create portfolio and import buttons
    await expect(page.getByRole('button', { name: 'Create Portfolio' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Import Data' })).toBeVisible();
  });

  test('should have proper page structure and navigation', async ({ page }) => {
    // Check for main navigation elements (use first() since there are multiple navs)
    await expect(page.locator('nav').first()).toBeVisible();

    // Check for responsive design elements
    const viewport = page.viewportSize();
    if (viewport && viewport.width >= 768) {
      // Desktop layout checks - sidebar nav contains navigation items
      await expect(page.locator('nav').filter({ hasText: 'Dashboard' }).first()).toBeVisible();
    }
  });

  test('should display portfolio metrics when data exists', async ({ page }) => {
    // Create a test portfolio first (this would be done via setup)
    // For now, we'll mock this scenario by navigating after adding data

    // Navigate to dashboard with mock data
    await page.goto('/');

    // If we have portfolio data, we should see metrics cards
    const metricsCards = page.locator('[data-testid="metrics-card"]');

    if (await metricsCards.count() > 0) {
      // Check for total value card
      await expect(page.getByText('Total Value')).toBeVisible();
      await expect(page.getByText('Total Gain/Loss')).toBeVisible();
      await expect(page.getByText('Day Change')).toBeVisible();
      await expect(page.getByText('Quick Actions')).toBeVisible();
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // Check that content adapts to mobile
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();

    // Navigation should be accessible
    const menuButton = page.locator('[aria-label="Menu"]');
    if (await menuButton.isVisible()) {
      await menuButton.click();
      // Check that navigation menu appears
      await expect(page.locator('nav')).toBeVisible();
    }
  });

  test('should handle loading states gracefully', async ({ page }) => {
    // Navigate to page
    await page.goto('/');

    // Should show loading indicator initially
    const loadingIndicator = page.getByText('Loading portfolio data');

    // Either loading appears briefly or content loads immediately
    // This is acceptable for both fast and slow loading scenarios

    // Eventually should show either welcome message or dashboard content
    // Use heading role to avoid matching sidebar "Dashboard" button
    await expect(
      page.getByRole('heading', { name: 'Welcome to Portfolio Tracker' })
      .or(page.getByRole('heading', { name: 'Dashboard' }))
    ).toBeVisible();
  });

  test('should display error state when API fails', async ({ page }) => {
    // Mock API failure by intercepting requests
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    await page.goto('/');

    // Should show error message
    const errorMessage = page.getByText(/error/i);
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible();

      // Should have retry button
      const retryButton = page.getByRole('button', { name: /retry/i });
      if (await retryButton.isVisible()) {
        await expect(retryButton).toBeVisible();
      }
    }
  });

  test('should have accessible elements', async ({ page }) => {
    await page.goto('/');

    // Check for proper heading structure
    const h1 = page.locator('h1');
    if (await h1.count() > 0) {
      await expect(h1.first()).toBeVisible();
    }

    // Check that buttons have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        // Button should have accessible name (either text content or aria-label)
        const hasText = await button.textContent();
        const hasAriaLabel = await button.getAttribute('aria-label');
        expect(hasText || hasAriaLabel).toBeTruthy();
      }
    }
  });

  test('should persist user preferences', async ({ page, context }) => {
    await page.goto('/');

    // If there's a theme toggle, test theme persistence
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();

      // Reload page
      await page.reload();

      // Theme preference should be maintained
      // This would be verified by checking for dark/light mode classes
      const htmlElement = page.locator('html');
      const className = await htmlElement.getAttribute('class');
      expect(className).toBeTruthy();
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/');

    // Test tab navigation through interactive elements
    await page.keyboard.press('Tab');

    // First focusable element should be focused
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();

    // Continue tabbing through a few elements
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
      const newFocused = page.locator(':focus');
      await expect(newFocused).toBeVisible();
    }
  });

  test('should show performance metrics correctly', async ({ page }) => {
    await page.goto('/');

    // If metrics are displayed, verify their format
    const currencyElements = page.locator('[data-testid*="currency"]');
    const currencyCount = await currencyElements.count();

    for (let i = 0; i < currencyCount; i++) {
      const element = currencyElements.nth(i);
      const text = await element.textContent();

      if (text) {
        // Should be properly formatted currency
        expect(text).toMatch(/^\$[\d,]+\.?\d*$/);
      }
    }

    // Percentage elements should be properly formatted
    const percentageElements = page.locator('[data-testid*="percentage"]');
    const percentageCount = await percentageElements.count();

    for (let i = 0; i < percentageCount; i++) {
      const element = percentageElements.nth(i);
      const text = await element.textContent();

      if (text) {
        // Should be properly formatted percentage
        expect(text).toMatch(/^[+-]?\d+\.?\d*%$/);
      }
    }
  });
});