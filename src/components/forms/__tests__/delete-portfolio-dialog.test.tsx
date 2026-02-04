import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeletePortfolioDialog } from '../delete-portfolio-dialog';

// Use vi.hoisted for mutable state accessible in vi.mock factories
const { mockStoreState, mockDbTransactions } = vi.hoisted(() => ({
  mockStoreState: {
    deletePortfolio: vi.fn(),
  },
  mockDbTransactions: {
    where: vi.fn(() => ({
      equals: vi.fn(() => ({
        count: vi.fn(() => Promise.resolve(0)),
      })),
    })),
  },
}));

vi.mock('@/lib/stores', () => ({
  usePortfolioStore: (selector?: any) => {
    if (typeof selector === 'function') {
      return selector(mockStoreState);
    }
    return mockStoreState;
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    transactions: mockDbTransactions,
  },
}));

describe('DeletePortfolioDialog', () => {
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState.deletePortfolio = vi.fn();
    mockDbTransactions.where.mockReturnValue({
      equals: vi.fn(() => ({
        count: vi.fn(() => Promise.resolve(0)),
      })),
    });
  });

  it('should render delete dialog with portfolio name', async () => {
    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
    };

    render(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /delete portfolio/i })).toBeInTheDocument();
      expect(screen.getByText('Test Portfolio')).toBeInTheDocument();
    });
  });

  it('should show simple confirmation for portfolio with no transactions', async () => {
    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Empty Portfolio',
    };

    render(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Empty Portfolio')).toBeInTheDocument();
    });

    // Should not show checkbox or text input
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/type portfolio name/i)).not.toBeInTheDocument();

    // Delete button should be enabled immediately
    const deleteButton = screen.getByRole('button', { name: /delete portfolio/i });
    expect(deleteButton).toBeEnabled();
  });

  it('should show checkbox confirmation for portfolio with 1-10 transactions', async () => {
    mockDbTransactions.where.mockReturnValue({
      equals: vi.fn(() => ({
        count: vi.fn(() => Promise.resolve(5)),
      })),
    });

    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Small Portfolio',
    };

    render(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/5 transactions/i)).toBeInTheDocument();
    });

    // Should show checkbox
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();

    // Delete button should be disabled initially
    const deleteButton = screen.getByRole('button', { name: /delete portfolio/i });
    expect(deleteButton).toBeDisabled();
  });

  it('should enable delete after checkbox is checked', async () => {
    const user = userEvent.setup();
    mockDbTransactions.where.mockReturnValue({
      equals: vi.fn(() => ({
        count: vi.fn(() => Promise.resolve(5)),
      })),
    });

    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Small Portfolio',
    };

    render(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox');
    const deleteButton = screen.getByRole('button', { name: /delete portfolio/i });

    // Initially disabled
    expect(deleteButton).toBeDisabled();

    // Check the checkbox
    await user.click(checkbox);

    // Should now be enabled
    expect(deleteButton).toBeEnabled();
  });

  it('should show typed confirmation for portfolio with >10 transactions', async () => {
    mockDbTransactions.where.mockReturnValue({
      equals: vi.fn(() => ({
        count: vi.fn(() => Promise.resolve(15)),
      })),
    });

    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Large Portfolio',
    };

    render(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/15 transactions/i)).toBeInTheDocument();
    });

    // Should show text input
    const input = screen.getByPlaceholderText(/type portfolio name/i);
    expect(input).toBeInTheDocument();

    // Delete button should be disabled initially
    const deleteButton = screen.getByRole('button', { name: /delete portfolio/i });
    expect(deleteButton).toBeDisabled();
  });

  it('should enable delete after typing correct portfolio name', async () => {
    const user = userEvent.setup();
    mockDbTransactions.where.mockReturnValue({
      equals: vi.fn(() => ({
        count: vi.fn(() => Promise.resolve(15)),
      })),
    });

    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Large Portfolio',
    };

    render(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/type portfolio name/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/type portfolio name/i);
    const deleteButton = screen.getByRole('button', { name: /delete portfolio/i });

    // Initially disabled
    expect(deleteButton).toBeDisabled();

    // Type incorrect name
    await user.type(input, 'Wrong Name');
    expect(deleteButton).toBeDisabled();

    // Clear and type correct name
    await user.clear(input);
    await user.type(input, 'Large Portfolio');

    // Should now be enabled
    expect(deleteButton).toBeEnabled();
  });

  it('should call deletePortfolio when delete button is clicked', async () => {
    const user = userEvent.setup();
    const mockDeletePortfolio = vi.fn().mockResolvedValue(undefined);
    mockStoreState.deletePortfolio = mockDeletePortfolio;

    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
    };

    render(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Portfolio')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /delete portfolio/i });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(mockDeletePortfolio).toHaveBeenCalledWith('portfolio-1');
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should show last portfolio warning', async () => {
    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Last Portfolio',
    };

    render(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
        isLastPortfolio={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /last portfolio/i, level: 3 })).toBeInTheDocument();
      expect(screen.getByText(/this is your last portfolio/i)).toBeInTheDocument();
    });
  });

  it('should not show last portfolio warning when not last', async () => {
    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
    };

    render(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
        isLastPortfolio={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Portfolio')).toBeInTheDocument();
    });

    expect(screen.queryByText(/this is your last portfolio/i)).not.toBeInTheDocument();
  });

  it('should close dialog on cancel', async () => {
    const user = userEvent.setup();

    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
    };

    render(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockStoreState.deletePortfolio).not.toHaveBeenCalled();
  });

  it('should show loading state during deletion', async () => {
    const user = userEvent.setup();
    let resolveDelete: () => void;
    const deletePromise = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    mockStoreState.deletePortfolio = vi.fn().mockReturnValue(deletePromise);

    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
    };

    render(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    const deleteButton = await screen.findByRole('button', { name: /delete portfolio/i });
    await user.click(deleteButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/deleting\.\.\./i)).toBeInTheDocument();
    });

    // Resolve the deletion
    resolveDelete!();

    // Should return to normal state and close
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should reset state when dialog closes', async () => {
    mockDbTransactions.where.mockReturnValue({
      equals: vi.fn(() => ({
        count: vi.fn(() => Promise.resolve(5)),
      })),
    });

    const mockPortfolio = {
      id: 'portfolio-1',
      name: 'Test Portfolio',
    };

    const { rerender } = render(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Wait for checkbox to appear and check it
    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    const checkbox = screen.getByRole('checkbox');
    await userEvent.click(checkbox);

    // Close the dialog
    rerender(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={false}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Reopen the dialog
    rerender(
      <DeletePortfolioDialog
        portfolio={mockPortfolio}
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Checkbox should be unchecked again
    await waitFor(() => {
      const newCheckbox = screen.getByRole('checkbox');
      expect(newCheckbox).not.toBeChecked();
    });
  });
});
