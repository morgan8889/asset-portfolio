/**
 * Tax Settings Store
 *
 * Zustand store for managing user tax configuration and preferences.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TaxSettings, DEFAULT_TAX_SETTINGS } from '@/types/settings';

interface TaxSettingsState {
  settings: TaxSettings;
  updateSettings: (updates: Partial<TaxSettings>) => void;
  resetSettings: () => void;
}

export const useTaxSettingsStore = create<TaxSettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_TAX_SETTINGS,

      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),

      resetSettings: () =>
        set({
          settings: DEFAULT_TAX_SETTINGS,
        }),
    }),
    {
      name: 'tax-settings-storage',
    }
  )
);
