/**
 * Portfolio Types Unit Tests
 *
 * Tests for PRICEABLE_ASSET_TYPES constant and asset type filtering.
 */

import { describe, it, expect } from 'vitest';
import { PRICEABLE_ASSET_TYPES, type AssetType } from '../portfolio';

describe('PRICEABLE_ASSET_TYPES', () => {
  it('should include priceable asset types', () => {
    const priceableTypes: AssetType[] = [
      'stock',
      'etf',
      'crypto',
      'bond',
      'commodity',
      'index',
    ];

    priceableTypes.forEach((type) => {
      expect(PRICEABLE_ASSET_TYPES.has(type)).toBe(true);
    });
  });

  it('should exclude non-priceable asset types', () => {
    const nonPriceableTypes: AssetType[] = ['real_estate', 'cash', 'other'];

    nonPriceableTypes.forEach((type) => {
      expect(PRICEABLE_ASSET_TYPES.has(type)).toBe(false);
    });
  });

  it('should be a Set instance with correct size', () => {
    expect(PRICEABLE_ASSET_TYPES).toBeInstanceOf(Set);
    expect(PRICEABLE_ASSET_TYPES.size).toBe(6); // stock, etf, crypto, bond, commodity, index

    // ReadonlySet is a TypeScript compile-time type only
    // Runtime mutations are still possible but discouraged by the type system
  });

  it('should filter holdings to only include priceable assets', () => {
    // Simulate holdings with mixed asset types
    interface Holding {
      assetId: string;
      quantity: number;
    }

    interface Asset {
      id: string;
      symbol: string;
      type: AssetType;
    }

    const holdings: Holding[] = [
      { assetId: 'asset1', quantity: 100 },
      { assetId: 'asset2', quantity: 50 },
      { assetId: 'asset3', quantity: 1000 },
      { assetId: 'asset4', quantity: 25 },
    ];

    const assets: Asset[] = [
      { id: 'asset1', symbol: 'AAPL', type: 'stock' },
      { id: 'asset2', symbol: 'PROPERTY_001', type: 'real_estate' },
      { id: 'asset3', symbol: 'USD_CASH', type: 'cash' },
      { id: 'asset4', symbol: 'BTC', type: 'crypto' },
    ];

    // Simulate the filtering logic from page.tsx
    const priceableSymbols = holdings
      .map((h) => {
        const asset = assets.find((a) => a.id === h.assetId);
        if (!asset || !PRICEABLE_ASSET_TYPES.has(asset.type)) return null;
        return asset.symbol;
      })
      .filter(Boolean);

    // Should only include stock and crypto, not real_estate or cash
    expect(priceableSymbols).toEqual(['AAPL', 'BTC']);
    expect(priceableSymbols).not.toContain('PROPERTY_001');
    expect(priceableSymbols).not.toContain('USD_CASH');
  });

  it('should handle empty holdings array', () => {
    const holdings: Array<{ assetId: string; quantity: number }> = [];
    const assets: Array<{ id: string; symbol: string; type: AssetType }> = [];

    const priceableSymbols = holdings
      .map((h) => {
        const asset = assets.find((a) => a.id === h.assetId);
        if (!asset || !PRICEABLE_ASSET_TYPES.has(asset.type)) return null;
        return asset.symbol;
      })
      .filter(Boolean);

    expect(priceableSymbols).toEqual([]);
  });

  it('should handle holdings with missing asset references', () => {
    interface Holding {
      assetId: string;
      quantity: number;
    }

    interface Asset {
      id: string;
      symbol: string;
      type: AssetType;
    }

    const holdings: Holding[] = [
      { assetId: 'asset1', quantity: 100 },
      { assetId: 'asset_missing', quantity: 50 }, // Asset doesn't exist
    ];

    const assets: Asset[] = [{ id: 'asset1', symbol: 'AAPL', type: 'stock' }];

    const priceableSymbols = holdings
      .map((h) => {
        const asset = assets.find((a) => a.id === h.assetId);
        if (!asset || !PRICEABLE_ASSET_TYPES.has(asset.type)) return null;
        return asset.symbol;
      })
      .filter(Boolean);

    // Should only include AAPL, skipping the missing asset
    expect(priceableSymbols).toEqual(['AAPL']);
  });

  it('should handle all non-priceable holdings', () => {
    interface Holding {
      assetId: string;
      quantity: number;
    }

    interface Asset {
      id: string;
      symbol: string;
      type: AssetType;
    }

    const holdings: Holding[] = [
      { assetId: 'asset1', quantity: 100 },
      { assetId: 'asset2', quantity: 50 },
    ];

    const assets: Asset[] = [
      { id: 'asset1', symbol: 'PROPERTY_001', type: 'real_estate' },
      { id: 'asset2', symbol: 'USD_CASH', type: 'cash' },
    ];

    const priceableSymbols = holdings
      .map((h) => {
        const asset = assets.find((a) => a.id === h.assetId);
        if (!asset || !PRICEABLE_ASSET_TYPES.has(asset.type)) return null;
        return asset.symbol;
      })
      .filter(Boolean);

    // Should be empty - no priceable assets
    expect(priceableSymbols).toEqual([]);
  });
});
