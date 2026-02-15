/**
 * Tests for Analysis Store
 *
 * Tests analysis state management, health score calculations,
 * recommendation generation, and rebalancing plan operations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAnalysisStore } from '../analysis';
import { ANALYSIS_PROFILES } from '@/types/analysis';
import Decimal from 'decimal.js';

// Mock the database and services
vi.mock('@/lib/db', () => ({
  holdingQueries: {
    getByPortfolio: vi.fn(() => Promise.resolve([])),
  },
  assetQueries: {
    getAll: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('@/lib/services/analysis/scoring-service', () => ({
  calculateHealthScore: vi.fn(() => ({
    overallScore: 75,
    metrics: [],
    profile: { name: 'Balanced', weights: {} },
    calculatedAt: new Date(),
  })),
}));

vi.mock('@/lib/services/analysis/recommendation-engine', () => ({
  generateRecommendations: vi.fn(() => []),
}));

vi.mock('@/lib/services/analysis/rebalancing-service', () => ({
  calculateRebalancing: vi.fn(() => ({
    totalValue: new Decimal(100000),
    trades: [],
    impact: new Decimal(0),
  })),
  validateTargetModel: vi.fn(() => true),
}));

describe('Analysis Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAnalysisStore.setState({
      health: null,
      recommendations: [],
      rebalancingPlan: null,
      targetModels: [],
      activeProfile: ANALYSIS_PROFILES[1], // Balanced
      activeTargetModelId: null,
      isCalculating: false,
      error: null,
    });

    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useAnalysisStore.getState();

      expect(state.health).toBeNull();
      expect(state.recommendations).toEqual([]);
      expect(state.rebalancingPlan).toBeNull();
      expect(state.targetModels).toEqual([]);
      expect(state.activeProfile).toEqual(ANALYSIS_PROFILES[1]);
      expect(state.activeTargetModelId).toBeNull();
      expect(state.isCalculating).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should default to Balanced profile', () => {
      const state = useAnalysisStore.getState();

      expect(state.activeProfile.name).toBe('Balanced');
    });
  });

  describe('calculateHealth', () => {
    it('should calculate health score for portfolio with holdings', async () => {
      const mockHoldings = [
        {
          id: '1',
          assetId: 'asset-1',
          quantity: new Decimal(100),
          currentValue: new Decimal(10000),
          costBasis: new Decimal(9000),
        },
      ];

      const mockAssets = [
        {
          id: 'asset-1',
          symbol: 'AAPL',
          name: 'Apple Inc.',
          assetClass: 'stocks',
        },
      ];

      const { holdingQueries, assetQueries } = await import('@/lib/db');
      (holdingQueries.getByPortfolio as any).mockResolvedValue(mockHoldings);
      (assetQueries.getAll as any).mockResolvedValue(mockAssets);

      await useAnalysisStore.getState().calculateHealth('portfolio-1');

      const state = useAnalysisStore.getState();
      expect(state.health).toBeTruthy();
      expect(state.health?.overallScore).toBe(75);
      expect(state.isCalculating).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle empty portfolio gracefully', async () => {
      const { holdingQueries } = await import('@/lib/db');
      (holdingQueries.getByPortfolio as any).mockResolvedValue([]);

      await useAnalysisStore.getState().calculateHealth('portfolio-1');

      const state = useAnalysisStore.getState();
      expect(state.health).toBeNull();
      expect(state.isCalculating).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle zero portfolio value', async () => {
      const mockHoldings = [
        {
          id: '1',
          assetId: 'asset-1',
          quantity: new Decimal(0),
          currentValue: new Decimal(0),
          costBasis: new Decimal(0),
        },
      ];

      const { holdingQueries } = await import('@/lib/db');
      (holdingQueries.getByPortfolio as any).mockResolvedValue(mockHoldings);

      await useAnalysisStore.getState().calculateHealth('portfolio-1');

      const state = useAnalysisStore.getState();
      expect(state.health).toBeNull();
      expect(state.isCalculating).toBe(false);
    });

    it('should set calculating state during operation', async () => {
      const { holdingQueries } = await import('@/lib/db');

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (holdingQueries.getByPortfolio as any).mockReturnValue(promise);

      const calculatePromise = useAnalysisStore
        .getState()
        .calculateHealth('portfolio-1');

      // Check calculating state
      expect(useAnalysisStore.getState().isCalculating).toBe(true);

      // Resolve the promise
      resolvePromise!([]);
      await calculatePromise;

      expect(useAnalysisStore.getState().isCalculating).toBe(false);
    });

    it('should handle calculation errors', async () => {
      const { holdingQueries } = await import('@/lib/db');
      (holdingQueries.getByPortfolio as any).mockRejectedValue(
        new Error('Database error')
      );

      await useAnalysisStore.getState().calculateHealth('portfolio-1');

      const state = useAnalysisStore.getState();
      expect(state.health).toBeNull();
      expect(state.isCalculating).toBe(false);
      expect(state.error).toBe('Database error');
    });
  });

  describe('generateRecommendations', () => {
    it('should generate recommendations for portfolio', async () => {
      const { holdingQueries, assetQueries } = await import('@/lib/db');

      const mockHoldings = [
        {
          id: '1',
          portfolioId: 'portfolio-1',
          assetId: 'AAPL',
          quantity: new Decimal(10),
          currentValue: new Decimal(1500),
          unrealizedGain: new Decimal(100),
        },
      ];
      (holdingQueries.getByPortfolio as any).mockResolvedValue(mockHoldings);
      (assetQueries.getAll as any).mockResolvedValue([]);

      const mockRecommendations = [
        {
          id: 'rec-1',
          type: 'diversification' as const,
          severity: 'medium' as const,
          title: 'Improve diversification',
          description: 'Add bonds to portfolio',
        },
      ];

      const { generateRecommendations } = await import(
        '@/lib/services/analysis/recommendation-engine'
      );
      (generateRecommendations as any).mockReturnValue(mockRecommendations);

      await useAnalysisStore.getState().generateRecommendations('portfolio-1');

      const state = useAnalysisStore.getState();
      expect(state.recommendations).toEqual(mockRecommendations);
      expect(state.isCalculating).toBe(false);
    });

    it('should handle recommendation generation errors', async () => {
      const { holdingQueries } = await import('@/lib/db');
      (holdingQueries.getByPortfolio as any).mockRejectedValue(
        new Error('Database error')
      );

      await useAnalysisStore.getState().generateRecommendations('portfolio-1');

      const state = useAnalysisStore.getState();
      expect(state.recommendations).toEqual([]);
      expect(state.error).toBe('Database error');
    });
  });

  describe('setActiveProfile', () => {
    it('should set active analysis profile', () => {
      const growthProfile = ANALYSIS_PROFILES[0];

      useAnalysisStore.getState().setActiveProfile(growthProfile.id);

      expect(useAnalysisStore.getState().activeProfile).toEqual(growthProfile);
    });

    it('should allow switching between profiles', () => {
      const growth = ANALYSIS_PROFILES[0];
      const safety = ANALYSIS_PROFILES[2];

      useAnalysisStore.getState().setActiveProfile(growth.id);
      expect(useAnalysisStore.getState().activeProfile.name).toBe('Growth');

      useAnalysisStore.getState().setActiveProfile(safety.id);
      expect(useAnalysisStore.getState().activeProfile.name).toBe('Safety');
    });
  });

  describe('setActiveTargetModel', () => {
    it('should set active target model by ID', () => {
      useAnalysisStore.getState().setActiveTargetModel('model-1');

      expect(useAnalysisStore.getState().activeTargetModelId).toBe('model-1');
    });

    it('should allow clearing active target model', () => {
      useAnalysisStore.setState({ activeTargetModelId: 'model-1' });

      useAnalysisStore.getState().setActiveTargetModel(null);

      expect(useAnalysisStore.getState().activeTargetModelId).toBeNull();
    });
  });

  describe('calculateRebalancing', () => {
    it('should calculate rebalancing plan', async () => {
      const { holdingQueries, assetQueries } = await import('@/lib/db');

      const mockHoldings = [
        {
          id: '1',
          portfolioId: 'portfolio-1',
          assetId: 'AAPL',
          quantity: new Decimal(10),
          currentValue: new Decimal(1500),
          unrealizedGain: new Decimal(100),
        },
      ];
      (holdingQueries.getByPortfolio as any).mockResolvedValue(mockHoldings);
      (assetQueries.getAll as any).mockResolvedValue([]);

      const mockPlan = {
        totalValue: new Decimal(100000),
        trades: [
          {
            symbol: 'AAPL',
            action: 'buy' as const,
            shares: 10,
            value: new Decimal(1500),
          },
        ],
        impact: new Decimal(100),
      };

      // Set up a target model first
      useAnalysisStore.setState({
        targetModels: [
          {
            id: 'model-1',
            name: 'Test Model',
            isSystem: false,
            allocations: { stock: 60, bond: 40 } as Record<string, number>,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      const { calculateRebalancing } = await import(
        '@/lib/services/analysis/rebalancing-service'
      );
      (calculateRebalancing as any).mockReturnValue(mockPlan);

      await useAnalysisStore
        .getState()
        .calculateRebalancing('portfolio-1', 'model-1');

      const state = useAnalysisStore.getState();
      expect(state.rebalancingPlan).toEqual(mockPlan);
      expect(state.isCalculating).toBe(false);
    });

    it('should handle rebalancing calculation errors', async () => {
      const { holdingQueries, assetQueries } = await import('@/lib/db');
      const { calculateRebalancing } = await import(
        '@/lib/services/analysis/rebalancing-service'
      );

      // Mock successful database calls
      const mockHoldings = [
        {
          id: '1',
          portfolioId: 'portfolio-1',
          assetId: 'AAPL',
          quantity: new Decimal(10),
          currentValue: new Decimal(1500),
          unrealizedGain: new Decimal(100),
        },
      ];
      (holdingQueries.getByPortfolio as any).mockResolvedValue(mockHoldings);
      (assetQueries.getAll as any).mockResolvedValue([]);

      // Set up a target model first
      useAnalysisStore.setState({
        targetModels: [
          {
            id: 'model-1',
            name: 'Test Model',
            isSystem: false,
            allocations: { stock: 60, bond: 40 } as Record<string, number>,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      // Mock service to throw error
      (calculateRebalancing as any).mockImplementation(() => {
        throw new Error('Calculation failed');
      });

      await useAnalysisStore
        .getState()
        .calculateRebalancing('portfolio-1', 'model-1');

      const state = useAnalysisStore.getState();
      expect(state.rebalancingPlan).toBeNull();
      expect(state.error).toBe('Calculation failed');
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAnalysisStore.setState({ error: 'Test error' });

      useAnalysisStore.getState().clearError();

      expect(useAnalysisStore.getState().error).toBeNull();
    });
  });

  describe('refreshAnalysis', () => {
    it('should refresh all analysis data', async () => {
      const { calculateHealthScore } = await import(
        '@/lib/services/analysis/scoring-service'
      );
      const { generateRecommendations } = await import(
        '@/lib/services/analysis/recommendation-engine'
      );
      const { calculateRebalancing } = await import(
        '@/lib/services/analysis/rebalancing-service'
      );

      const mockHoldings = [
        {
          id: '1',
          portfolioId: 'portfolio-1',
          assetId: 'AAPL',
          quantity: new Decimal(10),
          currentValue: new Decimal(1500),
          unrealizedGain: new Decimal(100),
        },
      ];

      const { holdingQueries } = await import('@/lib/db');
      (holdingQueries.getByPortfolio as any).mockResolvedValue(mockHoldings);

      // Set active target model
      useAnalysisStore.setState({
        activeTargetModelId: 'model-1',
        targetModels: [
          {
            id: 'model-1',
            name: 'Test Model',
            isSystem: false,
            allocations: { stock: 60, bond: 40 } as Record<string, number>,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      });

      await useAnalysisStore.getState().refreshAnalysis('portfolio-1');

      expect(calculateHealthScore).toHaveBeenCalled();
      expect(generateRecommendations).toHaveBeenCalled();
      expect(calculateRebalancing).toHaveBeenCalled();
    });
  });
});
