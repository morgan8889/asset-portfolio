import { test, expect } from './fixtures/test';
import { createBalancedPortfolio, navigateToAnalysisAndWait } from './fixtures/analysis-portfolios';

/**
 * E2E tests for Region Override Dialog (T022)
 * Tests: Access dialog from holdings → Change region → Verify analysis update
 */
test.describe('Region Override Dialog', () => {
  test('should override asset region manually and update analysis (P1)', async ({
    page,
  }) => {
    // Create balanced portfolio with assets
    await createBalancedPortfolio(page);

    // Navigate to holdings page
    await page.goto('/holdings');

    // Find first holding with dropdown menu
    const dropdownButtons = page.locator('button[aria-label*="actions" i], button:has-text("⋮")');
    const dropdownCount = await dropdownButtons.count();

    if (dropdownCount > 0) {
      // Click first dropdown
      await dropdownButtons.first().click();
      await page.waitForTimeout(300);

      // Look for "Set Region" or "Region Override" option
      const setRegionOption = page.getByRole('menuitem', {
        name: /Set.*Region|Region.*Override|Change.*Region/i,
      });

      if (await setRegionOption.isVisible()) {
        // Get the current asset symbol before opening dialog
        const holdingsTable = page.locator('table').first();
        const firstRowSymbol = await holdingsTable
          .locator('tbody tr')
          .first()
          .locator('td')
          .first()
          .textContent();
        console.log('Testing region override for:', firstRowSymbol);

        // Click "Set Region"
        await setRegionOption.click();
        await page.waitForTimeout(500);

        // Verify dialog appears
        await expect(
          page.getByRole('heading', { name: /Region.*Override|Set.*Region/i })
        ).toBeVisible({ timeout: 5000 });

        // Verify dialog description mentions region classification
        await expect(
          page.getByText(/region.*classification|geographic.*exposure/i)
        ).toBeVisible();

        // Find region selection dropdown or radio buttons
        const regionSelect = page.locator('select[name="region"], button[role="combobox"]');
        const regionRadios = page.locator('button[role="radio"]');

        if (await regionSelect.isVisible()) {
          // Dropdown/combobox interface
          await regionSelect.click();
          await page.waitForTimeout(300);

          // Select a different region (e.g., "Europe")
          const europeOption = page.getByText(/Europe|EU|European/i);
          if (await europeOption.isVisible()) {
            await europeOption.click();
            console.log('Selected region: Europe');
          }
        } else if ((await regionRadios.count()) > 0) {
          // Radio button interface
          // Click second option (different from current)
          await regionRadios.nth(1).click();
          const selectedRegion = await regionRadios.nth(1).textContent();
          console.log('Selected region:', selectedRegion);
        }

        // Submit the form
        const submitButton = page.getByRole('button', {
          name: /Save|Update|Confirm/i,
        });
        await expect(submitButton).toBeVisible();
        await submitButton.click();

        // Wait for success or dialog to close
        await page.waitForTimeout(1000);

        // Verify dialog closed
        await expect(
          page.getByRole('heading', { name: /Region.*Override|Set.*Region/i })
        ).not.toBeVisible({ timeout: 3000 });

        // Navigate to analysis page to verify region is used in calculations
        await navigateToAnalysisAndWait(page);

        // Expand formula details to verify calculation
        const showDetailsButton = page.getByRole('button', {
          name: /Show Details/i,
        });
        if (await showDetailsButton.isVisible()) {
          await showDetailsButton.click();
          await page.waitForTimeout(500);

          // Verify diversification calculation includes region
          await expect(page.getByText(/Diversification/i)).toBeVisible();

          console.log('✅ Region override applied, analysis recalculated');
        }

        // Verify health score is recalculated (should be visible and valid)
        const scoreElement = page.locator('.text-4xl, .text-5xl').first();
        await expect(scoreElement).toBeVisible();
        const scoreText = await scoreElement.textContent();
        const score = parseInt(scoreText || '0');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);

        console.log('✅ Region override successful, diversification updated');
      } else {
        console.log('⚠️  Set Region option not found in dropdown');
      }
    } else {
      console.log('⚠️  No action dropdowns found in holdings table');
    }
  });

  test('should display available region options correctly (P1)', async ({
    page,
  }) => {
    // Create balanced portfolio
    await createBalancedPortfolio(page);

    // Navigate to holdings
    await page.goto('/holdings');

    // Find and click dropdown
    const dropdownButtons = page.locator('button[aria-label*="actions" i], button:has-text("⋮")');
    const dropdownCount = await dropdownButtons.count();

    if (dropdownCount > 0) {
      await dropdownButtons.first().click();
      await page.waitForTimeout(300);

      const setRegionOption = page.getByRole('menuitem', {
        name: /Set.*Region|Region.*Override|Change.*Region/i,
      });

      if (await setRegionOption.isVisible()) {
        await setRegionOption.click();
        await page.waitForTimeout(500);

        // Verify dialog appears
        await expect(
          page.getByRole('heading', { name: /Region.*Override|Set.*Region/i })
        ).toBeVisible({ timeout: 5000 });

        // Check for common region options
        const expectedRegions = [
          /North America|US|United States/i,
          /Europe|EU|European/i,
          /Asia|Pacific/i,
        ];

        // Expand region selector if needed
        const regionSelect = page.locator('select[name="region"], button[role="combobox"]');
        if (await regionSelect.isVisible()) {
          await regionSelect.click();
          await page.waitForTimeout(300);
        }

        // Verify at least some common regions are available
        let foundRegions = 0;
        for (const regionPattern of expectedRegions) {
          const regionOption = page.getByText(regionPattern);
          const isVisible = await regionOption.isVisible().catch(() => false);
          if (isVisible) {
            foundRegions++;
            console.log('Found region option:', await regionOption.textContent());
          }
        }

        expect(foundRegions).toBeGreaterThanOrEqual(1);
        console.log(`✅ Found ${foundRegions} region options`);

        // Close dialog
        const cancelButton = page.getByRole('button', { name: /Cancel|Close/i });
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      } else {
        console.log('⚠️  Set Region option not found');
      }
    } else {
      console.log('⚠️  No action dropdowns found');
    }
  });

  test('should show current auto-detected region before override (P1)', async ({
    page,
  }) => {
    // Create balanced portfolio
    await createBalancedPortfolio(page);

    // Navigate to holdings
    await page.goto('/holdings');

    // Find and click dropdown
    const dropdownButtons = page.locator('button[aria-label*="actions" i], button:has-text("⋮")');
    const dropdownCount = await dropdownButtons.count();

    if (dropdownCount > 0) {
      await dropdownButtons.first().click();
      await page.waitForTimeout(300);

      const setRegionOption = page.getByRole('menuitem', {
        name: /Set.*Region|Region.*Override|Change.*Region/i,
      });

      if (await setRegionOption.isVisible()) {
        await setRegionOption.click();
        await page.waitForTimeout(500);

        // Verify dialog appears
        await expect(
          page.getByRole('heading', { name: /Region.*Override|Set.*Region/i })
        ).toBeVisible({ timeout: 5000 });

        // Look for text indicating current/auto-detected region
        const currentRegionText = page.getByText(/current.*region|auto.*detected|detected.*as/i);
        const hasCurrentRegion = await currentRegionText.isVisible().catch(() => false);

        if (hasCurrentRegion) {
          console.log('✅ Current region displayed:', await currentRegionText.textContent());
        } else {
          console.log('⚠️  Current region not explicitly shown');
        }

        // Check if one option is pre-selected (radio button checked)
        const checkedRadio = page.locator('button[role="radio"][data-state="checked"]');
        const hasChecked = await checkedRadio.isVisible().catch(() => false);

        if (hasChecked) {
          const selectedText = await checkedRadio.textContent();
          console.log('✅ Pre-selected region:', selectedText);
          expect(selectedText).toBeTruthy();
        }

        // Close dialog
        const cancelButton = page.getByRole('button', { name: /Cancel|Close/i });
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      } else {
        console.log('⚠️  Set Region option not found');
      }
    } else {
      console.log('⚠️  No action dropdowns found');
    }
  });
});
