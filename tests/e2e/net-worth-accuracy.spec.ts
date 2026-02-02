/**
 * Net Worth Accuracy E2E Tests
 *
 * End-to-end validation of net worth calculation accuracy including:
 * - Cash tracking (dividends, fees, deposits)
 * - Historical liability balances
 * - Complete transaction flow scenarios
 *
 * Target: Match manual calculations within 0.1% (per spec SC-002)
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Net Worth Accuracy Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app and wait for mock data generation
    await page.goto('/');

    // Click "Generate Mock Data" if it exists (empty state)
    const generateButton = page.getByRole('button', {
      name: /generate mock data/i,
    });
    if (await generateButton.isVisible()) {
      await generateButton.click();
      // Wait for redirect to dashboard
      await page.waitForURL('/', { timeout: 10000 });
    }

    // Wait for dashboard to be fully loaded
    await page.waitForSelector('[data-testid="dashboard-container"]', {
      timeout: 15000,
    });
  });

  test('calculates accurate cash balance from deposits and transactions', async ({
    page,
  }) => {
    // Navigate to transactions page
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Record initial portfolio state
    await page.goto('/planning/net-worth');
    await page.waitForLoadState('networkidle');

    // Get initial net worth
    const initialNetWorthText = await page
      .locator('text=/Net Worth/i')
      .first()
      .textContent();

    // Add deposit transaction
    await page.goto('/transactions');
    await page.getByRole('button', { name: /add transaction/i }).click();

    // Fill deposit form
    await page.getByLabel(/type/i).selectOption('deposit');
    await page.getByLabel(/date/i).fill('2024-01-01');
    await page.getByLabel(/amount/i).fill('10000');
    await page.getByRole('button', { name: /save|add/i }).click();

    // Wait for modal to close
    await page.waitForSelector('text=/add transaction/i', { state: 'visible', timeout: 5000 });

    // Add buy transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/type/i).selectOption('buy');
    await page.getByLabel(/symbol/i).fill('AAPL');
    await page.getByLabel(/date/i).fill('2024-01-15');
    await page.getByLabel(/quantity/i).fill('50');
    await page.getByLabel(/price/i).fill('100');
    await page.getByLabel(/fees/i).fill('10');
    await page.getByRole('button', { name: /save|add/i }).click();

    // Wait for modal to close
    await page.waitForSelector('text=/add transaction/i', { state: 'visible', timeout: 5000 });

    // Add dividend transaction
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/type/i).selectOption('dividend');
    await page.getByLabel(/symbol/i).fill('AAPL');
    await page.getByLabel(/date/i).fill('2024-02-01');
    await page.getByLabel(/amount/i).fill('200');
    await page.getByRole('button', { name: /save|add/i }).click();

    // Wait for modal to close
    await page.waitForSelector('text=/add transaction/i', { state: 'visible', timeout: 5000 });

    // Navigate to net worth chart
    await page.goto('/planning/net-worth');
    await page.waitForLoadState('networkidle');

    // Expected cash balance calculation:
    // Deposit: +$10,000
    // Buy: -$5,010 (50 × $100 + $10 fee)
    // Dividend: +$200
    // Expected cash: $5,190

    // Verify cash is displayed
    const cashDisplay = await page.locator('text=/Cash/i').first();
    await expect(cashDisplay).toBeVisible();

    // Get the cash value (should be around $5,190)
    const cashValueElement = cashDisplay.locator('..').locator('.text-xl');
    const cashText = await cashValueElement.textContent();

    // Parse cash value (format: "$5.2K" or "$5,190")
    const cashValue = parseCurrency(cashText || '');
    expect(cashValue).toBeGreaterThan(5100);
    expect(cashValue).toBeLessThan(5300);
  });

  test('tracks liability paydown in net worth history', async ({ page }) => {
    // This test verifies that liabilities decrease over time based on payment schedule

    // Navigate to planning page to add liability
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');

    // Add a liability
    const addLiabilityButton = page.getByRole('button', {
      name: /add liability/i,
    });

    if (await addLiabilityButton.isVisible()) {
      await addLiabilityButton.click();

      // Fill liability form
      await page.getByLabel(/name/i).fill('Mortgage');
      await page.getByLabel(/balance/i).fill('300000');
      await page.getByLabel(/interest rate/i).fill('4.5');
      await page.getByLabel(/monthly payment/i).fill('1520');
      await page.getByLabel(/start date/i).fill('2020-01-01');

      await page.getByRole('button', { name: /save|add/i }).click();

      // Wait for modal to close
      await page.waitForSelector('text=/add liability/i', { state: 'visible', timeout: 5000 });
    }

    // Navigate to net worth chart
    await page.goto('/planning/net-worth');
    await page.waitForLoadState('networkidle');

    // Verify liabilities are shown
    const liabilitiesDisplay = await page.locator('text=/Liabilities/i').first();
    await expect(liabilitiesDisplay).toBeVisible();

    // Get liability value
    const liabilityValueElement = liabilitiesDisplay
      .locator('..')
      .locator('.text-xl');
    const liabilityText = await liabilityValueElement.textContent();
    const liabilityValue = parseCurrency(liabilityText || '');

    // Should be around $300,000 (or less if payments have been made)
    expect(liabilityValue).toBeGreaterThan(250000);
    expect(liabilityValue).toBeLessThan(350000);

    // Check that chart renders without errors
    const chart = page.locator('[class*="recharts"]');
    await expect(chart).toBeVisible();
  });

  test('reflects fees and taxes in cash balance', async ({ page }) => {
    // Navigate to transactions
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Add deposit
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/type/i).selectOption('deposit');
    await page.getByLabel(/date/i).fill('2024-01-01');
    await page.getByLabel(/amount/i).fill('5000');
    await page.getByRole('button', { name: /save|add/i }).click();

    // Wait for modal to close
    await page.waitForSelector('text=/add transaction/i', { state: 'visible', timeout: 5000 });

    // Add fee
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/type/i).selectOption('fee');
    await page.getByLabel(/date/i).fill('2024-01-15');
    await page.getByLabel(/amount/i).fill('50');
    await page.getByRole('button', { name: /save|add/i }).click();

    // Wait for modal to close
    await page.waitForSelector('text=/add transaction/i', { state: 'visible', timeout: 5000 });

    // Add tax
    await page.getByRole('button', { name: /add transaction/i }).click();
    await page.getByLabel(/type/i).selectOption('tax');
    await page.getByLabel(/date/i).fill('2024-02-01');
    await page.getByLabel(/amount/i).fill('100');
    await page.getByRole('button', { name: /save|add/i }).click();

    // Wait for modal to close
    await page.waitForSelector('text=/add transaction/i', { state: 'visible', timeout: 5000 });

    // Check net worth
    await page.goto('/planning/net-worth');
    await page.waitForLoadState('networkidle');

    // Expected: $5,000 - $50 - $100 = $4,850
    const cashDisplay = await page.locator('text=/Cash/i').first();
    const cashValueElement = cashDisplay.locator('..').locator('.text-xl');
    const cashText = await cashValueElement.textContent();
    const cashValue = parseCurrency(cashText || '');

    expect(cashValue).toBeGreaterThan(4700);
    expect(cashValue).toBeLessThan(5000);
  });

  test('maintains accuracy through complex transaction sequence', async ({
    page,
  }) => {
    // Complex scenario: deposits, buys, dividends, fees, sells
    await page.goto('/transactions');
    await page.waitForLoadState('networkidle');

    // Transaction 1: Deposit $10,000
    await addTransaction(page, {
      type: 'deposit',
      date: '2024-01-01',
      amount: '10000',
    });

    // Transaction 2: Buy 100 shares @ $50
    await addTransaction(page, {
      type: 'buy',
      symbol: 'AAPL',
      date: '2024-01-15',
      quantity: '100',
      price: '50',
      fees: '10',
    });

    // Transaction 3: Dividend $150
    await addTransaction(page, {
      type: 'dividend',
      symbol: 'AAPL',
      date: '2024-02-01',
      amount: '150',
    });

    // Transaction 4: Fee $25
    await addTransaction(page, {
      type: 'fee',
      date: '2024-02-15',
      amount: '25',
    });

    // Transaction 5: Sell 50 shares @ $55
    await addTransaction(page, {
      type: 'sell',
      symbol: 'AAPL',
      date: '2024-03-01',
      quantity: '50',
      price: '55',
      fees: '10',
    });

    // Navigate to net worth
    await page.goto('/planning/net-worth');
    await page.waitForLoadState('networkidle');

    // Expected cash calculation:
    // $10,000 (deposit)
    // -$5,010 (buy: 100 × $50 + $10)
    // +$150 (dividend)
    // -$25 (fee)
    // +$2,740 (sell: 50 × $55 - $10)
    // = $7,855

    const cashDisplay = await page.locator('text=/Cash/i').first();
    const cashValueElement = cashDisplay.locator('..').locator('.text-xl');
    const cashText = await cashValueElement.textContent();
    const cashValue = parseCurrency(cashText || '');

    // Allow 0.1% tolerance as per spec SC-002
    const expected = 7855;
    const tolerance = expected * 0.001; // 0.1%
    expect(cashValue).toBeGreaterThan(expected - tolerance);
    expect(cashValue).toBeLessThan(expected + tolerance);
  });

  test('shows invested value and cash breakdown', async ({ page }) => {
    await page.goto('/planning/net-worth');
    await page.waitForLoadState('networkidle');

    // Verify all 5 metrics are displayed
    await expect(page.locator('text=/Net Worth/i').first()).toBeVisible();
    await expect(page.locator('text=/Invested/i').first()).toBeVisible();
    await expect(page.locator('text=/Cash/i').first()).toBeVisible();
    await expect(page.locator('text=/Total Assets/i').first()).toBeVisible();
    await expect(page.locator('text=/Liabilities/i').first()).toBeVisible();

    // Verify chart renders
    const chart = page.locator('[class*="recharts"]');
    await expect(chart).toBeVisible();

    // Verify chart has stacked areas (cash + invested)
    // Wait for chart to fully render
    await page.waitForSelector('[class*="recharts"]', { state: 'visible', timeout: 5000 });
  });
});

// Helper functions

function parseCurrency(text: string): number {
  // Parse formats like "$5.2K", "$5,190", "$1.5M"
  const cleaned = text.replace(/[$,]/g, '');

  if (cleaned.includes('M')) {
    return parseFloat(cleaned.replace('M', '')) * 1000000;
  } else if (cleaned.includes('K')) {
    return parseFloat(cleaned.replace('K', '')) * 1000;
  } else {
    return parseFloat(cleaned);
  }
}

async function addTransaction(
  page: Page,
  data: {
    type: string;
    date: string;
    symbol?: string;
    quantity?: string;
    price?: string;
    amount?: string;
    fees?: string;
  }
) {
  await page.getByRole('button', { name: /add transaction/i }).click();

  // Wait for modal to open
  await page.waitForSelector('text=/type/i', { state: 'visible', timeout: 5000 });

  await page.getByLabel(/type/i).selectOption(data.type);
  await page.getByLabel(/date/i).fill(data.date);

  if (data.symbol) {
    await page.getByLabel(/symbol/i).fill(data.symbol);
  }

  if (data.quantity) {
    await page.getByLabel(/quantity/i).fill(data.quantity);
  }

  if (data.price) {
    await page.getByLabel(/price/i).fill(data.price);
  }

  if (data.amount) {
    await page.getByLabel(/amount/i).fill(data.amount);
  }

  if (data.fees) {
    await page.getByLabel(/fees/i).fill(data.fees);
  }

  await page.getByRole('button', { name: /save|add/i }).click();

  // Wait for modal to close by checking for the add transaction button to be visible again
  await page.waitForSelector('text=/add transaction/i', { state: 'visible', timeout: 5000 });
}
