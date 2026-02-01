import { portfolioQueries } from '@/lib/db';
import type { Portfolio } from '@/types';

export interface PortfolioValidationResult {
  portfolioId: string;
  wasCreated: boolean;
  portfolio: Portfolio;
}

/**
 * Ensures a valid portfolio exists for import operations.
 * Auto-creates default portfolio if none exist.
 *
 * @param portfolioId - Portfolio ID to validate (null or 'default' triggers auto-creation)
 * @returns Validation result with portfolio ID and creation status
 * @throws Error if portfolio creation fails
 */
export async function ensureValidPortfolio(
  portfolioId: string | null
): Promise<PortfolioValidationResult> {
  // Step 1: Check if provided portfolio ID is valid
  // Treat empty string same as null (defensive handling)
  if (
    portfolioId &&
    portfolioId !== 'default' &&
    (typeof portfolioId !== 'string' || portfolioId.trim() !== '')
  ) {
    const portfolio = await portfolioQueries.getById(portfolioId);
    if (portfolio) {
      return { portfolioId, wasCreated: false, portfolio };
    }
  }

  // Step 2: Check if any portfolios exist
  const portfolios = await portfolioQueries.getAll();
  if (portfolios.length > 0) {
    // Use first available portfolio
    return {
      portfolioId: portfolios[0].id,
      wasCreated: false,
      portfolio: portfolios[0],
    };
  }

  // Step 3: Create default portfolio
  const newPortfolio = await createDefaultPortfolio();
  return {
    portfolioId: newPortfolio.id,
    wasCreated: true,
    portfolio: newPortfolio,
  };
}

async function createDefaultPortfolio(): Promise<Portfolio> {
  const now = new Date();
  const portfolioId = await portfolioQueries.create({
    name: 'My Portfolio',
    type: 'taxable',
    currency: 'USD',
    createdAt: now,
    updatedAt: now,
    settings: {
      rebalanceThreshold: 5,
      taxStrategy: 'fifo',
      autoRebalance: false,
      dividendReinvestment: true,
    },
  });

  const portfolio = await portfolioQueries.getById(portfolioId);
  if (!portfolio) {
    throw new Error('Failed to create default portfolio');
  }

  return portfolio;
}
