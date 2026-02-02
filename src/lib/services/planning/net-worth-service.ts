import Decimal from 'decimal.js';
import { db } from '@/lib/db/schema';
import { Holding, Asset, PriceHistory } from '@/types/asset';
import { NetWorthPoint, Liability } from '@/types/planning';
import { endOfMonth, eachMonthOfInterval } from 'date-fns';

// Cached data structure for batch calculations
interface CachedPortfolioData {
  holdings: Holding[];
  liabilities: Liability[];
  assetMap: Map<string, Asset | undefined>;
  // Price history sorted by date descending for efficient lookup
  priceHistoryMap: Map<string, PriceHistory[]>;
}

/**
 * Load all portfolio data once for batch net worth calculations
 */
async function loadPortfolioData(portfolioId: string): Promise<CachedPortfolioData> {
  // Load all data in parallel
  const [holdings, liabilities] = await Promise.all([
    db.getHoldingsByPortfolio(portfolioId),
    db.getLiabilitiesByPortfolio(portfolioId),
  ]);

  const assetIds = holdings.map(h => h.assetId);

  // Load assets and ALL price history in parallel
  const [assets, priceHistories] = await Promise.all([
    db.assets.bulkGet(assetIds),
    Promise.all(assetIds.map(id => db.getPriceHistoryByAsset(id))),
  ]);

  // Create maps and pre-sort price history by date descending
  const assetMap = new Map(assetIds.map((id, i) => [id, assets[i]]));
  const priceHistoryMap = new Map(
    assetIds.map((id, i) => [
      id,
      (priceHistories[i] || []).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    ])
  );

  return { holdings, liabilities, assetMap, priceHistoryMap };
}

/**
 * Find the most recent price on or before a given date from sorted price history
 */
function findPriceAtDate(
  priceHistory: PriceHistory[],
  targetDate: Date,
  fallbackPrice: Decimal
): Decimal {
  const targetTime = targetDate.getTime();

  // Price history is sorted descending, find first price <= target date
  for (const price of priceHistory) {
    if (new Date(price.date).getTime() <= targetTime) {
      return new Decimal(price.close);
    }
  }

  return fallbackPrice;
}

/**
 * Calculate net worth from cached data (no DB calls)
 */
function calculateNetWorthFromCache(
  data: CachedPortfolioData,
  date: Date
): { assets: Decimal; liabilities: Decimal; netWorth: Decimal } {
  let totalAssets = new Decimal(0);
  let totalLiabilities = new Decimal(0);

  for (const holding of data.holdings) {
    const asset = data.assetMap.get(holding.assetId);
    if (!asset) continue;

    const priceHistory = data.priceHistoryMap.get(holding.assetId) || [];
    const fallbackPrice = asset.currentPrice ? new Decimal(asset.currentPrice) : new Decimal(0);
    const price = findPriceAtDate(priceHistory, date, fallbackPrice);

    const quantity = new Decimal(holding.quantity);
    const value = price.mul(quantity);

    const ownershipPercent = new Decimal(holding.ownershipPercentage || 100).div(100);
    const adjustedValue = value.mul(ownershipPercent);

    totalAssets = totalAssets.plus(adjustedValue);
  }

  for (const liability of data.liabilities) {
    const balance = new Decimal(liability.balance);
    totalLiabilities = totalLiabilities.plus(balance);
  }

  return {
    assets: totalAssets,
    liabilities: totalLiabilities,
    netWorth: totalAssets.minus(totalLiabilities),
  };
}

/**
 * Aggregates assets and liabilities to calculate net worth at a specific date
 */
export async function calculateNetWorthAtDate(
  portfolioId: string,
  date: Date
): Promise<{ assets: Decimal; liabilities: Decimal; netWorth: Decimal }> {
  const data = await loadPortfolioData(portfolioId);
  return calculateNetWorthFromCache(data, date);
}

/**
 * Generates a monthly time series of net worth from start to end date
 * Optimized: loads all data once, then calculates each month from cache
 */
export async function getNetWorthHistory(
  portfolioId: string,
  startDate: Date,
  endDate: Date
): Promise<NetWorthPoint[]> {
  // Load all data once upfront
  const data = await loadPortfolioData(portfolioId);

  // Generate array of month-end dates
  const monthEnds = eachMonthOfInterval({ start: startDate, end: endDate }).map(
    (date) => endOfMonth(date)
  );

  // Calculate net worth for each month from cached data (no DB calls in loop)
  return monthEnds.map((monthEnd) => {
    const { assets, liabilities, netWorth } = calculateNetWorthFromCache(data, monthEnd);

    return {
      date: monthEnd,
      assets: assets.toNumber(),
      liabilities: liabilities.toNumber(),
      netWorth: netWorth.toNumber(),
    };
  });
}

/**
 * Gets the current net worth for a portfolio
 */
export async function getCurrentNetWorth(portfolioId: string): Promise<number> {
  const { netWorth } = await calculateNetWorthAtDate(portfolioId, new Date());
  return netWorth.toNumber();
}

/**
 * Calculates the total value of all assets in a portfolio
 */
export async function getTotalAssets(portfolioId: string): Promise<number> {
  const { assets } = await calculateNetWorthAtDate(portfolioId, new Date());
  return assets.toNumber();
}

/**
 * Calculates the total liabilities in a portfolio
 */
export async function getTotalLiabilities(portfolioId: string): Promise<number> {
  const { liabilities } = await calculateNetWorthAtDate(portfolioId, new Date());
  return liabilities.toNumber();
}
