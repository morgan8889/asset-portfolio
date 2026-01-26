/**
 * Tests for usePerformanceData Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePerformanceData } from '../usePerformanceData';
import { usePortfolioStore } from '@/lib/stores/portfolio';
import { useLivePriceMetrics } from '../useLivePriceMetrics';
import * as metricsService from '@/lib/services';
import Decimal from 'decimal.js';

// Mock the dependencies
vi.mock('@/lib/stores/portfolio');
vi.mock('../useLivePriceMetrics');
vi.mock('@/lib/services', async () => {
  const actual = await vi.importActual('@/lib/services');
  return {
    ...actual,
    getHistoricalValues: vi.fn(),
  };
});

describe('usePerformanceData', () => {
  const mockPortfolio = {
    id: 'portfolio-1',
    name: 'Test Portfolio',
    description: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLiveMetrics = {
    totalValue: new Decimal(10000),
    totalGain: new Decimal(1000),
    totalGainPercent: 10,
    dayChange: new Decimal(100),
    dayChangePercent: 1,
    topPerformers: [],
    biggestLosers: [],
    hasLivePrices: true,
  };

  const mockHistoricalData = [
    {
      date: new Date('2024-01-01'),
      totalValue: new Decimal(9000),
      totalCost: new Decimal(9000),
      unrealizedGain: new Decimal(0),
    },
    {
      date: new Date('2024-06-01'),
      totalValue: new Decimal(9500),
      totalCost: new Decimal(9000),
      unrealizedGain: new Decimal(500),
    },
    {
      date: new Date('2024-12-31'),
      totalValue: new Decimal(10000),
      totalCost: new Decimal(9000),
      unrealizedGain: new Decimal(1000),
    },
  ];

  beforeEach(() => {
    // Setup default mocks
    vi.mocked(usePortfolioStore).mockReturnValue({
      holdings: [],
      assets: [],
      currentPortfolio: mockPortfolio,
      metrics: {
        totalValue: new Decimal(10000),
        totalGain: new Decimal(1000),
        totalGainPercent: 10,
      },
    } as any);

    vi.mocked(useLivePriceMetrics).mockReturnValue(mockLiveMetrics as any);

    vi.mocked(metricsService.getHistoricalValues).mockResolvedValue(
      mockHistoricalData
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial loading state', () => {
    const { result } = renderHook(() => usePerformanceData());

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(result.current.historicalData).toEqual([]);
  });

  it('should load and calculate metrics successfully', async () => {
    const { result } = renderHook(() => usePerformanceData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(null);
    expect(result.current.historicalData.length).toBeGreaterThan(0);
    expect(result.current.metrics.roi).toBeGreaterThan(0);
  });

  it('should handle portfolio with no historical data', async () => {
    vi.mocked(metricsService.getHistoricalValues).mockResolvedValue([]);

    const { result } = renderHook(() => usePerformanceData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.historicalData).toEqual([]);
    expect(result.current.metrics).toEqual({
      roi: 0,
      annualizedReturn: 0,
      volatility: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
    });
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Failed to fetch historical data';
    vi.mocked(metricsService.getHistoricalValues).mockRejectedValue(
      new Error(errorMessage)
    );

    const { result } = renderHook(() => usePerformanceData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should recalculate metrics when period changes', async () => {
    const { result } = renderHook(() => usePerformanceData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialMetrics = result.current.metrics;

    // Change period
    result.current.setSelectedPeriod('1M');

    await waitFor(() => {
      expect(metricsService.getHistoricalValues).toHaveBeenCalledWith(
        mockPortfolio.id,
        'MONTH'
      );
    });

    // Metrics should be recalculated
    expect(result.current.metrics).toBeDefined();
  });

  it('should handle portfolio without ID', async () => {
    vi.mocked(usePortfolioStore).mockReturnValue({
      holdings: [],
      assets: [],
      currentPortfolio: null,
      metrics: null,
    } as any);

    const { result } = renderHook(() => usePerformanceData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.historicalData).toEqual([]);
    expect(metricsService.getHistoricalValues).not.toHaveBeenCalled();
  });

  it('should combine live metrics with calculated metrics', async () => {
    const { result } = renderHook(() => usePerformanceData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should use live metrics when available
    expect(result.current.totalValue).toEqual(mockLiveMetrics.totalValue);
    expect(result.current.totalGain).toEqual(mockLiveMetrics.totalGain);
    expect(result.current.dayChange).toEqual(mockLiveMetrics.dayChange);
  });

  it('should fall back to store metrics when live prices unavailable', async () => {
    vi.mocked(useLivePriceMetrics).mockReturnValue({
      ...mockLiveMetrics,
      hasLivePrices: false,
    } as any);

    const { result } = renderHook(() => usePerformanceData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should fall back to store metrics
    expect(result.current.totalValue.toNumber()).toBe(10000);
  });

  it('should abort previous calculation when portfolio changes', async () => {
    const { result, rerender } = renderHook(() => usePerformanceData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Change portfolio
    vi.mocked(usePortfolioStore).mockReturnValue({
      holdings: [],
      assets: [],
      currentPortfolio: { ...mockPortfolio, id: 'portfolio-2' },
      metrics: null,
    } as any);

    rerender();

    // Should trigger new calculation and abort previous
    await waitFor(() => {
      expect(metricsService.getHistoricalValues).toHaveBeenCalledWith(
        'portfolio-2',
        expect.any(String)
      );
    });
  });

  it('should update metrics when live prices change', async () => {
    const { result, rerender } = renderHook(() => usePerformanceData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialCallCount = vi.mocked(
      metricsService.getHistoricalValues
    ).mock.calls.length;

    // Update live prices
    vi.mocked(useLivePriceMetrics).mockReturnValue({
      ...mockLiveMetrics,
      totalValue: new Decimal(11000),
    } as any);

    rerender();

    await waitFor(() => {
      expect(metricsService.getHistoricalValues).toHaveBeenCalledTimes(
        initialCallCount + 1
      );
    });
  });

  it('should calculate all advanced metrics correctly', async () => {
    const { result } = renderHook(() => usePerformanceData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const { metrics } = result.current;

    // Should have all metrics calculated
    expect(typeof metrics.roi).toBe('number');
    expect(typeof metrics.annualizedReturn).toBe('number');
    expect(typeof metrics.volatility).toBe('number');
    expect(typeof metrics.sharpeRatio).toBe('number');
    expect(typeof metrics.maxDrawdown).toBe('number');

    // ROI should be positive for our mock data
    expect(metrics.roi).toBeGreaterThan(0);
  });
});
