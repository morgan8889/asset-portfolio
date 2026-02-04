/**
 * Tests for Allocation Store
 *
 * Tests allocation state management, target model operations,
 * rebalancing plan calculations, and portfolio exclusion handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAllocationStore } from '../allocation';
import { TargetModel, AllocationDimension, AllocationData } from '@/types/allocation';

// Mock the allocation services
vi.mock('@/lib/services/allocation/target-service', () => ({
  getTargetModels: vi.fn(() => Promise.resolve([])),
  createTargetModel: vi.fn((name, targets) =>
    Promise.resolve({
      id: 'model-1',
      name,
      targets,
      lastUpdated: new Date(),
    })
  ),
  updateTargetModel: vi.fn((id, updates) => Promise.resolve()),
  deleteTargetModel: vi.fn((id) => Promise.resolve()),
  getRebalancingExclusions: vi.fn(() => Promise.resolve([])),
  addRebalancingExclusion: vi.fn((portfolioId) => Promise.resolve()),
  removeRebalancingExclusion: vi.fn((portfolioId) => Promise.resolve()),
}));

vi.mock('@/lib/services/allocation/rebalancing-service', () => ({
  calculateRebalancingPlan: vi.fn(() => ({
    totalValue: 100000,
    targetAllocations: [],
    currentAllocations: [],
    recommendations: [],
    executionPlan: [],
  })),
}));

describe('Allocation Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAllocationStore.setState({
      targetModels: [],
      activeTargetModel: null,
      excludedPortfolioIds: [],
      rebalancingPlan: null,
      currentAllocation: null,
      selectedDimension: 'assetClass',
      loading: false,
      error: null,
    });

    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAllocationStore.getState();

      expect(state.targetModels).toEqual([]);
      expect(state.activeTargetModel).toBeNull();
      expect(state.excludedPortfolioIds).toEqual([]);
      expect(state.rebalancingPlan).toBeNull();
      expect(state.currentAllocation).toBeNull();
      expect(state.selectedDimension).toBe('assetClass');
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loadTargetModels', () => {
    it('should load target models successfully', async () => {
      const mockModels: TargetModel[] = [
        {
          id: 'model-1',
          name: 'Aggressive',
          targets: { stocks: 80, bonds: 20 },
          lastUpdated: new Date(),
        },
        {
          id: 'model-2',
          name: 'Conservative',
          targets: { stocks: 40, bonds: 60 },
          lastUpdated: new Date(),
        },
      ];

      const { getTargetModels } = await import('@/lib/services/allocation/target-service');
      (getTargetModels as any).mockResolvedValue(mockModels);

      await useAllocationStore.getState().loadTargetModels();

      const state = useAllocationStore.getState();
      expect(state.targetModels).toEqual(mockModels);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle load errors gracefully', async () => {
      const { getTargetModels } = await import('@/lib/services/allocation/target-service');
      (getTargetModels as any).mockRejectedValue(new Error('Database error'));

      await useAllocationStore.getState().loadTargetModels();

      const state = useAllocationStore.getState();
      expect(state.targetModels).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Database error');
    });

    it('should set loading state during fetch', async () => {
      const { getTargetModels } = await import('@/lib/services/allocation/target-service');

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (getTargetModels as any).mockReturnValue(promise);

      const loadPromise = useAllocationStore.getState().loadTargetModels();

      // Check loading state
      expect(useAllocationStore.getState().loading).toBe(true);

      // Resolve the promise
      resolvePromise!([]);
      await loadPromise;

      expect(useAllocationStore.getState().loading).toBe(false);
    });
  });

  describe('setActiveTargetModel', () => {
    it('should set active target model', () => {
      const mockModel: TargetModel = {
        id: 'model-1',
        name: 'Balanced',
        targets: { stocks: 60, bonds: 40 },
        lastUpdated: new Date(),
      };

      useAllocationStore.getState().setActiveTargetModel(mockModel);

      expect(useAllocationStore.getState().activeTargetModel).toEqual(mockModel);
    });

    it('should allow clearing active model', () => {
      const mockModel: TargetModel = {
        id: 'model-1',
        name: 'Balanced',
        targets: { stocks: 60, bonds: 40 },
        lastUpdated: new Date(),
      };

      useAllocationStore.getState().setActiveTargetModel(mockModel);
      expect(useAllocationStore.getState().activeTargetModel).toEqual(mockModel);

      useAllocationStore.getState().setActiveTargetModel(null);
      expect(useAllocationStore.getState().activeTargetModel).toBeNull();
    });
  });

  describe('createTarget', () => {
    it('should create new target model', async () => {
      const targets = { stocks: 70, bonds: 30 };
      const mockModel: TargetModel = {
        id: 'new-model',
        name: 'Growth',
        targets,
        lastUpdated: new Date(),
      };

      const { createTargetModel } = await import('@/lib/services/allocation/target-service');
      (createTargetModel as any).mockResolvedValue(mockModel);

      await useAllocationStore.getState().createTarget('Growth', targets);

      expect(createTargetModel).toHaveBeenCalledWith('Growth', targets);
      expect(useAllocationStore.getState().activeTargetModel).toEqual(mockModel);
    });

    it('should handle creation errors', async () => {
      const { createTargetModel, getTargetModels } = await import('@/lib/services/allocation/target-service');
      (createTargetModel as any).mockRejectedValue(new Error('Creation failed'));
      (getTargetModels as any).mockResolvedValue([]); // Don't throw on reload

      // The store re-throws the error, so we need to catch it
      await expect(
        useAllocationStore.getState().createTarget('Test', { stocks: 100 })
      ).rejects.toThrow('Creation failed');

      expect(useAllocationStore.getState().error).toBe('Creation failed');
      expect(useAllocationStore.getState().activeTargetModel).toBeNull();
    });
  });

  describe('updateTarget', () => {
    it('should update existing target model', async () => {
      const updates = { name: 'Updated Name' };

      await useAllocationStore.getState().updateTarget('model-1', updates);

      const { updateTargetModel } = await import('@/lib/services/allocation/target-service');
      expect(updateTargetModel).toHaveBeenCalledWith('model-1', updates);
    });

    it('should reload models after update', async () => {
      const { getTargetModels } = await import('@/lib/services/allocation/target-service');

      await useAllocationStore.getState().updateTarget('model-1', { name: 'New Name' });

      expect(getTargetModels).toHaveBeenCalled();
    });
  });

  describe('deleteTarget', () => {
    it('should delete target model', async () => {
      await useAllocationStore.getState().deleteTarget('model-1');

      const { deleteTargetModel } = await import('@/lib/services/allocation/target-service');
      expect(deleteTargetModel).toHaveBeenCalledWith('model-1');
    });

    it('should reload models after deletion', async () => {
      const { getTargetModels } = await import('@/lib/services/allocation/target-service');

      await useAllocationStore.getState().deleteTarget('model-1');

      expect(getTargetModels).toHaveBeenCalled();
    });

    it('should clear active model if deleted', async () => {
      const mockModel: TargetModel = {
        id: 'model-1',
        name: 'Test',
        targets: { stocks: 100 },
        lastUpdated: new Date(),
      };

      useAllocationStore.setState({ activeTargetModel: mockModel });

      await useAllocationStore.getState().deleteTarget('model-1');

      expect(useAllocationStore.getState().activeTargetModel).toBeNull();
    });
  });

  describe('Portfolio Exclusions', () => {
    it('should load exclusions', async () => {
      const mockExclusions = ['portfolio-1', 'portfolio-2'];

      const { getRebalancingExclusions } = await import('@/lib/services/allocation/target-service');
      (getRebalancingExclusions as any).mockResolvedValue(mockExclusions);

      await useAllocationStore.getState().loadExclusions();

      expect(useAllocationStore.getState().excludedPortfolioIds).toEqual(mockExclusions);
    });

    it('should toggle portfolio exclusion - add', async () => {
      useAllocationStore.setState({ excludedPortfolioIds: [] });

      await useAllocationStore.getState().togglePortfolioExclusion('portfolio-1');

      const { addRebalancingExclusion } = await import('@/lib/services/allocation/target-service');
      expect(addRebalancingExclusion).toHaveBeenCalledWith('portfolio-1');
    });

    it('should toggle portfolio exclusion - remove', async () => {
      useAllocationStore.setState({ excludedPortfolioIds: ['portfolio-1'] });

      await useAllocationStore.getState().togglePortfolioExclusion('portfolio-1');

      const { removeRebalancingExclusion } = await import('@/lib/services/allocation/target-service');
      expect(removeRebalancingExclusion).toHaveBeenCalledWith('portfolio-1');
    });
  });

  describe('Dimension Selection', () => {
    it('should set selected dimension', () => {
      useAllocationStore.getState().setSelectedDimension('assetClass');

      expect(useAllocationStore.getState().selectedDimension).toBe('assetClass');
    });

    it('should update dimension to region', () => {
      useAllocationStore.getState().setSelectedDimension('region');

      expect(useAllocationStore.getState().selectedDimension).toBe('region');
    });
  });

  describe('Rebalancing Calculations', () => {
    it('should not calculate rebalancing plan when no active target model', () => {
      const mockHoldings: any[] = [
        { holding: { quantity: 100 }, asset: { symbol: 'AAPL', assetClass: 'stocks' } },
      ];

      // No active target model set
      useAllocationStore.setState({ activeTargetModel: null });

      useAllocationStore.getState().calculateRebalancing(mockHoldings, 'assetClass');

      // Should set rebalancing plan to null when no target model
      expect(useAllocationStore.getState().rebalancingPlan).toBeNull();
    });

    it('should calculate rebalancing plan with active target model', async () => {
      const mockModel: TargetModel = {
        id: 'model-1',
        name: 'Balanced',
        targets: { stocks: 60, bonds: 40 },
        lastUpdated: new Date(),
      };

      useAllocationStore.setState({ activeTargetModel: mockModel });

      const mockHoldings: any[] = [
        { holding: { quantity: 100 }, asset: { symbol: 'AAPL', assetClass: 'stocks' } },
      ];

      useAllocationStore.getState().calculateRebalancing(mockHoldings, 'assetClass');

      const { calculateRebalancingPlan } = await import('@/lib/services/allocation/rebalancing-service');
      expect(calculateRebalancingPlan).toHaveBeenCalledWith(
        mockHoldings,
        'Balanced',
        { stocks: 60, bonds: 40 },
        'assetClass',
        []
      );
      expect(useAllocationStore.getState().rebalancingPlan).toBeTruthy();
    });

    it('should use selected dimension when no dimension specified', async () => {
      const mockModel: TargetModel = {
        id: 'model-1',
        name: 'Test',
        targets: { stocks: 80, bonds: 20 },
        lastUpdated: new Date(),
      };

      useAllocationStore.setState({
        activeTargetModel: mockModel,
        selectedDimension: 'region',
      });

      const mockHoldings: any[] = [];
      useAllocationStore.getState().calculateRebalancing(mockHoldings); // No dimension specified

      const { calculateRebalancingPlan } = await import('@/lib/services/allocation/rebalancing-service');
      expect(calculateRebalancingPlan).toHaveBeenCalledWith(
        mockHoldings,
        'Test',
        { stocks: 80, bonds: 20 },
        'region', // Uses selected dimension
        []
      );
    });
  });

  describe('Current Allocation', () => {
    it('should set current allocation', () => {
      const mockAllocation: AllocationData = {
        dimension: 'assetClass' as AllocationDimension,
        breakdown: [
          { category: 'stocks', value: '80000', percentage: 80, count: 10 },
          { category: 'bonds', value: '20000', percentage: 20, count: 5 },
        ],
        totalValue: '100000',
        hasUnclassified: false,
      };

      useAllocationStore.getState().setCurrentAllocation(mockAllocation);

      expect(useAllocationStore.getState().currentAllocation).toEqual(mockAllocation);
    });

    it('should allow clearing current allocation', () => {
      const mockAllocation: AllocationData = {
        dimension: 'assetClass' as AllocationDimension,
        breakdown: [{ category: 'stocks', value: '100000', percentage: 100, count: 1 }],
        totalValue: '100000',
        hasUnclassified: false,
      };

      useAllocationStore.setState({ currentAllocation: mockAllocation });
      useAllocationStore.getState().setCurrentAllocation(null);

      expect(useAllocationStore.getState().currentAllocation).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should clear error state', () => {
      useAllocationStore.setState({ error: 'Test error' });

      useAllocationStore.getState().clearError();

      expect(useAllocationStore.getState().error).toBeNull();
    });
  });

  describe('Reset', () => {
    it('should reset store to initial state', () => {
      // Set various state values
      useAllocationStore.setState({
        targetModels: [
          { id: '1', name: 'Test', targets: {}, lastUpdated: new Date() },
        ],
        activeTargetModel: { id: '1', name: 'Test', targets: {}, lastUpdated: new Date() },
        excludedPortfolioIds: ['portfolio-1'],
        error: 'Some error',
        selectedDimension: 'region',
      });

      // Reset
      useAllocationStore.getState().reset();

      // Verify reset to initial state
      const state = useAllocationStore.getState();
      expect(state.targetModels).toEqual([]);
      expect(state.activeTargetModel).toBeNull();
      expect(state.excludedPortfolioIds).toEqual([]);
      expect(state.rebalancingPlan).toBeNull();
      expect(state.currentAllocation).toBeNull();
      expect(state.selectedDimension).toBe('assetClass');
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
