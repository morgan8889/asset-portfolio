import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Decimal } from 'decimal.js';
import { TaxSettings, DEFAULT_TAX_RATES } from '@/types/tax';

/**
 * Tax Settings Store
 *
 * Manages user tax rate preferences for capital gains liability estimation.
 * Rates are stored as Decimals (0.00 - 1.00) representing percentages.
 *
 * Storage: IndexedDB via Zustand persist middleware
 */

interface TaxSettingsState {
  taxSettings: TaxSettings;
  setShortTermRate: (rate: Decimal) => void;
  setLongTermRate: (rate: Decimal) => void;
  setTaxSettings: (settings: TaxSettings) => void;
  resetToDefaults: () => void;
}

/**
 * Custom storage to handle Decimal serialization for persist middleware
 */
const taxSettingsStorage = {
  getItem: (name: string): string | null => {
    const str = localStorage.getItem(name);
    if (!str) return null;
    return str;
  },
  setItem: (name: string, value: string): void => {
    localStorage.setItem(name, value);
  },
  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};

export const useTaxSettingsStore = create<TaxSettingsState>()(
  persist(
    (set) => ({
      taxSettings: DEFAULT_TAX_RATES,

      setShortTermRate: (rate: Decimal) =>
        set((state) => ({
          taxSettings: {
            ...state.taxSettings,
            shortTermRate: rate,
            updatedAt: new Date(),
          },
        })),

      setLongTermRate: (rate: Decimal) =>
        set((state) => ({
          taxSettings: {
            ...state.taxSettings,
            longTermRate: rate,
            updatedAt: new Date(),
          },
        })),

      setTaxSettings: (settings: TaxSettings) =>
        set({
          taxSettings: {
            ...settings,
            updatedAt: new Date(),
          },
        }),

      resetToDefaults: () =>
        set({
          taxSettings: {
            ...DEFAULT_TAX_RATES,
            updatedAt: new Date(),
          },
        }),
    }),
    {
      name: 'tax-settings-storage',
      storage: taxSettingsStorage,
      // Custom serialization for Decimal fields
      serialize: (state) => {
        return JSON.stringify({
          state: {
            ...state.state,
            taxSettings: {
              shortTermRate: state.state.taxSettings.shortTermRate.toString(),
              longTermRate: state.state.taxSettings.longTermRate.toString(),
              updatedAt: state.state.taxSettings.updatedAt.toISOString(),
            },
          },
          version: state.version,
        });
      },
      // Custom deserialization for Decimal fields
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        return {
          state: {
            ...parsed.state,
            taxSettings: {
              shortTermRate: new Decimal(parsed.state.taxSettings.shortTermRate),
              longTermRate: new Decimal(parsed.state.taxSettings.longTermRate),
              updatedAt: new Date(parsed.state.taxSettings.updatedAt),
            },
          },
          version: parsed.version,
        };
      },
    }
  )
);
