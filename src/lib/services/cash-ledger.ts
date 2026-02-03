/**
 * Cash Ledger Service
 *
 * Tracks cash movements over time by analyzing all cash-affecting transactions.
 * This service is critical for accurate net worth calculations that include:
 * - Dividends and interest income
 * - Trading fees and taxes
 * - Buy and sell transactions
 * - Deposits and withdrawals
 *
 * KNOWN LIMITATION: Cash accounts are not yet persisted to the database.
 * Cash balances are calculated on-demand by replaying all transactions.
 * This ensures accuracy but may have performance implications for portfolios
 * with thousands of transactions. A future enhancement will add a cashAccounts
 * table to store current balances for faster access.
 *
 * @see docs/implementation/014-net-worth-cash-ledger-implementation.md
 */

import { Decimal } from 'decimal.js';
import { Transaction, TransactionType } from '@/types/transaction';
import { db } from '@/lib/db/schema';
import { logger } from '@/lib/utils/logger';

/**
 * FUTURE ENHANCEMENT: Cash Account Persistence
 *
 * Currently, cash balances are calculated on-demand by replaying all transactions.
 * A future enhancement (schema v5) will add a cashAccounts table for better performance:
 *
 * Proposed schema:
 * - Add cashAccounts table with fields: id, portfolioId, currency, balance, updatedAt
 * - Implement getCashAccount() to read from database
 * - Implement updateCashBalance() to persist balances
 * - Add triggers/hooks to update cash balance on transaction add/edit/delete
 *
 * Benefits:
 * - Faster access to current cash balance (no transaction replay)
 * - Support for multiple currencies per portfolio
 * - Persistent cash account visible in holdings
 */

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
      // Cash out: Cost of shares + fees
      return quantity.mul(price).plus(fees).neg();

    case 'rsu_vest':
      // RSUs vest with no cash outlay - shares appear in account
      // Taxes withheld via share sales, not cash deduction
      return new Decimal(0);

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

    case 'liability_payment':
      // Cash out: Liability payment (principal + interest)
      // Payment amount stored in price field
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
      logger.warn(
        `Unknown transaction type: ${type}, assuming no cash impact`
      );
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
    'liability_payment',
    // Note: rsu_vest is NOT included because RSUs vest with no cash outlay
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

  // Filter to cash-affecting transactions and sort chronologically
  const sortedTransactions = transactions
    .filter((tx) => affectsCash(tx.type))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Build daily snapshots with incremental calculation (O(n) instead of O(n²))
  const history: Array<{ date: Date; balance: Decimal }> = [];
  let balance = new Decimal(0);
  let txIndex = 0;

  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    // Add all transactions that occurred on or before currentDate
    while (
      txIndex < sortedTransactions.length &&
      sortedTransactions[txIndex].date <= currentDate
    ) {
      const impact = getCashImpact(sortedTransactions[txIndex]);
      balance = balance.plus(impact);
      txIndex++;
    }

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
 * Get current cash balance for a portfolio
 *
 * Calculates the current cash balance by replaying all cash-affecting transactions.
 * This is a convenience function for getting the current balance without specifying
 * a target date.
 *
 * @param portfolioId - Portfolio to calculate balance for
 * @returns Current cash balance
 */
export async function getCurrentCashBalance(
  portfolioId: string
): Promise<Decimal> {
  const transactions = await db.getTransactionsByPortfolio(portfolioId);
  return calculateCashBalanceAtDate(transactions, new Date(), new Decimal(0));
}
