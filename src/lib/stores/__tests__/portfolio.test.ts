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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loadPortfolios', () => {
    it('should load portfolios and set first one as current if none selected', async () => {
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
      expect(state.currentPortfolio).toEqual(mockPortfolios[0]);
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

    it('should not change current portfolio if one is already selected', async () => {
      const currentPortfolio: Portfolio = {
        id: 'current',
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
      expect(state.currentPortfolio).toEqual(currentPortfolio);
    });
  });

  describe('setCurrentPortfolio', () => {
    it('should set portfolio and load related data', async () => {
      const mockHoldings: Holding[] = [
        {
          id: 'h1',
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          averageCost: new Decimal(100),
          costBasis: new Decimal(1000),
          currentValue: new Decimal(1100),
          unrealizedGain: new Decimal(100),
          unrealizedGainPercent: 10,
          lots: [],
          lastUpdated: new Date(),
        },
      ];

      mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);

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

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      const state = usePortfolioStore.getState();
      expect(state.currentPortfolio).toEqual(portfolio);
      expect(mockHoldingQueries.getByPortfolio).toHaveBeenCalledWith('p1');
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
      mockPortfolioQueries.getAll.mockResolvedValue([]);
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
    it('should delete portfolio and clear current if it matches', async () => {
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

      mockHoldingQueries.getByPortfolio.mockResolvedValue(mockHoldings);

      await usePortfolioStore.getState().calculateMetrics('p1');

      const state = usePortfolioStore.getState();
      expect(state.metrics).toBeDefined();
      expect(state.metrics!.totalValue.toNumber()).toBe(2000); // 1200 + 800
      expect(state.metrics!.totalCost.toNumber()).toBe(2000); // 1000 + 1000
      expect(state.metrics!.totalGain.toNumber()).toBe(0); // 200 + (-200)
      expect(state.metrics!.totalGainPercent).toBe(0); // 0 / 2000 * 100
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
});
