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
 * KNOWN LIMITATION: This algorithm assumes complete payment history exists.
 * If the liability existed before the first recorded payment, historical
 * balances before that first payment will be INCORRECT. The function will
 * return the current balance without adjustment, which does not account for
 * payments that occurred before the first recorded payment.
 *
 * Example issue:
 * - Mortgage originated in 2020 at $300,000
 * - First recorded payment in 2024, current balance $250,000
 * - Query for balance in 2022 will incorrectly return $250,000
 * - Actual 2022 balance was likely ~$280,000
 *
 * Workaround: Ensure payment history is recorded from the liability start date,
 * or use extrapolation based on monthly payment amount and interest rate.
 *
 * @param liability - Liability to calculate balance for
 * @param payments - All payment records for this liability (sorted by date)
 * @param targetDate - Date to calculate balance for
 * @returns Balance at the target date
 * @throws Error if targetDate is before the liability start date
 * @emits console.warn if targetDate is before first recorded payment
 */
export function calculateLiabilityBalanceAtDate(
  liability: Liability,
  payments: LiabilityPayment[],
  targetDate: Date
): Decimal {
  // Validate: target date should not be before liability start date
  const startDate = new Date(liability.startDate);
  if (targetDate < startDate) {
    throw new Error(
      `Cannot calculate liability balance before start date. ` +
      `Target: ${targetDate.toISOString()}, Start: ${startDate.toISOString()}`
    );
  }

  // Start with current balance
  let balance = new Decimal(liability.balance);

  // If no payments recorded, warn about potential inaccuracy
  if (payments.length === 0) {
    if (targetDate < new Date()) {
      console.warn(
        `No payment history available for liability ${liability.id}. ` +
        `Historical balance calculation may be inaccurate. ` +
        `Returning current balance: ${balance.toString()}`
      );
    }
    return balance;
  }

  // Check if target date is before first recorded payment
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const firstPaymentDate = new Date(sortedPayments[0].date);

  if (targetDate < firstPaymentDate) {
    console.warn(
      `Target date ${targetDate.toISOString()} is before first recorded payment ` +
      `${firstPaymentDate.toISOString()} for liability ${liability.id}. ` +
      `Historical balance will be inaccurate. Consider recording payment history ` +
      `from the liability start date or implementing payment extrapolation.`
    );
    // Return current balance + all recorded principal payments
    // This is still inaccurate but at least accounts for known payments
    let estimatedBalance = balance;
    for (const payment of sortedPayments) {
      estimatedBalance = estimatedBalance.plus(new Decimal(payment.principalPaid));
    }
    return estimatedBalance;
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

  // Batch load all payments to avoid N+1 query pattern
  const allPayments = await Promise.all(
    liabilities.map((l) => db.getLiabilityPayments(l.id))
  );

  let totalLiabilities = new Decimal(0);

  for (let i = 0; i < liabilities.length; i++) {
    const liability = liabilities[i];
    const payments = allPayments[i];
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

  // Validation: Check for negative values
  if (principalPaid.isNegative()) {
    throw new Error('Principal paid cannot be negative');
  }
  if (interestPaid.isNegative()) {
    throw new Error('Interest paid cannot be negative');
  }

  // Validation: Ensure at least one payment component is positive
  if (principalPaid.isZero() && interestPaid.isZero()) {
    throw new Error('Payment must include principal or interest amount');
  }

  // Validation: Principal cannot exceed current balance
  const currentBalance = new Decimal(liability.balance);
  if (principalPaid.greaterThan(currentBalance)) {
    throw new Error(
      `Principal paid ($${principalPaid.toString()}) exceeds current balance ($${currentBalance.toString()})`
    );
  }

  // Validation: Payment date cannot be before liability start date
  const startDate = new Date(liability.startDate);
  if (paymentDate < startDate) {
    throw new Error(
      `Payment date (${paymentDate.toISOString()}) cannot be before liability start date (${startDate.toISOString()})`
    );
  }

  // Calculate new balance
  const newBalance = currentBalance.minus(principalPaid);

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
