// Re-export all database related functionality
export { db, PortfolioDatabase } from './schema';
export {
  portfolioQueries,
  assetQueries,
  holdingQueries,
  transactionQueries,
  priceQueries,
  settingsQueries,
} from './queries';
export {
  MigrationManager,
  initializeDatabase,
  seedInitialData,
  migrations,
} from './migrations';
export { HoldingsCalculator, setupHoldingsSync } from './holdings-calculator';
export { initializePortfolioApp, recalculateAllHoldings } from './initialization';
export type { MigrationState } from './migrations';