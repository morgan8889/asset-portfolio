/**
 * Portfolio Health Scoring Service
 *
 * Calculates portfolio health score based on diversification, performance, and volatility.
 */

import Decimal from 'decimal.js';

import {
  AnalysisProfile,
  HealthMetric,
  PortfolioHealth,
  HealthScoreInput,
} from '@/types/analysis';
import { AssetType } from '@/types/portfolio';

/**
 * Performance scoring constants
 * These define the expected range for portfolio returns
 */
const PERFORMANCE_SCORING = {
  /** Minimum expected annual return (worst case) */
  MIN_RETURN: -20,
  /** Maximum expected annual return (best case) */
  MAX_RETURN: 30,
  /** Total range for scoring calculation */
  RANGE: 50, // (MAX_RETURN - MIN_RETURN)
} as const;

/**
 * Volatility scoring constants
 * These define the expected range for portfolio volatility
 */
const VOLATILITY_SCORING = {
  /** Minimum volatility (0%) */
  MIN_VOLATILITY: 0,
  /** Maximum volatility threshold (40%) */
  MAX_VOLATILITY: 0.4,
} as const;

/**
 * Calculate portfolio health score
 *
 * @param input - Health score input containing holdings and performance data
 * @param profile - Analysis profile defining weights for different metrics
 * @returns Portfolio health with overall score and individual metrics
 */
export function calculateHealthScore(
  input: HealthScoreInput,
  profile: AnalysisProfile
): PortfolioHealth {
  const diversificationMetric = calculateDiversification(input);
  const performanceMetric = calculatePerformance(input);
  const volatilityMetric = calculateVolatility(input);

  // Apply profile weights
  diversificationMetric.weight = profile.weights.diversification;
  performanceMetric.weight = profile.weights.performance;
  volatilityMetric.weight = profile.weights.volatility;

  // Calculate weighted overall score
  const overallScore =
    diversificationMetric.score * diversificationMetric.weight +
    performanceMetric.score * performanceMetric.weight +
    volatilityMetric.score * volatilityMetric.weight;

  return {
    overallScore: Math.round(overallScore),
    metrics: [diversificationMetric, performanceMetric, volatilityMetric],
    profile,
    calculatedAt: new Date(),
  };
}

/**
 * Calculate diversification score (0-100)
 */
function calculateDiversification(input: HealthScoreInput): HealthMetric {
  if (input.holdings.length === 0) {
    return {
      id: 'diversification',
      name: 'Diversification',
      score: 0,
      maxScore: 100,
      weight: 0,
      status: 'critical',
      details: 'No holdings in portfolio',
    };
  }

  // Calculate concentration using Herfindahl-Hirschman Index (HHI)
  const totalValue = input.totalValue.toNumber();
  if (totalValue === 0) {
    return {
      id: 'diversification',
      name: 'Diversification',
      score: 0,
      maxScore: 100,
      weight: 0,
      status: 'critical',
      details: 'Portfolio has zero value',
    };
  }

  // Asset type concentration
  const typeConcentration = calculateConcentrationByType(input);

  // Region concentration
  const regionConcentration = calculateConcentrationByRegion(input);

  // Sector concentration
  const sectorConcentration = calculateConcentrationBySector(input);

  // Average the three concentration metrics
  const avgConcentration =
    (typeConcentration + regionConcentration + sectorConcentration) / 3;

  // Convert HHI to score (lower concentration = higher score)
  // HHI ranges from 0 (perfect diversification) to 10000 (single asset)
  // Score: 100 when HHI=0, 0 when HHI=10000
  const rawScore = Math.max(0, 100 - avgConcentration / 100);
  const score = Math.round(rawScore);

  let status: 'good' | 'warning' | 'critical';
  let details: string;

  if (score >= 70) {
    status = 'good';
    details =
      'Your portfolio is well-diversified across asset types, regions, and sectors.';
  } else if (score >= 40) {
    status = 'warning';
    details =
      'Your portfolio has moderate concentration. Consider diversifying further.';
  } else {
    status = 'critical';
    details =
      'Your portfolio is highly concentrated. This increases risk significantly.';
  }

  return {
    id: 'diversification',
    name: 'Diversification',
    score,
    maxScore: 100,
    weight: 0,
    status,
    details,
  };
}

/**
 * Calculate performance score (0-100)
 */
