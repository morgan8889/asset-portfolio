/**
 * Services Layer
 *
 * Pure business logic functions separated from data access and state management.
 * Services are stateless and operate on input data.
 */

// Metrics calculations
export {
  calculateTotalValue,
  calculateTotalCost,
  calculateTotalGain,
  calculateGainPercent,
  calculateAllocationByType,
  calculateHoldingAllocation,
  calculateDayChange,
  calculateBasicPerformance,
  calculatePortfolioMetrics,
  calculateRebalancingNeeds,
  calculateWeightedAverageCost,
  calculatePositionWeight,
  calculatePositionGainLoss,
  calculateDividendYield,
  type HoldingWithAsset,
} from './metrics-service';

// Holdings and tax lot calculations
export {
  calculateHoldingFromTransactions,
  calculateSaleAllocations,
  calculateUnrealizedGainsByLot,
  findTaxLossHarvestingOpportunities,
  updateHoldingMarketValue,
  mergeHoldings,
  type HoldingCalculationResult,
  type SaleAllocation,
} from './holdings-service';

// Portfolio-level operations
export {
  calculatePortfolioSummary,
  generatePortfolioMetrics,
  generateRebalancingPlan,
  calculateDiversificationScore,
  calculateRiskMetrics,
  calculateProjectedIncome,
  compareToBenchmark,
  type PortfolioSummary,
} from './portfolio-service';
