import Decimal from 'decimal.js';
import {
  addDays,
  subYears,
  differenceInDays,
  startOfDay,
  isSameDay,
} from 'date-fns';
import { db } from '@/lib/db/schema';
import { AssetType } from '@/types';
import { Transaction } from '@/types/transaction';
import { PerformanceSnapshotStorage } from '@/types/performance';
import {
  generatePortfolioId,
  createAssetId,
  generateHoldingId,
  generatePriceHistoryId,
  generateTaxLotId,
} from '@/types/storage';
import { createPerformanceSnapshotId } from '@/types/performance';
import { generatePricesWithScenarios } from './price-algorithms';
import {
  generateScenariosForRange,
  getAssetVolatility,
  getAssetReturn,
  scenarioPeriodToMarketScenario,
} from './market-scenarios';
import {
  generateInitialPurchase,
  generateDCATransactions,
  generateDividendTransactions,
  generateStockSplitTransactions,
  generateFeeTransactions,
  generateSimulatedTaxLossHarvesting,
  generateRentalIncomeTransactions,
  getTransactionPatternForAsset,
} from './transaction-patterns';
import { AssetAllocation, ASSET_ALLOCATIONS } from './asset-allocations';

/** Helper to save items in batches to avoid memory issues */
async function bulkAddInBatches<T>(
  table: { bulkAdd: (items: T[]) => Promise<unknown> },
  items: T[],
  batchSize: number
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    await table.bulkAdd(items.slice(i, i + batchSize));
  }
}

/** Historical portfolio generation options */
export interface HistoricalPortfolioOptions {
  name?: string;
  yearsBack?: number;
  scenario?: 'balanced' | 'aggressive' | 'conservative';
  includeInternational?: boolean;
  includeDividends?: boolean;
  totalInitialInvestment?: number;
  onProgress?: (progress: number, message: string) => void;
}

/** Price data for an asset over time */
type PriceData = { dates: Date[]; prices: number[]; asset: AssetAllocation };

/**
 * Main function to generate a complete historical portfolio
 */
