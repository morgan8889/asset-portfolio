/**
 * Predefined Target Allocation Models
 */

import { TargetModel } from '@/types/analysis';

/**
 * System-defined target allocation models
 * These are read-only and serve as templates for users
 */
export const PREDEFINED_TARGET_MODELS: TargetModel[] = [
  {
    id: '60-40-standard',
    name: '60/40 Standard',
    description: 'Classic balanced portfolio: 60% stocks, 40% bonds',
    isSystem: true,
    allocations: {
      stock: 50,
      etf: 10,
      bond: 40,
      crypto: 0,
      real_estate: 0,
      commodity: 0,
      cash: 0,
      index: 0,
      other: 0,
    },
  },
  {
    id: '80-20-growth',
    name: '80/20 Growth',
    description: 'Aggressive growth: 80% equities, 20% bonds',
    isSystem: true,
    allocations: {
      stock: 60,
      etf: 20,
      bond: 20,
      crypto: 0,
      real_estate: 0,
      commodity: 0,
      cash: 0,
      index: 0,
      other: 0,
    },
  },
  {
    id: 'all-weather',
    name: 'All Weather',
    description: 'Ray Dalio inspired: Diversified across asset classes',
    isSystem: true,
    allocations: {
      stock: 30,
      etf: 0,
      bond: 55,
      crypto: 0,
      real_estate: 0,
      commodity: 7.5,
      cash: 0,
      index: 0,
      other: 7.5,
    },
  },
  {
    id: 'aggressive-growth',
    name: 'Aggressive Growth',
    description: '100% equities for maximum growth potential',
    isSystem: true,
    allocations: {
      stock: 70,
      etf: 25,
      bond: 0,
      crypto: 0,
      real_estate: 0,
      commodity: 0,
      cash: 5,
      index: 0,
      other: 0,
    },
  },
  {
    id: 'conservative',
    name: 'Conservative',
    description: 'Low risk: Heavy bonds with some equity exposure',
    isSystem: true,
    allocations: {
      stock: 20,
      etf: 10,
      bond: 60,
      crypto: 0,
      real_estate: 0,
      commodity: 0,
      cash: 10,
      index: 0,
      other: 0,
    },
  },
  {
    id: 'crypto-enhanced',
    name: 'Crypto Enhanced',
    description: 'Modern portfolio with 5-10% crypto allocation',
    isSystem: true,
    allocations: {
      stock: 45,
      etf: 15,
      bond: 25,
      crypto: 10,
      real_estate: 0,
      commodity: 0,
      cash: 5,
      index: 0,
      other: 0,
    },
  },
];

/**
 * Initialize target models in user settings if not present
 */
export async function initializeTargetModels(db: any): Promise<void> {
  try {
    const existing = await db.userSettings.get({ key: 'target_models' });

    if (!existing) {
      await db.userSettings.put({
        key: 'target_models',
        value: PREDEFINED_TARGET_MODELS,
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('Failed to initialize target models:', error);
  }
}
