import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Decimal } from 'decimal.js';
import { Asset, PriceSnapshot } from '@/types';

// Use vi.hoisted to define mocks that can be referenced by hoisted vi.mock
const { mockAssetQueries, mockPriceQueries } = vi.hoisted(() => ({
  mockAssetQueries: {
    getAll: vi.fn(),
    getById: vi.fn(),
    search: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  mockPriceQueries: {
    getLatestSnapshot: vi.fn(),
    saveSnapshot: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  assetQueries: mockAssetQueries,
  priceQueries: mockPriceQueries,
}));

// Import after mock is set up
import { useAssetStore } from '../asset';
import { resetCounters, createMockAsset } from '@/test-utils';

describe('Asset Store', () => {
  beforeEach(() => {
    resetCounters();
    vi.clearAllMocks();
    useAssetStore.setState({
      assets: [],
      selectedAsset: null,
      prices: new Map(),
      searchResults: [],
      loading: false,
      priceLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadAssets', () => {
    it('should load assets successfully', async () => {
      const mockAssets: Asset[] = [
        createMockAsset({ symbol: 'AAPL' }),
        createMockAsset({ symbol: 'MSFT' }),
      ];

      mockAssetQueries.getAll.mockResolvedValue(mockAssets);

      await useAssetStore.getState().loadAssets();

      const state = useAssetStore.getState();
      expect(state.assets).toEqual(mockAssets);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle loading errors gracefully', async () => {
      const errorMessage = 'Database connection failed';
      mockAssetQueries.getAll.mockRejectedValue(new Error(errorMessage));

      await useAssetStore.getState().loadAssets();

      const state = useAssetStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
      expect(state.assets).toEqual([]);
    });

    it('should set loading state while fetching', async () => {
      mockAssetQueries.getAll.mockImplementation(async () => {
        expect(useAssetStore.getState().loading).toBe(true);
        return [];
      });

      await useAssetStore.getState().loadAssets();

      expect(useAssetStore.getState().loading).toBe(false);
    });
  });

  describe('searchAssets', () => {
    it('should search assets with query', async () => {
      const mockResults: Asset[] = [
        createMockAsset({ symbol: 'AAPL', name: 'Apple Inc.' }),
      ];

      mockAssetQueries.search.mockResolvedValue(mockResults);

      await useAssetStore.getState().searchAssets('apple');

      const state = useAssetStore.getState();
      expect(state.searchResults).toEqual(mockResults);
      expect(state.loading).toBe(false);
      expect(mockAssetQueries.search).toHaveBeenCalledWith('apple');
    });

    it('should return empty results for empty query', async () => {
      await useAssetStore.getState().searchAssets('');

      const state = useAssetStore.getState();
      expect(state.searchResults).toEqual([]);
      expect(mockAssetQueries.search).not.toHaveBeenCalled();
    });

    it('should return empty results for whitespace-only query', async () => {
      await useAssetStore.getState().searchAssets('   ');

      const state = useAssetStore.getState();
      expect(state.searchResults).toEqual([]);
      expect(mockAssetQueries.search).not.toHaveBeenCalled();
    });

    it('should handle search errors gracefully', async () => {
      const errorMessage = 'Search failed';
      mockAssetQueries.search.mockRejectedValue(new Error(errorMessage));

      await useAssetStore.getState().searchAssets('test');

      const state = useAssetStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
    });
  });

  describe('clearSearch', () => {
    it('should reset search results', () => {
      useAssetStore.setState({
        searchResults: [createMockAsset()],
      });

      useAssetStore.getState().clearSearch();

      const state = useAssetStore.getState();
      expect(state.searchResults).toEqual([]);
    });
  });

  describe('createAsset', () => {
    it('should create asset and return ID', async () => {
      const assetData = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock' as const,
        currency: 'USD',
        metadata: {},
      };

      mockAssetQueries.create.mockResolvedValue('new-asset-id');
      mockAssetQueries.getAll.mockResolvedValue([]);

      const result = await useAssetStore.getState().createAsset(assetData);

      expect(result).toBe('new-asset-id');
      expect(mockAssetQueries.create).toHaveBeenCalledWith(assetData);
    });

    it('should reload assets list after creation', async () => {
      const assetData = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock' as const,
        currency: 'USD',
        metadata: {},
      };

      const newAsset = createMockAsset({ id: 'new-asset-id', ...assetData });

      mockAssetQueries.create.mockResolvedValue('new-asset-id');
      mockAssetQueries.getAll.mockResolvedValue([newAsset]);

      await useAssetStore.getState().createAsset(assetData);

      expect(mockAssetQueries.getAll).toHaveBeenCalled();
      const state = useAssetStore.getState();
      expect(state.assets).toContain(newAsset);
    });

    it('should handle creation errors', async () => {
      const errorMessage = 'Asset already exists';
      mockAssetQueries.create.mockRejectedValue(new Error(errorMessage));

      await expect(
        useAssetStore.getState().createAsset({
          symbol: 'AAPL',
          name: 'Apple Inc.',
          type: 'stock',
          currency: 'USD',
          metadata: {},
        })
      ).rejects.toThrow(errorMessage);

      const state = useAssetStore.getState();
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('updateAsset', () => {
    it('should update asset successfully', async () => {
      const existingAsset = createMockAsset({ id: 'a1', name: 'Apple Inc.' });
      const updatedAsset = { ...existingAsset, name: 'Apple Corporation' };

      useAssetStore.setState({ assets: [existingAsset] });

      mockAssetQueries.update.mockResolvedValue(undefined);
      mockAssetQueries.getAll.mockResolvedValue([updatedAsset]);

      await useAssetStore
        .getState()
        .updateAsset('a1', { name: 'Apple Corporation' });

      expect(mockAssetQueries.update).toHaveBeenCalledWith('a1', {
        name: 'Apple Corporation',
      });
      expect(mockAssetQueries.getAll).toHaveBeenCalled();

      const state = useAssetStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should refresh selectedAsset if it matches updated asset', async () => {
      const existingAsset = createMockAsset({ id: 'a1', name: 'Apple Inc.' });
      const updatedAsset = { ...existingAsset, name: 'Apple Corporation' };

      useAssetStore.setState({
        assets: [existingAsset],
        selectedAsset: existingAsset,
      });

      mockAssetQueries.update.mockResolvedValue(undefined);
      mockAssetQueries.getAll.mockResolvedValue([updatedAsset]);
      mockAssetQueries.getById.mockResolvedValue(updatedAsset);

      await useAssetStore
        .getState()
        .updateAsset('a1', { name: 'Apple Corporation' });

      const state = useAssetStore.getState();
      expect(state.selectedAsset).toEqual(updatedAsset);
    });

    it('should not refresh selectedAsset if it does not match', async () => {
      const selectedAsset = createMockAsset({ id: 'a2' });
      const otherAsset = createMockAsset({ id: 'a1' });

      useAssetStore.setState({
        assets: [otherAsset, selectedAsset],
        selectedAsset,
      });

      mockAssetQueries.update.mockResolvedValue(undefined);
      mockAssetQueries.getAll.mockResolvedValue([otherAsset, selectedAsset]);

      await useAssetStore.getState().updateAsset('a1', { name: 'Updated' });

      const state = useAssetStore.getState();
      expect(state.selectedAsset).toEqual(selectedAsset);
      expect(mockAssetQueries.getById).not.toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      const errorMessage = 'Update failed';
      mockAssetQueries.update.mockRejectedValue(new Error(errorMessage));

      await useAssetStore.getState().updateAsset('a1', { name: 'Updated' });

      const state = useAssetStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
    });
  });

  describe('deleteAsset', () => {
    it('should delete asset successfully', async () => {
      const asset = createMockAsset({ id: 'a1' });

      useAssetStore.setState({ assets: [asset] });

      mockAssetQueries.delete.mockResolvedValue(undefined);
      mockAssetQueries.getAll.mockResolvedValue([]);

      await useAssetStore.getState().deleteAsset('a1');

      expect(mockAssetQueries.delete).toHaveBeenCalledWith('a1');

      const state = useAssetStore.getState();
      expect(state.assets).toEqual([]);
      expect(state.loading).toBe(false);
    });

    it('should clear selectedAsset if it matches deleted asset', async () => {
      const asset = createMockAsset({ id: 'a1' });

      useAssetStore.setState({
        assets: [asset],
        selectedAsset: asset,
      });

      mockAssetQueries.delete.mockResolvedValue(undefined);
      mockAssetQueries.getAll.mockResolvedValue([]);

      await useAssetStore.getState().deleteAsset('a1');

      const state = useAssetStore.getState();
      expect(state.selectedAsset).toBeNull();
    });

    it('should not clear selectedAsset if it does not match', async () => {
      const selectedAsset = createMockAsset({ id: 'a2' });
      const otherAsset = createMockAsset({ id: 'a1' });

      useAssetStore.setState({
        assets: [otherAsset, selectedAsset],
        selectedAsset,
      });

      mockAssetQueries.delete.mockResolvedValue(undefined);
      mockAssetQueries.getAll.mockResolvedValue([selectedAsset]);

      await useAssetStore.getState().deleteAsset('a1');

      const state = useAssetStore.getState();
      expect(state.selectedAsset).toEqual(selectedAsset);
    });

    it('should remove asset from prices map', async () => {
      const asset = createMockAsset({ id: 'a1' });
      const priceSnapshot: PriceSnapshot = {
        assetId: 'a1',
        price: new Decimal(150),
        change: new Decimal(5),
        changePercent: 3.45,
        timestamp: new Date(),
        source: 'yahoo',
      };

      const pricesMap = new Map<string, PriceSnapshot>();
      pricesMap.set('a1', priceSnapshot);

      useAssetStore.setState({
        assets: [asset],
        prices: pricesMap,
      });

      mockAssetQueries.delete.mockResolvedValue(undefined);
      mockAssetQueries.getAll.mockResolvedValue([]);

      await useAssetStore.getState().deleteAsset('a1');

      const state = useAssetStore.getState();
      expect(state.prices.has('a1')).toBe(false);
    });

    it('should handle delete errors', async () => {
      const errorMessage = 'Cannot delete asset that is used in holdings';
      mockAssetQueries.delete.mockRejectedValue(new Error(errorMessage));

      await useAssetStore.getState().deleteAsset('a1');

      const state = useAssetStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
    });
  });

  describe('loadPrice', () => {
    it('should load price and update prices map', async () => {
      const priceSnapshot: PriceSnapshot = {
        assetId: 'a1',
        price: new Decimal(150),
        change: new Decimal(5),
        changePercent: 3.45,
        timestamp: new Date(),
        source: 'yahoo',
      };

      mockPriceQueries.getLatestSnapshot.mockResolvedValue(priceSnapshot);

      await useAssetStore.getState().loadPrice('a1');

      const state = useAssetStore.getState();
      expect(state.prices.get('a1')).toEqual(priceSnapshot);
      expect(state.priceLoading).toBe(false);
    });

    it('should handle price not found', async () => {
      mockPriceQueries.getLatestSnapshot.mockResolvedValue(undefined);

      await useAssetStore.getState().loadPrice('a1');

      const state = useAssetStore.getState();
      expect(state.prices.has('a1')).toBe(false);
      expect(state.priceLoading).toBe(false);
    });

    it('should handle price loading errors silently', async () => {
      mockPriceQueries.getLatestSnapshot.mockRejectedValue(
        new Error('Price fetch failed')
      );

      // Should not throw
      await useAssetStore.getState().loadPrice('a1');

      const state = useAssetStore.getState();
      expect(state.priceLoading).toBe(false);
      // Error is logged but not stored in state
      expect(state.error).toBeNull();
    });
  });

  describe('loadPrices', () => {
    it('should load multiple prices successfully', async () => {
      const priceSnapshotA: PriceSnapshot = {
        assetId: 'a1',
        price: new Decimal(150),
        change: new Decimal(5),
        changePercent: 3.45,
        timestamp: new Date(),
        source: 'yahoo',
      };

      const priceSnapshotB: PriceSnapshot = {
        assetId: 'a2',
        price: new Decimal(300),
        change: new Decimal(-10),
        changePercent: -3.23,
        timestamp: new Date(),
        source: 'yahoo',
      };

      mockPriceQueries.getLatestSnapshot
        .mockResolvedValueOnce(priceSnapshotA)
        .mockResolvedValueOnce(priceSnapshotB);

      await useAssetStore.getState().loadPrices(['a1', 'a2']);

      const state = useAssetStore.getState();
      expect(state.prices.get('a1')).toEqual(priceSnapshotA);
      expect(state.prices.get('a2')).toEqual(priceSnapshotB);
      expect(state.priceLoading).toBe(false);
    });

    it('should handle partial failures using Promise.allSettled', async () => {
      const priceSnapshotA: PriceSnapshot = {
        assetId: 'a1',
        price: new Decimal(150),
        change: new Decimal(5),
        changePercent: 3.45,
        timestamp: new Date(),
        source: 'yahoo',
      };

      mockPriceQueries.getLatestSnapshot
        .mockResolvedValueOnce(priceSnapshotA)
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce(undefined);

      await useAssetStore.getState().loadPrices(['a1', 'a2', 'a3']);

      const state = useAssetStore.getState();
      expect(state.prices.get('a1')).toEqual(priceSnapshotA);
      expect(state.prices.has('a2')).toBe(false); // Failed
      expect(state.prices.has('a3')).toBe(false); // Returned undefined
      expect(state.priceLoading).toBe(false);
    });

    it('should preserve existing prices in map', async () => {
      const existingPrice: PriceSnapshot = {
        assetId: 'existing',
        price: new Decimal(100),
        change: new Decimal(0),
        changePercent: 0,
        timestamp: new Date(),
        source: 'yahoo',
      };

      const pricesMap = new Map<string, PriceSnapshot>();
      pricesMap.set('existing', existingPrice);

      useAssetStore.setState({ prices: pricesMap });

      const newPrice: PriceSnapshot = {
        assetId: 'a1',
        price: new Decimal(150),
        change: new Decimal(5),
        changePercent: 3.45,
        timestamp: new Date(),
        source: 'yahoo',
      };

      mockPriceQueries.getLatestSnapshot.mockResolvedValue(newPrice);

      await useAssetStore.getState().loadPrices(['a1']);

      const state = useAssetStore.getState();
      expect(state.prices.get('existing')).toEqual(existingPrice);
      expect(state.prices.get('a1')).toEqual(newPrice);
    });
  });

  describe('updatePrice', () => {
    it('should update prices map', () => {
      const priceSnapshot: PriceSnapshot = {
        assetId: 'a1',
        price: new Decimal(150),
        change: new Decimal(5),
        changePercent: 3.45,
        timestamp: new Date(),
        source: 'yahoo',
      };

      useAssetStore.getState().updatePrice('a1', priceSnapshot);

      const state = useAssetStore.getState();
      expect(state.prices.get('a1')).toEqual(priceSnapshot);
    });

    it('should sync asset currentPrice', () => {
      const asset = createMockAsset({ id: 'a1', currentPrice: 100 });

      useAssetStore.setState({ assets: [asset] });

      const priceSnapshot: PriceSnapshot = {
        assetId: 'a1',
        price: new Decimal(150),
        change: new Decimal(5),
        changePercent: 3.45,
        timestamp: new Date(),
        source: 'yahoo',
      };

      useAssetStore.getState().updatePrice('a1', priceSnapshot);

      const state = useAssetStore.getState();
      const updatedAsset = state.assets.find((a) => a.id === 'a1');
      expect(updatedAsset?.currentPrice).toBe(150);
      expect(updatedAsset?.priceUpdatedAt).toEqual(priceSnapshot.timestamp);
    });

    it('should update selectedAsset if it matches', () => {
      const asset = createMockAsset({ id: 'a1', currentPrice: 100 });

      useAssetStore.setState({
        assets: [asset],
        selectedAsset: asset,
      });

      const priceSnapshot: PriceSnapshot = {
        assetId: 'a1',
        price: new Decimal(150),
        change: new Decimal(5),
        changePercent: 3.45,
        timestamp: new Date(),
        source: 'yahoo',
      };

      useAssetStore.getState().updatePrice('a1', priceSnapshot);

      const state = useAssetStore.getState();
      expect(state.selectedAsset?.currentPrice).toBe(150);
    });

    it('should not update selectedAsset if it does not match', () => {
      const selectedAsset = createMockAsset({ id: 'a2', currentPrice: 200 });
      const otherAsset = createMockAsset({ id: 'a1', currentPrice: 100 });

      useAssetStore.setState({
        assets: [otherAsset, selectedAsset],
        selectedAsset,
      });

      const priceSnapshot: PriceSnapshot = {
        assetId: 'a1',
        price: new Decimal(150),
        change: new Decimal(5),
        changePercent: 3.45,
        timestamp: new Date(),
        source: 'yahoo',
      };

      useAssetStore.getState().updatePrice('a1', priceSnapshot);

      const state = useAssetStore.getState();
      expect(state.selectedAsset?.currentPrice).toBe(200);
    });
  });

  describe('selectAsset', () => {
    it('should set selected asset', () => {
      const asset = createMockAsset();

      mockPriceQueries.getLatestSnapshot.mockResolvedValue(undefined);

      useAssetStore.getState().selectAsset(asset);

      const state = useAssetStore.getState();
      expect(state.selectedAsset).toEqual(asset);
    });

    it('should trigger loadPrice when asset is selected', async () => {
      const asset = createMockAsset({ id: 'a1' });

      mockPriceQueries.getLatestSnapshot.mockResolvedValue(undefined);

      useAssetStore.getState().selectAsset(asset);

      // Wait for async loadPrice
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockPriceQueries.getLatestSnapshot).toHaveBeenCalledWith('a1');
    });

    it('should not trigger loadPrice when asset is null', () => {
      useAssetStore.getState().selectAsset(null);

      expect(mockPriceQueries.getLatestSnapshot).not.toHaveBeenCalled();

      const state = useAssetStore.getState();
      expect(state.selectedAsset).toBeNull();
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAssetStore.setState({ error: 'Some error' });

      useAssetStore.getState().clearError();

      const state = useAssetStore.getState();
      expect(state.error).toBeNull();
    });
  });
});
