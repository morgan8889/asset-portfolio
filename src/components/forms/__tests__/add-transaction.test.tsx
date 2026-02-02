import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { AddTransactionDialog } from '../add-transaction';
import { useTransactionStore, usePortfolioStore } from '@/lib/stores';
import {
  showSuccessNotification,
  showErrorNotification,
} from '@/lib/stores/ui';

// Mock notification functions - must be before vi.mock due to hoisting
vi.mock('@/lib/stores/ui', () => ({
  showSuccessNotification: vi.fn(),
  showErrorNotification: vi.fn(),
}));

// Mock the stores
const mockCreateTransaction = vi.fn();
const mockUpdateTransaction = vi.fn();
const mockImporting = false;
const mockCurrentPortfolio = {
  id: 'portfolio-1',
  name: 'Test Portfolio',
  description: 'Test portfolio',
  currency: 'USD',
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock('@/lib/stores', () => ({
  useTransactionStore: vi.fn(() => ({
    createTransaction: mockCreateTransaction,
    updateTransaction: mockUpdateTransaction,
    importing: mockImporting,
  })),
  usePortfolioStore: vi.fn(() => ({
    currentPortfolio: mockCurrentPortfolio,
  })),
}));

// Mock assetQueries for asset resolution
vi.mock('@/lib/db', () => ({
  assetQueries: {
    getBySymbol: vi.fn().mockResolvedValue(null),
    getById: vi.fn().mockImplementation((id: string) =>
      Promise.resolve({
        id,
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
      })
    ),
    create: vi.fn().mockResolvedValue('asset-123'),
  },
}));

// Mock Decimal.js
vi.mock('decimal.js', () => ({
  Decimal: vi.fn().mockImplementation((value) => ({
    mul: vi.fn().mockReturnThis(),
    toString: () => value?.toString() || '0',
    toNumber: () => parseFloat(value || '0'),
  })),
}));

describe('AddTransactionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePortfolioStore).mockReturnValue({
      currentPortfolio: mockCurrentPortfolio,
    } as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the add transaction button', () => {
    render(<AddTransactionDialog />);

    const addButton = screen.getByRole('button', { name: /add transaction/i });
    expect(addButton).toBeInTheDocument();
  });

  it('should open dialog when add button is clicked', async () => {
    render(<AddTransactionDialog />);

    const addButton = screen.getByRole('button', { name: /add transaction/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add New Transaction')).toBeInTheDocument();
    });
  });

  it('should display form fields with proper labels', async () => {
    render(<AddTransactionDialog />);

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    await waitFor(() => {
      // Check for label text content (not using getByLabelText due to Radix UI)
      expect(screen.getByText(/transaction type/i)).toBeInTheDocument();
      expect(screen.getByText(/asset symbol/i)).toBeInTheDocument();
      expect(screen.getByText(/asset name/i)).toBeInTheDocument();
      expect(screen.getByText(/transaction date/i)).toBeInTheDocument();
      expect(screen.getByText(/quantity/i)).toBeInTheDocument();
      expect(screen.getByText(/price per share/i)).toBeInTheDocument();
      expect(screen.getByText(/fees/i)).toBeInTheDocument();
      expect(screen.getByText(/notes/i)).toBeInTheDocument();
    });
  });

  it('should validate required fields', async () => {
    render(<AddTransactionDialog />);

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    await waitFor(() => {
      // The form requires asset symbol - submit without filling it
      const submitButton = screen.getByRole('button', {
        name: /^add transaction$/i,
      });
      // Button should be disabled when form is invalid
      expect(submitButton).toBeDisabled();
    });
  });

  it('should validate positive quantity', async () => {
    render(<AddTransactionDialog />);

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', {
        name: /quantity/i,
      });
      fireEvent.change(quantityInput, { target: { value: '-10' } });
      fireEvent.blur(quantityInput);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/quantity must be a positive number/i)
      ).toBeInTheDocument();
    });
  });

  it('should validate non-negative price', async () => {
    render(<AddTransactionDialog />);

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    await waitFor(() => {
      const priceInput = screen.getByRole('spinbutton', { name: /price/i });
      fireEvent.change(priceInput, { target: { value: '-100' } });
      fireEvent.blur(priceInput);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/price must be a non-negative number/i)
      ).toBeInTheDocument();
    });
  });

  it('should validate non-negative fees', async () => {
    render(<AddTransactionDialog />);

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    await waitFor(() => {
      const feesInput = screen.getByRole('spinbutton', { name: /fees/i });
      fireEvent.change(feesInput, { target: { value: '-5' } });
      fireEvent.blur(feesInput);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/fees must be a non-negative number/i)
      ).toBeInTheDocument();
    });
  });

  it('should calculate total transaction value correctly for buy orders', async () => {
    render(<AddTransactionDialog />);

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', {
        name: /quantity/i,
      });
      const priceInput = screen.getByRole('spinbutton', { name: /price/i });
      const feesInput = screen.getByRole('spinbutton', { name: /fees/i });

      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.change(priceInput, { target: { value: '100' } });
      fireEvent.change(feesInput, { target: { value: '5' } });
    });

    await waitFor(() => {
      // For buy orders: (quantity * price) + fees = (10 * 100) + 5 = 1005
      expect(screen.getByText('$1005.00')).toBeInTheDocument();
    });
  });

  it('should calculate total transaction value correctly for sell orders', async () => {
    render(<AddTransactionDialog />);

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    await waitFor(() => {
      // Change to sell transaction - find the select trigger (combobox)
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
    });

    await waitFor(() => {
      const sellOption = screen.getByRole('option', { name: /sell/i });
      fireEvent.click(sellOption);
    });

    await waitFor(() => {
      const quantityInput = screen.getByRole('spinbutton', {
        name: /quantity/i,
      });
      const priceInput = screen.getByRole('spinbutton', { name: /price/i });
      const feesInput = screen.getByRole('spinbutton', { name: /fees/i });

      fireEvent.change(quantityInput, { target: { value: '10' } });
      fireEvent.change(priceInput, { target: { value: '100' } });
      fireEvent.change(feesInput, { target: { value: '5' } });
    });

    await waitFor(() => {
      // For sell orders: (quantity * price) - fees = (10 * 100) - 5 = 995
      expect(screen.getByText('$995.00')).toBeInTheDocument();
    });
  });

  it('should transform asset symbol to uppercase', async () => {
    render(<AddTransactionDialog />);

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    await waitFor(() => {
      const symbolInput = screen.getByRole('textbox', {
        name: /asset symbol/i,
      });
      fireEvent.change(symbolInput, { target: { value: 'aapl' } });
    });

    await waitFor(() => {
      const symbolInput = screen.getByRole('textbox', {
        name: /asset symbol/i,
      }) as HTMLInputElement;
      expect(symbolInput.value).toBe('AAPL');
    });
  });

  it('should show different label for dividend transactions', async () => {
    render(<AddTransactionDialog />);

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    await waitFor(() => {
      const typeSelect = screen.getByRole('combobox');
      fireEvent.click(typeSelect);
    });

    await waitFor(() => {
      const dividendOption = screen.getByRole('option', { name: /dividend/i });
      fireEvent.click(dividendOption);
    });

    await waitFor(() => {
      expect(screen.getByText(/dividend per share/i)).toBeInTheDocument();
      expect(screen.getByText(/shares held/i)).toBeInTheDocument();
    });
  });

  it('should submit form with correct data', async () => {
    const user = userEvent.setup();
    mockCreateTransaction.mockResolvedValue(undefined);

    render(<AddTransactionDialog />);

    await user.click(screen.getByRole('button', { name: /add transaction/i }));

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Add New Transaction')).toBeInTheDocument();
    });

    // Fill in required fields using userEvent for proper form tracking
    const symbolInput = screen.getByRole('textbox', { name: /asset symbol/i });
    await user.clear(symbolInput);
    await user.type(symbolInput, 'AAPL');

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await user.clear(quantityInput);
    await user.type(quantityInput, '10');

    const priceInput = screen.getByRole('spinbutton', { name: /price/i });
    await user.clear(priceInput);
    await user.type(priceInput, '150');

    // Wait for form to become valid
    await waitFor(
      () => {
        const submitButton = screen.getByRole('button', {
          name: /^add transaction$/i,
        });
        expect(submitButton).not.toBeDisabled();
      },
      { timeout: 5000 }
    );

    const submitButton = screen.getByRole('button', {
      name: /^add transaction$/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          portfolioId: 'portfolio-1',
          assetId: 'asset-123', // Asset UUID from resolved/created asset
          type: 'buy',
          currency: 'USD',
        })
      );
    });
  });

  it('should handle submission errors gracefully', async () => {
    const user = userEvent.setup();
    mockCreateTransaction.mockRejectedValue(new Error('Submission failed'));

    render(<AddTransactionDialog />);

    await user.click(screen.getByRole('button', { name: /add transaction/i }));

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Add New Transaction')).toBeInTheDocument();
    });

    // Fill in required fields using userEvent
    const symbolInput = screen.getByRole('textbox', { name: /asset symbol/i });
    await user.clear(symbolInput);
    await user.type(symbolInput, 'AAPL');

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await user.clear(quantityInput);
    await user.type(quantityInput, '10');

    const priceInput = screen.getByRole('spinbutton', { name: /price/i });
    await user.clear(priceInput);
    await user.type(priceInput, '150');

    // Wait for form to become valid
    await waitFor(
      () => {
        const submitButton = screen.getByRole('button', {
          name: /^add transaction$/i,
        });
        expect(submitButton).not.toBeDisabled();
      },
      { timeout: 5000 }
    );

    const submitButton = screen.getByRole('button', {
      name: /^add transaction$/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(showErrorNotification).toHaveBeenCalledWith(
        'Failed to add transaction',
        'Submission failed'
      );
    });
  });

  it('should prevent submission when no portfolio is selected', async () => {
    const user = userEvent.setup();

    // Mock no current portfolio
    vi.mocked(usePortfolioStore).mockReturnValue({
      currentPortfolio: null,
    } as any);

    render(<AddTransactionDialog />);

    await user.click(screen.getByRole('button', { name: /add transaction/i }));

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Add New Transaction')).toBeInTheDocument();
    });

    // Fill in required fields using userEvent
    const symbolInput = screen.getByRole('textbox', { name: /asset symbol/i });
    await user.clear(symbolInput);
    await user.type(symbolInput, 'AAPL');

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await user.clear(quantityInput);
    await user.type(quantityInput, '10');

    const priceInput = screen.getByRole('spinbutton', { name: /price/i });
    await user.clear(priceInput);
    await user.type(priceInput, '150');

    // Wait for form to become valid
    await waitFor(
      () => {
        const submitButton = screen.getByRole('button', {
          name: /^add transaction$/i,
        });
        expect(submitButton).not.toBeDisabled();
      },
      { timeout: 5000 }
    );

    const submitButton = screen.getByRole('button', {
      name: /^add transaction$/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(showErrorNotification).toHaveBeenCalledWith(
        'No Portfolio Selected',
        'Please select a portfolio first'
      );
      expect(mockCreateTransaction).not.toHaveBeenCalled();
    });
  });

  it('should reset form when dialog is closed', async () => {
    render(<AddTransactionDialog />);

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));

    await waitFor(() => {
      const symbolInput = screen.getByRole('textbox', {
        name: /asset symbol/i,
      });
      fireEvent.change(symbolInput, { target: { value: 'AAPL' } });
    });

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
    });

    // Reopen dialog
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /add transaction/i }));
    });

    await waitFor(() => {
      const symbolInput = screen.getByRole('textbox', {
        name: /asset symbol/i,
      }) as HTMLInputElement;
      expect(symbolInput.value).toBe('');
    });
  });

  it('should disable submit button while submitting', async () => {
    const user = userEvent.setup();
    mockCreateTransaction.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    render(<AddTransactionDialog />);

    await user.click(screen.getByRole('button', { name: /add transaction/i }));

    // Wait for dialog to open
    await waitFor(() => {
      expect(screen.getByText('Add New Transaction')).toBeInTheDocument();
    });

    // Fill in required fields using userEvent
    const symbolInput = screen.getByRole('textbox', { name: /asset symbol/i });
    await user.clear(symbolInput);
    await user.type(symbolInput, 'AAPL');

    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await user.clear(quantityInput);
    await user.type(quantityInput, '10');

    const priceInput = screen.getByRole('spinbutton', { name: /price/i });
    await user.clear(priceInput);
    await user.type(priceInput, '150');

    // Wait for form to become valid
    await waitFor(
      () => {
        const submitButton = screen.getByRole('button', {
          name: /^add transaction$/i,
        });
        expect(submitButton).not.toBeDisabled();
      },
      { timeout: 5000 }
    );

    const submitButton = screen.getByRole('button', {
      name: /^add transaction$/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled();
    });
  });
});

