import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@/test-utils'
import { AddTransactionDialog } from '../add-transaction'
import { useTransactionStore, usePortfolioStore } from '@/lib/stores'

// Mock the stores
const mockCreateTransaction = vi.fn()
const mockCurrentPortfolio = {
  id: 'portfolio-1',
  name: 'Test Portfolio',
  description: 'Test portfolio',
  currency: 'USD',
  createdAt: new Date(),
  updatedAt: new Date()
}

vi.mock('@/lib/stores', () => ({
  useTransactionStore: vi.fn(() => ({
    createTransaction: mockCreateTransaction
  })),
  usePortfolioStore: vi.fn(() => ({
    currentPortfolio: mockCurrentPortfolio
  }))
}))

// Mock Decimal.js
vi.mock('decimal.js', () => ({
  Decimal: vi.fn().mockImplementation((value) => ({
    mul: vi.fn().mockReturnThis(),
    toString: () => value?.toString() || '0',
    toNumber: () => parseFloat(value || '0')
  }))
}))

describe('AddTransactionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render the add transaction button', () => {
    render(<AddTransactionDialog />)

    const addButton = screen.getByRole('button', { name: /add transaction/i })
    expect(addButton).toBeInTheDocument()
  })

  it('should open dialog when add button is clicked', async () => {
    render(<AddTransactionDialog />)

    const addButton = screen.getByRole('button', { name: /add transaction/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Add New Transaction')).toBeInTheDocument()
    })
  })

  it('should display form fields with proper labels', async () => {
    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      expect(screen.getByLabelText(/transaction type/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/asset symbol/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/asset name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/transaction date/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/price per share/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/fees/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument()
    })
  })

  it('should validate required fields', async () => {
    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /add transaction$/i })
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByText(/asset symbol is required/i)).toBeInTheDocument()
    })
  })

  it('should validate positive quantity', async () => {
    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      const quantityInput = screen.getByLabelText(/quantity/i)
      fireEvent.change(quantityInput, { target: { value: '-10' } })
    })

    await waitFor(() => {
      expect(screen.getByText(/quantity must be a positive number/i)).toBeInTheDocument()
    })
  })

  it('should validate non-negative price', async () => {
    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      const priceInput = screen.getByLabelText(/price per share/i)
      fireEvent.change(priceInput, { target: { value: '-100' } })
    })

    await waitFor(() => {
      expect(screen.getByText(/price must be a non-negative number/i)).toBeInTheDocument()
    })
  })

  it('should validate non-negative fees', async () => {
    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      const feesInput = screen.getByLabelText(/fees/i)
      fireEvent.change(feesInput, { target: { value: '-5' } })
    })

    await waitFor(() => {
      expect(screen.getByText(/fees must be a non-negative number/i)).toBeInTheDocument()
    })
  })

  it('should calculate total transaction value correctly for buy orders', async () => {
    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      const quantityInput = screen.getByLabelText(/quantity/i)
      const priceInput = screen.getByLabelText(/price per share/i)
      const feesInput = screen.getByLabelText(/fees/i)

      fireEvent.change(quantityInput, { target: { value: '10' } })
      fireEvent.change(priceInput, { target: { value: '100' } })
      fireEvent.change(feesInput, { target: { value: '5' } })
    })

    await waitFor(() => {
      // For buy orders: (quantity * price) + fees = (10 * 100) + 5 = 1005
      expect(screen.getByText('$1005.00')).toBeInTheDocument()
    })
  })

  it('should calculate total transaction value correctly for sell orders', async () => {
    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      // Change to sell transaction
      const typeSelect = screen.getByRole('combobox')
      fireEvent.click(typeSelect)
    })

    await waitFor(() => {
      const sellOption = screen.getByText('Sell')
      fireEvent.click(sellOption)
    })

    await waitFor(() => {
      const quantityInput = screen.getByLabelText(/quantity/i)
      const priceInput = screen.getByLabelText(/price per share/i)
      const feesInput = screen.getByLabelText(/fees/i)

      fireEvent.change(quantityInput, { target: { value: '10' } })
      fireEvent.change(priceInput, { target: { value: '100' } })
      fireEvent.change(feesInput, { target: { value: '5' } })
    })

    await waitFor(() => {
      // For sell orders: (quantity * price) - fees = (10 * 100) - 5 = 995
      expect(screen.getByText('$995.00')).toBeInTheDocument()
    })
  })

  it('should transform asset symbol to uppercase', async () => {
    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      const symbolInput = screen.getByLabelText(/asset symbol/i)
      fireEvent.change(symbolInput, { target: { value: 'aapl' } })
    })

    await waitFor(() => {
      const symbolInput = screen.getByLabelText(/asset symbol/i) as HTMLInputElement
      expect(symbolInput.value).toBe('AAPL')
    })
  })

  it('should show different label for dividend transactions', async () => {
    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      const typeSelect = screen.getByRole('combobox')
      fireEvent.click(typeSelect)
    })

    await waitFor(() => {
      const dividendOption = screen.getByText('Dividend')
      fireEvent.click(dividendOption)
    })

    await waitFor(() => {
      expect(screen.getByLabelText(/dividend per share/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/quantity.*shares held/i)).toBeInTheDocument()
    })
  })

  it('should submit form with correct data', async () => {
    mockCreateTransaction.mockResolvedValue(undefined)

    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      const symbolInput = screen.getByLabelText(/asset symbol/i)
      const quantityInput = screen.getByLabelText(/quantity/i)
      const priceInput = screen.getByLabelText(/price per share/i)

      fireEvent.change(symbolInput, { target: { value: 'AAPL' } })
      fireEvent.change(quantityInput, { target: { value: '10' } })
      fireEvent.change(priceInput, { target: { value: '150' } })
    })

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /add transaction$/i })
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          portfolioId: 'portfolio-1',
          assetId: 'AAPL',
          type: 'buy',
          quantity: expect.any(Object), // Decimal object
          price: expect.any(Object), // Decimal object
          totalAmount: expect.any(Object), // Decimal object
          fees: expect.any(Object), // Decimal object
          currency: 'USD'
        })
      )
    })
  })

  it('should handle submission errors gracefully', async () => {
    mockCreateTransaction.mockRejectedValue(new Error('Submission failed'))

    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      const symbolInput = screen.getByLabelText(/asset symbol/i)
      const quantityInput = screen.getByLabelText(/quantity/i)
      const priceInput = screen.getByLabelText(/price per share/i)

      fireEvent.change(symbolInput, { target: { value: 'AAPL' } })
      fireEvent.change(quantityInput, { target: { value: '10' } })
      fireEvent.change(priceInput, { target: { value: '150' } })
    })

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /add transaction$/i })
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to add transaction. Please try again.')
    })

    alertSpy.mockRestore()
  })

  it('should prevent submission when no portfolio is selected', async () => {
    // Mock no current portfolio
    vi.mocked(usePortfolioStore).mockReturnValue({
      currentPortfolio: null
    } as any)

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      const symbolInput = screen.getByLabelText(/asset symbol/i)
      const quantityInput = screen.getByLabelText(/quantity/i)
      const priceInput = screen.getByLabelText(/price per share/i)

      fireEvent.change(symbolInput, { target: { value: 'AAPL' } })
      fireEvent.change(quantityInput, { target: { value: '10' } })
      fireEvent.change(priceInput, { target: { value: '150' } })
    })

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /add transaction$/i })
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Please select a portfolio first')
      expect(mockCreateTransaction).not.toHaveBeenCalled()
    })

    alertSpy.mockRestore()
  })

  it('should reset form when dialog is closed', async () => {
    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      const symbolInput = screen.getByLabelText(/asset symbol/i)
      fireEvent.change(symbolInput, { target: { value: 'AAPL' } })
    })

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      fireEvent.click(cancelButton)
    })

    // Reopen dialog
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))
    })

    await waitFor(() => {
      const symbolInput = screen.getByLabelText(/asset symbol/i) as HTMLInputElement
      expect(symbolInput.value).toBe('')
    })
  })

  it('should disable submit button while submitting', async () => {
    mockCreateTransaction.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(<AddTransactionDialog />)

    fireEvent.click(screen.getByRole('button', { name: /add transaction/i }))

    await waitFor(() => {
      const symbolInput = screen.getByLabelText(/asset symbol/i)
      const quantityInput = screen.getByLabelText(/quantity/i)
      const priceInput = screen.getByLabelText(/price per share/i)

      fireEvent.change(symbolInput, { target: { value: 'AAPL' } })
      fireEvent.change(quantityInput, { target: { value: '10' } })
      fireEvent.change(priceInput, { target: { value: '150' } })
    })

    await waitFor(() => {
      const submitButton = screen.getByRole('button', { name: /add transaction$/i })
      fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adding.../i })).toBeDisabled()
    })
  })
})