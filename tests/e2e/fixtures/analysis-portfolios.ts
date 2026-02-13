/**
 * Test data fixtures for Financial Analysis E2E tests
 * Pre-defined portfolio scenarios to test specific recommendation triggers
 */

import { Page } from '@playwright/test';
import {
  generateMockData,
  makePortfolioConcentrated,
  makePortfolioHighCash,
  makePortfolioMultiIssue,
} from './seed-helpers';

/**
 * Portfolio with high concentration (90%+ in single asset)
 * Should trigger: Concentration Risk recommendation (>15% threshold)
 *
 * Creates baseline mock data then replaces holdings so that ~95% of the
 * portfolio value is in a single asset (AAPL).
 */
export async function createConcentratedPortfolio(page: Page) {
  await waitForMockDataGeneration(page);
  await makePortfolioConcentrated(page);
}

/**
 * Portfolio with high cash percentage (>20%)
 * Should trigger: High Cash Drag recommendation (>20% threshold)
 *
 * Creates baseline mock data then adds a large cash holding that
 * represents ~30% of total portfolio value.
 */
export async function createHighCashPortfolio(page: Page) {
  await waitForMockDataGeneration(page);
  await makePortfolioHighCash(page);
}

/**
 * Well-diversified portfolio with no issues
 * Should show: "No critical issues detected"
 *
 * Uses the default mock data which is reasonably diversified across
 * stocks, ETFs, and crypto.
 */
export async function createBalancedPortfolio(page: Page) {
  await waitForMockDataGeneration(page);
}

/**
 * Portfolio with multiple issues
 * Should trigger: Multiple recommendations (concentration + cash drag)
 *
 * Creates baseline mock data then replaces holdings with a mix of
 * 60% in single asset (concentration) + 25% cash (high cash drag).
 */
export async function createMultiIssuePortfolio(page: Page) {
  await waitForMockDataGeneration(page);
  await makePortfolioMultiIssue(page);
}

/**
 * Helper to wait for mock data generation to complete.
 * Navigates to /test, generates data, and waits for redirect to dashboard.
 */
export async function waitForMockDataGeneration(page: Page) {
  await generateMockData(page);
}

/**
 * Helper to navigate to analysis page and wait for calculations
 */
export async function navigateToAnalysisAndWait(page: Page) {
  await page.goto('/analysis');

  // Wait for the Health Score card to appear (indicates calculations started)
  // CI runners need extra time for IndexedDB hydration + analysis calculations
  await page.waitForSelector('text=Portfolio Health Score', { timeout: 30000 });

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
    { timeout: 30000 }
  );

  // Additional small wait for UI to settle
  await page.waitForTimeout(500);
}
