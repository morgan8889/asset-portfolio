/**
 * Contracts for Net Worth & Planning Features
 */

import { Decimal } from 'decimal.js';

// =============================================================================
// Planning Data Types
// =============================================================================

export interface Liability {
  id: string;
  name: string;
  balance: Decimal;
  interestRate: number;
  payment: Decimal;
}

export interface FireConfig {
  annualExpenses: Decimal;
  withdrawalRate: number;
  currentSavings: Decimal;
  expectedReturn: number;
  inflationRate: number;
}

export interface ProjectionPoint {
  date: string; // ISO Date
  age: number;
  netWorth: number; // Projected
  target: number; // FIRE Number
  isMilestone?: boolean; // e.g. "Hit FIRE"
}

// =============================================================================
// Service Interfaces
// =============================================================================

export interface PlanningService {
  /**
   * Calculate FIRE projection based on current config and net worth.
   */
  calculateProjection: (
    config: FireConfig,
    currentNetWorth: Decimal
  ) => Promise<ProjectionPoint[]>;

  /**
   * Get total liabilities balance.
   */
  getTotalLiabilities: () => Promise<Decimal>;

  /**
   * Save FIRE configuration.
   */
  saveFireConfig: (config: FireConfig) => Promise<void>;
}

// =============================================================================
// Component Props
// =============================================================================

export interface NetWorthChartProps {
  data: Array<{
    date: string;
    assets: number;
    liabilities: number;
    netWorth: number;
  }>;
  isLoading: boolean;
}

export interface FireProjectionChartProps {
  projection: ProjectionPoint[];
  currentNetWorth: number;
}