import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PortfoliosTable } from '../portfolios-table';

// Use vi.hoisted for mutable state accessible in vi.mock factories
const { mockStoreState } = vi.hoisted(() => ({
  mockStoreState: {
    portfolios: [] as any[],
    currentPortfolio: null as any,
    deletePortfolio: vi.fn(),
  },
}));

vi.mock('@/lib/stores/portfolio', () => ({
  usePortfolioStore: (selector?: any) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState);
    }
    return mockStoreState;
  },
}));

vi.mock('@/lib/db', () => ({
  holdingQueries: {
    getByPortfolio: vi.fn(() => Promise.resolve([])),
  },
  db: {
    transactions: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          count: vi.fn(() => Promise.resolve(0)),
        })),
      })),
    },
  },
}));

vi.mock('@/lib/utils/currency', () => ({
  formatCurrency: vi.fn((value) => `$${value.toString()}`),
}));

vi.mock('@/lib/services/metrics-service', () => ({
  calculateTotalValue: vi.fn(() => ({ toString: () => '0' })),
  calculateGainPercent: vi.fn(() => 0),
}));

vi.mock('date-fns', () => ({
  format: vi.fn((date) => date.toISOString()),
  parseISO: vi.fn((str) => new Date(str)),
  isValid: vi.fn(() => true),
}));

describe('PortfoliosTable - Delete Functionality', () => {
  const mockPortfolios = [
    {
      id: 'portfolio-1',
      name: 'Retirement Portfolio',
      type: 'ira',
      currency: 'USD',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-20'),
      settings: {},
    },
    {
      id: 'portfolio-2',
      name: 'Trading Account',
      type: 'taxable',
      currency: 'USD',
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date('2025-01-15'),
      settings: {},
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.portfolios = mockPortfolios;
    mockStoreState.currentPortfolio = mockPortfolios[0];
    mockStoreState.deletePortfolio = vi.fn();
  });

  it('should render Delete button for each portfolio', async () => {
    render(
      <PortfoliosTable onView={vi.fn()} />
    );

    await waitFor(() => {
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      expect(deleteButtons).toHaveLength(2);
    });
  });

  it('should open delete dialog when Delete button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <PortfoliosTable onView={vi.fn()} />
    );

    // Wait for portfolios to load
    await screen.findByText('Retirement Portfolio');

    // Click first Delete button
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    // Dialog should open with delete confirmation
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /delete portfolio/i })).toBeInTheDocument();
    });
  });

  it('should close delete dialog on cancel', async () => {
    const user = userEvent.setup();

    render(
      <PortfoliosTable onView={vi.fn()} />
    );

    await screen.findByText('Retirement Portfolio');

    // Open delete dialog
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /delete portfolio/i })).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /delete portfolio/i })).not.toBeInTheDocument();
    });
  });

  it('should call deletePortfolio when confirmed', async () => {
    const user = userEvent.setup();
    const mockDeletePortfolio = vi.fn(() => Promise.resolve());
    mockStoreState.deletePortfolio = mockDeletePortfolio;

    render(
      <PortfoliosTable onView={vi.fn()} />
    );

    await screen.findByText('Retirement Portfolio');

    // Open delete dialog
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /delete portfolio/i })).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /delete portfolio/i });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDeletePortfolio).toHaveBeenCalledWith('portfolio-1');
    });
  });

  it('should show last portfolio warning when only one portfolio remains', async () => {
    const user = userEvent.setup();
    const singlePortfolio = [mockPortfolios[0]];
    mockStoreState.portfolios = singlePortfolio;
    mockStoreState.currentPortfolio = singlePortfolio[0];

    render(
      <PortfoliosTable onView={vi.fn()} />
    );

    await screen.findByText('Retirement Portfolio');

    // Open delete dialog
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    // Should show last portfolio warning
    await waitFor(() => {
      expect(screen.getByText(/this is your last portfolio/i)).toBeInTheDocument();
    });
  });

  it('should not show last portfolio warning when multiple portfolios exist', async () => {
    const user = userEvent.setup();

    render(
      <PortfoliosTable onView={vi.fn()} />
    );

    await screen.findByText('Retirement Portfolio');

    // Open delete dialog
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /delete portfolio/i })).toBeInTheDocument();
    });

    // Should not show last portfolio warning
    expect(screen.queryByText(/this is your last portfolio/i)).not.toBeInTheDocument();
  });

  it('should call onDelete with second portfolio id when clicking second delete button', async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();

    render(
      <PortfoliosTable onView={vi.fn()} onDelete={mockOnDelete} />
    );

    await screen.findByText('Trading Account');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });

    // Click second delete button (portfolio-2)
    await user.click(deleteButtons[1]);
    expect(mockOnDelete).toHaveBeenCalledWith('portfolio-2');
  });

  it('should call onDelete callback when provided', async () => {
    const user = userEvent.setup();
    const mockOnDelete = vi.fn();

    render(
      <PortfoliosTable onView={vi.fn()} onDelete={mockOnDelete} />
    );

    await screen.findByText('Retirement Portfolio');

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith('portfolio-1');
  });

  it('should maintain table state after closing delete dialog', async () => {
    const user = userEvent.setup();

    render(
      <PortfoliosTable onView={vi.fn()} />
    );

    await screen.findByText('Retirement Portfolio');
    await screen.findByText('Trading Account');

    // Open and close delete dialog
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    await user.click(deleteButtons[0]);

    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Table should still show both portfolios
    await waitFor(() => {
      expect(screen.getByText('Retirement Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Trading Account')).toBeInTheDocument();
    });
  });
});
