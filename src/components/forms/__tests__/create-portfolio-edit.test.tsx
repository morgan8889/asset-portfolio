import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePortfolioDialog } from '../create-portfolio';
import { usePortfolioStore } from '@/lib/stores';
import { db } from '@/lib/db';

vi.mock('@/lib/stores', () => ({
  usePortfolioStore: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
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

describe('CreatePortfolioDialog - Edit Mode', () => {
  const mockUpdatePortfolio = vi.fn();
  const mockCreatePortfolio = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (usePortfolioStore as any).mockReturnValue({
      updatePortfolio: mockUpdatePortfolio,
      createPortfolio: mockCreatePortfolio,
    });
  });

  it('should render in edit mode with pre-filled values', async () => {
    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
      type: 'taxable' as const,
      currency: 'USD',
    };

    render(
      <CreatePortfolioDialog
        mode="edit"
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Portfolio')).toBeInTheDocument();
    });
  });

  it('should update dialog title in edit mode', async () => {
    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
      type: 'taxable' as const,
      currency: 'USD',
    };

    render(
      <CreatePortfolioDialog
        mode="edit"
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Portfolio')).toBeInTheDocument();
      expect(
        screen.queryByText('Create New Portfolio')
      ).not.toBeInTheDocument();
    });
  });

  it('should call updatePortfolio when submitting in edit mode', async () => {
    const user = userEvent.setup();
    mockUpdatePortfolio.mockResolvedValue(undefined);

    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
      type: 'taxable' as const,
      currency: 'USD',
    };

    render(
      <CreatePortfolioDialog
        mode="edit"
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const nameInput = await screen.findByDisplayValue('Test Portfolio');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Portfolio');

    const submitButton = screen.getByRole('button', {
      name: /update portfolio/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdatePortfolio).toHaveBeenCalledWith(
        'portfolio-1',
        expect.objectContaining({
          name: 'Updated Portfolio',
          type: 'taxable',
          currency: 'USD',
          updatedAt: expect.any(Date),
        })
      );
      expect(mockCreatePortfolio).not.toHaveBeenCalled();
    });
  });

  it.skip('should show warning when changing type with existing transactions', async () => {
    // Skip: Radix Select inside Radix Dialog doesn't register value changes in jsdom
    // (Dialog sets pointer-events:none on body). Covered by E2E: portfolio-edit.spec.ts
    const user = userEvent.setup();
    const mockCountTransactions = vi.fn(() => Promise.resolve(5));

    (db.transactions.where as any).mockReturnValue({
      equals: vi.fn(() => ({
        count: mockCountTransactions,
      })),
    });

    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
      type: 'taxable' as const,
      currency: 'USD',
    };

    render(
      <CreatePortfolioDialog
        mode="edit"
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    // Wait for initial render
    await screen.findByDisplayValue('Test Portfolio');

    // Find the combobox by its content (it shows "Taxable Brokerage" initially)
    const typeSelect = screen.getAllByRole('combobox')[0]; // First combobox is the type selector
    await user.click(typeSelect);

    const iraOption = await screen.findByRole('option', {
      name: /traditional ira/i,
    });
    await user.click(iraOption);

    // Warning should appear
    await waitFor(() => {
      expect(screen.getByText(/type change warning/i)).toBeInTheDocument();
      expect(screen.getByText(/5 transactions/i)).toBeInTheDocument();
    });
  });

  it('should not show warning when type unchanged', async () => {
    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
      type: 'taxable' as const,
      currency: 'USD',
    };

    render(
      <CreatePortfolioDialog
        mode="edit"
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await screen.findByDisplayValue('Test Portfolio');

    expect(screen.queryByText(/type change warning/i)).not.toBeInTheDocument();
  });

  it('should use controlled state for dialog open/close', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();

    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
      type: 'taxable' as const,
      currency: 'USD',
    };

    render(
      <CreatePortfolioDialog
        mode="edit"
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('should show correct button text in edit mode', async () => {
    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
      type: 'taxable' as const,
      currency: 'USD',
    };

    render(
      <CreatePortfolioDialog
        mode="edit"
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /update portfolio/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /create portfolio/i })
      ).not.toBeInTheDocument();
    });
  });

  it('should show loading state during update', async () => {
    const user = userEvent.setup();
    let resolveUpdate: () => void;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    mockUpdatePortfolio.mockReturnValue(updatePromise);

    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
      type: 'taxable' as const,
      currency: 'USD',
    };

    render(
      <CreatePortfolioDialog
        mode="edit"
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const submitButton = await screen.findByRole('button', {
      name: /update portfolio/i,
    });
    await user.click(submitButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/updating\.\.\./i)).toBeInTheDocument();
    });

    // Resolve the update
    resolveUpdate!();

    // Should return to normal state
    await waitFor(() => {
      expect(screen.queryByText(/updating\.\.\./i)).not.toBeInTheDocument();
    });
  });
});
