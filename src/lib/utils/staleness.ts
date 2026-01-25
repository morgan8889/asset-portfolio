/**
 * Staleness Calculation: Live Market Data
 *
 * Feature: 005-live-market-data
 *
 * Utilities for calculating price data staleness based on user preferences.
 */

import { REFRESH_INTERVALS, RefreshInterval, StalenessLevel } from '@/types/market';

/**
 * Calculates the staleness level of price data based on its age
 * relative to the user's configured refresh interval.
 *
 * Staleness thresholds:
 * - fresh: age < interval (data is current)
 * - aging: interval <= age < 2×interval (data is getting old)
 * - stale: age >= 2×interval (data needs refresh)
 *
 * For manual refresh mode (interval = 0), data is always considered fresh
 * since the user has explicitly chosen not to auto-refresh.
 *
 * @param lastUpdate - The timestamp of the last price update
 * @param refreshInterval - The user's configured refresh interval
 * @returns The staleness level: 'fresh', 'aging', or 'stale'
 */
export function calculateStaleness(
  lastUpdate: Date,
  refreshInterval: RefreshInterval
): StalenessLevel {
  const intervalMs = REFRESH_INTERVALS[refreshInterval];

  // Manual mode: never consider data stale
  if (intervalMs === 0) {
    return 'fresh';
  }

  const age = Date.now() - lastUpdate.getTime();

  if (age < intervalMs) {
    return 'fresh';
  }

  if (age < intervalMs * 2) {
    return 'aging';
  }

  return 'stale';
}

/**
 * Calculates the age of price data in milliseconds.
 *
 * @param lastUpdate - The timestamp of the last price update
 * @returns Age in milliseconds
 */
export function getDataAge(lastUpdate: Date): number {
  return Date.now() - lastUpdate.getTime();
}

/**
 * Formats the age of price data as a human-readable string.
 *
 * Examples:
 * - "Just now" (< 1 minute)
 * - "2 minutes ago"
 * - "1 hour ago"
 * - "3 hours ago"
 * - "Yesterday"
 * - "2 days ago"
 *
 * @param lastUpdate - The timestamp of the last price update
 * @returns Human-readable age string
 */
export function formatDataAge(lastUpdate: Date): string {
  const age = getDataAge(lastUpdate);

  const seconds = Math.floor(age / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return 'Just now';
  }

  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }

  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  if (days === 1) {
    return 'Yesterday';
  }

  return `${days} days ago`;
}

/**
 * Checks if price data should be refreshed based on user preferences.
 *
 * @param lastUpdate - The timestamp of the last price update
 * @param refreshInterval - The user's configured refresh interval
 * @returns True if a refresh is due
 */
export function shouldRefresh(
  lastUpdate: Date,
  refreshInterval: RefreshInterval
): boolean {
  const intervalMs = REFRESH_INTERVALS[refreshInterval];

  // Manual mode: never auto-refresh
  if (intervalMs === 0) {
    return false;
  }

  const age = Date.now() - lastUpdate.getTime();
  return age >= intervalMs;
}

/**
 * Gets the staleness threshold in milliseconds for a refresh interval.
 * The stale threshold is 2× the refresh interval.
 *
 * @param refreshInterval - The user's configured refresh interval
 * @returns Stale threshold in milliseconds, or Infinity for manual mode
 */
export function getStaleThreshold(refreshInterval: RefreshInterval): number {
  const intervalMs = REFRESH_INTERVALS[refreshInterval];

  // Manual mode: effectively never stale
  if (intervalMs === 0) {
    return Infinity;
  }

  return intervalMs * 2;
}
