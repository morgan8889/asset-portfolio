/**
 * Contracts for Financial Analysis Features
 */

import { Decimal } from 'decimal.js';
import { AssetType } from '@/types/portfolio';

// =============================================================================
// Analysis Types
// =============================================================================

export interface AnalysisProfile {
  id: string;
  name: string;
  weights: {
    diversification: number;
    performance: number;
    volatility: number;
  };
}

export interface PortfolioHealth {
  overallScore: number;
  metrics: HealthMetric[];
  profile: AnalysisProfile;
}

export interface HealthMetric {
  id: 'diversification' | 'performance' | 'volatility';
  name: string;
  score: number;
  maxScore: number;
  status: 'good' | 'warning' | 'critical';
  details: string; // "Your portfolio has low volatility..."
}

// =============================================================================
// Recommendation Types
// =============================================================================

export interface Recommendation {
  id: string;
  type: 'rebalance' | 'diversify' | 'cash_drag' | 'high_risk';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  actionLabel: string; // e.g. "View Allocation"
  actionUrl?: string;  // Internal link
}

// =============================================================================
// Allocation & Rebalancing Types
// =============================================================================

export interface AllocationTarget {
  modelId: string;
  name: string;
  allocations: Record<string, number>; // AssetType -> Percentage (0-100)
}

export interface RebalanceAction {
  assetType: string;
  currentPercent: number;
  targetPercent: number;
  differencePercent: number;
  action: 'buy' | 'sell' | 'hold';
  amount: Decimal; // Value to buy/sell to reach target
}

// =============================================================================
// Store / Service Interfaces
// =============================================================================

export interface AnalysisState {
  health: PortfolioHealth | null;
  recommendations: Recommendation[];
  rebalanceActions: RebalanceAction[];
  activeTargetModelId: string | null;
  
  // Actions
  calculateAnalysis: () => Promise<void>;
  setTargetModel: (modelId: string) => Promise<void>;
  updateAssetRegion: (assetId: string, region: string) => Promise<void>;
  updateManualPrice: (assetId: string, price: Decimal) => Promise<void>;
}
