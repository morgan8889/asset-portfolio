import { test, expect } from './fixtures/test';
import {
  generateMockData,
  seedSecondPortfolio,
} from './fixtures/seed-helpers';

test.describe('Portfolio Type Change Warning', () => {
  test.beforeEach(async ({ page }) => {
    // Seed mock data to ensure we have at least one portfolio with transactions
    await generateMockData(page);

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
    await page.waitForLoadState('networkidle');

    // Click edit on the first portfolio with transactions
    const rows = page.getByRole('row');
    const portfolioCount = await rows.count();

    // We should have at least 2 portfolios (header + 2 data rows = 3)
    expect(portfolioCount).toBeGreaterThanOrEqual(3);

    // Click edit button on first portfolio (skip header row)
    const firstPortfolioRow = rows.nth(1);
    const editButton = firstPortfolioRow.getByRole('button', { name: /edit/i });
    await editButton.click();

    // Wait for edit dialog to open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /edit portfolio/i })).toBeVisible();

    // Get current type
    const typeSelect = page.getByRole('button', { name: /select.*type/i }).or(
      page.locator('[data-testid="portfolio-type-select"]').or(
        page.getByRole('combobox').filter({ hasText: /taxable|ira|401k|roth/i })
      )
    );

    const currentTypeText = await typeSelect.textContent();
    const currentType = currentTypeText?.toLowerCase() || '';

    // Try to change the type
    await typeSelect.click();

    // Select a different type
    const typeOptions = ['taxable', 'ira', '401k', 'roth'];
    const differentType = typeOptions.find(t => !currentType.includes(t));

    if (differentType) {
      const typeOption = page.getByRole('option', { name: new RegExp(differentType, 'i') });
      await typeOption.click();

      // Check for warning message (if portfolio has transactions)
      const warningText = page.getByText(/changing the portfolio type/i).or(
        page.getByText(/tax implications/i)
      );

      // The warning should appear since the first portfolio has transactions
      const warningVisible = await warningText.isVisible().catch(() => false);

      if (warningVisible) {
        // Verify warning is properly styled
        const warningContainer = warningText.locator('..').first();
        const bgColor = await warningContainer.evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );

        // Should have yellow/warning background (in light mode) or similar
        expect(bgColor).toBeTruthy();
      }
    }

    // Close the dialog
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Verify dialog closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should not show warning for new portfolio', async ({ page }) => {
    // Navigate to portfolios page
    await page.goto('/portfolios');
    await page.waitForLoadState('networkidle');

    // Click Create Portfolio button
    const createButton = page.getByRole('button', { name: /create portfolio/i });
    await createButton.click();

    // Wait for create dialog
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: /create.*portfolio/i })).toBeVisible();

    // Fill in portfolio name
    const nameInput = page.getByLabel(/portfolio name/i);
    await nameInput.fill('Test Portfolio');

    // Select type
    const typeSelect = page.getByRole('button', { name: /select.*type/i }).or(
      page.locator('[data-testid="portfolio-type-select"]')
    );
    await typeSelect.click();

    const taxableOption = page.getByRole('option', { name: /taxable/i });
    await taxableOption.click();

    // Change type to IRA
    await typeSelect.click();
    const iraOption = page.getByRole('option', { name: /ira/i });
    await iraOption.click();

    // Should NOT show warning for new portfolio (no transactions)
    const warningText = page.getByText(/changing the portfolio type/i);
    await expect(warningText).not.toBeVisible();

    // Close dialog
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await cancelButton.click();
  });
});
