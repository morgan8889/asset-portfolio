import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Decimal } from 'decimal.js';
import { Portfolio, Holding, PortfolioSettings } from '@/types';

// Use vi.hoisted to define mocks that can be referenced by hoisted vi.mock
const { mockPortfolioQueries, mockHoldingQueries, mockAssetQueries } =
  vi.hoisted(() => ({
    mockPortfolioQueries: {
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mockHoldingQueries: {
      getByPortfolio: vi.fn(),
    },
    mockAssetQueries: {
      getAll: vi.fn(),
    },
  }));

vi.mock('@/lib/db', () => ({
  portfolioQueries: mockPortfolioQueries,
  holdingQueries: mockHoldingQueries,
  assetQueries: mockAssetQueries,
  HoldingsCalculator: {
    updateHoldingsForTransaction: vi.fn(),
    recalculatePortfolioHoldings: vi.fn(),
  },
}));

// Import after mock is set up
import { usePortfolioStore } from '../portfolio';
import { resetCounters } from '@/test-utils';

const defaultSettings: PortfolioSettings = {
  rebalanceThreshold: 5,
  taxStrategy: 'fifo',
};

describe('Portfolio Store', () => {
  beforeEach(() => {
    resetCounters();
    vi.clearAllMocks();
    usePortfolioStore.setState({
      portfolios: [],
      currentPortfolio: null,
      holdings: [],
      assets: [],
      metrics: null,
      loading: false,
      error: null,
    });
    mockAssetQueries.getAll.mockResolvedValue([]);
    mockPortfolioQueries.update.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadPortfolios', () => {
    it('should load portfolios without auto-selecting when none is current', async () => {
      const mockPortfolios: Portfolio[] = [
        {
          id: '1',
          name: 'Portfolio 1',
          type: 'taxable',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: defaultSettings,
        },
        {
          id: '2',
          name: 'Portfolio 2',
          type: 'taxable',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: defaultSettings,
        },
      ];

      mockPortfolioQueries.getAll.mockResolvedValue(mockPortfolios);

      await usePortfolioStore.getState().loadPortfolios();

      const state = usePortfolioStore.getState();
      expect(state.portfolios).toEqual(mockPortfolios);
      // loadPortfolios does not auto-select first portfolio - currentPortfolio stays null
      expect(state.currentPortfolio).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle loading errors gracefully', async () => {
      const errorMessage = 'Database connection failed';
      mockPortfolioQueries.getAll.mockRejectedValue(new Error(errorMessage));

      await usePortfolioStore.getState().loadPortfolios();

      const state = usePortfolioStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
      expect(state.portfolios).toEqual([]);
    });

    it('should not change current portfolio if one is already selected and exists in list', async () => {
      // Use id that will exist in the loaded portfolios list
      const currentPortfolio: Portfolio = {
        id: '1',
        name: 'Current Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      usePortfolioStore.setState({ currentPortfolio });

      const mockPortfolios: Portfolio[] = [
        {
          id: '1',
          name: 'Portfolio 1',
          type: 'taxable',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: defaultSettings,
        },
      ];

      mockPortfolioQueries.getAll.mockResolvedValue(mockPortfolios);

      await usePortfolioStore.getState().loadPortfolios();

      const state = usePortfolioStore.getState();
      // currentPortfolio is preserved because its id exists in loaded list
      expect(state.currentPortfolio).toEqual(currentPortfolio);
    });

    it('should replace current portfolio with first one if current no longer exists', async () => {
      const stalePortfolio: Portfolio = {
        id: 'deleted-id',
        name: 'Deleted Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      usePortfolioStore.setState({ currentPortfolio: stalePortfolio });

      const mockPortfolios: Portfolio[] = [
        {
          id: '1',
          name: 'Portfolio 1',
          type: 'taxable',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: defaultSettings,
        },
      ];

      mockPortfolioQueries.getAll.mockResolvedValue(mockPortfolios);

      await usePortfolioStore.getState().loadPortfolios();

      const state = usePortfolioStore.getState();
      // stale portfolio replaced with first from loaded list
      expect(state.currentPortfolio).toEqual(mockPortfolios[0]);
    });
  });

  describe('setCurrentPortfolio', () => {
    it('should set portfolio without loading holdings (handled by useDashboardData hook)', () => {
      const portfolio: Portfolio = {
        id: 'p1',
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      usePortfolioStore.getState().setCurrentPortfolio(portfolio);

      const state = usePortfolioStore.getState();
      expect(state.currentPortfolio).toEqual(portfolio);
      // loadHoldings is NOT called by setCurrentPortfolio anymore
      // It's now triggered by useDashboardData hook to avoid race conditions
      expect(mockHoldingQueries.getByPortfolio).not.toHaveBeenCalled();
    });

    it('should track lastAccessedAt when setting current portfolio', async () => {
      const portfolio: Portfolio = {
        id: 'p1',
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      mockPortfolioQueries.update.mockResolvedValue(undefined);

      usePortfolioStore.getState().setCurrentPortfolio(portfolio);

      // Wait for async update to be called
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockPortfolioQueries.update).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({
          lastAccessedAt: expect.any(Date),
        })
      );
    });

    it('should clear holdings and metrics when setting portfolio to null', () => {
      usePortfolioStore.setState({
        holdings: [{ id: 'h1' } as Holding],
        metrics: {} as any,
      });

      usePortfolioStore.getState().setCurrentPortfolio(null);

      const state = usePortfolioStore.getState();
      expect(state.currentPortfolio).toBeNull();
      expect(state.holdings).toEqual([]);
      expect(state.metrics).toBeNull();
    });

    it('should not update lastAccessedAt when setting null portfolio', async () => {
      mockPortfolioQueries.update.mockResolvedValue(undefined);

      usePortfolioStore.getState().setCurrentPortfolio(null);

      // Wait for potential async update
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockPortfolioQueries.update).not.toHaveBeenCalled();
    });
  });

  describe('createPortfolio', () => {
    it('should create portfolio and reload portfolios', async () => {
      const portfolioData = {
        name: 'New Portfolio',
        type: 'taxable' as const,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      mockPortfolioQueries.create.mockResolvedValue('new-id');
      mockPortfolioQueries.getAll.mockResolvedValue([]);

      await usePortfolioStore.getState().createPortfolio(portfolioData);

      expect(mockPortfolioQueries.create).toHaveBeenCalledWith(portfolioData);
      expect(mockPortfolioQueries.getAll).toHaveBeenCalled();

      const state = usePortfolioStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle creation errors', async () => {
      const portfolioData = {
        name: 'New Portfolio',
        type: 'taxable' as const,
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      const errorMessage = 'Portfolio creation failed';
      mockPortfolioQueries.create.mockRejectedValue(new Error(errorMessage));

      await usePortfolioStore.getState().createPortfolio(portfolioData);

      const state = usePortfolioStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
    });
  });

  describe('updatePortfolio', () => {
    it('should update portfolio and refresh current if it matches', async () => {
      const currentPortfolio: Portfolio = {
        id: 'p1',
        name: 'Current Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      const updatedPortfolio: Portfolio = {
        ...currentPortfolio,
        name: 'Updated Portfolio',
      };

      usePortfolioStore.setState({ currentPortfolio });

      mockPortfolioQueries.update.mockResolvedValue(undefined);
      // Must include the portfolio in getAll so loadPortfolios doesn't clear currentPortfolio
      mockPortfolioQueries.getAll.mockResolvedValue([currentPortfolio]);
      mockPortfolioQueries.getById.mockResolvedValue(updatedPortfolio);

      const updates = { name: 'Updated Portfolio' };
      await usePortfolioStore.getState().updatePortfolio('p1', updates);

      expect(mockPortfolioQueries.update).toHaveBeenCalledWith('p1', updates);
      expect(mockPortfolioQueries.getById).toHaveBeenCalledWith('p1');

      const state = usePortfolioStore.getState();
      expect(state.currentPortfolio).toEqual(updatedPortfolio);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('deletePortfolio', () => {
    it('should delete portfolio and clear current if it was the last one', async () => {
      const currentPortfolio: Portfolio = {
        id: 'p1',
        name: 'To Delete',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      usePortfolioStore.setState({
        portfolios: [currentPortfolio],
        currentPortfolio,
        holdings: [{ id: 'h1' } as Holding],
        metrics: {} as any,
      });

      mockPortfolioQueries.delete.mockResolvedValue(undefined);
      mockPortfolioQueries.getAll.mockResolvedValue([]);

      await usePortfolioStore.getState().deletePortfolio('p1');

      expect(mockPortfolioQueries.delete).toHaveBeenCalledWith('p1');

      const state = usePortfolioStore.getState();
      expect(state.currentPortfolio).toBeNull();
      expect(state.holdings).toEqual([]);
      expect(state.metrics).toBeNull();
      expect(state.loading).toBe(false);
    });

    it('should fall back to most recently accessed portfolio when deleting current', async () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 1000 * 60); // 1 minute ago
      const oldDate = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago

      const currentPortfolio: Portfolio = {
        id: 'p1',
        name: 'To Delete',
        type: 'taxable',
        currency: 'USD',
        createdAt: oldDate,
        updatedAt: oldDate,
        lastAccessedAt: now,
        settings: defaultSettings,
      };

      const recentPortfolio: Portfolio = {
        id: 'p2',
        name: 'Recently Accessed',
        type: 'ira',
        currency: 'USD',
        createdAt: oldDate,
        updatedAt: oldDate,
        lastAccessedAt: recentDate,
        settings: defaultSettings,
      };

      const oldPortfolio: Portfolio = {
        id: 'p3',
        name: 'Old Portfolio',
        type: '401k',
        currency: 'USD',
        createdAt: oldDate,
        updatedAt: oldDate,
        lastAccessedAt: oldDate,
        settings: defaultSettings,
      };

      usePortfolioStore.setState({
        portfolios: [currentPortfolio, recentPortfolio, oldPortfolio],
        currentPortfolio,
      });

      mockPortfolioQueries.delete.mockResolvedValue(undefined);
      mockPortfolioQueries.getAll.mockResolvedValue([
        recentPortfolio,
        oldPortfolio,
      ]);
      mockHoldingQueries.getByPortfolio.mockResolvedValue([]);

      await usePortfolioStore.getState().deletePortfolio('p1');

      const state = usePortfolioStore.getState();
      // Should fall back to most recently accessed (p2)
      expect(state.currentPortfolio).toEqual(recentPortfolio);
      expect(mockHoldingQueries.getByPortfolio).toHaveBeenCalledWith('p2');
    });

    it('should not change current portfolio if deleting a different one', async () => {
      const currentPortfolio: Portfolio = {
        id: 'p1',
        name: 'Current',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      const toDelete: Portfolio = {
        id: 'p2',
        name: 'To Delete',
        type: 'ira',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      usePortfolioStore.setState({
        portfolios: [currentPortfolio, toDelete],
        currentPortfolio,
      });

      mockPortfolioQueries.delete.mockResolvedValue(undefined);
      mockPortfolioQueries.getAll.mockResolvedValue([currentPortfolio]);

      await usePortfolioStore.getState().deletePortfolio('p2');

      const state = usePortfolioStore.getState();
      expect(state.currentPortfolio).toEqual(currentPortfolio);
      expect(mockHoldingQueries.getByPortfolio).not.toHaveBeenCalled();
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate portfolio metrics correctly', async () => {
      const mockHoldings: Holding[] = [
        {
          id: 'h1',
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          averageCost: new Decimal(100),
          costBasis: new Decimal(1000),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [],
          lastUpdated: new Date(),
        },
        {
          id: 'h2',
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(5),
          averageCost: new Decimal(200),
          costBasis: new Decimal(1000),
          currentValue: new Decimal(800),
          unrealizedGain: new Decimal(-200),
          unrealizedGainPercent: -20,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      // Provide mock assets with different types so allocation groups correctly
      const mockAssets = [
        {
          id: 'a1',
          symbol: 'AAPL',
          name: 'Apple',
          type: 'stock',
          currency: 'USD',
          metadata: {},
        },
        {
          id: 'a2',
          symbol: 'BTC',
          name: 'Bitcoin',
          type: 'crypto',
          currency: 'USD',
          metadata: {},
        },
      ];

      mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);
      mockAssetQueries.getAll.mockResolvedValue(mockAssets);

      await usePortfolioStore.getState().calculateMetrics('p1');

      const state = usePortfolioStore.getState();
      expect(state.metrics).toBeDefined();
      expect(state.metrics!.totalValue.toNumber()).toBe(2000); // 1200 + 800
      expect(state.metrics!.totalCost.toNumber()).toBe(2000); // 1000 + 1000
      expect(state.metrics!.totalGain.toNumber()).toBe(0); // 200 + (-200)
      expect(state.metrics!.totalGainPercent).toBe(0); // 0 / 2000 * 100
      // Allocation now groups by asset type (stock and crypto = 2 groups)
      expect(state.metrics!.allocation).toHaveLength(2);
    });

    it('should handle zero total cost edge case', async () => {
      const mockHoldings: Holding[] = [
        {
          id: 'h1',
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          averageCost: new Decimal(0),
          costBasis: new Decimal(0),
          currentValue: new Decimal(100),
          unrealizedGain: new Decimal(100),
          unrealizedGainPercent: 0,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);

      await usePortfolioStore.getState().calculateMetrics('p1');

      const state = usePortfolioStore.getState();
      expect(state.metrics!.totalGainPercent).toBe(0);
    });
  });

  describe('refreshData', () => {
    it('should refresh all data for current portfolio', async () => {
      const currentPortfolio: Portfolio = {
        id: 'p1',
        name: 'Current',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      usePortfolioStore.setState({ currentPortfolio });

      mockPortfolioQueries.getAll.mockResolvedValue([currentPortfolio]);
      mockHoldingQueries.getByPortfolio.mockResolvedValue([]);

      await usePortfolioStore.getState().refreshData();

      expect(mockPortfolioQueries.getAll).toHaveBeenCalled();
      expect(mockHoldingQueries.getByPortfolio).toHaveBeenCalledWith('p1');
    });

    it('should only refresh portfolios if no current portfolio', async () => {
      usePortfolioStore.setState({ currentPortfolio: null });

      mockPortfolioQueries.getAll.mockResolvedValue([]);

      await usePortfolioStore.getState().refreshData();

      expect(mockPortfolioQueries.getAll).toHaveBeenCalled();
      expect(mockHoldingQueries.getByPortfolio).not.toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      usePortfolioStore.setState({ error: 'Some error' });

      usePortfolioStore.getState().clearError();

      const state = usePortfolioStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('getSortedPortfolios', () => {
    it('should sort portfolios by lastAccessedAt (most recent first)', () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 1000 * 60); // 1 minute ago
      const old = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago

      const portfolios: Portfolio[] = [
        {
          id: 'p1',
          name: 'Old',
          type: 'taxable',
          currency: 'USD',
          createdAt: old,
          updatedAt: old,
          lastAccessedAt: old,
          settings: defaultSettings,
        },
        {
          id: 'p2',
          name: 'Recent',
          type: 'ira',
          currency: 'USD',
          createdAt: old,
          updatedAt: old,
          lastAccessedAt: recent,
          settings: defaultSettings,
        },
        {
          id: 'p3',
          name: 'Most Recent',
          type: '401k',
          currency: 'USD',
          createdAt: old,
          updatedAt: old,
          lastAccessedAt: now,
          settings: defaultSettings,
        },
      ];

      usePortfolioStore.setState({ portfolios });

      const sorted = usePortfolioStore.getState().getSortedPortfolios();

      expect(sorted[0].id).toBe('p3'); // Most recent
      expect(sorted[1].id).toBe('p2'); // Recent
      expect(sorted[2].id).toBe('p1'); // Old
    });

    it('should fall back to updatedAt if lastAccessedAt is missing', () => {
      const now = new Date();
      const old = new Date(now.getTime() - 1000 * 60 * 60);

      const portfolios: Portfolio[] = [
        {
          id: 'p1',
          name: 'No lastAccessedAt',
          type: 'taxable',
          currency: 'USD',
          createdAt: old,
          updatedAt: old,
          settings: defaultSettings,
        },
        {
          id: 'p2',
          name: 'With lastAccessedAt',
          type: 'ira',
          currency: 'USD',
          createdAt: old,
          updatedAt: old,
          lastAccessedAt: now,
          settings: defaultSettings,
        },
      ];

      usePortfolioStore.setState({ portfolios });

      const sorted = usePortfolioStore.getState().getSortedPortfolios();

      expect(sorted[0].id).toBe('p2'); // Has lastAccessedAt
      expect(sorted[1].id).toBe('p1'); // Falls back to updatedAt
    });

    it('should fall back to createdAt if both lastAccessedAt and updatedAt are missing', () => {
      const now = new Date();
      const old = new Date(now.getTime() - 1000 * 60 * 60);

      const portfolios: Portfolio[] = [
        {
          id: 'p1',
          name: 'Old Created',
          type: 'taxable',
          currency: 'USD',
          createdAt: old,
          updatedAt: old,
          settings: defaultSettings,
        },
        {
          id: 'p2',
          name: 'New Created',
          type: 'ira',
          currency: 'USD',
          createdAt: now,
          updatedAt: now,
          settings: defaultSettings,
        },
      ];

      usePortfolioStore.setState({ portfolios });

      const sorted = usePortfolioStore.getState().getSortedPortfolios();

      expect(sorted[0].id).toBe('p2'); // Newer
      expect(sorted[1].id).toBe('p1'); // Older
    });

    it('should not mutate original portfolios array', () => {
      const portfolios: Portfolio[] = [
        {
          id: 'p1',
          name: 'First',
          type: 'taxable',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: defaultSettings,
        },
        {
          id: 'p2',
          name: 'Second',
          type: 'ira',
          currency: 'USD',
          createdAt: new Date(),
          updatedAt: new Date(),
          settings: defaultSettings,
        },
      ];

      usePortfolioStore.setState({ portfolios });

      const sorted = usePortfolioStore.getState().getSortedPortfolios();
      const original = usePortfolioStore.getState().portfolios;

      // Ensure we got a new array
      expect(sorted).not.toBe(original);
      expect(original[0].id).toBe('p1'); // Original order unchanged
    });
  });
});
