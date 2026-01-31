/**
 * Test factory functions for creating test data objects.
 *
 * Provides reusable factory functions to reduce duplication in test files.
 */

import Decimal from 'decimal.js';
import type { Asset } from '@/types';

/**
 * Creates a test asset with sensible defaults and optional overrides.
 *
 * @param overrides - Partial asset properties to override defaults
 * @returns A complete Asset object for testing
 *
 * @example
 * // Create basic property asset
 * const asset = createTestAsset();
 *
 * @example
 * // Create rental property with specific values
 * const rentalAsset = createTestAsset({
 *   rentalInfo: {
 *     isRental: true,
 *     monthlyRent: new Decimal(2000),
 *   },
 * });
 */
export function createTestAsset(overrides: Partial<Asset> = {}): Asset {
  const baseAsset: Asset = {
    id: 'test-1',
    symbol: 'PROP1',
    name: 'Property 1',
    type: 'real_estate',
    currency: 'USD',
    currentPrice: 500000,
    metadata: {},
    valuationMethod: 'MANUAL',
  };

  return {
    ...baseAsset,
    ...overrides,
  };
}
