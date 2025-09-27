import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Decimal } from 'decimal.js'
import {
  portfolioQueries,
  assetQueries,
  holdingQueries,
  transactionQueries,
  priceQueries,
  settingsQueries
} from '../queries'
import { createMockAsset, createMockTransaction, createMockPortfolioSnapshot } from '@/test-utils'
import { TransactionType } from '@/types'

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => `mock-uuid-${Date.now()}`)
  }
})

describe('Portfolio Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('portfolioQueries', () => {
    it('should get all portfolios ordered by name', async () => {
      const mockPortfolios = [
        { id: '1', name: 'Portfolio B' },
        { id: '2', name: 'Portfolio A' }
      ]

      const mockOrderBy = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(mockPortfolios)
      })

      vi.doMock('../schema', () => ({
        db: {
          portfolios: {
            orderBy: mockOrderBy
          }
        }
      }))

      const result = await portfolioQueries.getAll()
      expect(mockOrderBy).toHaveBeenCalledWith('name')
      expect(result).toEqual(mockPortfolios)
    })

    it('should get portfolio by id', async () => {
      const mockPortfolio = { id: '1', name: 'Test Portfolio' }
      const mockGet = vi.fn().mockResolvedValue(mockPortfolio)

      vi.doMock('../schema', () => ({
        db: {
          portfolios: {
            get: mockGet
          }
        }
      }))

      const result = await portfolioQueries.getById('1')
      expect(mockGet).toHaveBeenCalledWith('1')
      expect(result).toEqual(mockPortfolio)
    })

    it('should create new portfolio with generated id and timestamps', async () => {
      const portfolioData = { name: 'Test Portfolio', description: 'Test' }
      const mockAdd = vi.fn().mockResolvedValue('mock-uuid-123')

      vi.doMock('../schema', () => ({
        db: {
          portfolios: {
            add: mockAdd
          }
        }
      }))

      const result = await portfolioQueries.create(portfolioData)

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          ...portfolioData,
          id: expect.stringMatching(/mock-uuid-/),
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      )
      expect(result).toBe('mock-uuid-123')
    })

    it('should update portfolio with new timestamp', async () => {
      const updates = { name: 'Updated Portfolio' }
      const mockUpdate = vi.fn().mockResolvedValue(undefined)

      vi.doMock('../schema', () => ({
        db: {
          portfolios: {
            update: mockUpdate
          }
        }
      }))

      await portfolioQueries.update('1', updates)

      expect(mockUpdate).toHaveBeenCalledWith('1', {
        ...updates,
        updatedAt: expect.any(Date)
      })
    })

    it('should delete portfolio and cascade delete related data', async () => {
      const mockDelete = vi.fn().mockResolvedValue(undefined)
      const mockWhere = vi.fn().mockReturnValue({
        equals: vi.fn().mockReturnValue({
          delete: vi.fn().mockResolvedValue(undefined)
        })
      })
      const mockTransaction = vi.fn().mockImplementation((mode, tables, callback) => {
        return callback()
      })

      vi.doMock('../schema', () => ({
        db: {
          transaction: mockTransaction,
          portfolios: { delete: mockDelete },
          holdings: { where: mockWhere },
          transactions: { where: mockWhere }
        }
      }))

      await portfolioQueries.delete('1')

      expect(mockTransaction).toHaveBeenCalled()
      expect(mockDelete).toHaveBeenCalledWith('1')
    })
  })

  describe('assetQueries', () => {
    it('should get asset by symbol (case insensitive)', async () => {
      const mockAsset = createMockAsset({ symbol: 'AAPL' })
      const mockFirst = vi.fn().mockResolvedValue(mockAsset)
      const mockEqualsIgnoreCase = vi.fn().mockReturnValue({ first: mockFirst })
      const mockWhere = vi.fn().mockReturnValue({ equalsIgnoreCase: mockEqualsIgnoreCase })

      vi.doMock('../schema', () => ({
        db: {
          assets: {
            where: mockWhere
          }
        }
      }))

      const result = await assetQueries.getBySymbol('aapl')

      expect(mockWhere).toHaveBeenCalledWith('symbol')
      expect(mockEqualsIgnoreCase).toHaveBeenCalledWith('aapl')
      expect(result).toEqual(mockAsset)
    })

    it('should search assets by symbol and name', async () => {
      const mockAssets = [
        createMockAsset({ symbol: 'AAPL', name: 'Apple Inc.' }),
        createMockAsset({ symbol: 'MSFT', name: 'Microsoft Corp.' })
      ]

      const mockToArray = vi.fn().mockResolvedValue(mockAssets)
      const mockLimit = vi.fn().mockReturnValue({ toArray: mockToArray })
      const mockFilter = vi.fn().mockReturnValue({ limit: mockLimit })

      vi.doMock('../schema', () => ({
        db: {
          assets: {
            filter: mockFilter
          }
        }
      }))

      const result = await assetQueries.search('app', 10)

      expect(mockFilter).toHaveBeenCalled()
      expect(mockLimit).toHaveBeenCalledWith(10)
      expect(result).toEqual(mockAssets)
    })

    it('should throw error when creating asset with existing symbol', async () => {
      const existingAsset = createMockAsset({ symbol: 'AAPL' })
      const newAssetData = { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' as const }

      // Mock getBySymbol to return existing asset
      vi.spyOn(assetQueries, 'getBySymbol').mockResolvedValue(existingAsset)

      await expect(assetQueries.create(newAssetData)).rejects.toThrow(
        'Asset with symbol AAPL already exists'
      )
    })

    it('should update asset price with timestamp', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined)

      vi.doMock('../schema', () => ({
        db: {
          assets: {
            update: mockUpdate
          }
        }
      }))

      await assetQueries.updatePrice('1', 150.50)

      expect(mockUpdate).toHaveBeenCalledWith('1', {
        currentPrice: 150.50,
        priceUpdatedAt: expect.any(Date)
      })
    })
  })

  describe('transactionQueries', () => {
    it('should filter transactions by multiple criteria', async () => {
      const mockTransactions = [
        createMockTransaction({ type: TransactionType.BUY, portfolioId: 'p1' }),
        createMockTransaction({ type: TransactionType.SELL, portfolioId: 'p1' })
      ]

      const mockToArray = vi.fn().mockResolvedValue(mockTransactions)
      const mockFilter = vi.fn().mockReturnValue({ toArray: mockToArray })
      const mockToCollection = vi.fn().mockReturnValue({ filter: mockFilter })

      vi.doMock('../schema', () => ({
        db: {
          transactions: {
            toCollection: mockToCollection
          },
          convertTransactionDecimals: vi.fn(t => t)
        }
      }))

      const filter = {
        portfolioId: 'p1',
        type: [TransactionType.BUY],
        dateFrom: new Date('2023-01-01'),
        dateTo: new Date('2023-12-31')
      }

      const result = await transactionQueries.getFiltered(filter)

      expect(mockToCollection).toHaveBeenCalled()
      expect(mockFilter).toHaveBeenCalled()
      expect(result).toHaveLength(2)
    })

    it('should create multiple transactions with bulk add', async () => {
      const transactionData = [
        { type: TransactionType.BUY, quantity: new Decimal(10), price: new Decimal(100) },
        { type: TransactionType.SELL, quantity: new Decimal(5), price: new Decimal(110) }
      ]

      const mockBulkAdd = vi.fn().mockResolvedValue(undefined)

      vi.doMock('../schema', () => ({
        db: {
          transactions: {
            bulkAdd: mockBulkAdd
          }
        }
      }))

      const result = await transactionQueries.createMany(transactionData)

      expect(mockBulkAdd).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: expect.stringMatching(/mock-uuid-/) }),
          expect.objectContaining({ id: expect.stringMatching(/mock-uuid-/) })
        ])
      )
      expect(result).toHaveLength(2)
    })

    it('should calculate transaction summary correctly', async () => {
      const mockTransactions = [
        {
          type: 'buy',
          totalAmount: 1000,
          fees: 10,
          date: new Date('2023-01-01')
        },
        {
          type: 'sell',
          totalAmount: 1100,
          fees: 15,
          date: new Date('2023-06-01')
        },
        {
          type: 'dividend',
          totalAmount: 50,
          fees: 0,
          date: new Date('2023-03-01')
        }
      ]

      const mockToArray = vi.fn().mockResolvedValue(mockTransactions)
      const mockFilter = vi.fn().mockReturnValue({ toArray: mockToArray })
      const mockToCollection = vi.fn().mockReturnValue({ filter: mockFilter })

      vi.doMock('../schema', () => ({
        db: {
          transactions: {
            toCollection: mockToCollection
          },
          convertTransactionDecimals: vi.fn(t => ({
            ...t,
            totalAmount: new Decimal(t.totalAmount),
            fees: new Decimal(t.fees)
          }))
        }
      }))

      const result = await transactionQueries.getSummary('p1')

      expect(result.totalTransactions).toBe(3)
      expect(result.totalBuys).toBe(1)
      expect(result.totalSells).toBe(1)
      expect(result.totalDividends).toBe(1)
      expect(result.totalInvested.toNumber()).toBe(1000)
      expect(result.totalDividendIncome.toNumber()).toBe(50)
      expect(result.totalFees.toNumber()).toBe(25)
    })
  })

  describe('settingsQueries', () => {
    it('should set new setting when key does not exist', async () => {
      const mockFirst = vi.fn().mockResolvedValue(undefined)
      const mockEquals = vi.fn().mockReturnValue({ first: mockFirst })
      const mockWhere = vi.fn().mockReturnValue({ equals: mockEquals })
      const mockAdd = vi.fn().mockResolvedValue(undefined)

      vi.doMock('../schema', () => ({
        db: {
          userSettings: {
            where: mockWhere,
            add: mockAdd
          }
        }
      }))

      await settingsQueries.set('theme', 'dark')

      expect(mockAdd).toHaveBeenCalledWith({
        key: 'theme',
        value: 'dark',
        updatedAt: expect.any(Date)
      })
    })

    it('should update existing setting', async () => {
      const existingSetting = { id: '1', key: 'theme', value: 'light' }
      const mockFirst = vi.fn().mockResolvedValue(existingSetting)
      const mockEquals = vi.fn().mockReturnValue({ first: mockFirst })
      const mockWhere = vi.fn().mockReturnValue({ equals: mockEquals })
      const mockUpdate = vi.fn().mockResolvedValue(undefined)

      vi.doMock('../schema', () => ({
        db: {
          userSettings: {
            where: mockWhere,
            update: mockUpdate
          }
        }
      }))

      await settingsQueries.set('theme', 'dark')

      expect(mockUpdate).toHaveBeenCalledWith('1', {
        value: 'dark',
        updatedAt: expect.any(Date)
      })
    })

    it('should get all settings as object', async () => {
      const mockSettings = [
        { key: 'theme', value: 'dark' },
        { key: 'currency', value: 'USD' }
      ]

      const mockToArray = vi.fn().mockResolvedValue(mockSettings)

      vi.doMock('../schema', () => ({
        db: {
          userSettings: {
            toArray: mockToArray
          }
        }
      }))

      const result = await settingsQueries.getAll()

      expect(result).toEqual({
        theme: 'dark',
        currency: 'USD'
      })
    })
  })
})