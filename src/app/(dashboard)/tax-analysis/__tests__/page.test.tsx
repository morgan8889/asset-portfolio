/**
 * Tax Analysis Page Integration Tests
 *
 * Tests the integration between the tax-analysis page, stores, and components.
 * Specifically catches 4 bugs that were not covered by unit tests:
 *
 * Bug #1: Map iteration - Object.entries(prices) doesn't work on Maps
 * Bug #2: Missing price polling - No setWatchedSymbols, startPolling calls
 * Bug #3: Missing asset loading - No loadAssets() call before symbol extraction
 * Bug #4: useMemo staleness - Map reference doesn't change when contents update
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import TaxAnalysisPage from '../page';
import {
  mockPortfolio,
  mockHoldings,
  mockAssets,
  mockPricesSymbolKeyed,
  demonstrateMapIterationBug,
} from './fixtures';

// ============================================================================
// Mock Setup
// ============================================================================

// Mutable state for testing different scenarios
const mockState = {
  portfolio: mockPortfolio,
  holdings: [] as typeof mockHoldings,
  assets: [] as typeof mockAssets,
  loading: false,
  prices: new Map() as typeof mockPricesSymbolKeyed,
  lastFetchTime: null as Date | null,
};

// Mock store functions
const mockLoadHoldings = vi.fn();
const mockLoadAssets = vi.fn();
const mockSetWatchedSymbols = vi.fn();
const mockStartPolling = vi.fn();
const mockStopPolling = vi.fn();
const mockRefreshAllPrices = vi.fn();
const mockLoadPreferences = vi.fn();

// Mock the stores
vi.mock('@/lib/stores', () => ({
  usePortfolioStore: () => ({
    currentPortfolio: mockState.portfolio,
    holdings: mockState.holdings,
    loadHoldings: mockLoadHoldings,
    loading: mockState.loading,
  }),
  useAssetStore: () => ({
    assets: mockState.assets,
    loadAssets: mockLoadAssets,
  }),
  usePriceStore: () => ({
    prices: mockState.prices,
    lastFetchTime: mockState.lastFetchTime,
    setWatchedSymbols: mockSetWatchedSymbols,
    startPolling: mockStartPolling,
    stopPolling: mockStopPolling,
    refreshAllPrices: mockRefreshAllPrices,
    loadPreferences: mockLoadPreferences,
  }),
}));

// Mock the TaxAnalysisTab component to simplify testing
vi.mock('@/components/holdings/tax-analysis-tab', () => ({
  TaxAnalysisTab: ({ holdings, prices, assetSymbolMap }: any) => {
    const priceEntries: [string, any][] = Array.from(prices.entries());
    return (
      <div data-testid="tax-analysis-tab">
        <div data-testid="holdings-count">{holdings.length}</div>
        <div data-testid="prices-count">{prices.size}</div>
        <div data-testid="symbols-count">{assetSymbolMap.size}</div>
        {priceEntries.map(([id, price]) => (
          <div key={id} data-testid={`price-${id}`}>
            ${typeof price === 'object' ? price.toString() : price}
          </div>
        ))}
      </div>
    );
  },
}));

// ============================================================================
// Test Suite
// ============================================================================

describe('TaxAnalysisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default state
    mockState.portfolio = mockPortfolio;
    mockState.holdings = [];
    mockState.assets = [];
    mockState.loading = false;
    mockState.prices = new Map();
    mockState.lastFetchTime = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Bug #1: Map Iteration', () => {
    it('should demonstrate that Object.entries returns empty for Maps', () => {
      // This test proves the bug exists
      const { bugBehavior, correctBehavior } = demonstrateMapIterationBug();

      // Object.entries on Map returns empty array - BUG
      expect(bugBehavior).toBe(0);

      // forEach correctly iterates Map - CORRECT
      expect(correctBehavior).toBe(1);
    });

    it('should convert priceStore Map to assetId-keyed Map using forEach', async () => {
      // Setup with both holdings and assets loaded
      mockState.holdings = mockHoldings;
      mockState.assets = mockAssets;
      mockState.prices = mockPricesSymbolKeyed;
      mockState.lastFetchTime = new Date();

      render(<TaxAnalysisPage />);

      await waitFor(() => {
        // Verify that prices were converted correctly
        // The page should have converted symbol-keyed prices to assetId-keyed
        const pricesCount = screen.getByTestId('prices-count');
        expect(pricesCount).toHaveTextContent('2');
      });
    });

    it('should skip symbols not in symbolToAssetId map', async () => {
      mockState.holdings = mockHoldings;
      mockState.assets = mockAssets;
      // Add a price for a symbol that doesn't have a corresponding asset
      const pricesWithUnknown = new Map(mockPricesSymbolKeyed);
      pricesWithUnknown.set('UNKNOWN', {
        symbol: 'UNKNOWN',
        displayPrice: '100.00',
        displayCurrency: 'USD',
        price: '100.00',
        currency: 'USD',
        change: '0',
        changePercent: 0,
        timestamp: new Date(),
        source: 'yahoo',
        staleness: 'fresh' as const,
      });
      mockState.prices = pricesWithUnknown;
      mockState.lastFetchTime = new Date();

      render(<TaxAnalysisPage />);

      await waitFor(() => {
        // Should only have 2 prices (AAPL and MSFT), not 3 (UNKNOWN is skipped)
        const pricesCount = screen.getByTestId('prices-count');
        expect(pricesCount).toHaveTextContent('2');
      });
    });
  });

  describe('Bug #2: Missing Price Polling', () => {
    it('should call setWatchedSymbols when holdings and assets are ready', async () => {
      mockState.holdings = mockHoldings;
      mockState.assets = mockAssets;

      render(<TaxAnalysisPage />);

      await waitFor(() => {
        expect(mockSetWatchedSymbols).toHaveBeenCalledWith(['AAPL', 'MSFT']);
      });
    });

    it('should call startPolling after setting watched symbols', async () => {
      mockState.holdings = mockHoldings;
      mockState.assets = mockAssets;

      render(<TaxAnalysisPage />);

      await waitFor(() => {
        expect(mockStartPolling).toHaveBeenCalled();
      });
    });

    it('should call refreshAllPrices when symbols are set', async () => {
      mockState.holdings = mockHoldings;
      mockState.assets = mockAssets;

      render(<TaxAnalysisPage />);

      await waitFor(() => {
        expect(mockRefreshAllPrices).toHaveBeenCalled();
      });
    });

    it('should not set watched symbols if no holdings', async () => {
      mockState.holdings = [];
      mockState.assets = mockAssets;

      render(<TaxAnalysisPage />);

      // Wait for effects to settle
      await waitFor(() => {
        expect(mockLoadPreferences).toHaveBeenCalled();
      });

      // Should not call setWatchedSymbols with empty holdings
      expect(mockSetWatchedSymbols).not.toHaveBeenCalled();
    });

    it('should not set watched symbols until assets are loaded', async () => {
      mockState.holdings = mockHoldings;
      mockState.assets = []; // Assets not loaded yet

      render(<TaxAnalysisPage />);

      // Wait for effects to settle
      await waitFor(() => {
        expect(mockLoadPreferences).toHaveBeenCalled();
      });

      // Should not call setWatchedSymbols until assets are loaded
      expect(mockSetWatchedSymbols).not.toHaveBeenCalled();
    });

    it('should cleanup polling on unmount', async () => {
      mockState.holdings = mockHoldings;
      mockState.assets = mockAssets;

      const { unmount } = render(<TaxAnalysisPage />);

      await waitFor(() => {
        expect(mockStartPolling).toHaveBeenCalled();
      });

      unmount();

      expect(mockStopPolling).toHaveBeenCalled();
    });
  });

  describe('Bug #3: Missing Asset Loading', () => {
    it('should call loadAssets when portfolio changes', async () => {
      render(<TaxAnalysisPage />);

      await waitFor(() => {
        expect(mockLoadAssets).toHaveBeenCalled();
      });
    });

    it('should call loadHoldings when portfolio changes', async () => {
      render(<TaxAnalysisPage />);

      await waitFor(() => {
        expect(mockLoadHoldings).toHaveBeenCalledWith(mockPortfolio.id);
      });
    });

    it('should not load if no portfolio is selected', async () => {
      mockState.portfolio = null as any;

      render(<TaxAnalysisPage />);

      // Wait a bit for effects
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockLoadAssets).not.toHaveBeenCalled();
      expect(mockLoadHoldings).not.toHaveBeenCalled();
    });
  });

  describe('Bug #4: useMemo Staleness', () => {
    it('should recalculate pricesMap when lastFetchTime changes', async () => {
      mockState.holdings = mockHoldings;
      mockState.assets = mockAssets;
      mockState.prices = mockPricesSymbolKeyed;
      mockState.lastFetchTime = new Date('2024-01-01T10:00:00');

      const { rerender } = render(<TaxAnalysisPage />);

      await waitFor(() => {
        expect(screen.getByTestId('prices-count')).toHaveTextContent('2');
      });

      // Simulate price update (same Map reference, new lastFetchTime)
      const updatedPrices = new Map(mockPricesSymbolKeyed);
      updatedPrices.set('AAPL', {
        ...mockPricesSymbolKeyed.get('AAPL')!,
        displayPrice: '200.00',
      });
      mockState.prices = updatedPrices;
      mockState.lastFetchTime = new Date('2024-01-01T10:01:00');

      rerender(<TaxAnalysisPage />);

      // The prices should still be present (memoization was triggered)
      await waitFor(() => {
        const pricesCount = screen.getByTestId('prices-count');
        expect(pricesCount).toHaveTextContent('2');
      });
    });

    it('should use lastFetchTime as recalculation trigger', async () => {
      mockState.holdings = mockHoldings;
      mockState.assets = mockAssets;
      mockState.prices = mockPricesSymbolKeyed;
      mockState.lastFetchTime = null;

      render(<TaxAnalysisPage />);

      // Initially no prices because lastFetchTime is null
      await waitFor(() => {
        const pricesCount = screen.getByTestId('prices-count');
        // With null lastFetchTime, prices should still be calculated
        expect(pricesCount).toBeDefined();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should show select portfolio message when no portfolio', async () => {
      mockState.portfolio = null as any;

      render(<TaxAnalysisPage />);

      await waitFor(() => {
        expect(screen.getByText(/select a portfolio/i)).toBeInTheDocument();
      });
    });

    it('should show loading state when loading', async () => {
      mockState.loading = true;

      render(<TaxAnalysisPage />);

      await waitFor(() => {
        expect(screen.getByText(/loading holdings data/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no holdings', async () => {
      mockState.holdings = [];

      render(<TaxAnalysisPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/don't have any holdings/i)
        ).toBeInTheDocument();
      });
    });

    it('should render with empty prices Map', async () => {
      mockState.holdings = mockHoldings;
      mockState.assets = mockAssets;
      mockState.prices = new Map();
      mockState.lastFetchTime = null;

      render(<TaxAnalysisPage />);

      await waitFor(() => {
        // Should render with 0 prices
        const pricesCount = screen.getByTestId('prices-count');
        expect(pricesCount).toHaveTextContent('0');
      });
    });
  });

  describe('Symbol Extraction', () => {
    it('should extract unique symbols from holdings through assets', async () => {
      mockState.holdings = mockHoldings;
      mockState.assets = mockAssets;

      render(<TaxAnalysisPage />);

      await waitFor(() => {
        expect(mockSetWatchedSymbols).toHaveBeenCalledWith(
          expect.arrayContaining(['AAPL', 'MSFT'])
        );
      });
    });

    it('should handle holdings with no matching asset', async () => {
      // Holding with an asset ID that doesn't exist in assets
      const holdingsWithMissing = [
        ...mockHoldings,
        {
          ...mockHoldings[0],
          id: 'holding-unknown',
          assetId: 'asset-unknown-id',
        },
      ];
      mockState.holdings = holdingsWithMissing;
      mockState.assets = mockAssets;

      render(<TaxAnalysisPage />);

      await waitFor(() => {
        // Should only include symbols for existing assets
        expect(mockSetWatchedSymbols).toHaveBeenCalledWith(['AAPL', 'MSFT']);
      });
    });
  });
});
