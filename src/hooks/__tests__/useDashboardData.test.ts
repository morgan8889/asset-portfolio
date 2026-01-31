import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from '../useDashboardData';
import { createMockPortfolio } from '@/test-utils/test-factories';
import Decimal from 'decimal.js';

/**
 * Tests for useDashboardData hook
 *
 * This hook orchestrates all data loading for the dashboard and holdings pages.
 * Critical for verifying DashboardProvider integration works correctly.
 */

// Use vi.hoisted() to avoid "Cannot access before initialization" errors
const {
  mockPortfolioStore,
  mockTransactionStore,
  mockAssetStore,
  mockActions,
  usePortfolioStoreMock,
  useTransactionStoreMock,
  useAssetStoreMock,
} = vi.hoisted(() => {
  const mockActions = {
    loadPortfolios: vi.fn().mockResolvedValue(undefined),
    setCurrentPortfolio: vi.fn(),
    loadHoldings: vi.fn().mockResolvedValue(undefined),
    calculateMetrics: vi.fn(),
    refreshData: vi.fn().mockResolvedValue(undefined),
    loadTransactions: vi.fn().mockResolvedValue([]),
    loadAssets: vi.fn().mockResolvedValue(undefined),
  };

  const mockPortfolioStore = {
    portfolios: [] as any[],
    currentPortfolio: null as any,
    holdings: [] as any[],
    assets: [] as any[],
    metrics: null as any,
    loading: false,
    error: null as string | null,
    _loadingHoldingsForId: null as string | null,
    ...mockActions,
    getState: vi.fn(),
  };

  const mockTransactionStore = {
    transactions: [] as any[],
    loading: false,
    error: null as string | null,
    loadTransactions: mockActions.loadTransactions,
    getState: vi.fn(),
  };

  const mockAssetStore = {
    assets: [] as any[],
    loading: false,
    error: null as string | null,
    loadAssets: mockActions.loadAssets,
    getState: vi.fn(),
  };

  const usePortfolioStoreMock = Object.assign(
    vi.fn((selector) => (selector ? selector(mockPortfolioStore) : mockPortfolioStore)),
    {
      getState: vi.fn(() => ({
        ...mockPortfolioStore,
        loadPortfolios: mockActions.loadPortfolios,
        setCurrentPortfolio: mockActions.setCurrentPortfolio,
        loadHoldings: mockActions.loadHoldings,
        calculateMetrics: mockActions.calculateMetrics,
        refreshData: mockActions.refreshData,
        _loadingHoldingsForId: mockPortfolioStore._loadingHoldingsForId,
      })),
    }
  );

  const useTransactionStoreMock = Object.assign(
    vi.fn((selector) => (selector ? selector(mockTransactionStore) : mockTransactionStore)),
    {
      getState: vi.fn(() => ({
        ...mockTransactionStore,
        loadTransactions: mockActions.loadTransactions,
      })),
    }
  );

  const useAssetStoreMock = Object.assign(
    vi.fn((selector) => (selector ? selector(mockAssetStore) : mockAssetStore)),
    {
      getState: vi.fn(() => ({
        ...mockAssetStore,
        loadAssets: mockActions.loadAssets,
      })),
    }
  );

  return {
    mockPortfolioStore,
    mockTransactionStore,
    mockAssetStore,
    mockActions,
    usePortfolioStoreMock,
    useTransactionStoreMock,
    useAssetStoreMock,
  };
});

// Mock the stores
vi.mock('@/lib/stores/portfolio', () => ({
  usePortfolioStore: usePortfolioStoreMock,
}));

vi.mock('@/lib/stores/transaction', () => ({
  useTransactionStore: useTransactionStoreMock,
}));

