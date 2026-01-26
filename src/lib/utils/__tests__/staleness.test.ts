import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateStaleness,
  getDataAge,
  formatDataAge,
  shouldRefresh,
  getStaleThreshold,
} from '../staleness';
import { REFRESH_INTERVALS } from '@/types/market';

describe('Staleness Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateStaleness', () => {
    it('should return "fresh" when data is newer than interval', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      // Data updated 30 seconds ago, standard interval is 60 seconds
      const lastUpdate = new Date(now.getTime() - 30 * 1000);
      expect(calculateStaleness(lastUpdate, 'standard')).toBe('fresh');
    });

    it('should return "aging" when data is between 1x and 2x interval', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      // Data updated 90 seconds ago, standard interval is 60 seconds
      // 90s > 60s, but 90s < 120s (2x)
      const lastUpdate = new Date(now.getTime() - 90 * 1000);
      expect(calculateStaleness(lastUpdate, 'standard')).toBe('aging');
    });

    it('should return "stale" when data is older than 2x interval', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      // Data updated 3 minutes ago, standard interval is 60 seconds
      // 180s > 120s (2x)
      const lastUpdate = new Date(now.getTime() - 180 * 1000);
      expect(calculateStaleness(lastUpdate, 'standard')).toBe('stale');
    });

    it('should always return "fresh" for manual refresh mode', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      // Even if data is 1 day old, manual mode treats it as fresh
      const lastUpdate = new Date('2026-01-24T12:00:00Z');
      expect(calculateStaleness(lastUpdate, 'manual')).toBe('fresh');
    });

    it('should handle realtime interval (15 seconds)', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      // Data 10 seconds old - should be fresh (< 15s)
      const freshUpdate = new Date(now.getTime() - 10 * 1000);
      expect(calculateStaleness(freshUpdate, 'realtime')).toBe('fresh');

      // Data 20 seconds old - should be aging (between 15s and 30s)
      const agingUpdate = new Date(now.getTime() - 20 * 1000);
      expect(calculateStaleness(agingUpdate, 'realtime')).toBe('aging');

      // Data 45 seconds old - should be stale (> 30s)
      const staleUpdate = new Date(now.getTime() - 45 * 1000);
      expect(calculateStaleness(staleUpdate, 'realtime')).toBe('stale');
    });

    it('should handle frequent interval (30 seconds)', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      // Data 15 seconds old - should be fresh (< 30s)
      const freshUpdate = new Date(now.getTime() - 15 * 1000);
      expect(calculateStaleness(freshUpdate, 'frequent')).toBe('fresh');

      // Data 45 seconds old - should be aging (between 30s and 60s)
      const agingUpdate = new Date(now.getTime() - 45 * 1000);
      expect(calculateStaleness(agingUpdate, 'frequent')).toBe('aging');

      // Data 90 seconds old - should be stale (> 60s)
      const staleUpdate = new Date(now.getTime() - 90 * 1000);
      expect(calculateStaleness(staleUpdate, 'frequent')).toBe('stale');
    });
  });

  describe('getDataAge', () => {
    it('should return age in milliseconds', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      const lastUpdate = new Date('2026-01-25T11:55:00Z'); // 5 minutes ago
      expect(getDataAge(lastUpdate)).toBe(5 * 60 * 1000);
    });

    it('should return 0 for current time', () => {
      const now = new Date();
      vi.setSystemTime(now);

      expect(getDataAge(now)).toBe(0);
    });
  });

  describe('formatDataAge', () => {
    it('should return "Just now" for data less than 1 minute old', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      const lastUpdate = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
      expect(formatDataAge(lastUpdate)).toBe('Just now');
    });

    it('should return "1 minute ago" for data 1 minute old', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      const lastUpdate = new Date(now.getTime() - 60 * 1000);
      expect(formatDataAge(lastUpdate)).toBe('1 minute ago');
    });

    it('should return "X minutes ago" for data less than 1 hour old', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      const lastUpdate = new Date(now.getTime() - 15 * 60 * 1000); // 15 minutes ago
      expect(formatDataAge(lastUpdate)).toBe('15 minutes ago');
    });

    it('should return "1 hour ago" for data 1 hour old', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      const lastUpdate = new Date(now.getTime() - 60 * 60 * 1000);
      expect(formatDataAge(lastUpdate)).toBe('1 hour ago');
    });

    it('should return "X hours ago" for data less than 1 day old', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      const lastUpdate = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5 hours ago
      expect(formatDataAge(lastUpdate)).toBe('5 hours ago');
    });

    it('should return "Yesterday" for data 1 day old', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      const lastUpdate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      expect(formatDataAge(lastUpdate)).toBe('Yesterday');
    });

    it('should return "X days ago" for data more than 1 day old', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      const lastUpdate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      expect(formatDataAge(lastUpdate)).toBe('3 days ago');
    });
  });

  describe('shouldRefresh', () => {
    it('should return true when age exceeds interval', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      const lastUpdate = new Date(now.getTime() - 6 * 60 * 1000); // 6 minutes ago
      expect(shouldRefresh(lastUpdate, 'standard')).toBe(true); // standard is 5 min
    });

    it('should return false when age is less than interval', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      const lastUpdate = new Date(now.getTime() - 30 * 1000); // 30 seconds ago (< 60s standard)
      expect(shouldRefresh(lastUpdate, 'standard')).toBe(false);
    });

    it('should return false for manual mode regardless of age', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      const lastUpdate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      expect(shouldRefresh(lastUpdate, 'manual')).toBe(false);
    });

    it('should return true exactly at interval boundary', () => {
      const now = new Date('2026-01-25T12:00:00Z');
      vi.setSystemTime(now);

      const lastUpdate = new Date(now.getTime() - REFRESH_INTERVALS.standard);
      expect(shouldRefresh(lastUpdate, 'standard')).toBe(true);
    });
  });

  describe('getStaleThreshold', () => {
    it('should return 2x the refresh interval', () => {
      expect(getStaleThreshold('realtime')).toBe(30_000); // 2 * 15s = 30s
      expect(getStaleThreshold('frequent')).toBe(60_000); // 2 * 30s = 60s
      expect(getStaleThreshold('standard')).toBe(120_000); // 2 * 60s = 120s
    });

    it('should return Infinity for manual mode', () => {
      expect(getStaleThreshold('manual')).toBe(Infinity);
    });
  });
});
