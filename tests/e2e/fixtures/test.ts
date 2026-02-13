/**
 * Custom Playwright test fixture with optional price API mocking.
 *
 * When MOCK_PRICES=1 is set, all /api/prices/* requests are intercepted
 * and return deterministic mock data. This eliminates external API
 * dependencies and timeouts in CI.
 *
 * Usage:
 *   MOCK_PRICES=1 npx playwright test   # with mocks
 *   npx playwright test                  # real APIs
 */
import { test as base, expect } from '@playwright/test';

const MOCK_PRICES: Record<string, { price: number; currency: string }> = {
  // Real symbols
  AAPL: { price: 178.5, currency: 'USD' },
  GOOGL: { price: 142.3, currency: 'USD' },
  GOOG: { price: 141.8, currency: 'USD' },
  VTI: { price: 252.1, currency: 'USD' },
  BTC: { price: 67500, currency: 'USD' },
  ETH: { price: 3650, currency: 'USD' },
  BND: { price: 76.2, currency: 'USD' },
  ACME: { price: 45.0, currency: 'USD' },
  TSLA: { price: 248.0, currency: 'USD' },
  MSFT: { price: 415.0, currency: 'USD' },
  AMZN: { price: 185.0, currency: 'USD' },
  SPY: { price: 482.5, currency: 'USD' },
  NVDA: { price: 450.0, currency: 'USD' },
  CASH: { price: 1.0, currency: 'USD' },
  // Test-specific symbols used across E2E specs
  TEST: { price: 100.0, currency: 'USD' },
  WARN: { price: 110.0, currency: 'USD' },
  QUAL: { price: 95.0, currency: 'USD' },
  TABS: { price: 100.0, currency: 'USD' },
  ESPPTEST: { price: 120.0, currency: 'USD' },
  RSUTEST: { price: 150.0, currency: 'USD' },
  TECH: { price: 150.0, currency: 'USD' },
  VEST: { price: 180.0, currency: 'USD' },
  NET: { price: 250.0, currency: 'USD' },
  TAX: { price: 175.0, currency: 'USD' },
  BLUE: { price: 220.0, currency: 'USD' },
  MODAL: { price: 195.0, currency: 'USD' },
  OLD: { price: 100.0, currency: 'USD' },
  BASIS: { price: 200.0, currency: 'USD' },
  DIVTEST: { price: 50.0, currency: 'USD' },
  DRIP: { price: 75.0, currency: 'USD' },
  MULTIDIV: { price: 120.0, currency: 'USD' },
  FILTER: { price: 85.0, currency: 'USD' },
  INCOME: { price: 60.0, currency: 'USD' },
  STGAIN: { price: 55.0, currency: 'USD' },
  LTGAIN: { price: 65.0, currency: 'USD' },
};

const DEFAULT_PRICE = { price: 100.0, currency: 'USD' };

function buildPriceResponse(symbol: string) {
  const data = MOCK_PRICES[symbol.toUpperCase()] ?? DEFAULT_PRICE;
  return {
    symbol: symbol.toUpperCase(),
    price: data.price,
    source: 'mock',
    metadata: {
      currency: data.currency,
      change: +(data.price * 0.005).toFixed(2),
      changePercent: 0.5,
      marketState: 'REGULAR',
      previousClose: +(data.price * 0.995).toFixed(2),
    },
    cached: false,
    timestamp: new Date().toISOString(),
  };
}

export const test = base.extend<{ mockPriceApi: void }>({
  mockPriceApi: [
    async ({ page }, use) => {
      if (!process.env.MOCK_PRICES) {
        await use();
        return;
      }

      // Register batch route first — Playwright matches in registration order,
      // and the wildcard **/api/prices/* would also match /api/prices/batch.
      await page.route('**/api/prices/batch', async (route) => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }

        let symbols: string[] = [];
        try {
          const body = route.request().postDataJSON();
          symbols = body?.symbols ?? [];
        } catch {
          symbols = [];
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            successful: symbols.map((s: string) => buildPriceResponse(s)),
            failed: [],
            total: symbols.length,
            timestamp: new Date().toISOString(),
          }),
        });
      });

      // Single-symbol price requests: GET /api/prices/AAPL
      await page.route('**/api/prices/*', async (route) => {
        const url = new URL(route.request().url());
        const parts = url.pathname.split('/');
        const symbol = parts[parts.length - 1];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(buildPriceResponse(symbol)),
        });
      });

      await use();
    },
    { auto: true },
  ],
});

export { expect, type Page } from '@playwright/test';

/**
 * Navigate to /test, generate mock portfolio data, and wait for completion.
 * Call this in beforeEach for tests that need portfolio/holdings/transaction data.
 *
 * After data generation, forces a full page reload so Zustand stores
 * re-initialize from IndexedDB (client-side redirects don't trigger this).
 */
export async function seedMockData(page: import('@playwright/test').Page) {
  await page.goto('/test');
  const btn = page.getByRole('button', { name: 'Generate Mock Data' });
  await btn.click();
  await page.getByText('Done! Redirecting...').waitFor({ timeout: 15000 });
  // Full page reload ensures Zustand stores hydrate from IndexedDB.
  // The app's client-side redirect preserves stale in-memory store state.
  await page.goto('/');
  // Wait for portfolio store to fully load and persist currentPortfolio.
  // Without this, navigating to other pages (e.g. /analysis, /allocation)
  // before the store persists causes them to show "No Portfolio Selected".
  await page.getByText(/total value/i).waitFor({ timeout: 15000 });
}
