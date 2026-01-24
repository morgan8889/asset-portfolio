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

        // Actions
        loadPortfolios: async () => {
          set({ loading: true, error: null });
          try {
            const portfolios = await portfolioQueries.getAll();
            set({ portfolios, loading: false });

            // Set current portfolio if none selected and portfolios exist
            const { currentPortfolio } = get();
            if (!currentPortfolio && portfolios.length > 0) {
              set({ currentPortfolio: portfolios[0] });
            }
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load portfolios',
              loading: false,
            });
          }
        },

        setCurrentPortfolio: (portfolio) => {
          set({ currentPortfolio: portfolio });
          if (portfolio) {
            get().loadHoldings(portfolio.id);
            get().calculateMetrics(portfolio.id);
          } else {
            set({ holdings: [], metrics: null });
          }
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
            await portfolioQueries.delete(id);
            await get().loadPortfolios();

            // Clear current portfolio if it was deleted
            const { currentPortfolio } = get();
            if (currentPortfolio && currentPortfolio.id === id) {
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
          set({ loading: true, error: null });
          try {
            const holdings = await holdingQueries.getByPortfolio(portfolioId);
            const assets = await assetQueries.getAll();
            set({ holdings, assets, loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load holdings',
              loading: false,
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