import Decimal from 'decimal.js';
import { db } from '@/lib/db/schema';
import { NetWorthPoint } from '@/types/planning';
import { endOfMonth, startOfMonth, eachMonthOfInterval, format } from 'date-fns';

/**
 * Aggregates assets and liabilities to calculate net worth at a specific date
 */
export async function calculateNetWorthAtDate(
  portfolioId: string,
  date: Date
): Promise<{ assets: Decimal; liabilities: Decimal; netWorth: Decimal }> {
  // Get all holdings for the portfolio
  const holdings = await db.getHoldingsByPortfolio(portfolioId);

  // Get all liabilities for the portfolio
  const liabilities = await db.getLiabilitiesByPortfolio(portfolioId);

  let totalAssets = new Decimal(0);
  let totalLiabilities = new Decimal(0);

  // Batch load all assets and price histories to avoid N+1 queries
  const assetIds = holdings.map(h => h.assetId);
  const assets = await db.assets.bulkGet(assetIds);
  const priceHistories = await Promise.all(
    assetIds.map(id => db.getPriceHistoryByAsset(id, undefined, date))
  );

  // Create maps for efficient lookup
  const assetMap = new Map(assetIds.map((id, i) => [id, assets[i]]));
  const priceHistoryMap = new Map(assetIds.map((id, i) => [id, priceHistories[i]]));

  // Calculate total asset value
  for (const holding of holdings) {
    // Get the asset details from the pre-loaded map
    const asset = assetMap.get(holding.assetId);
    if (!asset) continue;

    // Get price history from the pre-loaded map
    const priceHistory = priceHistoryMap.get(holding.assetId) || [];

    let price: Decimal;
    if (priceHistory.length > 0) {
      // Use the closest price at or before the date
      const sortedPrices = priceHistory.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      price = sortedPrices[0].close;
    } else {
      // Fallback to current price if no historical data
      price = asset.currentPrice ? new Decimal(asset.currentPrice) : new Decimal(0);
    }

    // Calculate holding value
    const quantity = new Decimal(holding.quantity);
    const value = price.mul(quantity);

    // Apply ownership percentage if partial ownership
    const ownershipPercent = new Decimal(holding.ownershipPercentage || 100).div(100);
    const adjustedValue = value.mul(ownershipPercent);

    totalAssets = totalAssets.plus(adjustedValue);
  }

  // Calculate total liabilities
  for (const liability of liabilities) {
    // For now, use current balance. In future, could calculate historical balance
    // based on payment schedule and interest rate
    const balance = new Decimal(liability.balance);
    totalLiabilities = totalLiabilities.plus(balance);
  }

  const netWorth = totalAssets.minus(totalLiabilities);

  return {
    assets: totalAssets,
    liabilities: totalLiabilities,
    netWorth,
  };
}

/**
 * Generates a monthly time series of net worth from start to end date
 */
export async function getNetWorthHistory(
  portfolioId: string,
  startDate: Date,
  endDate: Date
): Promise<NetWorthPoint[]> {
  const history: NetWorthPoint[] = [];

  // Generate array of month-end dates
  const monthEnds = eachMonthOfInterval({ start: startDate, end: endDate }).map(
    (date) => endOfMonth(date)
  );

  // Calculate net worth for each month
  for (const monthEnd of monthEnds) {
    const { assets, liabilities, netWorth } = await calculateNetWorthAtDate(
      portfolioId,
      monthEnd
    );

    history.push({
      date: monthEnd,
      assets: assets.toNumber(),
      liabilities: liabilities.toNumber(),
      netWorth: netWorth.toNumber(),
    });
  }

  return history;
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
