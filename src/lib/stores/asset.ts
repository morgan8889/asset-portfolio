import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Decimal } from 'decimal.js';

import { Asset, PriceSnapshot } from '@/types';
import { assetQueries, priceQueries } from '@/lib/db';

interface AssetState {
  // State
  assets: Asset[];
  selectedAsset: Asset | null;
  prices: Map<string, PriceSnapshot>;
  searchResults: Asset[];
  loading: boolean;
  priceLoading: boolean;
  error: string | null;

  // Actions
  loadAssets: () => Promise<void>;
  searchAssets: (query: string) => Promise<void>;
  selectAsset: (asset: Asset | null) => void;
  createAsset: (asset: Omit<Asset, 'id'>) => Promise<string>;
  updateAsset: (id: string, updates: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  loadPrice: (assetId: string) => Promise<void>;
  loadPrices: (assetIds: string[]) => Promise<void>;
  updatePrice: (assetId: string, price: PriceSnapshot) => void;
  clearSearch: () => void;
  clearError: () => void;
}

export const useAssetStore = create<AssetState>()(
  devtools(
    (set, get) => ({
      // Initial state
      assets: [],
      selectedAsset: null,
      prices: new Map(),
      searchResults: [],
      loading: false,
      priceLoading: false,
      error: null,

      // Actions
      loadAssets: async () => {
        set({ loading: true, error: null });
        try {
          const assets = await assetQueries.getAll();
          set({ assets, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load assets',
            loading: false,
          });
        }
      },

      searchAssets: async (query) => {
        if (!query.trim()) {
          set({ searchResults: [] });
          return;
        }

        set({ loading: true, error: null });
        try {
          const results = await assetQueries.search(query);
          set({ searchResults: results, loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to search assets',
            loading: false,
          });
        }
      },

      selectAsset: (asset) => {
        set({ selectedAsset: asset });
        if (asset) {
          get().loadPrice(asset.id);
        }
      },

      createAsset: async (assetData) => {
        set({ loading: true, error: null });
        try {
          const id = await assetQueries.create(assetData);
          await get().loadAssets();
          set({ loading: false });
          return id;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create asset',
            loading: false,
          });
          throw error;
        }
      },

      updateAsset: async (id, updates) => {
        set({ loading: true, error: null });
        try {
          await assetQueries.update(id, updates);
          await get().loadAssets();

          // Update selected asset if it's the one being updated
          const { selectedAsset } = get();
          if (selectedAsset && selectedAsset.id === id) {
            const updatedAsset = await assetQueries.getById(id);
            if (updatedAsset) {
              set({ selectedAsset: updatedAsset });
            }
          }
          set({ loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update asset',
            loading: false,
          });
        }
      },

      deleteAsset: async (id) => {
        set({ loading: true, error: null });
        try {
          await assetQueries.delete(id);
          await get().loadAssets();

          // Clear selected asset if it was deleted
          const { selectedAsset } = get();
          if (selectedAsset && selectedAsset.id === id) {
            set({ selectedAsset: null });
          }

          // Remove from prices map
          const { prices } = get();
          const newPrices = new Map(prices);
          newPrices.delete(id);
          set({ prices: newPrices });

          set({ loading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete asset',
            loading: false,
          });
        }
      },

      loadPrice: async (assetId) => {
        set({ priceLoading: true });
        try {
          const price = await priceQueries.getLatestSnapshot(assetId);
          if (price) {
            const { prices } = get();
            const newPrices = new Map(prices);
            newPrices.set(assetId, price);
            set({ prices: newPrices });
          }
          set({ priceLoading: false });
        } catch (error) {
          console.error('Failed to load price for asset:', assetId, error);
          set({ priceLoading: false });
        }
      },

      loadPrices: async (assetIds) => {
        set({ priceLoading: true });
        try {
          const pricePromises = assetIds.map((id) => priceQueries.getLatestSnapshot(id));
          const priceResults = await Promise.allSettled(pricePromises);

          const { prices } = get();
          const newPrices = new Map(prices);

          priceResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
              newPrices.set(assetIds[index], result.value);
            }
          });

          set({ prices: newPrices, priceLoading: false });
        } catch (error) {
          console.error('Failed to load prices:', error);
          set({ priceLoading: false });
        }
      },

      updatePrice: (assetId, price) => {
        const { prices } = get();
        const newPrices = new Map(prices);
        newPrices.set(assetId, price);
        set({ prices: newPrices });

        // Update asset's current price if it exists
        const { assets, selectedAsset } = get();
        const updatedAssets = assets.map((asset) =>
          asset.id === assetId
            ? {
                ...asset,
                currentPrice: price.price.toNumber(),
                priceUpdatedAt: price.timestamp,
              }
            : asset
        );
        set({ assets: updatedAssets });

        // Update selected asset if it matches
        if (selectedAsset && selectedAsset.id === assetId) {
          set({
            selectedAsset: {
              ...selectedAsset,
              currentPrice: price.price.toNumber(),
              priceUpdatedAt: price.timestamp,
            },
          });
        }
      },

      clearSearch: () => {
        set({ searchResults: [] });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'asset-store',
    }
  )
);