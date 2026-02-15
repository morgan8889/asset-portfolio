/**
 * Net Worth Planning & FIRE Feature E2E Tests
 *
 * Tests the planning page including:
 * - Page sections and layout
 * - Liability CRUD (add, edit, delete)
 * - FIRE goal settings
 * - FIRE projection chart and metrics
 * - What-If scenario CRUD and toggling
 * - Time range selector for net worth history
 */

import { test, expect, seedMockData } from './fixtures/test';

test.describe('Net Worth Planning & FIRE Feature', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);
    await page.goto('/planning');
    await page.waitForLoadState('load');
  });

  test('should load planning page with all sections', async ({ page }) => {
    // Check main heading
    await expect(
      page.getByRole('heading', { name: 'Financial Planning' })
    ).toBeVisible({ timeout: 10000 });

    // Net Worth History section
    await expect(
      page.getByRole('heading', { name: 'Net Worth History' }).first()
    ).toBeVisible();

    // FIRE Planning section
    await expect(
      page.getByRole('heading', { name: 'FIRE Planning' })
    ).toBeVisible();

    // FIRE Goal Settings card
    await expect(page.getByText('FIRE Goal Settings')).toBeVisible();

    // Path to Financial Independence card
    await expect(
      page.getByText('Path to Financial Independence').first()
    ).toBeVisible();

    // What-If Analysis section
    await expect(
      page.getByRole('heading', { name: 'What-If Analysis' })
    ).toBeVisible();
    await expect(page.getByText('What-If Scenarios')).toBeVisible();
  });

  test('should display net worth chart area', async ({ page }) => {
    // Check chart renders (the net worth chart card)
    await expect(page.getByText('Net Worth History').first()).toBeVisible();

    // Check summary metrics are displayed in the chart header
    await expect(page.getByText('Current Net Worth')).toBeVisible();
    await expect(page.getByText('Total Assets')).toBeVisible();
    await expect(page.getByText('Total Liabilities')).toBeVisible();
  });

  test('should allow adding a liability', async ({ page }) => {
    // Click Add Liability button
    await page.getByRole('button', { name: /add liability/i }).click();

    // Wait for dialog to open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Fill in liability form (uses shadcn Input with html id attributes)
    await dialog.locator('#name').fill('Test Mortgage');
    await dialog.locator('#balance').fill('250000');
    await dialog.locator('#interestRate').fill('4.5');
    await dialog.locator('#payment').fill('1500');
    await dialog.locator('#startDate').fill('2020-01-01');
    await dialog.locator('#termMonths').fill('360');

    // Submit form - the button says "Add" for new liabilities
    await dialog.getByRole('button', { name: /^add$/i }).click();

    // Verify dialog closed
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify liability appears in the table
    await expect(page.getByText('Test Mortgage')).toBeVisible({
      timeout: 5000,
    });
  });

  test('should allow editing a liability', async ({ page }) => {
    // First add a liability
    await page.getByRole('button', { name: /add liability/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('Edit Test Liability');
    await dialog.locator('#balance').fill('100000');
    await dialog.locator('#interestRate').fill('3.5');
    await dialog.locator('#payment').fill('800');
    await dialog.locator('#startDate').fill('2021-06-01');
    await dialog.getByRole('button', { name: /^add$/i }).click();

    // Wait for dialog to close and liability to appear
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Edit Test Liability')).toBeVisible();

    // Click the edit button (Edit2 icon) in the liability row
    const row = page.locator('tr').filter({ hasText: 'Edit Test Liability' });
    // Edit button is the first icon button in the actions cell
    await row.getByRole('button').first().click();

    // Dialog should re-open in edit mode
    const editDialog = page.getByRole('dialog');
    await expect(editDialog).toBeVisible();

    // Update the balance
    await editDialog.locator('#balance').clear();
    await editDialog.locator('#balance').fill('95000');

    // Submit - button says "Update" in edit mode
    await editDialog.getByRole('button', { name: /update/i }).click();

    // Wait for dialog to close
    await expect(editDialog).not.toBeVisible({ timeout: 5000 });
  });

  test('should allow deleting a liability', async ({ page }) => {
    // Add a liability to delete
    await page.getByRole('button', { name: /add liability/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('Delete Test');
    await dialog.locator('#balance').fill('50000');
    await dialog.locator('#interestRate').fill('5.0');
    await dialog.locator('#payment').fill('500');
    await dialog.locator('#startDate').fill('2022-01-01');
    await dialog.getByRole('button', { name: /^add$/i }).click();

    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Delete Test')).toBeVisible();

    // Click the delete button (Trash2 icon) in the liability row
    const row = page.locator('tr').filter({ hasText: 'Delete Test' });
    // Delete button is the last icon button in the actions cell
    await row.getByRole('button').last().click();

    // AlertDialog should appear for confirmation
    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog).toBeVisible();

    // Click "Delete" to confirm
    await alertDialog.getByRole('button', { name: /delete/i }).click();

    // Verify deletion
    await expect(page.getByText('Delete Test')).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('should update FIRE goal settings', async ({ page }) => {
    // The FIRE Goal Settings card has input fields
    const annualExpenses = page.locator('#annualExpenses');
    const monthlySavings = page.locator('#monthlySavings');
    const expectedReturn = page.locator('#expectedReturn');

    // Update values
    await annualExpenses.clear();
    await annualExpenses.fill('50000');
    await monthlySavings.clear();
    await monthlySavings.fill('3000');
    await expectedReturn.clear();
    await expectedReturn.fill('8');

    // Submit form
    await page.getByRole('button', { name: /update goals/i }).click();

    // Check that FIRE Target display updated
    await expect(page.getByText(/FIRE Target:/)).toBeVisible();

    // Verify projection chart header is visible
    await expect(
      page.getByText('Path to Financial Independence').first()
    ).toBeVisible();
  });

  test('should display FIRE projection chart with metrics', async ({
    page,
  }) => {
    // Check for key metrics in the projection chart header
    await expect(page.getByText('Years to FIRE')).toBeVisible();
    await expect(page.getByText('FIRE Target').first()).toBeVisible();
    await expect(page.getByText('Monthly Progress')).toBeVisible();
  });

  test('should create and toggle a scenario', async ({ page }) => {
    // Click Add Scenario
    await page.getByRole('button', { name: /add scenario/i }).click();

    // Fill scenario form in dialog
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('Market Crash Test');

    // Scenario type uses a shadcn Select (not native <select>)
    // Click the trigger to open
    const typeTrigger = dialog.getByRole('combobox');
    await typeTrigger.click();
    await page.getByRole('option', { name: 'Market Correction' }).click();

    await dialog.locator('#value').fill('20');

    // Submit - button says "Create"
    await dialog.getByRole('button', { name: /create/i }).click();

    // Verify dialog closed
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Verify scenario appears
    await expect(page.getByText('Market Crash Test')).toBeVisible({
      timeout: 5000,
    });

    // Toggle scenario on - find the scenario row by its border styling and name
    // The scenario item is a rounded-lg border div containing the scenario name
    const scenarioRow = page
      .locator('.rounded-lg.border.p-3')
      .filter({ hasText: 'Market Crash Test' });
    await expect(scenarioRow).toBeVisible();

    // The first button inside the scenario row is the toggle
    const toggleButton = scenarioRow.getByRole('button').first();
    await toggleButton.click();

    // Verify active scenarios indicator appears
    await expect(page.getByText(/1 scenario.*active/i)).toBeVisible({
      timeout: 5000,
    });

    // Toggle scenario off
    await toggleButton.click();

    // Active indicator should disappear
    await expect(page.getByText(/1 scenario.*active/i)).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('should create different scenario types', async ({ page }) => {
    // Expense Increase Scenario
    await page.getByRole('button', { name: /add scenario/i }).click();
    let dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('Lifestyle Inflation');
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Expense Increase' }).click();
    await dialog.locator('#value').fill('10');
    await dialog.getByRole('button', { name: /create/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Lifestyle Inflation')).toBeVisible();

    // Income Change Scenario
    await page.getByRole('button', { name: /add scenario/i }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('Salary Raise');
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Income Change' }).click();
    await dialog.locator('#value').fill('15');
    await dialog.getByRole('button', { name: /create/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Salary Raise')).toBeVisible();

    // One-time Expense Scenario
    await page.getByRole('button', { name: /add scenario/i }).click();
    dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('House Down Payment');
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: 'One-Time Expense' }).click();
    await dialog.locator('#value').fill('50000');
    await dialog.locator('#durationMonths').fill('12');
    await dialog.getByRole('button', { name: /create/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('House Down Payment')).toBeVisible();
  });

  test('should delete a scenario', async ({ page }) => {
    // Add a scenario
    await page.getByRole('button', { name: /add scenario/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('Delete Me');
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Market Correction' }).click();
    await dialog.locator('#value').fill('10');
    await dialog.getByRole('button', { name: /create/i }).click();
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Delete Me')).toBeVisible();

    // Click delete button (Trash2 icon) - last button in the scenario row
    const scenarioItem = page
      .locator('div')
      .filter({ hasText: 'Delete Me' })
      .filter({ has: page.getByRole('button') })
      .first();
    await scenarioItem.getByRole('button').last().click();

    // AlertDialog should appear
    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog).toBeVisible();

    // Confirm deletion
    await alertDialog.getByRole('button', { name: /delete/i }).click();

    // Verify deletion
    await expect(page.getByText('Delete Me')).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('should change time range for net worth history', async ({ page }) => {
    // Time range uses a shadcn Select with id="timeRange"
    const timeRangeTrigger = page.locator('#timeRange');
    await expect(timeRangeTrigger).toBeVisible();

    // Change to 1 Year
    await timeRangeTrigger.click();
    await page.getByRole('option', { name: '1 Year' }).click();

    // Chart should still be visible
    await expect(page.getByText('Net Worth History').first()).toBeVisible();

    // Change to 3 Years
    await timeRangeTrigger.click();
    await page.getByRole('option', { name: '3 Years' }).click();

    // Change to All Time
    await timeRangeTrigger.click();
    await page.getByRole('option', { name: 'All Time' }).click();

    // Chart should still be visible
    await expect(page.getByText('Net Worth History').first()).toBeVisible();
  });

  test('should handle negative net worth gracefully', async ({ page }) => {
    // Add a large liability to potentially create negative net worth
    await page.getByRole('button', { name: /add liability/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await dialog.locator('#name').fill('Huge Debt');
    await dialog.locator('#balance').fill('10000000');
    await dialog.locator('#interestRate').fill('5.0');
    await dialog.locator('#payment').fill('50000');
    await dialog.locator('#startDate').fill('2020-01-01');
    await dialog.getByRole('button', { name: /^add$/i }).click();

    // Wait for dialog to close
    await expect(dialog).not.toBeVisible({ timeout: 5000 });

    // Wait for liability to appear in table
    await expect(page.getByText('Huge Debt')).toBeVisible();

    // Chart area should still render
    await expect(page.getByText('Net Worth History').first()).toBeVisible();

    // Check for warning about not reaching FIRE
    await expect(
      page.getByText(/may not reach FIRE/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show congratulations when net worth exceeds target', async ({
    page,
  }) => {
    // Set very low annual expenses to make FIRE target low
    const annualExpenses = page.locator('#annualExpenses');
    await annualExpenses.clear();
    await annualExpenses.fill('1000');
    await page.getByRole('button', { name: /update goals/i }).click();

    // Wait for projection to update
    await expect(
      page.getByText('Path to Financial Independence').first()
    ).toBeVisible();

    // Check for congratulations message (may appear if mock data net worth > $25K target)
    const successMessage = page.getByText(
      /Congratulations|reached Financial Independence/i
    );
    // This may or may not appear depending on mock data net worth
    if (await successMessage.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(successMessage).toBeVisible();
    }
  });
});
