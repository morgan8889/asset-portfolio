/**
 * E2E Tests for ESPP Transaction Workflow
 *
 * Tests the complete user workflow for ESPP purchase transactions,
 * including metadata entry, lot viewing, and tax analysis.
 */

import { test, expect } from '@playwright/test';

test.describe('ESPP Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard and wait for it to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should add ESPP purchase transaction with all metadata', async ({ page }) => {
    // Open add transaction dialog
    const addButton = page.getByRole('button', { name: /add transaction/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Wait for dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Select ESPP Purchase transaction type
    const typeSelect = page.getByLabel(/transaction type/i);
    await typeSelect.click();
    await page.getByRole('option', { name: /espp purchase/i }).click();

    // Fill in ESPP-specific fields
    await page.getByLabel(/asset symbol/i).fill('ACME');

    // Grant date (offering date)
    await page.getByLabel(/grant date/i).fill('2023-06-01');

    // Purchase date
    await page.getByLabel(/purchase date/i).fill('2023-12-01');

    // Market price at grant
    await page.getByLabel(/market price.*grant/i).fill('100.00');

    // Market price at purchase
    await page.getByLabel(/market price.*purchase/i).fill('120.00');

    // Discount percentage
    await page.getByLabel(/discount/i).fill('15');

    // Quantity
    await page.getByLabel(/quantity/i).fill('100');

    // Submit the transaction
    const submitButton = page.getByRole('button', { name: 'Add Transaction' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // Success message should appear
    await expect(page.getByText(/transaction.*added/i)).toBeVisible();
  });

  test('should calculate ESPP cost basis correctly with discount', async ({ page }) => {
    // Open add transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Select ESPP Purchase
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /espp purchase/i }).click();

    // Fill in fields
    await page.getByLabel(/asset symbol/i).fill('ACME');
    await page.getByLabel(/grant date/i).fill('2023-06-01');
    await page.getByLabel(/purchase date/i).fill('2023-12-01');
    await page.getByLabel(/market price.*grant/i).fill('100.00');
    await page.getByLabel(/market price.*purchase/i).fill('120.00');
    await page.getByLabel(/discount/i).fill('15');
    await page.getByLabel(/quantity/i).fill('100');

    // Check that cost basis calculation is shown
    // Cost basis should be: 120.00 * (1 - 0.15) * 100 = 120 * 0.85 * 100 = $10,200
    await expect(page.getByText(/cost basis.*10,200/i)).toBeVisible();
  });

  test('should display ESPP lot with metadata in holdings', async ({ page }) => {
    // First, add an ESPP transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /espp purchase/i }).click();

    await page.getByLabel(/asset symbol/i).fill('TEST');
    await page.getByLabel(/grant date/i).fill('2024-01-01');
    await page.getByLabel(/purchase date/i).fill('2024-07-01');
    await page.getByLabel(/market price.*grant/i).fill('80.00');
    await page.getByLabel(/market price.*purchase/i).fill('100.00');
    await page.getByLabel(/discount/i).fill('15');
    await page.getByLabel(/quantity/i).fill('50');

    await page.getByRole('button', { name: 'Add Transaction' }).click();

    // Navigate to holdings page
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    // Should see the holding with ESPP badge
    await expect(page.getByText('TEST')).toBeVisible();
    await expect(page.getByText('ESPP')).toBeVisible();

    // Click dropdown menu on the holding
    const dropdownButton = page.locator('[role="button"]').filter({ hasText: /⋮/ }).first();
    await dropdownButton.click();

    // Click "View Details"
    await page.getByRole('menuitem', { name: /view details/i }).click();

    // Modal should open
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Navigate to Tax Lots tab
    await page.getByRole('tab', { name: /tax lots/i }).click();

    // Should see ESPP badge
    await expect(modal.getByText('ESPP')).toBeVisible();

    // Should see grant date
    await expect(modal.getByText(/jan.*01.*2024/i)).toBeVisible();

    // Should see bargain element
    // Bargain element = (100 - 85) * 50 = $750
    await expect(modal.getByText(/bargain element/i)).toBeVisible();
    await expect(modal.getByText(/750/)).toBeVisible();
  });

  test('should show disqualifying disposition warning for recent ESPP', async ({ page }) => {
    // Add a recent ESPP transaction (within 2 years and 1 year)
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /espp purchase/i }).click();

    // Use recent dates
    const today = new Date();
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    await page.getByLabel(/asset symbol/i).fill('WARN');
    await page.getByLabel(/grant date/i).fill(oneYearAgo.toISOString().split('T')[0]);
    await page.getByLabel(/purchase date/i).fill(sixMonthsAgo.toISOString().split('T')[0]);
    await page.getByLabel(/market price.*grant/i).fill('90.00');
    await page.getByLabel(/market price.*purchase/i).fill('110.00');
    await page.getByLabel(/discount/i).fill('15');
    await page.getByLabel(/quantity/i).fill('100');

    await page.getByRole('button', { name: 'Add Transaction' }).click();

    // Navigate to tax analysis page
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Should see the ESPP lot in the table
    await expect(page.getByText('WARN')).toBeVisible();

    // Should see disqualifying warning badge
    await expect(page.getByText(/disqualifying/i)).toBeVisible();

    // Should see warning icon
    await expect(page.locator('[data-testid="alert-triangle"]').or(page.locator('svg').filter({ hasText: '' }))).toBeVisible();

    // Hover over the warning to see tooltip
    const warningBadge = page.getByText(/disqualifying/i);
    await warningBadge.hover();

    // Tooltip should show detailed information
    await expect(page.getByText(/ordinary income/i)).toBeVisible();
  });

  test('should show qualifying badge for old ESPP lot', async ({ page }) => {
    // Add an old ESPP transaction (>2 years from grant, >1 year from purchase)
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /espp purchase/i }).click();

    // Use dates that meet qualifying requirements
    const today = new Date();
    const threeYearsAgo = new Date(today);
    threeYearsAgo.setFullYear(today.getFullYear() - 3);
    const twoYearsAgo = new Date(today);
    twoYearsAgo.setFullYear(today.getFullYear() - 2);

    await page.getByLabel(/asset symbol/i).fill('QUAL');
    await page.getByLabel(/grant date/i).fill(threeYearsAgo.toISOString().split('T')[0]);
    await page.getByLabel(/purchase date/i).fill(twoYearsAgo.toISOString().split('T')[0]);
    await page.getByLabel(/market price.*grant/i).fill('70.00');
    await page.getByLabel(/market price.*purchase/i).fill('95.00');
    await page.getByLabel(/discount/i).fill('15');
    await page.getByLabel(/quantity/i).fill('100');

    await page.getByRole('button', { name: 'Add Transaction' }).click();

    // Navigate to tax analysis page
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Should see the ESPP lot
    await expect(page.getByText('QUAL')).toBeVisible();

    // Should see qualifying badge (green)
    const qualifyingBadge = page.getByText(/qualifying/i).filter({ hasNotText: /disqualifying/i });
    await expect(qualifyingBadge).toBeVisible();
  });

  test('should validate ESPP grant date is before purchase date', async ({ page }) => {
    // Open add transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /espp purchase/i }).click();

    // Set grant date AFTER purchase date (invalid)
    await page.getByLabel(/grant date/i).fill('2024-12-01');
    await page.getByLabel(/purchase date/i).fill('2024-06-01');

    // Fill other required fields
    await page.getByLabel(/asset symbol/i).fill('ACME');
    await page.getByLabel(/market price.*grant/i).fill('100.00');
    await page.getByLabel(/market price.*purchase/i).fill('120.00');
    await page.getByLabel(/discount/i).fill('15');
    await page.getByLabel(/quantity/i).fill('100');

    // Try to submit
    const submitButton = page.getByRole('button', { name: 'Add Transaction' });

    // Should show validation error or submit button should be disabled
    await expect(
      page.getByText(/grant date.*before.*purchase/i).or(submitButton.and(page.locator('[disabled]')))
    ).toBeVisible();
  });

  test('should navigate through all tabs in ESPP holding detail modal', async ({ page }) => {
    // Add ESPP transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /espp purchase/i }).click();

    await page.getByLabel(/asset symbol/i).fill('TABS');
    await page.getByLabel(/grant date/i).fill('2023-01-01');
    await page.getByLabel(/purchase date/i).fill('2023-07-01');
    await page.getByLabel(/market price.*grant/i).fill('80.00');
    await page.getByLabel(/market price.*purchase/i).fill('100.00');
    await page.getByLabel(/discount/i).fill('15');
    await page.getByLabel(/quantity/i).fill('100');

    await page.getByRole('button', { name: 'Add Transaction' }).click();

    // Go to holdings
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    // Open detail modal
    const dropdownButton = page.locator('[role="button"]').filter({ hasText: /⋮/ }).first();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Test Overview tab
    await page.getByRole('tab', { name: /overview/i }).click();
    await expect(modal.getByText(/quantity/i)).toBeVisible();
    await expect(modal.getByText(/cost basis/i)).toBeVisible();

    // Test Tax Lots tab
    await page.getByRole('tab', { name: /tax lots/i }).click();
    await expect(modal.getByText('ESPP')).toBeVisible();
    await expect(modal.getByText(/grant date/i)).toBeVisible();

    // Test Tax Analysis tab
    await page.getByRole('tab', { name: /tax analysis/i }).click();
    await expect(modal.getByText(/unrealized gain/i)).toBeVisible();
    await expect(modal.getByText(/short-term|long-term/i)).toBeVisible();
  });
});
