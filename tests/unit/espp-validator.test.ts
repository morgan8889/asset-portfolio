import { describe, test, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  isDisqualifyingDisposition,
  checkDispositionStatus,
  getDispositionReason,
  getTaxImplicationMessage,
} from '@/lib/services/espp-validator';

describe('isDisqualifyingDisposition', () => {
  const grant = new Date('2023-01-01');
  const purchase = new Date('2023-07-01');

  test('same-day sale is disqualifying', () => {
    expect(isDisqualifyingDisposition(grant, purchase, purchase)).toBe(true);
  });

  test('sale before 1 year from purchase is disqualifying', () => {
    const sell = new Date('2024-06-30'); // 364 days after purchase
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(true);
  });

  test('sale exactly 1 year from purchase is disqualifying', () => {
    const sell = new Date('2024-07-01'); // Exactly 1 year
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(true);
  });

  test('sale 1 day after 1 year from purchase, but before 2 years from grant', () => {
    const sell = new Date('2024-07-02'); // 366 days from purchase, but < 2 years from grant
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(true);
  });

  test('sale before 2 years from grant is disqualifying', () => {
    const sell = new Date('2024-12-31'); // > 1 year from purchase, but < 2 years from grant
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(true);
  });

  test('sale exactly 2 years from grant is disqualifying', () => {
    const sell = new Date('2025-01-01'); // Exactly 2 years
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(true);
  });

  test('sale after both requirements met is qualifying', () => {
    const sell = new Date('2025-01-02'); // > 2 years from grant, > 1 year from purchase
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(false);
  });

  test('throws error if grant date after purchase date', () => {
    const invalidGrant = new Date('2024-01-01');
    const invalidPurchase = new Date('2023-01-01');

    expect(() =>
      isDisqualifyingDisposition(invalidGrant, invalidPurchase, new Date('2025-01-01'))
    ).toThrow('Grant date must be before purchase date');
  });

  test('throws error if sell date before purchase date', () => {
    const invalidSell = new Date('2023-06-01');

    expect(() => isDisqualifyingDisposition(grant, purchase, invalidSell)).toThrow(
      'Sell date cannot be before purchase date'
    );
  });

  test('sale well after both requirements is qualifying', () => {
    const sell = new Date('2026-01-01'); // Way past both requirements
    expect(isDisqualifyingDisposition(grant, purchase, sell)).toBe(false);
  });

  test('edge case: grant and purchase on same day', () => {
    const sameDate = new Date('2023-01-01');

    // This should throw because grant must be before purchase
    expect(() =>
      isDisqualifyingDisposition(sameDate, sameDate, new Date('2024-01-01'))
    ).toThrow('Grant date must be before purchase date');
  });
});

describe('checkDispositionStatus', () => {
  test('returns correct threshold dates', () => {
    const grant = new Date('2023-06-15');
    const purchase = new Date('2023-12-15');
    const sell = new Date('2025-06-16');

    const check = checkDispositionStatus(grant, purchase, sell);

    expect(check.twoYearsFromGrant).toEqual(new Date('2025-06-15'));
    expect(check.oneYearFromPurchase).toEqual(new Date('2024-12-15'));
    expect(check.meetsGrantRequirement).toBe(true);
    expect(check.meetsPurchaseRequirement).toBe(true);
    expect(check.isQualifying).toBe(true);
  });

  test('identifies when only grant requirement fails', () => {
    const grant = new Date('2023-01-01');
    const purchase = new Date('2023-07-01');
    const sell = new Date('2024-12-31'); // > 1 year from purchase, < 2 years from grant

    const check = checkDispositionStatus(grant, purchase, sell);

    expect(check.meetsGrantRequirement).toBe(false);
    expect(check.meetsPurchaseRequirement).toBe(true);
    expect(check.isQualifying).toBe(false);
  });

  test('identifies when only purchase requirement fails', () => {
    const grant = new Date('2023-01-01');
    const purchase = new Date('2024-06-01');
    const sell = new Date('2025-02-01'); // > 2 years from grant, < 1 year from purchase

    const check = checkDispositionStatus(grant, purchase, sell);

    expect(check.meetsGrantRequirement).toBe(true);
    expect(check.meetsPurchaseRequirement).toBe(false);
    expect(check.isQualifying).toBe(false);
  });

  test('identifies when both requirements fail', () => {
    const grant = new Date('2023-01-01');
    const purchase = new Date('2023-07-01');
    const sell = new Date('2024-01-01'); // < 1 year from purchase, < 2 years from grant

    const check = checkDispositionStatus(grant, purchase, sell);

    expect(check.meetsGrantRequirement).toBe(false);
    expect(check.meetsPurchaseRequirement).toBe(false);
    expect(check.isQualifying).toBe(false);
  });

  test('handles leap year dates correctly', () => {
    const grant = new Date('2024-02-29');
    const purchase = new Date('2024-06-15');
    const sell = new Date('2026-03-02'); // After 2 years from Feb 29 (must be MORE than 2 years)

    const check = checkDispositionStatus(grant, purchase, sell);

    // 2 years from Feb 29, 2024 is Mar 1, 2026 (date-fns behavior when target year has no Feb 29)
    // Selling on Mar 2 is MORE than 2 years, so it meets the requirement
    expect(check.twoYearsFromGrant).toEqual(new Date('2026-03-01'));
    expect(check.meetsGrantRequirement).toBe(true);
  });
});

