/**
 * Market Hours Service: Live Market Data
 *
 * Feature: 005-live-market-data
 *
 * Service for determining current market state (PRE/REGULAR/POST/CLOSED)
 * based on exchange trading hours and timezones.
 */

import { Market, MarketState, MarketStatus, MARKETS } from '@/types/market';
import { isUKSymbol } from '@/lib/utils/market-utils';

// Cache for market state to reduce recalculation
let marketStateCache: Map<string, { status: MarketStatus; timestamp: number }> = new Map();
const CACHE_DURATION = 60_000; // 1 minute

/**
 * Parses a time string (HH:MM) to minutes since midnight.
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Gets the current time in a specific timezone as minutes since midnight.
 * Also returns the current day of week (0 = Sunday, 6 = Saturday).
 */
function getCurrentTimeInTimezone(timezone: string): { minutes: number; dayOfWeek: number } {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  };

  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0');

  // Get day of week in the market's timezone
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: timezone,
  });
  const dayStr = dayFormatter.format(now);
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    minutes: hour * 60 + minute,
    dayOfWeek: dayMap[dayStr] ?? 0,
  };
}

/**
 * Determines the market state for a given market based on current time.
 */
function calculateMarketState(market: Market): MarketState {
  const { minutes, dayOfWeek } = getCurrentTimeInTimezone(market.timezone);

  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'CLOSED';
  }

  const { tradingHours } = market;

  // Check pre-market
  if (tradingHours.preMarket) {
    const preStart = parseTimeToMinutes(tradingHours.preMarket.start);
    const preEnd = parseTimeToMinutes(tradingHours.preMarket.end);
    if (minutes >= preStart && minutes < preEnd) {
      return 'PRE';
    }
  }

  // Check regular market hours
  const regularStart = parseTimeToMinutes(tradingHours.regular.start);
  const regularEnd = parseTimeToMinutes(tradingHours.regular.end);
  if (minutes >= regularStart && minutes < regularEnd) {
    return 'REGULAR';
  }

  // Check post-market
  if (tradingHours.postMarket) {
    const postStart = parseTimeToMinutes(tradingHours.postMarket.start);
    const postEnd = parseTimeToMinutes(tradingHours.postMarket.end);
    if (minutes >= postStart && minutes < postEnd) {
      return 'POST';
    }
  }

  return 'CLOSED';
}

/**
 * Calculates when the next market state change will occur.
 */
function calculateNextStateChange(market: Market, currentState: MarketState): Date | undefined {
  const { minutes, dayOfWeek } = getCurrentTimeInTimezone(market.timezone);
  const { tradingHours } = market;

  const now = new Date();
  let minutesToNextChange: number | undefined;

  switch (currentState) {
    case 'PRE':
      // Next change is when regular hours start
      minutesToNextChange = parseTimeToMinutes(tradingHours.regular.start) - minutes;
      break;

    case 'REGULAR':
      // Next change is when post-market starts or market closes
      if (tradingHours.postMarket) {
        minutesToNextChange = parseTimeToMinutes(tradingHours.postMarket.start) - minutes;
      } else {
        minutesToNextChange = parseTimeToMinutes(tradingHours.regular.end) - minutes;
      }
      break;

    case 'POST':
      // Next change is market close
      minutesToNextChange = parseTimeToMinutes(tradingHours.postMarket!.end) - minutes;
      break;

    case 'CLOSED':
      // Calculate time until next pre-market or regular hours
      if (dayOfWeek === 0) {
        // Sunday - next open is Monday
        const hoursUntilMonday = 24 - Math.floor(minutes / 60);
        const preMarketStart = tradingHours.preMarket
          ? parseTimeToMinutes(tradingHours.preMarket.start)
          : parseTimeToMinutes(tradingHours.regular.start);
        minutesToNextChange = hoursUntilMonday * 60 + preMarketStart;
      } else if (dayOfWeek === 6) {
        // Saturday - next open is Monday
        const hoursUntilMonday = 24 - Math.floor(minutes / 60) + 24;
        const preMarketStart = tradingHours.preMarket
          ? parseTimeToMinutes(tradingHours.preMarket.start)
          : parseTimeToMinutes(tradingHours.regular.start);
        minutesToNextChange = hoursUntilMonday * 60 + preMarketStart;
      } else {
        // Weekday but closed - next is tomorrow's pre-market or regular hours
        const preMarketStart = tradingHours.preMarket
          ? parseTimeToMinutes(tradingHours.preMarket.start)
          : parseTimeToMinutes(tradingHours.regular.start);

        if (minutes < preMarketStart) {
          // Before today's open
          minutesToNextChange = preMarketStart - minutes;
        } else {
          // After today's close - next is tomorrow
          minutesToNextChange = 24 * 60 - minutes + preMarketStart;
        }
      }
      break;
  }

  if (minutesToNextChange !== undefined) {
    return new Date(now.getTime() + minutesToNextChange * 60 * 1000);
  }

  return undefined;
}

/**
 * Gets the current market status for a specific market.
 * Uses caching to reduce computation.
 *
 * @param marketId - The market identifier (e.g., 'NYSE', 'LSE')
 * @returns MarketStatus with current state and next state change time
 */
export function getMarketStatus(marketId: string): MarketStatus {
  const now = Date.now();
  const cached = marketStateCache.get(marketId);

  if (cached && now - cached.timestamp < CACHE_DURATION) {
    return cached.status;
  }

  const market = MARKETS[marketId];
  if (!market) {
    return {
      market: marketId,
      state: 'CLOSED',
      isHoliday: false,
    };
  }

  const state = calculateMarketState(market);
  const nextStateChange = calculateNextStateChange(market, state);

  const status: MarketStatus = {
    market: marketId,
    state,
    nextStateChange,
    isHoliday: false, // Basic implementation - no holiday calendar
  };

  marketStateCache.set(marketId, { status, timestamp: now });
  return status;
}

/**
 * Gets the market state for a specific symbol.
 * Determines the correct market based on symbol format.
 *
 * @param symbol - The stock symbol (e.g., 'AAPL', 'VOD.L')
 * @returns The current MarketState
 */
export function getMarketState(symbol: string): MarketState {
  const marketId = isUKSymbol(symbol) ? 'LSE' : 'NYSE';
  const status = getMarketStatus(marketId);
  return status.state;
}

/**
 * Gets the full market status for a specific symbol.
 *
 * @param symbol - The stock symbol
 * @returns The full MarketStatus
 */
export function getMarketStatusForSymbol(symbol: string): MarketStatus {
  const marketId = isUKSymbol(symbol) ? 'LSE' : 'NYSE';
  return getMarketStatus(marketId);
}

/**
 * Checks if a market is currently open (PRE, REGULAR, or POST).
 *
 * @param symbol - The stock symbol
 * @returns True if the market is in any trading state
 */
export function isMarketOpen(symbol: string): boolean {
  const state = getMarketState(symbol);
  return state !== 'CLOSED';
}

/**
 * Checks if a market is in regular trading hours.
 *
 * @param symbol - The stock symbol
 * @returns True if the market is in regular trading hours
 */
export function isRegularHours(symbol: string): boolean {
  const state = getMarketState(symbol);
  return state === 'REGULAR';
}

/**
 * Clears the market state cache.
 * Useful for testing or when forcing a refresh.
 */
export function clearMarketStateCache(): void {
  marketStateCache.clear();
}
