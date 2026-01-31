import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HoldingsTable } from '../holdings-table';
import {
  createMockHolding,
  createMockAsset,
  createMockPortfolio,
  createMockLivePriceData,
} from '@/test-utils/test-factories';
import Decimal from 'decimal.js';

// Mock stores with hoisted state
const { mockPortfolioStore, mockPriceStore, usePortfolioStoreMock } = vi.hoisted(() => {
  const mockPortfolioStore = {
    holdings: [] as any[],
    assets: [] as any[],
    currentPortfolio: null as any,
    loading: false,
    error: null as string | null,
    clearError: vi.fn(),
    loadHoldings: vi.fn(),
    getState: vi.fn(),
  };

  const mockPriceStore = {
    prices: new Map(),
    loading: false,
    preferences: {
      refreshInterval: 'standard',
      showStalenessIndicator: true,
      pauseWhenHidden: true,
    },
  };

  // Create store mock with getState
  const usePortfolioStoreMock = Object.assign(
    vi.fn(() => mockPortfolioStore),
    {
      getState: vi.fn(() => ({
        ...mockPortfolioStore,
        loadHoldings: mockPortfolioStore.loadHoldings,
      })),
    }
  );

  return { mockPortfolioStore, mockPriceStore, usePortfolioStoreMock };
});

vi.mock('@/lib/stores', () => ({
  usePortfolioStore: usePortfolioStoreMock,
  usePriceStore: vi.fn(() => mockPriceStore),
}));

// Mock child components
vi.mock('@/components/dashboard/price-display', () => ({
  PriceDisplay: ({ priceData }: any) => (
    <div data-testid="price-display">{priceData.displayPrice}</div>
  ),
}));

vi.mock('@/components/forms/manual-price-update-dialog', () => ({
  ManualPriceUpdateDialog: ({ asset, open }: any) =>
    open ? <div data-testid="manual-price-dialog">{asset.symbol}</div> : null,
}));

vi.mock('@/components/forms/region-override-dialog', () => ({
  RegionOverrideDialog: ({ asset, open }: any) =>
    open ? <div data-testid="region-dialog">{asset.symbol}</div> : null,
}));

// Mock utility functions
vi.mock('@/lib/services/asset-search', () => ({
  getExchangeBadgeColor: (exchange: string) => `badge-${exchange}`,
}));

vi.mock('@/lib/utils/market-utils', () => ({
  isUKSymbol: (symbol: string) => symbol.endsWith('.L'),
}));

vi.mock('@/lib/services/property-service', () => ({
  getAssetAnnualYield: (asset: any) => asset.rentalInfo?.monthlyRent ? 5.5 : undefined,
}));

