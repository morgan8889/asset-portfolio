import Decimal from 'decimal.js';
import { addMonths, startOfMonth, isAfter } from 'date-fns';
import { Transaction, TransactionType } from '@/types/transaction';
import { generateTransactionId } from '@/types/storage';
import { HISTORICAL_SPLITS } from './test-data-constants';

/**
 * Transaction pattern configuration
 */
export interface TransactionPattern {
  type: 'initial' | 'dca' | 'dividend' | 'rebalance' | 'withdrawal';
  frequency?: 'monthly' | 'quarterly' | 'annual';
  amount?: Decimal;
  quantity?: Decimal;
}

/** Create a base transaction object with common fields */
function createTransaction(
  portfolioId: string,
  assetId: string,
  type: TransactionType,
  date: Date,
  quantity: Decimal,
  price: Decimal,
  notes: string
): Transaction {
  return {
    id: generateTransactionId(),
    portfolioId,
    assetId,
    type,
    date,
    quantity,
    price,
    totalAmount: quantity.mul(price),
    fees: new Decimal(0),
    currency: 'USD',
    notes,
  };
}

/** Find closest price to a given date */
function findClosestPrice(
  targetDate: Date,
  priceHistory: Map<Date, Decimal>
): Decimal | null {
  let closest: { date: Date; diff: number } | null = null;
  const targetTime = targetDate.getTime();

  for (const date of priceHistory.keys()) {
    const diff = Math.abs(date.getTime() - targetTime);
    if (!closest || diff < closest.diff) {
      closest = { date, diff };
    }
  }

  return closest ? (priceHistory.get(closest.date) ?? null) : null;
}

/**
 * Generate an initial purchase transaction
 */
export function generateInitialPurchase(
  portfolioId: string,
  assetId: string,
  _symbol: string,
  date: Date,
  quantity: Decimal,
  price: Decimal
): Transaction {
  return createTransaction(
    portfolioId,
    assetId,
    'buy',
    date,
    quantity,
    price,
    'Initial purchase'
  );
}

/**
 * Generate Dollar-Cost Averaging (DCA) transactions
 */
export function generateDCATransactions(
  portfolioId: string,
  assetId: string,
  _symbol: string,
  startDate: Date,
  endDate: Date,
  monthlyInvestment: Decimal,
  priceHistory: Map<Date, Decimal>,
  frequency: 'monthly' | 'biweekly' = 'monthly'
): Transaction[] {
  const transactions: Transaction[] = [];
  const increment = frequency === 'monthly' ? 1 : 0.5;
  const label = frequency === 'monthly' ? 'Monthly' : 'Biweekly';
  let currentDate = startOfMonth(addMonths(startDate, 1));

  while (isAfter(endDate, currentDate)) {
    const price = findClosestPrice(currentDate, priceHistory);
    if (price) {
      const quantity = monthlyInvestment.div(price);
      transactions.push(
        createTransaction(
          portfolioId,
          assetId,
          'buy',
          currentDate,
          quantity,
          price,
          `${label} DCA`
        )
      );
    }
    currentDate = addMonths(currentDate, increment);
  }

  return transactions;
}

/**
 * Generate dividend transactions (quarterly payments)
 */
export function generateDividendTransactions(
  portfolioId: string,
  assetId: string,
  _symbol: string,
  startDate: Date,
  endDate: Date,
  annualDividendYield: number,
  priceHistory: Map<Date, Decimal>,
  currentQuantity: Decimal
): Transaction[] {
  const transactions: Transaction[] = [];
  const quarterlyYield = annualDividendYield / 4;
  let holdingQuantity = currentQuantity;
  let currentDate = addMonths(startDate, 3);

  while (isAfter(endDate, currentDate)) {
    const price = findClosestPrice(currentDate, priceHistory);
    if (!price) {
      currentDate = addMonths(currentDate, 3);
      continue;
    }

    const totalDividend = price.mul(quarterlyYield).mul(holdingQuantity);
    const shouldReinvest = Math.random() > 0.3; // 70% reinvest, 30% cash

    if (shouldReinvest && totalDividend.greaterThan(price)) {
      const additionalShares = totalDividend.div(price);
      transactions.push(
        createTransaction(
          portfolioId,
          assetId,
          'buy',
          currentDate,
          additionalShares,
          price,
          `Dividend reinvestment - $${totalDividend.toFixed(2)}`
        )
      );
      holdingQuantity = holdingQuantity.plus(additionalShares);
    } else {
      // Cash dividend payment
      transactions.push({
        id: generateTransactionId(),
        portfolioId,
        assetId,
        type: 'dividend',
        date: currentDate,
        quantity: new Decimal(0),
        price,
        totalAmount: totalDividend,
        fees: new Decimal(0),
        currency: 'USD',
        notes: `Quarterly dividend payment - $${totalDividend.toFixed(2)}`,
      });
    }

    currentDate = addMonths(currentDate, 3);
  }

  return transactions;
}

