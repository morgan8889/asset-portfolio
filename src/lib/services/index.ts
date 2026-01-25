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

// Price lookup utilities
export {
  getPriceAtDate,
  findClosestPrice,
  createPriceCache,
  type PriceLookupResult,
  type PriceCache,
} from './price-lookup';

// Performance calculations
export {
  calculatePerformance,
  calculateAllPerformance,
  getTopPerformers,
  getBiggestLosers,
} from './performance-calculator';

// Historical value tracking
export {
  getHistoricalValues,
  getValueAtDate,
} from './historical-value';

// Market hours service
export {
  getMarketState,
  getMarketStatus,
  getMarketStatusForSymbol,
  isMarketOpen,
  isRegularHours,
  clearMarketStateCache,
} from './market-hours';

// Price service
export {
  fetchPrice,
  fetchPrices,
  getCachedPrice,
  getLivePrice,
  getLivePrices,
  clearPriceCache,
  getAllCachedPrices,
  persistPriceCache,
  loadCachedPrice,
  loadCachedPrices,
  transformToLivePriceData,
} from './price-service';

// Asset search service
export {
  searchAssets,
  createAssetWithExchange,
  detectUKSymbol,
  getExchangeDisplayName,
  getExchangeBadgeColor,
  type SearchResult,
} from './asset-search';
