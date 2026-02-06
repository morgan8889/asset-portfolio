/**
 * TaxAnalysisTab Component Tests
 *
 * Tests the tax analysis tab component's handling of price data,
 * specifically verifying that it works correctly with Map<string, Decimal>
 * keyed by assetId (not symbol).
 *
 * Catches Bug #1: Map iteration issues where wrong keys cause $0 values
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Decimal } from 'decimal.js';
import { TaxAnalysisTab } from '../tax-analysis-tab';
import { Holding, TaxLot } from '@/types/asset';

// ============================================================================
// Mock Setup
// ============================================================================

const mockTaxSettings = {
  shortTermRate: new Decimal('0.24'),
  longTermRate: new Decimal('0.15'),
};

vi.mock('@/lib/stores/tax-settings', () => ({
  useTaxSettingsStore: () => ({
    taxSettings: mockTaxSettings,
  }),
}));

// Mock tooltip components for easier testing
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => children,
  Tooltip: ({ children }: any) => children,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => <div role="tooltip">{children}</div>,
}));

// ============================================================================
// Test Data
// ============================================================================

// Use dates that are clearly long-term (>365 days) or short-term (<365 days)
const twoYearsAgo = new Date();
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

const mockTaxLots: TaxLot[] = [
  {
    id: 'lot-1',
    quantity: new Decimal(100),
    purchasePrice: new Decimal(150),
    purchaseDate: twoYearsAgo, // Clearly long-term (>365 days)
    soldQuantity: new Decimal(0),
    remainingQuantity: new Decimal(100),
    lotType: 'standard',
  },
];

const mockShortTermTaxLots: TaxLot[] = [
  {
    id: 'lot-2',
    quantity: new Decimal(50),
    purchasePrice: new Decimal(350),
    purchaseDate: threeMonthsAgo, // Clearly short-term (<365 days)
    soldQuantity: new Decimal(0),
    remainingQuantity: new Decimal(50),
    lotType: 'standard',
  },
];

const createMockHoldings = (): Holding[] => [
  {
    id: 'holding-aapl-1',
    portfolioId: 'portfolio-test-1',
    assetId: 'asset-uuid-aapl',
    quantity: new Decimal(100),
    costBasis: new Decimal(15000),
    averageCost: new Decimal(150),
    currentValue: new Decimal(17500),
    unrealizedGain: new Decimal(2500),
    unrealizedGainPercent: 16.67,
    lots: mockTaxLots,
    lastUpdated: new Date(),
  },
  {
    id: 'holding-msft-1',
    portfolioId: 'portfolio-test-1',
    assetId: 'asset-uuid-msft',
    quantity: new Decimal(50),
    costBasis: new Decimal(17500),
    averageCost: new Decimal(350),
    currentValue: new Decimal(21000),
    unrealizedGain: new Decimal(3500),
    unrealizedGainPercent: 20.0,
    lots: mockShortTermTaxLots,
    lastUpdated: new Date(),
  },
];

// ============================================================================
// Test Suite
// ============================================================================

describe('TaxAnalysisTab', () => {
  describe('Rendering with Prices', () => {
    it('should render loading skeleton with empty prices Map and holdings with lots', () => {
      const holdings = createMockHoldings();
      const emptyPrices = new Map<string, Decimal>();
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
        ['asset-uuid-msft', 'MSFT'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={emptyPrices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      // Should show loading skeleton when prices are empty but lots exist
      // The loading skeleton has skeleton elements with animate-pulse class
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render tax data when prices Map is populated', async () => {
      const holdings = createMockHoldings();
      // Prices keyed by assetId (CORRECT format)
      const prices = new Map<string, Decimal>([
        ['asset-uuid-aapl', new Decimal('175.00')],
        ['asset-uuid-msft', new Decimal('420.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
        ['asset-uuid-msft', 'MSFT'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      // Should show actual data in summary cards
      await waitFor(() => {
        expect(screen.getByText(/net unrealized gain/i)).toBeInTheDocument();
        expect(screen.getByText(/short-term.*long-term/i)).toBeInTheDocument();
        expect(screen.getByText(/estimated tax liability/i)).toBeInTheDocument();
      });

      // Should show tax lot table
      expect(screen.getByText(/tax lot analysis/i)).toBeInTheDocument();
    });

    it('should handle Map with assetId keys correctly', async () => {
      const holdings = createMockHoldings();
      // This is the CORRECT format: keyed by assetId
      const prices = new Map<string, Decimal>([
        ['asset-uuid-aapl', new Decimal('175.00')],
        ['asset-uuid-msft', new Decimal('420.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
        ['asset-uuid-msft', 'MSFT'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      // Verify lots appear in table
      await waitFor(() => {
        // Look for asset symbols in the table
        const aaplCells = screen.getAllByText('AAPL');
        const msftCells = screen.getAllByText('MSFT');
        expect(aaplCells.length).toBeGreaterThan(0);
        expect(msftCells.length).toBeGreaterThan(0);
      });
    });

    it('should render content but with empty tax analysis when prices Map has wrong keys (symbol instead of assetId)', async () => {
      const holdings = createMockHoldings();
      // WRONG format: keyed by symbol instead of assetId
      // This demonstrates what happens when Bug #1 occurs
      const wrongKeyedPrices = new Map<string, Decimal>([
        ['AAPL', new Decimal('175.00')], // Wrong! Should be 'asset-uuid-aapl'
        ['MSFT', new Decimal('420.00')], // Wrong! Should be 'asset-uuid-msft'
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
        ['asset-uuid-msft', 'MSFT'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={wrongKeyedPrices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      // When keys are wrong, the component won't find prices for the assetIds
      // The tax-estimator will log "Skipping asset-uuid-xxx - no price available"
      // and the component will render with empty lots and $0 values
      await waitFor(() => {
        // The component renders but has no matching prices, so no lots
        expect(screen.getByText(/no tax lots to display/i)).toBeInTheDocument();
      });
    });
  });

  describe('Summary Cards', () => {
    it('should display summary cards with correct structure', async () => {
      const holdings = createMockHoldings();
      const prices = new Map<string, Decimal>([
        ['asset-uuid-aapl', new Decimal('175.00')],
        ['asset-uuid-msft', new Decimal('420.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
        ['asset-uuid-msft', 'MSFT'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      // Verify all three summary cards
      await waitFor(() => {
        expect(screen.getByText(/net unrealized gain/i)).toBeInTheDocument();
        expect(screen.getByText(/short-term.*long-term/i)).toBeInTheDocument();
        expect(screen.getByText(/estimated tax liability/i)).toBeInTheDocument();
        expect(screen.getByText(/if all sold today/i)).toBeInTheDocument();
      });
    });

    it('should show tax rates from settings', async () => {
      const holdings = createMockHoldings();
      const prices = new Map<string, Decimal>([
        ['asset-uuid-aapl', new Decimal('175.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      await waitFor(() => {
        // Should show tax rates (24% / 15%)
        expect(screen.getByText(/24\.0%/)).toBeInTheDocument();
        expect(screen.getByText(/15\.0%/)).toBeInTheDocument();
      });
    });
  });

  describe('Tax Lot Table', () => {
    it('should display column headers', async () => {
      const holdings = createMockHoldings();
      const prices = new Map<string, Decimal>([
        ['asset-uuid-aapl', new Decimal('175.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      await waitFor(() => {
        // Verify table headers
        expect(screen.getByRole('columnheader', { name: /asset/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /date/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /qty/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /cost/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /value/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /gain/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /period/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /type/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
      });
    });

    it('should show lot count in table header', async () => {
      const holdings = createMockHoldings();
      const prices = new Map<string, Decimal>([
        ['asset-uuid-aapl', new Decimal('175.00')],
        ['asset-uuid-msft', new Decimal('420.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
        ['asset-uuid-msft', 'MSFT'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      await waitFor(() => {
        // Should show "2 lots across all holdings"
        expect(screen.getByText(/2 lots/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no lots', async () => {
      const holdingsNoLots: Holding[] = [
        {
          ...createMockHoldings()[0],
          lots: [],
        },
      ];
      const prices = new Map<string, Decimal>([
        ['asset-uuid-aapl', new Decimal('175.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdingsNoLots}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/no tax lots to display/i)).toBeInTheDocument();
      });
    });
  });

  describe('Holding Period Classification', () => {
    it('should show LT badge for long-term holdings (>1 year)', async () => {
      const holdings = createMockHoldings().slice(0, 1); // Just AAPL (long-term)
      const prices = new Map<string, Decimal>([
        ['asset-uuid-aapl', new Decimal('175.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      await waitFor(() => {
        const ltBadge = screen.getByLabelText(/long-term/i);
        expect(ltBadge).toBeInTheDocument();
      });
    });

    it('should show ST badge for short-term holdings (<1 year)', async () => {
      const holdings = createMockHoldings().slice(1, 2); // Just MSFT (short-term)
      const prices = new Map<string, Decimal>([
        ['asset-uuid-msft', new Decimal('420.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-msft', 'MSFT'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      await waitFor(() => {
        const stBadge = screen.getByLabelText(/short-term/i);
        expect(stBadge).toBeInTheDocument();
      });
    });
  });

  describe('Lot Type Badges', () => {
    it('should show Standard badge for regular purchases', async () => {
      const holdings = createMockHoldings().slice(0, 1);
      const prices = new Map<string, Decimal>([
        ['asset-uuid-aapl', new Decimal('175.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      await waitFor(() => {
        const stdBadge = screen.getByLabelText(/standard/i);
        expect(stdBadge).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('should sort by date when clicking date header', async () => {
      const user = userEvent.setup();
      const holdings = createMockHoldings();
      const prices = new Map<string, Decimal>([
        ['asset-uuid-aapl', new Decimal('175.00')],
        ['asset-uuid-msft', new Decimal('420.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
        ['asset-uuid-msft', 'MSFT'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /date/i })).toBeInTheDocument();
      });

      // Click to sort
      const dateButton = screen.getByRole('button', { name: /date/i });
      await user.click(dateButton);

      // Click again to reverse sort
      await user.click(dateButton);

      // Table should still be present after sorting
      expect(screen.getByText(/tax lot analysis/i)).toBeInTheDocument();
    });

    it('should sort by quantity when clicking qty header', async () => {
      const user = userEvent.setup();
      const holdings = createMockHoldings();
      const prices = new Map<string, Decimal>([
        ['asset-uuid-aapl', new Decimal('175.00')],
        ['asset-uuid-msft', new Decimal('420.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
        ['asset-uuid-msft', 'MSFT'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /qty/i })).toBeInTheDocument();
      });

      const qtyButton = screen.getByRole('button', { name: /qty/i });
      await user.click(qtyButton);

      // Table should still be present
      expect(screen.getByText(/tax lot analysis/i)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading skeleton when prices are empty and holdings with lots exist', () => {
      const holdings = createMockHoldings();
      const emptyPrices = new Map<string, Decimal>();
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
        ['asset-uuid-msft', 'MSFT'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={emptyPrices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      // When there are holdings with lots but no prices,
      // the component shows a loading skeleton state
      // This verifies the loading logic is working
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not show loading when prices are available', async () => {
      const holdings = createMockHoldings();
      const prices = new Map<string, Decimal>([
        ['asset-uuid-aapl', new Decimal('175.00')],
        ['asset-uuid-msft', new Decimal('420.00')],
      ]);
      const assetSymbolMap = new Map<string, string>([
        ['asset-uuid-aapl', 'AAPL'],
        ['asset-uuid-msft', 'MSFT'],
      ]);

      render(
        <TaxAnalysisTab
          holdings={holdings}
          prices={prices}
          assetSymbolMap={assetSymbolMap}
        />
      );

      await waitFor(() => {
        // Should show actual content, not loading
        expect(screen.getByText(/net unrealized gain/i)).toBeInTheDocument();
        expect(screen.getByText(/tax lot analysis/i)).toBeInTheDocument();
      });
    });
  });
});
