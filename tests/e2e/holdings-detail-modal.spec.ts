/**
 * E2E Tests for Holdings Detail Modal
 *
 * Tests the holdings detail modal functionality including viewing overview,
 * tax lots, and tax analysis tabs.
 *
 * Coverage:
 * - Opening detail modal from holdings table
 * - Viewing overview tab with key metrics
 * - Viewing tax lot breakdown
 * - Viewing tax analysis tab
 * - ESPP and RSU metadata display
 * - Modal close behavior
 */

import { test, expect, seedMockData } from './fixtures/test';

test.describe('Holdings Detail Modal', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/holdings');
    await page.waitForLoadState('load');

    // Wait for the holdings table to render with data
    await expect(page.getByRole('table')).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('table').locator('tbody tr').first()
    ).toBeVisible({ timeout: 10000 });
  });

  test('should open holdings detail modal from dropdown menu', async ({
    page,
  }) => {
    // Find first holding row and click its dropdown
    const firstRow = page.getByRole('table').locator('tbody tr').first();
    const dropdownButton = firstRow.locator('button').last();
    await dropdownButton.click();

    // Click "View Details" option
    await page.getByRole('menuitem', { name: /view details/i }).click();

    // Verify modal opens
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Verify modal has the "Holding Details" title
    await expect(modal.getByText(/holding details/i)).toBeVisible();
  });

  test('should display overview tab with holding summary', async ({
    page,
  }) => {
    // Open detail modal for the first holding
    const firstRow = page.getByRole('table').locator('tbody tr').first();
    const dropdownButton = firstRow.locator('button').last();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Overview is the default tab - verify key metric cards
    await expect(modal.getByText(/quantity/i)).toBeVisible();
    await expect(modal.getByText(/average cost/i)).toBeVisible();
    await expect(modal.getByText(/cost basis/i)).toBeVisible();
    await expect(modal.getByText(/current value/i)).toBeVisible();

    // Should show unrealized gain/loss section
    await expect(modal.getByText(/unrealized gain\/loss/i)).toBeVisible();
  });

  test('should display tax lots tab with lot breakdown', async ({ page }) => {
    // Open detail modal for ACME which has ESPP + RSU lots
    const acmeRow = page.getByRole('table').locator('tbody tr', { hasText: 'ACME' });
    await expect(acmeRow).toBeVisible({ timeout: 10000 });

    const dropdownButton = acmeRow.locator('button').last();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Click on Tax Lots tab
    await modal.getByRole('tab', { name: /tax lots/i }).click();

    // Should show lot details - purchase date and shares info
    await expect(modal.getByText(/shares/i).first()).toBeVisible({ timeout: 5000 });

    // Should show lot type badges (ESPP and/or RSU for ACME)
    await expect(
      modal.getByText('ESPP').or(modal.getByText('RSU')).first()
    ).toBeVisible();

    // Should show "Total Cost" for lots
    await expect(modal.getByText(/total cost/i).first()).toBeVisible();
  });

  test('should display tax analysis tab with holding period info', async ({
    page,
  }) => {
    // Open detail modal for ACME
    const acmeRow = page.getByRole('table').locator('tbody tr', { hasText: 'ACME' });
    await expect(acmeRow).toBeVisible({ timeout: 10000 });

    const dropdownButton = acmeRow.locator('button').last();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Click on Tax Analysis tab
    await modal.getByRole('tab', { name: /tax analysis/i }).click();

    // Verify tax analysis summary cards
    await expect(modal.getByText(/net unrealized gain/i)).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText(/short-term.*long-term/i)).toBeVisible();
    await expect(modal.getByText(/estimated tax liability/i)).toBeVisible();

    // Should show the tax lot analysis table header
    await expect(modal.getByText(/tax lot analysis/i)).toBeVisible();
  });

  test('should show ESPP metadata for ESPP lots', async ({ page }) => {
    // ACME has an ESPP lot from mock data
    const acmeRow = page.getByRole('table').locator('tbody tr', { hasText: 'ACME' });
    await expect(acmeRow).toBeVisible({ timeout: 10000 });

    const dropdownButton = acmeRow.locator('button').last();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Navigate to Tax Lots tab
    await modal.getByRole('tab', { name: /tax lots/i }).click();

    // Should show ESPP badge
    await expect(modal.getByText('ESPP')).toBeVisible({ timeout: 5000 });

    // Should show Grant Date label in the ESPP purple metadata section
    await expect(modal.getByText(/grant date/i)).toBeVisible();

    // Should show Bargain Element
    await expect(modal.getByText(/bargain element/i)).toBeVisible();
  });

  test('should show RSU metadata for RSU lots', async ({ page }) => {
    // ACME has an RSU lot from mock data
    const acmeRow = page.getByRole('table').locator('tbody tr', { hasText: 'ACME' });
    await expect(acmeRow).toBeVisible({ timeout: 10000 });

    const dropdownButton = acmeRow.locator('button').last();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Navigate to Tax Lots tab
    await modal.getByRole('tab', { name: /tax lots/i }).click();

    // Should show RSU badge
    await expect(modal.getByText('RSU')).toBeVisible({ timeout: 5000 });

    // Should show Vesting Date and Vesting Price in the blue metadata section
    await expect(modal.getByText(/vesting date/i)).toBeVisible();
    await expect(modal.getByText(/vesting price/i)).toBeVisible();
  });

  test('should close modal via close button', async ({ page }) => {
    const firstRow = page.getByRole('table').locator('tbody tr').first();
    const dropdownButton = firstRow.locator('button').last();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Click the close button (X button in dialog)
    const closeButton = modal.locator('button[type="button"]').filter({ hasText: /close/i });
    // If there is no labeled close button, use the X button at top right
    const xButton = modal.locator('button.absolute, button:has(svg.lucide-x)').first();

    if (await closeButton.count() > 0) {
      await closeButton.first().click();
    } else {
      await xButton.click();
    }

    // Verify modal closes
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('should close modal via escape key', async ({ page }) => {
    const firstRow = page.getByRole('table').locator('tbody tr').first();
    const dropdownButton = firstRow.locator('button').last();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Press Escape to close
    await page.keyboard.press('Escape');

    // Verify modal closes
    await expect(modal).not.toBeVisible({ timeout: 5000 });
  });

  test('should show lot notes section in tax lots tab', async ({ page }) => {
    // Open detail modal for ACME which has multiple lot types
    const acmeRow = page.getByRole('table').locator('tbody tr', { hasText: 'ACME' });
    await expect(acmeRow).toBeVisible({ timeout: 10000 });

    const dropdownButton = acmeRow.locator('button').last();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Navigate to tax lots tab
    await modal.getByRole('tab', { name: /tax lots/i }).click();

    // The lot cards should be visible with purchase info
    // Each lot card has "Purchased" and "Sold" sections
    await expect(modal.getByText(/purchased/i).first()).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText(/sold/i).first()).toBeVisible();
  });

  test('should show last updated and number of lots in overview', async ({
    page,
  }) => {
    const acmeRow = page.getByRole('table').locator('tbody tr', { hasText: 'ACME' });
    await expect(acmeRow).toBeVisible({ timeout: 10000 });

    const dropdownButton = acmeRow.locator('button').last();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Overview tab shows "Last Updated" and "Number of Lots"
    await expect(modal.getByText(/last updated/i)).toBeVisible();
    await expect(modal.getByText(/number of lots/i)).toBeVisible();
  });
});
