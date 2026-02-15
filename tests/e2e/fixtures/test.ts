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

      // Single-symbol price requests: GET /api/prices/AAPL
      // Registered FIRST so it sits lower in Playwright's LIFO route chain.
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

      // Batch price requests: POST /api/prices/batch
      // Registered LAST so Playwright evaluates it first (LIFO order).
      // Without this ordering the wildcard route above would intercept
      // /api/prices/batch and return a single-symbol response for "batch".
      await page.route('**/api/prices/batch', async (route) => {
        if (route.request().method() !== 'POST') {
          await route.fallback();
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

      await use();
    },
    { auto: true },
  ],
});

/**
 * Seeds mock data via the /test page UI button.
 * Navigates to /test, clicks "Generate Mock Data", waits for completion,
 * then sets currentPortfolio in localStorage so Zustand hydrates it on any page.
 * Does NOT navigate afterward — the caller should navigate to the desired page.
 */
export async function seedMockData(page: import('@playwright/test').Page) {
  await page.goto('/test');
  await page.waitForLoadState('load');
  const btn = page.getByRole('button', { name: 'Generate Mock Data' });
  await expect(btn).toBeVisible({ timeout: 10000 });
  await btn.click();
  await page.getByText('Done! Redirecting...').waitFor({ timeout: 15000 });

  // Cancel the test page's pending 500ms redirect (window.location.replace('/'))
  // to avoid ERR_ABORTED races with the caller's page.goto().
  // Then read the first portfolio from IndexedDB and set it in localStorage
  // so Zustand hydrates currentPortfolio on any page (not just the dashboard).
  await page.evaluate(async () => {
    // Clear all pending timeouts to prevent the auto-redirect
    const id = window.setTimeout(() => {}, 0);
    for (let i = 0; i <= id; i++) window.clearTimeout(i);

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('PortfolioTrackerDB');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['portfolios'], 'readonly');
        const store = tx.objectStore('portfolios');
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          const portfolios = getAll.result;
          db.close();
          if (portfolios.length > 0) {
            localStorage.setItem('portfolio-store', JSON.stringify({
              state: { currentPortfolio: portfolios[0] },
              version: 0,
            }));
          }
          resolve();
        };
        getAll.onerror = () => { db.close(); reject(getAll.error); };
      };
      request.onerror = () => reject(request.error);
    });
  });
}

export { expect, type Page } from '@playwright/test';
