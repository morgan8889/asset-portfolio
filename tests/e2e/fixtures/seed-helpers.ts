/**
 * E2E Seed Data Helpers
 *
 * Provides functions to seed IndexedDB directly from Playwright tests
 * via page.evaluate(). These helpers use the raw IndexedDB API to avoid
 * depending on Dexie being accessible from the test context.
 *
 * Usage Guide:
 * - Use this module (seed-helpers.ts) for Playwright E2E tests that need to
 *   directly manipulate IndexedDB from browser context
 * - Use seed-data.ts for unit/integration tests that have access to Dexie and
 *   need type-safe fixtures with Decimal.js support
 * - This module uses raw IndexedDB API with string values (no Decimal.js)
 * - seed-data.ts uses Dexie types with proper Decimal.js instances
 */

import { Page } from '@playwright/test';

// Database name constant to avoid hardcoding throughout the file
const DB_NAME = 'PortfolioTrackerDB';

// ============================================================================
// Core: Generate mock data via the /test page UI
// ============================================================================

/**
 * Navigates to /test page and generates mock data via the UI button.
 * Waits for redirect back to dashboard.
 */
export async function generateMockData(page: Page): Promise<void> {
  await page.goto('/test');

  await page.getByRole('button', { name: 'Generate Mock Data' }).click();
  await page.waitForSelector('text=Done! Redirecting...', {
    timeout: 10000,
  });
  await page.waitForURL('/', { timeout: 10000 });
}

// ============================================================================
// Core: Direct IndexedDB operations
// ============================================================================

/**
 * Gets the first portfolio ID from IndexedDB.
 * Must be called after the app is loaded (page has been navigated).
 */
export async function getFirstPortfolioId(page: Page): Promise<string> {
  return page.evaluate(async (dbName) => {
    return new Promise<string>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['portfolios'], 'readonly');
        const store = tx.objectStore('portfolios');
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          const portfolios = getAll.result;
          if (portfolios.length === 0) {
            db.close(); // Close db on error path
            reject(new Error('No portfolios found in database'));
            return;
          }
          db.close();
          resolve(portfolios[0].id);
        };
        getAll.onerror = () => {
          db.close();
          reject(getAll.error);
        };
      };
      request.onerror = () => reject(request.error);
    });
  }, DB_NAME);
}

/**
 * Gets all portfolio IDs from IndexedDB.
 */
export async function getAllPortfolioIds(page: Page): Promise<string[]> {
  return page.evaluate(async (dbName) => {
    return new Promise<string[]>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['portfolios'], 'readonly');
        const store = tx.objectStore('portfolios');
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          db.close();
          const portfolios = getAll.result;
          if (portfolios.length === 0) {
            // Issue 4: No error here, just return empty array
            resolve([]);
            return;
          }
          resolve(portfolios.map((p: { id: string }) => p.id));
        };
        getAll.onerror = () => {
          db.close();
          reject(getAll.error);
        };
      };
      request.onerror = () => reject(request.error);
    });
  }, DB_NAME);
}

/**
 * Adds records to an IndexedDB object store.
 * Records must be plain objects (no Date objects - use ISO strings,
 * and Dexie hooks won't run so Decimal fields must be strings).
 */
export async function addRecordsToStore(
  page: Page,
  storeName: string,
  records: Record<string, unknown>[]
): Promise<void> {
  await page.evaluate(
    async ({ storeName, records, dbName }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction([storeName], 'readwrite');
          const store = tx.objectStore(storeName);

          for (const record of records) {
            // Convert ISO date strings back to Date objects for IndexedDB indexes
            const processedRecord = { ...record };
            for (const [key, value] of Object.entries(processedRecord)) {
              if (
                typeof value === 'string' &&
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)
              ) {
                processedRecord[key] = new Date(value);
              }
            }
            store.add(processedRecord);
          }

          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    },
    { storeName, records, dbName: DB_NAME }
  );
}

