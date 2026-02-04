import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Decimal } from 'decimal.js';

// Use vi.hoisted to create mocks that are available when vi.mock factory runs
// Note: Can't use Decimal inside vi.hoisted, so we set metrics: null initially
// and update it in beforeEach
const {
  mockPortfolioStore,
  mockTransactionStore,
  mockAssetStore,
  mockPriceStore,
} = vi.hoisted(() => {
  const portfolioStore = {
    currentPortfolio: {
      id: 'p1',
      name: 'Test Portfolio',
      type: 'taxable' as const,
      currency: 'USD',
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: { rebalanceThreshold: 5, taxStrategy: 'fifo' as const },
    },
    portfolios: [] as unknown[],
    metrics: null as unknown,
    holdings: [] as unknown[],
    assets: [] as unknown[],
    loading: false,
    error: null as string | null,
    loadPortfolios: vi.fn().mockResolvedValue(undefined),
    loadHoldings: vi.fn().mockResolvedValue(undefined),
    calculateMetrics: vi.fn().mockResolvedValue(undefined),
    refreshData: vi.fn().mockResolvedValue(undefined),
    setCurrentPortfolio: vi.fn(),
  };

  const transactionStore = {
    transactions: [] as unknown[],
    loading: false,
    loadTransactions: vi.fn().mockResolvedValue(undefined),
  };

  const assetStore = {
    assets: [] as unknown[],
    loading: false,
    loadAssets: vi.fn().mockResolvedValue(undefined),
  };

  const priceStore = {
    prices: new Map(),
    loading: false,
    error: null as string | null,
    lastUpdated: null as Date | null,
    setWatchedSymbols: vi.fn(),
  };

  return {
    mockPortfolioStore: portfolioStore,
    mockTransactionStore: transactionStore,
    mockAssetStore: assetStore,
    mockPriceStore: priceStore,
  };
});

// Create mock hooks with getState support
vi.mock('@/lib/stores', () => {
  const usePortfolioStoreMock = Object.assign(() => mockPortfolioStore, {
    getState: () => mockPortfolioStore,
  });
  const useTransactionStoreMock = Object.assign(() => mockTransactionStore, {
    getState: () => mockTransactionStore,
  });
  const useAssetStoreMock = Object.assign(() => mockAssetStore, {
    getState: () => mockAssetStore,
  });
  const usePriceStoreMock = Object.assign(() => mockPriceStore, {
    getState: () => mockPriceStore,
  });

  return {
    usePortfolioStore: usePortfolioStoreMock,
    useTransactionStore: useTransactionStoreMock,
    useAssetStore: useAssetStoreMock,
    usePriceStore: usePriceStoreMock,
  };
});

import { MetricsCards } from '../MetricsCards';
import { DashboardProvider } from '../DashboardProvider';

// Default metrics with Decimal values (set outside vi.hoisted)
const defaultMetrics = {
  totalValue: new Decimal(100000),
  totalCost: new Decimal(80000),
  totalGain: new Decimal(20000),
  totalGainPercent: 25.0, // 25% (already multiplied by 100)
  dayChange: new Decimal(1500),
  dayChangePercent: 1.5, // 1.5% (already multiplied by 100)
  allocation: [],
};

describe('MetricsCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default metrics with Decimal values
    mockPortfolioStore.metrics = defaultMetrics;
  });

  it('should render all metric cards', () => {
    render(
      <DashboardProvider>
        <MetricsCards />
      </DashboardProvider>
    );

    expect(screen.getByText('Total Value')).toBeInTheDocument();
    expect(screen.getByText('Total Gain/Loss')).toBeInTheDocument();
    expect(screen.getByText('Day Change')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('should display formatted total value', () => {
    render(
      <DashboardProvider>
        <MetricsCards />
      </DashboardProvider>
    );

    // Should format as currency
    expect(screen.getByText('$100,000.00')).toBeInTheDocument();
  });

  it('should display gain with positive indicator', () => {
    render(
      <DashboardProvider>
        <MetricsCards />
      </DashboardProvider>
    );

    // Should show positive gain with + prefix
    expect(screen.getByText('+$20,000.00')).toBeInTheDocument();
    expect(screen.getByText('25.00% from cost basis')).toBeInTheDocument();
  });

  it('should display day change', () => {
    render(
      <DashboardProvider>
        <MetricsCards />
      </DashboardProvider>
    );

    expect(screen.getByText('+$1,500.00')).toBeInTheDocument();
    expect(screen.getByText('1.50% from yesterday')).toBeInTheDocument();
  });

  it('should render quick action buttons', () => {
    render(
      <DashboardProvider>
        <MetricsCards />
      </DashboardProvider>
    );

    expect(screen.getByText('View Analytics')).toBeInTheDocument();
    expect(screen.getByText('Rebalance')).toBeInTheDocument();
  });
});

describe('MetricsCards with negative values', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Override metrics for negative test (percentages already multiplied by 100)
    mockPortfolioStore.metrics = {
      totalValue: new Decimal(80000),
      totalCost: new Decimal(100000),
      totalGain: new Decimal(-20000),
      totalGainPercent: -20.0, // -20% (already multiplied by 100)
      dayChange: new Decimal(-500),
      dayChangePercent: -0.62, // -0.62% (already multiplied by 100)
      allocation: [],
    };
  });

  it('should display loss with negative indicator', () => {
    render(
      <DashboardProvider>
        <MetricsCards />
      </DashboardProvider>
    );

    // Should show negative values
    expect(screen.getByText('-$20,000.00')).toBeInTheDocument();
    expect(screen.getByText('-20.00% from cost basis')).toBeInTheDocument();
  });
});

describe('MetricsCards with no metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Override metrics to null (cast needed for test scenario)
    mockPortfolioStore.metrics =
      null as unknown as typeof mockPortfolioStore.metrics;
  });

  it('should handle missing metrics gracefully', () => {
    render(
      <DashboardProvider>
        <MetricsCards />
      </DashboardProvider>
    );

    // Should still render cards with zero values
    expect(screen.getByText('Total Value')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });
});
