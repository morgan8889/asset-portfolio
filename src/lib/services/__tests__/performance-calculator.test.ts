/**
 * Performance Calculator Service Tests
 *
 * Tests for gain/loss calculation logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Decimal } from 'decimal.js';
import { calculatePerformance } from '../performance-calculator';

describe('calculatePerformance', () => {
  it('calculates positive gain correctly', () => {
    const result = calculatePerformance(
      new Decimal('1000'), // start value
      new Decimal('1100') // current value
    );

    expect(result.percentGain).toBe(10);
    expect(result.absoluteGain.toString()).toBe('100');
  });

  it('calculates negative loss correctly', () => {
    const result = calculatePerformance(
      new Decimal('1000'),
      new Decimal('900')
    );

    expect(result.percentGain).toBe(-10);
    expect(result.absoluteGain.toString()).toBe('-100');
  });

  it('handles zero start value without division error', () => {
    const result = calculatePerformance(
      new Decimal('0'),
      new Decimal('100')
    );

    expect(result.percentGain).toBe(0); // Avoid division by zero
    expect(result.absoluteGain.toString()).toBe('100');
  });

  it('handles zero current value correctly', () => {
    const result = calculatePerformance(
      new Decimal('1000'),
      new Decimal('0')
    );

    expect(result.percentGain).toBe(-100);
    expect(result.absoluteGain.toString()).toBe('-1000');
  });

  it('handles equal values (no change)', () => {
    const result = calculatePerformance(
      new Decimal('1000'),
      new Decimal('1000')
    );

    expect(result.percentGain).toBe(0);
    expect(result.absoluteGain.toString()).toBe('0');
  });

  it('handles small decimal values with precision', () => {
    const result = calculatePerformance(
      new Decimal('0.001'),
      new Decimal('0.002')
    );

    expect(result.percentGain).toBe(100);
    expect(result.absoluteGain.toString()).toBe('0.001');
  });

  it('handles large values without overflow', () => {
    const result = calculatePerformance(
      new Decimal('1000000000000'),
      new Decimal('1100000000000')
    );

    expect(result.percentGain).toBe(10);
    expect(result.absoluteGain.toString()).toBe('100000000000');
  });

  it('calculates percentage with decimal precision', () => {
    const result = calculatePerformance(
      new Decimal('1000'),
      new Decimal('1050')
    );

    expect(result.percentGain).toBe(5);
    expect(result.absoluteGain.toString()).toBe('50');
  });

  it('handles fractional percentage gains', () => {
    const result = calculatePerformance(
      new Decimal('1000'),
      new Decimal('1001')
    );

    expect(result.percentGain).toBeCloseTo(0.1, 5);
    expect(result.absoluteGain.toString()).toBe('1');
  });
});
