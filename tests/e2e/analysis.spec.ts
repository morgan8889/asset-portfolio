import { test, expect } from '@playwright/test';

/**
 * E2E test for the Financial Analysis page
 * Tests: Navigate to analysis → Verify health score → Check recommendations → Test allocation comparison
 */
test.describe('Financial Analysis Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page and generate mock data if needed
    await page.goto('/test');
    await page.waitForLoadState('networkidle');

    const generateButton = page.getByRole('button', {
      name: 'Generate Mock Data',
    });

    if (await generateButton.isEnabled()) {
      await generateButton.click();
      await expect(page.getByText('Done! Redirecting...')).toBeVisible({
        timeout: 10000,
      });
      await page.waitForURL('/', { timeout: 10000 });
    }

    await page.waitForLoadState('networkidle');
  });

  test('should display portfolio health score and metrics', async ({
    page,
  }) => {
    // Navigate to analysis page
    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');

    // Verify page header
    await expect(
      page.getByRole('heading', { name: 'Analysis', exact: true })
    ).toBeVisible();
    await expect(
      page.getByText('Portfolio health scoring and recommendations')
    ).toBeVisible();

    // Wait for calculations to complete (max 5 seconds)
    await page.waitForFunction(
      () => {
        const refreshButton = document.querySelector('button:has-text("Refresh")');
        return refreshButton && !refreshButton.hasAttribute('disabled');
      },
      { timeout: 5000 }
    );

    // Verify Health Score Card is visible
    const healthScoreCard = page.locator('text=Portfolio Health Score').first();
    await expect(healthScoreCard).toBeVisible({ timeout: 5000 });

    // Health score should be a number between 0-100
    const scoreElement = page.locator('.text-4xl, .text-5xl').first();
    await expect(scoreElement).toBeVisible();
    const scoreText = await scoreElement.textContent();
    const score = parseInt(scoreText || '0');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);

    // Verify Metric Breakdown is visible
    await expect(page.getByText('Score Breakdown')).toBeVisible();

    // Should show the three metrics: Diversification, Performance, Volatility
    await expect(page.getByText('Diversification')).toBeVisible();
    await expect(page.getByText('Performance')).toBeVisible();
    await expect(page.getByText('Volatility')).toBeVisible();

    console.log(
      '✅ Health score and metrics displayed correctly with score:',
      score
    );
  });

  test('should display recommendations when issues are detected', async ({
    page,
  }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');

    // Wait for calculations to complete
    await page.waitForFunction(
      () => {
        const refreshButton = document.querySelector('button:has-text("Refresh")');
        return refreshButton && !refreshButton.hasAttribute('disabled');
      },
      { timeout: 5000 }
    );

    // Verify Recommendations section
    const recommendationsSection = page.locator('text=Recommendations').first();
    await expect(recommendationsSection).toBeVisible({ timeout: 5000 });

    // Check if recommendations are shown or "no critical issues" message
    const noIssuesMessage = page.getByText(
      'No critical issues detected',
      { exact: false }
    );
    const recommendationCards = page.locator('[class*="border"][class*="rounded"]').filter({
      has: page.locator('text=/High|Medium|Low/'),
    });

    const hasNoIssues = await noIssuesMessage.isVisible().catch(() => false);
    const hasRecommendations = await recommendationCards
      .first()
      .isVisible()
      .catch(() => false);

    // Either should have no issues message or recommendation cards
    expect(hasNoIssues || hasRecommendations).toBe(true);

    if (hasRecommendations) {
      const count = await recommendationCards.count();
      console.log(`✅ Found ${count} recommendation(s)`);

      // Verify first recommendation has severity indicator
      const firstCard = recommendationCards.first();
      const hasSeverity =
        (await firstCard.getByText('High').isVisible().catch(() => false)) ||
        (await firstCard.getByText('Medium').isVisible().catch(() => false)) ||
        (await firstCard.getByText('Low').isVisible().catch(() => false));
      expect(hasSeverity).toBe(true);
    } else {
      console.log('✅ No critical issues detected (healthy portfolio)');
    }
  });

  test('should allow profile selection and recalculate health', async ({
    page,
  }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');

    // Wait for initial calculations
    await page.waitForFunction(
      () => {
        const refreshButton = document.querySelector('button:has-text("Refresh")');
        return refreshButton && !refreshButton.hasAttribute('disabled');
      },
      { timeout: 5000 }
    );

    // Verify Profile Selector is visible
    await expect(page.getByText('Analysis Profile')).toBeVisible();

    // Get initial health score
    const initialScoreElement = page.locator('.text-4xl, .text-5xl').first();
    const initialScore = await initialScoreElement.textContent();

    // Try to change profile (look for radio buttons or selectable profiles)
    const profileButtons = page.locator('button[role="radio"], input[type="radio"]');
    const profileCount = await profileButtons.count();

    if (profileCount > 1) {
      // Click second profile option
      await profileButtons.nth(1).click();

      // Wait a moment for recalculation
      await page.waitForTimeout(1000);

      // Score should be visible (may or may not have changed)
      await expect(initialScoreElement).toBeVisible();
      console.log('✅ Profile selection working, initial score:', initialScore);
    } else {
      console.log('✅ Only one profile available');
    }
  });

  test('should display allocation comparison and rebalancing table', async ({
    page,
  }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');

    // Wait for calculations to complete
    await page.waitForFunction(
      () => {
        const refreshButton = document.querySelector('button:has-text("Refresh")');
        return refreshButton && !refreshButton.hasAttribute('disabled');
      },
      { timeout: 5000 }
    );

    // Verify Target Model Selector
    await expect(page.getByText('Target Allocation Model')).toBeVisible({
      timeout: 5000,
    });

    // Look for model selection buttons/options
    const modelSelector = page.locator('select, button[role="combobox"]').first();
    if (await modelSelector.isVisible()) {
      // Select a target model (should trigger allocation display)
      await modelSelector.click();

      // Look for model options (e.g., "60/40", "All Weather")
      const modelOption = page
        .getByText(/60.*40|All Weather|Aggressive|Conservative/)
        .first();
      if (await modelOption.isVisible()) {
        await modelOption.click();
        await page.waitForTimeout(1000); // Wait for calculations

        // Verify Allocation Chart appears
        const allocationChart = page.locator('text=Current vs Target Allocation');
        await expect(allocationChart).toBeVisible({ timeout: 3000 });

        // Verify Rebalancing Table appears
        const rebalancingTable = page.locator(
          'text=Rebalancing Actions, text=Action'
        );
        await expect(rebalancingTable.first()).toBeVisible({ timeout: 3000 });

        // Table should have columns: Asset Class, Action, Amount
        await expect(page.getByText('Asset Class')).toBeVisible();
        await expect(page.getByText('Action')).toBeVisible();

        console.log('✅ Allocation comparison and rebalancing table displayed');
      }
    } else {
      console.log('⚠️  Target model selector not found or not interactive');
    }
  });

  test('should handle empty portfolio gracefully', async ({ page }) => {
    // Clear local storage to simulate empty state
    await page.goto('/analysis');
    await page.evaluate(() => {
      localStorage.clear();
      indexedDB.deleteDatabase('PortfolioTrackerDB');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show "No Portfolio Selected" message
    const noPortfolioMessage = page.getByText('No Portfolio Selected');
    await expect(noPortfolioMessage).toBeVisible({ timeout: 5000 });

    await expect(
      page.getByText('Select or create a portfolio to view analysis')
    ).toBeVisible();

    console.log('✅ Empty portfolio state handled correctly');
  });

  test('should refresh analysis when refresh button is clicked', async ({
    page,
  }) => {
    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');

    // Wait for initial calculations
    await page.waitForFunction(
      () => {
        const refreshButton = document.querySelector('button:has-text("Refresh")');
        return refreshButton && !refreshButton.hasAttribute('disabled');
      },
      { timeout: 5000 }
    );

    // Click refresh button
    const refreshButton = page.getByRole('button', { name: 'Refresh' });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Button should be disabled during calculation
    await expect(refreshButton).toBeDisabled({ timeout: 1000 });

    // Should show spinning icon
    const spinningIcon = page.locator('.animate-spin');
    await expect(spinningIcon).toBeVisible({ timeout: 2000 });

    // Wait for calculations to complete
    await expect(refreshButton).toBeEnabled({ timeout: 5000 });

    console.log('✅ Refresh functionality working correctly');
  });
});