/**
 * Generate rebalancing transactions
 */
export function generateRebalancingTransactions(
  portfolioId: string,
  holdings: Map<
    string,
    {
      assetId: string;
      symbol: string;
      currentQuantity: Decimal;
      currentValue: Decimal;
      targetWeight: number;
    }
  >,
  totalValue: Decimal,
  date: Date,
  priceHistory: Map<string, Map<Date, Decimal>>
): Transaction[] {
  const transactions: Transaction[] = [];

  for (const [assetId, holding] of holdings) {
    const currentWeight = holding.currentValue.div(totalValue).toNumber();
    if (Math.abs(currentWeight - holding.targetWeight) < 0.05) continue;

    const price = findClosestPrice(
      date,
      priceHistory.get(assetId) ?? new Map()
    );
    if (!price) continue;

    const targetValue = totalValue.mul(holding.targetWeight);
    const difference = targetValue.minus(holding.currentValue);
    const quantity = difference.abs().div(price);
    const type: TransactionType = difference.greaterThan(0) ? 'buy' : 'sell';

    transactions.push(
      createTransaction(
        portfolioId,
        assetId,
        type,
        date,
        quantity,
        price,
        `Rebalancing - ${type} to target ${(holding.targetWeight * 100).toFixed(1)}%`
      )
    );
  }

  return transactions;
}

/**
 * Generate withdrawal transactions (proportional from all holdings)
 */
export function generateWithdrawalTransactions(
  portfolioId: string,
  holdings: Map<
    string,
    {
      assetId: string;
      symbol: string;
      currentQuantity: Decimal;
      currentWeight: number;
    }
  >,
  withdrawalAmount: Decimal,
  date: Date,
  priceHistory: Map<string, Map<Date, Decimal>>
): Transaction[] {
  const transactions: Transaction[] = [];

  for (const [assetId, holding] of holdings) {
    const price = findClosestPrice(
      date,
      priceHistory.get(assetId) ?? new Map()
    );
    if (!price) continue;

    const targetQuantity = withdrawalAmount
      .mul(holding.currentWeight)
      .div(price);
    const sellQuantity = Decimal.min(targetQuantity, holding.currentQuantity);

    if (sellQuantity.greaterThan(0)) {
      transactions.push(
        createTransaction(
          portfolioId,
          assetId,
          'sell',
          date,
          sellQuantity,
          price,
          'Withdrawal - proportional sale'
        )
      );
    }
  }

  return transactions;
}

/**
 * Generate tax-loss harvesting transactions (Oct-Dec only, losses > $1000)
 */
export function generateTaxLossHarvestingTransactions(
  portfolioId: string,
  holdings: Map<
    string,
    {
      assetId: string;
      symbol: string;
      currentQuantity: Decimal;
      costBasis: Decimal;
      currentValue: Decimal;
    }
  >,
  date: Date,
  priceHistory: Map<string, Map<Date, Decimal>>
): Transaction[] {
  if (date.getMonth() < 9) return []; // Oct-Dec only

  const transactions: Transaction[] = [];

  for (const [assetId, holding] of holdings) {
    const loss = holding.currentValue.minus(holding.costBasis);
    if (loss.greaterThanOrEqualTo(-1000)) continue;

    const price = findClosestPrice(
      date,
      priceHistory.get(assetId) ?? new Map()
    );
    if (!price) continue;

    transactions.push(
      createTransaction(
        portfolioId,
        assetId,
        'sell',
        date,
        holding.currentQuantity,
        price,
        `Tax-loss harvesting - realized loss $${loss.abs().toFixed(2)}`
      )
    );
  }

  return transactions;
}

/**
 * Generate simulated tax-loss harvesting for volatile assets during tax season
 * This creates realistic sell transactions during Oct-Dec for assets with high volatility
 */