/**
 * Clears all data from all tables in the database.
 */
export async function clearAllData(page: Page): Promise<void> {
  await page.evaluate(async (dbName) => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => {
        const db = request.result;
        const storeNames = Array.from(db.objectStoreNames);
        if (storeNames.length === 0) {
          db.close();
          resolve();
          return;
        }
        const tx = db.transaction(storeNames, 'readwrite');
        for (const storeName of storeNames) {
          tx.objectStore(storeName).clear();
        }
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
      request.onerror = () => reject(request.error);
    });
  }, DB_NAME);
}

// ============================================================================
// Transaction seed helpers
// ============================================================================

/**
 * Generates N transaction records for a given portfolio.
 * Returns plain objects suitable for IndexedDB insertion.
 */
export function generateTransactionRecords(
  portfolioId: string,
  count: number,
  options: {
    assetIds?: string[];
    startDate?: Date;
  } = {}
): Record<string, unknown>[] {
  const assetIds = options.assetIds || ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'VTI', 'BTC'];
  const startDate = options.startDate || new Date('2023-01-01');
  const types = ['buy', 'sell', 'buy', 'buy', 'dividend', 'buy']; // Bias toward buys

  return Array.from({ length: count }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.floor((i * 365) / count));

    const type = types[i % types.length];
    const assetId = assetIds[i % assetIds.length];
    const quantity = type === 'dividend' ? 0 : Math.floor(Math.random() * 50) + 1;
    const price =
      type === 'dividend' ? 0 : Math.floor(Math.random() * 300) + 50;
    const totalAmount =
      type === 'dividend'
        ? Math.floor(Math.random() * 200) + 10
        : quantity * price;

    return {
      id: `seed-pagination-tx-${i}`,
      portfolioId,
      assetId,
      type,
      date: date.toISOString(),
      quantity: quantity.toString(),
      price: price.toString(),
      totalAmount: totalAmount.toString(),
      fees: '0',
      currency: 'USD',
      notes: `Seeded transaction ${i + 1}`,
    };
  });
}

// ============================================================================
// Portfolio seed helpers
// ============================================================================

/**
 * Creates a second portfolio with transactions directly in IndexedDB.
 * Useful for tests that need multiple portfolios (isolation, type change, etc.)
 */
export async function seedSecondPortfolio(
  page: Page,
  options: {
    name?: string;
    type?: string;
    transactionCount?: number;
    id?: string; // Allow specifying a custom ID
  } = {}
): Promise<string> {
  const name = options.name || 'Second Test Portfolio';
  const type = options.type || 'ira';
  const transactionCount = options.transactionCount ?? 5;

  // Issue 2: Use deterministic ID (can be overridden via options)
  const portfolioId = options.id || 'seed-portfolio-2';

  // Add portfolio
  await addRecordsToStore(page, 'portfolios', [
    {
      id: portfolioId,
      name,
      type,
      currency: 'USD',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      settings: {
        rebalanceThreshold: 5,
        taxStrategy: 'fifo',
      },
    },
  ]);

  // Add assets if they don't exist (put is idempotent, add may fail on duplicates)
  // We use the same assets that mock data creates
  await page.evaluate(async (dbName) => {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction(['assets'], 'readwrite');
        const store = tx.objectStore('assets');

        const assets = [
          {
            id: 'TSLA',
            symbol: 'TSLA',
            name: 'Tesla Inc.',
            type: 'stock',
            currency: 'USD',
            exchange: 'NASDAQ',
            sector: 'Automotive',
            currentPrice: 245.0,
            priceUpdatedAt: new Date(),
            metadata: {},
          },
          {
            id: 'SPY',
            symbol: 'SPY',
            name: 'SPDR S&P 500 ETF',
            type: 'etf',
            currency: 'USD',
            exchange: 'NYSE',
            sector: 'Broad Market',
            currentPrice: 480.0,
            priceUpdatedAt: new Date(),
            metadata: {},
          },
        ];

        for (const asset of assets) {
          // Use put to avoid duplicate key errors
          store.put(asset);
        }

        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      };
      request.onerror = () => reject(request.error);
    });
  }, DB_NAME);

  // Add transactions for the second portfolio
  if (transactionCount > 0) {
    const transactions = generateTransactionRecords(portfolioId, transactionCount, {
      assetIds: ['TSLA', 'SPY'],
      startDate: new Date('2024-01-01'),
    });
    await addRecordsToStore(page, 'transactions', transactions);
  }

  // Add holdings for the second portfolio
  await addRecordsToStore(page, 'holdings', [
    {
      id: `seed-holding-${portfolioId}-1`,
      portfolioId,
      assetId: 'TSLA',
      quantity: '20',
      costBasis: '4000',
      averageCost: '200',
      currentValue: '4900',
      unrealizedGain: '900',
      unrealizedGainPercent: 22.5,
      lots: [],
      lastUpdated: new Date().toISOString(),
    },
    {
      id: `seed-holding-${portfolioId}-2`,
      portfolioId,
      assetId: 'SPY',
      quantity: '10',
      costBasis: '4500',
      averageCost: '450',
      currentValue: '4800',
      unrealizedGain: '300',
      unrealizedGainPercent: 6.67,
      lots: [],
      lastUpdated: new Date().toISOString(),
    },
  ]);

  return portfolioId;
}