export async function generateHistoricalPortfolio(
  options: HistoricalPortfolioOptions = {}
): Promise<string> {
  const {
    name = 'Historical Demo Portfolio',
    yearsBack = 5,
    scenario = 'balanced',
    includeInternational = true,
    includeDividends = true,
    totalInitialInvestment = 100000,
    onProgress = () => {},
  } = options;

  const endDate = startOfDay(new Date());
  const startDate = startOfDay(subYears(endDate, yearsBack));
  const totalDays = differenceInDays(endDate, startDate);

  onProgress(0, 'Creating portfolio...');

  // 1. Create portfolio
  const portfolioId = generatePortfolioId();
  await db.portfolios.add({
    id: portfolioId,
    name,
    type: 'taxable',
    currency: 'USD',
    createdAt: startDate,
    updatedAt: new Date(),
    settings: { rebalanceThreshold: 5, taxStrategy: 'fifo' },
    metadata: {
      description: `Generated ${yearsBack}-year historical portfolio (${scenario} strategy)`,
      generatedBy: 'historical-data-generator',
    },
  });

  onProgress(5, 'Selecting assets...');

  // 2. Get asset allocation (filter international if needed, redistribute weights)
  let assets = [...ASSET_ALLOCATIONS[scenario]];
  if (!includeInternational) {
    const vxus = assets.find((a) => a.symbol === 'VXUS');
    if (vxus) {
      assets = assets.filter((a) => a.symbol !== 'VXUS');
      const redistribution = vxus.targetWeight / assets.length;
      assets.forEach((a) => {
        a.targetWeight += redistribution;
      });
    }
  }

  onProgress(10, 'Generating market scenarios...');
  const scenarios = generateScenariosForRange(startDate, endDate, yearsBack);

  onProgress(15, 'Generating price histories...');

  // 3. Generate price history for each asset
  const priceHistoryMap = new Map<string, PriceData>();

  for (let i = 0; i < assets.length; i++) {
    const assetAlloc = assets[i];
    onProgress(
      15 + (i / assets.length) * 20,
      `Generating prices for ${assetAlloc.symbol}...`
    );

    // Generate prices with asset-specific adjustments to scenarios
    const marketScenarios = scenarios.map((s) => {
      const base = scenarioPeriodToMarketScenario(s);
      return {
        ...base,
        annualReturn: getAssetReturn(assetAlloc.symbol, base.annualReturn),
        volatility: getAssetVolatility(assetAlloc.symbol, base.volatility),
      };
    });

    const prices = generatePricesWithScenarios(
      assetAlloc.initialPrice,
      marketScenarios
    );
    const dates = prices.map((_, idx) => addDays(startDate, idx));

    priceHistoryMap.set(assetAlloc.symbol, {
      dates,
      prices,
      asset: assetAlloc,
    });

    // Create asset in database
    const assetId = createAssetId(assetAlloc.symbol);
    const assetMetadata: Record<string, any> = {
      dividendYield: assetAlloc.dividendYield,
    };

    // Add real estate specific metadata
    if (assetAlloc.type === 'real_estate') {
      assetMetadata.monthlyRent = assetAlloc.monthlyRent;
      assetMetadata.region = assetAlloc.region;
      assetMetadata.address = assetAlloc.address;
      assetMetadata.propertyType = 'rental';
    }

    await db.assets.add({
      id: assetId,
      symbol: assetAlloc.symbol,
      name: assetAlloc.name,
      type: assetAlloc.type,
      exchange: assetAlloc.exchange,
      currency: 'USD',
      sector: assetAlloc.sector,
      currentPrice: prices[prices.length - 1],
      priceUpdatedAt: endDate,
      metadata: assetMetadata,
    });

    // Save price history
    const priceHistoryEntries = dates.map((date, idx) => ({
      id: generatePriceHistoryId(),
      assetId,
      date,
      open: prices[idx].toString(),
      high: (prices[idx] * 1.01).toString(),
      low: (prices[idx] * 0.99).toString(),
      close: prices[idx].toString(),
      adjustedClose: prices[idx].toString(),
      volume: Math.floor(Math.random() * 10000000),
      source: 'generated',
    }));

    await bulkAddInBatches(db.priceHistory, priceHistoryEntries, 500);
  }

  onProgress(40, 'Generating transactions...');

  // 4. Generate transactions
  const allTransactions: Transaction[] = [];

  for (let i = 0; i < assets.length; i++) {
    const assetAlloc = assets[i];
    onProgress(
      40 + (i / assets.length) * 20,
      `Generating transactions for ${assetAlloc.symbol}...`
    );

    const priceData = priceHistoryMap.get(assetAlloc.symbol);
    const assetRecord = await db.assets
      .where('symbol')
      .equals(assetAlloc.symbol)
      .first();
    if (!priceData || !assetRecord) continue;

    // Build price map for transaction generation
    const priceMap = new Map<Date, Decimal>();
    priceData.dates.forEach((date, idx) =>
      priceMap.set(date, new Decimal(priceData.prices[idx]))
    );

    // Initial purchase
    const initialInvestment = new Decimal(totalInitialInvestment).mul(
      assetAlloc.targetWeight
    );
    const initialPrice = new Decimal(assetAlloc.initialPrice);
    const initialQuantity = initialInvestment.div(initialPrice);

    allTransactions.push(
      generateInitialPurchase(
        portfolioId,
        assetRecord.id,
        assetAlloc.symbol,
        startDate,
        initialQuantity,
        initialPrice
      )
    );

    // DCA transactions
    const pattern = getTransactionPatternForAsset(
      assetAlloc.symbol,
      assetAlloc.type,
      scenario
    );
    if (pattern.dcaEnabled) {
      allTransactions.push(
        ...generateDCATransactions(
          portfolioId,
          assetRecord.id,
          assetAlloc.symbol,
          startDate,
          endDate,
          pattern.dcaAmount.mul(assetAlloc.targetWeight),
          priceMap,
          'monthly'
        )
      );
    }

    // Dividend transactions
    if (
      includeDividends &&
      assetAlloc.dividendYield &&
      assetAlloc.dividendYield > 0
    ) {
      allTransactions.push(
        ...generateDividendTransactions(
          portfolioId,
          assetRecord.id,
          assetAlloc.symbol,
          startDate,
          endDate,
          assetAlloc.dividendYield,
          priceMap,
          initialQuantity
        )
      );
    }

    // Stock split transactions
    allTransactions.push(
      ...generateStockSplitTransactions(
        portfolioId,
        assetRecord.id,
        assetAlloc.symbol,
        startDate,
        endDate
      )
    );

    // Tax-loss harvesting for volatile assets during 2020 (post-COVID crash)
    if (
      (assetAlloc.type === 'stock' || assetAlloc.type === 'crypto') &&
      startDate <= new Date('2020-01-01') &&
      endDate >= new Date('2020-12-31')
    ) {
      allTransactions.push(
        ...generateSimulatedTaxLossHarvesting(
          portfolioId,
          assetRecord.id,
          assetAlloc.symbol,
          2020,
          initialQuantity,
          priceMap
        )
      );
    }

    // Rental income for real estate properties
    if (assetAlloc.type === 'real_estate' && assetAlloc.monthlyRent) {
      allTransactions.push(
        ...generateRentalIncomeTransactions(
          portfolioId,
          assetRecord.id,
          assetAlloc.symbol,
          startDate,
          endDate,
          new Decimal(assetAlloc.monthlyRent)
        )
      );
    }
  }

  // Add annual management fee transactions
  if (assets.length > 0) {
    const firstAsset = await db.assets
      .where('symbol')
      .equals(assets[0].symbol)
      .first();
    if (firstAsset) {
      allTransactions.push(
        ...generateFeeTransactions(
          portfolioId,
          firstAsset.id,
          assets[0].symbol,
          startDate,
          endDate,
          new Decimal(totalInitialInvestment),
          0.005 // 0.5% annual fee
        )
      );
    }
  }

  allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  onProgress(60, 'Computing daily snapshots...');

  // 5. Generate daily performance snapshots BEFORE saving transactions
  // (to avoid mutation from database serialization hooks)
  const snapshots = await generateDailySnapshots(
    portfolioId,
    startDate,
    endDate,
    allTransactions,
    priceHistoryMap,
    (day) =>
      onProgress(
        60 + (day / totalDays) * 30,
        `Computing snapshot ${day}/${totalDays}...`
      )
  );

  onProgress(90, 'Calculating final holdings...');
  await recalculateHoldings(
    portfolioId,
    allTransactions,
    priceHistoryMap,
    endDate
  );

  onProgress(93, 'Saving snapshots...');
  await bulkAddInBatches(db.performanceSnapshots, snapshots, 500);

  onProgress(96, 'Saving transactions...');
  await bulkAddInBatches(db.transactions as any, allTransactions, 100);

  onProgress(100, 'Complete!');
  return portfolioId;
}

