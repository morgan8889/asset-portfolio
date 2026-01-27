import { Decimal } from 'decimal.js';

export type PortfolioType = 'taxable' | 'ira' | '401k' | 'roth';
export type TaxStrategy = 'fifo' | 'lifo' | 'hifo' | 'specific';

export interface AllocationTarget {
  type: AssetType;
  targetPercent: number;
  minPercent?: number;
  maxPercent?: number;
}

export interface PortfolioSettings {
  rebalanceThreshold: number; // Percentage drift trigger
  taxStrategy: TaxStrategy;
  benchmarkIndex?: string; // "SPY", "QQQ", etc.
  targetAllocations?: AllocationTarget[];
  autoRebalance?: boolean;
  dividendReinvestment?: boolean;
}

export interface Portfolio {
  id: string; // UUID
  name: string; // "Retirement", "Trading", etc.
  type: PortfolioType;
  currency: string; // Base currency (USD default)
  createdAt: Date;
  updatedAt: Date;
  settings: PortfolioSettings;
  metadata?: Record<string, any>;
}

export interface PortfolioMetrics {
  totalValue: Decimal;
  totalCost: Decimal;
  totalGain: Decimal;
  totalGainPercent: number;
  dayChange: Decimal;
  dayChangePercent: number;
  allocation: AllocationBreakdown[];
  performance: PerformanceMetrics;
}

export interface AllocationBreakdown {
  type: AssetType;
  value: Decimal;
  percent: number;
  target?: number;
  drift?: number;
}

export interface PerformanceMetrics {
  roi: number; // Return on Investment
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  beta?: number;
  alpha?: number;
}

export interface PortfolioHistory {
  dates: Date[];
  values: Decimal[];
  costs: Decimal[];
  gains: Decimal[];
}

export interface RebalancingPlan {
  portfolioId: string;
  suggestions: RebalancingSuggestion[];
  totalTrades: number;
  estimatedCost: Decimal;
  taxImplications: TaxImplication[];
}

export interface RebalancingSuggestion {
  holdingId: string;
  symbol: string;
  currentPercent: number;
  targetPercent: number;
  action: 'buy' | 'sell';
  quantity: Decimal;
  estimatedValue: Decimal;
}

export interface TaxImplication {
  holdingId: string;
  symbol: string;
  realizedGain: Decimal;
  taxableAmount: Decimal;
  holdingPeriod: 'short' | 'long';
}

export type AssetType =
  | 'stock'
  | 'etf'
  | 'crypto'
  | 'bond'
  | 'real_estate'
  | 'commodity'
  | 'cash'
  | 'index'
  | 'other';