// ============================================================================
// Analysis-specific portfolio seed helpers
// ============================================================================

/**
 * Modifies holdings to create a concentrated portfolio (90%+ in single asset).
 * Must be called after generateMockData().
 */
export async function makePortfolioConcentrated(page: Page): Promise<void> {
  const portfolioId = await getFirstPortfolioId(page);

  // Clear existing holdings and replace with concentrated allocation
  await page.evaluate(
    async ({ portfolioId, dbName }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['holdings'], 'readwrite');
          const store = tx.objectStore('holdings');

          // Issue 7: We iterate through holdings to delete only this portfolio's holdings
          // rather than using store.clear() which would clear ALL portfolios' holdings.
          // This preserves data isolation between portfolios.
          const idx = store.index('portfolioId');
          const getReq = idx.getAll(portfolioId);
          getReq.onsuccess = () => {
            for (const holding of getReq.result) {
              store.delete(holding.id);
            }

            // Add concentrated holdings: 95% AAPL, 5% VTI
            store.add({
              id: `concentrated-holding-1`,
              portfolioId,
              assetId: 'AAPL',
              quantity: '1000',
              costBasis: '145000',
              averageCost: '145',
              currentValue: '178500',
              unrealizedGain: '33500',
              unrealizedGainPercent: 23.1,
              lots: [],
              lastUpdated: new Date(),
            });
            store.add({
              id: `concentrated-holding-2`,
              portfolioId,
              assetId: 'VTI',
              quantity: '4',
              costBasis: '880',
              averageCost: '220',
              currentValue: '981.2',
              unrealizedGain: '101.2',
              unrealizedGainPercent: 11.5,
              lots: [],
              lastUpdated: new Date(),
            });
          };

          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    },
    { portfolioId, dbName: DB_NAME }
  );
}

/**
 * Modifies holdings to create a portfolio with high cash drag (>20% cash).
 * Must be called after generateMockData().
 */
