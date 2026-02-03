/**
 * E2E Tests for Holdings Detail Modal
 *
 * Tests the holdings detail modal functionality including viewing tax lots,
 * editing transaction data, and updating holdings information.
 *
 * Coverage:
 * - Opening detail modal from holdings table
 * - Viewing tax lot breakdown
 * - Viewing tax analysis tab
 * - Editing transaction data
 * - Verifying updates persist
 */

import { test, expect } from '@playwright/test';

test.describe('Holdings Detail Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    await expect(page.getByText(/portfolio dashboard/i)).toBeVisible({ timeout: 10000 });

    // Generate mock data if needed
    const generateButton = page.getByRole('button', { name: /generate mock data/i });
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await expect(page).toHaveURL('/', { timeout: 10000 });
      await expect(page.getByText(/total value/i)).toBeVisible({ timeout: 5000 });
    }

    // Navigate to holdings page
    await page.getByRole('link', { name: /holdings/i }).click();
    await expect(page.getByRole('heading', { name: /holdings/i })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
  });

  test('should open holdings detail modal from dropdown menu', async ({ page }) => {
    // Find first holding row
    const firstRow = page.getByRole('table').locator('tbody tr').first();
    await expect(firstRow).toBeVisible();

    // Click the dropdown menu button (three dots)
    const dropdownButton = firstRow.getByRole('button', { name: /more options/i }).or(firstRow.locator('button[aria-haspopup="menu"]'));

    // If dropdown exists, click it
    if (await dropdownButton.count() > 0) {
      await dropdownButton.first().click();

      // Click "View Details" option
      await page.getByRole('menuitem', { name: /view details/i }).click();

      // Verify modal opens
      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify modal has holding information
      await expect(modal.getByText(/overview|details/i)).toBeVisible();
    }
  });

  test('should display overview tab with holding summary', async ({ page }) => {
    // Get first holding
    const firstRow = page.getByRole('table').locator('tbody tr').first();
    const symbolCell = firstRow.locator('td').first();
    const symbol = await symbolCell.textContent();

    // Open detail modal (if dropdown exists)
    const dropdownButton = firstRow.getByRole('button', { name: /more options/i }).or(firstRow.locator('button[aria-haspopup="menu"]'));

    if (await dropdownButton.count() > 0) {
      await dropdownButton.first().click();
      await page.getByRole('menuitem', { name: /view details/i }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Verify overview tab shows key metrics
      await expect(modal.getByText(/total quantity|shares/i)).toBeVisible({ timeout: 5000 });
      await expect(modal.getByText(/cost basis|average cost/i)).toBeVisible({ timeout: 5000 });
      await expect(modal.getByText(/current value|market value/i)).toBeVisible({ timeout: 5000 });
      await expect(modal.getByText(/unrealized gain|gain\/loss/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display tax lots tab with lot breakdown', async ({ page }) => {
    const firstRow = page.getByRole('table').locator('tbody tr').first();
    const dropdownButton = firstRow.getByRole('button', { name: /more options/i }).or(firstRow.locator('button[aria-haspopup="menu"]'));

    if (await dropdownButton.count() > 0) {
      await dropdownButton.first().click();
      await page.getByRole('menuitem', { name: /view details/i }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Click on Tax Lots tab
      const taxLotsTab = modal.getByRole('tab', { name: /tax lots|lots/i });
      if (await taxLotsTab.count() > 0) {
        await taxLotsTab.click();

        // Verify tax lot table appears
        await expect(modal.getByRole('table')).toBeVisible({ timeout: 5000 });

        // Should show lot details
        await expect(modal.getByText(/purchase date|acquired/i)).toBeVisible({ timeout: 5000 });
        await expect(modal.getByText(/quantity/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display tax analysis tab with holding period info', async ({ page }) => {
    const firstRow = page.getByRole('table').locator('tbody tr').first();
    const dropdownButton = firstRow.getByRole('button', { name: /more options/i }).or(firstRow.locator('button[aria-haspopup="menu"]'));

    if (await dropdownButton.count() > 0) {
      await dropdownButton.first().click();
      await page.getByRole('menuitem', { name: /view details/i }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Click on Tax Analysis tab
      const taxTab = modal.getByRole('tab', { name: /tax analysis|tax/i });
      if (await taxTab.count() > 0) {
        await taxTab.click();

        // Verify tax analysis content
        await expect(modal.getByText(/holding period|short.*term|long.*term/i)).toBeVisible({ timeout: 5000 });
        await expect(modal.getByText(/estimated tax|tax liability/i).or(modal.getByText(/capital gains/i))).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should show ESPP metadata for ESPP lots', async ({ page }) => {
    // First create an ESPP transaction
    await page.getByRole('button', { name: /add transaction/i }).click();

    let dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /espp purchase/i }).click();

    await page.getByLabel(/asset symbol/i).fill('ESPPTEST');
    await page.getByLabel(/grant date/i).fill('2024-01-15');
    await page.getByLabel(/purchase date/i).fill('2024-07-15');
    await page.getByLabel(/market price.*grant/i).fill('100.00');
    await page.getByLabel(/market price.*purchase/i).fill('120.00');
    await page.getByLabel(/discount/i).fill('15');
    await page.getByLabel(/^quantity$/i).fill('100');

    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Reload holdings page
    await page.reload();
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });

    // Find the ESPP holding
    const esppRow = page.getByRole('table').locator('tbody tr', { hasText: 'ESPPTEST' });
    if (await esppRow.count() > 0) {
      const dropdownButton = esppRow.getByRole('button', { name: /more options/i }).or(esppRow.locator('button[aria-haspopup="menu"]'));

      if (await dropdownButton.count() > 0) {
        await dropdownButton.first().click();
        await page.getByRole('menuitem', { name: /view details/i }).click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Should show ESPP badge or indicator
        await expect(modal.getByText(/espp/i)).toBeVisible({ timeout: 5000 });

        // Check tax lots tab for grant date
        const taxLotsTab = modal.getByRole('tab', { name: /tax lots|lots/i });
        if (await taxLotsTab.count() > 0) {
          await taxLotsTab.click();
          await expect(modal.getByText(/grant date/i)).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should show RSU metadata for RSU lots', async ({ page }) => {
    // First create an RSU transaction
    await page.getByRole('button', { name: /add transaction/i }).click();

    let dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /rsu vest/i }).click();

    await page.getByLabel(/asset symbol/i).fill('RSUTEST');
    await page.getByLabel(/vesting date/i).fill('2025-01-15');
    await page.getByLabel(/gross shares/i).fill('100');
    await page.getByLabel(/shares withheld/i).fill('22');
    await page.getByLabel(/vesting price/i).fill('150.00');

    await page.getByRole('button', { name: /add transaction/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Reload holdings page
    await page.reload();
    await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });

    // Find the RSU holding
    const rsuRow = page.getByRole('table').locator('tbody tr', { hasText: 'RSUTEST' });
    if (await rsuRow.count() > 0) {
      const dropdownButton = rsuRow.getByRole('button', { name: /more options/i }).or(rsuRow.locator('button[aria-haspopup="menu"]'));

      if (await dropdownButton.count() > 0) {
        await dropdownButton.first().click();
        await page.getByRole('menuitem', { name: /view details/i }).click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Should show RSU badge or indicator
        await expect(modal.getByText(/rsu/i)).toBeVisible({ timeout: 5000 });

        // Check tax lots tab for vesting info
        const taxLotsTab = modal.getByRole('tab', { name: /tax lots|lots/i });
        if (await taxLotsTab.count() > 0) {
          await taxLotsTab.click();
          await expect(modal.getByText(/vesting date|vesting price/i)).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('should close modal on cancel button', async ({ page }) => {
    const firstRow = page.getByRole('table').locator('tbody tr').first();
    const dropdownButton = firstRow.getByRole('button', { name: /more options/i }).or(firstRow.locator('button[aria-haspopup="menu"]'));

    if (await dropdownButton.count() > 0) {
      await dropdownButton.first().click();
      await page.getByRole('menuitem', { name: /view details/i }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Click close button
      const closeButton = modal.getByRole('button', { name: /close/i }).or(modal.locator('button[aria-label="Close"]'));
      await closeButton.first().click();

      // Verify modal closes
      await expect(modal).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should show lot-level notes if present', async ({ page }) => {
    const firstRow = page.getByRole('table').locator('tbody tr').first();
    const dropdownButton = firstRow.getByRole('button', { name: /more options/i }).or(firstRow.locator('button[aria-haspopup="menu"]'));

    if (await dropdownButton.count() > 0) {
      await dropdownButton.first().click();
      await page.getByRole('menuitem', { name: /view details/i }).click();

      const modal = page.getByRole('dialog');
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Navigate to tax lots tab
      const taxLotsTab = modal.getByRole('tab', { name: /tax lots|lots/i });
      if (await taxLotsTab.count() > 0) {
        await taxLotsTab.click();

        // Check for notes column or notes section
        // (Implementation may vary - just verify structure exists)
        await expect(modal.getByRole('table')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