export function generateSimulatedTaxLossHarvesting(
  portfolioId: string,
  assetId: string,
  symbol: string,
  year: number,
  quantity: Decimal,
  priceHistory: Map<Date, Decimal>
): Transaction[] {
  const transactions: Transaction[] = [];

  // Only harvest during Oct-Dec of specified years (e.g., 2020 post-COVID)
  const harvestDate = new Date(year, 10, 15); // Nov 15

  const price = findClosestPrice(harvestDate, priceHistory);
  if (!price) return transactions;

  // Simulate selling a portion (30-50%) of position for tax-loss harvesting
  const sellPortion = 0.3 + Math.random() * 0.2; // 30-50%
  const sellQuantity = quantity.mul(sellPortion);

  transactions.push(
    createTransaction(
      portfolioId,
      assetId,
      'sell',
      harvestDate,
      sellQuantity,
      price,
      'Tax-loss harvesting - offset capital gains'
    )
  );

  // Repurchase 31 days later to avoid wash sale
  const repurchaseDate = new Date(year, 11, 16); // Dec 16 (31 days later)
  const repurchasePrice = findClosestPrice(repurchaseDate, priceHistory);
  if (repurchasePrice) {
    transactions.push(
      createTransaction(
        portfolioId,
        assetId,
        'buy',
        repurchaseDate,
        sellQuantity,
        repurchasePrice,
        'Repurchase after wash sale period'
      )
    );
  }

  return transactions;
}

/**
 * Generate stock split transactions for a given asset
 */
export function generateStockSplitTransactions(
  portfolioId: string,
  assetId: string,
  symbol: string,
  startDate: Date,
  endDate: Date
): Transaction[] {
  const transactions: Transaction[] = [];
  const splits = HISTORICAL_SPLITS[symbol];

  if (!splits) return transactions;

  for (const split of splits) {
    if (split.date >= startDate && split.date <= endDate) {
      // Create split transaction
      transactions.push({
        id: generateTransactionId(),
        portfolioId,
        assetId,
        type: 'split',
        date: split.date,
        quantity: new Decimal(split.ratio),
        price: new Decimal(1).div(split.ratio),
        totalAmount: new Decimal(0),
        fees: new Decimal(0),
        currency: 'USD',
        notes: split.description,
        metadata: {
          splitRatio: split.ratio,
          splitType: 'forward',
        },
      });
    }
  }

  return transactions;
}

/**
 * Generate annual management fee transactions
 */
export function generateFeeTransactions(
  portfolioId: string,
  assetId: string,
  _symbol: string,
  startDate: Date,
  endDate: Date,
  portfolioValue: Decimal,
  annualFeeRate: number = 0.005 // 0.5% annual fee
): Transaction[] {
  const transactions: Transaction[] = [];
  let currentDate = new Date(startDate.getFullYear() + 1, 0, 1); // January 1st of next year

  while (isAfter(endDate, currentDate)) {
    const annualFee = portfolioValue.mul(annualFeeRate);

    transactions.push({
      id: generateTransactionId(),
      portfolioId,
      assetId,
      type: 'fee',
      date: currentDate,
      quantity: new Decimal(0),
      price: new Decimal(0),
      totalAmount: annualFee,
      fees: annualFee,
      currency: 'USD',
      notes: `Annual management fee (${(annualFeeRate * 100).toFixed(2)}%)`,
    });

    currentDate = new Date(currentDate.getFullYear() + 1, 0, 1);
  }

  return transactions;
}

/**
 * Generate monthly rental income transactions for real estate properties
 */
export function generateRentalIncomeTransactions(
  portfolioId: string,
  assetId: string,
  _symbol: string,
  startDate: Date,
  endDate: Date,
  monthlyRent: Decimal
): Transaction[] {
  const transactions: Transaction[] = [];
  let currentDate = startOfMonth(addMonths(startDate, 1));

  while (isAfter(endDate, currentDate)) {
    transactions.push({
      id: generateTransactionId(),
      portfolioId,
      assetId,
      type: 'interest', // Using interest type for rental income
      date: currentDate,
      quantity: new Decimal(0),
      price: new Decimal(0),
      totalAmount: monthlyRent,
      fees: new Decimal(0),
      currency: 'USD',
      notes: `Monthly rental income - $${monthlyRent.toFixed(2)}`,
    });

    currentDate = addMonths(currentDate, 1);
  }

  return transactions;
}

/**
 * Get transaction pattern based on investment strategy
 */
export function getTransactionPatternForAsset(
  _symbol: string,
  _assetType: string,
  strategy: 'aggressive' | 'balanced' | 'conservative'
): {
  dcaEnabled: boolean;
  dcaAmount: Decimal;
  dividendYield: number;
  rebalanceFrequency: 'quarterly' | 'annual' | 'never';
} {
  const patterns = {
    aggressive: {
      dcaEnabled: true,
      dcaAmount: new Decimal(500),
      dividendYield: 0.01,
      rebalanceFrequency: 'quarterly' as const,
    },
    balanced: {
      dcaEnabled: true,
      dcaAmount: new Decimal(300),
      dividendYield: 0.02,
      rebalanceFrequency: 'annual' as const,
    },
    conservative: {
      dcaEnabled: true,
      dcaAmount: new Decimal(200),
      dividendYield: 0.03,
      rebalanceFrequency: 'quarterly' as const,
    },
  };
  return patterns[strategy];
}
