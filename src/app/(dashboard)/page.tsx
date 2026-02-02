'use client';

import { useEffect } from 'react';
import {
  DashboardProvider,
  useDashboardContext,
  DashboardHeader,
  DashboardContainer,
  DashboardLoadingState,
  DashboardErrorState,
  DashboardEmptyState,
} from '@/components/dashboard';
import { HoldingsTable } from '@/components/tables/holdings-table';
import {
  usePriceStore,
  usePortfolioStore,
  useDashboardStore,
} from '@/lib/stores';

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardContent />
    </DashboardProvider>
  );
}

function DashboardContent() {
  const { currentPortfolio, loading, error, loadPortfolios } =
    useDashboardContext();
  const { holdings, assets } = usePortfolioStore();
  const {
    loadPreferences,
    setWatchedSymbols,
    startPolling,
    stopPolling,
    refreshAllPrices,
  } = usePriceStore();
  const { loadConfig } = useDashboardStore();

  // Initialize dashboard config and price polling when dashboard mounts
  useEffect(() => {
    // Load dashboard configuration from IndexedDB
    loadConfig();
    // Load price preferences from IndexedDB
    loadPreferences();

    return () => {
      // Cleanup polling on unmount
      stopPolling();
    };
  }, [loadConfig, loadPreferences, stopPolling]);

  // Update watched symbols when holdings change
  useEffect(() => {
    if (holdings.length > 0 && assets.length > 0) {
      const symbols = holdings
        .map((h) => {
          const asset = assets.find((a) => a.id === h.assetId);
          return asset?.symbol;
        })
        .filter((s): s is string => !!s);

      if (symbols.length > 0) {
        setWatchedSymbols(symbols);
        // Fetch prices immediately and start polling
        refreshAllPrices();
        startPolling();
      }
    }
  }, [holdings, assets, setWatchedSymbols, refreshAllPrices, startPolling]);

  if (loading) {
    return <DashboardLoadingState />;
  }

  if (error) {
    return <DashboardErrorState error={error} onRetry={loadPortfolios} />;
  }

  if (!currentPortfolio) {
    return <DashboardEmptyState />;
  }

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <DashboardContainer />
      <HoldingsTable />
    </div>
  );
}
