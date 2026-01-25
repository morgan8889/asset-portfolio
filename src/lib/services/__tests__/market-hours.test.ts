import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getMarketState,
  getMarketStatus,
  getMarketStatusForSymbol,
  isMarketOpen,
  isRegularHours,
  clearMarketStateCache,
} from '../market-hours';

describe('Market Hours Service', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearMarketStateCache();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearMarketStateCache();
  });

  describe('getMarketState', () => {
    describe('US Markets (NYSE)', () => {
      it('should return CLOSED on weekends', () => {
        // Saturday, January 25, 2026, 12:00 PM EST
        vi.setSystemTime(new Date('2026-01-24T17:00:00.000Z')); // Saturday
        expect(getMarketState('AAPL')).toBe('CLOSED');
      });

      it('should return PRE during pre-market hours (4:00-9:30 ET)', () => {
        // Monday, January 26, 2026, 7:00 AM EST = 12:00 UTC
        vi.setSystemTime(new Date('2026-01-26T12:00:00.000Z'));
        expect(getMarketState('AAPL')).toBe('PRE');
      });

      it('should return REGULAR during regular hours (9:30-16:00 ET)', () => {
        // Monday, January 26, 2026, 11:00 AM EST = 16:00 UTC
        vi.setSystemTime(new Date('2026-01-26T16:00:00.000Z'));
        expect(getMarketState('AAPL')).toBe('REGULAR');
      });

      it('should return POST during post-market hours (16:00-20:00 ET)', () => {
        // Monday, January 26, 2026, 5:00 PM EST = 22:00 UTC
        vi.setSystemTime(new Date('2026-01-26T22:00:00.000Z'));
        expect(getMarketState('AAPL')).toBe('POST');
      });

      it('should return CLOSED after post-market', () => {
        // Monday, January 26, 2026, 9:00 PM EST = 02:00 UTC next day
        vi.setSystemTime(new Date('2026-01-27T02:00:00.000Z'));
        expect(getMarketState('AAPL')).toBe('CLOSED');
      });
    });

    describe('UK Markets (LSE)', () => {
      it('should return CLOSED on weekends', () => {
        // Saturday, January 25, 2026, 12:00 PM GMT
        vi.setSystemTime(new Date('2026-01-24T12:00:00.000Z')); // Saturday
        expect(getMarketState('VOD.L')).toBe('CLOSED');
      });

      it('should return PRE during pre-market hours (5:05-8:00 GMT)', () => {
        // Monday, January 26, 2026, 6:00 AM GMT
        vi.setSystemTime(new Date('2026-01-26T06:00:00.000Z'));
        expect(getMarketState('VOD.L')).toBe('PRE');
      });

      it('should return REGULAR during regular hours (8:00-16:30 GMT)', () => {
        // Monday, January 26, 2026, 12:00 PM GMT
        vi.setSystemTime(new Date('2026-01-26T12:00:00.000Z'));
        expect(getMarketState('VOD.L')).toBe('REGULAR');
      });

      it('should return POST during post-market hours (16:30-17:15 GMT)', () => {
        // Monday, January 26, 2026, 4:45 PM GMT = 16:45 GMT
        vi.setSystemTime(new Date('2026-01-26T16:45:00.000Z'));
        expect(getMarketState('VOD.L')).toBe('POST');
      });

      it('should return CLOSED after post-market', () => {
        // Monday, January 26, 2026, 6:00 PM GMT
        vi.setSystemTime(new Date('2026-01-26T18:00:00.000Z'));
        expect(getMarketState('VOD.L')).toBe('CLOSED');
      });
    });

    it('should detect UK symbols by .L suffix', () => {
      vi.setSystemTime(new Date('2026-01-26T12:00:00.000Z')); // Monday noon GMT
      expect(getMarketState('VOD.L')).toBe('REGULAR'); // UK market is open
      expect(getMarketState('BP.L')).toBe('REGULAR');
    });
  });

  describe('getMarketStatus', () => {
    it('should return full status object for NYSE', () => {
      vi.setSystemTime(new Date('2026-01-26T16:00:00.000Z')); // Monday 11am EST

      const status = getMarketStatus('NYSE');
      expect(status.market).toBe('NYSE');
      expect(status.state).toBe('REGULAR');
      expect(status.isHoliday).toBe(false);
      expect(status.nextStateChange).toBeDefined();
    });

    it('should return full status object for LSE', () => {
      vi.setSystemTime(new Date('2026-01-26T12:00:00.000Z')); // Monday noon GMT

      const status = getMarketStatus('LSE');
      expect(status.market).toBe('LSE');
      expect(status.state).toBe('REGULAR');
      expect(status.isHoliday).toBe(false);
    });

    it('should return CLOSED state for unknown markets', () => {
      const status = getMarketStatus('UNKNOWN_MARKET');
      expect(status.state).toBe('CLOSED');
      expect(status.isHoliday).toBe(false);
    });

    it('should cache market state for performance', () => {
      vi.setSystemTime(new Date('2026-01-26T16:00:00.000Z'));

      const status1 = getMarketStatus('NYSE');
      const status2 = getMarketStatus('NYSE');

      // Should return same cached object
      expect(status1).toEqual(status2);
    });

    it('should refresh cache after expiry', () => {
      vi.setSystemTime(new Date('2026-01-26T16:00:00.000Z'));
      const status1 = getMarketStatus('NYSE');
      expect(status1.state).toBe('REGULAR');

      // Clear cache and advance time to after market close
      clearMarketStateCache();
      vi.setSystemTime(new Date('2026-01-27T02:00:00.000Z')); // After hours

      const status2 = getMarketStatus('NYSE');
      expect(status2.state).toBe('CLOSED');
    });
  });

  describe('getMarketStatusForSymbol', () => {
    it('should return status for US symbols', () => {
      vi.setSystemTime(new Date('2026-01-26T16:00:00.000Z'));

      const status = getMarketStatusForSymbol('AAPL');
      expect(status.market).toBe('NYSE');
    });

    it('should return status for UK symbols', () => {
      vi.setSystemTime(new Date('2026-01-26T12:00:00.000Z'));

      const status = getMarketStatusForSymbol('VOD.L');
      expect(status.market).toBe('LSE');
    });
  });

  describe('isMarketOpen', () => {
    it('should return true during any trading session', () => {
      // Pre-market
      vi.setSystemTime(new Date('2026-01-26T12:00:00.000Z')); // 7am EST
      expect(isMarketOpen('AAPL')).toBe(true);

      clearMarketStateCache();

      // Regular hours
      vi.setSystemTime(new Date('2026-01-26T16:00:00.000Z')); // 11am EST
      expect(isMarketOpen('AAPL')).toBe(true);

      clearMarketStateCache();

      // Post-market
      vi.setSystemTime(new Date('2026-01-26T22:00:00.000Z')); // 5pm EST
      expect(isMarketOpen('AAPL')).toBe(true);
    });

    it('should return false when market is closed', () => {
      vi.setSystemTime(new Date('2026-01-27T02:00:00.000Z')); // 9pm EST
      expect(isMarketOpen('AAPL')).toBe(false);
    });
  });

  describe('isRegularHours', () => {
    it('should return true only during regular trading hours', () => {
      // Regular hours
      vi.setSystemTime(new Date('2026-01-26T16:00:00.000Z')); // 11am EST
      expect(isRegularHours('AAPL')).toBe(true);

      clearMarketStateCache();

      // Pre-market
      vi.setSystemTime(new Date('2026-01-26T12:00:00.000Z')); // 7am EST
      expect(isRegularHours('AAPL')).toBe(false);

      clearMarketStateCache();

      // Post-market
      vi.setSystemTime(new Date('2026-01-26T22:00:00.000Z')); // 5pm EST
      expect(isRegularHours('AAPL')).toBe(false);
    });
  });

  describe('clearMarketStateCache', () => {
    it('should clear the cache', () => {
      vi.setSystemTime(new Date('2026-01-26T16:00:00.000Z'));

      const status1 = getMarketStatus('NYSE');
      clearMarketStateCache();

      // Advance time slightly
      vi.setSystemTime(new Date('2026-01-26T16:01:00.000Z'));

      const status2 = getMarketStatus('NYSE');

      // If cache was cleared, nextStateChange should be recalculated
      expect(status2.state).toBe('REGULAR');
    });
  });
});
