import { addYears } from 'date-fns';
import { Decimal } from 'decimal.js';
import {
  DisqualifyingDispositionCheck,
  DisqualifyingReason,
} from '@/types/tax';

/**
 * ESPP Validator Service
 *
 * Validates ESPP transactions and detects disqualifying dispositions based on
 * IRS holding period requirements.
 *
 * IRS Section 423: A qualifying disposition requires BOTH:
 * 1. Shares held for at least 2 years from grant date
 * 2. Shares held for at least 1 year from purchase date
 */

/**
 * Determines if an ESPP stock sale violates IRS qualifying disposition rules.
 *
 * @param grantDate ESPP offering date (when the grant/option was given)
 * @param purchaseDate ESPP exercise/purchase date (when shares were bought)
 * @param sellDate Date when shares were sold
 * @returns true if disposition is disqualifying, false if qualifying
 *
 * @throws Error if grantDate is after purchaseDate or sellDate is before purchaseDate
 *
 * IRS Rules:
 * A disposition is QUALIFYING if BOTH conditions are met:
 * 1. Shares held for at least 2 years from grant date
 * 2. Shares held for at least 1 year from purchase date
 *
 * If either condition fails, it's DISQUALIFYING.
 *
 * @example
 * const grant = new Date('2023-01-01');
 * const purchase = new Date('2023-07-01');
 *
 * // Case 1: Sell before both requirements met
 * isDisqualifyingDisposition(grant, purchase, new Date('2024-06-30'));
 * // → true (< 1 year from purchase, < 2 years from grant)
 *
 * // Case 2: Sell after 1 year from purchase, but before 2 years from grant
 * isDisqualifyingDisposition(grant, purchase, new Date('2024-12-31'));
 * // → true (meets purchase requirement, but < 2 years from grant)
 *
 * // Case 3: Sell after both requirements met
 * isDisqualifyingDisposition(grant, purchase, new Date('2025-01-02'));
 * // → false (qualifying disposition)
 */
export function isDisqualifyingDisposition(
  grantDate: Date,
  purchaseDate: Date,
  sellDate: Date
): boolean {
  // Validate inputs
  if (grantDate >= purchaseDate) {
    throw new Error('Grant date must be before purchase date');
  }
  if (sellDate < purchaseDate) {
    throw new Error('Sell date cannot be before purchase date');
  }

  const check = checkDispositionStatus(grantDate, purchaseDate, sellDate);
  return !check.isQualifying;
}

/**
 * Returns detailed breakdown of disposition status with reasons.
 *
 * @param grantDate ESPP offering date
 * @param purchaseDate ESPP exercise/purchase date
 * @param sellDate Date when shares were sold
 * @returns DisqualifyingDispositionCheck object with full analysis
 *
 * @example
 * const grant = new Date('2023-06-01');
 * const purchase = new Date('2023-12-01');
 * const sell = new Date('2024-12-15');
 *
 * const check = checkDispositionStatus(grant, purchase, sell);
 * console.log(check);
 * // {
 * //   grantDate: 2023-06-01,
 * //   purchaseDate: 2023-12-01,
 * //   sellDate: 2024-12-15,
 * //   twoYearsFromGrant: 2025-06-01,
 * //   oneYearFromPurchase: 2024-12-01,
 * //   meetsGrantRequirement: false,    // 2024-12-15 < 2025-06-01
 * //   meetsPurchaseRequirement: true,  // 2024-12-15 >= 2024-12-01
 * //   isQualifying: false
 * // }
 */
export function checkDispositionStatus(
  grantDate: Date,
  purchaseDate: Date,
  sellDate: Date
): DisqualifyingDispositionCheck {
  const twoYearsFromGrant = addYears(grantDate, 2);
  const oneYearFromPurchase = addYears(purchaseDate, 1);

  const meetsGrantRequirement = sellDate >= twoYearsFromGrant;
  const meetsPurchaseRequirement = sellDate >= oneYearFromPurchase;
  const isQualifying = meetsGrantRequirement && meetsPurchaseRequirement;

  return {
    grantDate,
    purchaseDate,
    sellDate,
    twoYearsFromGrant,
    oneYearFromPurchase,
    meetsGrantRequirement,
    meetsPurchaseRequirement,
    isQualifying,
  };
}

/**
 * Returns human-readable reason for disqualifying status.
 *
 * @param check Result from checkDispositionStatus()
 * @returns Enum describing why disposition is disqualifying (or 'qualifying' if it meets requirements)
 */
export function getDispositionReason(
  check: DisqualifyingDispositionCheck
): DisqualifyingReason {
  if (check.isQualifying) {
    return 'qualifying';
  }

  if (!check.meetsGrantRequirement && !check.meetsPurchaseRequirement) {
    return 'both_requirements_not_met';
  }

  if (!check.meetsGrantRequirement) {
    return 'sold_before_2yr_from_grant';
  }

  return 'sold_before_1yr_from_purchase';
}

/**
 * Returns user-friendly explanation of tax implications.
 *
 * @param check Result from checkDispositionStatus()
 * @param bargainElement Discount amount (market price - purchase price at time of ESPP purchase)
 * @returns String explaining tax treatment
 *
 * @example
 * const check = checkDispositionStatus(grant, purchase, sell);
 * const bargainElement = new Decimal(15);
 *
 * const message = getTaxImplicationMessage(check, bargainElement);
 * console.log(message);
 * // "Disqualifying Disposition: The $15.00 bargain element will be taxed as
 * //  ordinary income. You must hold shares for at least 2 years from grant
 * //  date (2023-06-01) and 1 year from purchase date (2023-12-01).
 * //  This sale occurred on 2024-12-15, which is before the 2-year grant
 * //  requirement (2025-06-01)."
 *
 * // For qualifying disposition:
 * // "Qualifying Disposition: Favorable tax treatment applies. The bargain
 * //  element is taxed as long-term capital gains, not ordinary income."
 */
export function getTaxImplicationMessage(
  check: DisqualifyingDispositionCheck,
  bargainElement: Decimal
): string {
  const reason = getDispositionReason(check);

  if (reason === 'qualifying') {
    return `Qualifying Disposition: Favorable tax treatment applies. The bargain element is taxed as long-term capital gains, not ordinary income.`;
  }

  const bargainAmount = `$${bargainElement.toFixed(2)}`;
  const grantDateStr = check.grantDate.toISOString().split('T')[0];
  const purchaseDateStr = check.purchaseDate.toISOString().split('T')[0];
  const sellDateStr = check.sellDate.toISOString().split('T')[0];
  const twoYearThresholdStr = check.twoYearsFromGrant.toISOString().split('T')[0];
  const oneYearThresholdStr = check.oneYearFromPurchase.toISOString().split('T')[0];

  let specificReason = '';
  if (reason === 'both_requirements_not_met') {
    specificReason = `This sale occurred on ${sellDateStr}, which is before both the 2-year grant requirement (${twoYearThresholdStr}) and the 1-year purchase requirement (${oneYearThresholdStr}).`;
  } else if (reason === 'sold_before_2yr_from_grant') {
    specificReason = `This sale occurred on ${sellDateStr}, which is before the 2-year grant requirement (${twoYearThresholdStr}).`;
  } else {
    specificReason = `This sale occurred on ${sellDateStr}, which is before the 1-year purchase requirement (${oneYearThresholdStr}).`;
  }

  return `Disqualifying Disposition: The ${bargainAmount} bargain element will be taxed as ordinary income. You must hold shares for at least 2 years from grant date (${grantDateStr}) and 1 year from purchase date (${purchaseDateStr}). ${specificReason}`;
}
