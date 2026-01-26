'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  Portfolio,
  PortfolioMetrics,
  Transaction,
  Asset,
  Holding,
} from '@/types';

interface DashboardContextValue {
  // Portfolio state
  currentPortfolio: Portfolio | null;
  portfolios: Portfolio[];
  metrics: PortfolioMetrics | null;
  holdings: Holding[];
  assets: Asset[];

  // Transaction state
  transactions: Transaction[];
  recentTransactions: Transaction[];

  // Loading states
  loading: boolean;
  isLoading: boolean;
  transactionsLoading: boolean;

  // Error state
  error: string | null;

  // Actions
  loadPortfolios: () => Promise<void>;
  setCurrentPortfolio: (portfolio: Portfolio | null) => void;
  refreshData: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboardContext() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error(
      'useDashboardContext must be used within DashboardProvider'
    );
  }
  return context;
}

interface DashboardProviderProps {
  children: ReactNode;
}

/**
 * DashboardProvider uses useDashboardData internally to consolidate
 * all data fetching logic in one place and eliminate duplicate useEffects.
 */
export function DashboardProvider({ children }: DashboardProviderProps) {
  const dashboardData = useDashboardData();

  const value: DashboardContextValue = {
    // Core state
    currentPortfolio: dashboardData.currentPortfolio,
    portfolios: dashboardData.portfolios,
    metrics: dashboardData.metrics,
    holdings: dashboardData.holdings,
    assets: dashboardData.assets,

    // Transaction state
    transactions: dashboardData.transactions,
    recentTransactions: dashboardData.recentTransactions,

    // Loading states - provide both for backward compatibility
    loading: dashboardData.isPortfolioLoading,
    isLoading: dashboardData.isLoading,
    transactionsLoading: dashboardData.isTransactionsLoading,

    // Error state
    error: dashboardData.error,

    // Actions
    loadPortfolios: dashboardData.loadPortfolios,
    setCurrentPortfolio: dashboardData.setCurrentPortfolio,
    refreshData: dashboardData.refreshData,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
