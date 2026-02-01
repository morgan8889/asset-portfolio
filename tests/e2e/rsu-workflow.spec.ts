/**
 * E2E Tests for RSU Transaction Workflow
 *
 * Tests the complete user workflow for RSU vest transactions,
 * including net shares calculation, tax withholding, and metadata display.
 */

import { test, expect } from '@playwright/test';

test.describe('RSU Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard and wait for it to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should add RSU vest transaction with all metadata', async ({ page }) => {
    // Open add transaction dialog
    const addButton = page.getByRole('button', { name: /add transaction/i });
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Wait for dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Select RSU Vest transaction type
    const typeSelect = page.getByLabel(/transaction type/i);
    await typeSelect.click();
    await page.getByRole('option', { name: /rsu vest/i }).click();

    // Fill in RSU-specific fields
    await page.getByLabel(/asset symbol/i).fill('TECH');

    // Vesting date
    await page.getByLabel(/vesting date/i).fill('2024-06-15');

    // Gross shares vested
    await page.getByLabel(/gross.*shares.*vested/i).fill('100');

    // Shares withheld for tax
    await page.getByLabel(/shares.*withheld/i).fill('22');

    // Vesting price (FMV)
    await page.getByLabel(/vesting price|fmv/i).fill('150.00');

    // Submit the transaction
    const submitButton = page.getByRole('button', { name: 'Add Transaction' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Dialog should close
    await expect(dialog).not.toBeVisible();

    // Success message should appear
    await expect(page.getByText(/transaction.*added/i)).toBeVisible();
  });

  test('should calculate net shares correctly (gross - withheld)', async ({ page }) => {
    // Open add transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Select RSU Vest
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /rsu vest/i }).click();

    // Fill in fields
    await page.getByLabel(/asset symbol/i).fill('TECH');
    await page.getByLabel(/vesting date/i).fill('2024-06-15');
    await page.getByLabel(/gross.*shares.*vested/i).fill('100');
    await page.getByLabel(/shares.*withheld/i).fill('22');
    await page.getByLabel(/vesting price|fmv/i).fill('150.00');

    // Check that net shares calculation is shown
    // Net shares = 100 - 22 = 78
    await expect(page.getByText(/net.*shares.*78/i)).toBeVisible();
  });

  test('should calculate cost basis as FMV × net shares', async ({ page }) => {
    // Open add transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Select RSU Vest
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /rsu vest/i }).click();

    // Fill in fields
    await page.getByLabel(/asset symbol/i).fill('TECH');
    await page.getByLabel(/vesting date/i).fill('2024-06-15');
    await page.getByLabel(/gross.*shares.*vested/i).fill('100');
    await page.getByLabel(/shares.*withheld/i).fill('25');
    await page.getByLabel(/vesting price|fmv/i).fill('200.00');

    // Check cost basis calculation
    // Net shares = 100 - 25 = 75
    // Cost basis = 75 * 200 = $15,000
    await expect(page.getByText(/cost basis.*15,000/i)).toBeVisible();
  });

  test('should display RSU lot with metadata in holdings', async ({ page }) => {
    // First, add an RSU transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /rsu vest/i }).click();

    await page.getByLabel(/asset symbol/i).fill('VEST');
    await page.getByLabel(/vesting date/i).fill('2024-03-15');
    await page.getByLabel(/gross.*shares.*vested/i).fill('50');
    await page.getByLabel(/shares.*withheld/i).fill('12');
    await page.getByLabel(/vesting price|fmv/i).fill('180.00');

    await page.getByRole('button', { name: 'Add Transaction' }).click();

    // Navigate to holdings page
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    // Should see the holding with RSU badge
    await expect(page.getByText('VEST')).toBeVisible();
    await expect(page.getByText('RSU')).toBeVisible();

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

    // Should see RSU badge
    await expect(modal.getByText('RSU')).toBeVisible();

    // Should see vesting date
    await expect(modal.getByText(/mar.*15.*2024/i)).toBeVisible();

    // Should see vesting price (FMV)
    await expect(modal.getByText(/vesting price.*fmv/i)).toBeVisible();
    await expect(modal.getByText(/180\.00/)).toBeVisible();
  });

  test('should show net shares in holdings, not gross shares', async ({ page }) => {
    // Add RSU transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /rsu vest/i }).click();

    await page.getByLabel(/asset symbol/i).fill('NET');
    await page.getByLabel(/vesting date/i).fill('2024-01-10');
    await page.getByLabel(/gross.*shares.*vested/i).fill('100');
    await page.getByLabel(/shares.*withheld/i).fill('28');
    await page.getByLabel(/vesting price|fmv/i).fill('250.00');

    await page.getByRole('button', { name: 'Add Transaction' }).click();

    // Navigate to holdings page
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    // Should see NET shares = 100 - 28 = 72
    await expect(page.getByText('NET')).toBeVisible();

    // Open detail modal to check quantity
    const dropdownButton = page.locator('[role="button"]').filter({ hasText: /⋮/ }).first();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Should show 72 shares (net), not 100 (gross)
    await expect(modal.getByText(/72/)).toBeVisible();
  });

  test('should validate gross shares >= withheld shares', async ({ page }) => {
    // Open add transaction dialog
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /rsu vest/i }).click();

    // Set withheld shares greater than gross shares (invalid)
    await page.getByLabel(/gross.*shares.*vested/i).fill('50');
    await page.getByLabel(/shares.*withheld/i).fill('60');

    // Fill other required fields
    await page.getByLabel(/asset symbol/i).fill('TECH');
    await page.getByLabel(/vesting date/i).fill('2024-06-15');
    await page.getByLabel(/vesting price|fmv/i).fill('150.00');

    // Try to submit
    const submitButton = page.getByRole('button', { name: 'Add Transaction' });

    // Should show validation error or submit button should be disabled
    await expect(
      page.getByText(/withheld.*cannot exceed.*gross/i).or(submitButton.and(page.locator('[disabled]')))
    ).toBeVisible();
  });

  test('should show RSU lot as standard type in tax analysis', async ({ page }) => {
    // Add RSU transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /rsu vest/i }).click();

    await page.getByLabel(/asset symbol/i).fill('TAX');
    await page.getByLabel(/vesting date/i).fill('2024-02-20');
    await page.getByLabel(/gross.*shares.*vested/i).fill('100');
    await page.getByLabel(/shares.*withheld/i).fill('22');
    await page.getByLabel(/vesting price|fmv/i).fill('175.00');

    await page.getByRole('button', { name: 'Add Transaction' }).click();

    // Navigate to tax analysis page
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Should see the RSU lot in the table
    await expect(page.getByText('TAX')).toBeVisible();

    // Should see RSU badge in Type column
    await expect(page.getByText('RSU')).toBeVisible();

    // RSUs should not have disqualifying warnings (only for ESPP)
    const warningsCell = page.locator('td').filter({ hasText: /—|qualifying|disqualifying/i });
    await expect(warningsCell).toBeVisible();
  });

  test('should display vesting metadata in blue card', async ({ page }) => {
    // Add RSU transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /rsu vest/i }).click();

    await page.getByLabel(/asset symbol/i).fill('BLUE');
    await page.getByLabel(/vesting date/i).fill('2024-04-10');
    await page.getByLabel(/gross.*shares.*vested/i).fill('80');
    await page.getByLabel(/shares.*withheld/i).fill('20');
    await page.getByLabel(/vesting price|fmv/i).fill('220.00');

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

    // Go to Tax Lots tab
    await page.getByRole('tab', { name: /tax lots/i }).click();

    // Should see blue-colored metadata card for RSU
    // Looking for the blue background class or vesting-specific text
    const vestingCard = modal.locator('.bg-blue-50, .dark\\:bg-blue-950\\/20');
    await expect(vestingCard).toBeVisible();

    // Should show vesting date and FMV
    await expect(modal.getByText(/vesting date/i)).toBeVisible();
    await expect(modal.getByText(/vesting price.*fmv/i)).toBeVisible();
  });

  test('should navigate through all tabs in RSU holding detail modal', async ({ page }) => {
    // Add RSU transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /rsu vest/i }).click();

    await page.getByLabel(/asset symbol/i).fill('MODAL');
    await page.getByLabel(/vesting date/i).fill('2024-05-01');
    await page.getByLabel(/gross.*shares.*vested/i).fill('120');
    await page.getByLabel(/shares.*withheld/i).fill('30');
    await page.getByLabel(/vesting price|fmv/i).fill('195.00');

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
    await expect(modal.getByText(/90/)).toBeVisible(); // Net shares: 120 - 30

    // Test Tax Lots tab
    await page.getByRole('tab', { name: /tax lots/i }).click();
    await expect(modal.getByText('RSU')).toBeVisible();
    await expect(modal.getByText(/vesting date/i)).toBeVisible();

    // Test Tax Analysis tab
    await page.getByRole('tab', { name: /tax analysis/i }).click();
    await expect(modal.getByText(/unrealized gain/i)).toBeVisible();
  });

  test('should calculate holding period from vesting date', async ({ page }) => {
    // Add an old RSU (>1 year ago for long-term)
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /rsu vest/i }).click();

    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    await page.getByLabel(/asset symbol/i).fill('OLD');
    await page.getByLabel(/vesting date/i).fill(twoYearsAgo.toISOString().split('T')[0]);
    await page.getByLabel(/gross.*shares.*vested/i).fill('100');
    await page.getByLabel(/shares.*withheld/i).fill('25');
    await page.getByLabel(/vesting price|fmv/i).fill('100.00');

    await page.getByRole('button', { name: 'Add Transaction' }).click();

    // Navigate to tax analysis
    await page.goto('/tax-analysis');
    await page.waitForLoadState('networkidle');

    // Should show as long-term (>365 days from vesting)
    await expect(page.getByText('OLD')).toBeVisible();
    await expect(page.getByText(/long-term/i)).toBeVisible();
  });

  test('should show correct cost basis in tax lot table', async ({ page }) => {
    // Add RSU with known values
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/transaction type/i).click();
    await page.getByRole('option', { name: /rsu vest/i }).click();

    await page.getByLabel(/asset symbol/i).fill('BASIS');
    await page.getByLabel(/vesting date/i).fill('2024-01-15');
    await page.getByLabel(/gross.*shares.*vested/i).fill('100');
    await page.getByLabel(/shares.*withheld/i).fill('22');
    await page.getByLabel(/vesting price|fmv/i).fill('200.00');

    await page.getByRole('button', { name: 'Add Transaction' }).click();

    // Go to holdings detail
    await page.goto('/holdings');
    await page.waitForLoadState('networkidle');

    const dropdownButton = page.locator('[role="button"]').filter({ hasText: /⋮/ }).first();
    await dropdownButton.click();
    await page.getByRole('menuitem', { name: /view details/i }).click();

    const modal = page.getByRole('dialog');
    await page.getByRole('tab', { name: /tax lots/i }).click();

    // Cost basis should be: (100 - 22) * 200 = 78 * 200 = $15,600
    await expect(modal.getByText(/total cost/i)).toBeVisible();
    await expect(modal.getByText(/15,600/)).toBeVisible();
  });
});
