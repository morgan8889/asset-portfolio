/**
 * Cash Ledger Service Unit Tests
 *
 * Tests cash tracking functionality including:
 * - Transaction cash impact calculations
 * - Historical cash balance reconstruction
 * - Buy/sell, dividend, fee, deposit/withdrawal scenarios
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  getCashImpact,
  affectsCash,
  calculateCashBalanceAtDate,
} from '../cash-ledger';
import { Transaction, TransactionType } from '@/types/transaction';

// Helper to create test transaction
function createTransaction(
  type: TransactionType,
  price: number,
  quantity: number = 1,
  fees: number = 0,
  date: Date = new Date('2024-01-01')
): Transaction {
  return {
    id: crypto.randomUUID(),
    portfolioId: 'test-portfolio',
    assetId: 'test-asset',
    type,
    date,
    quantity: new Decimal(quantity),
    price: new Decimal(price),
    totalAmount: new Decimal(price).mul(quantity),
    fees: new Decimal(fees),
    currency: 'USD',
  };
}

describe('getCashImpact', () => {
  describe('Buy transactions', () => {
    it('should calculate negative cash impact for buy', () => {
      const tx = createTransaction('buy', 100, 10, 5); // 10 shares @ $100 + $5 fee
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(-1005); // -(10 * 100 + 5)
    });

    it('should handle buy with zero fees', () => {
      const tx = createTransaction('buy', 50, 5, 0);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(-250); // -(5 * 50)
    });

    it('should handle fractional shares', () => {
      const tx = createTransaction('buy', 100, 1.5, 1);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(-151); // -(1.5 * 100 + 1)
    });
  });

  describe('Sell transactions', () => {
    it('should calculate positive cash impact for sell', () => {
      const tx = createTransaction('sell', 120, 10, 5); // 10 shares @ $120 - $5 fee
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(1195); // 10 * 120 - 5
    });

    it('should handle sell with zero fees', () => {
      const tx = createTransaction('sell', 80, 5, 0);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(400); // 5 * 80
    });

    it('should handle partial sell', () => {
      const tx = createTransaction('sell', 150, 2.5, 2);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(373); // 2.5 * 150 - 2
    });
  });

  describe('Dividend and interest', () => {
    it('should treat dividend amount as positive cash', () => {
      const tx = createTransaction('dividend', 100); // $100 dividend (price = amount)
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(100);
    });

    it('should treat interest amount as positive cash', () => {
      const tx = createTransaction('interest', 50);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(50);
    });

    it('should handle fractional dividends', () => {
      const tx = createTransaction('dividend', 12.75);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(12.75);
    });
  });

  describe('Fees and taxes', () => {
    it('should calculate negative cash impact for fee', () => {
      const tx = createTransaction('fee', 25);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(-25);
    });

    it('should calculate negative cash impact for tax', () => {
      const tx = createTransaction('tax', 150);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(-150);
    });
  });

  describe('Deposits and withdrawals', () => {
    it('should calculate positive cash impact for deposit', () => {
      const tx = createTransaction('deposit', 10000);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(10000);
    });

    it('should calculate negative cash impact for withdrawal', () => {
      const tx = createTransaction('withdrawal', 5000);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(-5000);
    });
  });

  describe('ESPP and RSU transactions', () => {
    it('should calculate negative cash impact for ESPP purchase', () => {
      const tx = createTransaction('espp_purchase', 85, 100, 10); // 100 shares @ $85 + $10 fee
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(-8510); // -(100 * 85 + 10)
    });

    it('should calculate negative cash impact for RSU vest', () => {
      // RSU typically has shares withheld for taxes, but net shares are what's recorded
      const tx = createTransaction('rsu_vest', 100, 78, 0); // 78 net shares @ $100 FMV
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(-7800); // -(78 * 100)
    });
  });

  describe('No cash impact transactions', () => {
    it('should return zero for transfer_in', () => {
      const tx = createTransaction('transfer_in', 100, 10);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(0);
    });

    it('should return zero for transfer_out', () => {
      const tx = createTransaction('transfer_out', 100, 10);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(0);
    });

    it('should return zero for split', () => {
      const tx = createTransaction('split', 2, 10); // 2:1 split
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(0);
    });

    it('should return zero for reinvestment', () => {
      const tx = createTransaction('reinvestment', 100, 1);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(0);
    });

    it('should return zero for spinoff', () => {
      const tx = createTransaction('spinoff', 50, 5);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(0);
    });

    it('should return zero for merger', () => {
      const tx = createTransaction('merger', 120, 10);
      const impact = getCashImpact(tx);

      expect(impact.toNumber()).toBe(0);
    });
  });
});

describe('affectsCash', () => {
  it('should return true for cash-affecting transaction types', () => {
    const cashTypes: TransactionType[] = [
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

    cashTypes.forEach((type) => {
      expect(affectsCash(type)).toBe(true);
    });
  });

  it('should return false for non-cash-affecting transaction types', () => {
    const nonCashTypes: TransactionType[] = [
      'transfer_in',
      'transfer_out',
      'split',
      'spinoff',
      'merger',
      'reinvestment',
    ];

    nonCashTypes.forEach((type) => {
      expect(affectsCash(type)).toBe(false);
    });
  });
});

describe('calculateCashBalanceAtDate', () => {
  it('should start with zero balance by default', () => {
    const transactions: Transaction[] = [];
    const balance = calculateCashBalanceAtDate(
      transactions,
      new Date('2024-01-01')
    );

    expect(balance.toNumber()).toBe(0);
  });

  it('should use provided initial balance', () => {
    const transactions: Transaction[] = [];
    const initialBalance = new Decimal(5000);
    const balance = calculateCashBalanceAtDate(
      transactions,
      new Date('2024-01-01'),
      initialBalance
    );

    expect(balance.toNumber()).toBe(5000);
  });

  it('should accumulate dividends correctly', () => {
    const transactions = [
      createTransaction('dividend', 100, 1, 0, new Date('2024-01-01')),
      createTransaction('dividend', 100, 1, 0, new Date('2024-02-01')),
      createTransaction('dividend', 100, 1, 0, new Date('2024-03-01')),
    ];

    const balance = calculateCashBalanceAtDate(
      transactions,
      new Date('2024-03-15')
    );

    expect(balance.toNumber()).toBe(300); // 3 × $100
  });

  it('should deduct fees correctly', () => {
    const transactions = [
      createTransaction('deposit', 1000, 1, 0, new Date('2024-01-01')),
      createTransaction('fee', 50, 1, 0, new Date('2024-01-15')),
      createTransaction('fee', 25, 1, 0, new Date('2024-02-01')),
    ];

    const balance = calculateCashBalanceAtDate(
      transactions,
      new Date('2024-02-15')
    );

    expect(balance.toNumber()).toBe(925); // 1000 - 50 - 25
  });

  it('should handle buy/sell transactions correctly', () => {
    const transactions = [
      createTransaction('deposit', 10000, 1, 0, new Date('2024-01-01')),
      createTransaction('buy', 100, 10, 5, new Date('2024-01-15')), // -1005
      createTransaction('sell', 120, 10, 5, new Date('2024-02-15')), // +1195
    ];

    const balance = calculateCashBalanceAtDate(
      transactions,
      new Date('2024-03-01')
    );

    // Start: $10,000
    // Buy: -$1,005 (10 × 100 + 5 fee)
    // Sell: +$1,195 (10 × 120 - 5 fee)
    // Final: $10,190
    expect(balance.toNumber()).toBe(10190);
  });

  it('should only include transactions up to target date', () => {
    const transactions = [
      createTransaction('deposit', 1000, 1, 0, new Date('2024-01-01')),
      createTransaction('dividend', 100, 1, 0, new Date('2024-02-01')),
      createTransaction('dividend', 100, 1, 0, new Date('2024-03-01')), // After target
    ];

    const balance = calculateCashBalanceAtDate(
      transactions,
      new Date('2024-02-15')
    );

    expect(balance.toNumber()).toBe(1100); // 1000 + 100 (excludes 3rd dividend)
  });

  it('should handle complex scenario with multiple transaction types', () => {
    const transactions = [
      // Initial deposit
      createTransaction('deposit', 10000, 1, 0, new Date('2024-01-01')),

      // Buy shares
      createTransaction('buy', 50, 100, 10, new Date('2024-01-15')), // -5010

      // Receive dividend
      createTransaction('dividend', 200, 1, 0, new Date('2024-02-01')), // +200

      // Pay fee
      createTransaction('fee', 25, 1, 0, new Date('2024-02-15')), // -25

      // Sell some shares
      createTransaction('sell', 55, 50, 8, new Date('2024-03-01')), // +2742

      // Pay taxes
      createTransaction('tax', 100, 1, 0, new Date('2024-03-15')), // -100

      // Withdraw cash
      createTransaction('withdrawal', 1000, 1, 0, new Date('2024-04-01')), // -1000
    ];

    const balance = calculateCashBalanceAtDate(
      transactions,
      new Date('2024-04-15')
    );

    // $10,000 - $5,010 + $200 - $25 + $2,742 - $100 - $1,000 = $6,807
    expect(balance.toNumber()).toBe(6807);
  });

  it('should handle negative balance (margin/overdraft)', () => {
    const transactions = [
      createTransaction('deposit', 1000, 1, 0, new Date('2024-01-01')),
      createTransaction('buy', 100, 50, 0, new Date('2024-01-15')), // -5000
    ];

    const balance = calculateCashBalanceAtDate(
      transactions,
      new Date('2024-02-01')
    );

    expect(balance.toNumber()).toBe(-4000); // 1000 - 5000
  });

  it('should ignore non-cash-affecting transactions', () => {
    const transactions = [
      createTransaction('deposit', 1000, 1, 0, new Date('2024-01-01')),
      createTransaction('transfer_in', 100, 10, 0, new Date('2024-01-15')),
      createTransaction('split', 2, 10, 0, new Date('2024-02-01')),
      createTransaction('dividend', 50, 1, 0, new Date('2024-02-15')),
    ];

    const balance = calculateCashBalanceAtDate(
      transactions,
      new Date('2024-03-01')
    );

    expect(balance.toNumber()).toBe(1050); // 1000 + 50 (ignores transfer and split)
  });

  it('should handle same-day transactions in chronological order', () => {
    const date = new Date('2024-01-15');
    const transactions = [
      createTransaction('deposit', 5000, 1, 0, date),
      createTransaction('buy', 100, 10, 0, date),
      createTransaction('dividend', 50, 1, 0, date),
    ];

    const balance = calculateCashBalanceAtDate(transactions, date);

    // 5000 - 1000 + 50 = 4050
    expect(balance.toNumber()).toBe(4050);
  });

  it('should maintain precision with Decimal arithmetic', () => {
    const transactions = [
      createTransaction('deposit', 10000.123, 1, 0, new Date('2024-01-01')),
      createTransaction('dividend', 123.456, 1, 0, new Date('2024-02-01')),
      createTransaction('fee', 23.789, 1, 0, new Date('2024-03-01')),
    ];

    const balance = calculateCashBalanceAtDate(
      transactions,
      new Date('2024-04-01')
    );

    // 10000.123 + 123.456 - 23.789 = 10099.79
    expect(balance.toNumber()).toBeCloseTo(10099.79, 2);
  });

  it('should handle empty transaction list at future date', () => {
    const transactions: Transaction[] = [];
    const balance = calculateCashBalanceAtDate(
      transactions,
      new Date('2030-01-01')
    );

    expect(balance.toNumber()).toBe(0);
  });

  it('should calculate balance at exact transaction date', () => {
    const txDate = new Date('2024-01-15');
    const transactions = [
      createTransaction('deposit', 1000, 1, 0, new Date('2024-01-01')),
      createTransaction('dividend', 100, 1, 0, txDate),
    ];

    const balance = calculateCashBalanceAtDate(transactions, txDate);

    expect(balance.toNumber()).toBe(1100);
  });
});
