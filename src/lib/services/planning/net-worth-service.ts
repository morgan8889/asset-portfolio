import Decimal from 'decimal.js';
import { db, LiabilityPayment } from '@/lib/db/schema';
import { Holding, Asset, PriceHistory } from '@/types/asset';
import { NetWorthPoint, Liability } from '@/types/planning';
import { endOfMonth, eachMonthOfInterval } from 'date-fns';
import { calculateLiabilityBalanceAtDate } from './liability-service';

// Cached data structure for batch calculations
interface CachedPortfolioData {
  holdings: Holding[];
  liabilities: Liability[];
  assetMap: Map<string, Asset | undefined>;
  // Price history sorted by date descending for efficient lookup
  priceHistoryMap: Map<string, PriceHistory[]>;
  // Liability payments mapped by liability ID for historical balance calculations
  liabilityPaymentsMap: Map<string, LiabilityPayment[]>;
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

  // Load assets, price history, and liability payments in parallel
  const [assets, priceHistories, liabilityPaymentArrays] = await Promise.all([
    db.assets.bulkGet(assetIds),
    Promise.all(assetIds.map(id => db.getPriceHistoryByAsset(id))),
    Promise.all(liabilities.map(l => db.getLiabilityPayments(l.id))),
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

  // Map liability payments by liability ID
  const liabilityPaymentsMap = new Map(
    liabilities.map((l, i) => [l.id, liabilityPaymentArrays[i]])
  );

  return { holdings, liabilities, assetMap, priceHistoryMap, liabilityPaymentsMap };
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

  // Calculate historical liability balances using payment history
  for (const liability of data.liabilities) {
    const payments = data.liabilityPaymentsMap.get(liability.id) || [];
    const balanceAtDate = calculateLiabilityBalanceAtDate(liability, payments, date);
    totalLiabilities = totalLiabilities.plus(balanceAtDate);
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
