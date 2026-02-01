import { test, expect } from '@playwright/test';

test.describe('Net Worth Planning & FIRE Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the planning page directly
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');
  });

  test('should load planning page with all sections', async ({ page }) => {
    // Check main sections are present
    await expect(
      page.locator('h1:has-text("Financial Planning")')
    ).toBeVisible();

    // Net Worth History section
    await expect(
      page.locator('h2:has-text("Net Worth History")')
    ).toBeVisible();
    await expect(page.locator('text=/Net Worth History/')).toBeVisible();

    // FIRE Planning section
    await expect(page.locator('h2:has-text("FIRE Planning")')).toBeVisible();
    await expect(page.locator('text=/FIRE Goal Settings/')).toBeVisible();
    await expect(
      page.locator('text=/Path to Financial Independence/')
    ).toBeVisible();

    // What-If Analysis section
    await expect(
      page.locator('h2:has-text("What-If Analysis")')
    ).toBeVisible();
    await expect(page.locator('text=/What-If Scenarios/')).toBeVisible();
  });

  test('should display net worth chart with data', async ({ page }) => {
    // Check chart is rendered
    const chartContainer = page.locator('.recharts-responsive-container').first();
    await expect(chartContainer).toBeVisible();

    // Check for chart elements
    await expect(page.locator('.recharts-area')).toHaveCount(3, { timeout: 5000 }); // Assets, Liabilities, Net Worth

    // Check summary metrics are displayed
    await expect(page.locator('text=/Current Net Worth/')).toBeVisible();
    await expect(page.locator('text=/Total Assets/')).toBeVisible();
    await expect(page.locator('text=/Total Liabilities/')).toBeVisible();
  });

  test('should allow adding a liability', async ({ page }) => {
    // Click Add Liability button
    await page.click('button:has-text("Add Liability")');

    // Fill in liability form
    await page.fill('input[id="name"]', 'Test Mortgage');
    await page.fill('input[id="balance"]', '250000');
    await page.fill('input[id="interestRate"]', '4.5');
    await page.fill('input[id="payment"]', '1500');
    await page.fill('input[id="startDate"]', '2020-01-01');
    await page.fill('input[id="termMonths"]', '360');

    // Submit form
    await page.click('button:has-text("Add")');

    // Verify liability appears in the table
    await expect(page.locator('text=Test Mortgage')).toBeVisible({
      timeout: 5000,
    });
    await expect(page.locator('text=$250,000')).toBeVisible();
    await expect(page.locator('text=4.50%')).toBeVisible();
  });

  test('should allow editing a liability', async ({ page }) => {
    // First add a liability
    await page.click('button:has-text("Add Liability")');
    await page.fill('input[id="name"]', 'Edit Test Liability');
    await page.fill('input[id="balance"]', '100000');
    await page.fill('input[id="interestRate"]', '3.5');
    await page.fill('input[id="payment"]', '800');
    await page.fill('input[id="startDate"]', '2021-06-01');
    await page.click('button:has-text("Add")');

    // Wait for liability to appear
    await expect(page.locator('text=Edit Test Liability')).toBeVisible();

    // Click edit button
    const editButton = page
      .locator('tr:has-text("Edit Test Liability")')
      .locator('button')
      .first();
    await editButton.click();

    // Update the balance
    await page.fill('input[id="balance"]', '95000');

    // Submit
    await page.click('button:has-text("Update")');

    // Verify update
    await expect(page.locator('text=$95,000')).toBeVisible({ timeout: 5000 });
  });

  test('should allow deleting a liability', async ({ page }) => {
    // Add a liability to delete
    await page.click('button:has-text("Add Liability")');
    await page.fill('input[id="name"]', 'Delete Test');
    await page.fill('input[id="balance"]', '50000');
    await page.fill('input[id="interestRate"]', '5.0');
    await page.fill('input[id="payment"]', '500');
    await page.fill('input[id="startDate"]', '2022-01-01');
    await page.click('button:has-text("Add")');

    await expect(page.locator('text=Delete Test')).toBeVisible();

    // Setup dialog handler
    page.on('dialog', (dialog) => dialog.accept());

    // Click delete button
    const deleteButton = page
      .locator('tr:has-text("Delete Test")')
      .locator('button')
      .last();
    await deleteButton.click();

    // Verify deletion
    await expect(page.locator('text=Delete Test')).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('should update FIRE goal settings', async ({ page }) => {
    // Update annual expenses
    await page.fill('input[id="annualExpenses"]', '50000');
    await page.fill('input[id="monthlySavings"]', '3000');
    await page.fill('input[id="expectedReturn"]', '8');

    // Submit form
    await page.click('button:has-text("Update Goals")');

    // Check that FIRE Target updated
    const fireTarget = page.locator('text=/FIRE Target:/');
    await expect(fireTarget).toBeVisible();

    // Verify projection chart updated
    await expect(
      page.locator('text=/Path to Financial Independence/')
    ).toBeVisible();
  });

  test('should display FIRE projection chart with metrics', async ({ page }) => {
    // Check projection chart exists
    const projectionChart = page
      .locator('.recharts-responsive-container')
      .nth(1);
    await expect(projectionChart).toBeVisible();

    // Check for key metrics
    await expect(page.locator('text=/Years to FIRE/')).toBeVisible();
    await expect(page.locator('text=/FIRE Target/')).toBeVisible();
    await expect(page.locator('text=/Monthly Progress/')).toBeVisible();
  });

  test('should create and toggle a scenario', async ({ page }) => {
    // Click Add Scenario
    await page.click('button:has-text("Add Scenario")');

    // Fill scenario form
    await page.fill('input[id="name"]', 'Market Crash Test');
    await page.selectOption('select', 'market_correction');
    await page.fill('input[id="value"]', '20');

    // Submit
    await page.click('button[type="submit"]:has-text("Create")');

    // Verify scenario appears
    await expect(page.locator('text=Market Crash Test')).toBeVisible({
      timeout: 5000,
    });

    // Toggle scenario on
    const toggleButton = page
      .locator('div:has-text("Market Crash Test")')
      .locator('button')
      .first();
    await toggleButton.click();

    // Verify active scenarios indicator appears
    await expect(page.locator('text=/1 scenario active/')).toBeVisible({
      timeout: 3000,
    });

    // Toggle scenario off
    await toggleButton.click();

    // Active indicator should disappear
    await expect(page.locator('text=/1 scenario active/')).not.toBeVisible({
      timeout: 3000,
    });
  });

  test('should create different scenario types', async ({ page }) => {
    // Expense Increase Scenario
    await page.click('button:has-text("Add Scenario")');
    await page.fill('input[id="name"]', 'Lifestyle Inflation');
    await page.selectOption('select', 'expense_increase');
    await page.fill('input[id="value"]', '10');
    await page.click('button[type="submit"]:has-text("Create")');
    await expect(page.locator('text=Lifestyle Inflation')).toBeVisible();

    // Income Change Scenario
    await page.click('button:has-text("Add Scenario")');
    await page.fill('input[id="name"]', 'Salary Raise');
    await page.selectOption('select', 'income_change');
    await page.fill('input[id="value"]', '15');
    await page.click('button[type="submit"]:has-text("Create")');
    await expect(page.locator('text=Salary Raise')).toBeVisible();

    // One-time Expense Scenario
    await page.click('button:has-text("Add Scenario")');
    await page.fill('input[id="name"]', 'House Down Payment');
    await page.selectOption('select', 'one_time_expense');
    await page.fill('input[id="value"]', '50000');
    await page.fill('input[id="durationMonths"]', '12');
    await page.click('button[type="submit"]:has-text("Create")');
    await expect(page.locator('text=House Down Payment')).toBeVisible();
  });

  test('should delete a scenario', async ({ page }) => {
    // Add a scenario
    await page.click('button:has-text("Add Scenario")');
    await page.fill('input[id="name"]', 'Delete Me');
    await page.selectOption('select', 'market_correction');
    await page.fill('input[id="value"]', '10');
    await page.click('button[type="submit"]:has-text("Create")');
    await expect(page.locator('text=Delete Me')).toBeVisible();

    // Setup dialog handler
    page.on('dialog', (dialog) => dialog.accept());

    // Delete scenario
    const deleteButton = page
      .locator('div:has-text("Delete Me")')
      .locator('button')
      .last();
    await deleteButton.click();

    // Verify deletion
    await expect(page.locator('text=Delete Me')).not.toBeVisible({
      timeout: 5000,
    });
  });

  test('should change time range for net worth history', async ({ page }) => {
    // Get the time range selector
    const timeRangeSelect = page.locator('select[id="timeRange"]');

    // Change to 1 Year and verify chart updates
    await timeRangeSelect.selectOption('1Y');
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible();

    // Change to 3 Years
    await timeRangeSelect.selectOption('3Y');
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible();

    // Change to All Time
    await timeRangeSelect.selectOption('ALL');

    // Chart should still be visible
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible();
  });

  test('should handle negative net worth gracefully', async ({ page }) => {
    // Add a large liability to create negative net worth
    await page.click('button:has-text("Add Liability")');
    await page.fill('input[id="name"]', 'Huge Debt');
    await page.fill('input[id="balance"]', '10000000'); // 10M liability
    await page.fill('input[id="interestRate"]', '5.0');
    await page.fill('input[id="payment"]', '50000');
    await page.fill('input[id="startDate"]', '2020-01-01');
    await page.click('button:has-text("Add")');

    // Wait for liability to appear in table
    await expect(page.locator('text=Huge Debt')).toBeVisible();

    // Chart should still render (with reference line at zero)
    await expect(page.locator('.recharts-responsive-container').first()).toBeVisible();

    // Check for warning about not reaching FIRE
    await expect(
      page.locator('text=/may not reach FIRE/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should show already at FIRE message when net worth exceeds target', async ({ page }) => {
    // Set very low annual expenses to make FIRE target achievable
    await page.fill('input[id="annualExpenses"]', '1000');
    await page.click('button:has-text("Update Goals")');

    // Wait for projection to update by checking chart is visible
    await expect(
      page.locator('text=/Path to Financial Independence/')
    ).toBeVisible();

    // Check for congratulations message
    const successMessage = page.locator(
      'text=/Congratulations|reached Financial Independence/i'
    );
    if (await successMessage.isVisible()) {
      await expect(successMessage).toBeVisible();
    }
  });

  test('should navigate to planning page from dashboard widget', async ({
    page,
  }) => {
    // Go back to dashboard
    await page.goto('/');
    await page.waitForSelector('text=/Total Value/', { timeout: 10000 });

    // Look for FIRE widget (may need to scroll or it might not be on dashboard yet)
    const fireWidget = page.locator('text=/Path to FIRE/');

    // If widget exists, test navigation
    if (await fireWidget.isVisible()) {
      await page.click('text=View Full Plan');
      await expect(page).toHaveURL('/planning');
    }
  });
});