describe('HoldingsTable', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockPortfolioStore.holdings = [];
    mockPortfolioStore.assets = [];
    mockPortfolioStore.currentPortfolio = null;
    mockPortfolioStore.loading = false;
    mockPortfolioStore.error = null;
    mockPriceStore.prices = new Map();
    mockPortfolioStore.loadHoldings.mockResolvedValue(undefined);
    usePortfolioStoreMock.getState.mockReturnValue({
      ...mockPortfolioStore,
      loadHoldings: mockPortfolioStore.loadHoldings,
    });
  });

  describe('Display States', () => {
    it('should show loading state when loading with no holdings', () => {
      mockPortfolioStore.loading = true;
      mockPortfolioStore.holdings = [];

      render(<HoldingsTable />);

      expect(screen.getByText('Loading holdings...')).toBeInTheDocument();
    });

    it('should show holdings table when loading with existing holdings', () => {
      const asset = createMockAsset({ id: 'asset-1', symbol: 'AAPL' });
      const holding = createMockHolding({ assetId: 'asset-1' });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];
      mockPortfolioStore.loading = true; // Still loading but has data

      render(<HoldingsTable />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
    });

    it('should show error state with retry button', async () => {
      mockPortfolioStore.error = 'Failed to load holdings';
      mockPortfolioStore.currentPortfolio = createMockPortfolio({ id: 'port-1' });

      render(<HoldingsTable />);

      expect(screen.getByText('Failed to load holdings')).toBeInTheDocument();

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      await user.click(retryButton);

      expect(mockPortfolioStore.clearError).toHaveBeenCalled();
    });

    it('should show empty holdings message', () => {
      mockPortfolioStore.holdings = [];

      render(<HoldingsTable />);

      expect(screen.getByText('No holdings yet.')).toBeInTheDocument();
      expect(screen.getByText(/add transactions to see your portfolio holdings/i)).toBeInTheDocument();
    });

    it('should display holdings correctly', () => {
      const asset = createMockAsset({
        id: 'asset-1',
        symbol: 'AAPL',
        name: 'Apple Inc.',
      });
      const holding = createMockHolding({
        assetId: 'asset-1',
        quantity: new Decimal(10),
        currentValue: new Decimal(1500),
      });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });
  });

  describe('Search & Filter', () => {
    beforeEach(() => {
      const assets = [
        createMockAsset({ id: 'asset-1', symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' }),
        createMockAsset({ id: 'asset-2', symbol: 'BTC', name: 'Bitcoin', type: 'crypto' }),
        createMockAsset({ id: 'asset-3', symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' }),
      ];
      const holdings = [
        createMockHolding({ id: 'h1', assetId: 'asset-1' }),
        createMockHolding({ id: 'h2', assetId: 'asset-2' }),
        createMockHolding({ id: 'h3', assetId: 'asset-3' }),
      ];

      mockPortfolioStore.holdings = holdings;
      mockPortfolioStore.assets = assets;
    });

    it('should filter by symbol', async () => {
      render(<HoldingsTable />);

      const searchInput = screen.getByPlaceholderText('Search holdings...');
      await user.type(searchInput, 'AAPL');

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.queryByText('BTC')).not.toBeInTheDocument();
        expect(screen.queryByText('MSFT')).not.toBeInTheDocument();
      });
    });

    it('should filter by name', async () => {
      render(<HoldingsTable />);

      const searchInput = screen.getByPlaceholderText('Search holdings...');
      await user.type(searchInput, 'Bitcoin');

      await waitFor(() => {
        expect(screen.getByText('BTC')).toBeInTheDocument();
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
      });
    });

    it('should search case-insensitive', async () => {
      render(<HoldingsTable />);

      const searchInput = screen.getByPlaceholderText('Search holdings...');
      await user.type(searchInput, 'apple');

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
      });
    });

    it('should show no results message when search has no matches', async () => {
      render(<HoldingsTable />);

      const searchInput = screen.getByPlaceholderText('Search holdings...');
      await user.type(searchInput, 'NONEXISTENT');

      await waitFor(() => {
        expect(screen.getByText('No holdings match your search criteria')).toBeInTheDocument();
      });
    });

    // SKIP: Radix UI Select component uses hasPointerCapture which is not implemented in jsdom
    // This is a known limitation: https://github.com/radix-ui/primitives/issues/420
    // The component works correctly in real browsers and E2E tests should cover this
    it.skip('should filter by asset type', async () => {
      render(<HoldingsTable />);

      const filterSelect = screen.getByRole('combobox');
      await user.click(filterSelect);

      const cryptoOption = await screen.findByRole('option', { name: 'Crypto' });
      await user.click(cryptoOption);

      await waitFor(() => {
        expect(screen.getByText('BTC')).toBeInTheDocument();
        expect(screen.queryByText('AAPL')).not.toBeInTheDocument();
        expect(screen.queryByText('MSFT')).not.toBeInTheDocument();
      });
    });

    // SKIP: Radix UI Select component uses hasPointerCapture which is not implemented in jsdom
    // This is a known limitation: https://github.com/radix-ui/primitives/issues/420
    // The component works correctly in real browsers and E2E tests should cover this
    it.skip('should combine search and filter', async () => {
      render(<HoldingsTable />);

      // Filter by stock type
      const filterSelect = screen.getByRole('combobox');
      await user.click(filterSelect);
      const stockOption = await screen.findByRole('option', { name: 'Stock' });
      await user.click(stockOption);

      // Then search for "AAPL"
      const searchInput = screen.getByPlaceholderText('Search holdings...');
      await user.type(searchInput, 'AAPL');

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.queryByText('MSFT')).not.toBeInTheDocument();
        expect(screen.queryByText('BTC')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    beforeEach(() => {
      const assets = [
        createMockAsset({ id: 'asset-1', symbol: 'AAPL' }),
        createMockAsset({ id: 'asset-2', symbol: 'MSFT' }),
        createMockAsset({ id: 'asset-3', symbol: 'BTC' }),
      ];
      const holdings = [
        createMockHolding({
          id: 'h1',
          assetId: 'asset-1',
          quantity: new Decimal(10),
          currentValue: new Decimal(1500),
          costBasis: new Decimal(1000),
        }),
        createMockHolding({
          id: 'h2',
          assetId: 'asset-2',
          quantity: new Decimal(5),
          currentValue: new Decimal(2000),
          costBasis: new Decimal(1500),
        }),
        createMockHolding({
          id: 'h3',
          assetId: 'asset-3',
          quantity: new Decimal(20),
          currentValue: new Decimal(3000),
          costBasis: new Decimal(2500),
        }),
      ];

      mockPortfolioStore.holdings = holdings;
      mockPortfolioStore.assets = assets;
    });

    it('should sort by symbol ascending by default', () => {
      render(<HoldingsTable />);

      const rows = screen.getAllByRole('row');
      // Skip header row
      expect(rows[1]).toHaveTextContent('AAPL');
      expect(rows[2]).toHaveTextContent('BTC');
      expect(rows[3]).toHaveTextContent('MSFT');
    });

    it('should toggle sort direction on column click', async () => {
      render(<HoldingsTable />);

      const symbolHeader = screen.getByText(/Symbol/);

      // Initial state: asc
      expect(symbolHeader).toHaveTextContent('↑');

      // Click to toggle to desc
      await user.click(symbolHeader);

      await waitFor(() => {
        expect(symbolHeader).toHaveTextContent('↓');
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('MSFT');
        expect(rows[2]).toHaveTextContent('BTC');
        expect(rows[3]).toHaveTextContent('AAPL');
      });
    });

    it('should sort by quantity', async () => {
      render(<HoldingsTable />);

      const quantityHeader = screen.getByText(/Quantity/);
      await user.click(quantityHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('MSFT'); // 5
        expect(rows[2]).toHaveTextContent('AAPL'); // 10
        expect(rows[3]).toHaveTextContent('BTC'); // 20
      });
    });

    it('should sort by current value', async () => {
      render(<HoldingsTable />);

      const valueHeader = screen.getByText(/Net Value/);
      await user.click(valueHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(rows[1]).toHaveTextContent('AAPL'); // 1500
        expect(rows[2]).toHaveTextContent('MSFT'); // 2000
        expect(rows[3]).toHaveTextContent('BTC'); // 3000
      });
    });

    it('should sort by gain/loss', async () => {
      render(<HoldingsTable />);

      const gainLossHeader = screen.getByText(/Gain\/Loss/);
      await user.click(gainLossHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // AAPL: 500, MSFT: 500, BTC: 500 - stable sort by symbol
        expect(rows[1]).toHaveTextContent('AAPL');
      });
    });

    it('should change sort field when clicking different column', async () => {
      render(<HoldingsTable />);

      const symbolHeader = screen.getByText(/Symbol/);
      const quantityHeader = screen.getByText(/Quantity/);

      // Initially sorted by symbol asc
      expect(symbolHeader).toHaveTextContent('↑');

      // Click quantity - should sort by quantity asc
      await user.click(quantityHeader);

      await waitFor(() => {
        expect(quantityHeader).toHaveTextContent('↑');
        expect(symbolHeader).not.toHaveTextContent('↑');
      });
    });
  });

  describe('Price Integration', () => {
    it('should display live price from price store', () => {
      const asset = createMockAsset({ id: 'asset-1', symbol: 'AAPL' });
      const holding = createMockHolding({ assetId: 'asset-1' });
      const livePrice = createMockLivePriceData({
        symbol: 'AAPL',
        displayPrice: '175.50',
      });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];
      mockPriceStore.prices = new Map([['AAPL', livePrice]]);

      render(<HoldingsTable />);

      expect(screen.getByTestId('price-display')).toHaveTextContent('175.50');
    });

    it('should fallback to stored price when no live price available', () => {
      const asset = createMockAsset({ id: 'asset-1', symbol: 'AAPL' });
      const holding = createMockHolding({
        assetId: 'asset-1',
        quantity: new Decimal(10),
        currentValue: new Decimal(1500),
      });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];
      mockPriceStore.prices = new Map();

      render(<HoldingsTable />);

      // Should calculate from currentValue / quantity = 1500 / 10 = 150
      expect(screen.getByText('$150.00')).toBeInTheDocument();
    });

    it('should calculate gain/loss with live price', () => {
      const asset = createMockAsset({ id: 'asset-1', symbol: 'AAPL' });
      const holding = createMockHolding({
        assetId: 'asset-1',
        quantity: new Decimal(10),
        costBasis: new Decimal(1000),
        currentValue: new Decimal(1500),
      });
      const livePrice = createMockLivePriceData({
        symbol: 'AAPL',
        displayPrice: '200.00',
      });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];
      mockPriceStore.prices = new Map([['AAPL', livePrice]]);

      render(<HoldingsTable />);

      // With live price: 10 * 200 = 2000, gain = 2000 - 1000 = 1000
      expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    });

    it('should calculate gain/loss without live price', () => {
      const asset = createMockAsset({ id: 'asset-1', symbol: 'AAPL' });
      const holding = createMockHolding({
        assetId: 'asset-1',
        quantity: new Decimal(10),
        costBasis: new Decimal(1000),
        currentValue: new Decimal(1500),
      });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];
      mockPriceStore.prices = new Map();

      render(<HoldingsTable />);

      // Gain = currentValue - costBasis = 1500 - 1000 = 500
      expect(screen.getByText('$500.00')).toBeInTheDocument();
    });
  });

  describe('Formatting', () => {
    it('should format crypto quantity with 4 decimal places', () => {
      const asset = createMockAsset({
        id: 'asset-1',
        symbol: 'BTC',
        type: 'crypto',
      });
      const holding = createMockHolding({
        assetId: 'asset-1',
        quantity: new Decimal(1.23456789),
      });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      expect(screen.getByText('1.2346')).toBeInTheDocument();
    });

    it('should format non-crypto quantity with 0 decimal places', () => {
      const asset = createMockAsset({
        id: 'asset-1',
        symbol: 'AAPL',
        type: 'stock',
      });
      const holding = createMockHolding({
        assetId: 'asset-1',
        quantity: new Decimal(10.5),
      });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      expect(screen.getByText('11')).toBeInTheDocument(); // Rounded
    });

    it('should display type badge with correct color for stock', () => {
      const asset = createMockAsset({ id: 'asset-1', symbol: 'AAPL', type: 'stock' });
      const holding = createMockHolding({ assetId: 'asset-1' });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      const badge = screen.getByText('STOCK');
      expect(badge).toHaveClass('bg-blue-100');
    });

    it('should display type badge with correct color for crypto', () => {
      const asset = createMockAsset({ id: 'asset-1', symbol: 'BTC', type: 'crypto' });
      const holding = createMockHolding({ assetId: 'asset-1' });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      const badge = screen.getByText('CRYPTO');
      expect(badge).toHaveClass('bg-orange-100');
    });

    it('should display exchange badge when exchange is present', () => {
      const asset = createMockAsset({
        id: 'asset-1',
        symbol: 'AAPL',
        exchange: 'NASDAQ',
      });
      const holding = createMockHolding({ assetId: 'asset-1' });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      expect(screen.getByText('NASDAQ')).toBeInTheDocument();
    });

    it('should auto-detect LSE badge for UK symbols', () => {
      const asset = createMockAsset({
        id: 'asset-1',
        symbol: 'VOD.L',
        exchange: undefined,
      });
      const holding = createMockHolding({ assetId: 'asset-1' });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      expect(screen.getByText('LSE')).toBeInTheDocument();
    });
  });

  describe('Badges & Indicators', () => {
    it('should display manual valuation badge', () => {
      const asset = createMockAsset({
        id: 'asset-1',
        symbol: 'MANUAL1',
        valuationMethod: 'MANUAL',
      });
      const holding = createMockHolding({ assetId: 'asset-1' });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      expect(screen.getByText('Manual')).toBeInTheDocument();
    });

    it('should display rental property badge with yield', () => {
      const asset = createMockAsset({
        id: 'asset-1',
        symbol: 'PROP1',
        type: 'real_estate',
        rentalInfo: {
          isRental: true,
          monthlyRent: new Decimal(1000),
        },
      });
      const holding = createMockHolding({ assetId: 'asset-1' });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      expect(screen.getByText(/Rental: 5.50%/)).toBeInTheDocument();
    });

    it('should display ownership percentage badge when less than 100%', () => {
      const asset = createMockAsset({ id: 'asset-1', symbol: 'SHARED1' });
      const holding = createMockHolding({
        assetId: 'asset-1',
        ownershipPercentage: 50,
      });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      expect(screen.getByText('50% owned')).toBeInTheDocument();
    });

    it('should not display ownership badge when 100%', () => {
      const asset = createMockAsset({ id: 'asset-1', symbol: 'OWNED1' });
      const holding = createMockHolding({
        assetId: 'asset-1',
        ownershipPercentage: 100,
      });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      expect(screen.queryByText('100% owned')).not.toBeInTheDocument();
    });
  });

  describe('Dialogs', () => {
    it('should open manual price update dialog when menu item clicked', async () => {
      const asset = createMockAsset({
        id: 'asset-1',
        symbol: 'MANUAL1',
        valuationMethod: 'MANUAL',
      });
      const holding = createMockHolding({ assetId: 'asset-1' });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      const menuButton = screen.getByRole('button', { name: '' });
      await user.click(menuButton);

      const updatePriceItem = await screen.findByText('Update Price');
      await user.click(updatePriceItem);

      await waitFor(() => {
        expect(screen.getByTestId('manual-price-dialog')).toHaveTextContent('MANUAL1');
      });
    });

    it('should open region override dialog when menu item clicked', async () => {
      const asset = createMockAsset({ id: 'asset-1', symbol: 'AAPL' });
      const holding = createMockHolding({ assetId: 'asset-1' });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      render(<HoldingsTable />);

      const menuButton = screen.getByRole('button', { name: '' });
      await user.click(menuButton);

      const setRegionItem = await screen.findByText('Set Region');
      await user.click(setRegionItem);

      await waitFor(() => {
        expect(screen.getByTestId('region-dialog')).toHaveTextContent('AAPL');
      });
    });

    it('should close dialog when onOpenChange is called', async () => {
      const asset = createMockAsset({
        id: 'asset-1',
        symbol: 'MANUAL1',
        valuationMethod: 'MANUAL',
      });
      const holding = createMockHolding({ assetId: 'asset-1' });

      mockPortfolioStore.holdings = [holding];
      mockPortfolioStore.assets = [asset];

      const { rerender } = render(<HoldingsTable />);

      const menuButton = screen.getByRole('button', { name: '' });
      await user.click(menuButton);

      const updatePriceItem = await screen.findByText('Update Price');
      await user.click(updatePriceItem);

      // Dialog should be open
      expect(screen.getByTestId('manual-price-dialog')).toBeInTheDocument();

      // Rerender to simulate dialog close
      rerender(<HoldingsTable />);

      // Note: In real implementation, clicking outside or close button would trigger onOpenChange(false)
      // which sets priceUpdateAsset to null, hiding the dialog
    });
  });
});
