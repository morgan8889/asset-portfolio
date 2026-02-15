'use client';

import { useEffect, useMemo } from 'react';
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
import { PRICEABLE_ASSET_TYPES } from '@/types/portfolio';

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
  const { loadConfig } = useDashboardStore();

  // Get stable action references via getState() to avoid effect re-runs from devtools middleware
  const {
    loadPreferences,
    setWatchedSymbols,
    startPolling,
    stopPolling,
    refreshAllPrices,
  } = usePriceStore.getState();

  // Derive a stable symbol key so the price effect only re-runs when actual symbols change
  const symbolsKey = useMemo(() => {
    if (holdings.length === 0 || assets.length === 0) return '';
    return holdings
      .map((h) => {
        const asset = assets.find((a) => a.id === h.assetId);
        if (!asset || !PRICEABLE_ASSET_TYPES.has(asset.type)) return null;
        return asset.symbol;
      })
      .filter(Boolean)
      .sort()
      .join(',');
  }, [holdings, assets]);

  // Initialize dashboard config and price polling when dashboard mounts
  useEffect(() => {
    // Load dashboard configuration from IndexedDB
    // Note: loadConfig() has built-in error handling and falls back to defaults if it fails
    loadConfig().catch((err) => {
      console.error('Dashboard config failed to load, using defaults:', err);
      // Store handles fallback to DEFAULT_DASHBOARD_CONFIG automatically
    });

    // Load price preferences from IndexedDB
    loadPreferences();

    return () => {
      // Cleanup polling on unmount
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actions from getState() are stable
  }, []);

  // Update watched symbols when the set of priceable symbols changes
  useEffect(() => {
    if (!symbolsKey) return;
    const symbols = symbolsKey.split(',');
    setWatchedSymbols(symbols);
    refreshAllPrices();
    startPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actions from getState() are stable
  }, [symbolsKey]);

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
