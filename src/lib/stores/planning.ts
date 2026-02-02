import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Liability,
  FireConfig,
  Scenario,
  DEFAULT_FIRE_CONFIG,
  FireCalculation,
  NetWorthPoint,
  ProjectionPoint,
} from '@/types/planning';
import { db } from '@/lib/db/schema';

interface PlanningState {
  // FIRE Configuration
  fireConfig: FireConfig;
  setFireConfig: (config: Partial<FireConfig>) => void;
  resetFireConfig: () => void;

  // Liabilities
  liabilities: Liability[];
  loadLiabilities: (portfolioId: string) => Promise<void>;
  addLiability: (
    liability: Omit<Liability, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updateLiability: (
    id: string,
    updates: Partial<Omit<Liability, 'id' | 'createdAt'>>
  ) => Promise<void>;
  deleteLiability: (id: string) => Promise<void>;

  // Scenarios
  scenarios: Scenario[];
  addScenario: (scenario: Omit<Scenario, 'id' | 'createdAt'>) => void;
  updateScenario: (id: string, updates: Partial<Scenario>) => void;
  deleteScenario: (id: string) => void;
  toggleScenario: (id: string) => void;

  // Calculated Data (ephemeral - not persisted)
  netWorthHistory: NetWorthPoint[];
  setNetWorthHistory: (history: NetWorthPoint[]) => void;

  fireProjection: ProjectionPoint[];
  setFireProjection: (projection: ProjectionPoint[]) => void;

  fireCalculation: FireCalculation | null;
  setFireCalculation: (calculation: FireCalculation | null) => void;

  // UI State
  isLoadingLiabilities: boolean;
  isLoadingProjection: boolean;
}

export const usePlanningStore = create<PlanningState>()(
  persist(
    (set, get) => ({
      // Initial state
      fireConfig: DEFAULT_FIRE_CONFIG,
      liabilities: [],
      scenarios: [],
      netWorthHistory: [],
      fireProjection: [],
      fireCalculation: null,
      isLoadingLiabilities: false,
      isLoadingProjection: false,

      // FIRE Config actions
      setFireConfig: (config) => {
        set((state) => ({
          fireConfig: { ...state.fireConfig, ...config },
        }));
      },

      resetFireConfig: () => {
        set({ fireConfig: DEFAULT_FIRE_CONFIG });
      },

      // Liability actions
      loadLiabilities: async (portfolioId: string) => {
        set({ isLoadingLiabilities: true });
        try {
          const liabilities = await db.getLiabilitiesByPortfolio(portfolioId);
          set({ liabilities });
        } catch (error) {
          console.error('Failed to load liabilities:', error);
          throw error;
        } finally {
          set({ isLoadingLiabilities: false });
        }
      },

      addLiability: async (liability) => {
        try {
          await db.addLiability(liability);
          // Reload liabilities for the portfolio
          const liabilities = await db.getLiabilitiesByPortfolio(
            liability.portfolioId
          );
          set({ liabilities });
        } catch (error) {
          console.error('Failed to add liability:', error);
          throw error;
        }
      },

      updateLiability: async (id, updates) => {
        try {
          await db.updateLiability(id, updates);
          // Reload the updated liability
          const liabilities = get().liabilities;
          const updated = await db.getLiability(id);
          if (updated) {
            set({
              liabilities: liabilities.map((l) => (l.id === id ? updated : l)),
            });
          }
        } catch (error) {
          console.error('Failed to update liability:', error);
          throw error;
        }
      },

      deleteLiability: async (id) => {
        try {
          await db.deleteLiability(id);
          set((state) => ({
            liabilities: state.liabilities.filter((l) => l.id !== id),
          }));
        } catch (error) {
          console.error('Failed to delete liability:', error);
          throw error;
        }
      },

      // Scenario actions
      addScenario: (scenario) => {
        const newScenario: Scenario = {
          ...scenario,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          scenarios: [...state.scenarios, newScenario],
        }));
      },

      updateScenario: (id, updates) => {
        set((state) => ({
          scenarios: state.scenarios.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      deleteScenario: (id) => {
        set((state) => ({
          scenarios: state.scenarios.filter((s) => s.id !== id),
        }));
      },

      toggleScenario: (id) => {
        set((state) => ({
          scenarios: state.scenarios.map((s) =>
            s.id === id ? { ...s, isActive: !s.isActive } : s
          ),
        }));
      },

      // Ephemeral data setters
      setNetWorthHistory: (history) => set({ netWorthHistory: history }),
      setFireProjection: (projection) => set({ fireProjection: projection }),
      setFireCalculation: (calculation) =>
        set({ fireCalculation: calculation }),
    }),
    {
      name: 'planning-storage',
      // Only persist configuration and scenarios, not calculated data
      partialize: (state) => ({
        fireConfig: state.fireConfig,
        scenarios: state.scenarios,
      }),
    }
  )
);
