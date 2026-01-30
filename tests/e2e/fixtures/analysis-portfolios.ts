/**
 * Test data fixtures for Financial Analysis E2E tests
 * Pre-defined portfolio scenarios to test specific recommendation triggers
 */

import { Page } from '@playwright/test';

/**
 * Portfolio with high concentration (90% in single asset)
 * Should trigger: Concentration Risk recommendation (>15% threshold)
 *
 * Note: For now, using mock data as baseline. In future, could create custom
 * concentrated portfolios via direct database manipulation.
 */
export async function createConcentratedPortfolio(page: Page) {
  // Use mock data generation for baseline portfolio
  await waitForMockDataGeneration(page);

  // TODO: In future enhancement, modify the portfolio to be highly concentrated
  // For now, the mock data will be used to test basic functionality
}

/**
 * Portfolio with high cash percentage (25%)
 * Should trigger: High Cash Drag recommendation (>20% threshold)
 *
 * Note: Using mock data as baseline. Mock data may or may not have high cash.
 */
export async function createHighCashPortfolio(page: Page) {
  // Use mock data generation for baseline portfolio
  await waitForMockDataGeneration(page);

  // TODO: Modify portfolio to have >20% cash via database manipulation
}

/**
 * Well-diversified portfolio with no issues
 * Should show: "No critical issues detected"
 *
 * Note: Using mock data which is reasonably diversified.
 */
export async function createBalancedPortfolio(page: Page) {
  // Use mock data generation for baseline portfolio
  await waitForMockDataGeneration(page);
}

/**
 * Portfolio with multiple issues
 * Should trigger: Multiple recommendations (concentration + cash drag)
 *
 * Note: Using mock data as baseline.
 */
export async function createMultiIssuePortfolio(page: Page) {
  // Use mock data generation for baseline portfolio
  await waitForMockDataGeneration(page);

  // TODO: Modify to create multiple issues via database manipulation
}

/**
 * Helper to wait for mock data generation to complete
 */
export async function waitForMockDataGeneration(page: Page) {
  const generateButton = page.getByRole('button', {
    name: 'Generate Mock Data',
  });

  if (await generateButton.isEnabled()) {
    await generateButton.click();
    await page.waitForSelector('text=Done! Redirecting...', {
      timeout: 10000,
    });
    await page.waitForURL('/', { timeout: 10000 });
  }

  await page.waitForLoadState('networkidle');
}

/**
 * Helper to navigate to analysis page and wait for calculations
 */
export async function navigateToAnalysisAndWait(page: Page) {
  await page.goto('/analysis');
  await page.waitForLoadState('networkidle');

  // Wait for the Health Score card to appear (indicates calculations started)
  await page.waitForSelector('text=Portfolio Health Score', { timeout: 10000 });

  // Wait for calculations to complete - look for actual score number (not "Calculating...")
  await page.waitForFunction(
    () => {
      // Check that we're not seeing "Calculating..." text
      const isCalculating = document.body.textContent?.includes('Calculating...');
      if (isCalculating) return false;

      // Check that refresh button is enabled
      const buttons = Array.from(document.querySelectorAll('button'));
      const refreshButton = buttons.find(btn => btn.textContent?.includes('Refresh'));
      return refreshButton && !refreshButton.hasAttribute('disabled');
    },
    { timeout: 10000 }
  );

  // Additional small wait for UI to settle
  await page.waitForTimeout(500);
}
