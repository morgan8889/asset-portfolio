/**
 * Liability Service Unit Tests
 *
 * Tests historical liability balance calculations including:
 * - Balance calculation from payment schedules
 * - Historical balance reconstruction
 * - Payment recording and tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Decimal } from 'decimal.js';
import { calculateLiabilityBalanceAtDate } from '../liability-service';
import { Liability } from '@/types/planning';
import { LiabilityPayment } from '@/lib/db/schema';

// Helper to create test liability
function createLiability(
  balance: number,
  overrides?: Partial<Liability>
): Liability {
  return {
    id: crypto.randomUUID(),
    portfolioId: 'test-portfolio',
    name: 'Test Mortgage',
    balance,
    interestRate: 0.045, // 4.5%
    payment: 1000,
    startDate: '2020-01-01',
    termMonths: 360,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create test payment
function createPayment(
  liabilityId: string,
  date: Date,
  principalPaid: number,
  interestPaid: number,
  remainingBalance: number
): LiabilityPayment {
  return {
    // id is auto-incremented number in Dexie, omit for test creation
    liabilityId,
    date,
    principalPaid: principalPaid.toString(),
    interestPaid: interestPaid.toString(),
    remainingBalance: remainingBalance.toString(),
    createdAt: new Date(),
  };
}

describe('calculateLiabilityBalanceAtDate', () => {
  it('should return current balance when no payments exist', () => {
    const liability = createLiability(100000);
    const payments: LiabilityPayment[] = [];
    const targetDate = new Date('2024-01-01');

    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    expect(balance.toNumber()).toBe(100000);
  });

  it('should return current balance for future date with no future payments', () => {
    const liability = createLiability(100000);
    const payments = [
      createPayment(liability.id, new Date('2023-01-01'), 500, 450, 99500),
      createPayment(liability.id, new Date('2023-02-01'), 505, 445, 98995),
    ];
    const targetDate = new Date('2024-01-01'); // After all payments

    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    // Should be current balance since no payments after target date
    expect(balance.toNumber()).toBe(100000);
  });

  it('should add back principal from payments after target date', () => {
    const liability = createLiability(95000); // Current balance after payments
    const payments = [
      createPayment(liability.id, new Date('2024-01-01'), 500, 450, 99500),
      createPayment(liability.id, new Date('2024-02-01'), 505, 445, 98995),
      createPayment(liability.id, new Date('2024-03-01'), 510, 440, 98485),
      createPayment(liability.id, new Date('2024-04-01'), 515, 435, 97970),
      createPayment(liability.id, new Date('2024-05-01'), 520, 430, 97450),
      createPayment(liability.id, new Date('2024-06-01'), 525, 425, 96925),
      createPayment(liability.id, new Date('2024-07-01'), 530, 420, 96395),
      createPayment(liability.id, new Date('2024-08-01'), 535, 415, 95860),
      createPayment(liability.id, new Date('2024-09-01'), 540, 410, 95320),
      createPayment(liability.id, new Date('2024-10-01'), 545, 405, 94775),
      createPayment(liability.id, new Date('2024-11-01'), 550, 400, 94225),
      createPayment(liability.id, new Date('2024-12-01'), 555, 395, 93670),
    ];

    // Calculate balance as of March 15, 2024
    const targetDate = new Date('2024-03-15');
    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    // Current: 95000
    // Payments after March 15: Apr-Dec (9 payments)
    // Principal to add back: 515 + 520 + 525 + 530 + 535 + 540 + 545 + 550 + 555 = 4815
    // Expected: 95000 + 4815 = 99815
    // But wait, we also need to add back the March payment if target date is after it
    // Actually, March 1 is BEFORE March 15, so we DON'T add it back
    // Expected: 95000 + (Apr-Dec payments) = 95000 + 4815 = 99815

    expect(balance.toNumber()).toBe(99815);
  });

  it('should calculate balance at exact payment date', () => {
    const liability = createLiability(95000);
    const paymentDate = new Date('2024-06-01');
    const payments = [
      createPayment(liability.id, new Date('2024-01-01'), 500, 450, 99500),
      createPayment(liability.id, paymentDate, 525, 425, 96925),
      createPayment(liability.id, new Date('2024-12-01'), 555, 395, 93670),
    ];

    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      paymentDate
    );

    // Current: 95000
    // Payment after June 1: Dec (555)
    // Expected: 95000 + 555 = 95555
    expect(balance.toNumber()).toBe(95555);
  });

  it('should handle balance before any payments', () => {
    const liability = createLiability(90000);
    const payments = [
      createPayment(liability.id, new Date('2024-02-01'), 1000, 500, 99000),
      createPayment(liability.id, new Date('2024-03-01'), 1005, 495, 97995),
    ];

    const targetDate = new Date('2024-01-01'); // Before all payments

    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    // Current: 90000
    // All payments after Jan 1: 1000 + 1005 = 2005
    // Expected: 90000 + 2005 = 92005
    expect(balance.toNumber()).toBe(92005);
  });

  it('should handle multiple years of payments', () => {
    const liability = createLiability(80000); // Balance after 20 years
    const payments: LiabilityPayment[] = [];

    // Create 12 monthly payments for 2023
    for (let month = 1; month <= 12; month++) {
      const principal = 800 + month * 5; // Increasing principal
      const interest = 450 - month * 2; // Decreasing interest
      const remaining = 90000 - (800 * month + ((month * (month + 1)) / 2) * 5);

      payments.push(
        createPayment(
          liability.id,
          new Date(`2023-${month.toString().padStart(2, '0')}-01`),
          principal,
          interest,
          remaining
        )
      );
    }

    // Calculate balance at mid-year 2023
    const targetDate = new Date('2023-06-15');
    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    // Should add back principal from July-December
    // Jul: 835, Aug: 840, Sep: 845, Oct: 850, Nov: 855, Dec: 860
    // Total: 5085
    const expectedBalance = 80000 + 5085;
    expect(balance.toNumber()).toBe(expectedBalance);
  });

  it('should handle very small principal payments', () => {
    const liability = createLiability(100000);
    const payments = [
      createPayment(liability.id, new Date('2024-01-01'), 0.01, 500, 99999.99),
      createPayment(liability.id, new Date('2024-02-01'), 0.01, 500, 99999.98),
    ];

    const targetDate = new Date('2024-01-15');
    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    // Current: 100000
    // Payment after Jan 15: Feb (0.01)
    // Expected: 100000.01
    expect(balance.toNumber()).toBeCloseTo(100000.01, 2);
  });

  it('should handle large principal payments (refinance/extra payment)', () => {
    const liability = createLiability(50000);
    const payments = [
      createPayment(liability.id, new Date('2024-01-01'), 500, 450, 99500),
      createPayment(
        liability.id,
        new Date('2024-02-01'),
        20000, // Large extra payment
        400,
        79500
      ),
      createPayment(liability.id, new Date('2024-03-01'), 500, 300, 79000),
    ];

    const targetDate = new Date('2024-02-15');
    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    // Current: 50000
    // Payment after Feb 15: Mar (500)
    // Expected: 50000 + 500 = 50500
    expect(balance.toNumber()).toBe(50500);
  });

  it('should maintain Decimal precision', () => {
    const liability = createLiability(95432.17);
    const payments = [
      createPayment(
        liability.id,
        new Date('2024-01-01'),
        523.45,
        476.55,
        99476.55
      ),
      createPayment(
        liability.id,
        new Date('2024-02-01'),
        525.12,
        474.88,
        98951.43
      ),
      createPayment(
        liability.id,
        new Date('2024-03-01'),
        526.79,
        473.21,
        98424.64
      ),
    ];

    const targetDate = new Date('2024-01-15');
    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    // Current: 95432.17
    // Payments after Jan 15: Feb (525.12) + Mar (526.79) = 1051.91
    // Expected: 95432.17 + 1051.91 = 96484.08
    expect(balance.toNumber()).toBeCloseTo(96484.08, 2);
  });

  it('should handle empty payment array efficiently', () => {
    const liability = createLiability(100000);
    const payments: LiabilityPayment[] = [];
    const targetDate = new Date('2020-01-01'); // Far in the past

    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    expect(balance.toNumber()).toBe(100000);
  });

  it('should handle payment on target date boundary', () => {
    const targetDate = new Date('2024-03-01T00:00:00');
    const liability = createLiability(95000);
    const payments = [
      createPayment(liability.id, new Date('2024-02-01'), 500, 450, 99500),
      createPayment(
        liability.id,
        targetDate, // Exact match
        505,
        445,
        98995
      ),
      createPayment(liability.id, new Date('2024-04-01'), 510, 440, 98485),
    ];

    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    // Current: 95000
    // Payment after March 1: April (510)
    // March payment is NOT after target date (it's on the date)
    // Expected: 95000 + 510 = 95510
    expect(balance.toNumber()).toBe(95510);
  });

  it('should correctly reconstruct initial loan amount', () => {
    // Scenario: Started with $100k loan, made payments, now at $95k
    const currentBalance = 95000;
    const liability = createLiability(currentBalance);

    const payments = [
      createPayment(liability.id, new Date('2024-01-01'), 500, 450, 99500),
      createPayment(liability.id, new Date('2024-02-01'), 505, 445, 98995),
      createPayment(liability.id, new Date('2024-03-01'), 510, 440, 98485),
      createPayment(liability.id, new Date('2024-04-01'), 515, 435, 97970),
      createPayment(liability.id, new Date('2024-05-01'), 520, 430, 97450),
      createPayment(liability.id, new Date('2024-06-01'), 525, 425, 96925),
      createPayment(liability.id, new Date('2024-07-01'), 530, 420, 96395),
      createPayment(liability.id, new Date('2024-08-01'), 535, 415, 95860),
      createPayment(liability.id, new Date('2024-09-01'), 540, 410, 95320),
      createPayment(liability.id, new Date('2024-10-01'), 545, 405, 94775),
    ];

    // Calculate balance before any payments
    const targetDate = new Date('2023-12-31');
    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    // Sum of all principal payments: 500+505+510+515+520+525+530+535+540+545 = 5225
    // Expected initial balance: 95000 + 5225 = 100225
    expect(balance.toNumber()).toBe(100225);
  });
});

describe('calculateLiabilityBalanceAtDate - Edge Cases', () => {
  it('should handle liability with zero balance', () => {
    const liability = createLiability(0); // Paid off
    const payments = [
      createPayment(liability.id, new Date('2023-01-01'), 500, 450, 99500),
      createPayment(liability.id, new Date('2024-01-01'), 99500, 0, 0),
    ];

    const targetDate = new Date('2023-06-15');
    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    // Add back the final payment
    expect(balance.toNumber()).toBe(99500);
  });

  it('should handle negative balance (overpayment scenario)', () => {
    const liability = createLiability(-100); // Overpaid
    const payments = [
      createPayment(liability.id, new Date('2024-01-01'), 100, 0, 0),
      createPayment(
        liability.id,
        new Date('2024-02-01'),
        100, // Overpayment
        0,
        -100
      ),
    ];

    const targetDate = new Date('2024-01-15');
    const balance = calculateLiabilityBalanceAtDate(
      liability,
      payments,
      targetDate
    );

    // Current: -100
    // Payment after Jan 15: Feb (100)
    // Expected: -100 + 100 = 0
    expect(balance.toNumber()).toBe(0);
  });
});
