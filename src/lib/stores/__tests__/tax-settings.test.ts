/**
 * Tests for Tax Settings Store
 *
 * Tests tax rate configuration and Decimal precision handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTaxSettingsStore } from '../tax-settings';
import Decimal from 'decimal.js';

describe('Tax Settings Store', () => {
  beforeEach(() => {
    useTaxSettingsStore.setState({
      taxSettings: {
        shortTermRate: new Decimal(0.24),
        longTermRate: new Decimal(0.15),
        updatedAt: new Date('2025-01-01'),
      },
    });
  });

  describe('Initial State', () => {
    it('should have default tax rates', () => {
      const state = useTaxSettingsStore.getState();
      expect(state.taxSettings.shortTermRate.toNumber()).toBe(0.24);
      expect(state.taxSettings.longTermRate.toNumber()).toBe(0.15);
    });
  });

  describe('setShortTermRate', () => {
    it('should update short-term capital gains rate', () => {
      useTaxSettingsStore.getState().setShortTermRate(new Decimal(0.32));
      expect(useTaxSettingsStore.getState().taxSettings.shortTermRate.toNumber()).toBe(0.32);
    });

    it('should handle percentage input correctly', () => {
      useTaxSettingsStore.getState().setShortTermRate(new Decimal(0.37));
      expect(useTaxSettingsStore.getState().taxSettings.shortTermRate.toNumber()).toBe(0.37);
    });
  });

  describe('setLongTermRate', () => {
    it('should update long-term capital gains rate', () => {
      useTaxSettingsStore.getState().setLongTermRate(new Decimal(0.20));
      expect(useTaxSettingsStore.getState().taxSettings.longTermRate.toNumber()).toBe(0.20);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset to default rates', () => {
      useTaxSettingsStore.setState({
        taxSettings: {
          shortTermRate: new Decimal(0.50),
          longTermRate: new Decimal(0.30),
          updatedAt: new Date('2025-01-01'),
        },
      });

      useTaxSettingsStore.getState().resetToDefaults();

      const state = useTaxSettingsStore.getState();
      expect(state.taxSettings.shortTermRate.toNumber()).toBe(0.24);
      expect(state.taxSettings.longTermRate.toNumber()).toBe(0.15);
    });
  });

  describe('Decimal Precision', () => {
    it('should maintain precision with Decimal type', () => {
      const rate = new Decimal(0.123456789);
      useTaxSettingsStore.getState().setShortTermRate(rate);
      
      const storedRate = useTaxSettingsStore.getState().taxSettings.shortTermRate;
      expect(storedRate.equals(rate)).toBe(true);
    });

    it('should handle zero rate', () => {
      useTaxSettingsStore.getState().setLongTermRate(new Decimal(0));
      expect(useTaxSettingsStore.getState().taxSettings.longTermRate.toNumber()).toBe(0);
    });
  });
});
