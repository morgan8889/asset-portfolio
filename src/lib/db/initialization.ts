import { setupHoldingsSync, HoldingsCalculator } from './holdings-calculator';
import { portfolioQueries } from './queries';

/**
 * Initialize the database and set up automatic holdings synchronization
 */
export async function initializePortfolioApp() {
  try {
    // Set up automatic holdings sync when transactions change
    setupHoldingsSync();

    // Get all portfolios and ensure their holdings are calculated
    const portfolios = await portfolioQueries.getAll();

    for (const portfolio of portfolios) {
      await HoldingsCalculator.recalculatePortfolioHoldings(portfolio.id);
    }

    // Initialization complete
  } catch (error) {
    console.error('Failed to initialize portfolio app:', error);
    throw error;
  }
}

/**
 * Recalculate all holdings for all portfolios
 * Useful for maintenance or after data imports
 */
export async function recalculateAllHoldings() {
  try {
    const portfolios = await portfolioQueries.getAll();

    for (const portfolio of portfolios) {
      await HoldingsCalculator.recalculatePortfolioHoldings(portfolio.id);
    }

    // Recalculation complete
  } catch (error) {
    console.error('Failed to recalculate holdings:', error);
    throw error;
  }
}
