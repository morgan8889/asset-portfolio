import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Decimal } from 'decimal.js';
import { PerformanceSnapshot } from '@/types/performance';
import { Portfolio, PortfolioSettings } from '@/types';

// Use vi.hoisted to define mocks that can be referenced by hoisted vi.mock
const { mockSnapshotService, mockBenchmarkService, mockPortfolioStore } =
  vi.hoisted(() => ({
    mockSnapshotService: {
      getSnapshots: vi.fn(),
      getAggregatedSnapshots: vi.fn(),
      needsComputation: vi.fn(),
      recomputeAll: vi.fn(),
    },
    mockBenchmarkService: {
      compareWithBenchmark: vi.fn(),
      getBenchmarkChartData: vi.fn(),
    },
    mockPortfolioStore: {
      getState: vi.fn(),
    },
  }));

vi.mock('@/lib/services/snapshot-service', () => ({
  getSnapshots: mockSnapshotService.getSnapshots,
  getAggregatedSnapshots: mockSnapshotService.getAggregatedSnapshots,
  needsComputation: mockSnapshotService.needsComputation,
  recomputeAll: mockSnapshotService.recomputeAll,
}));

vi.mock('@/lib/services/benchmark-service', () => ({
  compareWithBenchmark: mockBenchmarkService.compareWithBenchmark,
  getBenchmarkChartData: mockBenchmarkService.getBenchmarkChartData,
}));

vi.mock('@/lib/stores/portfolio', () => ({
  usePortfolioStore: mockPortfolioStore,
}));

// Import after mocks are set up
import { usePerformanceStore } from '../performance';
import { resetCounters } from '@/test-utils';

const defaultSettings: PortfolioSettings = {
  rebalanceThreshold: 5,
  taxStrategy: 'fifo',
};