vi.mock('@/lib/stores/asset', () => ({
  useAssetStore: useAssetStoreMock,
}));

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPortfolioStore.portfolios = [];
    mockPortfolioStore.currentPortfolio = null;
    mockPortfolioStore.holdings = [];
    mockPortfolioStore.assets = [];
    mockPortfolioStore.metrics = null;
    mockPortfolioStore.loading = false;
    mockPortfolioStore.error = null;
    mockPortfolioStore._loadingHoldingsForId = null;
    mockTransactionStore.transactions = [];
    mockTransactionStore.loading = false;
    mockTransactionStore.error = null;
    mockAssetStore.assets = [];
    mockAssetStore.loading = false;
    mockAssetStore.error = null;

    // Reset getState mocks
    usePortfolioStoreMock.getState.mockReturnValue({
      ...mockPortfolioStore,
      loadPortfolios: mockActions.loadPortfolios,
      setCurrentPortfolio: mockActions.setCurrentPortfolio,
      loadHoldings: mockActions.loadHoldings,
      calculateMetrics: mockActions.calculateMetrics,
      refreshData: mockActions.refreshData,
      _loadingHoldingsForId: mockPortfolioStore._loadingHoldingsForId,
    });

    useTransactionStoreMock.getState.mockReturnValue({
      ...mockTransactionStore,
      loadTransactions: mockActions.loadTransactions,
    });

    useAssetStoreMock.getState.mockReturnValue({
      ...mockAssetStore,
      loadAssets: mockActions.loadAssets,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Mount & Initialization', () => {
    it('should not auto-select portfolio when no portfolios exist', async () => {
      mockPortfolioStore.portfolios = [];
      mockActions.loadPortfolios.mockResolvedValue(undefined);

      renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockActions.loadPortfolios).toHaveBeenCalledOnce();
      });

      expect(mockActions.setCurrentPortfolio).not.toHaveBeenCalled();
    });

    it('should load portfolios and auto-select first when portfolios exist', async () => {
      const portfolio1 = createMockPortfolio({ id: 'p1', name: 'Portfolio 1' });
      const portfolio2 = createMockPortfolio({ id: 'p2', name: 'Portfolio 2' });

      // Pre-populate portfolios (simulating after loadPortfolios completes)
      mockPortfolioStore.portfolios = [portfolio1, portfolio2];
      mockPortfolioStore.currentPortfolio = null;

      renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockActions.loadPortfolios).toHaveBeenCalledOnce();
      });

      // Should auto-select first portfolio since portfolios exist and none is selected
      expect(mockActions.setCurrentPortfolio).toHaveBeenCalledWith(portfolio1);
    });

    it('should not re-select portfolio when one is already selected', async () => {
      const portfolio = createMockPortfolio({ id: 'p1' });
      mockPortfolioStore.portfolios = [portfolio];
      mockPortfolioStore.currentPortfolio = portfolio;

      renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockActions.loadPortfolios).toHaveBeenCalled();
      });

      // Should not set current portfolio again since one is already selected
      expect(mockActions.setCurrentPortfolio).not.toHaveBeenCalled();
    });

    it('should prevent duplicate loads in React Strict Mode', async () => {
      mockPortfolioStore.portfolios = [];
      mockActions.loadPortfolios.mockResolvedValue(undefined);

      // Simulate React Strict Mode by rendering twice
      const { rerender } = renderHook(() => useDashboardData());
      rerender();
      rerender();

      await waitFor(() => {
        expect(mockActions.loadPortfolios).toHaveBeenCalled();
      });

      // Should only load once despite multiple renders
      expect(mockActions.loadPortfolios).toHaveBeenCalledOnce();
    });
  });

  describe('Portfolio Selection & Loading', () => {
    it('should trigger holdings load when portfolio changes', async () => {
      const portfolio = createMockPortfolio({ id: 'p1' });
      mockPortfolioStore.portfolios = [portfolio];
      mockPortfolioStore.currentPortfolio = null;

      const { rerender } = renderHook(() => useDashboardData());

      // Change current portfolio
      mockPortfolioStore.currentPortfolio = portfolio;
      rerender();

      await waitFor(() => {
        expect(mockActions.loadHoldings).toHaveBeenCalledWith('p1');
      });
    });

    it('should trigger metrics calculation when portfolio changes', async () => {
      const portfolio = createMockPortfolio({ id: 'p1' });
      mockPortfolioStore.portfolios = [portfolio];
      mockPortfolioStore.currentPortfolio = null;

      const { rerender } = renderHook(() => useDashboardData());

      // Change current portfolio and add holdings
      mockPortfolioStore.currentPortfolio = portfolio;
      mockPortfolioStore.holdings = [
        {
          id: 'h1',
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(1500),
          unrealizedGain: new Decimal(500),
          unrealizedGainPercent: 50,
          lots: [],
          lastUpdated: new Date(),
          ownershipPercentage: 100,
        },
      ];
      rerender();

      await waitFor(() => {
        expect(mockActions.calculateMetrics).toHaveBeenCalledWith('p1');
      });
    });

    it('should trigger transactions load when portfolio changes', async () => {
      const portfolio = createMockPortfolio({ id: 'p1' });
      mockPortfolioStore.portfolios = [portfolio];
      mockPortfolioStore.currentPortfolio = null;

      const { rerender } = renderHook(() => useDashboardData());

      // Change current portfolio
      mockPortfolioStore.currentPortfolio = portfolio;
      rerender();

      await waitFor(() => {
        expect(mockActions.loadTransactions).toHaveBeenCalledWith('p1');
      });
    });

    it('should skip loading if already loading', async () => {
      const portfolio = createMockPortfolio({ id: 'p1' });
      mockPortfolioStore.portfolios = [portfolio];
      mockPortfolioStore.currentPortfolio = portfolio;
      mockPortfolioStore._loadingHoldingsForId = 'p1'; // Already loading this portfolio

      // Update getState to return the loading flag
      usePortfolioStoreMock.getState.mockReturnValue({
        ...mockPortfolioStore,
        loadPortfolios: mockActions.loadPortfolios,
        setCurrentPortfolio: mockActions.setCurrentPortfolio,
        loadHoldings: mockActions.loadHoldings,
        calculateMetrics: mockActions.calculateMetrics,
        refreshData: mockActions.refreshData,
        _loadingHoldingsForId: 'p1',
      });

      renderHook(() => useDashboardData());

      // Wait a bit to ensure no additional calls
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not load holdings if already loading
      expect(mockActions.loadHoldings).not.toHaveBeenCalled();
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate metrics with valid Decimal values', async () => {
      const portfolio = createMockPortfolio({ id: 'p1' });
      mockPortfolioStore.portfolios = [portfolio];
      mockPortfolioStore.currentPortfolio = portfolio;
      mockPortfolioStore.holdings = [
        {
          id: 'h1',
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(1500),
          unrealizedGain: new Decimal(500),
          unrealizedGainPercent: 50,
          lots: [],
          lastUpdated: new Date(),
          ownershipPercentage: 100,
        },
      ];

      renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockActions.calculateMetrics).toHaveBeenCalledWith('p1');
      });
    });

    it('should handle null/missing metrics safely', () => {
      const portfolio = createMockPortfolio({ id: 'p1' });
      mockPortfolioStore.portfolios = [portfolio];
      mockPortfolioStore.currentPortfolio = portfolio;
      mockPortfolioStore.metrics = null;

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.metrics).toBeNull();
    });

    it('should combine loading state from multiple stores', () => {
      mockPortfolioStore.loading = true;
      mockTransactionStore.loading = false;

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.isLoading).toBe(true);

      mockPortfolioStore.loading = false;
      mockTransactionStore.loading = true;

      const { result: result2 } = renderHook(() => useDashboardData());

      expect(result2.current.isLoading).toBe(true);
    });
  });

  describe('Recent Transactions', () => {
    it('should return recent transactions sorted by date descending', () => {
      const oldTxn = {
        id: 'txn-1',
        assetId: 'a1',
        portfolioId: 'p1',
        type: 'buy' as const,
        date: new Date('2025-01-01'),
        quantity: new Decimal(10),
        price: new Decimal(100),
        totalAmount: new Decimal(1000),
        fees: new Decimal(0),
        currency: 'USD',
        notes: '',
      };

      const newTxn = {
        id: 'txn-2',
        assetId: 'a1',
        portfolioId: 'p1',
        type: 'sell' as const,
        date: new Date('2025-01-15'),
        quantity: new Decimal(5),
        price: new Decimal(150),
        totalAmount: new Decimal(750),
        fees: new Decimal(0),
        currency: 'USD',
        notes: '',
      };

      mockTransactionStore.transactions = [oldTxn, newTxn];

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.recentTransactions).toHaveLength(2);
      expect(result.current.recentTransactions[0].id).toBe('txn-2'); // newer first
      expect(result.current.recentTransactions[1].id).toBe('txn-1');
    });

    it('should limit recent transactions to 5 items', () => {
      const transactions = Array.from({ length: 10 }, (_, i) => ({
        id: `txn-${i}`,
        assetId: 'a1',
        portfolioId: 'p1',
        type: 'buy' as const,
        date: new Date(`2025-01-${i + 1}`),
        quantity: new Decimal(10),
        price: new Decimal(100),
        totalAmount: new Decimal(1000),
        fees: new Decimal(0),
        currency: 'USD',
        notes: '',
      }));

      mockTransactionStore.transactions = transactions;

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.recentTransactions).toHaveLength(5);
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh all data when refreshData is called', async () => {
      const portfolio = createMockPortfolio({ id: 'p1' });
      mockPortfolioStore.portfolios = [portfolio];
      mockPortfolioStore.currentPortfolio = portfolio;

      const { result } = renderHook(() => useDashboardData());

      await result.current.refreshData();

      expect(mockActions.loadPortfolios).toHaveBeenCalled();
      expect(mockActions.loadHoldings).toHaveBeenCalledWith('p1');
      expect(mockActions.loadTransactions).toHaveBeenCalledWith('p1');
    });

    it('should not refresh if no current portfolio', async () => {
      mockPortfolioStore.portfolios = [];
      mockPortfolioStore.currentPortfolio = null;

      const { result } = renderHook(() => useDashboardData());

      await result.current.refreshData();

      expect(mockActions.loadPortfolios).toHaveBeenCalled();
      expect(mockActions.loadHoldings).not.toHaveBeenCalled();
      expect(mockActions.loadTransactions).not.toHaveBeenCalled();
    });
  });
});
