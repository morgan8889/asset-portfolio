import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  Transaction,
  TransactionFilter,
  TransactionSummary,
  ImportResult,
} from '@/types';

// Use vi.hoisted to define mocks that can be referenced by hoisted vi.mock
const { mockTransactionQueries, mockHoldingsCalculator } = vi.hoisted(() => ({
  mockTransactionQueries: {
    getByPortfolio: vi.fn(),
    getById: vi.fn(),
    getFiltered: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getSummary: vi.fn(),
  },
  mockHoldingsCalculator: {
    updateHoldingsForTransaction: vi.fn(),
    recalculatePortfolioHoldings: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({
  transactionQueries: mockTransactionQueries,
  HoldingsCalculator: mockHoldingsCalculator,
}));

vi.mock('../ui', () => ({
  showSuccessNotification: vi.fn(),
  showErrorNotification: vi.fn(),
}));

// Import after mock is set up
import { useTransactionStore } from '../transaction';
import { resetCounters, createMockTransaction } from '@/test-utils';

describe('Transaction Store', () => {
  beforeEach(() => {
    resetCounters();
    vi.clearAllMocks();
    useTransactionStore.setState({
      transactions: [],
      filteredTransactions: [],
      currentFilter: {},
      summary: null,
      loading: false,
      importing: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('validateTransactionData', () => {
    it('should reject future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const transaction = createMockTransaction({
        date: futureDate,
      });

      mockTransactionQueries.create.mockRejectedValue(
        new Error('Transaction date cannot be in the future')
      );

      await useTransactionStore.getState().createTransaction(transaction);

      const state = useTransactionStore.getState();
      expect(state.error).toBe('Transaction date cannot be in the future');
    });

    it('should reject dates before 1900', async () => {
      const oldDate = new Date('1899-12-31');

      const transaction = createMockTransaction({
        date: oldDate,
      });

      await useTransactionStore.getState().createTransaction(transaction);

      const state = useTransactionStore.getState();
      expect(state.error).toBe('Transaction date is too far in the past');
    });

    it('should reject invalid dates', async () => {
      const transaction = createMockTransaction({
        date: new Date('invalid'),
      });

      await useTransactionStore.getState().createTransaction(transaction);

      const state = useTransactionStore.getState();
      expect(state.error).toBe('Invalid transaction date');
    });

    it('should reject zero quantity for non-fee/tax types', async () => {
      const transaction = createMockTransaction({
        quantity: new Decimal(0),
        type: 'buy',
      });

      await useTransactionStore.getState().createTransaction(transaction);

      const state = useTransactionStore.getState();
      expect(state.error).toBe('Quantity must be greater than 0');
    });

    it('should reject negative quantity for non-fee/tax types', async () => {
      const transaction = createMockTransaction({
        quantity: new Decimal(-5),
        type: 'buy',
      });

      await useTransactionStore.getState().createTransaction(transaction);

      const state = useTransactionStore.getState();
      expect(state.error).toBe('Quantity must be greater than 0');
    });

    it('should allow zero quantity for fee type', async () => {
      const transaction = createMockTransaction({
        quantity: new Decimal(0),
        type: 'fee',
      });

      mockTransactionQueries.create.mockResolvedValue('new-id');
      mockTransactionQueries.getById.mockResolvedValue({
        ...transaction,
        id: 'new-id',
      });
      mockTransactionQueries.getFiltered.mockResolvedValue([]);

      await useTransactionStore.getState().createTransaction(transaction);

      const state = useTransactionStore.getState();
      expect(state.error).toBeNull();
    });

    it('should allow zero quantity for tax type', async () => {
      const transaction = createMockTransaction({
        quantity: new Decimal(0),
        type: 'tax',
      });

      mockTransactionQueries.create.mockResolvedValue('new-id');
      mockTransactionQueries.getById.mockResolvedValue({
        ...transaction,
        id: 'new-id',
      });
      mockTransactionQueries.getFiltered.mockResolvedValue([]);

      await useTransactionStore.getState().createTransaction(transaction);

      const state = useTransactionStore.getState();
      expect(state.error).toBeNull();
    });

    it('should reject negative price', async () => {
      const transaction = createMockTransaction({
        price: new Decimal(-100),
      });

      await useTransactionStore.getState().createTransaction(transaction);

      const state = useTransactionStore.getState();
      expect(state.error).toBe('Price cannot be negative');
    });

    it('should reject empty asset ID', async () => {
      const transaction = createMockTransaction({
        assetId: '   ',
      });

      await useTransactionStore.getState().createTransaction(transaction);

      const state = useTransactionStore.getState();
      expect(state.error).toBe('Asset symbol is required');
    });

    it('should reject asset ID longer than 20 characters', async () => {
      const transaction = createMockTransaction({
        assetId: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      });

      await useTransactionStore.getState().createTransaction(transaction);

      const state = useTransactionStore.getState();
      expect(state.error).toBe('Asset symbol is too long');
    });
  });

  describe('loadTransactions', () => {
    it('should load transactions for a specific portfolio', async () => {
      const mockTransactions: Transaction[] = [
        createMockTransaction({ portfolioId: 'p1' }),
        createMockTransaction({ portfolioId: 'p1' }),
      ];

      mockTransactionQueries.getByPortfolio.mockResolvedValue(mockTransactions);

      await useTransactionStore.getState().loadTransactions('p1');

      const state = useTransactionStore.getState();
      expect(state.transactions).toEqual(mockTransactions);
      expect(state.filteredTransactions).toEqual(mockTransactions);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockTransactionQueries.getByPortfolio).toHaveBeenCalledWith('p1');
    });

    it('should load all transactions when no portfolioId provided', async () => {
      const mockTransactions: Transaction[] = [
        createMockTransaction({ portfolioId: 'p1' }),
        createMockTransaction({ portfolioId: 'p2' }),
      ];

      mockTransactionQueries.getFiltered.mockResolvedValue(mockTransactions);

      await useTransactionStore.getState().loadTransactions();

      const state = useTransactionStore.getState();
      expect(state.transactions).toEqual(mockTransactions);
      expect(mockTransactionQueries.getFiltered).toHaveBeenCalledWith({});
    });

    it('should handle loading errors gracefully', async () => {
      const errorMessage = 'Database connection failed';
      mockTransactionQueries.getByPortfolio.mockRejectedValue(
        new Error(errorMessage)
      );

      await useTransactionStore.getState().loadTransactions('p1');

      const state = useTransactionStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
    });
  });

  describe('filterTransactions', () => {
    it('should apply filter and persist currentFilter', async () => {
      const mockFilteredTransactions: Transaction[] = [
        createMockTransaction({ type: 'buy' }),
      ];

      const filter: TransactionFilter = {
        portfolioId: 'p1',
        type: ['buy'],
      };

      mockTransactionQueries.getFiltered.mockResolvedValue(
        mockFilteredTransactions
      );

      await useTransactionStore.getState().filterTransactions(filter);

      const state = useTransactionStore.getState();
      expect(state.filteredTransactions).toEqual(mockFilteredTransactions);
      expect(state.currentFilter).toEqual(filter);
      expect(state.loading).toBe(false);
    });

    it('should handle filter errors', async () => {
      const errorMessage = 'Filter query failed';
      mockTransactionQueries.getFiltered.mockRejectedValue(
        new Error(errorMessage)
      );

      await useTransactionStore
        .getState()
        .filterTransactions({ portfolioId: 'p1' });

      const state = useTransactionStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
    });
  });

  describe('loadSummary', () => {
    it('should load and update summary state', async () => {
      const mockSummary: TransactionSummary = {
        totalTransactions: 10,
        totalBuys: 5,
        totalSells: 3,
        totalDividends: 2,
        totalInvested: new Decimal(10000),
        totalDividendIncome: new Decimal(500),
        totalFees: new Decimal(50),
        dateRange: {
          earliest: new Date('2023-01-01'),
          latest: new Date('2023-12-31'),
        },
      };

      mockTransactionQueries.getSummary.mockResolvedValue(mockSummary);

      await useTransactionStore.getState().loadSummary('p1');

      const state = useTransactionStore.getState();
      expect(state.summary).toEqual(mockSummary);
    });

    it('should handle summary load errors silently', async () => {
      mockTransactionQueries.getSummary.mockRejectedValue(
        new Error('Summary failed')
      );

      // Should not throw
      await useTransactionStore.getState().loadSummary('p1');

      // Error is logged but not stored in state
      const state = useTransactionStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('createTransaction', () => {
    it('should create transaction and update holdings', async () => {
      const transaction = createMockTransaction();
      const newId = 'new-transaction-id';

      mockTransactionQueries.create.mockResolvedValue(newId);
      mockTransactionQueries.getById.mockResolvedValue({
        ...transaction,
        id: newId,
      });
      mockTransactionQueries.getFiltered.mockResolvedValue([
        { ...transaction, id: newId },
      ]);

      await useTransactionStore.getState().createTransaction(transaction);

      expect(mockTransactionQueries.create).toHaveBeenCalledWith(transaction);
      expect(
        mockHoldingsCalculator.updateHoldingsForTransaction
      ).toHaveBeenCalled();

      const state = useTransactionStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle creation failure', async () => {
      const transaction = createMockTransaction();
      const errorMessage = 'Failed to create transaction';

      mockTransactionQueries.create.mockRejectedValue(new Error(errorMessage));

      await useTransactionStore.getState().createTransaction(transaction);

      const state = useTransactionStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.loading).toBe(false);
    });

    it('should optimistically add transaction with current filter', async () => {
      const transaction = createMockTransaction({
        portfolioId: 'p1',
        type: 'buy',
      });
      const filter: TransactionFilter = { portfolioId: 'p1', type: ['buy'] };

      useTransactionStore.setState({
        currentFilter: filter,
        transactions: [],
        filteredTransactions: [],
      });

      mockTransactionQueries.create.mockResolvedValue('new-id');
      mockTransactionQueries.getById.mockResolvedValue({
        ...transaction,
        id: 'new-id',
      });

      await useTransactionStore.getState().createTransaction(transaction);

      // Transaction should be added optimistically (with ID replaced)
      const state = useTransactionStore.getState();
      expect(state.transactions).toHaveLength(1);
      expect(state.filteredTransactions).toHaveLength(1);
      expect(state.transactions[0].id).toBe('new-id');
    });
  });

  describe('createTransactions', () => {
    it('should create multiple transactions and recalculate holdings', async () => {
      const transactions = [
        createMockTransaction({ portfolioId: 'p1' }),
        createMockTransaction({ portfolioId: 'p1' }),
      ];

      mockTransactionQueries.createMany.mockResolvedValue(['id1', 'id2']);
      mockTransactionQueries.getFiltered.mockResolvedValue([]);

      await useTransactionStore.getState().createTransactions(transactions);

      expect(mockTransactionQueries.createMany).toHaveBeenCalledWith(
        transactions
      );
      expect(
        mockHoldingsCalculator.recalculatePortfolioHoldings
      ).toHaveBeenCalledWith('p1');

      const state = useTransactionStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should fail on first invalid transaction', async () => {
      const transactions = [
        createMockTransaction({ quantity: new Decimal(-1) }),
        createMockTransaction(),
      ];

      await useTransactionStore.getState().createTransactions(transactions);

      const state = useTransactionStore.getState();
      expect(state.error).toBe(
        'Transaction 1: Quantity must be greater than 0'
      );
      expect(mockTransactionQueries.createMany).not.toHaveBeenCalled();
    });

    it('should handle bulk creation failure', async () => {
      const transactions = [createMockTransaction()];
      const errorMessage = 'Bulk creation failed';

      mockTransactionQueries.createMany.mockRejectedValue(
        new Error(errorMessage)
      );

      await useTransactionStore.getState().createTransactions(transactions);

      const state = useTransactionStore.getState();
      expect(state.error).toBe(errorMessage);
    });

    it('should recalculate holdings for multiple portfolios', async () => {
      const transactions = [
        createMockTransaction({ portfolioId: 'p1' }),
        createMockTransaction({ portfolioId: 'p2' }),
        createMockTransaction({ portfolioId: 'p1' }),
      ];

      mockTransactionQueries.createMany.mockResolvedValue([
        'id1',
        'id2',
        'id3',
      ]);
      mockTransactionQueries.getFiltered.mockResolvedValue([]);

      await useTransactionStore.getState().createTransactions(transactions);

      expect(
        mockHoldingsCalculator.recalculatePortfolioHoldings
      ).toHaveBeenCalledTimes(2);
      expect(
        mockHoldingsCalculator.recalculatePortfolioHoldings
      ).toHaveBeenCalledWith('p1');
      expect(
        mockHoldingsCalculator.recalculatePortfolioHoldings
      ).toHaveBeenCalledWith('p2');
    });
  });

  describe('updateTransaction', () => {
    it('should update transaction and recalculate holdings', async () => {
      const originalTransaction = createMockTransaction({ id: 't1' });
      const updates = { price: new Decimal(150) };

      mockTransactionQueries.getById.mockResolvedValue(originalTransaction);
      mockTransactionQueries.update.mockResolvedValue(undefined);
      mockTransactionQueries.getFiltered.mockResolvedValue([]);

      await useTransactionStore.getState().updateTransaction('t1', updates);

      expect(mockTransactionQueries.update).toHaveBeenCalledWith('t1', updates);
      expect(
        mockHoldingsCalculator.updateHoldingsForTransaction
      ).toHaveBeenCalled();

      const state = useTransactionStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle update failure', async () => {
      const errorMessage = 'Update failed';
      mockTransactionQueries.getById.mockResolvedValue(createMockTransaction());
      mockTransactionQueries.update.mockRejectedValue(new Error(errorMessage));

      await useTransactionStore
        .getState()
        .updateTransaction('t1', { price: new Decimal(150) });

      const state = useTransactionStore.getState();
      expect(state.error).toBe(errorMessage);
    });
  });

  describe('deleteTransaction', () => {
    it('should delete transaction and cleanup holdings', async () => {
      const transaction = createMockTransaction({
        id: 't1',
        portfolioId: 'p1',
        assetId: 'a1',
      });

      useTransactionStore.setState({
        transactions: [transaction],
        filteredTransactions: [transaction],
      });

      mockTransactionQueries.getById.mockResolvedValue(transaction);
      mockTransactionQueries.delete.mockResolvedValue(undefined);
      mockTransactionQueries.getByPortfolio.mockResolvedValue([]);

      await useTransactionStore.getState().deleteTransaction('t1');

      expect(mockTransactionQueries.delete).toHaveBeenCalledWith('t1');

      const state = useTransactionStore.getState();
      expect(state.transactions).toEqual([]);
      expect(state.filteredTransactions).toEqual([]);
      expect(state.loading).toBe(false);
    });

    it('should handle delete failure and rollback', async () => {
      const transaction = createMockTransaction({
        id: 't1',
        portfolioId: 'p1',
      });
      const errorMessage = 'Delete failed';

      // Pre-populate state with the transaction
      useTransactionStore.setState({
        transactions: [transaction],
        filteredTransactions: [transaction],
      });

      mockTransactionQueries.delete.mockRejectedValue(new Error(errorMessage));

      await useTransactionStore.getState().deleteTransaction('t1');

      const state = useTransactionStore.getState();
      // Transaction should be restored on failure (rollback)
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].id).toBe('t1');
      expect(state.error).toBe(errorMessage);
    });

    it('should handle delete for non-existent transaction', async () => {
      useTransactionStore.setState({
        transactions: [],
        filteredTransactions: [],
      });

      await useTransactionStore.getState().deleteTransaction('non-existent');

      const state = useTransactionStore.getState();
      expect(state.error).toBe('Transaction not found');
    });

    it('should update holdings after deletion', async () => {
      const transaction = createMockTransaction({
        id: 't1',
        portfolioId: 'p1',
      });

      // Pre-populate state with the transaction (optimistic delete finds it in state)
      useTransactionStore.setState({
        transactions: [transaction],
        filteredTransactions: [transaction],
      });

      mockTransactionQueries.delete.mockResolvedValue(undefined);

      await useTransactionStore.getState().deleteTransaction('t1');

      expect(
        mockHoldingsCalculator.updateHoldingsForTransaction
      ).toHaveBeenCalledWith(transaction);
    });
  });

  describe('importTransactions', () => {
    it('should import all transactions successfully', async () => {
      const transactions = [
        createMockTransaction({ portfolioId: 'p1' }),
        createMockTransaction({ portfolioId: 'p1' }),
      ];

      mockTransactionQueries.create.mockResolvedValue('new-id');
      mockTransactionQueries.getByPortfolio.mockResolvedValue([]);
      mockTransactionQueries.getSummary.mockResolvedValue(
        {} as TransactionSummary
      );

      const result = await useTransactionStore
        .getState()
        .importTransactions(transactions, 'p1');

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(2);
      expect(result.successfulImports).toBe(2);
      expect(result.errors).toHaveLength(0);

      const state = useTransactionStore.getState();
      expect(state.importing).toBe(false);
    });

    it('should handle partial import failures', async () => {
      const transactions = [
        createMockTransaction({ portfolioId: 'p1' }),
        createMockTransaction({ portfolioId: 'p1' }),
      ];

      mockTransactionQueries.create
        .mockResolvedValueOnce('id1')
        .mockRejectedValueOnce(new Error('Import error'));
      mockTransactionQueries.getByPortfolio.mockResolvedValue([]);
      mockTransactionQueries.getSummary.mockResolvedValue(
        {} as TransactionSummary
      );

      const result = await useTransactionStore
        .getState()
        .importTransactions(transactions, 'p1');

      expect(result.success).toBe(false);
      expect(result.totalRows).toBe(2);
      expect(result.successfulImports).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].row).toBe(2);
      expect(result.errors[0].message).toBe('Import error');
    });

    it('should handle complete import failure', async () => {
      const transactions = [createMockTransaction({ portfolioId: 'p1' })];

      mockTransactionQueries.create.mockRejectedValue(
        new Error('Import failed')
      );
      mockTransactionQueries.getByPortfolio.mockRejectedValue(
        new Error('Load failed')
      );

      const result = await useTransactionStore
        .getState()
        .importTransactions(transactions, 'p1');

      expect(result.success).toBe(false);
      expect(result.successfulImports).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);

      const state = useTransactionStore.getState();
      expect(state.importing).toBe(false);
    });

    it('should return correct result format', async () => {
      const transactions = [
        createMockTransaction({ portfolioId: 'p1' }),
        createMockTransaction({ portfolioId: 'p1' }),
        createMockTransaction({ portfolioId: 'p1' }),
      ];

      mockTransactionQueries.create
        .mockResolvedValueOnce('id1')
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockResolvedValueOnce('id3');
      mockTransactionQueries.getByPortfolio.mockResolvedValue([]);
      mockTransactionQueries.getSummary.mockResolvedValue(
        {} as TransactionSummary
      );

      const result = await useTransactionStore
        .getState()
        .importTransactions(transactions, 'p1');

      expect(result).toMatchObject({
        success: false,
        totalRows: 3,
        successfulImports: 2,
        errors: expect.arrayContaining([
          expect.objectContaining({
            row: 2,
            message: 'Error 1',
          }),
        ]),
        transactions: expect.any(Array),
      });
    });
  });

  describe('clearFilter', () => {
    it('should reset filter and restore original transactions', () => {
      const transactions = [createMockTransaction(), createMockTransaction()];

      useTransactionStore.setState({
        transactions,
        filteredTransactions: [transactions[0]],
        currentFilter: { type: ['buy'] },
      });

      useTransactionStore.getState().clearFilter();

      const state = useTransactionStore.getState();
      expect(state.currentFilter).toEqual({});
      expect(state.filteredTransactions).toEqual(transactions);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useTransactionStore.setState({ error: 'Some error' });

      useTransactionStore.getState().clearError();

      const state = useTransactionStore.getState();
      expect(state.error).toBeNull();
    });
  });
});
