import { addDays, differenceInDays } from 'date-fns';
import { MarketScenario } from './price-algorithms';

/**
 * Market scenario period definition
 */
export interface ScenarioPeriod {
  name: string;
  startDate: Date;
  endDate: Date;
  annualReturn: number;
  volatility: number;
  description: string;
}

/**
 * Convert scenario period to days and format for price generation
 */
export function scenarioPeriodToMarketScenario(
  period: ScenarioPeriod
): MarketScenario {
  return {
    name: period.name,
    days: differenceInDays(period.endDate, period.startDate),
    annualReturn: period.annualReturn,
    volatility: period.volatility,
  };
}

/** Helper to create a scenario period with less boilerplate */
function createScenario(
  name: string,
  start: string,
  end: string,
  annualReturn: number,
  volatility: number,
  description: string
): ScenarioPeriod {
  return {
    name,
    startDate: new Date(start),
    endDate: new Date(end),
    annualReturn,
    volatility,
    description,
  };
}

/**
 * Pre-defined realistic market scenarios based on historical patterns
 */
export const BULL_MARKET_2019 = createScenario(
  'Bull Market 2019',
  '2019-01-01',
  '2019-12-31',
  0.28,
  0.12,
  'Strong bull market with low volatility'
);

export const COVID_CRASH_2020 = createScenario(
  'COVID Crash 2020',
  '2020-01-01',
  '2020-03-31',
  -0.5,
  0.6,
  'Severe market crash with extreme volatility'
);

export const RECOVERY_2020 = createScenario(
  'V-Shaped Recovery 2020',
  '2020-04-01',
  '2020-09-30',
  0.45,
  0.3,
  'Rapid V-shaped recovery with high volatility'
);

export const TECH_BOOM_2020 = createScenario(
  'Tech Boom Late 2020',
  '2020-10-01',
  '2020-12-31',
  0.35,
  0.2,
  'Tech-driven rally with moderate volatility'
);

export const STEADY_GROWTH_2021 = createScenario(
  'Steady Growth 2021',
  '2021-01-01',
  '2021-12-31',
  0.22,
  0.15,
  'Consistent growth with moderate volatility'
);

export const RATE_HIKE_2022 = createScenario(
  'Rate Hike Decline 2022',
  '2022-01-01',
  '2022-12-31',
  -0.18,
  0.25,
  'Fed rate hikes causing market decline'
);

export const BANKING_CRISIS_2023 = createScenario(
  'Banking Crisis 2023',
  '2023-01-01',
  '2023-03-31',
  -0.15,
  0.35,
  'Regional banking crisis concerns'
);

export const RECOVERY_2023 = createScenario(
  'Recovery 2023',
  '2023-04-01',
  '2023-12-31',
  0.2,
  0.18,
  'Market recovery with AI optimism'
);

export const SIDEWAYS_2024 = createScenario(
  'Sideways Market 2024',
  '2024-01-01',
  '2024-12-31',
  0.08,
  0.16,
  'Range-bound market with mixed signals'
);

export const RECENT_2025 = createScenario(
  'Recent Period 2025',
  '2025-01-01',
  '2025-12-31',
  0.12,
  0.18,
  'Current market conditions'
);

/** Full 5-year scenario sequence (2020-2025) */
export const FIVE_YEAR_REALISTIC: ScenarioPeriod[] = [
  COVID_CRASH_2020,
  RECOVERY_2020,
  TECH_BOOM_2020,
  STEADY_GROWTH_2021,
  RATE_HIKE_2022,
  BANKING_CRISIS_2023,
  RECOVERY_2023,
  SIDEWAYS_2024,
  RECENT_2025,
];

/** Full 3-year scenario sequence (2022-2025) */
export const THREE_YEAR_REALISTIC: ScenarioPeriod[] = [
  RATE_HIKE_2022,
  BANKING_CRISIS_2023,
  RECOVERY_2023,
  SIDEWAYS_2024,
  RECENT_2025,
];

/** 10-year scenario (2015-2025) - includes full market cycle */
export const TEN_YEAR_REALISTIC: ScenarioPeriod[] = [
  createScenario(
    'Mid Bull 2015-2016',
    '2015-01-01',
    '2016-12-31',
    0.1,
    0.14,
    'Mid-cycle bull market'
  ),
  createScenario(
    'Trump Rally 2017',
    '2017-01-01',
    '2017-12-31',
    0.19,
    0.09,
    'Tax cut optimism rally'
  ),
  createScenario(
    'Trade War Volatility 2018',
    '2018-01-01',
    '2018-12-31',
    -0.06,
    0.22,
    'Trade war uncertainty'
  ),
  BULL_MARKET_2019,
  COVID_CRASH_2020,
  RECOVERY_2020,
  TECH_BOOM_2020,
  STEADY_GROWTH_2021,
  RATE_HIKE_2022,
  BANKING_CRISIS_2023,
  RECOVERY_2023,
  SIDEWAYS_2024,
  RECENT_2025,
];

