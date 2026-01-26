import Decimal from 'decimal.js';

/**
 * Box-Muller transform for generating normally distributed random numbers
 * Returns a random number from standard normal distribution (mean=0, stdDev=1)
 */
export function randomNormal(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Geometric Brownian Motion (GBM) - Standard model for stock price evolution
 *
 * Formula: S(t+dt) = S(t) * exp((μ - 0.5σ²)dt + σ√dt * Z)
 * Where:
 * - S(t) = price at time t
 * - μ = expected annual return (drift)
 * - σ = annual volatility
 * - dt = time step (1/252 for daily prices)
 * - Z = random normal variable
 *
 * @param startPrice - Initial price
 * @param days - Number of trading days to generate
 * @param annualReturn - Expected annual return (e.g., 0.15 for 15%)
 * @param volatility - Annual volatility (e.g., 0.20 for 20%)
 * @returns Array of daily prices
 */
export function generateDailyPrices(
  startPrice: number,
  days: number,
  annualReturn: number,
  volatility: number
): number[] {
  const dt = 1 / 252; // Time step (252 trading days per year)
  const prices: number[] = [startPrice];

  for (let i = 1; i < days; i++) {
    const drift = (annualReturn - 0.5 * volatility ** 2) * dt;
    const shock = volatility * Math.sqrt(dt) * randomNormal();
    const price = prices[i - 1] * Math.exp(drift + shock);

    // Ensure price doesn't go below a minimum threshold (e.g., $0.01)
    prices.push(Math.max(0.01, price));
  }

  return prices;
}

/**
 * Generate prices with multiple market scenarios (bull, bear, recovery, etc.)
 *
 * @param startPrice - Initial price
 * @param scenarios - Array of market scenarios with periods and characteristics
 * @returns Array of daily prices covering all scenarios
 */
export interface MarketScenario {
  name: string;
  days: number;
  annualReturn: number;
  volatility: number;
}

export function generatePricesWithScenarios(
  startPrice: number,
  scenarios: MarketScenario[]
): number[] {
  let allPrices: number[] = [startPrice];
  let currentPrice = startPrice;

  for (const scenario of scenarios) {
    const scenarioPrices = generateDailyPrices(
      currentPrice,
      scenario.days,
      scenario.annualReturn,
      scenario.volatility
    );

    // Skip first price (it's the same as currentPrice)
    allPrices.push(...scenarioPrices.slice(1));
    currentPrice = scenarioPrices[scenarioPrices.length - 1];
  }

  return allPrices;
}

/**
 * Apply corporate actions to price history
 *
 * @param prices - Original price history
 * @param actions - Array of corporate actions (splits, dividends)
 * @returns Adjusted price history
 */
export interface CorporateAction {
  date: Date;
  type: 'split' | 'dividend';
  value: number; // Split ratio or dividend amount
}

export function applyCorporateActions(
  prices: number[],
  startDate: Date,
  actions: CorporateAction[]
): number[] {
  const adjustedPrices = [...prices];
  const msPerDay = 1000 * 60 * 60 * 24;

  for (const action of actions) {
    const dayIndex = Math.floor(
      (action.date.getTime() - startDate.getTime()) / msPerDay
    );
    if (dayIndex < 0 || dayIndex >= prices.length) continue;

    if (action.type === 'split') {
      for (let i = dayIndex; i < adjustedPrices.length; i++) {
        adjustedPrices[i] /= action.value;
      }
    } else {
      adjustedPrices[dayIndex] -= action.value;
    }
  }

  return adjustedPrices;
}

/**
 * Add mean reversion to price series
 * Prices tend to revert to a long-term average
 *
 * @param prices - Original prices
 * @param meanReversionSpeed - Speed of reversion (0-1, higher = faster)
 * @param longTermMean - Long-term average price
 * @returns Adjusted prices with mean reversion
 */
export function addMeanReversion(
  prices: number[],
  meanReversionSpeed: number,
  longTermMean: number
): number[] {
  const adjusted: number[] = [prices[0]];

  for (let i = 1; i < prices.length; i++) {
    const currentPrice = prices[i];
    const deviation = currentPrice - longTermMean;
    const reversion = deviation * meanReversionSpeed;
    adjusted.push(currentPrice - reversion);
  }

  return adjusted;
}

/**
 * Calculate price statistics for validation
 */
export function calculatePriceStatistics(prices: number[]) {
  const n = prices.length;
  const sum = prices.reduce((acc, p) => acc + p, 0);
  const mean = sum / n;
  const variance = prices.reduce((acc, p) => acc + (p - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const totalReturn = ((prices[n - 1] - prices[0]) / prices[0]) * 100;

  return {
    mean,
    stdDev,
    min: Math.min(...prices),
    max: Math.max(...prices),
    totalReturn,
    annualizedReturn: (totalReturn / n) * 252,
    annualizedVolatility: (stdDev / mean) * Math.sqrt(252) * 100,
  };
}

/**
 * Generate prices for an ETF/Index that tracks multiple assets
 * Uses weighted average of constituent prices
 */
export function generateIndexPrices(
  constituentPrices: Map<string, number[]>,
  weights: Map<string, number>
): number[] {
  const firstPriceArray = constituentPrices.values().next().value;
  if (!firstPriceArray) return [];

  return Array.from({ length: firstPriceArray.length }, (_, day) => {
    let dayPrice = 0;
    for (const [symbol, prices] of constituentPrices) {
      dayPrice += prices[day] * (weights.get(symbol) ?? 0);
    }
    return dayPrice;
  });
}
