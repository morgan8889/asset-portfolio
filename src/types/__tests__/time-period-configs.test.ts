/**
 * Tests for TIME_PERIOD_CONFIGS
 *
 * Ensures all time period configurations are properly defined
 * with correct date calculations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TIME_PERIOD_CONFIGS, TimePeriod } from '../dashboard';
import { differenceInDays } from 'date-fns';

describe('TIME_PERIOD_CONFIGS', () => {
  const fixedDate = new Date('2025-06-15T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should have all required time periods defined', () => {
    const requiredPeriods: TimePeriod[] = [
      'TODAY',
      'WEEK',
      'MONTH',
      'QUARTER',
      'YEAR',
      'THREE_YEAR',
      'ALL',
    ];

    requiredPeriods.forEach((period) => {
      expect(TIME_PERIOD_CONFIGS[period]).toBeDefined();
      expect(TIME_PERIOD_CONFIGS[period].id).toBe(period);
      expect(typeof TIME_PERIOD_CONFIGS[period].label).toBe('string');
      expect(typeof TIME_PERIOD_CONFIGS[period].shortLabel).toBe('string');
      expect(typeof TIME_PERIOD_CONFIGS[period].getStartDate).toBe('function');
    });
  });

  describe('getStartDate calculations', () => {
    it('TODAY should return start of current day', () => {
      const startDate = TIME_PERIOD_CONFIGS.TODAY.getStartDate();
      expect(startDate.getFullYear()).toBe(2025);
      expect(startDate.getMonth()).toBe(5); // June (0-indexed)
      expect(startDate.getDate()).toBe(15);
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
    });

    it('WEEK should return 7 days ago', () => {
      const startDate = TIME_PERIOD_CONFIGS.WEEK.getStartDate();
      const daysDiff = differenceInDays(fixedDate, startDate);
      expect(daysDiff).toBe(7);
    });

    it('MONTH should return 30 days ago', () => {
      const startDate = TIME_PERIOD_CONFIGS.MONTH.getStartDate();
      const daysDiff = differenceInDays(fixedDate, startDate);
      expect(daysDiff).toBe(30);
    });

    it('QUARTER should return 90 days ago', () => {
      const startDate = TIME_PERIOD_CONFIGS.QUARTER.getStartDate();
      const daysDiff = differenceInDays(fixedDate, startDate);
      expect(daysDiff).toBe(90);
    });

    it('YEAR should return 365 days ago', () => {
      const startDate = TIME_PERIOD_CONFIGS.YEAR.getStartDate();
      const daysDiff = differenceInDays(fixedDate, startDate);
      expect(daysDiff).toBe(365);
    });

    it('THREE_YEAR should return 1095 days ago (3 years)', () => {
      const startDate = TIME_PERIOD_CONFIGS.THREE_YEAR.getStartDate();
      const daysDiff = differenceInDays(fixedDate, startDate);
      expect(daysDiff).toBe(1095);
    });

    it('ALL should return Unix epoch', () => {
      const startDate = TIME_PERIOD_CONFIGS.ALL.getStartDate();
      expect(startDate.getTime()).toBe(0);
    });
  });

  describe('THREE_YEAR config', () => {
    it('should have correct id', () => {
      expect(TIME_PERIOD_CONFIGS.THREE_YEAR.id).toBe('THREE_YEAR');
    });

    it('should have correct label', () => {
      expect(TIME_PERIOD_CONFIGS.THREE_YEAR.label).toBe('3 Years');
    });

    it('should have correct shortLabel', () => {
      expect(TIME_PERIOD_CONFIGS.THREE_YEAR.shortLabel).toBe('3Y');
    });
  });
});
