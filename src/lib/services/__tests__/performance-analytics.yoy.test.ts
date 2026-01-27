/**
 * Unit tests for Year-over-Year Growth calculations
 *
 * @module services/__tests__/performance-analytics.yoy
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Decimal } from 'decimal.js';
import { getYoYMetrics } from '../performance-analytics';
import { PerformanceSnapshot } from '@/types/performance';
import * as snapshotService from '../snapshot-service';

// Mock the snapshot service
vi.mock('../snapshot-service');

describe('getYoYMetrics', () => {
  const portfolioId = 'test-portfolio-123';
  const mockGetSnapshots = vi.mocked(snapshotService.getSnapshots);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array for portfolio with less than 1 year of data', async () => {
    const now = new Date('2024-06-15');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const snapshots: PerformanceSnapshot[] = [
      createSnapshot('2024-01-01', 10000),
      createSnapshot('2024-06-15', 12000),
    ];

    mockGetSnapshots.mockResolvedValue(snapshots);

    const result = await getYoYMetrics(portfolioId);

    expect(result).toEqual([]);

    vi.useRealTimers();
  });

  it('should calculate YoY metrics for one complete year', async () => {
    const now = new Date('2025-01-15');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const snapshots: PerformanceSnapshot[] = [
      createSnapshot('2023-01-01', 10000),
      createSnapshot('2023-12-31', 11000),
      createSnapshot('2024-01-01', 11000),
      createSnapshot('2024-12-31', 13200),
      createSnapshot('2025-01-15', 13500),
    ];

    mockGetSnapshots.mockResolvedValue(snapshots);

    const result = await getYoYMetrics(portfolioId);

    expect(result).toHaveLength(3);

    // Check 2023
    expect(result[0].label).toBe('2023');
    expect(result[0].isPartialYear).toBe(false);
    expect(result[0].startValue.toNumber()).toBe(10000);
    expect(result[0].endValue.toNumber()).toBe(11000);
    expect(result[0].cagr).toBeCloseTo(10, 1); // ~10% CAGR

    // Check 2024
    expect(result[1].label).toBe('2024');
    expect(result[1].isPartialYear).toBe(false);
    expect(result[1].startValue.toNumber()).toBe(11000);
    expect(result[1].endValue.toNumber()).toBe(13200);
    expect(result[1].cagr).toBeCloseTo(20, 1); // ~20% CAGR

    // Check 2025 YTD
    expect(result[2].label).toBe('Current Year (YTD)');
    expect(result[2].isPartialYear).toBe(true);
    expect(result[2].startValue.toNumber()).toBeCloseTo(13200, 0);
    expect(result[2].endValue.toNumber()).toBe(13500);

    vi.useRealTimers();
  });

  it('should handle partial first year (mid-year start)', async () => {
    const now = new Date('2025-01-15');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const snapshots: PerformanceSnapshot[] = [
      createSnapshot('2023-06-15', 10000), // Started mid-2023
      createSnapshot('2023-12-31', 10500),
      createSnapshot('2024-01-01', 10500),
      createSnapshot('2024-12-31', 11500),
      createSnapshot('2025-01-15', 11800),
    ];

    mockGetSnapshots.mockResolvedValue(snapshots);

    const result = await getYoYMetrics(portfolioId);

    expect(result).toHaveLength(3);

    // First year should be partial (started mid-year)
    expect(result[0].label).toBe('2023');
    expect(result[0].isPartialYear).toBe(true);
    expect(result[0].startValue.toNumber()).toBe(10000);
    expect(result[0].endValue.toNumber()).toBe(10500);

    vi.useRealTimers();
  });

  it('should handle negative growth (losses)', async () => {
    const now = new Date('2024-12-31');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const snapshots: PerformanceSnapshot[] = [
      createSnapshot('2023-01-01', 10000),
      createSnapshot('2023-12-31', 8000), // 20% loss
      createSnapshot('2024-01-01', 8000),
      createSnapshot('2024-12-31', 7000), // Further loss
    ];

    mockGetSnapshots.mockResolvedValue(snapshots);

    const result = await getYoYMetrics(portfolioId);

    expect(result).toHaveLength(2);

    // 2023 - negative growth
    expect(result[0].label).toBe('2023');
    expect(result[0].cagr).toBeLessThan(0);
    expect(result[0].cagr).toBeCloseTo(-20, 1);

    // 2024 - negative growth
    expect(result[1].label).toBe('Current Year (YTD)');
    expect(result[1].cagr).toBeLessThan(0);

    vi.useRealTimers();
  });

  it('should return empty array when no snapshots exist', async () => {
    mockGetSnapshots.mockResolvedValue([]);

    const result = await getYoYMetrics(portfolioId);

    expect(result).toEqual([]);
  });

  it('should handle zero starting value gracefully', async () => {
    const now = new Date('2024-12-31');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const snapshots: PerformanceSnapshot[] = [
      createSnapshot('2023-01-01', 0),
      createSnapshot('2023-12-31', 0),
      createSnapshot('2024-01-01', 0),
      createSnapshot('2024-06-01', 10000), // First real value
      createSnapshot('2024-12-31', 12000),
    ];

    mockGetSnapshots.mockResolvedValue(snapshots);

    const result = await getYoYMetrics(portfolioId);

    // Should still calculate for 2024 where there's meaningful data
    expect(result.length).toBeGreaterThan(0);

    vi.useRealTimers();
  });
});

// Helper function to create test snapshot
function createSnapshot(
  dateStr: string,
  totalValue: number
): PerformanceSnapshot {
  const date = new Date(dateStr);
  return {
    id: `snap-${dateStr}`,
    portfolioId: 'test-portfolio-123',
    date,
    totalValue: new Decimal(totalValue),
    totalCost: new Decimal(totalValue * 0.9), // 10% gain assumed
    dayChange: new Decimal(0),
    dayChangePercent: 0,
    cumulativeReturn: new Decimal(0),
    twrReturn: new Decimal(0),
    holdingCount: 5,
    hasInterpolatedPrices: false,
    createdAt: date,
    updatedAt: date,
  };
}
