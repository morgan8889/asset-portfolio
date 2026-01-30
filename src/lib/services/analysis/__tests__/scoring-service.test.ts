/**
 * Tests for Health Scoring Service
 */

import { describe, it, expect } from 'vitest';
import Decimal from 'decimal.js';

import { calculateHealthScore } from '../scoring-service';
import { ANALYSIS_PROFILES, HealthScoreInput } from '@/types/analysis';

describe('Health Scoring Service', () => {
  describe('calculateHealthScore', () => {
    it('should calculate health score for a well-diversified portfolio', () => {
      const input: HealthScoreInput = {
        holdings: [
          {
            assetId: '1',
            value: new Decimal(10000),
            assetType: 'stock',
            region: 'US',
            sector: 'Technology',
          },
          {
            assetId: '2',
            value: new Decimal(10000),
            assetType: 'bond',
            region: 'US',
            sector: 'Government',
          },
          {
            assetId: '3',
            value: new Decimal(5000),
            assetType: 'etf',
            region: 'EU',
            sector: 'Finance',
          },
        ],
        totalValue: new Decimal(25000),
      };

      const health = calculateHealthScore(input, ANALYSIS_PROFILES[1]); // Balanced

      expect(health.overallScore).toBeGreaterThan(0);
      expect(health.overallScore).toBeLessThanOrEqual(100);
      expect(health.metrics).toHaveLength(3);
      expect(health.profile.id).toBe('balanced');
    });

    it('should return low diversification score for concentrated portfolio', () => {
      const input: HealthScoreInput = {
        holdings: [
          {
            assetId: '1',
            value: new Decimal(90000),
            assetType: 'stock',
            region: 'US',
            sector: 'Technology',
          },
          {
            assetId: '2',
            value: new Decimal(10000),
            assetType: 'cash',
            region: 'US',
          },
        ],
        totalValue: new Decimal(100000),
      };

      const health = calculateHealthScore(input, ANALYSIS_PROFILES[1]);
      const diversificationMetric = health.metrics.find(
        (m) => m.id === 'diversification'
      );

      expect(diversificationMetric).toBeDefined();
      expect(diversificationMetric!.score).toBeLessThan(70);
      expect(diversificationMetric!.status).not.toBe('good');
    });

    it('should handle empty portfolio', () => {
      const input: HealthScoreInput = {
        holdings: [],
        totalValue: new Decimal(0),
      };

      const health = calculateHealthScore(input, ANALYSIS_PROFILES[1]);

      // Empty portfolio: diversification=0, performance=50 (no data), volatility=50 (no data)
      // With balanced profile (0.33, 0.34, 0.33): 0*0.33 + 50*0.34 + 50*0.33 ≈ 34
      expect(health.overallScore).toBeGreaterThan(0);
      expect(health.overallScore).toBeLessThan(50);
      expect(health.metrics[0].status).toBe('critical'); // Diversification is critical
      expect(health.metrics[0].score).toBe(0); // Diversification score is 0
    });

    it('should respect profile weights', () => {
      const input: HealthScoreInput = {
        holdings: [
          {
            assetId: '1',
            value: new Decimal(10000),
            assetType: 'stock',
            region: 'US',
          },
        ],
        totalValue: new Decimal(10000),
      };

      const growthHealth = calculateHealthScore(input, ANALYSIS_PROFILES[0]); // Growth
      const safetyHealth = calculateHealthScore(input, ANALYSIS_PROFILES[2]); // Safety

      // Growth profile weights performance more
      expect(growthHealth.metrics[1].weight).toBeGreaterThan(
        safetyHealth.metrics[1].weight
      );
      // Safety profile weights diversification more
      expect(safetyHealth.metrics[0].weight).toBeGreaterThan(
        growthHealth.metrics[0].weight
      );
    });

    it('should handle extreme positive performance (10x gain)', () => {
      const input: HealthScoreInput = {
        holdings: [
          {
            assetId: '1',
            value: new Decimal(10000),
            assetType: 'stock',
            region: 'US',
          },
        ],
        totalValue: new Decimal(10000),
        performanceData: {
          returnPercent: 1000, // 10x return (1000% gain)
          volatility: 20,
          sharpeRatio: 5,
        },
      };

      const health = calculateHealthScore(input, ANALYSIS_PROFILES[1]);
      const performanceMetric = health.metrics.find((m) => m.id === 'performance');

      expect(performanceMetric).toBeDefined();
      expect(performanceMetric!.score).toBeGreaterThan(0);
      expect(performanceMetric!.score).toBeLessThanOrEqual(100);
      expect(performanceMetric!.status).toBe('good');
    });

    it('should handle extreme negative performance (near-wipeout)', () => {
      const input: HealthScoreInput = {
        holdings: [
          {
            assetId: '1',
            value: new Decimal(1000),
            assetType: 'stock',
            region: 'US',
          },
        ],
        totalValue: new Decimal(1000),
        performanceData: {
          returnPercent: -99, // Near total loss
          volatility: 50,
          sharpeRatio: -5,
        },
      };

      const health = calculateHealthScore(input, ANALYSIS_PROFILES[1]);
      const performanceMetric = health.metrics.find((m) => m.id === 'performance');

      expect(performanceMetric).toBeDefined();
      expect(performanceMetric!.score).toBeGreaterThanOrEqual(0);
      expect(performanceMetric!.score).toBeLessThan(30);
      expect(performanceMetric!.status).toBe('critical');
    });

    it('should handle missing performance data', () => {
      const input: HealthScoreInput = {
        holdings: [
          {
            assetId: '1',
            value: new Decimal(10000),
            assetType: 'stock',
            region: 'US',
          },
        ],
        totalValue: new Decimal(10000),
        // No performanceData provided
      };

      const health = calculateHealthScore(input, ANALYSIS_PROFILES[1]);
      const performanceMetric = health.metrics.find((m) => m.id === 'performance');

      expect(performanceMetric).toBeDefined();
      expect(performanceMetric!.score).toBe(50); // Neutral score when no data
      expect(performanceMetric!.details).toContain('Performance data not available');
    });

    it('should handle undefined/null performance values', () => {
      const input: HealthScoreInput = {
        holdings: [
          {
            assetId: '1',
            value: new Decimal(10000),
            assetType: 'stock',
            region: 'US',
          },
        ],
        totalValue: new Decimal(10000),
        performanceData: {
          returnPercent: 0,
          volatility: 0,
          sharpeRatio: 0,
        },
      };

      const health = calculateHealthScore(input, ANALYSIS_PROFILES[1]);

      expect(health.overallScore).toBeGreaterThan(0);
      expect(health.overallScore).toBeLessThanOrEqual(100);
      expect(health.metrics).toHaveLength(3);
    });
  });
});
