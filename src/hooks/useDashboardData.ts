'use client';

import { useEffect, useMemo, useCallback, useRef } from 'react';
import {
  usePortfolioStore,
  useTransactionStore,
  useAssetStore,
} from '@/lib/stores';
import {
  Portfolio,
  PortfolioMetrics,
  Transaction,
  Asset,
  Holding,
} from '@/types';

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
    setCurrentPortfolio,
  } = usePortfolioStore();

  // Get stable action references via getState() to avoid effect dependency issues with devtools middleware
  const {
    loadPortfolios,
    loadHoldings,
    calculateMetrics,
    refreshData: refreshPortfolioData,
  } = usePortfolioStore.getState();

  const { transactions, loading: transactionsLoading } = useTransactionStore();

  // Get stable action references via getState()
  const { loadTransactions } = useTransactionStore.getState();

  const { assets, loading: assetsLoading } = useAssetStore();

  // Get stable action references via getState()
  const { loadAssets } = useAssetStore.getState();

  // Refs to prevent duplicate calls during React Strict Mode remounting
  const initialLoadStartedRef = useRef(false);
  const loadedPortfolioIdRef = useRef<string | null>(null);

  // Load all data on mount
  useEffect(() => {
    // Prevent duplicate calls during React Strict Mode remounting
    if (initialLoadStartedRef.current) {
      return;
    }
    initialLoadStartedRef.current = true;

    const loadInitialData = async () => {
      // Load portfolios and assets in parallel
      await Promise.all([loadPortfolios(), loadAssets()]);
    };

    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actions from getState() are stable
  }, []);

  // Auto-select first portfolio if none selected
  useEffect(() => {
    if (portfolios.length > 0 && !currentPortfolio) {
      setCurrentPortfolio(portfolios[0]);
    }
  }, [portfolios, currentPortfolio, setCurrentPortfolio]);

  // Load holdings and metrics when portfolio changes (handles both fresh selection and rehydration)
  // IMPORTANT: Only run after portfolios are loaded to avoid race condition with loadPortfolios
  useEffect(() => {
    // Skip if no portfolios loaded yet or no current portfolio
    if (portfolios.length === 0 || !currentPortfolio?.id) {
      return;
    }

    // Skip if we've already loaded this portfolio (prevents duplicate calls during Strict Mode)
    if (loadedPortfolioIdRef.current === currentPortfolio.id) {
      return;
    }

    // Skip if this portfolio is already loading (race condition guard)
    const { _loadingHoldingsForId } = usePortfolioStore.getState();
    if (_loadingHoldingsForId === currentPortfolio.id) {
      return;
    }

    // Mark this portfolio as loaded AFTER async operations complete
    const loadData = async () => {
      await loadHoldings(currentPortfolio.id);
      await calculateMetrics(currentPortfolio.id);
      loadedPortfolioIdRef.current = currentPortfolio.id;
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actions from getState() are stable
  }, [portfolios.length, currentPortfolio?.id]);

  // Load transactions when portfolio changes
  // IMPORTANT: Only run after portfolios are loaded to avoid race condition with loadPortfolios
  // Note: This effect shares the loadedPortfolioIdRef guard with holdings effect
  useEffect(() => {
    // Skip if no portfolios loaded yet or no current portfolio
    if (portfolios.length === 0 || !currentPortfolio?.id) {
      return;
    }

    // Note: We don't need a separate ref here because transactions loading
    // is controlled by the same portfolio change that triggers holdings loading
    loadTransactions(currentPortfolio.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actions from getState() are stable
  }, [portfolios.length, currentPortfolio?.id]);

  // Memoized recent transactions (sorted by date, limited to 5)
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Memoized metric values with safe defaults
  const derivedMetrics = useMemo(() => {
    const totalValue = metrics?.totalValue
      ? parseFloat(metrics.totalValue.toString())
      : 0;
    const totalGain = metrics?.totalGain
      ? parseFloat(metrics.totalGain.toString())
      : 0;
    const totalGainPercent = metrics?.totalGainPercent || 0;
    const dayChange = metrics?.dayChange
      ? parseFloat(metrics.dayChange.toString())
      : 0;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actions from getState() are stable
  }, [currentPortfolio?.id]);

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
