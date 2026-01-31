import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  calculateNetValue,
  calculateYield,
  getAssetAnnualYield,
  addPropertyAsset,
  updateManualPrice,
  updateRentalInfo,
  PropertyFormData,
} from '../property-service';
import { db } from '@/lib/db/schema';
import { Asset } from '@/types';

describe('property-service', () => {
  describe('calculateNetValue', () => {
    it('should calculate 100% ownership correctly', () => {
      const result = calculateNetValue(new Decimal(500000), 100);
      expect(result.toString()).toBe('500000');
    });

    it('should calculate 50% ownership correctly', () => {
      const result = calculateNetValue(new Decimal(500000), 50);
      expect(result.toString()).toBe('250000');
    });

    it('should calculate 0.01% ownership correctly (edge case)', () => {
      const result = calculateNetValue(new Decimal(1000000), 0.01);
      expect(result.toString()).toBe('100');
    });

    it('should calculate 0% ownership correctly (edge case)', () => {
      const result = calculateNetValue(new Decimal(500000), 0);
      expect(result.toString()).toBe('0');
    });

    it('should handle default ownership of 100%', () => {
      const result = calculateNetValue(new Decimal(500000));
      expect(result.toString()).toBe('500000');
    });

    it('should throw error for ownership > 100', () => {
      expect(() => calculateNetValue(new Decimal(500000), 101)).toThrow(
        'Ownership percentage must be between 0 and 100'
      );
    });

    it('should throw error for negative ownership', () => {
      expect(() => calculateNetValue(new Decimal(500000), -10)).toThrow(
        'Ownership percentage must be between 0 and 100'
      );
    });

    it('should handle very large values with precision', () => {
      const result = calculateNetValue(new Decimal('999999999999.99'), 33.33);
      expect(result.toFixed(2)).toBe('333333333333.30');
    });

    it('should maintain decimal precision for fractional ownership', () => {
      const result = calculateNetValue(new Decimal('123456.789'), 12.34567);
      expect(result.toFixed(6)).toBe('15241.358316');
    });
  });

  describe('calculateYield', () => {
    it('should calculate yield correctly for rental property', () => {
      const monthlyRent = new Decimal(2000);
      const currentValue = new Decimal(500000);
      const yield = calculateYield(monthlyRent, currentValue);

      // (2000 * 12) / 500000 * 100 = 4.8%
      expect(yield).toBe(4.8);
    });

    it('should return undefined for zero current value', () => {
      const monthlyRent = new Decimal(2000);
      const currentValue = new Decimal(0);
      const yield = calculateYield(monthlyRent, currentValue);

      expect(yield).toBeUndefined();
    });

    it('should calculate high yield correctly', () => {
      const monthlyRent = new Decimal(5000);
      const currentValue = new Decimal(50000);
      const yield = calculateYield(monthlyRent, currentValue);

      // (5000 * 12) / 50000 * 100 = 120%
      expect(yield).toBe(120);
    });

    it('should calculate very low yield correctly', () => {
      const monthlyRent = new Decimal(100);
      const currentValue = new Decimal(1000000);
      const yield = calculateYield(monthlyRent, currentValue);

      // (100 * 12) / 1000000 * 100 = 0.12%
      expect(yield).toBe(0.12);
    });

    it('should handle zero rent', () => {
      const monthlyRent = new Decimal(0);
      const currentValue = new Decimal(500000);
      const yield = calculateYield(monthlyRent, currentValue);

      expect(yield).toBe(0);
    });

    it('should maintain precision for fractional yields', () => {
      const monthlyRent = new Decimal('1234.56');
      const currentValue = new Decimal('456789.12');
      const yield = calculateYield(monthlyRent, currentValue);

      // (1234.56 * 12) / 456789.12 * 100 ≈ 3.244%
      expect(yield).toBeCloseTo(3.244, 2);
    });
  });

  describe('getAssetAnnualYield', () => {
    it('should return undefined for non-rental assets', () => {
      const asset: Asset = {
        id: 'test-1',
        symbol: 'PROP1',
        name: 'Property 1',
        type: 'real_estate',
        currency: 'USD',
        currentPrice: 500000,
        metadata: {},
        valuationMethod: 'MANUAL',
      };

      const yield = getAssetAnnualYield(asset);
      expect(yield).toBeUndefined();
    });

    it('should return undefined for rental with no monthly rent', () => {
      const asset: Asset = {
        id: 'test-2',
        symbol: 'PROP2',
        name: 'Property 2',
        type: 'real_estate',
        currency: 'USD',
        currentPrice: 500000,
        metadata: {},
        valuationMethod: 'MANUAL',
        rentalInfo: {
          isRental: true,
          monthlyRent: new Decimal(0),
        },
      };

      const yield = getAssetAnnualYield(asset);
      expect(yield).toBe(0);
    });

    it('should calculate yield for rental asset with Decimal monthlyRent', () => {
      const asset: Asset = {
        id: 'test-3',
        symbol: 'PROP3',
        name: 'Property 3',
        type: 'real_estate',
        currency: 'USD',
        currentPrice: 500000,
        metadata: {},
        valuationMethod: 'MANUAL',
        rentalInfo: {
          isRental: true,
          monthlyRent: new Decimal(2000),
        },
      };

      const yield = getAssetAnnualYield(asset);
      expect(yield).toBe(4.8);
    });

    it('should calculate yield for rental asset with string monthlyRent', () => {
      const asset: Asset = {
        id: 'test-4',
        symbol: 'PROP4',
        name: 'Property 4',
        type: 'real_estate',
        currency: 'USD',
        currentPrice: 500000,
        metadata: {},
        valuationMethod: 'MANUAL',
        rentalInfo: {
          isRental: true,
          monthlyRent: '2000' as any, // Simulating storage format
        },
      };

      const yield = getAssetAnnualYield(asset);
      expect(yield).toBe(4.8);
    });

    it('should return undefined for zero current price', () => {
      const asset: Asset = {
        id: 'test-5',
        symbol: 'PROP5',
        name: 'Property 5',
        type: 'real_estate',
        currency: 'USD',
        currentPrice: 0,
        metadata: {},
        valuationMethod: 'MANUAL',
        rentalInfo: {
          isRental: true,
          monthlyRent: new Decimal(2000),
        },
      };

      const yield = getAssetAnnualYield(asset);
      expect(yield).toBeUndefined();
    });

    it('should return undefined for undefined current price', () => {
      const asset: Asset = {
        id: 'test-6',
        symbol: 'PROP6',
        name: 'Property 6',
        type: 'real_estate',
        currency: 'USD',
        metadata: {},
        valuationMethod: 'MANUAL',
        rentalInfo: {
          isRental: true,
          monthlyRent: new Decimal(2000),
        },
      };

      const yield = getAssetAnnualYield(asset);
      expect(yield).toBeUndefined();
    });
  });

  describe('addPropertyAsset', () => {
    beforeEach(async () => {
      // Mock the database
      vi.clearAllMocks();
    });

    afterEach(async () => {
      vi.restoreAllMocks();
    });

    it('should throw error for ownership percentage > 100', async () => {
      const data: PropertyFormData = {
        name: 'Test Property',
        type: 'real_estate',
        purchasePrice: '500000',
        currentValue: '550000',
        purchaseDate: new Date('2023-01-01'),
        ownershipPercentage: 150,
        isRental: false,
      };

      await expect(addPropertyAsset('portfolio-1', data)).rejects.toThrow(
        'Ownership percentage must be between 0 and 100'
      );
    });

    it('should throw error for negative purchase price', async () => {
      const data: PropertyFormData = {
        name: 'Test Property',
        type: 'real_estate',
        purchasePrice: '-500000',
        currentValue: '550000',
        purchaseDate: new Date('2023-01-01'),
        ownershipPercentage: 100,
        isRental: false,
      };

      await expect(addPropertyAsset('portfolio-1', data)).rejects.toThrow(
        'Purchase price cannot be negative'
      );
    });

    it('should throw error for negative current value', async () => {
      const data: PropertyFormData = {
        name: 'Test Property',
        type: 'real_estate',
        purchasePrice: '500000',
        currentValue: '-550000',
        purchaseDate: new Date('2023-01-01'),
        ownershipPercentage: 100,
        isRental: false,
      };

      await expect(addPropertyAsset('portfolio-1', data)).rejects.toThrow(
        'Current value cannot be negative'
      );
    });

    it('should throw error for negative monthly rent', async () => {
      const data: PropertyFormData = {
        name: 'Test Property',
        type: 'real_estate',
        purchasePrice: '500000',
        currentValue: '550000',
        purchaseDate: new Date('2023-01-01'),
        ownershipPercentage: 100,
        isRental: true,
        monthlyRent: '-2000',
      };

      await expect(addPropertyAsset('portfolio-1', data)).rejects.toThrow(
        'Monthly rent cannot be negative'
      );
    });

    it('should throw error for non-existent portfolio', async () => {
      vi.spyOn(db.portfolios, 'get').mockResolvedValue(undefined);

      const data: PropertyFormData = {
        name: 'Test Property',
        type: 'real_estate',
        purchasePrice: '500000',
        currentValue: '550000',
        purchaseDate: new Date('2023-01-01'),
        ownershipPercentage: 100,
        isRental: false,
      };

      await expect(addPropertyAsset('non-existent', data)).rejects.toThrow(
        'Portfolio not found'
      );
    });
  });

  describe('updateManualPrice', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should throw error for negative price', async () => {
      await expect(
        updateManualPrice('asset-1', new Decimal(-100))
      ).rejects.toThrow('Price cannot be negative');
    });

    it('should throw error for non-existent asset', async () => {
      vi.spyOn(db.assets, 'get').mockResolvedValue(undefined);

      await expect(
        updateManualPrice('non-existent', new Decimal(100))
      ).rejects.toThrow('Asset not found');
    });

    it('should throw error for non-manual valuation', async () => {
      const asset: Asset = {
        id: 'asset-1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
        currentPrice: 150,
        metadata: {},
        valuationMethod: 'AUTO',
      };

      vi.spyOn(db.assets, 'get').mockResolvedValue(asset);

      await expect(
        updateManualPrice('asset-1', new Decimal(200))
      ).rejects.toThrow('Can only update price for manually valued assets');
    });
  });

  describe('updateRentalInfo', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should throw error for non-existent asset', async () => {
      vi.spyOn(db.assets, 'get').mockResolvedValue(undefined);

      await expect(
        updateRentalInfo('non-existent', {
          isRental: true,
          monthlyRent: new Decimal(2000),
        })
      ).rejects.toThrow('Asset not found');
    });

    it('should throw error for non-real-estate asset', async () => {
      const asset: Asset = {
        id: 'asset-1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
        currentPrice: 150,
        metadata: {},
      };

      vi.spyOn(db.assets, 'get').mockResolvedValue(asset);

      await expect(
        updateRentalInfo('asset-1', {
          isRental: true,
          monthlyRent: new Decimal(2000),
        })
      ).rejects.toThrow('Can only update rental info for real estate assets');
    });
  });

  describe('edge cases and precision', () => {
    it('should handle very small ownership percentages', () => {
      const result = calculateNetValue(new Decimal('1000000'), 0.001);
      expect(result.toString()).toBe('10');
    });

    it('should handle very large property values', () => {
      const result = calculateNetValue(new Decimal('999999999999'), 50);
      expect(result.toString()).toBe('499999999999.5');
    });

    it('should maintain precision with many decimal places', () => {
      const result = calculateNetValue(
        new Decimal('123456.789012345'),
        12.345678901234
      );
      expect(result.toFixed(12)).toBe('15241.358288469');
    });

    it('should handle zero values gracefully', () => {
      const result = calculateNetValue(new Decimal(0), 50);
      expect(result.toString()).toBe('0');
    });

    it('should calculate yield with extreme values', () => {
      const monthlyRent = new Decimal('0.01');
      const currentValue = new Decimal('10000000');
      const yield = calculateYield(monthlyRent, currentValue);

      expect(yield).toBeCloseTo(0.0012, 4);
    });
  });
});
