import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Decimal } from 'decimal.js';
import { MetricsCards } from '../MetricsCards';
import { DashboardProvider } from '../DashboardProvider';

// Mock the stores
const mockPortfolioStoreStateState = {
  currentPortfolio: {
    id: 'p1',
    name: 'Test Portfolio',
    type: 'taxable' as const,
    currency: 'USD',
    createdAt: new Date(),
    updatedAt: new Date(),
    settings: { rebalanceThreshold: 5, taxStrategy: 'fifo' as const },
  },
  portfolios: [],
  metrics: {
    totalValue: new Decimal(100000),
    totalCost: new Decimal(80000),
    totalGain: new Decimal(20000),
    totalGainPercent: 0.25, // 25% as decimal
    dayChange: new Decimal(1500),
    dayChangePercent: 0.015, // 1.5% as decimal
    allocation: [],
  },
  holdings: [],
  loading: false,
  error: null,
  loadPortfolios: vi.fn().mockResolvedValue(undefined),
  loadHoldings: vi.fn().mockResolvedValue(undefined),
  calculateMetrics: vi.fn(),
  refreshData: vi.fn().mockResolvedValue(undefined),
  setCurrentPortfolio: vi.fn(),
};

// Create a hook that also has getState
const mockUsePortfolioStore = Object.assign(
  () => mockPortfolioStoreStateState,
  { getState: () => mockPortfolioStoreStateState }
);

const mockTransactionStoreState = {
  transactions: [],
  loading: false,
  loadTransactions: vi.fn().mockResolvedValue(undefined),
};

const mockUseTransactionStore = Object.assign(
  () => mockTransactionStoreState,
  { getState: () => mockTransactionStoreState }
);

const mockAssetStoreState = {
  assets: [],
  loading: false,
  loadAssets: vi.fn().mockResolvedValue(undefined),
};

const mockUseAssetStore = Object.assign(
  () => mockAssetStoreState,
  { getState: () => mockAssetStoreState }
);

vi.mock('@/lib/stores', () => ({
  usePortfolioStore: mockUsePortfolioStore,
  useTransactionStore: mockUseTransactionStore,
  useAssetStore: mockUseAssetStore,
}));

describe('MetricsCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(screen.getByText('+25.00% from cost basis')).toBeInTheDocument();
  });

  it('should display day change', () => {
    render(
      <DashboardProvider>
        <MetricsCards />
      </DashboardProvider>
    );

    expect(screen.getByText('+$1,500.00')).toBeInTheDocument();
    expect(screen.getByText('+1.50% from yesterday')).toBeInTheDocument();
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
    // Override metrics for negative test (percentages as decimals)
    mockPortfolioStoreState.metrics = {
      totalValue: new Decimal(80000),
      totalCost: new Decimal(100000),
      totalGain: new Decimal(-20000),
      totalGainPercent: -0.20, // -20% as decimal
      dayChange: new Decimal(-500),
      dayChangePercent: -0.0062, // -0.62% as decimal
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
    mockPortfolioStoreState.metrics = null as unknown as typeof mockPortfolioStoreState.metrics;
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
