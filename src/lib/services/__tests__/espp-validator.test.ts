/**
 * ESPP Validator Service Tests
 *
 * Unit tests for ESPP transaction validation and disqualifying disposition detection.
 * Tests IRS Section 423 holding period requirements.
 */

import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import { addYears, addDays } from 'date-fns';
import {
  isDisqualifyingDisposition,
  checkDispositionStatus,
  getDispositionReason,
  getTaxImplicationMessage,
} from '../espp-validator';

describe('isDisqualifyingDisposition', () => {
  const grantDate = new Date('2023-01-01');
  const purchaseDate = new Date('2023-07-01'); // 6 months after grant

  describe('qualifying dispositions', () => {
    it('should return false when both requirements are met (>2 years from grant, >1 year from purchase)', () => {
      // Grant: 2023-01-01, Purchase: 2023-07-01
      // Need: >2 years from grant (>2025-01-01) AND >1 year from purchase (>2024-07-01)
      // Sell date: 2025-07-02 (2y 6m from grant, 2y from purchase)
      const sellDate = addDays(addYears(purchaseDate, 2), 1);

      const result = isDisqualifyingDisposition(
        grantDate,
        purchaseDate,
        sellDate
      );

      expect(result).toBe(false);
    });

    it('should return false when sold exactly 2 years + 1 day from grant', () => {
      const sellDate = addDays(addYears(grantDate, 2), 1);

      const result = isDisqualifyingDisposition(
        grantDate,
        purchaseDate,
        sellDate
      );

      expect(result).toBe(false);
    });

    it('should return false when sold years after both requirements', () => {
      const sellDate = new Date('2028-01-01'); // 5 years from grant, 4.5 years from purchase

      const result = isDisqualifyingDisposition(
        grantDate,
        purchaseDate,
        sellDate
      );

      expect(result).toBe(false);
    });
  });

  describe('disqualifying dispositions - both requirements not met', () => {
    it('should return true when sold before both requirements (<2 years from grant, <1 year from purchase)', () => {
      const sellDate = new Date('2024-06-30'); // 1.5 years from grant, 11 months from purchase

      const result = isDisqualifyingDisposition(
        grantDate,
        purchaseDate,
        sellDate
      );

      expect(result).toBe(true);
    });

    it('should return true when sold immediately after purchase', () => {
      const sellDate = addDays(purchaseDate, 1);

      const result = isDisqualifyingDisposition(
        grantDate,
        purchaseDate,
        sellDate
      );

      expect(result).toBe(true);
    });

    it('should return true when sold on purchase date', () => {
      const sellDate = purchaseDate;

      const result = isDisqualifyingDisposition(
        grantDate,
        purchaseDate,
        sellDate
      );

      expect(result).toBe(true);
    });
  });

  describe('disqualifying dispositions - grant requirement not met only', () => {
    it('should return true when sold after 1 year from purchase but before 2 years from grant', () => {
      // Sell date: 2024-12-31 (1 year 6 months from grant, 1 year 5 months from purchase)
      const sellDate = new Date('2024-12-31');

      const result = isDisqualifyingDisposition(
        grantDate,
        purchaseDate,
        sellDate
      );

      expect(result).toBe(true);
    });

    it('should return true when sold exactly 2 years from grant', () => {
      const sellDate = addYears(grantDate, 2);

      const result = isDisqualifyingDisposition(
        grantDate,
        purchaseDate,
        sellDate
      );

      expect(result).toBe(true);
    });
  });

  describe('disqualifying dispositions - purchase requirement not met only', () => {
    it('should return true when sold after 2 years from grant but before 1 year from purchase', () => {
      // This scenario is rare since grant typically precedes purchase
      // Grant: 2023-01-01, Purchase: 2024-12-01, Sell: 2025-06-01
      const latePurchaseDate = new Date('2024-12-01');
      const sellDate = new Date('2025-06-01'); // 2y 5m from grant, only 6m from purchase

      const result = isDisqualifyingDisposition(
        grantDate,
        latePurchaseDate,
        sellDate
      );

      expect(result).toBe(true);
    });

    it('should return true when sold exactly 1 year from purchase', () => {
      const sellDate = addYears(purchaseDate, 1);

      const result = isDisqualifyingDisposition(
        grantDate,
        purchaseDate,
        sellDate
      );

      expect(result).toBe(true);
    });
  });

  describe('input validation', () => {
    it('should throw error when grant date is after purchase date', () => {
      const invalidGrantDate = new Date('2023-08-01');
      const validPurchaseDate = new Date('2023-07-01');
      const sellDate = new Date('2025-07-01');

      expect(() =>
        isDisqualifyingDisposition(
          invalidGrantDate,
          validPurchaseDate,
          sellDate
        )
      ).toThrow('Grant date must be before purchase date');
    });

    it('should throw error when grant date equals purchase date', () => {
      const sameDate = new Date('2023-07-01');
      const sellDate = new Date('2025-07-01');

      expect(() =>
        isDisqualifyingDisposition(sameDate, sameDate, sellDate)
      ).toThrow('Grant date must be before purchase date');
    });

    it('should throw error when sell date is before purchase date', () => {
      const sellDate = new Date('2023-06-01');

      expect(() =>
        isDisqualifyingDisposition(grantDate, purchaseDate, sellDate)
      ).toThrow('Sell date cannot be before purchase date');
    });
  });
});

