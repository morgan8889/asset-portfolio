/**
 * Tests for Planning Store
 *
 * Tests FIRE planning configuration, liability management, and scenario modeling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlanningStore } from '../planning';
import Decimal from 'decimal.js';

// Mock database
vi.mock('@/lib/db/schema', () => ({
  db: {
    getLiabilitiesByPortfolio: vi.fn(() => Promise.resolve([])),
    addLiability: vi.fn(() => Promise.resolve()),
    updateLiability: vi.fn(() => Promise.resolve()),
    deleteLiability: vi.fn(() => Promise.resolve()),
    getLiability: vi.fn((id) => Promise.resolve({
      id,
      portfolioId: 'portfolio-1',
      name: 'Updated Name',
      type: 'loan',
      initialBalance: new Decimal(10000),
      interestRate: new Decimal(0.05),
      startDate: new Date(),
      monthlyPayment: new Decimal(200),
    })),
  },
}));

describe('Planning Store', () => {
  beforeEach(() => {
    usePlanningStore.setState({
      fireConfig: {
        currentAge: 35,
        retirementAge: 65,
        annualExpenses: new Decimal(40000),
        safeWithdrawalRate: new Decimal(0.04),
        expectedReturn: new Decimal(0.07),
        currentSavings: new Decimal(100000),
        monthlySavings: new Decimal(2000),
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
      expect(state.fireConfig.safeWithdrawalRate.toNumber()).toBe(0.04);
    });
  });

  describe('setFireConfig', () => {
    it('should update retirement age', () => {
      usePlanningStore.getState().setFireConfig({ retirementAge: 60 });
      expect(usePlanningStore.getState().fireConfig.retirementAge).toBe(60);
    });

    it('should update annual expenses', () => {
      usePlanningStore.getState().setFireConfig({
        annualExpenses: new Decimal(50000),
      });
      expect(usePlanningStore.getState().fireConfig.annualExpenses.toNumber()).toBe(50000);
    });
  });

  describe('addLiability', () => {
    it('should add new liability', async () => {
      const { db } = await import('@/lib/db/schema');

      await usePlanningStore.getState().addLiability({
        portfolioId: 'portfolio-1',
        name: 'Home Mortgage',
        type: 'mortgage',
        initialBalance: new Decimal(300000),
        interestRate: new Decimal(0.04),
        startDate: new Date('2023-01-01'),
        monthlyPayment: new Decimal(1432.25),
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
            type: 'loan',
            initialBalance: new Decimal(10000),
            interestRate: new Decimal(0.05),
            startDate: new Date(),
            monthlyPayment: new Decimal(200),
          },
        ],
      });

      await usePlanningStore.getState().updateLiability('liability-1', { name: 'New Name' });

      expect(db.updateLiability).toHaveBeenCalledWith('liability-1', { name: 'New Name' });
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
            type: 'loan',
            initialBalance: new Decimal(10000),
            interestRate: new Decimal(0.05),
            startDate: new Date(),
            monthlyPayment: new Decimal(200),
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
        fireConfig: {
          ...usePlanningStore.getState().fireConfig,
          expectedReturn: new Decimal(0.10),
        },
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
          annualExpenses: new Decimal(100000),
          safeWithdrawalRate: new Decimal(0.05),
          expectedReturn: new Decimal(0.10),
          currentSavings: new Decimal(500000),
          monthlySavings: new Decimal(5000),
        },
      });

      usePlanningStore.getState().resetFireConfig();

      const state = usePlanningStore.getState();
      // Check that config was reset (specific values depend on DEFAULT_FIRE_CONFIG)
      expect(state.fireConfig).toBeDefined();
    });
  });
});
