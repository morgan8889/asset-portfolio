import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Decimal } from 'decimal.js';

import {
  Transaction,
  TransactionFilter,
  TransactionSummary,
  ImportResult,
} from '@/types';
import { transactionQueries, HoldingsCalculator } from '@/lib/db';
import { showSuccessNotification, showErrorNotification } from './ui';

// Validation helper function
function validateTransactionData(transaction: Partial<Transaction>): string | null {
  // Validate date
  if (transaction.date) {
    const transactionDate = new Date(transaction.date);
    const now = new Date();

    // Check if date is in the future
    if (transactionDate > now) {
      return 'Transaction date cannot be in the future';
    }

    // Check if date is too old (e.g., before 1900)
    const minDate = new Date('1900-01-01');
    if (transactionDate < minDate) {
      return 'Transaction date is too far in the past';
    }

    // Check if date is valid
    if (isNaN(transactionDate.getTime())) {
      return 'Invalid transaction date';
    }
  }

  // Validate amounts
  if (transaction.quantity !== undefined) {
    const qty = new Decimal(transaction.quantity);
    if (qty.lessThanOrEqualTo(0) && transaction.type !== 'fee' && transaction.type !== 'tax') {
      return 'Quantity must be greater than 0';
    }
  }

  if (transaction.price !== undefined) {
    const price = new Decimal(transaction.price);
    if (price.lessThan(0)) {
      return 'Price cannot be negative';
    }
  }

  if (transaction.totalAmount !== undefined) {
    const total = new Decimal(transaction.totalAmount);
    if (total.lessThan(0) && transaction.type !== 'fee' && transaction.type !== 'tax') {
      return 'Total amount cannot be negative';
    }
  }

  if (transaction.fees !== undefined) {
    const fees = new Decimal(transaction.fees);
    if (fees.lessThan(0)) {
      return 'Fees cannot be negative';
    }
  }

  // Validate asset ID
  if (transaction.assetId) {
    const cleanAssetId = transaction.assetId.trim();
    if (!cleanAssetId || cleanAssetId.length === 0) {
      return 'Asset symbol is required';
    }
    if (cleanAssetId.length > 20) {
      return 'Asset symbol is too long';
    }
  }

  return null; // No validation errors
}

interface TransactionState {
  // State
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  currentFilter: TransactionFilter;
  summary: TransactionSummary | null;
  loading: boolean;
  importing: boolean;
  error: string | null;

  // Actions
  loadTransactions: (portfolioId?: string) => Promise<void>;
  filterTransactions: (filter: TransactionFilter) => Promise<void>;
  createTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  createTransactions: (transactions: Omit<Transaction, 'id'>[]) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  loadSummary: (portfolioId?: string) => Promise<void>;
  importTransactions: (
    transactions: Omit<Transaction, 'id'>[],
    portfolioId: string
  ) => Promise<ImportResult>;
  clearFilter: () => void;
  clearError: () => void;
}

