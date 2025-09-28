import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Decimal } from 'decimal.js'
import { portfolioQueries, transactionQueries, holdingQueries } from '@/lib/db'
import { usePortfolioStore, useTransactionStore } from '@/lib/stores'
import { createMockAsset, createMockTransaction, resetCounters } from '@/test-utils'
import { Portfolio, Transaction, TransactionType } from '@/types'

// Mock the database
const mockDb = {
  portfolios: {
    add: vi.fn(),
    get: vi.fn(),
    orderBy: vi.fn(() => ({ toArray: vi.fn() })),
    update: vi.fn(),
    delete: vi.fn()
  },
  transactions: {
    add: vi.fn(),
    bulkAdd: vi.fn(),
    toCollection: vi.fn(() => ({
      filter: vi.fn(() => ({ toArray: vi.fn() }))
    }))
  },
  holdings: {
    where: vi.fn(() => ({ equals: vi.fn(() => ({ toArray: vi.fn() })) }))
  },
  transaction: vi.fn()
}

vi.mock('@/lib/db/schema', () => ({
  db: mockDb
}))

describe('Portfolio Workflow Integration Tests', () => {
  beforeEach(() => {
    resetCounters()
    vi.clearAllMocks()

    // Reset stores
    usePortfolioStore.setState({
      portfolios: [],
      currentPortfolio: null,
      holdings: [],
      assets: [],
      metrics: null,
      loading: false,
      error: null
    })

    useTransactionStore.setState({
      transactions: [],
      loading: false,
      error: null,
      filter: {
        portfolioId: '',
        assetId: '',
        type: [],
        dateFrom: null,
        dateTo: null,
        search: ''
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Complete Portfolio Creation and Transaction Flow', () => {
    it('should create portfolio, add transactions, and calculate metrics', async () => {
      // Mock portfolio creation
      const portfolioId = 'portfolio-1'
      const mockPortfolio: Portfolio = {
        id: portfolioId,
        name: 'Test Portfolio',
        description: 'Integration test portfolio',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockDb.portfolios.add.mockResolvedValue(portfolioId)
      mockDb.portfolios.get.mockResolvedValue(mockPortfolio)
      mockDb.portfolios.orderBy.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([mockPortfolio])
      })

      // Step 1: Create portfolio
      const portfolioStore = usePortfolioStore.getState()
      await portfolioStore.createPortfolio({
        name: 'Test Portfolio',
        description: 'Integration test portfolio',
        currency: 'USD'
      })

      expect(mockDb.portfolios.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Portfolio',
          description: 'Integration test portfolio',
          currency: 'USD'
        })
      )

      // Step 2: Set current portfolio
      portfolioStore.setCurrentPortfolio(mockPortfolio)

      // Mock holdings for empty portfolio
      mockDb.holdings.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([])
        })
      })

      // Step 3: Add transactions
      const transactionStore = useTransactionStore.getState()

      const mockTransactions: Omit<Transaction, 'id'>[] = [
        {
          assetId: 'AAPL',
          portfolioId: portfolioId,
          type: TransactionType.BUY,
          quantity: new Decimal(10),
          price: new Decimal(150),
          totalAmount: new Decimal(1500),
          fees: new Decimal(1),
          currency: 'USD',
          date: new Date('2023-01-01'),
          notes: 'Initial purchase'
        },
        {
          assetId: 'AAPL',
          portfolioId: portfolioId,
          type: TransactionType.BUY,
          quantity: new Decimal(5),
          price: new Decimal(160),
          totalAmount: new Decimal(800),
          fees: new Decimal(1),
          currency: 'USD',
          date: new Date('2023-02-01'),
          notes: 'Additional purchase'
        }
      ]

      mockDb.transactions.add.mockResolvedValue('transaction-1')

      // Add first transaction
      await transactionStore.createTransaction(mockTransactions[0])

      expect(mockDb.transactions.add).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: 'AAPL',
          portfolioId: portfolioId,
          type: TransactionType.BUY,
          quantity: new Decimal(10),
          price: new Decimal(150)
        })
      )

      // Add second transaction
      await transactionStore.createTransaction(mockTransactions[1])

      // Step 4: Verify transaction retrieval
      const mockDbTransactions = mockTransactions.map((t, i) => ({
        ...t,
        id: `transaction-${i + 1}`
      }))

      mockDb.transactions.toCollection.mockReturnValue({
        filter: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(mockDbTransactions)
        })
      })

      // Mock convertTransactionDecimals function
      mockDb.convertTransactionDecimals = vi.fn(t => t)

      const transactions = await transactionQueries.getFiltered({ portfolioId })
      expect(transactions).toHaveLength(2)

      // Step 5: Calculate portfolio metrics
      const mockHoldings = [
        {
          id: 'holding-1',
          portfolioId: portfolioId,
          assetId: 'AAPL',
          quantity: new Decimal(15), // 10 + 5
          averagePrice: new Decimal(153.33), // Weighted average
          costBasis: new Decimal(2302), // (10*150 + 5*160) + fees
          currentValue: new Decimal(2400), // 15 * 160 (current price)
          unrealizedGain: new Decimal(98), // 2400 - 2302
          unrealizedGainPercent: 4.26, // 98/2302 * 100
          lastUpdated: new Date()
        }
      ]

      // Mock the db.getHoldingsByPortfolio method
      mockDb.getHoldingsByPortfolio = vi.fn().mockResolvedValue(mockHoldings)

      await portfolioStore.calculateMetrics(portfolioId)

      const state = usePortfolioStore.getState()
      expect(state.metrics).toBeDefined()
      expect(state.metrics!.totalValue.toNumber()).toBe(2400)
      expect(state.metrics!.totalCost.toNumber()).toBe(2302)
      expect(state.metrics!.totalGain.toNumber()).toBe(98)
    })
  })

  describe('Multi-Asset Portfolio Management', () => {
    it('should handle multiple assets and transaction types', async () => {
      const portfolioId = 'multi-asset-portfolio'
      const mockPortfolio: Portfolio = {
        id: portfolioId,
        name: 'Multi-Asset Portfolio',
        description: 'Diversified portfolio',
        currency: 'USD',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // Setup portfolio
      usePortfolioStore.setState({ currentPortfolio: mockPortfolio })

      const transactionStore = useTransactionStore.getState()

      const mixedTransactions: Omit<Transaction, 'id'>[] = [
        // AAPL transactions
        {
          assetId: 'AAPL',
          portfolioId: portfolioId,
          type: TransactionType.BUY,
          quantity: new Decimal(10),
          price: new Decimal(150),
          totalAmount: new Decimal(1500),
          fees: new Decimal(1),
          currency: 'USD',
          date: new Date('2023-01-01'),
          notes: 'AAPL initial'
        },
        // MSFT transactions
        {
          assetId: 'MSFT',
          portfolioId: portfolioId,
          type: TransactionType.BUY,
          quantity: new Decimal(20),
          price: new Decimal(250),
          totalAmount: new Decimal(5000),
          fees: new Decimal(2),
          currency: 'USD',
          date: new Date('2023-01-15'),
          notes: 'MSFT initial'
        },
        // Dividend transaction
        {
          assetId: 'AAPL',
          portfolioId: portfolioId,
          type: TransactionType.DIVIDEND,
          quantity: new Decimal(10),
          price: new Decimal(0.23),
          totalAmount: new Decimal(2.30),
          fees: new Decimal(0),
          currency: 'USD',
          date: new Date('2023-03-01'),
          notes: 'Quarterly dividend'
        },
        // Partial sell
        {
          assetId: 'MSFT',
          portfolioId: portfolioId,
          type: TransactionType.SELL,
          quantity: new Decimal(5),
          price: new Decimal(280),
          totalAmount: new Decimal(1400),
          fees: new Decimal(1),
          currency: 'USD',
          date: new Date('2023-04-01'),
          notes: 'Partial profit taking'
        }
      ]

      mockDb.transactions.add.mockResolvedValue('transaction-id')

      // Add all transactions
      for (const transaction of mixedTransactions) {
        await transactionStore.createTransaction(transaction)
      }

      expect(mockDb.transactions.add).toHaveBeenCalledTimes(4)

      // Mock transaction filtering by asset
      mockDb.transactions.toCollection.mockReturnValue({
        filter: vi.fn().mockImplementation((filterFn) => ({
          toArray: vi.fn().mockResolvedValue(
            mixedTransactions
              .map((t, i) => ({ ...t, id: `tx-${i}` }))
              .filter(filterFn)
          )
        }))
      })

      mockDb.convertTransactionDecimals = vi.fn(t => t)

      // Test filtering by asset
      const appleTransactions = await transactionQueries.getFiltered({
        portfolioId,
        assetId: 'AAPL'
      })

      // Should have 2 AAPL transactions (1 buy, 1 dividend)
      expect(appleTransactions.filter(t => t.assetId === 'AAPL')).toHaveLength(2)

      // Test filtering by transaction type
      const buyTransactions = await transactionQueries.getFiltered({
        portfolioId,
        type: [TransactionType.BUY]
      })

      expect(buyTransactions.filter(t => t.type === TransactionType.BUY)).toHaveLength(2)
    })
  })

  describe('Error Handling and Data Consistency', () => {
    it('should handle database errors gracefully', async () => {
      const portfolioStore = usePortfolioStore.getState()

      // Mock database error
      mockDb.portfolios.add.mockRejectedValue(new Error('Database connection failed'))

      await portfolioStore.createPortfolio({
        name: 'Test Portfolio',
        description: 'Test',
        currency: 'USD'
      })

      const state = usePortfolioStore.getState()
      expect(state.error).toBe('Database connection failed')
      expect(state.loading).toBe(false)
    })

    it('should maintain data consistency during transaction failures', async () => {
      const portfolioId = 'test-portfolio'
      const transactionStore = useTransactionStore.getState()

      // Mock successful first transaction
      mockDb.transactions.add.mockResolvedValueOnce('tx-1')

      await transactionStore.createTransaction({
        assetId: 'AAPL',
        portfolioId: portfolioId,
        type: TransactionType.BUY,
        quantity: new Decimal(10),
        price: new Decimal(150),
        totalAmount: new Decimal(1500),
        fees: new Decimal(1),
        currency: 'USD',
        date: new Date(),
        notes: 'First transaction'
      })

      // Mock failed second transaction
      mockDb.transactions.add.mockRejectedValueOnce(new Error('Transaction failed'))

      await transactionStore.createTransaction({
        assetId: 'MSFT',
        portfolioId: portfolioId,
        type: TransactionType.BUY,
        quantity: new Decimal(5),
        price: new Decimal(250),
        totalAmount: new Decimal(1250),
        fees: new Decimal(1),
        currency: 'USD',
        date: new Date(),
        notes: 'Second transaction'
      })

      const state = useTransactionStore.getState()
      expect(state.error).toBe('Transaction failed')

      // First transaction should still be processed
      expect(mockDb.transactions.add).toHaveBeenCalledTimes(2)
    })
  })

  describe('Performance and Bulk Operations', () => {
    it('should handle bulk transaction imports efficiently', async () => {
      const portfolioId = 'bulk-portfolio'
      const transactionStore = useTransactionStore.getState()

      // Create 100 mock transactions
      const bulkTransactions: Omit<Transaction, 'id'>[] = Array.from(
        { length: 100 },
        (_, i) => ({
          assetId: `STOCK${i % 10}`, // 10 different stocks
          portfolioId: portfolioId,
          type: i % 2 === 0 ? TransactionType.BUY : TransactionType.SELL,
          quantity: new Decimal(Math.floor(Math.random() * 100) + 1),
          price: new Decimal(Math.floor(Math.random() * 200) + 50),
          totalAmount: new Decimal(1000),
          fees: new Decimal(1),
          currency: 'USD',
          date: new Date(2023, 0, i + 1),
          notes: `Bulk transaction ${i}`
        })
      )

      // Mock bulk add operation
      mockDb.transactions.bulkAdd.mockResolvedValue(undefined)

      const startTime = Date.now()
      await transactionQueries.createMany(bulkTransactions)
      const endTime = Date.now()

      // Should use bulk operation
      expect(mockDb.transactions.bulkAdd).toHaveBeenCalledOnce()
      expect(mockDb.transactions.bulkAdd).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: expect.any(String) })
        ])
      )

      // Should complete reasonably quickly (less than 1 second in test env)
      expect(endTime - startTime).toBeLessThan(1000)
    })
  })
})