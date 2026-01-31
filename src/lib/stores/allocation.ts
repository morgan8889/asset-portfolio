import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  TargetModel,
  RebalancingPlan,
  AllocationData,
  AllocationDimension,
} from '@/types/allocation';
import {
  getTargetModels,
  createTargetModel,
  updateTargetModel,
  deleteTargetModel,
  getRebalancingExclusions,
  addRebalancingExclusion,
  removeRebalancingExclusion,
} from '@/lib/services/allocation/target-service';
import { calculateRebalancingPlan } from '@/lib/services/allocation/rebalancing-service';
import { HoldingWithAsset } from '@/lib/services/allocation/rebalancing-service';

interface AllocationState {
  // State
  targetModels: TargetModel[];
  activeTargetModel: TargetModel | null;
  excludedPortfolioIds: string[];
  rebalancingPlan: RebalancingPlan | null;
  currentAllocation: AllocationData | null;
  selectedDimension: AllocationDimension;
  loading: boolean;
  error: string | null;

  // Actions
  loadTargetModels: () => Promise<void>;
  setActiveTargetModel: (model: TargetModel | null) => void;
  createTarget: (
    name: string,
    targets: Record<string, number>
  ) => Promise<void>;
  updateTarget: (
    id: string,
    updates: Partial<Omit<TargetModel, 'id' | 'lastUpdated'>>
  ) => Promise<void>;
  deleteTarget: (id: string) => Promise<void>;
  loadExclusions: () => Promise<void>;
  togglePortfolioExclusion: (portfolioId: string) => Promise<void>;
  setSelectedDimension: (dimension: AllocationDimension) => void;
  calculateRebalancing: (
    holdingsWithAssets: HoldingWithAsset[],
    dimension?: AllocationDimension
  ) => void;
  setCurrentAllocation: (allocation: AllocationData | null) => void;
  clearError: () => void;
  reset: () => void;
}

export const useAllocationStore = create<AllocationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      targetModels: [],
      activeTargetModel: null,
      excludedPortfolioIds: [],
      rebalancingPlan: null,
      currentAllocation: null,
      selectedDimension: 'assetClass',
      loading: false,
      error: null,

      // Actions
      loadTargetModels: async () => {
        set({ loading: true, error: null });
        try {
          const models = await getTargetModels();
          set({ targetModels: models, loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to load target models',
            loading: false,
          });
        }
      },

      setActiveTargetModel: (model) => {
        set({ activeTargetModel: model });
      },

      createTarget: async (name, targets) => {
        set({ loading: true, error: null });
        try {
          const newModel = await createTargetModel(name, targets);
          await get().loadTargetModels();
          set({ activeTargetModel: newModel, loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create target model',
            loading: false,
          });
          throw error;
        }
      },

      updateTarget: async (id, updates) => {
        set({ loading: true, error: null });
        try {
          const updatedModel = await updateTargetModel(id, updates);
          await get().loadTargetModels();

          // Update active model if it was the one being updated
          const { activeTargetModel } = get();
          if (activeTargetModel?.id === id) {
            set({ activeTargetModel: updatedModel });
          }

          set({ loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to update target model',
            loading: false,
          });
          throw error;
        }
      },

      deleteTarget: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteTargetModel(id);
          await get().loadTargetModels();

          // Clear active model if it was deleted
          const { activeTargetModel } = get();
          if (activeTargetModel?.id === id) {
            set({ activeTargetModel: null, rebalancingPlan: null });
          }

          set({ loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to delete target model',
            loading: false,
          });
          throw error;
        }
      },

      loadExclusions: async () => {
        try {
          const exclusions = await getRebalancingExclusions();
          set({ excludedPortfolioIds: exclusions });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to load exclusions',
          });
        }
      },

      togglePortfolioExclusion: async (portfolioId) => {
        const { excludedPortfolioIds } = get();
        try {
          if (excludedPortfolioIds.includes(portfolioId)) {
            await removeRebalancingExclusion(portfolioId);
          } else {
            await addRebalancingExclusion(portfolioId);
          }
          await get().loadExclusions();
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to toggle exclusion',
          });
        }
      },

      setSelectedDimension: (dimension) => {
        set({ selectedDimension: dimension });
      },

      calculateRebalancing: (holdingsWithAssets, dimension) => {
        const { activeTargetModel, excludedPortfolioIds, selectedDimension } =
          get();

        if (!activeTargetModel) {
          set({ rebalancingPlan: null });
          return;
        }

        try {
          const plan = calculateRebalancingPlan(
            holdingsWithAssets,
            activeTargetModel.name,
            activeTargetModel.targets,
            dimension || selectedDimension,
            excludedPortfolioIds
          );
          set({ rebalancingPlan: plan, error: null });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to calculate rebalancing plan',
            rebalancingPlan: null,
          });
        }
      },

      setCurrentAllocation: (allocation) => {
        set({ currentAllocation: allocation });
      },

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set({
          targetModels: [],
          activeTargetModel: null,
          excludedPortfolioIds: [],
          rebalancingPlan: null,
          currentAllocation: null,
          selectedDimension: 'assetClass',
          loading: false,
          error: null,
        });
      },
    }),
    { name: 'AllocationStore' }
  )
);