/** Holding state for snapshot generation */
interface HoldingState {
  quantity: Decimal;
  costBasis: Decimal;
  assetId: string;
}

/** Update holding based on transaction */
function applyTransaction(holding: HoldingState, tx: Transaction): void {
  if (tx.type === 'buy') {
    holding.quantity = holding.quantity.plus(tx.quantity);
    holding.costBasis = holding.costBasis.plus(tx.quantity.mul(tx.price));
  } else if (tx.type === 'sell' && holding.quantity.greaterThan(0)) {
    const proportionSold = tx.quantity.div(holding.quantity);
    holding.costBasis = holding.costBasis.mul(
      new Decimal(1).minus(proportionSold)
    );
    holding.quantity = holding.quantity.minus(tx.quantity);
  } else if (tx.type === 'split') {
    // Stock split: multiply quantity by split ratio, cost basis stays same
    const splitRatio = tx.quantity;
    holding.quantity = holding.quantity.mul(splitRatio);
    // Cost basis remains unchanged (total investment doesn't change)
  }
}

/** Generate daily performance snapshots */
async function generateDailySnapshots(
  portfolioId: string,
  startDate: Date,
  endDate: Date,
  transactions: Transaction[],
  priceHistory: Map<string, PriceData>,
  onProgress?: (currentDay: number) => void
): Promise<PerformanceSnapshotStorage[]> {
  const snapshots: PerformanceSnapshotStorage[] = [];
  const holdings = new Map<string, HoldingState>();

  // Build asset symbol lookup
  const assetSymbols = new Map<string, string>();
  for (const [symbol] of priceHistory) {
    const asset = await db.assets.where('symbol').equals(symbol).first();
    if (asset) assetSymbols.set(asset.id, symbol);
  }

  let currentDate = startDate;
  let dayCount = 0;

  while (currentDate <= endDate) {
    dayCount++;
    if (onProgress && dayCount % 10 === 0) onProgress(dayCount);

    // Apply day's transactions
    for (const tx of transactions.filter((t) =>
      isSameDay(t.date, currentDate)
    )) {
      const holding = holdings.get(tx.assetId) ?? {
        quantity: new Decimal(0),
        costBasis: new Decimal(0),
        assetId: tx.assetId,
      };
      applyTransaction(holding, tx);
      holdings.set(tx.assetId, holding);
    }

    // Calculate portfolio totals
    let totalValue = new Decimal(0);
    let totalCost = new Decimal(0);

    for (const [assetId, holding] of holdings) {
      const symbol = assetSymbols.get(assetId);
      const priceData = symbol ? priceHistory.get(symbol) : undefined;
      if (!priceData) continue;

      const priceIdx = priceData.dates.findIndex((d) =>
        isSameDay(d, currentDate)
      );
      if (priceIdx === -1) continue;

      totalValue = totalValue.plus(
        holding.quantity.mul(priceData.prices[priceIdx])
      );
      totalCost = totalCost.plus(holding.costBasis);
    }

    // Calculate changes
    const prevSnapshot = snapshots[snapshots.length - 1];
    const prevValue = prevSnapshot
      ? new Decimal(prevSnapshot.totalValue)
      : new Decimal(0);
    const dayChange = prevSnapshot
      ? totalValue.minus(prevValue)
      : new Decimal(0);
    const dayChangePercent = prevValue.greaterThan(0)
      ? dayChange.div(prevValue).mul(100).toNumber()
      : 0;
    const cumulativeReturn = totalCost.greaterThan(0)
      ? totalValue.minus(totalCost).div(totalCost)
      : new Decimal(0);

    snapshots.push({
      id: createPerformanceSnapshotId(portfolioId, currentDate),
      portfolioId,
      date: currentDate,
      totalValue: totalValue.toString(),
      totalCost: totalCost.toString(),
      dayChange: dayChange.toString(),
      dayChangePercent,
      cumulativeReturn: cumulativeReturn.toString(),
      twrReturn: cumulativeReturn.toString(),
      holdingCount: holdings.size,
      hasInterpolatedPrices: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    currentDate = addDays(currentDate, 1);
  }

  return snapshots;
}

/** Tax lot for FIFO accounting */
interface TaxLot {
  id: string;
  quantity: Decimal;
  purchasePrice: Decimal;
  purchaseDate: Date;
  soldQuantity: Decimal;
  remainingQuantity: Decimal;
}

/** Holding with tax lots */
interface HoldingWithLots {
  assetId: string;
  symbol: string;
  quantity: Decimal;
  costBasis: Decimal;
  lots: TaxLot[];
}

/** Recalculate and save current holdings */
async function recalculateHoldings(
  portfolioId: string,
  transactions: Transaction[],
  priceHistory: Map<string, PriceData>,
  currentDate: Date
): Promise<void> {
  const holdings = new Map<string, HoldingWithLots>();

  // Process all transactions
  for (const tx of transactions) {
    const asset = await db.assets.get(tx.assetId);
    if (!asset) continue;

    let holding = holdings.get(tx.assetId);
    if (!holding) {
      holding = {
        assetId: tx.assetId,
        symbol: asset.symbol,
        quantity: new Decimal(0),
        costBasis: new Decimal(0),
        lots: [],
      };
      holdings.set(tx.assetId, holding);
    }

    if (tx.type === 'buy') {
      holding.quantity = holding.quantity.plus(tx.quantity);
      holding.costBasis = holding.costBasis.plus(tx.quantity.mul(tx.price));
      holding.lots.push({
        id: generateTaxLotId(),
        quantity: tx.quantity,
        purchasePrice: tx.price,
        purchaseDate: tx.date,
        soldQuantity: new Decimal(0),
        remainingQuantity: tx.quantity,
      });
    } else if (tx.type === 'sell' && holding.quantity.greaterThan(0)) {
      // FIFO lot accounting
      let remaining = tx.quantity;
      for (const lot of holding.lots) {
        if (remaining.lte(0)) break;
        const sellAmt = Decimal.min(lot.remainingQuantity, remaining);
        lot.soldQuantity = lot.soldQuantity.plus(sellAmt);
        lot.remainingQuantity = lot.remainingQuantity.minus(sellAmt);
        remaining = remaining.minus(sellAmt);
      }

      const proportionSold = tx.quantity.div(holding.quantity);
      holding.costBasis = holding.costBasis.mul(
        new Decimal(1).minus(proportionSold)
      );
      holding.quantity = holding.quantity.minus(tx.quantity);
    } else if (tx.type === 'split') {
      // Stock split: multiply quantities by split ratio, adjust prices
      const splitRatio = tx.quantity;
      holding.quantity = holding.quantity.mul(splitRatio);
      // Cost basis stays same, but update all lots
      for (const lot of holding.lots) {
        lot.quantity = lot.quantity.mul(splitRatio);
        lot.remainingQuantity = lot.remainingQuantity.mul(splitRatio);
        lot.soldQuantity = lot.soldQuantity.mul(splitRatio);
        lot.purchasePrice = lot.purchasePrice.div(splitRatio);
      }
    }
  }

  // Save holdings with current values
  for (const [assetId, holding] of holdings) {
    if (holding.quantity.lte(0)) continue;

    const priceData = priceHistory.get(holding.symbol);
    if (!priceData) continue;

    const currentPrice = priceData.prices[priceData.prices.length - 1];
    const currentValue = holding.quantity.mul(currentPrice);
    const unrealizedGain = currentValue.minus(holding.costBasis);

    await db.holdings.add({
      id: generateHoldingId(),
      portfolioId: portfolioId as any,
      assetId: assetId as any,
      quantity: holding.quantity.toString(),
      costBasis: holding.costBasis.toString(),
      averageCost: holding.costBasis.div(holding.quantity).toString(),
      currentValue: currentValue.toString(),
      unrealizedGain: unrealizedGain.toString(),
      unrealizedGainPercent: holding.costBasis.greaterThan(0)
        ? unrealizedGain.div(holding.costBasis).mul(100).toNumber()
        : 0,
      lots: holding.lots.map((lot) => ({
        id: lot.id as any,
        quantity: lot.quantity.toString(),
        purchasePrice: lot.purchasePrice.toString(),
        purchaseDate: lot.purchaseDate,
        soldQuantity: lot.soldQuantity.toString(),
        remainingQuantity: lot.remainingQuantity.toString(),
      })),
      lastUpdated: currentDate,
    });
  }
}