describe('checkDispositionStatus', () => {
  const grantDate = new Date('2023-06-01');
  const purchaseDate = new Date('2023-12-01');

  it('should return correct dates and thresholds', () => {
    const sellDate = new Date('2024-12-15');

    const result = checkDispositionStatus(grantDate, purchaseDate, sellDate);

    expect(result.grantDate).toEqual(grantDate);
    expect(result.purchaseDate).toEqual(purchaseDate);
    expect(result.sellDate).toEqual(sellDate);
    expect(result.twoYearsFromGrant).toEqual(new Date('2025-06-01'));
    expect(result.oneYearFromPurchase).toEqual(new Date('2024-12-01'));
  });

  it('should return isQualifying=true when both requirements met', () => {
    const sellDate = new Date('2025-12-02'); // After both thresholds

    const result = checkDispositionStatus(grantDate, purchaseDate, sellDate);

    expect(result.meetsGrantRequirement).toBe(true);
    expect(result.meetsPurchaseRequirement).toBe(true);
    expect(result.isQualifying).toBe(true);
  });

  it('should return isQualifying=false when grant requirement not met', () => {
    const sellDate = new Date('2024-12-15'); // Before 2-year grant threshold

    const result = checkDispositionStatus(grantDate, purchaseDate, sellDate);

    expect(result.meetsGrantRequirement).toBe(false);
    expect(result.meetsPurchaseRequirement).toBe(true);
    expect(result.isQualifying).toBe(false);
  });

  it('should return isQualifying=false when purchase requirement not met', () => {
    const sellDate = new Date('2024-06-01'); // Before 1-year purchase threshold

    const result = checkDispositionStatus(grantDate, purchaseDate, sellDate);

    expect(result.meetsGrantRequirement).toBe(false);
    expect(result.meetsPurchaseRequirement).toBe(false);
    expect(result.isQualifying).toBe(false);
  });

  it('should return isQualifying=false when both requirements not met', () => {
    const sellDate = new Date('2024-03-01'); // Before both thresholds

    const result = checkDispositionStatus(grantDate, purchaseDate, sellDate);

    expect(result.meetsGrantRequirement).toBe(false);
    expect(result.meetsPurchaseRequirement).toBe(false);
    expect(result.isQualifying).toBe(false);
  });

  it('should handle boundary: sell exactly on 2-year grant threshold', () => {
    const sellDate = new Date('2025-06-01'); // Exactly 2 years from grant

    const result = checkDispositionStatus(grantDate, purchaseDate, sellDate);

    // IRS requires MORE than 2 years, so exactly 2 years doesn't meet requirement
    expect(result.meetsGrantRequirement).toBe(false);
  });

  it('should handle boundary: sell exactly on 1-year purchase threshold', () => {
    const sellDate = new Date('2024-12-01'); // Exactly 1 year from purchase

    const result = checkDispositionStatus(grantDate, purchaseDate, sellDate);

    // IRS requires MORE than 1 year, so exactly 1 year doesn't meet requirement
    expect(result.meetsPurchaseRequirement).toBe(false);
  });
});

describe('getDispositionReason', () => {
  it('should return "qualifying" when both requirements met', () => {
    const check = {
      grantDate: new Date('2023-01-01'),
      purchaseDate: new Date('2023-07-01'),
      sellDate: new Date('2025-08-01'),
      twoYearsFromGrant: new Date('2025-01-01'),
      oneYearFromPurchase: new Date('2024-07-01'),
      meetsGrantRequirement: true,
      meetsPurchaseRequirement: true,
      isQualifying: true,
    };

    const result = getDispositionReason(check);

    expect(result).toBe('qualifying');
  });

  it('should return "both_requirements_not_met" when neither requirement met', () => {
    const check = {
      grantDate: new Date('2023-01-01'),
      purchaseDate: new Date('2023-07-01'),
      sellDate: new Date('2024-03-01'),
      twoYearsFromGrant: new Date('2025-01-01'),
      oneYearFromPurchase: new Date('2024-07-01'),
      meetsGrantRequirement: false,
      meetsPurchaseRequirement: false,
      isQualifying: false,
    };

    const result = getDispositionReason(check);

    expect(result).toBe('both_requirements_not_met');
  });

  it('should return "sold_before_2yr_from_grant" when only grant requirement not met', () => {
    const check = {
      grantDate: new Date('2023-01-01'),
      purchaseDate: new Date('2023-07-01'),
      sellDate: new Date('2024-12-31'),
      twoYearsFromGrant: new Date('2025-01-01'),
      oneYearFromPurchase: new Date('2024-07-01'),
      meetsGrantRequirement: false,
      meetsPurchaseRequirement: true,
      isQualifying: false,
    };

    const result = getDispositionReason(check);

    expect(result).toBe('sold_before_2yr_from_grant');
  });

  it('should return "sold_before_1yr_from_purchase" when only purchase requirement not met', () => {
    const check = {
      grantDate: new Date('2023-01-01'),
      purchaseDate: new Date('2024-12-01'),
      sellDate: new Date('2025-06-01'),
      twoYearsFromGrant: new Date('2025-01-01'),
      oneYearFromPurchase: new Date('2025-12-01'),
      meetsGrantRequirement: true,
      meetsPurchaseRequirement: false,
      isQualifying: false,
    };

    const result = getDispositionReason(check);

    expect(result).toBe('sold_before_1yr_from_purchase');
  });
});

