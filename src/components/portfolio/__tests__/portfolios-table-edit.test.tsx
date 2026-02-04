import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PortfoliosTable } from '../portfolios-table';

// Use vi.hoisted for mutable state accessible in vi.mock factories
const { mockStoreState } = vi.hoisted(() => ({
  mockStoreState: {
    portfolios: [] as any[],
    currentPortfolio: null as any,
    updatePortfolio: vi.fn(),
    getSortedPortfolios: () => mockStoreState.portfolios,
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
}));

vi.mock('@/lib/db/queries', () => ({
  transactionQueries: {
    countByPortfolio: vi.fn(() => Promise.resolve(0)),
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

describe('PortfoliosTable - Edit Functionality', () => {
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
    mockStoreState.updatePortfolio = vi.fn();
  });

  it('should render Edit button for each portfolio', async () => {
    render(
      <PortfoliosTable onView={vi.fn()} onEdit={vi.fn()} />
    );

    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      expect(editButtons).toHaveLength(2);
    });
  });

  it('should open edit dialog when Edit button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <PortfoliosTable onView={vi.fn()} />
    );

    // Wait for portfolios to load
    await screen.findByText('Retirement Portfolio');

    // Click first Edit button
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);

    // Dialog should open with edit mode
    await waitFor(() => {
      expect(screen.getByText('Edit Portfolio')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Retirement Portfolio')).toBeInTheDocument();
    });
  });

  it('should pre-fill form with portfolio data', async () => {
    const user = userEvent.setup();

    render(
      <PortfoliosTable onView={vi.fn()} />
    );

    await screen.findByText('Retirement Portfolio');

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Retirement Portfolio')).toBeInTheDocument();
      // IRA type should be selected (may appear in both select trigger and option)
      expect(screen.getAllByText(/traditional ira/i).length).toBeGreaterThan(0);
    });
  });

  it('should close dialog after successful update', async () => {
    const user = userEvent.setup();
    const mockUpdatePortfolio = vi.fn(() => Promise.resolve());
    mockStoreState.updatePortfolio = mockUpdatePortfolio;

    render(
      <PortfoliosTable onView={vi.fn()} />
    );

    await screen.findByText('Retirement Portfolio');

    // Open edit dialog
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);

    // Update name
    const nameInput = await screen.findByDisplayValue('Retirement Portfolio');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Portfolio');

    // Submit
    const updateButton = screen.getByRole('button', { name: /update portfolio/i });
    await user.click(updateButton);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Edit Portfolio')).not.toBeInTheDocument();
    });
  });

  it('should call onEdit with second portfolio id when clicking second edit button', async () => {
    const user = userEvent.setup();
    const mockOnEdit = vi.fn();

    render(
      <PortfoliosTable onView={vi.fn()} onEdit={mockOnEdit} />
    );

    await screen.findByText('Trading Account');

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });

    // Click second edit button (portfolio-2)
    await user.click(editButtons[1]);
    expect(mockOnEdit).toHaveBeenCalledWith('portfolio-2');
  });

  it('should call onEdit callback when provided', async () => {
    const user = userEvent.setup();
    const mockOnEdit = vi.fn();

    render(
      <PortfoliosTable onView={vi.fn()} onEdit={mockOnEdit} />
    );

    await screen.findByText('Retirement Portfolio');

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith('portfolio-1');
  });

  it('should maintain table state after closing edit dialog', async () => {
    const user = userEvent.setup();

    render(
      <PortfoliosTable onView={vi.fn()} />
    );

    await screen.findByText('Retirement Portfolio');
    await screen.findByText('Trading Account');

    // Open and close edit dialog
    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]);

    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Table should still show both portfolios
    await waitFor(() => {
      expect(screen.getByText('Retirement Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Trading Account')).toBeInTheDocument();
    });
  });
});