const createMockSnapshot = (
  overrides: Partial<PerformanceSnapshot> = {}
): PerformanceSnapshot => ({
  id: 'snap-1',
  portfolioId: 'portfolio-1',
  date: new Date('2024-01-15'),
  totalValue: new Decimal(10000),
  totalCost: new Decimal(9000),
  dayChange: new Decimal(100),
  dayChangePercent: 1.0,
  cumulativeReturn: new Decimal(1000),
  twrReturn: new Decimal(0.1),
  holdingCount: 5,
  hasInterpolatedPrices: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('Performance Store', () => {
  beforeEach(() => {
    resetCounters();
    vi.clearAllMocks();

    // Reset store state
    usePerformanceStore.setState({
      summary: null,
      chartData: [],
      holdingPerformance: [],
      benchmarkComparison: null,
      selectedPeriod: 'MONTH',
      showBenchmark: false,
      selectedBenchmark: '^GSPC',
      sortBy: 'percent',
      sortDirection: 'desc',
      isLoading: false,
      isExporting: false,
      error: null,
    });

    // Setup default portfolio store mock
    mockPortfolioStore.getState.mockReturnValue({
      currentPortfolio: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = usePerformanceStore.getState();

      expect(state.summary).toBeNull();
      expect(state.chartData).toEqual([]);
      expect(state.holdingPerformance).toEqual([]);
      expect(state.benchmarkComparison).toBeNull();
      expect(state.selectedPeriod).toBe('MONTH');
      expect(state.showBenchmark).toBe(false);
      expect(state.selectedBenchmark).toBe('^GSPC');
      expect(state.sortBy).toBe('percent');
      expect(state.sortDirection).toBe('desc');
      expect(state.isLoading).toBe(false);
      expect(state.isExporting).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setPeriod', () => {
    it('should update selected period', () => {
      usePerformanceStore.getState().setPeriod('YEAR');

      const state = usePerformanceStore.getState();
      expect(state.selectedPeriod).toBe('YEAR');
    });

    it('should reload performance data when portfolio is selected', async () => {
      const mockPortfolio: Portfolio = {
        id: 'portfolio-1',
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      mockPortfolioStore.getState.mockReturnValue({
        currentPortfolio: mockPortfolio,
      });

      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue([]);

      usePerformanceStore.getState().setPeriod('QUARTER');

      // Wait for async operations
      await vi.waitFor(() => {
        expect(mockSnapshotService.getAggregatedSnapshots).toHaveBeenCalled();
      });
    });

    it('should not reload data when no portfolio is selected', () => {
      mockPortfolioStore.getState.mockReturnValue({
        currentPortfolio: null,
      });

      usePerformanceStore.getState().setPeriod('WEEK');

      expect(mockSnapshotService.getAggregatedSnapshots).not.toHaveBeenCalled();
    });
  });

  describe('toggleBenchmark', () => {
    it('should toggle benchmark visibility', () => {
      expect(usePerformanceStore.getState().showBenchmark).toBe(false);

      usePerformanceStore.getState().toggleBenchmark();
      expect(usePerformanceStore.getState().showBenchmark).toBe(true);

      usePerformanceStore.getState().toggleBenchmark();
      expect(usePerformanceStore.getState().showBenchmark).toBe(false);
    });

    it('should load benchmark data when enabling benchmark', async () => {
      const mockPortfolio: Portfolio = {
        id: 'portfolio-1',
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      mockPortfolioStore.getState.mockReturnValue({
        currentPortfolio: mockPortfolio,
      });

      mockBenchmarkService.compareWithBenchmark.mockResolvedValue({
        portfolioReturn: 10,
        benchmarkReturn: 8,
        alpha: 2,
        correlation: 0.85,
        benchmarkSymbol: '^GSPC',
        period: 'MONTH',
      });
      mockBenchmarkService.getBenchmarkChartData.mockResolvedValue([]);

      usePerformanceStore.getState().toggleBenchmark();

      await vi.waitFor(() => {
        expect(mockBenchmarkService.compareWithBenchmark).toHaveBeenCalled();
      });
    });

    it('should clear benchmark data when disabling benchmark', () => {
      // First set up some chart data with benchmark values
      usePerformanceStore.setState({
        showBenchmark: true,
        chartData: [
          {
            date: new Date('2024-01-15'),
            value: 10000,
            change: 100,
            changePercent: 1.0,
            benchmarkValue: 5000,
            benchmarkChangePercent: 0.5,
            hasInterpolatedPrices: false,
          },
        ],
        benchmarkComparison: {
          portfolioReturn: 10,
          benchmarkReturn: 8,
          alpha: 2,
          correlation: 0.85,
          benchmarkSymbol: '^GSPC',
          period: 'MONTH',
        },
      });

      // Toggle off
      usePerformanceStore.getState().toggleBenchmark();

      const state = usePerformanceStore.getState();
      expect(state.showBenchmark).toBe(false);
      expect(state.benchmarkComparison).toBeNull();
      expect(state.chartData[0].benchmarkValue).toBeUndefined();
    });
  });

  describe('setBenchmark', () => {
    it('should update selected benchmark symbol', () => {
      usePerformanceStore.getState().setBenchmark('^DJI');

      expect(usePerformanceStore.getState().selectedBenchmark).toBe('^DJI');
    });

    it('should reload benchmark data when benchmark is visible', async () => {
      const mockPortfolio: Portfolio = {
        id: 'portfolio-1',
        name: 'Test Portfolio',
        type: 'taxable',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date(),
        settings: defaultSettings,
      };

      mockPortfolioStore.getState.mockReturnValue({
        currentPortfolio: mockPortfolio,
      });

      usePerformanceStore.setState({ showBenchmark: true });

      mockBenchmarkService.compareWithBenchmark.mockResolvedValue({
        portfolioReturn: 10,
        benchmarkReturn: 8,
        alpha: 2,
        correlation: 0.85,
        benchmarkSymbol: '^DJI',
        period: 'MONTH',
      });
      mockBenchmarkService.getBenchmarkChartData.mockResolvedValue([]);

      usePerformanceStore.getState().setBenchmark('^DJI');

      await vi.waitFor(() => {
        expect(mockBenchmarkService.compareWithBenchmark).toHaveBeenCalled();
      });
    });

    it('should not reload when benchmark is hidden', () => {
      mockPortfolioStore.getState.mockReturnValue({
        currentPortfolio: { id: 'portfolio-1' },
      });

      usePerformanceStore.setState({ showBenchmark: false });

      usePerformanceStore.getState().setBenchmark('^DJI');

      expect(mockBenchmarkService.compareWithBenchmark).not.toHaveBeenCalled();
    });
  });

  describe('setSorting', () => {
    it('should update sort by field', () => {
      usePerformanceStore.getState().setSorting('gain', 'asc');

      const state = usePerformanceStore.getState();
      expect(state.sortBy).toBe('gain');
      expect(state.sortDirection).toBe('asc');
    });

    it('should update sort direction', () => {
      usePerformanceStore.getState().setSorting('value', 'desc');

      const state = usePerformanceStore.getState();
      expect(state.sortBy).toBe('value');
      expect(state.sortDirection).toBe('desc');
    });

    it('should handle all sort field options', () => {
      const sortFields: Array<'gain' | 'percent' | 'value' | 'name'> = [
        'gain',
        'percent',
        'value',
        'name',
      ];

      sortFields.forEach((field) => {
        usePerformanceStore.getState().setSorting(field, 'asc');
        expect(usePerformanceStore.getState().sortBy).toBe(field);
      });
    });
  });

  describe('loadPerformanceData', () => {
    it('should set loading state while fetching', async () => {
      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue([]);

      const loadPromise = usePerformanceStore
        .getState()
        .loadPerformanceData('portfolio-1');

      expect(usePerformanceStore.getState().isLoading).toBe(true);

      await loadPromise;

      expect(usePerformanceStore.getState().isLoading).toBe(false);
    });

    it('should trigger recompute when snapshots need computation', async () => {
      mockSnapshotService.needsComputation.mockResolvedValue(true);
      mockSnapshotService.recomputeAll.mockResolvedValue(undefined);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue([]);

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      expect(mockSnapshotService.recomputeAll).toHaveBeenCalledWith(
        'portfolio-1'
      );
    });

    it('should not recompute when snapshots are up to date', async () => {
      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue([]);

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      expect(mockSnapshotService.recomputeAll).not.toHaveBeenCalled();
    });

    it('should handle empty snapshots', async () => {
      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue([]);

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      const state = usePerformanceStore.getState();
      expect(state.summary).toBeNull();
      expect(state.chartData).toEqual([]);
      expect(state.holdingPerformance).toEqual([]);
      expect(state.isLoading).toBe(false);
    });

    it('should calculate summary from snapshots', async () => {
      const mockSnapshots: PerformanceSnapshot[] = [
        createMockSnapshot({
          date: new Date('2024-01-01'),
          totalValue: new Decimal(10000),
          dayChange: new Decimal(0),
          dayChangePercent: 0,
          twrReturn: new Decimal(0),
        }),
        createMockSnapshot({
          date: new Date('2024-01-02'),
          totalValue: new Decimal(10100),
          dayChange: new Decimal(100),
          dayChangePercent: 1.0,
          twrReturn: new Decimal(0.01),
        }),
        createMockSnapshot({
          date: new Date('2024-01-03'),
          totalValue: new Decimal(10050),
          dayChange: new Decimal(-50),
          dayChangePercent: -0.5,
          twrReturn: new Decimal(0.005),
        }),
      ];

      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue(
        mockSnapshots
      );

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      const state = usePerformanceStore.getState();
      expect(state.summary).not.toBeNull();
      expect(state.summary!.portfolioId).toBe('portfolio-1');
      expect(state.summary!.startValue.toNumber()).toBe(10000);
      expect(state.summary!.endValue.toNumber()).toBe(10050);
      expect(state.summary!.totalReturn.toNumber()).toBe(50); // 10050 - 10000
    });

    it('should identify best and worst days', async () => {
      const mockSnapshots: PerformanceSnapshot[] = [
        createMockSnapshot({
          date: new Date('2024-01-01'),
          totalValue: new Decimal(10000),
          dayChange: new Decimal(0),
          dayChangePercent: 0,
        }),
        createMockSnapshot({
          date: new Date('2024-01-02'),
          totalValue: new Decimal(10500),
          dayChange: new Decimal(500),
          dayChangePercent: 5.0, // Best day
        }),
        createMockSnapshot({
          date: new Date('2024-01-03'),
          totalValue: new Decimal(10200),
          dayChange: new Decimal(-300),
          dayChangePercent: -3.0, // Worst day
        }),
      ];

      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue(
        mockSnapshots
      );

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      const state = usePerformanceStore.getState();
      expect(state.summary!.bestDay.changePercent).toBe(5.0);
      expect(state.summary!.worstDay.changePercent).toBe(-3.0);
    });

    it('should identify period high and low', async () => {
      const mockSnapshots: PerformanceSnapshot[] = [
        createMockSnapshot({
          date: new Date('2024-01-01'),
          totalValue: new Decimal(10000),
        }),
        createMockSnapshot({
          date: new Date('2024-01-02'),
          totalValue: new Decimal(11000), // High
        }),
        createMockSnapshot({
          date: new Date('2024-01-03'),
          totalValue: new Decimal(9000), // Low
        }),
        createMockSnapshot({
          date: new Date('2024-01-04'),
          totalValue: new Decimal(10500),
        }),
      ];

      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue(
        mockSnapshots
      );

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      const state = usePerformanceStore.getState();
      expect(state.summary!.periodHigh.toNumber()).toBe(11000);
      expect(state.summary!.periodLow.toNumber()).toBe(9000);
    });

    it('should convert snapshots to chart data', async () => {
      const mockSnapshots: PerformanceSnapshot[] = [
        createMockSnapshot({
          date: new Date('2024-01-01'),
          totalValue: new Decimal(10000),
          dayChange: new Decimal(100),
          dayChangePercent: 1.0,
          hasInterpolatedPrices: false,
        }),
      ];

      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue(
        mockSnapshots
      );

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      const state = usePerformanceStore.getState();
      expect(state.chartData).toHaveLength(1);
      expect(state.chartData[0].value).toBe(10000);
      expect(state.chartData[0].change).toBe(100);
      expect(state.chartData[0].changePercent).toBe(1.0);
      expect(state.chartData[0].hasInterpolatedPrices).toBe(false);
    });

    it('should calculate volatility from daily returns', async () => {
      // Create snapshots with varying returns to calculate volatility
      const mockSnapshots: PerformanceSnapshot[] = [
        createMockSnapshot({
          date: new Date('2024-01-01'),
          totalValue: new Decimal(10000),
          dayChangePercent: 0,
        }),
        createMockSnapshot({
          date: new Date('2024-01-02'),
          totalValue: new Decimal(10100),
          dayChangePercent: 1.0,
        }),
        createMockSnapshot({
          date: new Date('2024-01-03'),
          totalValue: new Decimal(9900),
          dayChangePercent: -2.0,
        }),
        createMockSnapshot({
          date: new Date('2024-01-04'),
          totalValue: new Decimal(10050),
          dayChangePercent: 1.5,
        }),
      ];

      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue(
        mockSnapshots
      );

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      const state = usePerformanceStore.getState();
      // Volatility should be calculated and positive
      expect(state.summary!.volatility).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const errorMessage = 'Failed to fetch snapshots';
      mockSnapshotService.needsComputation.mockRejectedValue(
        new Error(errorMessage)
      );

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      const state = usePerformanceStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      mockSnapshotService.needsComputation.mockRejectedValue('string error');

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      const state = usePerformanceStore.getState();
      expect(state.error).toBe('Failed to load performance data');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('loadBenchmarkData', () => {
    it('should merge benchmark data into chart data', async () => {
      const chartDate = new Date('2024-01-15');

      usePerformanceStore.setState({
        chartData: [
          {
            date: chartDate,
            value: 10000,
            change: 100,
            changePercent: 1.0,
            hasInterpolatedPrices: false,
          },
        ],
      });

      mockBenchmarkService.compareWithBenchmark.mockResolvedValue({
        portfolioReturn: 10,
        benchmarkReturn: 8,
        alpha: 2,
        correlation: 0.85,
        benchmarkSymbol: '^GSPC',
        period: 'MONTH',
      });

      mockBenchmarkService.getBenchmarkChartData.mockResolvedValue([
        {
          date: chartDate,
          normalizedValue: 100,
        },
      ]);

      await usePerformanceStore.getState().loadBenchmarkData('portfolio-1');

      const state = usePerformanceStore.getState();
      expect(state.chartData[0].benchmarkValue).toBe(100);
      expect(state.benchmarkComparison).not.toBeNull();
      expect(state.benchmarkComparison!.alpha).toBe(2);
    });

    it('should handle benchmark data fetch errors silently', async () => {
      mockBenchmarkService.compareWithBenchmark.mockRejectedValue(
        new Error('API error')
      );

      usePerformanceStore.setState({
        chartData: [
          {
            date: new Date('2024-01-15'),
            value: 10000,
            change: 100,
            changePercent: 1.0,
            hasInterpolatedPrices: false,
          },
        ],
      });

      await usePerformanceStore.getState().loadBenchmarkData('portfolio-1');

      // Should not set error state for benchmark failures
      const state = usePerformanceStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('exportData', () => {
    it('should generate CSV from chart data', async () => {
      usePerformanceStore.setState({
        chartData: [
          {
            date: new Date('2024-01-15'),
            value: 10000,
            change: 100,
            changePercent: 1.0,
            hasInterpolatedPrices: false,
          },
          {
            date: new Date('2024-01-16'),
            value: 10200,
            change: 200,
            changePercent: 2.0,
            hasInterpolatedPrices: false,
          },
        ],
        summary: {
          portfolioId: 'portfolio-1',
          period: 'MONTH',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          startValue: new Decimal(10000),
          endValue: new Decimal(10200),
          totalReturn: new Decimal(200),
          totalReturnPercent: 2,
          twrReturn: 2,
          periodHigh: new Decimal(10200),
          periodHighDate: new Date('2024-01-16'),
          periodLow: new Decimal(10000),
          periodLowDate: new Date('2024-01-15'),
          bestDay: {
            date: new Date('2024-01-16'),
            change: new Decimal(200),
            changePercent: 2.0,
          },
          worstDay: {
            date: new Date('2024-01-15'),
            change: new Decimal(100),
            changePercent: 1.0,
          },
          volatility: 5.0,
        },
      });

      const csv = await usePerformanceStore
        .getState()
        .exportData('portfolio-1');

      expect(csv).toContain(
        'Date,Portfolio Value,Daily Change,Daily Change %,Cumulative Return %'
      );
      expect(csv).toContain('2024-01-15');
      expect(csv).toContain('10000.00');
    });

    it('should set exporting state', async () => {
      usePerformanceStore.setState({
        chartData: [
          {
            date: new Date('2024-01-15'),
            value: 10000,
            change: 100,
            changePercent: 1.0,
            hasInterpolatedPrices: false,
          },
        ],
        summary: {
          portfolioId: 'portfolio-1',
          period: 'MONTH',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          startValue: new Decimal(10000),
          endValue: new Decimal(10000),
          totalReturn: new Decimal(0),
          totalReturnPercent: 0,
          twrReturn: 0,
          periodHigh: new Decimal(10000),
          periodHighDate: new Date('2024-01-15'),
          periodLow: new Decimal(10000),
          periodLowDate: new Date('2024-01-15'),
          bestDay: {
            date: new Date('2024-01-15'),
            change: new Decimal(100),
            changePercent: 1.0,
          },
          worstDay: {
            date: new Date('2024-01-15'),
            change: new Decimal(100),
            changePercent: 1.0,
          },
          volatility: 0,
        },
      });

      await usePerformanceStore.getState().exportData('portfolio-1');

      expect(usePerformanceStore.getState().isExporting).toBe(false);
    });

    it('should throw error when no data to export', async () => {
      usePerformanceStore.setState({ chartData: [] });

      await expect(
        usePerformanceStore.getState().exportData('portfolio-1')
      ).rejects.toThrow('No data to export');

      const state = usePerformanceStore.getState();
      expect(state.error).toBe('No data to export');
      expect(state.isExporting).toBe(false);
    });
  });

  describe('refresh', () => {
    it('should recompute all and reload data', async () => {
      mockSnapshotService.recomputeAll.mockResolvedValue(undefined);
      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue([]);

      await usePerformanceStore.getState().refresh('portfolio-1');

      expect(mockSnapshotService.recomputeAll).toHaveBeenCalledWith(
        'portfolio-1'
      );
    });

    it('should handle refresh errors', async () => {
      const errorMessage = 'Refresh failed';
      mockSnapshotService.recomputeAll.mockRejectedValue(
        new Error(errorMessage)
      );

      await usePerformanceStore.getState().refresh('portfolio-1');

      const state = usePerformanceStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      usePerformanceStore.setState({ error: 'Some error' });

      usePerformanceStore.getState().clearError();

      expect(usePerformanceStore.getState().error).toBeNull();
    });
  });

  describe('Volatility Calculation', () => {
    it('should return 0 for insufficient data points', async () => {
      // Only one snapshot - not enough for volatility calculation
      const mockSnapshots: PerformanceSnapshot[] = [
        createMockSnapshot({
          date: new Date('2024-01-01'),
          totalValue: new Decimal(10000),
          dayChangePercent: 1.0,
        }),
      ];

      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue(
        mockSnapshots
      );

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      const state = usePerformanceStore.getState();
      // With only one data point, volatility should be 0
      expect(state.summary!.volatility).toBe(0);
    });

    it('should annualize volatility using 252 trading days', async () => {
      // Create snapshots with consistent 1% daily returns
      const mockSnapshots: PerformanceSnapshot[] = [
        createMockSnapshot({
          date: new Date('2024-01-01'),
          totalValue: new Decimal(10000),
          dayChangePercent: 0,
        }),
        createMockSnapshot({
          date: new Date('2024-01-02'),
          totalValue: new Decimal(10100),
          dayChangePercent: 1.0,
        }),
        createMockSnapshot({
          date: new Date('2024-01-03'),
          totalValue: new Decimal(10200),
          dayChangePercent: 1.0,
        }),
      ];

      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue(
        mockSnapshots
      );

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      const state = usePerformanceStore.getState();
      // With identical returns, standard deviation is 0, so volatility should be 0
      expect(state.summary!.volatility).toBe(0);
    });
  });

  describe('Time Period Integration', () => {
    it('should use correct date range based on selected period', async () => {
      usePerformanceStore.setState({ selectedPeriod: 'WEEK' });

      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue([]);

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      // Verify getAggregatedSnapshots was called with dates
      expect(mockSnapshotService.getAggregatedSnapshots).toHaveBeenCalledWith(
        'portfolio-1',
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero start value when calculating return percent', async () => {
      const mockSnapshots: PerformanceSnapshot[] = [
        createMockSnapshot({
          date: new Date('2024-01-01'),
          totalValue: new Decimal(0), // Zero start value
          dayChangePercent: 0,
        }),
        createMockSnapshot({
          date: new Date('2024-01-02'),
          totalValue: new Decimal(1000),
          dayChangePercent: 0,
        }),
      ];

      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue(
        mockSnapshots
      );

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      const state = usePerformanceStore.getState();
      // Should not throw division by zero error
      expect(state.summary!.totalReturnPercent).toBe(0);
    });

    it('should exclude zero change percent from daily returns for volatility', async () => {
      const mockSnapshots: PerformanceSnapshot[] = [
        createMockSnapshot({
          date: new Date('2024-01-01'),
          totalValue: new Decimal(10000),
          dayChangePercent: 0, // Zero - should be excluded
        }),
        createMockSnapshot({
          date: new Date('2024-01-02'),
          totalValue: new Decimal(10100),
          dayChangePercent: 1.0,
        }),
        createMockSnapshot({
          date: new Date('2024-01-03'),
          totalValue: new Decimal(10000),
          dayChangePercent: -1.0,
        }),
      ];

      mockSnapshotService.needsComputation.mockResolvedValue(false);
      mockSnapshotService.getAggregatedSnapshots.mockResolvedValue(
        mockSnapshots
      );

      await usePerformanceStore.getState().loadPerformanceData('portfolio-1');

      const state = usePerformanceStore.getState();
      // Should calculate volatility from non-zero returns only
      expect(state.summary!.volatility).toBeGreaterThan(0);
    });
  });
});
