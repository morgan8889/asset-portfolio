/**
 * Types for Financial Analysis & Recommendations
 */

import { Decimal } from 'decimal.js';

import { AssetType } from './portfolio';

// Re-export from asset.ts for convenience
export type { Region, ValuationMethod } from './asset';

// =============================================================================
// Analysis Profile Types
// =============================================================================

export interface AnalysisProfile {
  id: string;
  name: string;
  description: string;
  weights: {
    diversification: number;
    performance: number;
    volatility: number;
  };
}

export const ANALYSIS_PROFILES: AnalysisProfile[] = [
  {
    id: 'growth',
    name: 'Growth',
    description: 'Prioritizes performance over stability',
    weights: { diversification: 0.2, performance: 0.5, volatility: 0.3 },
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: 'Equal weight across all factors',
    weights: { diversification: 0.33, performance: 0.34, volatility: 0.33 },
  },
  {
    id: 'safety',
    name: 'Safety',
    description: 'Prioritizes diversification and low volatility',
    weights: { diversification: 0.4, performance: 0.2, volatility: 0.4 },
  },
];

// =============================================================================
// Health Metric Types
// =============================================================================

export interface HealthMetric {
  id: 'diversification' | 'performance' | 'volatility';
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  status: 'good' | 'warning' | 'critical';
  details: string;
}

export interface PortfolioHealth {
  overallScore: number;
  metrics: HealthMetric[];
  profile: AnalysisProfile;
  calculatedAt: Date;
}

// =============================================================================
// Recommendation Types
// =============================================================================

export type RecommendationType =
  | 'rebalance'
  | 'diversify'
  | 'cash_drag'
  | 'concentration'
  | 'high_risk'
  | 'region_concentration'
  | 'sector_concentration';

export type RecommendationSeverity = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  severity: RecommendationSeverity;
  actionLabel: string;
  actionUrl?: string;
  relatedAssetIds?: string[];
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Target Model & Allocation Types
// =============================================================================

export interface TargetModel {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  allocations: Record<AssetType, number>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AllocationState {
  assetType: AssetType;
  currentValue: Decimal;
  currentPercent: number;
  targetPercent: number;
  differencePercent: number;
}

// =============================================================================
// Rebalancing Types
// =============================================================================

export type RebalanceActionType = 'buy' | 'sell' | 'hold';

export interface RebalanceAction {
  assetType: AssetType;
  assetTypeName: string;
  currentValue: Decimal;
  currentPercent: number;
  targetPercent: number;
  differencePercent: number;
  action: RebalanceActionType;
  amount: Decimal;
}

export interface RebalancingPlan {
  targetModel: TargetModel;
  portfolioValue: Decimal;
  actions: RebalanceAction[];
  totalBuyAmount: Decimal;
  totalSellAmount: Decimal;
  calculatedAt: Date;
}

// =============================================================================
// Analysis State Types
// =============================================================================

export interface AnalysisSettings {
  activeProfileId: string;
  activeTargetModelId: string | null;
  showFormulaDetails: boolean;
}

export interface AnalysisState {
  health: PortfolioHealth | null;
  recommendations: Recommendation[];
  rebalancingPlan: RebalancingPlan | null;
  targetModels: TargetModel[];
  activeProfile: AnalysisProfile;
  activeTargetModelId: string | null;
  isCalculating: boolean;
  error: string | null;

  calculateHealth: (portfolioId: string) => Promise<void>;
  generateRecommendations: (portfolioId: string) => Promise<void>;
  calculateRebalancing: (
    portfolioId: string,
    targetModelId: string
  ) => Promise<void>;
  setActiveProfile: (profileId: string) => void;
  setActiveTargetModel: (modelId: string | null) => void;
  loadTargetModels: () => Promise<void>;
  saveTargetModel: (model: Omit<TargetModel, 'id'>) => Promise<string>;
  deleteTargetModel: (modelId: string) => Promise<void>;
  refreshAnalysis: (portfolioId: string) => Promise<void>;
  clearError: () => void;
}

// =============================================================================
// Helper Types
// =============================================================================

export interface HealthScoreInput {
  holdings: Array<{
    assetId: string;
    value: Decimal;
    assetType: AssetType;
    region?: string;
    sector?: string;
  }>;
  totalValue: Decimal;
  performanceData?: {
    returnPercent: number;
    volatility: number;
    sharpeRatio: number;
  };
}

export interface RecommendationThresholds {
  cashDragPercent: number;
  concentrationPercent: number;
  regionConcentrationPercent: number;
  sectorConcentrationPercent: number;
}

export const DEFAULT_RECOMMENDATION_THRESHOLDS: RecommendationThresholds = {
  cashDragPercent: 15,
  concentrationPercent: 40,
  regionConcentrationPercent: 80,
  sectorConcentrationPercent: 50,
};