export const useTransactionStore = create<TransactionState>()(
  devtools(
    (set, get) => ({
      // Initial state
      transactions: [],
      filteredTransactions: [],
      currentFilter: {},
      summary: null,
      loading: false,
      importing: false,
      error: null,

      // Actions
      loadTransactions: async (portfolioId) => {
        set({ loading: true, error: null });
        try {
          const transactions = portfolioId
            ? await transactionQueries.getByPortfolio(portfolioId)
            : await transactionQueries.getFiltered({});

          set({
            transactions,
            filteredTransactions: transactions,
            loading: false,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to load transactions',
            loading: false,
          });
        }
      },

      filterTransactions: async (filter) => {
        set({ loading: true, error: null, currentFilter: filter });
        try {
          const filteredTransactions = await transactionQueries.getFiltered(filter);
          set({ filteredTransactions, loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to filter transactions',
            loading: false,
          });
        }
      },

      createTransaction: async (transactionData) => {
        set({ loading: true, error: null });
        try {
          // Validate transaction data
          const validationError = validateTransactionData(transactionData);
          if (validationError) {
            throw new Error(validationError);
          }

          const transactionId = await transactionQueries.create(transactionData);

          // Update holdings based on the new transaction
          const newTransaction = await transactionQueries.getById(transactionId);
          if (newTransaction) {
            await HoldingsCalculator.updateHoldingsForTransaction(newTransaction);
          }

          // Reload transactions to get the updated list
          const { currentFilter } = get();
          if (Object.keys(currentFilter).length > 0) {
            await get().filterTransactions(currentFilter);
          } else {
            await get().loadTransactions();
          }

          // Update summary if portfolio is specified
          if (transactionData.portfolioId) {
            await get().loadSummary(transactionData.portfolioId);
          }

          set({ loading: false });
          showSuccessNotification('Transaction Added', 'Transaction has been successfully added to your portfolio.');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create transaction';
          set({
            error: errorMessage,
            loading: false,
          });
          showErrorNotification('Failed to Add Transaction', errorMessage);
        }
      },

      createTransactions: async (transactionDataList) => {
        set({ loading: true, error: null });
        try {
          // Validate all transactions first
          for (let i = 0; i < transactionDataList.length; i++) {
            const validationError = validateTransactionData(transactionDataList[i]);
            if (validationError) {
              throw new Error(`Transaction ${i + 1}: ${validationError}`);
            }
          }

          await transactionQueries.createMany(transactionDataList);

          // Recalculate holdings for affected portfolios
          const portfolioIds = [...new Set(transactionDataList.map(t => t.portfolioId))];
          for (const portfolioId of portfolioIds) {
            await HoldingsCalculator.recalculatePortfolioHoldings(portfolioId);
          }

          // Reload transactions
          const { currentFilter } = get();
          if (Object.keys(currentFilter).length > 0) {
            await get().filterTransactions(currentFilter);
          } else {
            await get().loadTransactions();
          }

          // Update summary if portfolio is specified
          const portfolioId = transactionDataList[0]?.portfolioId;
          if (portfolioId) {
            await get().loadSummary(portfolioId);
          }

          set({ loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to create transactions',
            loading: false,
          });
        }
      },

      updateTransaction: async (id, updates) => {
        set({ loading: true, error: null });
        try {
          const originalTransaction = await transactionQueries.getById(id);
          await transactionQueries.update(id, updates);

          // Update holdings based on the modified transaction
          const updatedTransaction = await transactionQueries.getById(id);
          if (updatedTransaction) {
            await HoldingsCalculator.updateHoldingsForTransaction(updatedTransaction);
          }

          // Reload transactions
          const { currentFilter } = get();
          if (Object.keys(currentFilter).length > 0) {
            await get().filterTransactions(currentFilter);
          } else {
            await get().loadTransactions();
          }

          set({ loading: false });
          showSuccessNotification('Transaction Updated', 'Transaction has been successfully updated.');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update transaction';
          set({
            error: errorMessage,
            loading: false,
          });
          showErrorNotification('Failed to Update Transaction', errorMessage);
        }
      },

      deleteTransaction: async (id) => {
        set({ loading: true, error: null });
        try {
          const transaction = await transactionQueries.getById(id);
          await transactionQueries.delete(id);

          // Recalculate holdings for the affected asset after deletion
          if (transaction) {
            // Get all remaining transactions for this portfolio/asset combination
            const remainingTransactions = await transactionQueries.getByPortfolio(transaction.portfolioId);
            const assetTransactions = remainingTransactions.filter(t => t.assetId === transaction.assetId);

            // Recalculate holdings from scratch for this asset
            await HoldingsCalculator.updateHoldingsForTransaction(transaction);
          }

          // Remove from current transactions list
          const { transactions, filteredTransactions } = get();
          set({
            transactions: transactions.filter((t) => t.id !== id),
            filteredTransactions: filteredTransactions.filter((t) => t.id !== id),
            loading: false,
          });
          showSuccessNotification('Transaction Deleted', 'Transaction has been successfully removed.');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete transaction';
          set({
            error: errorMessage,
            loading: false,
          });
          showErrorNotification('Failed to Delete Transaction', errorMessage);
        }
      },

      loadSummary: async (portfolioId) => {
        try {
          const summary = await transactionQueries.getSummary(portfolioId);
          set({ summary });
        } catch (error) {
          console.error('Failed to load transaction summary:', error);
        }
      },

      importTransactions: async (transactionDataList, portfolioId) => {
        set({ importing: true, error: null });
        try {
          const successfulTransactions: Transaction[] = [];
          const errors: any[] = [];

          // Process transactions one by one to catch individual errors
          for (let i = 0; i < transactionDataList.length; i++) {
            try {
              const transactionData = {
                ...transactionDataList[i],
                portfolioId, // Ensure portfolio ID is set
              };
              const id = await transactionQueries.create(transactionData);
              successfulTransactions.push({ ...transactionData, id } as Transaction);
            } catch (error) {
              errors.push({
                row: i + 1,
                message: error instanceof Error ? error.message : 'Unknown error',
                data: transactionDataList[i],
              });
            }
          }

          const result: ImportResult = {
            success: errors.length === 0,
            totalRows: transactionDataList.length,
            successfulImports: successfulTransactions.length,
            errors,
            transactions: successfulTransactions,
          };

          // Reload transactions and summary
          await get().loadTransactions(portfolioId);
          await get().loadSummary(portfolioId);

          set({ importing: false });
          return result;
        } catch (error) {
          const result: ImportResult = {
            success: false,
            totalRows: transactionDataList.length,
            successfulImports: 0,
            errors: [
              {
                row: 0,
                message:
                  error instanceof Error ? error.message : 'Import failed completely',
                data: {},
              },
            ],
            transactions: [],
          };

          set({
            error:
              error instanceof Error ? error.message : 'Failed to import transactions',
            importing: false,
          });
          return result;
        }
      },

      clearFilter: () => {
        const { transactions } = get();
        set({
          currentFilter: {},
          filteredTransactions: transactions,
        });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'transaction-store',
    }
  )
);