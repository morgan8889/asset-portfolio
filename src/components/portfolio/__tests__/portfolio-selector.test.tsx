import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Portfolio, PortfolioSettings } from '@/types';
import { PortfolioSelector } from '../portfolio-selector';

// Mock stores
const mockPortfolios: Portfolio[] = [
  {
    id: 'p1',
    name: 'Taxable Account',
    type: 'taxable',
    currency: 'USD',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastAccessedAt: new Date('2024-01-15'),
    settings: {
      rebalanceThreshold: 5,
      taxStrategy: 'fifo',
    } as PortfolioSettings,
  },
  {
    id: 'p2',
    name: 'IRA',
    type: 'ira',
    currency: 'USD',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastAccessedAt: new Date('2024-01-10'),
    settings: {
      rebalanceThreshold: 5,
      taxStrategy: 'fifo',
    } as PortfolioSettings,
  },
  {
    id: 'p3',
    name: '401k',
    type: '401k',
    currency: 'USD',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastAccessedAt: new Date('2024-01-05'),
    settings: {
      rebalanceThreshold: 5,
      taxStrategy: 'fifo',
    } as PortfolioSettings,
  },
];

const mockSetCurrentPortfolio = vi.fn();
const mockGetSortedPortfolios = vi.fn(() => mockPortfolios);

// Use a mutable variable for CSV import state
const { mockCsvState } = vi.hoisted(() => ({
  mockCsvState: { isProcessing: false },
}));

vi.mock('@/lib/stores/portfolio', () => ({
  usePortfolioStore: () => ({
    portfolios: mockPortfolios,
    currentPortfolio: mockPortfolios[0],
    setCurrentPortfolio: mockSetCurrentPortfolio,
    getSortedPortfolios: mockGetSortedPortfolios,
  }),
}));

vi.mock('@/lib/stores/csv-import', () => ({
  useCsvImportStore: () => mockCsvState,
}));

// Mock tooltip components to render directly in jsdom
vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => children,
  Tooltip: ({ children }: any) => children,
  TooltipTrigger: ({ children, asChild }: any) => children,
  TooltipContent: ({ children }: any) => <div role="tooltip">{children}</div>,
}));

describe('PortfolioSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCsvState.isProcessing = false;
  });

  describe('Rendering', () => {
    it('should render current portfolio name', () => {
      render(<PortfolioSelector />);

      expect(screen.getByText('Taxable Account')).toBeInTheDocument();
    });

    it('should display portfolio type badge', () => {
      render(<PortfolioSelector />);

      // Use exact match for the badge text to avoid matching the portfolio name
      expect(screen.getByText('Taxable')).toBeInTheDocument();
    });

    it('should show dropdown trigger button', () => {
      render(<PortfolioSelector />);

      const trigger = screen.getByRole('button', {
        name: /select portfolio/i,
      });
      expect(trigger).toBeInTheDocument();
    });
  });

  describe('Sorting Behavior', () => {
    it('should display portfolios sorted by recency (most recent first)', async () => {
      const user = userEvent.setup();
      render(<PortfolioSelector />);

      const trigger = screen.getByRole('button', {
        name: /select portfolio/i,
      });
      await user.click(trigger);

      await waitFor(() => {
        expect(mockGetSortedPortfolios).toHaveBeenCalled();
      });

      const items = screen.getAllByRole('menuitem');
      expect(items[0]).toHaveTextContent('Taxable Account');
      expect(items[1]).toHaveTextContent('IRA');
      expect(items[2]).toHaveTextContent('401k');
    });

    it('should show current portfolio with check mark', async () => {
      const user = userEvent.setup();
      render(<PortfolioSelector />);

      const trigger = screen.getByRole('button', {
        name: /select portfolio/i,
      });
      await user.click(trigger);

      await waitFor(() => {
        const currentItem = screen.getByRole('menuitem', {
          name: /taxable account/i,
        });
        expect(currentItem).toHaveAttribute('data-state', 'checked');
      });
    });
  });

  describe('Portfolio Selection', () => {
    it('should call setCurrentPortfolio when selecting a different portfolio', async () => {
      const user = userEvent.setup();
      render(<PortfolioSelector />);

      const trigger = screen.getByRole('button', {
        name: /select portfolio/i,
      });
      await user.click(trigger);

      const iraOption = await screen.findByRole('menuitem', { name: /ira/i });
      await user.click(iraOption);

      expect(mockSetCurrentPortfolio).toHaveBeenCalledWith(mockPortfolios[1]);
    });

    it('should not call setCurrentPortfolio when selecting current portfolio', async () => {
      const user = userEvent.setup();
      render(<PortfolioSelector />);

      const trigger = screen.getByRole('button', {
        name: /select portfolio/i,
      });
      await user.click(trigger);

      const taxableOption = await screen.findByRole('menuitem', {
        name: /taxable account/i,
      });
      await user.click(taxableOption);

      // Should not be called since the same portfolio is already selected
      expect(mockSetCurrentPortfolio).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State During CSV Import', () => {
    it('should disable selector when CSV import is in progress', () => {
      mockCsvState.isProcessing = true;

      render(<PortfolioSelector />);

      const trigger = screen.getByRole('button', {
        name: /select portfolio/i,
      });
      expect(trigger).toBeDisabled();
    });

    it('should show tooltip when disabled during import', () => {
      mockCsvState.isProcessing = true;

      render(<PortfolioSelector />);

      // With mocked tooltip components, the tooltip content renders directly
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(/cannot switch portfolios during/i);
    });
  });
});