/**
 * Generate scenarios for a given time range
 * Adjusts dates to fit within the requested range
 */
export function generateScenariosForRange(
  startDate: Date,
  endDate: Date,
  yearsBack: number
): ScenarioPeriod[] {
  const scenarios =
    yearsBack >= 10
      ? TEN_YEAR_REALISTIC
      : yearsBack >= 5
        ? FIVE_YEAR_REALISTIC
        : THREE_YEAR_REALISTIC;

  const totalDays = differenceInDays(endDate, startDate);
  const scenarioTotalDays = scenarios.reduce(
    (sum, s) => sum + differenceInDays(s.endDate, s.startDate),
    0
  );
  const scaleFactor = totalDays / scenarioTotalDays;

  let currentDate = startDate;
  return scenarios.map((scenario) => {
    const originalDays = differenceInDays(scenario.endDate, scenario.startDate);
    const adjustedDays = Math.round(originalDays * scaleFactor);
    const scenarioEndDate = addDays(currentDate, adjustedDays);
    const adjusted = {
      ...scenario,
      startDate: currentDate,
      endDate: scenarioEndDate,
    };
    currentDate = scenarioEndDate;
    return adjusted;
  });
}

/**
 * Asset profile with volatility and return characteristics
 */
export interface AssetProfile {
  volatilityMultiplier: number;
  returnMultiplier: number;
}

/**
 * Asset-specific profiles combining volatility and return multipliers
 */
export const ASSET_PROFILES: Record<string, AssetProfile> = {
  // Large Cap Tech
  AAPL: { volatilityMultiplier: 0.9, returnMultiplier: 1.2 },
  MSFT: { volatilityMultiplier: 0.85, returnMultiplier: 1.15 },
  GOOGL: { volatilityMultiplier: 0.95, returnMultiplier: 1.0 },
  // High Growth Tech
  AMZN: { volatilityMultiplier: 1.15, returnMultiplier: 1.1 },
  TSLA: { volatilityMultiplier: 1.8, returnMultiplier: 1.8 },
  NVDA: { volatilityMultiplier: 1.4, returnMultiplier: 1.5 },
  // ETFs
  VTI: { volatilityMultiplier: 0.85, returnMultiplier: 1.0 },
  VXUS: { volatilityMultiplier: 1.0, returnMultiplier: 1.0 },
  BND: { volatilityMultiplier: 0.3, returnMultiplier: 0.3 },
  VNQ: { volatilityMultiplier: 1.1, returnMultiplier: 0.9 },
  // Crypto
  BTC: { volatilityMultiplier: 3.0, returnMultiplier: 2.5 },
  ETH: { volatilityMultiplier: 3.5, returnMultiplier: 2.8 },
  // Defensive Stocks
  KO: { volatilityMultiplier: 0.7, returnMultiplier: 0.8 },
  PG: { volatilityMultiplier: 0.65, returnMultiplier: 0.75 },
  JNJ: { volatilityMultiplier: 0.7, returnMultiplier: 0.85 },
  // Healthcare
  UNH: { volatilityMultiplier: 0.85, returnMultiplier: 1.1 },
  // Financials
  JPM: { volatilityMultiplier: 1.0, returnMultiplier: 0.95 },
  BAC: { volatilityMultiplier: 1.1, returnMultiplier: 1.0 },
  // Commodities
  GLD: { volatilityMultiplier: 0.8, returnMultiplier: 0.5 },
  // Real Estate Properties (low volatility, modest appreciation)
  PROPERTY_001: { volatilityMultiplier: 0.15, returnMultiplier: 0.4 },
  PROPERTY_002: { volatilityMultiplier: 0.15, returnMultiplier: 0.4 },
  // UK Stocks
  'VOD.L': { volatilityMultiplier: 1.1, returnMultiplier: 0.6 },
  'HSBA.L': { volatilityMultiplier: 1.0, returnMultiplier: 0.7 },
  // European Stocks
  SAP: { volatilityMultiplier: 0.95, returnMultiplier: 0.9 },
  ASML: { volatilityMultiplier: 1.2, returnMultiplier: 1.3 },
};

/** Get adjusted volatility for a specific asset */
export function getAssetVolatility(
  symbol: string,
  baseVolatility: number
): number {
  return baseVolatility * (ASSET_PROFILES[symbol]?.volatilityMultiplier ?? 1.0);
}

/** Get adjusted return for a specific asset */
export function getAssetReturn(symbol: string, baseReturn: number): number {
  return baseReturn * (ASSET_PROFILES[symbol]?.returnMultiplier ?? 1.0);
}
