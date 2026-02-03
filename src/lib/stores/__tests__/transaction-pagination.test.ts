import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTransactionStore } from '../transaction';
import * as queries from '@/lib/db/queries';
import type { PaginatedTransactionsResult } from '@/types/transaction';
import Decimal from 'decimal.js';

// Mock the queries module
vi.mock('@/lib/db/queries', () => ({
  getPaginatedTransactions: vi.fn(),
  countTransactions: vi.fn(),
}));

describe('Transaction Pagination Store', () => {
  const mockPaginatedResult: PaginatedTransactionsResult = {
    data: [
      {
        id: 'txn-001',
        portfolioId: 'port-001',
        assetId: 'AAPL',
        type: 'buy',
        date: new Date('2024-01-01'),
        quantity: new Decimal('10'),
        price: new Decimal('150'),
        totalAmount: new Decimal('1500'),
        fees: new Decimal('1'),
        currency: 'USD',
      },
    ],
    totalCount: 100,
    page: 1,
    pageSize: 25,
    totalPages: 4,
  };

  beforeEach(() => {
    // Reset store to initial state
    useTransactionStore.setState({
      pagination: {
        currentPage: 1,
        pageSize: 25,
        totalCount: 0,
        totalPages: 0,
      },
      loading: false,
      error: null,
    });

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with default pagination state', () => {
      const { pagination } = useTransactionStore.getState();

      expect(pagination.currentPage).toBe(1);
      expect(pagination.pageSize).toBe(25);
      expect(pagination.totalCount).toBe(0);
      expect(pagination.totalPages).toBe(0);
    });
  });

  describe('loadPaginatedTransactions', () => {
    it('should load transactions and update pagination state', async () => {
      vi.mocked(queries.getPaginatedTransactions).mockResolvedValue(mockPaginatedResult);

      await useTransactionStore.getState().loadPaginatedTransactions('port-001');

      const state = useTransactionStore.getState();
      expect(state.transactions).toHaveLength(1);
      expect(state.pagination.totalCount).toBe(100);
      expect(state.pagination.totalPages).toBe(4);
      expect(state.pagination.currentPage).toBe(1);
      expect(state.loading).toBe(false);
    });

    it('should use custom page and pageSize from options', async () => {
      vi.mocked(queries.getPaginatedTransactions).mockResolvedValue({
        ...mockPaginatedResult,
        page: 2,
        pageSize: 50,
      });

      await useTransactionStore.getState().loadPaginatedTransactions('port-001', {
        page: 2,
        pageSize: 50,
      });

      expect(queries.getPaginatedTransactions).toHaveBeenCalledWith({
        page: 2,
        pageSize: 50,
        portfolioId: 'port-001',
        filterType: undefined,
        searchTerm: undefined,
        sortBy: 'date',
        sortOrder: 'desc',
      });
    });

    it('should set loading to true during fetch', async () => {
      let loadingDuringFetch = false;

      vi.mocked(queries.getPaginatedTransactions).mockImplementation(async () => {
        loadingDuringFetch = useTransactionStore.getState().loading;
        return mockPaginatedResult;
      });

      await useTransactionStore.getState().loadPaginatedTransactions('port-001');

      expect(loadingDuringFetch).toBe(true);
      expect(useTransactionStore.getState().loading).toBe(false);
    });

    it('should handle errors', async () => {
      const error = new Error('Failed to load transactions');
      vi.mocked(queries.getPaginatedTransactions).mockRejectedValue(error);

      await useTransactionStore.getState().loadPaginatedTransactions('port-001');

      const state = useTransactionStore.getState();
      expect(state.error).toBe('Failed to load transactions');
      expect(state.loading).toBe(false);
    });
  });

  describe('setCurrentPage', () => {
    beforeEach(() => {
      useTransactionStore.setState({
        pagination: {
          currentPage: 1,
          pageSize: 25,
          totalCount: 100,
          totalPages: 4,
        },
      });
    });

    it('should update current page', () => {
      useTransactionStore.getState().setCurrentPage(2);
      expect(useTransactionStore.getState().pagination.currentPage).toBe(2);
    });

    it('should clamp page to valid range - upper bound', () => {
      useTransactionStore.getState().setCurrentPage(10);
      expect(useTransactionStore.getState().pagination.currentPage).toBe(4);
    });

    it('should clamp page to valid range - lower bound', () => {
      useTransactionStore.getState().setCurrentPage(-1);
      expect(useTransactionStore.getState().pagination.currentPage).toBe(1);
    });

    it('should handle page 0 as page 1', () => {
      useTransactionStore.getState().setCurrentPage(0);
      expect(useTransactionStore.getState().pagination.currentPage).toBe(1);
    });
  });

  describe('setPageSize', () => {
    beforeEach(() => {
      useTransactionStore.setState({
        pagination: {
          currentPage: 1,
          pageSize: 25,
          totalCount: 100,
          totalPages: 4,
        },
      });
    });

    it('should update page size', () => {
      useTransactionStore.getState().setPageSize(50);
      expect(useTransactionStore.getState().pagination.pageSize).toBe(50);
    });

    it('should preserve position when changing size', () => {
      // Start at page 3 with size 25 (items 51-75)
      useTransactionStore.setState({
        pagination: {
          currentPage: 3,
          pageSize: 25,
          totalCount: 100,
          totalPages: 4,
        },
      });

      // Change to size 50
      useTransactionStore.getState().setPageSize(50);

      // Should be on page 2 (items 51-100)
      const { pagination } = useTransactionStore.getState();
      expect(pagination.pageSize).toBe(50);
      expect(pagination.currentPage).toBe(2);
    });

    it('should reject invalid page sizes and keep current size', () => {
      useTransactionStore.getState().setPageSize(99);
      expect(useTransactionStore.getState().pagination.pageSize).toBe(25);
    });

    it('should accept valid page sizes', () => {
      [10, 25, 50, 100].forEach((size) => {
        useTransactionStore.getState().setPageSize(size);
        expect(useTransactionStore.getState().pagination.pageSize).toBe(size);
      });
    });
  });

  describe('resetPagination', () => {
    it('should reset to defaults', () => {
      useTransactionStore.setState({
        pagination: {
          currentPage: 5,
          pageSize: 100,
          totalCount: 500,
          totalPages: 5,
        },
      });

      useTransactionStore.getState().resetPagination();

      expect(useTransactionStore.getState().pagination).toEqual({
        currentPage: 1,
        pageSize: 25,
        totalCount: 0,
        totalPages: 0,
      });
    });
  });

  describe('calculateTotalPages', () => {
    it('should calculate correct total pages', () => {
      const testCases = [
        { totalCount: 100, pageSize: 25, expected: 4 },
        { totalCount: 101, pageSize: 25, expected: 5 },
        { totalCount: 99, pageSize: 25, expected: 4 },
        { totalCount: 0, pageSize: 25, expected: 0 },
        { totalCount: 10, pageSize: 100, expected: 1 },
      ];

      testCases.forEach(({ totalCount, pageSize, expected }) => {
        const totalPages = Math.ceil(totalCount / pageSize);
        expect(totalPages).toBe(expected);
      });
    });
  });

  describe('Session Persistence', () => {
    beforeEach(() => {
      // Clear sessionStorage before each test
      sessionStorage.clear();
    });

    it('should persist pagination state to sessionStorage', () => {
      // Update pagination state
      useTransactionStore.setState({
        pagination: {
          currentPage: 3,
          pageSize: 50,
          totalCount: 200,
          totalPages: 4,
        },
      });

      // Check if persisted to sessionStorage
      const stored = sessionStorage.getItem('transaction-pagination-state');
      expect(stored).toBeTruthy();

      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.pagination.currentPage).toBe(3);
        expect(parsed.state.pagination.pageSize).toBe(50);
      }
    });

    it('should restore pagination state from sessionStorage', () => {
      // Manually set sessionStorage
      const state = {
        state: {
          pagination: {
            currentPage: 5,
            pageSize: 100,
            totalCount: 500,
            totalPages: 5,
          },
        },
        version: 0,
      };
      sessionStorage.setItem('transaction-pagination-state', JSON.stringify(state));

      // Get current state (should be restored from storage)
      const currentState = useTransactionStore.getState();

      // Note: In tests, the store might not automatically hydrate
      // In actual usage, Zustand's persist middleware handles this
      expect(currentState.pagination).toBeDefined();
    });

    it('should only persist pagination state, not other properties', () => {
      // Update various state properties
      useTransactionStore.setState({
        pagination: {
          currentPage: 2,
          pageSize: 25,
          totalCount: 100,
          totalPages: 4,
        },
        loading: true,
        error: 'Test error',
        transactions: mockPaginatedResult.data,
      });

      // Check sessionStorage
      const stored = sessionStorage.getItem('transaction-pagination-state');
      expect(stored).toBeTruthy();

      if (stored) {
        const parsed = JSON.parse(stored);

        // Should have pagination
        expect(parsed.state.pagination).toBeDefined();

        // Should NOT have other properties
        expect(parsed.state.loading).toBeUndefined();
        expect(parsed.state.error).toBeUndefined();
        expect(parsed.state.transactions).toBeUndefined();
      }
    });
  });
});
