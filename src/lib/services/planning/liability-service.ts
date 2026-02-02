/**
 * Liability Service
 *
 * Manages liabilities (mortgages, loans) and calculates historical balances
 * based on payment schedules. This enables accurate net worth tracking over time.
 */

import { Decimal } from 'decimal.js';
import { Liability } from '@/types/planning';
import { db, LiabilityPayment } from '@/lib/db/schema';

/**
 * Calculate liability balance at a specific date using payment history
 *
 * This function works backward from the target date, subtracting principal
 * payments that occurred after the target date from the current balance.
 *
 * Algorithm:
 * 1. Start with current liability balance
 * 2. Find all payments AFTER target date
 * 3. Add back principal paid after target date (reverse the payments)
 * 4. Result = balance at target date
 *
 * @param liability - Liability to calculate balance for
 * @param payments - All payment records for this liability (sorted by date)
 * @param targetDate - Date to calculate balance for
 * @returns Balance at the target date
 */
export function calculateLiabilityBalanceAtDate(
  liability: Liability,
  payments: LiabilityPayment[],
  targetDate: Date
): Decimal {
  // Start with current balance
  let balance = new Decimal(liability.balance);

  // If no payments recorded, return current balance
  if (payments.length === 0) {
    return balance;
  }

  // Find payments that occurred AFTER target date
  // We need to "undo" these payments to get historical balance
  const futurePayments = payments.filter(
    (p) => new Date(p.date).getTime() > targetDate.getTime()
  );

  // Add back principal paid after target date
  for (const payment of futurePayments) {
    // principalPaid is stored as string for Decimal precision
    balance = balance.plus(new Decimal(payment.principalPaid));
  }

  return balance;
}

/**
 * Get liability balance history over a date range
 *
 * Useful for charting debt paydown over time.
 *
 * @param liabilityId - Liability to analyze
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @returns Array of date/balance pairs
 */
export async function getLiabilityBalanceHistory(
  liabilityId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ date: Date; balance: Decimal }>> {
  // Get liability and payment history
  const liability = await db.getLiability(liabilityId);
  if (!liability) {
    throw new Error(`Liability not found: ${liabilityId}`);
  }

  const payments = await db.getLiabilityPayments(liabilityId);

  // Build daily or payment-event snapshots
  const history: Array<{ date: Date; balance: Decimal }> = [];

  // If no payments, just return current balance for all dates
  if (payments.length === 0) {
    history.push({
      date: new Date(startDate),
      balance: new Decimal(liability.balance),
    });
    history.push({
      date: new Date(endDate),
      balance: new Decimal(liability.balance),
    });
    return history;
  }

  // Create snapshots at each payment date within range
  const relevantPayments = payments.filter(
    (p) => new Date(p.date) >= startDate && new Date(p.date) <= endDate
  );

  // Add start date snapshot
  const startBalance = calculateLiabilityBalanceAtDate(
    liability,
    payments,
    startDate
  );
  history.push({ date: new Date(startDate), balance: startBalance });

  // Add snapshot for each payment
  for (const payment of relevantPayments) {
    history.push({
      date: new Date(payment.date),
      balance: new Decimal(payment.remainingBalance),
    });
  }

  // Add end date snapshot if not already included
  const lastHistoryDate = history[history.length - 1]?.date;
  if (!lastHistoryDate || lastHistoryDate < endDate) {
    const endBalance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      endDate
    );
    history.push({ date: new Date(endDate), balance: endBalance });
  }

  return history;
}

/**
 * Calculate total liabilities for a portfolio at a specific date
 *
 * Aggregates all liability balances at the target date.
 *
 * @param portfolioId - Portfolio to calculate for
 * @param targetDate - Date to calculate balance for
 * @returns Total liability balance at date
 */
export async function getTotalLiabilitiesAtDate(
  portfolioId: string,
  targetDate: Date
): Promise<Decimal> {
  const liabilities = await db.getLiabilitiesByPortfolio(portfolioId);

  let totalLiabilities = new Decimal(0);

  for (const liability of liabilities) {
    const payments = await db.getLiabilityPayments(liability.id);
    const balanceAtDate = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );
    totalLiabilities = totalLiabilities.plus(balanceAtDate);
  }

  return totalLiabilities;
}

/**
 * Record a liability payment and update payment schedule
 *
 * @param liabilityId - Liability to record payment for
 * @param paymentDate - Date of payment
 * @param principalPaid - Principal portion of payment
 * @param interestPaid - Interest portion of payment
 * @returns Payment ID
 */
export async function recordLiabilityPayment(
  liabilityId: string,
  paymentDate: Date,
  principalPaid: Decimal,
  interestPaid: Decimal
): Promise<string> {
  // Get current liability
  const liability = await db.getLiability(liabilityId);
  if (!liability) {
    throw new Error(`Liability not found: ${liabilityId}`);
  }

  // Calculate new balance
  const newBalance = new Decimal(liability.balance).minus(principalPaid);

  // Record payment
  const paymentId = await db.addLiabilityPayment(
    liabilityId,
    paymentDate,
    principalPaid,
    interestPaid,
    newBalance
  );

  // Update liability balance
  await db.updateLiability(liabilityId, {
    balance: newBalance.toNumber(),
  });

  return paymentId;
}
