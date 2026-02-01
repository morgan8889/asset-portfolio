/**
 * Unit tests for export service utility functions
 * @feature 011-export-functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateExportFilename, getDateRangeBounds } from '../export-service';

describe('ExportService Utilities', () => {
  describe('generateExportFilename', () => {
    beforeEach(() => {
      // Mock Date to return consistent timestamp
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-30'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should generate filename for performance PDF report', () => {
      const filename = generateExportFilename(
        'performance',
        'My Portfolio',
        'pdf'
      );
      expect(filename).toBe(
        'portfolio_performance_my_portfolio_2026-01-30.pdf'
      );
    });

    it('should generate filename for transactions CSV export', () => {
      const filename = generateExportFilename(
        'transactions',
        'Test Portfolio',
        'csv'
      );
      expect(filename).toBe(
        'transaction_history_test_portfolio_2026-01-30.csv'
      );
    });

    it('should generate filename for holdings CSV export', () => {
      const filename = generateExportFilename('holdings', 'Growth Fund', 'csv');
      expect(filename).toBe('holdings_snapshot_growth_fund_2026-01-30.csv');
    });

    it('should sanitize portfolio name with spaces', () => {
      const filename = generateExportFilename(
        'performance',
        'My Test Portfolio',
        'pdf'
      );
      expect(filename).toBe(
        'portfolio_performance_my_test_portfolio_2026-01-30.pdf'
      );
    });

    it('should sanitize portfolio name with special characters', () => {
      const filename = generateExportFilename(
        'transactions',
        'Portfolio #1 (Growth)',
        'csv'
      );
      expect(filename).toBe(
        'transaction_history_portfolio_1_growth_2026-01-30.csv'
      );
    });

    it('should handle uppercase portfolio names', () => {
      const filename = generateExportFilename('holdings', 'TECH STOCKS', 'csv');
      expect(filename).toBe('holdings_snapshot_tech_stocks_2026-01-30.csv');
    });
  });

  describe('getDateRangeBounds', () => {
    beforeEach(() => {
      // Set current date to 2026-06-15
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return YTD range (start of year to now)', () => {
      const { start, end } = getDateRangeBounds('YTD');

      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);

      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(5); // June
      expect(end.getDate()).toBe(15);
    });

    it('should return 1Y range (one year ago to now)', () => {
      const { start, end } = getDateRangeBounds('1Y');

      expect(start.getFullYear()).toBe(2025);
      expect(start.getMonth()).toBe(5); // June
      expect(start.getDate()).toBe(15);

      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(5); // June
      expect(end.getDate()).toBe(15);
    });

    it('should return ALL range (epoch to now)', () => {
      const { start, end } = getDateRangeBounds('ALL');

      expect(start.getTime()).toBe(0); // Unix epoch

      expect(end.getFullYear()).toBe(2026);
      expect(end.getMonth()).toBe(5); // June
      expect(end.getDate()).toBe(15);
    });

    it('should handle YTD at beginning of year', () => {
      vi.setSystemTime(new Date('2026-01-05T12:00:00Z'));
      const { start, end } = getDateRangeBounds('YTD');

      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(0);
      expect(start.getDate()).toBe(1);

      expect(end.getDate()).toBe(5);
    });

    it('should handle YTD at end of year', () => {
      vi.setSystemTime(new Date('2026-12-31T12:00:00Z'));
      const { start, end } = getDateRangeBounds('YTD');

      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(0);
      expect(start.getDate()).toBe(1);

      expect(end.getMonth()).toBe(11); // December
      expect(end.getDate()).toBe(31);
    });
  });
});