describe('getTaxImplicationMessage', () => {
  const bargainElement = new Decimal(15);

  it('should return qualifying disposition message when requirements met', () => {
    const check = {
      grantDate: new Date('2023-01-01'),
      purchaseDate: new Date('2023-07-01'),
      sellDate: new Date('2025-08-01'),
      twoYearsFromGrant: new Date('2025-01-01'),
      oneYearFromPurchase: new Date('2024-07-01'),
      meetsGrantRequirement: true,
      meetsPurchaseRequirement: true,
      isQualifying: true,
    };

    const result = getTaxImplicationMessage(check, bargainElement);

    expect(result).toContain('Qualifying Disposition');
    expect(result).toContain('Favorable tax treatment');
    expect(result).toContain('long-term capital gains');
    expect(result).toContain('not ordinary income');
  });

  it('should return disqualifying message with bargain element when both requirements not met', () => {
    const check = {
      grantDate: new Date('2023-06-01'),
      purchaseDate: new Date('2023-12-01'),
      sellDate: new Date('2024-12-15'),
      twoYearsFromGrant: new Date('2025-06-01'),
      oneYearFromPurchase: new Date('2024-12-01'),
      meetsGrantRequirement: false,
      meetsPurchaseRequirement: false,
      isQualifying: false,
    };

    const result = getTaxImplicationMessage(check, bargainElement);

    expect(result).toContain('Disqualifying Disposition');
    expect(result).toContain('$15.00');
    expect(result).toContain('ordinary income');
    expect(result).toContain('2023-06-01');
    expect(result).toContain('2023-12-01');
    expect(result).toContain('2024-12-15');
    expect(result).toContain('2025-06-01'); // 2-year grant threshold
    expect(result).toContain('2024-12-01'); // 1-year purchase threshold
  });

  it('should return disqualifying message for grant requirement not met only', () => {
    const check = {
      grantDate: new Date('2023-01-01'),
      purchaseDate: new Date('2023-07-01'),
      sellDate: new Date('2024-12-31'),
      twoYearsFromGrant: new Date('2025-01-01'),
      oneYearFromPurchase: new Date('2024-07-01'),
      meetsGrantRequirement: false,
      meetsPurchaseRequirement: true,
      isQualifying: false,
    };

    const result = getTaxImplicationMessage(check, bargainElement);

    expect(result).toContain('Disqualifying Disposition');
    expect(result).toContain('2-year grant requirement');
    expect(result).toContain('2025-01-01');
    expect(result).not.toContain('1-year purchase requirement');
  });

  it('should return disqualifying message for purchase requirement not met only', () => {
    const check = {
      grantDate: new Date('2023-01-01'),
      purchaseDate: new Date('2024-12-01'),
      sellDate: new Date('2025-06-01'),
      twoYearsFromGrant: new Date('2025-01-01'),
      oneYearFromPurchase: new Date('2025-12-01'),
      meetsGrantRequirement: true,
      meetsPurchaseRequirement: false,
      isQualifying: false,
    };

    const result = getTaxImplicationMessage(check, bargainElement);

    expect(result).toContain('Disqualifying Disposition');
    expect(result).toContain('1-year purchase requirement');
    expect(result).toContain('2025-12-01');
    expect(result).not.toContain('2-year grant requirement');
  });

  it('should format bargain element with 2 decimal places', () => {
    const largeBargain = new Decimal(1234.567);
    const check = {
      grantDate: new Date('2023-01-01'),
      purchaseDate: new Date('2023-07-01'),
      sellDate: new Date('2024-03-01'),
      twoYearsFromGrant: new Date('2025-01-01'),
      oneYearFromPurchase: new Date('2024-07-01'),
      meetsGrantRequirement: false,
      meetsPurchaseRequirement: false,
      isQualifying: false,
    };

    const result = getTaxImplicationMessage(check, largeBargain);

    expect(result).toContain('$1234.57');
  });

  it('should handle zero bargain element', () => {
    const zeroBargain = new Decimal(0);
    const check = {
      grantDate: new Date('2023-01-01'),
      purchaseDate: new Date('2023-07-01'),
      sellDate: new Date('2024-03-01'),
      twoYearsFromGrant: new Date('2025-01-01'),
      oneYearFromPurchase: new Date('2024-07-01'),
      meetsGrantRequirement: false,
      meetsPurchaseRequirement: false,
      isQualifying: false,
    };

    const result = getTaxImplicationMessage(check, zeroBargain);

    expect(result).toContain('$0.00');
  });
});