describe('TransactionDialog - Edit Mode', () => {
  const mockTransaction = {
    id: 'transaction-1',
    portfolioId: 'portfolio-1',
    assetId: 'asset-123',
    type: 'buy' as const,
    date: new Date('2025-01-15'),
    quantity: new (require('decimal.js').Decimal)(100),
    price: new (require('decimal.js').Decimal)(150),
    totalAmount: new (require('decimal.js').Decimal)(15000),
    fees: new (require('decimal.js').Decimal)(5),
    currency: 'USD',
    notes: 'Initial purchase',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePortfolioStore).mockReturnValue({
      currentPortfolio: mockCurrentPortfolio,
    } as any);
  });

  it('should load asset symbol when opening in edit mode', async () => {
    const { assetQueries } = await import('@/lib/db');
    const getByIdSpy = vi.spyOn(assetQueries, 'getById');

    const { TransactionDialog } = await import('../add-transaction');
    render(
      <TransactionDialog
        mode="edit"
        transaction={mockTransaction}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(getByIdSpy).toHaveBeenCalledWith('asset-123');
    });

    await waitFor(() => {
      const symbolInput = screen.getByRole('textbox', {
        name: /asset symbol/i,
      }) as HTMLInputElement;
      expect(symbolInput.value).toBe('AAPL');
    });
  });

  it('should call updateTransaction instead of createTransaction', async () => {
    const user = userEvent.setup();
    mockUpdateTransaction.mockResolvedValue(undefined);

    const { TransactionDialog } = await import('../add-transaction');
    render(
      <TransactionDialog
        mode="edit"
        transaction={mockTransaction}
        open={true}
        onOpenChange={() => {}}
      />
    );

    // Wait for asset to load
    await waitFor(() => {
      const symbolInput = screen.getByRole('textbox', {
        name: /asset symbol/i,
      }) as HTMLInputElement;
      expect(symbolInput.value).toBe('AAPL');
    });

    // Change quantity
    const quantityInput = screen.getByRole('spinbutton', { name: /quantity/i });
    await user.clear(quantityInput);
    await user.type(quantityInput, '150');

    // Wait for form to become valid
    await waitFor(
      () => {
        const submitButton = screen.getByRole('button', {
          name: /update transaction/i,
        });
        expect(submitButton).not.toBeDisabled();
      },
      { timeout: 5000 }
    );

    const submitButton = screen.getByRole('button', {
      name: /update transaction/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateTransaction).toHaveBeenCalledWith(
        'transaction-1',
        expect.objectContaining({
          assetId: 'asset-123',
          type: 'buy',
        })
      );
      expect(mockCreateTransaction).not.toHaveBeenCalled();
    });
  });

  it('should show loading state while fetching asset', async () => {
    const { assetQueries } = await import('@/lib/db');
    vi.spyOn(assetQueries, 'getById').mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                id: 'asset-123',
                symbol: 'AAPL',
                name: 'Apple Inc.',
                type: 'stock',
              } as any),
            100
          )
        )
    );

    const { TransactionDialog } = await import('../add-transaction');
    render(
      <TransactionDialog
        mode="edit"
        transaction={mockTransaction}
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText('Loading asset data...')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(
          screen.queryByText('Loading asset data...')
        ).not.toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should handle asset loading errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { assetQueries } = await import('@/lib/db');
    vi.spyOn(assetQueries, 'getById').mockRejectedValue(
      new Error('Asset not found')
    );

    const { TransactionDialog } = await import('../add-transaction');
    render(
      <TransactionDialog
        mode="edit"
        transaction={mockTransaction}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load asset:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should display Edit Transaction title in edit mode', async () => {
    const { TransactionDialog } = await import('../add-transaction');
    render(
      <TransactionDialog
        mode="edit"
        transaction={mockTransaction}
        open={true}
        onOpenChange={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Edit Transaction')).toBeInTheDocument();
    });
  });
});
