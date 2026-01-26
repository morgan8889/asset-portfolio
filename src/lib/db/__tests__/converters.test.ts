import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';
import {
  toAssetStorage,
  toTransactionStorage,
  transactionToStorage,
  holdingToStorage,
  priceSnapshotToStorage,
  priceHistoryToStorage,
  dividendRecordToStorage,
  type CreateAssetInput,
  type CreateTransactionInput,
} from '../converters';
import type { Transaction } from '@/types/transaction';
import type { Holding, PriceSnapshot, PriceHistory, DividendRecord } from '@/types/asset';
import type { AssetId, PortfolioId, HoldingId, TaxLotId } from '@/types/storage';

describe('Database Converters', () => {
  describe('toAssetStorage', () => {
    it('should convert valid asset input to storage format', () => {
      const input: CreateAssetInput = {
        id: 'asset-123',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
        exchange: 'NASDAQ',
        sector: 'Technology',
        currentPrice: 150.5,
        priceUpdatedAt: new Date('2026-01-26T12:00:00Z'),
        metadata: { test: 'value' },
      };

      const result = toAssetStorage(input);

      expect(result.id).toBe('asset-123');
      expect(result.symbol).toBe('AAPL');
      expect(result.name).toBe('Apple Inc.');
      expect(result.type).toBe('stock');
      expect(result.currency).toBe('USD');
      expect(result.exchange).toBe('NASDAQ');
      expect(result.sector).toBe('Technology');
      expect(result.currentPrice).toBe(150.5);
      expect(result.priceUpdatedAt).toEqual(new Date('2026-01-26T12:00:00Z'));
      expect(result.metadata).toEqual({ test: 'value' });
    });

    it('should use empty object for missing metadata', () => {
      const input: CreateAssetInput = {
        id: 'asset-123',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
      };

      const result = toAssetStorage(input);

      expect(result.metadata).toEqual({});
    });

    it('should throw TypeError for missing id', () => {
      const input = {
        id: '',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
      } as CreateAssetInput;

      expect(() => toAssetStorage(input)).toThrow(TypeError);
      expect(() => toAssetStorage(input)).toThrow('id must be a non-empty string');
    });

    it('should throw TypeError for missing symbol', () => {
      const input = {
        id: 'asset-123',
        symbol: '',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
      } as CreateAssetInput;

      expect(() => toAssetStorage(input)).toThrow(TypeError);
      expect(() => toAssetStorage(input)).toThrow('symbol must be a non-empty string');
    });

    it('should throw TypeError for missing name', () => {
      const input = {
        id: 'asset-123',
        symbol: 'AAPL',
        name: '',
        type: 'stock',
        currency: 'USD',
      } as CreateAssetInput;

      expect(() => toAssetStorage(input)).toThrow(TypeError);
      expect(() => toAssetStorage(input)).toThrow('name must be a non-empty string');
    });

    it('should throw TypeError for missing currency', () => {
      const input = {
        id: 'asset-123',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: '',
      } as CreateAssetInput;

      expect(() => toAssetStorage(input)).toThrow(TypeError);
      expect(() => toAssetStorage(input)).toThrow('currency must be a non-empty string');
    });

    it('should throw RangeError for negative currentPrice', () => {
      const input: CreateAssetInput = {
        id: 'asset-123',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
        currentPrice: -10,
      };

      expect(() => toAssetStorage(input)).toThrow(RangeError);
      expect(() => toAssetStorage(input)).toThrow('currentPrice must be a non-negative number');
    });

    it('should throw TypeError for invalid priceUpdatedAt', () => {
      const input = {
        id: 'asset-123',
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        currency: 'USD',
        priceUpdatedAt: 'not-a-date',
      } as unknown as CreateAssetInput;

      expect(() => toAssetStorage(input)).toThrow(TypeError);
      expect(() => toAssetStorage(input)).toThrow('priceUpdatedAt must be a Date instance');
    });
  });

  describe('toTransactionStorage', () => {
    it('should convert valid transaction input to storage format', () => {
      const input: CreateTransactionInput = {
        id: 'txn-123',
        portfolioId: 'portfolio-456',
        assetId: 'asset-789',
        type: 'buy',
        date: new Date('2026-01-26T12:00:00Z'),
        quantity: new Decimal('10'),
        price: new Decimal('150.50'),
        totalAmount: new Decimal('1505.00'),
        fees: new Decimal('5.00'),
        currency: 'USD',
        notes: 'Test transaction',
        importSource: 'csv-import',
        metadata: { test: 'value' },
      };

      const result = toTransactionStorage(input);

      expect(result.id).toBe('txn-123');
      expect(result.portfolioId).toBe('portfolio-456');
      expect(result.assetId).toBe('asset-789');
      expect(result.type).toBe('buy');
      expect(result.date).toEqual(new Date('2026-01-26T12:00:00Z'));
      expect(result.quantity).toBe('10');
      expect(result.price).toBe('150.5');
      expect(result.totalAmount).toBe('1505');
      expect(result.fees).toBe('5');
      expect(result.currency).toBe('USD');
      expect(result.notes).toBe('Test transaction');
      expect(result.importSource).toBe('csv-import');
      expect(result.metadata).toEqual({ test: 'value' });
    });

    it('should throw TypeError for missing id', () => {
      const input = {
        id: '',
        portfolioId: 'portfolio-456',
        assetId: 'asset-789',
        type: 'buy',
        date: new Date(),
        quantity: new Decimal('10'),
        price: new Decimal('150.50'),
        totalAmount: new Decimal('1505.00'),
        fees: new Decimal('5.00'),
        currency: 'USD',
      } as CreateTransactionInput;

      expect(() => toTransactionStorage(input)).toThrow(TypeError);
      expect(() => toTransactionStorage(input)).toThrow('id must be a non-empty string');
    });

    it('should throw TypeError for missing portfolioId', () => {
      const input = {
        id: 'txn-123',
        portfolioId: '',
        assetId: 'asset-789',
        type: 'buy',
        date: new Date(),
        quantity: new Decimal('10'),
        price: new Decimal('150.50'),
        totalAmount: new Decimal('1505.00'),
        fees: new Decimal('5.00'),
        currency: 'USD',
      } as CreateTransactionInput;

      expect(() => toTransactionStorage(input)).toThrow(TypeError);
      expect(() => toTransactionStorage(input)).toThrow('portfolioId must be a non-empty string');
    });

    it('should throw TypeError for missing assetId', () => {
      const input = {
        id: 'txn-123',
        portfolioId: 'portfolio-456',
        assetId: '',
        type: 'buy',
        date: new Date(),
        quantity: new Decimal('10'),
        price: new Decimal('150.50'),
        totalAmount: new Decimal('1505.00'),
        fees: new Decimal('5.00'),
        currency: 'USD',
      } as CreateTransactionInput;

      expect(() => toTransactionStorage(input)).toThrow(TypeError);
      expect(() => toTransactionStorage(input)).toThrow('assetId must be a non-empty string');
    });

    it('should throw TypeError for invalid date', () => {
      const input = {
        id: 'txn-123',
        portfolioId: 'portfolio-456',
        assetId: 'asset-789',
        type: 'buy',
        date: 'not-a-date',
        quantity: new Decimal('10'),
        price: new Decimal('150.50'),
        totalAmount: new Decimal('1505.00'),
        fees: new Decimal('5.00'),
        currency: 'USD',
      } as unknown as CreateTransactionInput;

      expect(() => toTransactionStorage(input)).toThrow(TypeError);
      expect(() => toTransactionStorage(input)).toThrow('date must be a Date instance');
    });

    it('should throw TypeError for non-Decimal quantity', () => {
      const input = {
        id: 'txn-123',
        portfolioId: 'portfolio-456',
        assetId: 'asset-789',
        type: 'buy',
        date: new Date(),
        quantity: 10,
        price: new Decimal('150.50'),
        totalAmount: new Decimal('1505.00'),
        fees: new Decimal('5.00'),
        currency: 'USD',
      } as unknown as CreateTransactionInput;

      expect(() => toTransactionStorage(input)).toThrow(TypeError);
      expect(() => toTransactionStorage(input)).toThrow('quantity must be a Decimal instance');
    });

    it('should throw TypeError for non-Decimal price', () => {
      const input = {
        id: 'txn-123',
        portfolioId: 'portfolio-456',
        assetId: 'asset-789',
        type: 'buy',
        date: new Date(),
        quantity: new Decimal('10'),
        price: 150.5,
        totalAmount: new Decimal('1505.00'),
        fees: new Decimal('5.00'),
        currency: 'USD',
      } as unknown as CreateTransactionInput;

      expect(() => toTransactionStorage(input)).toThrow(TypeError);
      expect(() => toTransactionStorage(input)).toThrow('price must be a Decimal instance');
    });

    it('should throw RangeError for negative quantity', () => {
      const input: CreateTransactionInput = {
        id: 'txn-123',
        portfolioId: 'portfolio-456',
        assetId: 'asset-789',
        type: 'buy',
        date: new Date(),
        quantity: new Decimal('-10'),
        price: new Decimal('150.50'),
        totalAmount: new Decimal('1505.00'),
        fees: new Decimal('5.00'),
        currency: 'USD',
      };

      expect(() => toTransactionStorage(input)).toThrow(RangeError);
      expect(() => toTransactionStorage(input)).toThrow('quantity cannot be negative');
    });

    it('should throw RangeError for negative price', () => {
      const input: CreateTransactionInput = {
        id: 'txn-123',
        portfolioId: 'portfolio-456',
        assetId: 'asset-789',
        type: 'buy',
        date: new Date(),
        quantity: new Decimal('10'),
        price: new Decimal('-150.50'),
        totalAmount: new Decimal('1505.00'),
        fees: new Decimal('5.00'),
        currency: 'USD',
      };

      expect(() => toTransactionStorage(input)).toThrow(RangeError);
      expect(() => toTransactionStorage(input)).toThrow('price cannot be negative');
    });

    it('should throw RangeError for negative fees', () => {
      const input: CreateTransactionInput = {
        id: 'txn-123',
        portfolioId: 'portfolio-456',
        assetId: 'asset-789',
        type: 'buy',
        date: new Date(),
        quantity: new Decimal('10'),
        price: new Decimal('150.50'),
        totalAmount: new Decimal('1505.00'),
        fees: new Decimal('-5.00'),
        currency: 'USD',
      };

      expect(() => toTransactionStorage(input)).toThrow(RangeError);
      expect(() => toTransactionStorage(input)).toThrow('fees cannot be negative');
    });
  });

  describe('transactionToStorage', () => {
    it('should convert full Transaction to storage format', () => {
      const transaction: Transaction = {
        id: 'txn-123',
        portfolioId: 'portfolio-456',
        assetId: 'asset-789',
        type: 'buy',
        date: new Date('2026-01-26T12:00:00Z'),
        quantity: new Decimal('10'),
        price: new Decimal('150.50'),
        totalAmount: new Decimal('1505.00'),
        fees: new Decimal('5.00'),
        currency: 'USD',
        notes: 'Test transaction',
      };

      const result = transactionToStorage(transaction);

      expect(result.id).toBe('txn-123');
      expect(result.quantity).toBe('10');
      expect(result.price).toBe('150.5');
    });
  });

  describe('holdingToStorage', () => {
    it('should convert holding with lots to storage format', () => {
      const holding: Holding = {
        id: 'holding-123' as HoldingId,
        portfolioId: 'portfolio-456' as PortfolioId,
        assetId: 'asset-789' as AssetId,
        quantity: new Decimal('100'),
        costBasis: new Decimal('10000'),
        averageCost: new Decimal('100'),
        currentValue: new Decimal('15000'),
        unrealizedGain: new Decimal('5000'),
        unrealizedGainPercent: 50,
        lots: [
          {
            id: 'lot-1' as TaxLotId,
            quantity: new Decimal('50'),
            purchasePrice: new Decimal('90'),
            purchaseDate: new Date('2025-01-01'),
            soldQuantity: new Decimal('0'),
            remainingQuantity: new Decimal('50'),
          },
          {
            id: 'lot-2' as TaxLotId,
            quantity: new Decimal('50'),
            purchasePrice: new Decimal('110'),
            purchaseDate: new Date('2025-06-01'),
            soldQuantity: new Decimal('0'),
            remainingQuantity: new Decimal('50'),
          },
        ],
        lastUpdated: new Date('2026-01-26T12:00:00Z'),
      };

      const result = holdingToStorage(holding);

      expect(result.id).toBe('holding-123');
      expect(result.quantity).toBe('100');
      expect(result.costBasis).toBe('10000');
      expect(result.lots).toHaveLength(2);
      expect(result.lots[0].quantity).toBe('50');
      expect(result.lots[0].purchasePrice).toBe('90');
    });
  });

  describe('priceSnapshotToStorage', () => {
    it('should convert price snapshot to storage format', () => {
      const snapshot: PriceSnapshot = {
        assetId: 'asset-789' as AssetId,
        price: new Decimal('150.50'),
        change: new Decimal('2.50'),
        changePercent: 1.69,
        timestamp: new Date('2026-01-26T12:00:00Z'),
        source: 'yahoo',
        marketState: 'REGULAR',
        volume: 1000000,
        bid: 150.45,
        ask: 150.55,
      };

      const result = priceSnapshotToStorage(snapshot);

      expect(result.assetId).toBe('asset-789');
      expect(result.price).toBe('150.5');
      expect(result.change).toBe('2.5');
      expect(result.changePercent).toBe(1.69);
      expect(result.marketState).toBe('REGULAR');
      expect(result.volume).toBe(1000000);
      expect(result.bid).toBe('150.45');
      expect(result.ask).toBe('150.55');
    });
  });

  describe('priceHistoryToStorage', () => {
    it('should convert price history to storage format', () => {
      const history: PriceHistory = {
        id: 'price-hist-123',
        assetId: 'asset-789' as AssetId,
        date: new Date('2026-01-26'),
        open: new Decimal('148.00'),
        high: new Decimal('152.00'),
        low: new Decimal('147.50'),
        close: new Decimal('150.50'),
        adjustedClose: new Decimal('150.50'),
        volume: 5000000,
        source: 'yahoo',
      };

      const result = priceHistoryToStorage(history);

      expect(result.id).toBe('price-hist-123');
      expect(result.assetId).toBe('asset-789');
      expect(result.open).toBe('148');
      expect(result.high).toBe('152');
      expect(result.low).toBe('147.5');
      expect(result.close).toBe('150.5');
      expect(result.adjustedClose).toBe('150.5');
      expect(result.volume).toBe(5000000);
    });
  });

  describe('dividendRecordToStorage', () => {
    it('should convert dividend record to storage format', () => {
      const record: DividendRecord = {
        id: 'div-123',
        assetId: 'asset-789' as AssetId,
        portfolioId: 'portfolio-456' as PortfolioId,
        amount: new Decimal('100'),
        perShare: new Decimal('1.00'),
        paymentDate: new Date('2026-01-26'),
        recordDate: new Date('2026-01-20'),
        exDividendDate: new Date('2026-01-15'),
        type: 'cash',
        reinvested: false,
        shares: 100,
        price: 150.5,
      };

      const result = dividendRecordToStorage(record);

      expect(result.id).toBe('div-123');
      expect(result.amount).toBe('100');
      expect(result.perShare).toBe('1');
      expect(result.type).toBe('cash');
      expect(result.reinvested).toBe(false);
      expect(result.shares).toBe('100');
      expect(result.price).toBe('150.5');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values correctly', () => {
      const input: CreateTransactionInput = {
        id: 'txn-123',
        portfolioId: 'portfolio-456',
        assetId: 'asset-789',
        type: 'buy',
        date: new Date(),
        quantity: new Decimal('0'),
        price: new Decimal('0'),
        totalAmount: new Decimal('0'),
        fees: new Decimal('0'),
        currency: 'USD',
      };

      const result = toTransactionStorage(input);

      expect(result.quantity).toBe('0');
      expect(result.price).toBe('0');
      expect(result.fees).toBe('0');
    });

    it('should handle very large numbers correctly', () => {
      const input: CreateTransactionInput = {
        id: 'txn-123',
        portfolioId: 'portfolio-456',
        assetId: 'asset-789',
        type: 'buy',
        date: new Date(),
        quantity: new Decimal('999999999999.123456'),
        price: new Decimal('999999999999.654321'),
        totalAmount: new Decimal('999999999999999998'),
        fees: new Decimal('999999.99'),
        currency: 'USD',
      };

      const result = toTransactionStorage(input);

      expect(result.quantity).toBe('999999999999.123456');
      expect(result.price).toBe('999999999999.654321');
    });

    it('should handle very small decimal values correctly', () => {
      const input: CreateTransactionInput = {
        id: 'txn-123',
        portfolioId: 'portfolio-456',
        assetId: 'asset-789',
        type: 'buy',
        date: new Date(),
        quantity: new Decimal('0.00000001'),
        price: new Decimal('0.00000001'),
        totalAmount: new Decimal('0.0000000001'),
        fees: new Decimal('0.00000001'),
        currency: 'USD',
      };

      const result = toTransactionStorage(input);

      expect(result.quantity).toBe('0.00000001');
      expect(result.price).toBe('0.00000001');
    });
  });
});
