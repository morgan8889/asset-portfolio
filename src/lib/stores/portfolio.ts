import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

import { Portfolio, PortfolioMetrics, Holding, Asset } from '@/types';
import { portfolioQueries, holdingQueries, assetQueries } from '@/lib/db';
import { generatePortfolioMetrics } from '@/lib/services';

interface PortfolioState {
  // State
  portfolios: Portfolio[];
  currentPortfolio: Portfolio | null;
  holdings: Holding[];
  assets: Asset[];
  metrics: PortfolioMetrics | null;
  loading: boolean;
  error: string | null;
  // Internal: track in-flight operations to prevent duplicate calls
  _loadingHoldingsForId: string | null;

  // Actions
  loadPortfolios: () => Promise<void>;
  setCurrentPortfolio: (portfolio: Portfolio | null) => void;
  createPortfolio: (portfolio: Omit<Portfolio, 'id'>) => Promise<void>;
  updatePortfolio: (id: string, updates: Partial<Portfolio>) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  loadHoldings: (portfolioId: string) => Promise<void>;
  calculateMetrics: (portfolioId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  clearError: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        portfolios: [],
        currentPortfolio: null,
        holdings: [],
        assets: [],
        metrics: null,
        loading: false,
        error: null,
        _loadingHoldingsForId: null,

        // Actions
        loadPortfolios: async () => {
          set({ loading: true, error: null });
          try {
            const portfolios = await portfolioQueries.getAll();

            // Get current portfolio (may be restored from localStorage via persist middleware)
            const { currentPortfolio } = get();

            // Verify persisted portfolio still exists, clear if not
            if (currentPortfolio) {
              const stillExists = portfolios.some((p) => p.id === currentPortfolio.id);
              if (!stillExists) {
                // Portfolio was deleted, clear the stale reference
                set({ currentPortfolio: portfolios[0] || null });
              }
            }

            set({ portfolios, loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load portfolios',
              loading: false,
            });
          }
        },

        setCurrentPortfolio: (portfolio) => {
          set({ currentPortfolio: portfolio });
          if (!portfolio) {
            set({ holdings: [], metrics: null });
          }
          // Note: loadHoldings and calculateMetrics are now triggered by useDashboardData hook
          // to avoid race conditions with persist middleware rehydration
        },

        createPortfolio: async (portfolioData) => {
          set({ loading: true, error: null });
          try {
            await portfolioQueries.create(portfolioData);
            await get().loadPortfolios();
            set({ loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create portfolio',
              loading: false,
            });
          }
        },

        updatePortfolio: async (id, updates) => {
          set({ loading: true, error: null });
          try {
            await portfolioQueries.update(id, updates);
            await get().loadPortfolios();

            // Update current portfolio if it's the one being updated
            const { currentPortfolio } = get();
            if (currentPortfolio && currentPortfolio.id === id) {
              const updatedPortfolio = await portfolioQueries.getById(id);
              if (updatedPortfolio) {
                set({ currentPortfolio: updatedPortfolio });
              }
            }
            set({ loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update portfolio',
              loading: false,
            });
          }
        },

        deletePortfolio: async (id) => {
          set({ loading: true, error: null });
          try {
            // Check if deleting current portfolio BEFORE loadPortfolios clears it
            const { currentPortfolio } = get();
            const wasCurrentDeleted = currentPortfolio?.id === id;

            await portfolioQueries.delete(id);
            await get().loadPortfolios();

            // Clear holdings/metrics if we deleted the current portfolio
            if (wasCurrentDeleted) {
              set({ currentPortfolio: null, holdings: [], metrics: null });
            }
            set({ loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to delete portfolio',
              loading: false,
            });
          }
        },

        loadHoldings: async (portfolioId) => {
          // Prevent duplicate/concurrent calls for the same portfolio
          const { _loadingHoldingsForId } = get();
          if (_loadingHoldingsForId === portfolioId) {
            return;
          }

          set({ loading: true, error: null, _loadingHoldingsForId: portfolioId });
          try {
            const holdings = await holdingQueries.getByPortfolio(portfolioId);
            const assets = await assetQueries.getAll();
            set({ holdings, assets, loading: false, _loadingHoldingsForId: null });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load holdings',
              loading: false,
              _loadingHoldingsForId: null,
            });
          }
        },

        calculateMetrics: async (portfolioId) => {
          try {
            const holdings = await holdingQueries.getByPortfolio(portfolioId);
            const assets = await assetQueries.getAll();

            // Use the services layer for metrics calculation
            const metrics = generatePortfolioMetrics(holdings, assets);

            set({ metrics });
          } catch (error) {
            set({
              error:
                error instanceof Error ? error.message : 'Failed to calculate metrics',
            });
          }
        },

        refreshData: async () => {
          const { currentPortfolio } = get();
          await get().loadPortfolios();
          if (currentPortfolio) {
            await get().loadHoldings(currentPortfolio.id);
            await get().calculateMetrics(currentPortfolio.id);
          }
        },

        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: 'portfolio-store',
        // Only persist currentPortfolio; internal flags like _loadingHoldingsForId should NOT be persisted
        partialize: (state) => ({
          currentPortfolio: state.currentPortfolio,
        }),
      }
    ),
    {
      name: 'portfolio-store',
    }
  )
);