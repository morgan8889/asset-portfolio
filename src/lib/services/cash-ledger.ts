/**
 * Cash Ledger Service
 *
 * Tracks cash movements over time by analyzing all cash-affecting transactions.
 * This service is critical for accurate net worth calculations that include:
 * - Dividends and interest income
 * - Trading fees and taxes
 * - Buy and sell transactions
 * - Deposits and withdrawals
 */

import { Decimal } from 'decimal.js';
import { Transaction, TransactionType } from '@/types/transaction';
import { db } from '@/lib/db/schema';

// TODO: Add getCashAccount and updateCashBalance to database schema
// Temporary stubs until cash account table is implemented
interface CashAccount {
  portfolioId: string;
  currency: string;
  balance: Decimal;
}

async function getCashAccount(_portfolioId: string): Promise<CashAccount | null> {
  // Placeholder: Cash account table not yet implemented
  return null;
}

async function updateCashBalance(
  _portfolioId: string,
  _currency: string,
  _balance: Decimal
): Promise<void> {
  // Placeholder: Cash account table not yet implemented
}

/**
 * Determine the cash impact of a transaction
 *
 * Cash Impact Rules:
 * - buy: Cash out = -(quantity × price + fees)
 * - sell: Cash in = +(quantity × price - fees)
 * - dividend/interest: Cash in = +amount
 * - fee/tax: Cash out = -amount
 * - deposit: Cash in = +amount
 * - withdrawal: Cash out = -amount
 * - transfer_in/transfer_out: No cash impact (asset transfer)
 * - split/reinvestment: No cash impact (share quantity change)
 *
 * @param transaction - Transaction to analyze
 * @returns Net cash impact (positive = cash in, negative = cash out)
 */
export function getCashImpact(transaction: Transaction): Decimal {
  const { type, quantity, price, fees, totalAmount } = transaction;

  switch (type) {
    case 'buy':
    case 'espp_purchase':
    case 'rsu_vest':
      // Cash out: Cost of shares + fees
      return quantity.mul(price).plus(fees).neg();

    case 'sell':
      // Cash in: Proceeds - fees
      return quantity.mul(price).minus(fees);

    case 'dividend':
    case 'interest':
      // Cash in: Dividend/interest amount (stored in price field for these types)
      return price;

    case 'fee':
    case 'tax':
      // Cash out: Fee/tax amount
      return new Decimal(price).neg();

    case 'deposit':
      // Cash in: Deposit amount
      return price;

    case 'withdrawal':
      // Cash out: Withdrawal amount
      return new Decimal(price).neg();

    case 'reinvestment':
      // Reinvestment typically: dividend received → immediately used to buy shares
      // Net cash impact is zero (dividend in, buy out = 0)
      return new Decimal(0);

    case 'transfer_in':
    case 'transfer_out':
    case 'split':
    case 'spinoff':
    case 'merger':
      // No cash impact - these are quantity/holding changes
      return new Decimal(0);

    default:
      // Unknown transaction type - assume no cash impact
      console.warn(`Unknown transaction type: ${type}, assuming no cash impact`);
      return new Decimal(0);
  }
}

/**
 * Check if a transaction type affects cash balance
 *
 * @param type - Transaction type
 * @returns true if transaction affects cash
 */
export function affectsCash(type: TransactionType): boolean {
  const cashAffectingTypes: TransactionType[] = [
    'buy',
    'sell',
    'dividend',
    'interest',
    'fee',
    'tax',
    'deposit',
    'withdrawal',
    'espp_purchase',
    'rsu_vest',
  ];

  return cashAffectingTypes.includes(type);
}

/**
 * Calculate cash balance at a specific date by replaying all cash-affecting transactions
 *
 * This function processes transactions chronologically up to the target date,
 * accumulating cash impacts to determine the cash balance at that point in time.
 *
 * @param transactions - All transactions for the portfolio (must be pre-filtered)
 * @param targetDate - Date to calculate balance for
 * @param initialBalance - Starting cash balance (default: 0)
 * @returns Cash balance at the target date
 */
export function calculateCashBalanceAtDate(
  transactions: Transaction[],
  targetDate: Date,
  initialBalance: Decimal = new Decimal(0)
): Decimal {
  let cashBalance = initialBalance;

  // Filter transactions up to target date and sort chronologically
  const relevantTransactions = transactions
    .filter((tx) => tx.date <= targetDate)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Accumulate cash impacts
  for (const tx of relevantTransactions) {
    if (affectsCash(tx.type)) {
      const impact = getCashImpact(tx);
      cashBalance = cashBalance.plus(impact);
    }
  }

  return cashBalance;
}

/**
 * Get cash balance history over a date range
 *
 * Returns daily cash balance snapshots, useful for charting cash over time.
 *
 * @param portfolioId - Portfolio to analyze
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Array of date/balance pairs
 */
export async function getCashBalanceHistory(
  portfolioId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; balance: Decimal }>> {
  // Get all transactions for portfolio
  const transactions = await db.getTransactionsByPortfolio(portfolioId);

  // Get initial cash balance
  const cashAccount = await getCashAccount(portfolioId);
  const currentBalance = cashAccount?.balance || new Decimal(0);

  // Build daily snapshots
  const history: Array<{ date: Date; balance: Decimal }> = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const balance = calculateCashBalanceAtDate(
      transactions,
      currentDate,
      new Decimal(0) // Always start from zero and replay all transactions
    );

    history.push({
      date: new Date(currentDate),
      balance,
    });

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return history;
}

/**
 * Update cash account balance after a transaction
 *
 * This is a convenience function to update the cash account in the database
 * after a transaction is added/edited/deleted.
 *
 * @param portfolioId - Portfolio to update
 * @param currency - Currency of cash account (default: 'USD')
 */
export async function updateCashAccountBalance(
  portfolioId: string,
  currency: string = 'USD'
): Promise<void> {
  // Get all transactions
  const transactions = await db.getTransactionsByPortfolio(portfolioId);

  // Calculate current balance
  const balance = calculateCashBalanceAtDate(
    transactions,
    new Date(),
    new Decimal(0)
  );

  // Update or create cash account
  await updateCashBalance(portfolioId, currency, balance);
}
