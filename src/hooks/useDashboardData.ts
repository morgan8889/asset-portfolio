'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { usePortfolioStore, useTransactionStore, useAssetStore } from '@/lib/stores';
import { Portfolio, PortfolioMetrics, Transaction, Asset, Holding } from '@/types';

interface DashboardData {
  // Core state
  currentPortfolio: Portfolio | null;
  portfolios: Portfolio[];
  metrics: PortfolioMetrics | null;
  holdings: Holding[];
  assets: Asset[];
  transactions: Transaction[];

  // Loading states
  isLoading: boolean;
  isPortfolioLoading: boolean;
  isTransactionsLoading: boolean;
  isAssetsLoading: boolean;

  // Error states
  error: string | null;

  // Derived data
  recentTransactions: Transaction[];
  totalValue: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;

  // Actions
  loadPortfolios: () => Promise<void>;
  setCurrentPortfolio: (portfolio: Portfolio | null) => void;
  refreshData: () => Promise<void>;
}

/**
 * Consolidated hook for all dashboard data needs.
 * Fetches data in parallel and provides loading/error states.
 */
export function useDashboardData(): DashboardData {
  const {
    currentPortfolio,
    portfolios,
    metrics,
    holdings,
    loading: portfolioLoading,
    error: portfolioError,
    loadPortfolios,
    setCurrentPortfolio,
    refreshData: refreshPortfolioData,
  } = usePortfolioStore();

  const {
    transactions,
    loading: transactionsLoading,
    loadTransactions,
  } = useTransactionStore();

  const {
    assets,
    loading: assetsLoading,
    loadAssets,
  } = useAssetStore();

  // Load all data on mount
  useEffect(() => {
    const loadInitialData = async () => {
      // Load portfolios and assets in parallel
      await Promise.all([loadPortfolios(), loadAssets()]);
    };

    loadInitialData();
  }, [loadPortfolios, loadAssets]);

  // Auto-select first portfolio if none selected
  useEffect(() => {
    if (portfolios.length > 0 && !currentPortfolio) {
      setCurrentPortfolio(portfolios[0]);
    }
  }, [portfolios, currentPortfolio, setCurrentPortfolio]);

  // Load transactions when portfolio changes
  useEffect(() => {
    if (currentPortfolio?.id) {
      loadTransactions(currentPortfolio.id);
    }
  }, [currentPortfolio?.id, loadTransactions]);

  // Memoized recent transactions (sorted by date, limited to 5)
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Memoized metric values with safe defaults
  const derivedMetrics = useMemo(() => {
    const totalValue = metrics?.totalValue ? parseFloat(metrics.totalValue.toString()) : 0;
    const totalGain = metrics?.totalGain ? parseFloat(metrics.totalGain.toString()) : 0;
    const totalGainPercent = metrics?.totalGainPercent || 0;
    const dayChange = metrics?.dayChange ? parseFloat(metrics.dayChange.toString()) : 0;
    const dayChangePercent = metrics?.dayChangePercent || 0;

    return {
      totalValue,
      totalGain,
      totalGainPercent,
      dayChange,
      dayChangePercent,
    };
  }, [metrics]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([refreshPortfolioData(), loadAssets()]);
    if (currentPortfolio?.id) {
      await loadTransactions(currentPortfolio.id);
    }
  }, [refreshPortfolioData, loadAssets, currentPortfolio?.id, loadTransactions]);

  // Combined loading state
  const isLoading = portfolioLoading || transactionsLoading || assetsLoading;

  return {
    // Core state
    currentPortfolio,
    portfolios,
    metrics,
    holdings,
    assets,
    transactions,

    // Loading states
    isLoading,
    isPortfolioLoading: portfolioLoading,
    isTransactionsLoading: transactionsLoading,
    isAssetsLoading: assetsLoading,

    // Error states
    error: portfolioError,

    // Derived data
    recentTransactions,
    ...derivedMetrics,

    // Actions
    loadPortfolios,
    setCurrentPortfolio,
    refreshData,
  };
}