describe('getDispositionReason', () => {
  test('returns correct reason for each case', () => {
    const grant = new Date('2023-01-01');

    // Both fail
    let check = checkDispositionStatus(grant, new Date('2023-07-01'), new Date('2024-01-01'));
    expect(getDispositionReason(check)).toBe('both_requirements_not_met');

    // Only grant fails
    check = checkDispositionStatus(grant, new Date('2023-07-01'), new Date('2024-12-31'));
    expect(getDispositionReason(check)).toBe('sold_before_2yr_from_grant');

    // Only purchase fails
    check = checkDispositionStatus(grant, new Date('2024-06-01'), new Date('2025-02-01'));
    expect(getDispositionReason(check)).toBe('sold_before_1yr_from_purchase');

    // Qualifying
    check = checkDispositionStatus(grant, new Date('2023-07-01'), new Date('2025-07-02'));
    expect(getDispositionReason(check)).toBe('qualifying');
  });
});

describe('getTaxImplicationMessage', () => {
  test('generates correct message for disqualifying disposition (grant requirement fails)', () => {
    const grant = new Date('2023-01-01');
    const purchase = new Date('2023-07-01');
    const sell = new Date('2024-12-31');
    const bargainElement = new Decimal(12.5);

    const check = checkDispositionStatus(grant, purchase, sell);
    const message = getTaxImplicationMessage(check, bargainElement);

    expect(message).toContain('Disqualifying Disposition');
    expect(message).toContain('$12.50');
    expect(message).toContain('ordinary income');
    expect(message).toContain('2 years from grant');
    expect(message).toContain('2023-01-01');
    expect(message).toContain('2023-07-01');
  });

  test('generates correct message for disqualifying disposition (purchase requirement fails)', () => {
    const grant = new Date('2023-01-01');
    const purchase = new Date('2024-06-01');
    const sell = new Date('2025-02-01');
    const bargainElement = new Decimal(20);

    const check = checkDispositionStatus(grant, purchase, sell);
    const message = getTaxImplicationMessage(check, bargainElement);

    expect(message).toContain('Disqualifying Disposition');
    expect(message).toContain('$20.00');
    expect(message).toContain('1-year purchase requirement');
  });

  test('generates correct message for disqualifying disposition (both fail)', () => {
    const grant = new Date('2023-01-01');
    const purchase = new Date('2023-07-01');
    const sell = new Date('2024-01-01');
    const bargainElement = new Decimal(15);

    const check = checkDispositionStatus(grant, purchase, sell);
    const message = getTaxImplicationMessage(check, bargainElement);

    expect(message).toContain('Disqualifying Disposition');
    expect(message).toContain('both the 2-year grant requirement');
    expect(message).toContain('1-year purchase requirement');
  });

  test('generates correct message for qualifying disposition', () => {
    const grant = new Date('2023-01-01');
    const purchase = new Date('2023-07-01');
    const sell = new Date('2025-07-02');
    const bargainElement = new Decimal(15);

    const check = checkDispositionStatus(grant, purchase, sell);
    const message = getTaxImplicationMessage(check, bargainElement);

    expect(message).toContain('Qualifying Disposition');
    expect(message).toContain('Favorable tax treatment');
    expect(message).toContain('long-term capital gains');
  });

  test('formats bargain element correctly', () => {
    const check = checkDispositionStatus(
      new Date('2023-01-01'),
      new Date('2023-07-01'),
      new Date('2024-01-01')
    );

    const message1 = getTaxImplicationMessage(check, new Decimal(10.5));
    expect(message1).toContain('$10.50');

    const message2 = getTaxImplicationMessage(check, new Decimal(100));
    expect(message2).toContain('$100.00');

    const message3 = getTaxImplicationMessage(check, new Decimal(0.99));
    expect(message3).toContain('$0.99');
  });
});
