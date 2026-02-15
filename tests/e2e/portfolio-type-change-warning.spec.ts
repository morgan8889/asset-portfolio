import { test, expect, seedMockData } from './fixtures/test';
import { seedSecondPortfolio } from './fixtures/seed-helpers';

test.describe('Portfolio Type Change Warning', () => {
  test.beforeEach(async ({ page }) => {
    // Seed mock data to ensure we have at least one portfolio with transactions
    await seedMockData(page);

    // Create a second portfolio so portfolio management page has multiple rows
    await seedSecondPortfolio(page, {
      name: 'IRA Retirement Fund',
      type: 'ira',
      transactionCount: 3,
    });
  });

  test('should show warning when changing portfolio type with existing transactions', async ({ page }) => {
    // Navigate to portfolios page
    await page.goto('/portfolios');
    await page.waitForLoadState('load');

    // Wait for table to be populated with portfolio rows
    await expect(page.locator('tbody tr').first()).toBeVisible({ timeout: 10000 });

    // Click edit button on first portfolio (the one from seedMockData that has transactions)
    const editButton = page.getByRole('button', { name: 'Edit' }).first();
    await editButton.click();

    // Wait for edit dialog to open
    await expect(page.getByRole('heading', { name: /edit portfolio/i })).toBeVisible();

    // Get the account type Select trigger (first combobox in the dialog)
    const typeTrigger = page.getByRole('combobox').first();
    const currentTypeText = await typeTrigger.textContent();
    const currentType = currentTypeText?.toLowerCase() || '';

    // Click to open the type dropdown
    await typeTrigger.click();

    // Select a different type than the current one
    const typeOptions = ['taxable brokerage', 'traditional ira', '401\\(k\\)', 'roth ira'];
    let selectedOption = false;
    for (const typeLabel of typeOptions) {
      if (!currentType.includes(typeLabel.replace('\\(', '(').replace('\\)', ')').toLowerCase().split(' ')[0])) {
        const option = page.getByRole('option', { name: new RegExp(typeLabel, 'i') });
        if (await option.isVisible().catch(() => false)) {
          await option.click();
          selectedOption = true;
          break;
        }
      }
    }

    if (selectedOption) {
      // The warning should appear since the first portfolio has transactions from seedMockData.
      // The transactionQueries.countByPortfolio check is async, so give it time.
      // Use heading role to target the "Type Change Warning" h3 specifically.
      const warningHeading = page.getByRole('heading', { name: /type change warning/i });

      await expect(warningHeading).toBeVisible({ timeout: 5000 });

      // Verify warning mentions transactions
      await expect(page.getByText(/transaction/i).first()).toBeVisible();
    }

    // Close the dialog
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Verify dialog closed
    await expect(page.getByRole('heading', { name: /edit portfolio/i })).not.toBeVisible();
  });

  test('should not show warning for new portfolio', async ({ page }) => {
    // Navigate to portfolios page
    await page.goto('/portfolios');
    await page.waitForLoadState('load');

    // Click Create Portfolio button
    const createButton = page.getByRole('button', { name: /create portfolio/i });
    await createButton.click();

    // Wait for create dialog
    await expect(page.getByRole('heading', { name: /create.*portfolio/i })).toBeVisible();

    // Fill in portfolio name
    const nameInput = page.getByLabel(/portfolio name/i);
    await nameInput.fill('Test Portfolio');

    // Select type using the first combobox (account type)
    const typeTrigger = page.getByRole('combobox').first();
    await typeTrigger.click();

    const taxableOption = page.getByRole('option', { name: /taxable brokerage/i });
    await taxableOption.click();

    // Change type to IRA
    await typeTrigger.click();
    const iraOption = page.getByRole('option', { name: /traditional ira/i });
    await iraOption.click();

    // Should NOT show warning for new portfolio (no transactions)
    const warningText = page.getByText(/type change warning/i);
    await expect(warningText).not.toBeVisible();

    // Close dialog
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await cancelButton.click();
  });
});
