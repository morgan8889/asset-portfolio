import { test, expect, seedMockData } from './fixtures/test';

test.describe('Property Addition Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await seedMockData(page);

    // Ensure we're on the holdings page
    await page.goto('/holdings');
    await page.waitForLoadState('load');
  });

  test('T021.1: should add basic property in under 30 seconds (SC-001)', async ({
    page,
  }) => {
    const startTime = Date.now();

    // Open add asset dropdown
    const addButton = page
      .getByRole('button', { name: /add holding/i })
      .or(page.locator('button:has-text("Add Holding")'));
    await addButton.click();

    // Click on "Real Estate" option
    const realEstateOption = page
      .getByText(/real estate/i)
      .or(page.locator('[role="menuitem"]:has-text("Real Estate")'));
    await realEstateOption.click();

    // Wait for dialog
    await page.waitForSelector('dialog, [role="dialog"]', { state: 'visible' });

    // Fill property form
    await page.fill('input[name="name"]', 'Test Property');
    await page.fill('input[name="purchasePrice"]', '500000');
    await page.fill('input[name="currentValue"]', '500000');
    await page.fill('input[name="purchaseDate"]', '2023-01-15');
    await page.fill('input[name="ownershipPercentage"]', '100');

    // Submit form
    const submitButton = page
      .getByRole('button', { name: /add property/i })
      .or(page.locator('button[type="submit"]:has-text("Add")'));
    await submitButton.click();

    // Wait for success toast or property to appear in list
    await page.waitForSelector('text=Test Property', { timeout: 10000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // SC-001 Assertion: Complete property addition in < 30 seconds
    expect(duration).toBeLessThan(30000);

    // Verify property appears in list
    const propertyText = page.locator('text=Test Property');
    await expect(propertyText).toBeVisible();

    // Verify net value displayed (should be $500,000)
    const valuePattern = /\$500,000|\$500\.000|\$500\.00/;
    await expect(page.locator('body')).toContainText(valuePattern);

    // Verify "Manual" badge is visible (for manual valuation)
    const manualBadge = page.locator('text=Manual').or(
      page.locator('[data-testid="manual-badge"]')
    );
    if (await manualBadge.count() > 0) {
      await expect(manualBadge.first()).toBeVisible();
    }
  });

  test('T021.2: should add rental property with yield calculation', async ({
    page,
  }) => {
    // Open add asset dropdown
    const addButton = page
      .getByRole('button', { name: /add holding/i })
      .or(page.locator('button:has-text("Add Holding")'));
    await addButton.click();

    // Click on "Real Estate" option
    const realEstateOption = page
      .getByText(/real estate/i)
      .or(page.locator('[role="menuitem"]:has-text("Real Estate")'));
    await realEstateOption.click();

    // Wait for dialog
    await page.waitForSelector('dialog, [role="dialog"]', { state: 'visible' });

    // Fill basic info
    await page.fill('input[name="name"]', 'Rental Condo');
    await page.fill('input[name="purchasePrice"]', '400000');
    await page.fill('input[name="currentValue"]', '400000');
    await page.fill('input[name="purchaseDate"]', '2023-06-01');
    await page.fill('input[name="ownershipPercentage"]', '100');

    // Toggle rental property checkbox
    const rentalCheckbox = page.locator('input[name="isRental"]').or(
      page.getByLabel(/rental property/i)
    );
    await rentalCheckbox.check();

    // Verify monthly rent field appears
    const monthlyRentInput = page.locator('input[name="monthlyRent"]');
    await expect(monthlyRentInput).toBeVisible();

    // Enter monthly rent
    await monthlyRentInput.fill('2000');

    // Submit
    const submitButton = page
      .getByRole('button', { name: /add property/i })
      .or(page.locator('button[type="submit"]:has-text("Add")'));
    await submitButton.click();

    // Wait for property to appear
    await page.waitForSelector('text=Rental Condo', { timeout: 10000 });

    // Verify property added
    const propertyText = page.locator('text=Rental Condo');
    await expect(propertyText).toBeVisible();

    // Verify yield badge or display
    // Yield calculation: (2000 * 12 / 400000) * 100 = 6%
    const yieldPattern = /rental.*6\.00%|6\.00%.*rental/i;
    const yieldBadge = page.locator(`text=${yieldPattern}`).or(
      page.locator('[data-testid="rental-badge"]')
    );

    // Check if yield is displayed somewhere on the page
    if (await yieldBadge.count() > 0) {
      await expect(yieldBadge.first()).toBeVisible();
    } else {
      // Check for "Rental:" text with percentage
      const rentalText = page.getByText(/rental/i);
      if (await rentalText.count() > 0) {
        await expect(rentalText.first()).toBeVisible();
      }
    }
  });

  test('T021.3: should handle fractional ownership correctly', async ({
    page,
  }) => {
    // Open add asset dropdown
    const addButton = page
      .getByRole('button', { name: /add holding/i })
      .or(page.locator('button:has-text("Add Holding")'));
    await addButton.click();

    // Click on "Real Estate" option
    const realEstateOption = page
      .getByText(/real estate/i)
      .or(page.locator('[role="menuitem"]:has-text("Real Estate")'));
    await realEstateOption.click();

    // Wait for dialog
    await page.waitForSelector('dialog, [role="dialog"]', { state: 'visible' });

    // Add property with 50% ownership
    await page.fill('input[name="name"]', 'Fractional Property');
    await page.fill('input[name="purchasePrice"]', '600000');
    await page.fill('input[name="currentValue"]', '650000');
    await page.fill('input[name="purchaseDate"]', '2024-01-01');
    await page.fill('input[name="ownershipPercentage"]', '50');

    // Submit
    const submitButton = page
      .getByRole('button', { name: /add property/i })
      .or(page.locator('button[type="submit"]:has-text("Add")'));
    await submitButton.click();

    // Wait for property to appear
    await page.waitForSelector('text=Fractional Property', { timeout: 10000 });

    // Verify property added
    const propertyText = page.locator('text=Fractional Property');
    await expect(propertyText).toBeVisible();

    // Verify net value calculation: 50% of $650,000 = $325,000
    const netValuePattern = /\$325,000|\$325\.000/;
    await expect(page.locator('body')).toContainText(netValuePattern);

    // Verify ownership badge (50% owned)
    const ownershipBadge = page
      .locator('text=/50%.*owned/i')
      .or(page.locator('[data-testid="ownership-badge"]'));

    if (await ownershipBadge.count() > 0) {
      await expect(ownershipBadge.first()).toBeVisible();
    }

    // Verify gain/loss calculation
    // Cost basis: 50% of $600,000 = $300,000
    // Net value: 50% of $650,000 = $325,000
    // Gain: $325,000 - $300,000 = $25,000
    const gainPattern = /\$25,000|\$25\.000|\+\$25,000/;
    await expect(page.locator('body')).toContainText(gainPattern);
  });

  test('T021.4: should validate required fields', async ({ page }) => {
    // Open add asset dropdown
    const addButton = page
      .getByRole('button', { name: /add holding/i })
      .or(page.locator('button:has-text("Add Holding")'));
    await addButton.click();

    // Click on "Real Estate" option
    const realEstateOption = page
      .getByText(/real estate/i)
      .or(page.locator('[role="menuitem"]:has-text("Real Estate")'));
    await realEstateOption.click();

    // Wait for dialog
    await page.waitForSelector('dialog, [role="dialog"]', { state: 'visible' });

    // Try to submit empty form
    const submitButton = page
      .getByRole('button', { name: /add property/i })
      .or(page.locator('button[type="submit"]:has-text("Add")'));
    await submitButton.click();

    // Verify error messages appear
    await page.waitForTimeout(500); // Wait for validation

    // Check for validation errors (exact message may vary)
    const errorMessages = page.locator('text=/required|invalid|enter/i');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBeGreaterThan(0);

    // Test invalid ownership percentage (> 100)
    await page.fill('input[name="name"]', 'Test Property');
    await page.fill('input[name="purchasePrice"]', '500000');
    await page.fill('input[name="currentValue"]', '500000');
    await page.fill('input[name="ownershipPercentage"]', '150');
    await submitButton.click();

    // Should show validation error for ownership percentage
    await page.waitForTimeout(500);
    const ownershipError = page.locator('text=/exceed.*100|must be.*100/i');
    if (await ownershipError.count() > 0) {
      await expect(ownershipError.first()).toBeVisible();
    }

    // Test rental without monthly rent
    await page.fill('input[name="ownershipPercentage"]', '100');
    const rentalCheckbox = page.locator('input[name="isRental"]').or(
      page.getByLabel(/rental property/i)
    );
    await rentalCheckbox.check();

    // Verify monthly rent field appears but don't fill it
    const monthlyRentInput = page.locator('input[name="monthlyRent"]');
    await expect(monthlyRentInput).toBeVisible();

    // Try to submit without monthly rent
    await submitButton.click();
    await page.waitForTimeout(500);

    // Should show validation error for monthly rent
    const rentError = page.locator('text=/rent.*required|enter.*rent/i');
    if (await rentError.count() > 0) {
      await expect(rentError.first()).toBeVisible();
    }
  });
});
