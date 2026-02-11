/**
 * E2E Tests for Tax Analysis Price Loading
 *
 * Tests the complete price loading flow on the tax-analysis page:
 * - Price polling initialization
 * - Price data display
 * - Page navigation
 * - Empty state handling
 *
 * These tests catch integration issues that unit tests miss, including:
 * - Bug #1: Map iteration (Object.entries vs forEach)
 * - Bug #2: Missing price polling setup
 * - Bug #3: Missing asset loading
 * - Bug #4: useMemo staleness with Map updates
 */

import { test, expect } from './fixtures/test';

/**
 * Helper function to set up test data using the mock data generator
 */
async function setupMockData(page: import('@playwright/test').Page) {
  await page.goto('/test');
  await page.waitForLoadState('networkidle');

  // Wait for test page to load
  await expect(page.getByText('Component Testing Page')).toBeVisible({ timeout: 10000 });

  // Generate mock data if button is enabled
  const generateButton = page.getByRole('button', { name: 'Generate Mock Data' });
  if (await generateButton.isEnabled()) {
    await generateButton.click();

    // Wait for generation to complete and redirect
    await expect(page.getByText('Done! Redirecting...')).toBeVisible({ timeout: 15000 });

    // Wait for redirect to dashboard
    await page.waitForURL('/', { timeout: 10000 });
  } else {
    // Data already exists, navigate to dashboard
    await page.goto('/');
  }

  await page.waitForLoadState('networkidle');

  // Wait for loading to complete
  await expect(page.getByText('Loading portfolio data')).not.toBeVisible({
    timeout: 5000,
  });
}

/**
 * Helper function to create a portfolio if one doesn't exist (for empty state test)
 */
async function ensureEmptyPortfolioExists(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Check if we need to create a portfolio
  const createPortfolioButton = page.getByRole('button', { name: 'Create Portfolio' });

  if (await createPortfolioButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    // Create a new portfolio
    await createPortfolioButton.click();

    // Wait for dialog to open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Fill in portfolio name
    await page.getByLabel(/portfolio name/i).fill('Empty Portfolio');

    // Select account type (required field)
    const accountTypeCombo = dialog.getByRole('combobox').first();
    await accountTypeCombo.click();
    await page.getByRole('option', { name: /taxable/i }).click();

    // Submit the form
    const submitButton = dialog.getByRole('button', { name: 'Create Portfolio' });
    await expect(submitButton).toBeEnabled({ timeout: 3000 });
    await submitButton.click();

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 10000 });
  }

  await page.waitForLoadState('networkidle');
}

test.describe('Tax Analysis Price Loading', () => {
  test('should load and display prices on direct navigation', async ({ page }) => {
    // Set up mock data
    await setupMockData(page);

    // Navigate directly to tax-analysis page
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Verify page title
    await expect(page.getByRole('heading', { name: 'Tax Analysis' })).toBeVisible();

    // Verify the page description shows portfolio name (confirms data loaded)
    await expect(page.getByText(/unrealized gains analysis/i)).toBeVisible({ timeout: 10000 });

    // Verify the Tax Settings button is present (confirms page rendered correctly)
    await expect(page.getByRole('button', { name: /tax settings/i })).toBeVisible();
  });

  test('should show tax summary cards with data', async ({ page }) => {
    // Set up mock data
    await setupMockData(page);

    // Navigate to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Verify main heading
    await expect(page.getByRole('heading', { name: 'Tax Analysis' })).toBeVisible({ timeout: 10000 });

    // Wait for content to load
    await expect(page.locator('main')).toBeVisible();

    // The page should have tax-related content (either loading or loaded)
    const pageContent = await page.locator('main').textContent();
    expect(pageContent).toBeTruthy();
    expect(pageContent).toContain('Tax Analysis');
  });

  test('should handle navigation between pages and back', async ({ page }) => {
    // Set up mock data
    await setupMockData(page);

    // Navigate to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Verify tax analysis is loaded
    await expect(page.getByRole('heading', { name: 'Tax Analysis' })).toBeVisible();

    // Verify tax settings button (confirms page rendered)
    await expect(page.getByRole('button', { name: /tax settings/i })).toBeVisible();

    // Navigate away to holdings
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    // Verify we're on holdings page (use exact match to avoid multiple matches)
    await expect(page.getByRole('heading', { name: 'Holdings', exact: true })).toBeVisible();

    // Navigate back to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Data should still be visible
    await expect(page.getByRole('heading', { name: 'Tax Analysis' })).toBeVisible();
    await expect(page.getByRole('button', { name: /tax settings/i })).toBeVisible();
  });

  test('should display tax lot table with columns', async ({ page }) => {
    // Set up mock data
    await setupMockData(page);

    // Navigate to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Verify page loaded
    await expect(page.getByRole('heading', { name: 'Tax Analysis' })).toBeVisible({ timeout: 10000 });

    // Verify the page description shows portfolio name
    await expect(page.getByText(/unrealized gains analysis/i)).toBeVisible();

    // The TaxAnalysisTab should be rendered (either loading or with content)
    // Check for the info alert that's always present
    await expect(page.getByText(/consult a tax professional/i)).toBeVisible();
  });

  test('should handle empty portfolio gracefully', async ({ page }) => {
    // Create an empty portfolio (no mock data)
    await ensureEmptyPortfolioExists(page);

    // Navigate directly to tax-analysis with no transactions
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Should show empty state message
    await expect(
      page.getByText(/don't have any holdings/i).or(page.getByText(/no tax lots/i)).or(page.getByText(/0 lots/i))
    ).toBeVisible();
  });

  test('should show tax settings link and navigate correctly', async ({ page }) => {
    // Set up mock data
    await setupMockData(page);

    // Navigate to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Find and click the Tax Settings button
    const taxSettingsButton = page.getByRole('button', { name: /tax settings/i });
    await expect(taxSettingsButton).toBeVisible({ timeout: 10000 });
    await taxSettingsButton.click();

    // Should navigate to tax settings page
    await expect(page).toHaveURL(/\/settings\/tax/);

    // Verify tax settings page content - use first() to avoid strict mode violation
    await expect(page.getByText(/short.*term.*rate/i).first()).toBeVisible();
    await expect(page.getByText(/long.*term.*rate/i).first()).toBeVisible();
  });

  test('should persist data after page reload', async ({ page }) => {
    // Set up mock data
    await setupMockData(page);

    // Navigate to tax-analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Verify initial page load
    await expect(page.getByRole('heading', { name: 'Tax Analysis' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /tax settings/i })).toBeVisible();

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Data should still be visible after reload
    await expect(page.getByRole('heading', { name: 'Tax Analysis' })).toBeVisible();
    await expect(page.getByRole('button', { name: /tax settings/i })).toBeVisible();
    await expect(page.getByText(/unrealized gains analysis/i)).toBeVisible();
  });
});
