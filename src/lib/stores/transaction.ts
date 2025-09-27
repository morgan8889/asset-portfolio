import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

import {
  Transaction,
  TransactionFilter,
  TransactionSummary,
  ImportResult,
} from '@/types';
import { transactionQueries } from '@/lib/db';

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
          await transactionQueries.create(transactionData);

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
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to create transaction',
            loading: false,
          });
        }
      },

      createTransactions: async (transactionDataList) => {
        set({ loading: true, error: null });
        try {
          await transactionQueries.createMany(transactionDataList);

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
          await transactionQueries.update(id, updates);

          // Reload transactions
          const { currentFilter } = get();
          if (Object.keys(currentFilter).length > 0) {
            await get().filterTransactions(currentFilter);
          } else {
            await get().loadTransactions();
          }

          set({ loading: false });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to update transaction',
            loading: false,
          });
        }
      },

      deleteTransaction: async (id) => {
        set({ loading: true, error: null });
        try {
          await transactionQueries.delete(id);

          // Remove from current transactions list
          const { transactions, filteredTransactions } = get();
          set({
            transactions: transactions.filter((t) => t.id !== id),
            filteredTransactions: filteredTransactions.filter((t) => t.id !== id),
            loading: false,
          });
        } catch (error) {
          set({
            error:
              error instanceof Error ? error.message : 'Failed to delete transaction',
            loading: false,
          });
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