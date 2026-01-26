import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Decimal } from 'decimal.js';

import {
  Transaction,
  TransactionFilter,
  TransactionSummary,
  ImportResult,
} from '@/types';
import { generateTransactionId } from '@/types/storage';
import { transactionQueries, HoldingsCalculator } from '@/lib/db';
import { showSuccessNotification, showErrorNotification } from './ui';
import { handleSnapshotTrigger } from '@/lib/services/snapshot-service';

// Optimistic ID prefix to identify temporary IDs
const OPTIMISTIC_ID_PREFIX = 'optimistic-';

// Validation helper function
function validateTransactionData(
  transaction: Partial<Transaction>
): string | null {
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
    if (
      qty.lessThanOrEqualTo(0) &&
      transaction.type !== 'fee' &&
      transaction.type !== 'tax'
    ) {
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
    if (
      total.lessThan(0) &&
      transaction.type !== 'fee' &&
      transaction.type !== 'tax'
    ) {
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
  createTransactions: (
    transactions: Omit<Transaction, 'id'>[]
  ) => Promise<void>;
  updateTransaction: (
    id: string,
    updates: Partial<Transaction>
  ) => Promise<void>;
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
              error instanceof Error
                ? error.message
                : 'Failed to load transactions',
            loading: false,
          });
        }
      },

      filterTransactions: async (filter) => {
        set({ loading: true, error: null, currentFilter: filter });
        try {
          const filteredTransactions =
            await transactionQueries.getFiltered(filter);
          set({ filteredTransactions, loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to filter transactions',
            loading: false,
          });
        }
      },

      createTransaction: async (transactionData) => {
        // Validate transaction data first (synchronous)
        const validationError = validateTransactionData(transactionData);
        if (validationError) {
          set({ error: validationError });
          showErrorNotification('Validation Error', validationError);
          return;
        }

        // Generate optimistic ID
        const optimisticId = `${OPTIMISTIC_ID_PREFIX}${generateTransactionId()}`;

        // Create optimistic transaction
        const optimisticTransaction: Transaction = {
          ...transactionData,
          id: optimisticId,
        } as Transaction;

        // Optimistically add transaction to state immediately (no loading state)
        const { transactions, filteredTransactions } = get();
        set({
          transactions: [optimisticTransaction, ...transactions],
          filteredTransactions: [
            optimisticTransaction,
            ...filteredTransactions,
          ],
          error: null,
        });

        try {
          // Create in database (background operation)
          const realId = await transactionQueries.create(transactionData);

          // Update holdings based on the new transaction
          const newTransaction = await transactionQueries.getById(realId);
          if (newTransaction) {
            await HoldingsCalculator.updateHoldingsForTransaction(
              newTransaction
            );
          }

          // Replace optimistic ID with real ID
          const currentTransactions = get().transactions;
          const currentFiltered = get().filteredTransactions;

          set({
            transactions: currentTransactions.map((t) =>
              t.id === optimisticId ? { ...t, id: realId } : t
            ),
            filteredTransactions: currentFiltered.map((t) =>
              t.id === optimisticId ? { ...t, id: realId } : t
            ),
          });

          // Update summary if portfolio is specified
          if (transactionData.portfolioId) {
            await get().loadSummary(transactionData.portfolioId);
          }

          // Trigger snapshot recomputation (non-blocking)
          handleSnapshotTrigger({
            type: 'TRANSACTION_ADDED',
            portfolioId: transactionData.portfolioId,
            date: new Date(transactionData.date),
          }).catch((err) => console.error('Failed to update performance snapshots:', err));

          showSuccessNotification(
            'Transaction Added',
            'Transaction has been successfully added to your portfolio.'
          );
        } catch (error) {
          // Rollback: Remove optimistic transaction on failure
          const currentTransactions = get().transactions;
          const currentFiltered = get().filteredTransactions;

          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Failed to create transaction';
          set({
            transactions: currentTransactions.filter(
              (t) => t.id !== optimisticId
            ),
            filteredTransactions: currentFiltered.filter(
              (t) => t.id !== optimisticId
            ),
            error: errorMessage,
          });
          showErrorNotification('Failed to Add Transaction', errorMessage);
        }
      },

      createTransactions: async (transactionDataList) => {
        set({ loading: true, error: null });
        try {
          // Validate all transactions first
          for (let i = 0; i < transactionDataList.length; i++) {
            const validationError = validateTransactionData(
              transactionDataList[i]
            );
            if (validationError) {
              throw new Error(`Transaction ${i + 1}: ${validationError}`);
            }
          }

          await transactionQueries.createMany(transactionDataList);

          // Recalculate holdings for affected portfolios
          const portfolioIds = [
            ...new Set(transactionDataList.map((t) => t.portfolioId)),
          ];
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
              error instanceof Error
                ? error.message
                : 'Failed to create transactions',
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
            await HoldingsCalculator.updateHoldingsForTransaction(
              updatedTransaction
            );
          }

          // Reload transactions
          const { currentFilter } = get();
          if (Object.keys(currentFilter).length > 0) {
            await get().filterTransactions(currentFilter);
          } else {
            await get().loadTransactions();
          }

          // Trigger snapshot recomputation (non-blocking)
          if (updatedTransaction && originalTransaction) {
            handleSnapshotTrigger({
              type: 'TRANSACTION_MODIFIED',
              portfolioId: updatedTransaction.portfolioId,
              oldDate: new Date(originalTransaction.date),
              newDate: new Date(updatedTransaction.date),
            }).catch((err) => console.error('Failed to update performance snapshots:', err));
          }

          set({ loading: false });
          showSuccessNotification(
            'Transaction Updated',
            'Transaction has been successfully updated.'
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Failed to update transaction';
          set({
            error: errorMessage,
            loading: false,
          });
          showErrorNotification('Failed to Update Transaction', errorMessage);
        }
      },

      deleteTransaction: async (id) => {
        // Store original state for potential rollback
        const { transactions, filteredTransactions } = get();
        const deletedTransaction = transactions.find((t) => t.id === id);

        if (!deletedTransaction) {
          set({ error: 'Transaction not found' });
          return;
        }

        // Optimistically remove transaction from state immediately (no loading state)
        set({
          transactions: transactions.filter((t) => t.id !== id),
          filteredTransactions: filteredTransactions.filter((t) => t.id !== id),
          error: null,
        });

        try {
          // Delete from database (background operation)
          await transactionQueries.delete(id);

          // Recalculate holdings for the affected asset after deletion
          await HoldingsCalculator.updateHoldingsForTransaction(
            deletedTransaction
          );

          // Trigger snapshot recomputation (non-blocking)
          handleSnapshotTrigger({
            type: 'TRANSACTION_DELETED',
            portfolioId: deletedTransaction.portfolioId,
            date: new Date(deletedTransaction.date),
          }).catch((err) => console.error('Failed to update performance snapshots:', err));

          showSuccessNotification(
            'Transaction Deleted',
            'Transaction has been successfully removed.'
          );
        } catch (error) {
          // Rollback: Restore the deleted transaction on failure
          const currentTransactions = get().transactions;
          const currentFiltered = get().filteredTransactions;

          const errorMessage =
            error instanceof Error
              ? error.message
              : 'Failed to delete transaction';
          set({
            transactions: [deletedTransaction, ...currentTransactions],
            filteredTransactions: [deletedTransaction, ...currentFiltered],
            error: errorMessage,
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
              successfulTransactions.push({
                ...transactionData,
                id,
              } as Transaction);
            } catch (error) {
              errors.push({
                row: i + 1,
                message:
                  error instanceof Error ? error.message : 'Unknown error',
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
                  error instanceof Error
                    ? error.message
                    : 'Import failed completely',
                data: {},
              },
            ],
            transactions: [],
          };

          set({
            error:
              error instanceof Error
                ? error.message
                : 'Failed to import transactions',
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