export async function makePortfolioHighCash(page: Page): Promise<void> {
  const portfolioId = await getFirstPortfolioId(page);

  await page.evaluate(
    async ({ portfolioId, dbName }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;

          // First ensure CASH asset exists
          const assetTx = db.transaction(['assets'], 'readwrite');
          const assetStore = assetTx.objectStore('assets');
          assetStore.put({
            id: 'CASH',
            symbol: 'CASH',
            name: 'Cash & Equivalents',
            type: 'cash',
            currency: 'USD',
            exchange: '',
            currentPrice: 1,
            priceUpdatedAt: new Date(),
            metadata: {},
          });

          assetTx.oncomplete = () => {
            // Now modify holdings to add large cash position
            const holdingTx = db.transaction(['holdings'], 'readwrite');
            const holdingStore = holdingTx.objectStore('holdings');

            // Add a cash holding that makes up ~30% of portfolio
            // Existing mock data is ~$72k, so add ~$30k cash
            holdingStore.add({
              id: `high-cash-holding`,
              portfolioId,
              assetId: 'CASH',
              quantity: '30000',
              costBasis: '30000',
              averageCost: '1',
              currentValue: '30000',
              unrealizedGain: '0',
              unrealizedGainPercent: 0,
              lots: [],
              lastUpdated: new Date(),
            });

            holdingTx.oncomplete = () => {
              db.close();
              resolve();
            };
            holdingTx.onerror = () => {
              db.close();
              reject(holdingTx.error);
            };
          };
          assetTx.onerror = () => {
            db.close();
            reject(assetTx.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    },
    { portfolioId, dbName: DB_NAME }
  );
}

/**
 * Creates a portfolio with multiple issues: concentration + high cash.
 * Must be called after generateMockData().
 */
export async function makePortfolioMultiIssue(page: Page): Promise<void> {
  const portfolioId = await getFirstPortfolioId(page);

  await page.evaluate(
    async ({ portfolioId, dbName }) => {
      return new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;

          // Ensure CASH asset exists
          const assetTx = db.transaction(['assets'], 'readwrite');
          assetTx.objectStore('assets').put({
            id: 'CASH',
            symbol: 'CASH',
            name: 'Cash & Equivalents',
            type: 'cash',
            currency: 'USD',
            exchange: '',
            currentPrice: 1,
            priceUpdatedAt: new Date(),
            metadata: {},
          });

          assetTx.oncomplete = () => {
            // Replace holdings with concentrated + high cash
            const holdingTx = db.transaction(['holdings'], 'readwrite');
            const holdingStore = holdingTx.objectStore('holdings');

            // Remove existing holdings for this portfolio
            const idx = holdingStore.index('portfolioId');
            const getReq = idx.getAll(portfolioId);
            getReq.onsuccess = () => {
              for (const holding of getReq.result) {
                holdingStore.delete(holding.id);
              }

              // 60% AAPL (concentrated), 25% cash (high cash drag), 15% VTI
              holdingStore.add({
                id: 'multi-issue-holding-1',
                portfolioId,
                assetId: 'AAPL',
                quantity: '340',
                costBasis: '49300',
                averageCost: '145',
                currentValue: '60690',
                unrealizedGain: '11390',
                unrealizedGainPercent: 23.1,
                lots: [],
                lastUpdated: new Date(),
              });
              holdingStore.add({
                id: 'multi-issue-holding-2',
                portfolioId,
                assetId: 'CASH',
                quantity: '25000',
                costBasis: '25000',
                averageCost: '1',
                currentValue: '25000',
                unrealizedGain: '0',
                unrealizedGainPercent: 0,
                lots: [],
                lastUpdated: new Date(),
              });
              holdingStore.add({
                id: 'multi-issue-holding-3',
                portfolioId,
                assetId: 'VTI',
                quantity: '60',
                costBasis: '13200',
                averageCost: '220',
                currentValue: '14718',
                unrealizedGain: '1518',
                unrealizedGainPercent: 11.5,
                lots: [],
                lastUpdated: new Date(),
              });
            };

            holdingTx.oncomplete = () => {
              db.close();
              resolve();
            };
            holdingTx.onerror = () => {
              db.close();
              reject(holdingTx.error);
            };
          };
          assetTx.onerror = () => {
            db.close();
            reject(assetTx.error);
          };
        };
        request.onerror = () => reject(request.error);
      });
    },
    { portfolioId, dbName: DB_NAME }
  );
}
