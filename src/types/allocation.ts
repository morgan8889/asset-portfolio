import { AssetType } from './portfolio';

/**
 * Allocation category types for portfolio analysis
 * - Asset Class: Stock, Bond, Cash, etc.
 * - Sector: Technology, Healthcare, etc.
 * - Region: US, UK, EU, etc.
 */
export type AllocationCategory = AssetType | string;

/**
 * Allocation dimension for grouping
 */
export type AllocationDimension = 'assetClass' | 'sector' | 'region';

/**
 * Target allocation model
 * Persisted in userSettings under key 'allocation_targets'
 */
export interface TargetModel {
  id: string;
  name: string;
  targets: Record<string, number>; // Category -> Percentage (0-100)
  lastUpdated: Date;
}

/**
 * Portfolio exclusions for rebalancing
 * Persisted in userSettings under key 'rebalancing_exclusions'
 */
export interface RebalancingExclusions {
  portfolioIds: string[]; // IDs of portfolios to exclude from rebalancing
}

/**
 * Rebalancing action type
 */
export type RebalancingAction = 'BUY' | 'SELL' | 'HOLD';

/**
 * Individual rebalancing item
 */
export interface RebalancingItem {
  category: string;
  currentValue: string; // Decimal.js value serialized as string
  currentPercent: number;
  targetPercent: number;
  driftPercent: number; // Current% - Target%
  action: RebalancingAction;
  amount: string; // Decimal.js value serialized as string (abs value)
}

/**
 * Complete rebalancing plan (in-memory)
 */
export interface RebalancingPlan {
  totalValue: string; // Decimal.js value serialized as string
  targetModelName: string;
  items: RebalancingItem[];
}

/**
 * Current allocation breakdown
 */
export interface AllocationBreakdown {
  category: string;
  value: string; // Decimal.js value serialized as string
  percentage: number;
  count: number; // Number of holdings in this category
}

/**
 * Allocation data for charts
 */
export interface AllocationData {
  dimension: AllocationDimension;
  breakdown: AllocationBreakdown[];
  totalValue: string; // Decimal.js value serialized as string
  hasUnclassified: boolean;
}
