import Decimal from 'decimal.js';
import { addMonths, startOfMonth, isAfter } from 'date-fns';
import { Transaction, TransactionType } from '@/types/transaction';
import { generateTransactionId } from '@/types/storage';

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
    const shouldReinvest = Math.random() > 0.5;

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
        notes: `Quarterly dividend - $${totalDividend.toFixed(2)}`,
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
