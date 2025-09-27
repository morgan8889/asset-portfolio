import { Asset, Transaction, TransactionType } from '@/types'
import Decimal from 'decimal.js'

let assetIdCounter = 1
let transactionIdCounter = 1

export const createMockAsset = (overrides: Partial<Asset> = {}): Asset => ({
  id: `asset-${assetIdCounter++}`,
  symbol: 'AAPL',
  name: 'Apple Inc.',
  type: 'stock',
  exchange: 'NASDAQ',
  currency: 'USD',
  currentPrice: new Decimal(150.00),
  lastUpdated: new Date().toISOString(),
  ...overrides
})

export const createMockTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: `transaction-${transactionIdCounter++}`,
  assetId: 'asset-1',
  type: TransactionType.BUY,
  quantity: new Decimal(10),
  price: new Decimal(100),
  fee: new Decimal(1),
  date: new Date().toISOString(),
  notes: '',
  portfolioId: 'default',
  ...overrides
})

export const createMockPortfolioSnapshot = (overrides: any = {}) => ({
  id: `snapshot-${Date.now()}`,
  date: new Date().toISOString(),
  totalValue: new Decimal(10000),
  dayChange: new Decimal(100),
  dayChangePercent: new Decimal(1),
  holdings: [],
  ...overrides
})

export const createMockAssets = (count: number): Asset[] =>
  Array.from({ length: count }, (_, i) => createMockAsset({
    symbol: `STOCK${i + 1}`,
    name: `Stock ${i + 1} Inc.`,
    currentPrice: new Decimal((100 + i * 10))
  }))

export const createMockTransactions = (count: number, assetId?: string): Transaction[] =>
  Array.from({ length: count }, (_, i) => createMockTransaction({
    assetId: assetId || `asset-${i + 1}`,
    type: i % 2 === 0 ? TransactionType.BUY : TransactionType.SELL,
    quantity: new Decimal(10 + i),
    price: new Decimal(100 + i * 5),
    date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString()
  }))

export const resetCounters = () => {
  assetIdCounter = 1
  transactionIdCounter = 1
}