/**
 * Contracts for Allocation Planning Features
 */

import { Decimal } from 'decimal.js';
import { AssetType } from '@/types';

// =============================================================================
// Rebalancing Types
// =============================================================================

export interface RebalancingItem {
  category: AssetType | 'Unclassified';
  currentValue: Decimal;
  currentPercent: number;
  targetPercent: number;
  driftPercent: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount: Decimal;
}

export interface TargetModel {
  id: string;
  name: string;
  allocations: Partial<Record<AssetType, number>>; // e.g. { stock: 60, bond: 40 }
  isDefault?: boolean;
}

// =============================================================================
// Service Interfaces
// =============================================================================

export interface AllocationService {
  /**
   * Calculate rebalancing plan based on current holdings and target model.
   * Excludes portfolios listed in exclusionIds.
   */
  calculateRebalancingPlan: (
    targetModel: TargetModel,
    exclusionIds: string[]
  ) => Promise<RebalancingItem[]>;

  /**
   * Save a target model to user settings.
   */
  saveTargetModel: (model: TargetModel) => Promise<void>;

  /**
   * Get all saved target models.
   */
  getTargetModels: () => Promise<TargetModel[]>;
}

// =============================================================================
// Component Props
// =============================================================================

export interface AllocationChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  type: 'donut' | 'bar';
}

export interface TargetEditorProps {
  model: TargetModel;
  onSave: (model: TargetModel) => void;
}