function calculatePerformance(input: HealthScoreInput): HealthMetric {
  const perfData = input.performanceData;

  if (!perfData) {
    return {
      id: 'performance',
      name: 'Performance',
      score: 50,
      maxScore: 100,
      weight: 0,
      status: 'warning',
      details: 'Performance data not available',
    };
  }

  // Score based on return percentage
  // Map expected return range (-20% to +30%) to 0-100 score
  const returnPercent = perfData.returnPercent;
  const rawScore =
    ((returnPercent - PERFORMANCE_SCORING.MIN_RETURN) /
      PERFORMANCE_SCORING.RANGE) *
    100;
  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  let status: 'good' | 'warning' | 'critical';
  let details: string;

  if (score >= 70) {
    status = 'good';
    details = `Strong performance with ${returnPercent.toFixed(1)}% return.`;
  } else if (score >= 40) {
    status = 'warning';
    details = `Moderate performance with ${returnPercent.toFixed(1)}% return.`;
  } else {
    status = 'critical';
    details = `Underperforming with ${returnPercent.toFixed(1)}% return.`;
  }

  return {
    id: 'performance',
    name: 'Performance',
    score,
    maxScore: 100,
    weight: 0,
    status,
    details,
  };
}

/**
 * Calculate volatility score (0-100)
 * Lower volatility = higher score
 */
function calculateVolatility(input: HealthScoreInput): HealthMetric {
  const perfData = input.performanceData;

  if (!perfData) {
    return {
      id: 'volatility',
      name: 'Volatility',
      score: 50,
      maxScore: 100,
      weight: 0,
      status: 'warning',
      details: 'Volatility data not available',
    };
  }

  // Score based on volatility
  // Map volatility range (0-40%) to score (100-0, inverse relationship)
  const volatility = perfData.volatility;
  const rawScore = Math.max(
    0,
    100 - (volatility / VOLATILITY_SCORING.MAX_VOLATILITY) * 100
  );
  const score = Math.round(rawScore);

  let status: 'good' | 'warning' | 'critical';
  let details: string;

  if (score >= 70) {
    status = 'good';
    details = `Low volatility (${(volatility * 100).toFixed(1)}%) indicates stable returns.`;
  } else if (score >= 40) {
    status = 'warning';
    details = `Moderate volatility (${(volatility * 100).toFixed(1)}%) with some fluctuation.`;
  } else {
    status = 'critical';
    details = `High volatility (${(volatility * 100).toFixed(1)}%) indicates significant risk.`;
  }

  return {
    id: 'volatility',
    name: 'Volatility',
    score,
    maxScore: 100,
    weight: 0,
    status,
    details,
  };
}

/**
 * Calculate concentration by asset type using HHI
 */
function calculateConcentrationByType(input: HealthScoreInput): number {
  const typeValues: Partial<Record<AssetType, Decimal>> = {};

  for (const holding of input.holdings) {
    const type = holding.assetType;
    typeValues[type] = (typeValues[type] || new Decimal(0)).plus(holding.value);
  }

  return calculateHHI(
    Object.values(typeValues).filter((v): v is Decimal => v !== undefined),
    input.totalValue
  );
}

/**
 * Calculate concentration by region using HHI
 */
function calculateConcentrationByRegion(input: HealthScoreInput): number {
  const regionValues: Record<string, Decimal> = {};

  for (const holding of input.holdings) {
    const region = holding.region || 'US';
    regionValues[region] = (regionValues[region] || new Decimal(0)).plus(
      holding.value
    );
  }

  return calculateHHI(Object.values(regionValues), input.totalValue);
}

/**
 * Calculate concentration by sector using HHI
 */
function calculateConcentrationBySector(input: HealthScoreInput): number {
  const sectorValues: Record<string, Decimal> = {};

  for (const holding of input.holdings) {
    const sector = holding.sector || 'Unknown';
    sectorValues[sector] = (sectorValues[sector] || new Decimal(0)).plus(
      holding.value
    );
  }

  return calculateHHI(Object.values(sectorValues), input.totalValue);
}

/**
 * Calculate Herfindahl-Hirschman Index (HHI)
 *
 * The HHI is an industry-standard measure of concentration. Lower values indicate
 * better diversification.
 *
 * @param values - Array of Decimal values representing holdings in each category
 * @param totalValue - Total portfolio value
 * @returns HHI score between 0 (perfectly diversified) and 10000 (single asset)
 */
function calculateHHI(values: Decimal[], totalValue: Decimal): number {
  if (totalValue.isZero()) return 10000;

  let hhi = 0;
  for (const value of values) {
    const marketShare = value.div(totalValue).toNumber();
    hhi += marketShare * marketShare * 10000;
  }

  return hhi;
}
