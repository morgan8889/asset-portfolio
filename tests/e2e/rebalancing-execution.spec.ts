/**
 * E2E Tests for Asset Allocation & Rebalancing Workflow
 *
 * Tests the allocation page including:
 * - Navigation and page rendering
 * - Allocation chart with dimension tabs (Asset Class, Sector, Region)
 * - Rebalancing plan display
 * - Target model creation dialog
 * - Portfolio exclusions dialog
 */

import { test, expect, seedMockData } from './fixtures/test';

test.describe('Rebalancing Execution', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/allocation');
    await page.waitForLoadState('load');
  });

  test('should navigate to allocation page and show heading', async ({
    page,
  }) => {
    await expect(
      page.getByRole('heading', { name: /asset allocation/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test('should display current allocation breakdown', async ({ page }) => {
    // The "Current Allocation" card should be visible
    await expect(page.getByText('Current Allocation')).toBeVisible({
      timeout: 5000,
    });

    // Should show percentages in the allocation chart
    await expect(page.getByText(/%/).first()).toBeVisible({ timeout: 5000 });
  });

  test('should show allocation dimension tabs', async ({ page }) => {
    // Verify all three dimension tabs exist
    await expect(
      page.getByRole('tab', { name: 'Asset Class' })
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('tab', { name: 'Sector' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Region' })).toBeVisible();
  });

  test('should switch between allocation dimensions', async ({ page }) => {
    // Default tab should be Asset Class
    const assetClassTab = page.getByRole('tab', { name: 'Asset Class' });
    await expect(assetClassTab).toBeVisible({ timeout: 5000 });

    // Click Sector tab
    await page.getByRole('tab', { name: 'Sector' }).click();
    await expect(
      page.getByRole('tab', { name: 'Sector' })
    ).toHaveAttribute('data-state', 'active');

    // Click Region tab
    await page.getByRole('tab', { name: 'Region' }).click();
    await expect(
      page.getByRole('tab', { name: 'Region' })
    ).toHaveAttribute('data-state', 'active');
  });

  test('should show rebalancing plan card', async ({ page }) => {
    // The Rebalancing Plan card heading should always be visible
    await expect(
      page.getByRole('heading', { name: 'Rebalancing Plan' })
    ).toBeVisible({ timeout: 5000 });

    // Without a target model selected, should show the empty state
    await expect(
      page.getByText('Select a target model to generate rebalancing recommendations.')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should open New Target dialog', async ({ page }) => {
    // Click the "New Target" button
    const newTargetButton = page.getByRole('button', { name: /new target/i });
    await expect(newTargetButton).toBeVisible({ timeout: 5000 });
    await newTargetButton.click();

    // Dialog should open with the target model editor
    await expect(
      page.getByRole('heading', { name: /create target model/i })
    ).toBeVisible({ timeout: 5000 });

    // Should show model name input
    await expect(page.getByLabel(/model name/i)).toBeVisible();

    // Should show Target Allocations label
    await expect(page.getByText('Target Allocations')).toBeVisible();

    // Should show a Save Model button (disabled until valid)
    await expect(
      page.getByRole('button', { name: /save model/i })
    ).toBeVisible();

    // Should show a Cancel button
    await expect(
      page.getByRole('button', { name: /cancel/i })
    ).toBeVisible();
  });

  test('should validate target allocation totals to 100%', async ({
    page,
  }) => {
    // Open the New Target dialog
    await page.getByRole('button', { name: /new target/i }).click();
    await expect(
      page.getByRole('heading', { name: /create target model/i })
    ).toBeVisible({ timeout: 5000 });

    // Enter a model name
    await page.getByLabel(/model name/i).fill('Test Model');

    // The total should show and indicate it's not 100% (initially at 0%)
    // The Save Model button should be disabled when total is not 100%
    const saveButton = page.getByRole('button', { name: /save model/i });
    await expect(saveButton).toBeDisabled();
  });

  test('should open Exclusions dialog', async ({ page }) => {
    // Click the "Exclusions" button
    const exclusionsButton = page.getByRole('button', {
      name: /exclusions/i,
    });
    await expect(exclusionsButton).toBeVisible({ timeout: 5000 });
    await exclusionsButton.click();

    // Dialog should open with Portfolio Exclusions heading
    await expect(
      page.getByRole('heading', { name: /portfolio exclusions/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show allocation description text', async ({ page }) => {
    await expect(
      page.getByText(
        /view and manage your portfolio allocation and rebalancing strategy/i
      )
    ).toBeVisible({ timeout: 5000 });
  });
});
