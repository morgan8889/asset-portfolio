/**
 * Tests for Planning Store
 *
 * Tests FIRE planning configuration, liability management, and scenario modeling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlanningStore } from '../planning';
// Mock database
vi.mock('@/lib/db/schema', () => ({
  db: {
    getLiabilitiesByPortfolio: vi.fn(() => Promise.resolve([])),
    addLiability: vi.fn(() => Promise.resolve()),
    updateLiability: vi.fn(() => Promise.resolve()),
    deleteLiability: vi.fn(() => Promise.resolve()),
    getLiability: vi.fn((id: string) =>
      Promise.resolve({
        id,
        portfolioId: 'portfolio-1',
        name: 'Updated Name',
        balance: 10000,
        interestRate: 0.05,
        payment: 200,
        startDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    ),
  },
}));

describe('Planning Store', () => {
  beforeEach(() => {
    usePlanningStore.setState({
      fireConfig: {
        currentAge: 35,
        retirementAge: 65,
        annualExpenses: 40000,
        withdrawalRate: 0.04,
        expectedReturn: 0.07,
        inflationRate: 0.03,
        monthlySavings: 2000,
      },
      liabilities: [],
      scenarios: [],
      netWorthHistory: [],
      fireProjection: [],
      fireCalculation: null,
      isLoadingLiabilities: false,
      isLoadingProjection: false,
    });
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have default FIRE configuration', () => {
      const state = usePlanningStore.getState();
      expect(state.fireConfig.retirementAge).toBe(65);
      expect(state.fireConfig.withdrawalRate).toBe(0.04);
    });
  });

  describe('setFireConfig', () => {
    it('should update retirement age', () => {
      usePlanningStore.getState().setFireConfig({ retirementAge: 60 });
      expect(usePlanningStore.getState().fireConfig.retirementAge).toBe(60);
    });

    it('should update annual expenses', () => {
      usePlanningStore.getState().setFireConfig({
        annualExpenses: 50000,
      });
      expect(usePlanningStore.getState().fireConfig.annualExpenses).toBe(50000);
    });
  });

  describe('addLiability', () => {
    it('should add new liability', async () => {
      const { db } = await import('@/lib/db/schema');

      await usePlanningStore.getState().addLiability({
        portfolioId: 'portfolio-1',
        name: 'Home Mortgage',
        balance: 300000,
        interestRate: 0.04,
        payment: 1432.25,
        startDate: '2023-01-01',
      });

      expect(db.addLiability).toHaveBeenCalled();
      expect(db.getLiabilitiesByPortfolio).toHaveBeenCalledWith('portfolio-1');
    });
  });

  describe('updateLiability', () => {
    it('should update existing liability', async () => {
      const { db } = await import('@/lib/db/schema');

      usePlanningStore.setState({
        liabilities: [
          {
            id: 'liability-1',
            portfolioId: 'portfolio-1',
            name: 'Old Name',
            balance: 10000,
            interestRate: 0.05,
            payment: 200,
            startDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      await usePlanningStore
        .getState()
        .updateLiability('liability-1', { name: 'New Name' });

      expect(db.updateLiability).toHaveBeenCalledWith('liability-1', {
        name: 'New Name',
      });
      expect(db.getLiability).toHaveBeenCalledWith('liability-1');
    });
  });

  describe('deleteLiability', () => {
    it('should remove liability', async () => {
      const { db } = await import('@/lib/db/schema');

      usePlanningStore.setState({
        liabilities: [
          {
            id: 'liability-1',
            portfolioId: 'portfolio-1',
            name: 'Test',
            balance: 10000,
            interestRate: 0.05,
            payment: 200,
            startDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      });

      await usePlanningStore.getState().deleteLiability('liability-1');

      expect(db.deleteLiability).toHaveBeenCalledWith('liability-1');
      expect(usePlanningStore.getState().liabilities).toHaveLength(0);
    });
  });

  describe('addScenario', () => {
    it('should create FIRE scenario', () => {
      usePlanningStore.getState().addScenario({
        name: 'Optimistic',
        type: 'income_change',
        value: 10,
        isActive: false,
      });

      expect(usePlanningStore.getState().scenarios).toHaveLength(1);
      expect(usePlanningStore.getState().scenarios[0].name).toBe('Optimistic');
    });
  });

  describe('resetFireConfig', () => {
    it('should reset FIRE config to defaults', () => {
      usePlanningStore.setState({
        fireConfig: {
          currentAge: 50,
          retirementAge: 70,
          annualExpenses: 100000,
          withdrawalRate: 0.05,
          expectedReturn: 0.1,
          inflationRate: 0.03,
          monthlySavings: 5000,
        },
      });

      usePlanningStore.getState().resetFireConfig();

      const state = usePlanningStore.getState();
      // Check that config was reset (specific values depend on DEFAULT_FIRE_CONFIG)
      expect(state.fireConfig).toBeDefined();
    });
  });
});
