/**
 * Analysis Store
 *
 * Manages portfolio analysis state including health scores, recommendations, and rebalancing.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

import {
  AnalysisState,
  AnalysisProfile,
  ANALYSIS_PROFILES,
  TargetModel,
  PortfolioHealth,
  Recommendation,
  RebalancingPlan,
  HealthScoreInput,
} from '@/types/analysis';
import { db } from '@/lib/db/schema';
import { holdingQueries, assetQueries } from '@/lib/db';
import { calculateHealthScore } from '@/lib/services/analysis/scoring-service';
import { generateRecommendations } from '@/lib/services/analysis/recommendation-engine';
import { calculateRebalancing } from '@/lib/services/analysis/rebalancing-service';
import { PREDEFINED_TARGET_MODELS } from '@/lib/data/target-models';
import Decimal from 'decimal.js';

export const useAnalysisStore = create<AnalysisState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        health: null,
        recommendations: [],
        rebalancingPlan: null,
        targetModels: [],
        activeProfile: ANALYSIS_PROFILES[1], // Balanced by default
        activeTargetModelId: null,
        isCalculating: false,
        error: null,

        // Calculate health score
        calculateHealth: async (portfolioId: string) => {
          set({ isCalculating: true, error: null });
          try {
            const holdings = await holdingQueries.getByPortfolio(portfolioId);
            const assets = await assetQueries.getAll();

            // Edge case: No holdings
            if (holdings.length === 0) {
              set({
                health: null,
                isCalculating: false,
                error: null, // Not an error, just no data
              });
              return;
            }

            const totalValue = holdings.reduce(
              (sum, h) => sum.plus(h.currentValue),
              new Decimal(0)
            );

            // Edge case: Zero portfolio value
            if (totalValue.isZero() || totalValue.isNegative()) {
              set({
                health: null,
                isCalculating: false,
                error: null,
              });
              return;
            }

            const input: HealthScoreInput = {
              holdings: holdings.map((h) => {
                const asset = assets.find((a) => a.id === h.assetId);
                return {
                  assetId: h.assetId,
                  value: h.currentValue.isNegative() ? new Decimal(0) : h.currentValue, // Handle negative values
                  assetType: asset?.type || 'other',
                  region: asset?.region,
                  sector: asset?.sector,
                };
              }).filter((h) => h.value.greaterThan(0)), // Filter out zero-value holdings
              totalValue,
            };

            // Edge case: All holdings filtered out
            if (input.holdings.length === 0) {
              set({
                health: null,
                isCalculating: false,
                error: null,
              });
              return;
            }

            const { activeProfile } = get();
            const health = calculateHealthScore(input, activeProfile);

            set({ health, isCalculating: false });
          } catch (error) {
            const errorMessage = error instanceof Error
              ? error.message
              : `Failed to calculate health score: ${String(error)}`;
            console.error('[Analysis Store] Health calculation error:', error);
            set({
              error: errorMessage,
              isCalculating: false,
            });
          }
        },

        // Generate recommendations
        generateRecommendations: async (portfolioId: string) => {
          set({ isCalculating: true, error: null });
          try {
            const holdings = await holdingQueries.getByPortfolio(portfolioId);
            const assets = await assetQueries.getAll();

            // Edge case: No holdings
            if (holdings.length === 0) {
              set({ recommendations: [], isCalculating: false });
              return;
            }

            const totalValue = holdings.reduce(
              (sum, h) => sum.plus(h.currentValue),
              new Decimal(0)
            );

            // Edge case: Zero or negative value
            if (totalValue.isZero() || totalValue.isNegative()) {
              set({ recommendations: [], isCalculating: false });
              return;
            }

            const recommendations = generateRecommendations({
              holdings,
              assets,
              totalValue,
            });

            set({ recommendations, isCalculating: false });
          } catch (error) {
            const errorMessage = error instanceof Error
              ? error.message
              : `Failed to generate recommendations: ${String(error)}`;
            console.error('[Analysis Store] Recommendation generation error:', error);
            set({
              error: errorMessage,
              isCalculating: false,
            });
          }
        },

        // Calculate rebalancing
        calculateRebalancing: async (
          portfolioId: string,
          targetModelId: string
        ) => {
          set({ isCalculating: true, error: null });
          try {
            const { targetModels } = get();
            const targetModel = targetModels.find((m) => m.id === targetModelId);

            if (!targetModel) {
              throw new Error('Target model not found');
            }

            const holdings = await holdingQueries.getByPortfolio(portfolioId);
            const assets = await assetQueries.getAll();

            // Edge case: No holdings
            if (holdings.length === 0) {
              set({ rebalancingPlan: null, isCalculating: false });
              return;
            }

            const totalValue = holdings.reduce(
              (sum, h) => sum.plus(h.currentValue),
              new Decimal(0)
            );

            // Edge case: Zero or negative value
            if (totalValue.isZero() || totalValue.isNegative()) {
              set({ rebalancingPlan: null, isCalculating: false });
              return;
            }

            const rebalancingPlan = calculateRebalancing({
              holdings,
              assets,
              totalValue,
              targetModel,
            });

            set({ rebalancingPlan, isCalculating: false });
          } catch (error) {
            const errorMessage = error instanceof Error
              ? error.message
              : `Failed to calculate rebalancing: ${String(error)}`;
            console.error('[Analysis Store] Rebalancing calculation error:', error);
            set({
              error: errorMessage,
              isCalculating: false,
            });
          }
        },

        // Set active profile
        setActiveProfile: (profileId: string) => {
          const profile = ANALYSIS_PROFILES.find((p) => p.id === profileId);
          if (profile) {
            set({ activeProfile: profile });
          }
        },

        // Set active target model
        setActiveTargetModel: (modelId: string | null) => {
          set({ activeTargetModelId: modelId });
        },

        // Load target models from IndexedDB
        loadTargetModels: async () => {
          try {
            const setting = await db.userSettings.get({ key: 'target_models' });
            let models = setting?.value as TargetModel[] | undefined;

            // Initialize with predefined models if none exist
            if (!models || models.length === 0) {
              models = PREDEFINED_TARGET_MODELS;
              await db.userSettings.put({
                key: 'target_models',
                value: models,
                updatedAt: new Date(),
              });
            }

            set({ targetModels: models });
          } catch (error) {
            console.error('[Analysis Store] Failed to load target models:', error);
            // Fallback to predefined models
            set({
              targetModels: PREDEFINED_TARGET_MODELS,
              error: 'Failed to load custom target models, using defaults'
            });
          }
        },

        // Save target model
        saveTargetModel: async (modelData: Omit<TargetModel, 'id'>) => {
          const { targetModels } = get();
          const newModel: TargetModel = {
            ...modelData,
            id: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const updatedModels = [...targetModels, newModel];

          await db.userSettings.put({
            key: 'target_models',
            value: updatedModels,
            updatedAt: new Date(),
          });

          set({ targetModels: updatedModels });
          return newModel.id;
        },

        // Delete target model
        deleteTargetModel: async (modelId: string) => {
          const { targetModels, activeTargetModelId } = get();
          const updatedModels = targetModels.filter((m) => m.id !== modelId);

          await db.userSettings.put({
            key: 'target_models',
            value: updatedModels,
            updatedAt: new Date(),
          });

          set({
            targetModels: updatedModels,
            activeTargetModelId:
              activeTargetModelId === modelId ? null : activeTargetModelId,
          });
        },

        // Refresh all analysis data
        refreshAnalysis: async (portfolioId: string) => {
          await get().calculateHealth(portfolioId);
          await get().generateRecommendations(portfolioId);

          const { activeTargetModelId } = get();
          if (activeTargetModelId) {
            await get().calculateRebalancing(portfolioId, activeTargetModelId);
          }
        },

        // Clear error
        clearError: () => {
          set({ error: null });
        },
      }),
      {
        name: 'analysis-store',
        partialize: (state) => ({
          activeProfile: state.activeProfile,
          activeTargetModelId: state.activeTargetModelId,
        }),
      }
    ),
    {
      name: 'analysis-store',
    }
  )
);
