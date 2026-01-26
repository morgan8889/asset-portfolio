import { describe, it, expect } from 'vitest';
import { Decimal } from 'decimal.js';
import {
  calculateHoldingFromTransactions,
  calculateSaleAllocations,
  calculateUnrealizedGainsByLot,
  findTaxLossHarvestingOpportunities,
  updateHoldingMarketValue,
  mergeHoldings,
} from '../holdings-service';
import { Transaction, Holding, TaxLot } from '@/types';
import {
  generateAssetId,
  generateHoldingId,
  generateTransactionId,
} from '@/types/storage';

describe('Holdings Service', () => {
  describe('calculateHoldingFromTransactions', () => {
    it('should calculate holding from buy transactions', () => {
      const transactions: Transaction[] = [
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'buy',
          date: new Date('2024-01-01'),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'buy',
          date: new Date('2024-02-01'),
          quantity: new Decimal(5),
          price: new Decimal(120),
          totalAmount: new Decimal(600),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ];

      const result = calculateHoldingFromTransactions(transactions);

      expect(result.quantity.toString()).toBe('15');
      expect(result.costBasis.toString()).toBe('1600');
      expect(result.averageCost.toNumber()).toBeCloseTo(106.67, 1);
      expect(result.lots.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle FIFO tax strategy for sales', () => {
      const transactions: Transaction[] = [
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'buy',
          date: new Date('2024-01-01'),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'buy',
          date: new Date('2024-02-01'),
          quantity: new Decimal(10),
          price: new Decimal(120),
          totalAmount: new Decimal(1200),
          fees: new Decimal(0),
          currency: 'USD',
        },
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'sell',
          date: new Date('2024-03-01'),
          quantity: new Decimal(8),
          price: new Decimal(110),
          totalAmount: new Decimal(880),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ];

      const result = calculateHoldingFromTransactions(transactions, 'fifo');

      expect(result.quantity.toString()).toBe('12');
      // First lot: 2 shares @ 100 = 200
      // Second lot: 10 shares @ 120 = 1200
      expect(result.costBasis.toString()).toBe('1400');
      expect(result.lots).toHaveLength(2);
      expect(result.lots[0].remainingQuantity.toString()).toBe('2');
      expect(result.lots[1].remainingQuantity.toString()).toBe('10');
    });

    it('should handle LIFO tax strategy for sales', () => {
      const transactions: Transaction[] = [
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'buy',
          date: new Date('2024-01-01'),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'buy',
          date: new Date('2024-02-01'),
          quantity: new Decimal(10),
          price: new Decimal(120),
          totalAmount: new Decimal(1200),
          fees: new Decimal(0),
          currency: 'USD',
        },
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'sell',
          date: new Date('2024-03-01'),
          quantity: new Decimal(8),
          price: new Decimal(110),
          totalAmount: new Decimal(880),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ];

      const result = calculateHoldingFromTransactions(transactions, 'lifo');

      expect(result.quantity.toString()).toBe('12');
      // First lot: 10 shares @ 100 = 1000
      // Second lot: 2 shares @ 120 = 240
      expect(result.costBasis.toString()).toBe('1240');
      expect(result.lots).toHaveLength(2);
      expect(result.lots[0].remainingQuantity.toString()).toBe('10');
      expect(result.lots[1].remainingQuantity.toString()).toBe('2');
    });

    it('should handle HIFO tax strategy for sales', () => {
      const transactions: Transaction[] = [
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'buy',
          date: new Date('2024-01-01'),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'buy',
          date: new Date('2024-02-01'),
          quantity: new Decimal(10),
          price: new Decimal(120),
          totalAmount: new Decimal(1200),
          fees: new Decimal(0),
          currency: 'USD',
        },
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'sell',
          date: new Date('2024-03-01'),
          quantity: new Decimal(8),
          price: new Decimal(110),
          totalAmount: new Decimal(880),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ];

      const result = calculateHoldingFromTransactions(transactions, 'hifo');

      expect(result.quantity.toString()).toBe('12');
      // Sells from highest cost first (120), then lower cost (100)
      // First lot: 10 shares @ 100 = 1000
      // Second lot: 2 shares @ 120 = 240
      expect(result.costBasis.toString()).toBe('1240');
      expect(result.lots).toHaveLength(2);
    });

    it('should handle stock splits', () => {
      const transactions: Transaction[] = [
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'buy',
          date: new Date('2024-01-01'),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'split',
          date: new Date('2024-02-01'),
          quantity: new Decimal(2), // 2-for-1 split
          price: new Decimal(0),
          totalAmount: new Decimal(0),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ];

      const result = calculateHoldingFromTransactions(transactions);

      expect(result.quantity.toString()).toBe('20');
      expect(result.costBasis.toString()).toBe('1000');
      expect(result.averageCost.toString()).toBe('50');
      expect(result.lots).toHaveLength(1);
      expect(result.lots[0].purchasePrice.toString()).toBe('50');
    });

    it('should handle transfers in and out', () => {
      const transactions: Transaction[] = [
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'transfer_in',
          date: new Date('2024-01-01'),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'transfer_out',
          date: new Date('2024-02-01'),
          quantity: new Decimal(3),
          price: new Decimal(0),
          totalAmount: new Decimal(0),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ];

      const result = calculateHoldingFromTransactions(transactions);

      expect(result.quantity.toString()).toBe('7');
      expect(result.costBasis.toString()).toBe('700');
      expect(result.lots).toHaveLength(1);
    });

    it('should handle reinvestment transactions', () => {
      const transactions: Transaction[] = [
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'buy',
          date: new Date('2024-01-01'),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'reinvestment',
          date: new Date('2024-02-01'),
          quantity: new Decimal(2),
          price: new Decimal(110),
          totalAmount: new Decimal(220),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ];

      const result = calculateHoldingFromTransactions(transactions);

      expect(result.quantity.toString()).toBe('12');
      expect(result.costBasis.toString()).toBe('1220');
      expect(result.lots).toHaveLength(2);
    });

    it('should return zero values for empty transactions', () => {
      const result = calculateHoldingFromTransactions([]);

      expect(result.quantity.toString()).toBe('0');
      expect(result.costBasis.toString()).toBe('0');
      expect(result.averageCost.toString()).toBe('0');
      expect(result.lots).toHaveLength(0);
    });

    it('should filter out fully sold lots', () => {
      const transactions: Transaction[] = [
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'buy',
          date: new Date('2024-01-01'),
          quantity: new Decimal(10),
          price: new Decimal(100),
          totalAmount: new Decimal(1000),
          fees: new Decimal(0),
          currency: 'USD',
        },
        {
          id: generateTransactionId(),
          portfolioId: 'p1',
          assetId: 'a1',
          type: 'sell',
          date: new Date('2024-02-01'),
          quantity: new Decimal(10),
          price: new Decimal(110),
          totalAmount: new Decimal(1100),
          fees: new Decimal(0),
          currency: 'USD',
        },
      ];

      const result = calculateHoldingFromTransactions(transactions);

      expect(result.quantity.toString()).toBe('0');
      expect(result.costBasis.toString()).toBe('0');
      expect(result.lots).toHaveLength(0);
    });
  });

  describe('calculateSaleAllocations', () => {
    it('should calculate sale allocations with realized gains', () => {
      const lots: TaxLot[] = [
        {
          id: 'lot1',
          quantity: new Decimal(10),
          purchasePrice: new Decimal(100),
          purchaseDate: new Date('2023-01-01'),
          soldQuantity: new Decimal(0),
          remainingQuantity: new Decimal(10),
          notes: 'Lot 1',
        },
      ];

      const allocations = calculateSaleAllocations(
        lots,
        new Decimal(5),
        new Decimal(120),
        new Date('2024-06-01'),
        'fifo'
      );

      expect(allocations).toHaveLength(1);
      expect(allocations[0].quantity.toString()).toBe('5');
      expect(allocations[0].costBasis.toString()).toBe('500');
      expect(allocations[0].realizedGain.toString()).toBe('100');
      expect(allocations[0].holdingPeriod).toBe('long');
    });

    it('should determine short-term holding period correctly', () => {
      const lots: TaxLot[] = [
        {
          id: 'lot1',
          quantity: new Decimal(10),
          purchasePrice: new Decimal(100),
          purchaseDate: new Date('2024-01-01'),
          soldQuantity: new Decimal(0),
          remainingQuantity: new Decimal(10),
          notes: 'Lot 1',
        },
      ];

      const allocations = calculateSaleAllocations(
        lots,
        new Decimal(5),
        new Decimal(120),
        new Date('2024-06-01'),
        'fifo'
      );

      expect(allocations[0].holdingPeriod).toBe('short');
    });

    it('should allocate sales across multiple lots', () => {
      const lots: TaxLot[] = [
        {
          id: 'lot1',
          quantity: new Decimal(5),
          purchasePrice: new Decimal(100),
          purchaseDate: new Date('2023-01-01'),
          soldQuantity: new Decimal(0),
          remainingQuantity: new Decimal(5),
          notes: 'Lot 1',
        },
        {
          id: 'lot2',
          quantity: new Decimal(10),
          purchasePrice: new Decimal(110),
          purchaseDate: new Date('2023-02-01'),
          soldQuantity: new Decimal(0),
          remainingQuantity: new Decimal(10),
          notes: 'Lot 2',
        },
      ];

      const allocations = calculateSaleAllocations(
        lots,
        new Decimal(8),
        new Decimal(120),
        new Date('2024-06-01'),
        'fifo'
      );

      expect(allocations).toHaveLength(2);
      expect(allocations[0].quantity.toString()).toBe('5');
      expect(allocations[1].quantity.toString()).toBe('3');
    });

    it('should respect HIFO strategy for tax efficiency', () => {
      const lots: TaxLot[] = [
        {
          id: 'lot1',
          quantity: new Decimal(10),
          purchasePrice: new Decimal(100),
          purchaseDate: new Date('2023-01-01'),
          soldQuantity: new Decimal(0),
          remainingQuantity: new Decimal(10),
          notes: 'Lot 1',
        },
        {
          id: 'lot2',
          quantity: new Decimal(10),
          purchasePrice: new Decimal(120),
          purchaseDate: new Date('2023-02-01'),
          soldQuantity: new Decimal(0),
          remainingQuantity: new Decimal(10),
          notes: 'Lot 2',
        },
      ];

      const allocations = calculateSaleAllocations(
        lots,
        new Decimal(5),
        new Decimal(110),
        new Date('2024-06-01'),
        'hifo'
      );

      // Should sell from lot2 first (higher cost basis)
      expect(allocations).toHaveLength(1);
      expect(allocations[0].lotId).toBe('lot2');
      expect(allocations[0].realizedGain.toString()).toBe('-50');
    });
  });

  describe('calculateUnrealizedGainsByLot', () => {
    it('should calculate unrealized gains for each lot', () => {
      const lots: TaxLot[] = [
        {
          id: 'lot1',
          quantity: new Decimal(10),
          purchasePrice: new Decimal(100),
          purchaseDate: new Date('2023-01-01'),
          soldQuantity: new Decimal(0),
          remainingQuantity: new Decimal(10),
          notes: 'Lot 1',
        },
        {
          id: 'lot2',
          quantity: new Decimal(5),
          purchasePrice: new Decimal(120),
          purchaseDate: new Date('2024-01-01'),
          soldQuantity: new Decimal(0),
          remainingQuantity: new Decimal(5),
          notes: 'Lot 2',
        },
      ];

      const result = calculateUnrealizedGainsByLot(
        lots,
        new Decimal(110),
        new Date('2024-06-01')
      );

      expect(result).toHaveLength(2);
      expect(result[0].unrealizedGain.toString()).toBe('100');
      expect(result[0].unrealizedGainPercent).toBe(10);
      expect(result[0].holdingPeriod).toBe('long');
      expect(result[1].unrealizedGain.toString()).toBe('-50');
      expect(result[1].unrealizedGainPercent).toBe(-8.333333333333334);
      expect(result[1].holdingPeriod).toBe('short');
    });

    it('should filter out lots with zero remaining quantity', () => {
      const lots: TaxLot[] = [
        {
          id: 'lot1',
          quantity: new Decimal(10),
          purchasePrice: new Decimal(100),
          purchaseDate: new Date('2023-01-01'),
          soldQuantity: new Decimal(10),
          remainingQuantity: new Decimal(0),
          notes: 'Lot 1',
        },
        {
          id: 'lot2',
          quantity: new Decimal(5),
          purchasePrice: new Decimal(120),
          purchaseDate: new Date('2024-01-01'),
          soldQuantity: new Decimal(0),
          remainingQuantity: new Decimal(5),
          notes: 'Lot 2',
        },
      ];

      const result = calculateUnrealizedGainsByLot(lots, new Decimal(110));

      expect(result).toHaveLength(1);
      expect(result[0].lotId).toBe('lot2');
    });
  });

  describe('findTaxLossHarvestingOpportunities', () => {
    it('should identify holdings with losses exceeding minimum', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1500),
          averageCost: new Decimal(150),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(-300),
          unrealizedGainPercent: -20,
          lots: [
            {
              id: 'lot1',
              quantity: new Decimal(10),
              purchasePrice: new Decimal(150),
              purchaseDate: new Date('2024-01-01'),
              soldQuantity: new Decimal(0),
              remainingQuantity: new Decimal(10),
              notes: 'Lot 1',
            },
          ],
          lastUpdated: new Date(),
        },
      ];

      const currentPrices = new Map([['a1', new Decimal(120)]]);

      const opportunities = findTaxLossHarvestingOpportunities(
        holdings,
        currentPrices,
        new Decimal(100)
      );

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].assetId).toBe('a1');
      expect(opportunities[0].unrealizedLoss.toString()).toBe('-300');
    });

    it('should separate short-term and long-term losses', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(15),
          costBasis: new Decimal(2250),
          averageCost: new Decimal(150),
          currentValue: new Decimal(1800),
          unrealizedGain: new Decimal(-450),
          unrealizedGainPercent: -20,
          lots: [
            {
              id: 'lot1',
              quantity: new Decimal(10),
              purchasePrice: new Decimal(150),
              purchaseDate: new Date('2023-01-01'),
              soldQuantity: new Decimal(0),
              remainingQuantity: new Decimal(10),
              notes: 'Long-term lot',
            },
            {
              id: 'lot2',
              quantity: new Decimal(5),
              purchasePrice: new Decimal(150),
              purchaseDate: new Date('2024-06-01'),
              soldQuantity: new Decimal(0),
              remainingQuantity: new Decimal(5),
              notes: 'Short-term lot',
            },
          ],
          lastUpdated: new Date(),
        },
      ];

      const currentPrices = new Map([['a1', new Decimal(120)]]);

      const opportunities = findTaxLossHarvestingOpportunities(
        holdings,
        currentPrices,
        new Decimal(100)
      );

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0].longTermLoss.toNumber()).toBeLessThan(0);
      // Short-term loss may be 0 if all lots are long-term
      expect(opportunities[0].shortTermLoss.toNumber()).toBeLessThanOrEqual(0);
    });

    it('should exclude holdings below minimum loss threshold', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(950),
          unrealizedGain: new Decimal(-50),
          unrealizedGainPercent: -5,
          lots: [
            {
              id: 'lot1',
              quantity: new Decimal(10),
              purchasePrice: new Decimal(100),
              purchaseDate: new Date('2024-01-01'),
              soldQuantity: new Decimal(0),
              remainingQuantity: new Decimal(10),
              notes: 'Lot 1',
            },
          ],
          lastUpdated: new Date(),
        },
      ];

      const currentPrices = new Map([['a1', new Decimal(95)]]);

      const opportunities = findTaxLossHarvestingOpportunities(
        holdings,
        currentPrices,
        new Decimal(100)
      );

      expect(opportunities).toHaveLength(0);
    });

    it('should sort opportunities by total loss (most loss first)', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1500),
          averageCost: new Decimal(150),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(-300),
          unrealizedGainPercent: -20,
          lots: [
            {
              id: 'lot1',
              quantity: new Decimal(10),
              purchasePrice: new Decimal(150),
              purchaseDate: new Date('2024-01-01'),
              soldQuantity: new Decimal(0),
              remainingQuantity: new Decimal(10),
              notes: 'Lot 1',
            },
          ],
          lastUpdated: new Date(),
        },
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(10),
          costBasis: new Decimal(2000),
          averageCost: new Decimal(200),
          currentValue: new Decimal(1500),
          unrealizedGain: new Decimal(-500),
          unrealizedGainPercent: -25,
          lots: [
            {
              id: 'lot2',
              quantity: new Decimal(10),
              purchasePrice: new Decimal(200),
              purchaseDate: new Date('2024-01-01'),
              soldQuantity: new Decimal(0),
              remainingQuantity: new Decimal(10),
              notes: 'Lot 2',
            },
          ],
          lastUpdated: new Date(),
        },
      ];

      const currentPrices = new Map([
        ['a1', new Decimal(120)],
        ['a2', new Decimal(150)],
      ]);

      const opportunities = findTaxLossHarvestingOpportunities(
        holdings,
        currentPrices,
        new Decimal(100)
      );

      expect(opportunities).toHaveLength(2);
      expect(opportunities[0].assetId).toBe('a2');
      expect(opportunities[1].assetId).toBe('a1');
    });
  });

  describe('updateHoldingMarketValue', () => {
    it('should update holding with current market value', () => {
      const holding: Holding = {
        id: generateHoldingId(),
        portfolioId: 'p1',
        assetId: 'a1',
        quantity: new Decimal(10),
        costBasis: new Decimal(1000),
        averageCost: new Decimal(100),
        currentValue: new Decimal(1000),
        unrealizedGain: new Decimal(0),
        unrealizedGainPercent: 0,
        lots: [],
        lastUpdated: new Date(),
      };

      const result = updateHoldingMarketValue(holding, new Decimal(120));

      expect(result.currentValue.toString()).toBe('1200');
      expect(result.unrealizedGain.toString()).toBe('200');
      expect(result.unrealizedGainPercent).toBe(20);
    });

    it('should handle zero cost basis', () => {
      const holding: Holding = {
        id: generateHoldingId(),
        portfolioId: 'p1',
        assetId: 'a1',
        quantity: new Decimal(10),
        costBasis: new Decimal(0),
        averageCost: new Decimal(0),
        currentValue: new Decimal(0),
        unrealizedGain: new Decimal(0),
        unrealizedGainPercent: 0,
        lots: [],
        lastUpdated: new Date(),
      };

      const result = updateHoldingMarketValue(holding, new Decimal(100));

      expect(result.currentValue.toString()).toBe('1000');
      expect(result.unrealizedGain.toString()).toBe('1000');
      expect(result.unrealizedGainPercent).toBe(0);
    });
  });

  describe('mergeHoldings', () => {
    it('should merge multiple holdings into one', () => {
      const holdings: Holding[] = [
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a1',
          quantity: new Decimal(10),
          costBasis: new Decimal(1000),
          averageCost: new Decimal(100),
          currentValue: new Decimal(1200),
          unrealizedGain: new Decimal(200),
          unrealizedGainPercent: 20,
          lots: [
            {
              id: 'lot1',
              quantity: new Decimal(10),
              purchasePrice: new Decimal(100),
              purchaseDate: new Date('2024-01-01'),
              soldQuantity: new Decimal(0),
              remainingQuantity: new Decimal(10),
              notes: 'Lot 1',
            },
          ],
          lastUpdated: new Date(),
        },
        {
          id: generateHoldingId(),
          portfolioId: 'p1',
          assetId: 'a2',
          quantity: new Decimal(5),
          costBasis: new Decimal(600),
          averageCost: new Decimal(120),
          currentValue: new Decimal(650),
          unrealizedGain: new Decimal(50),
          unrealizedGainPercent: 8.33,
          lots: [
            {
              id: 'lot2',
              quantity: new Decimal(5),
              purchasePrice: new Decimal(120),
              purchaseDate: new Date('2024-02-01'),
              soldQuantity: new Decimal(0),
              remainingQuantity: new Decimal(5),
              notes: 'Lot 2',
            },
          ],
          lastUpdated: new Date(),
        },
      ];

      const merged = mergeHoldings(holdings, generateAssetId(), 'p1');

      expect(merged.quantity.toString()).toBe('15');
      expect(merged.costBasis.toString()).toBe('1600');
      expect(merged.averageCost.toNumber()).toBeCloseTo(106.67, 1);
      expect(merged.lots.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle zero quantity', () => {
      const holdings: Holding[] = [];
      const merged = mergeHoldings(holdings, generateAssetId(), 'p1');

      expect(merged.quantity.toString()).toBe('0');
      expect(merged.costBasis.toString()).toBe('0');
      expect(merged.averageCost.toString()).toBe('0');
      expect(merged.lots).toHaveLength(0);
    });
  });
});
