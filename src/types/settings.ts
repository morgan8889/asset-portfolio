/**
 * User Settings Types
 *
 * Defines user-configurable settings including tax preferences.
 */

/**
 * Tax Settings
 *
 * User-configured tax rates and preferences for tax optimization features.
 */
export interface TaxSettings {
  userId: string; // Always 'default' (single-user app)
  shortTermTaxRate: number; // 0.0-0.5 (e.g., 0.32 for 32%)
  longTermTaxRate: number; // 0.0-0.3 (e.g., 0.15 for 15%)
  stateRate: number; // 0.0-0.15 (e.g., 0.05 for 5%)
  enableTaxOptimization: boolean; // Show/hide recommendations
  lookbackDays: number; // Default: 30
  jurisdiction: string; // 'US', 'UK', etc. (future use)
}

/**
 * Default Tax Settings (US-centric)
 */
export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  userId: 'default',
  shortTermTaxRate: 0.24, // US 24% bracket (common)
  longTermTaxRate: 0.15, // US 15% LTCG
  stateRate: 0.05, // 5% state tax estimate
  enableTaxOptimization: true,
  lookbackDays: 30,
  jurisdiction: 'US',
};
