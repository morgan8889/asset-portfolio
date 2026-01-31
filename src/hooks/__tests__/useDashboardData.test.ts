import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from '../useDashboardData';
import {
  createMockPortfolio,
  createMockTransaction,
} from '@/test-utils/test-factories';
import Decimal from 'decimal.js';

// Mock stores with hoisted state
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
    loadPortfolios: vi.fn(),
    loadHoldings: vi.fn(),
    calculateMetrics: vi.fn(),
    refreshPortfolioData: vi.fn(),
    loadTransactions: vi.fn(),
    loadAssets: vi.fn(),
  };

  const mockPortfolioStore = {
    currentPortfolio: null as any,
    portfolios: [] as any[],
    metrics: null as any,
    holdings: [] as any[],
    loading: false,
    error: null as string | null,
    setCurrentPortfolio: vi.fn(),
    _loadingHoldingsForId: null as string | null,
    getState: vi.fn(),
  };

  const mockTransactionStore = {
    transactions: [] as any[],
    loading: false,
    getState: vi.fn(),
  };

  const mockAssetStore = {
    assets: [] as any[],
    loading: false,
    getState: vi.fn(),
  };

  // Create store mock functions
  const usePortfolioStoreMock = Object.assign(
    vi.fn((selector?: any) =>
      selector ? selector(mockPortfolioStore) : mockPortfolioStore
    ),
    { getState: mockPortfolioStore.getState }
  );

  const useTransactionStoreMock = Object.assign(
    vi.fn((selector?: any) =>
      selector ? selector(mockTransactionStore) : mockTransactionStore
    ),
    { getState: mockTransactionStore.getState }
  );

  const useAssetStoreMock = Object.assign(
    vi.fn((selector?: any) =>
      selector ? selector(mockAssetStore) : mockAssetStore
    ),
    { getState: mockAssetStore.getState }
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

vi.mock('@/lib/stores', () => ({
  usePortfolioStore: usePortfolioStoreMock,
  useTransactionStore: useTransactionStoreMock,
  useAssetStore: useAssetStoreMock,
}));

describe('useDashboardData', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Reset store state
    mockPortfolioStore.currentPortfolio = null;
    mockPortfolioStore.portfolios = [];
    mockPortfolioStore.metrics = null;
    mockPortfolioStore.holdings = [];
    mockPortfolioStore.loading = false;
    mockPortfolioStore.error = null;
    mockPortfolioStore._loadingHoldingsForId = null;

    mockTransactionStore.transactions = [];
    mockTransactionStore.loading = false;

    mockAssetStore.assets = [];
    mockAssetStore.loading = false;

    // Setup getState to return stable action references
    mockPortfolioStore.getState.mockReturnValue({
      ...mockPortfolioStore,
      loadPortfolios: mockActions.loadPortfolios,
      loadHoldings: mockActions.loadHoldings,
      calculateMetrics: mockActions.calculateMetrics,
      refreshData: mockActions.refreshPortfolioData,
    });

    mockTransactionStore.getState.mockReturnValue({
      ...mockTransactionStore,
      loadTransactions: mockActions.loadTransactions,
    });

    mockAssetStore.getState.mockReturnValue({
      ...mockAssetStore,
      loadAssets: mockActions.loadAssets,
    });

    // Default mock implementations (resolve immediately)
    mockActions.loadPortfolios.mockResolvedValue(undefined);
    mockActions.loadHoldings.mockResolvedValue(undefined);
    mockActions.calculateMetrics.mockResolvedValue(undefined);
    mockActions.refreshPortfolioData.mockResolvedValue(undefined);
    mockActions.loadTransactions.mockResolvedValue(undefined);
    mockActions.loadAssets.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Mount & Initialization', () => {
    it('should not auto-select when there are no portfolios', async () => {
      const { result } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockActions.loadPortfolios).toHaveBeenCalledTimes(1);
      });

      expect(mockPortfolioStore.setCurrentPortfolio).not.toHaveBeenCalled();
      expect(result.current.currentPortfolio).toBeNull();
    });

    it('should load portfolios and auto-select first on mount', async () => {
      const mockPortfolio = createMockPortfolio({ id: 'portfolio-1' });
      mockPortfolioStore.portfolios = [mockPortfolio];

      const { result, rerender } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockActions.loadPortfolios).toHaveBeenCalledTimes(1);
        expect(mockActions.loadAssets).toHaveBeenCalledTimes(1);
      });

      // Trigger auto-select effect
      rerender();

      await waitFor(() => {
        expect(mockPortfolioStore.setCurrentPortfolio).toHaveBeenCalledWith(
          mockPortfolio
        );
      });
    });

    it('should not re-select when portfolio already selected', () => {
      const mockPortfolio = createMockPortfolio({ id: 'portfolio-1' });
      mockPortfolioStore.portfolios = [mockPortfolio];
      mockPortfolioStore.currentPortfolio = mockPortfolio;

      renderHook(() => useDashboardData());

      expect(mockPortfolioStore.setCurrentPortfolio).not.toHaveBeenCalled();
    });

    it('should prevent duplicate loads during React Strict Mode', async () => {
      // In React Strict Mode, effects run twice but the ref guard prevents duplicate calls
      const { rerender } = renderHook(() => useDashboardData());

      await waitFor(() => {
        expect(mockActions.loadPortfolios).toHaveBeenCalledTimes(1);
        expect(mockActions.loadAssets).toHaveBeenCalledTimes(1);
      });

      // Trigger a rerender (simulating what Strict Mode does)
      rerender();

      // Wait a bit to ensure no additional calls were made
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still be called only once
      expect(mockActions.loadPortfolios).toHaveBeenCalledTimes(1);
      expect(mockActions.loadAssets).toHaveBeenCalledTimes(1);
    });
  });

  describe('Portfolio Selection & Loading', () => {
    it('should trigger holdings load when portfolio changes', async () => {
      const mockPortfolio = createMockPortfolio({ id: 'portfolio-1' });
      mockPortfolioStore.portfolios = [mockPortfolio];
      mockPortfolioStore.currentPortfolio = mockPortfolio;

      const { rerender } = renderHook(() => useDashboardData());

      // Simulate portfolio change
      rerender();

      await waitFor(() => {
        expect(mockActions.loadHoldings).toHaveBeenCalledWith('portfolio-1');
      });
    });

    it('should trigger metrics calculation when portfolio changes', async () => {
      const mockPortfolio = createMockPortfolio({ id: 'portfolio-1' });
      mockPortfolioStore.portfolios = [mockPortfolio];
      mockPortfolioStore.currentPortfolio = mockPortfolio;

      const { rerender } = renderHook(() => useDashboardData());

      // Simulate portfolio change
      rerender();

      await waitFor(() => {
        expect(mockActions.calculateMetrics).toHaveBeenCalledWith(
          'portfolio-1'
        );
      });
    });

    it('should trigger transactions load when portfolio changes', async () => {
      const mockPortfolio = createMockPortfolio({ id: 'portfolio-1' });
      mockPortfolioStore.portfolios = [mockPortfolio];
      mockPortfolioStore.currentPortfolio = mockPortfolio;

      const { rerender } = renderHook(() => useDashboardData());

      // Simulate portfolio change
      rerender();

      await waitFor(() => {
        expect(mockActions.loadTransactions).toHaveBeenCalledWith(
          'portfolio-1'
        );
      });
    });

    it('should skip loading if portfolio is already being loaded (race condition)', async () => {
      const mockPortfolio = createMockPortfolio({ id: 'portfolio-1' });
      mockPortfolioStore.portfolios = [mockPortfolio];
      mockPortfolioStore.currentPortfolio = mockPortfolio;
      mockPortfolioStore._loadingHoldingsForId = 'portfolio-1';

      // Mock getState to return the race condition guard
      mockPortfolioStore.getState.mockReturnValue({
        ...mockPortfolioStore,
        _loadingHoldingsForId: 'portfolio-1',
        loadPortfolios: mockActions.loadPortfolios,
        loadHoldings: mockActions.loadHoldings,
        calculateMetrics: mockActions.calculateMetrics,
        refreshData: mockActions.refreshPortfolioData,
      });

      renderHook(() => useDashboardData());

      // Wait a bit to ensure no calls were made
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockActions.loadHoldings).not.toHaveBeenCalled();
      expect(mockActions.calculateMetrics).not.toHaveBeenCalled();
    });
  });

  describe('Metrics Calculation', () => {
    it('should parse metrics with valid Decimal values correctly', () => {
      mockPortfolioStore.metrics = {
        totalValue: new Decimal(10000),
        totalGain: new Decimal(500),
        totalGainPercent: 5.0,
        dayChange: new Decimal(100),
        dayChangePercent: 1.0,
      } as any;

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.totalValue).toBe(10000);
      expect(result.current.totalGain).toBe(500);
      expect(result.current.totalGainPercent).toBe(5.0);
      expect(result.current.dayChange).toBe(100);
      expect(result.current.dayChangePercent).toBe(1.0);
    });

    it('should use safe defaults for null/missing metrics', () => {
      mockPortfolioStore.metrics = null;

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.totalValue).toBe(0);
      expect(result.current.totalGain).toBe(0);
      expect(result.current.totalGainPercent).toBe(0);
      expect(result.current.dayChange).toBe(0);
      expect(result.current.dayChangePercent).toBe(0);
    });

    it('should combine loading states from multiple stores', () => {
      mockPortfolioStore.loading = true;
      mockTransactionStore.loading = false;
      mockAssetStore.loading = false;

      const { result, rerender } = renderHook(() => useDashboardData());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isPortfolioLoading).toBe(true);
      expect(result.current.isTransactionsLoading).toBe(false);
      expect(result.current.isAssetsLoading).toBe(false);

      // Change loading states
      mockPortfolioStore.loading = false;
      mockTransactionStore.loading = true;
      rerender();

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isPortfolioLoading).toBe(false);
      expect(result.current.isTransactionsLoading).toBe(true);
    });
  });

  describe('Recent Transactions', () => {
    it('should sort transactions by date descending', () => {
      mockTransactionStore.transactions = [
        createMockTransaction({
          id: 'tx-1',
          date: new Date('2025-01-15'),
        }),
        createMockTransaction({
          id: 'tx-2',
          date: new Date('2025-01-20'),
        }),
        createMockTransaction({
          id: 'tx-3',
          date: new Date('2025-01-10'),
        }),
      ];

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.recentTransactions).toHaveLength(3);
      expect(result.current.recentTransactions[0].id).toBe('tx-2'); // Latest
      expect(result.current.recentTransactions[1].id).toBe('tx-1');
      expect(result.current.recentTransactions[2].id).toBe('tx-3'); // Oldest
    });

    it('should limit recent transactions to 5 items', () => {
      mockTransactionStore.transactions = Array.from({ length: 10 }, (_, i) =>
        createMockTransaction({
          id: `tx-${i}`,
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        })
      );

      const { result } = renderHook(() => useDashboardData());

      expect(result.current.recentTransactions).toHaveLength(5);
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh all data when refreshData is called', async () => {
      const mockPortfolio = createMockPortfolio({ id: 'portfolio-1' });
      mockPortfolioStore.currentPortfolio = mockPortfolio;

      const { result } = renderHook(() => useDashboardData());

      await result.current.refreshData();

      expect(mockActions.refreshPortfolioData).toHaveBeenCalledTimes(1);
      expect(mockActions.loadAssets).toHaveBeenCalled();
      expect(mockActions.loadTransactions).toHaveBeenCalledWith('portfolio-1');
    });

    it('should not load transactions when no current portfolio exists', async () => {
      mockPortfolioStore.currentPortfolio = null;

      const { result } = renderHook(() => useDashboardData());

      await result.current.refreshData();

      expect(mockActions.refreshPortfolioData).toHaveBeenCalledTimes(1);
      expect(mockActions.loadAssets).toHaveBeenCalled();
      expect(mockActions.loadTransactions).not.toHaveBeenCalled();
    });
  });
});
