'use client';

import { useMemo, useEffect } from 'react';
import { Decimal } from 'decimal.js';
import { TaxAnalysisTab } from '@/components/holdings/tax-analysis-tab';
import { usePriceStore, useAssetStore, usePortfolioStore } from '@/lib/stores';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * Tax Analysis Page
 *
 * Displays comprehensive tax analysis for all portfolio holdings.
 * Shows unrealized gains broken down by short-term vs long-term,
 * estimated tax liability, and detailed lot-level analysis.
 */
export default function TaxAnalysisPage() {
  const { currentPortfolio, holdings, loadHoldings, loading } = usePortfolioStore();
  const {
    prices,
    lastFetchTime,
    setWatchedSymbols,
    startPolling,
    stopPolling,
    refreshAllPrices,
    loadPreferences,
  } = usePriceStore();
  const { assets, loadAssets } = useAssetStore();

  // Load holdings and assets when portfolio changes
  useEffect(() => {
    if (currentPortfolio) {
      loadHoldings(currentPortfolio.id);
      loadAssets();
    }
  }, [currentPortfolio, loadHoldings, loadAssets]);

  // Initialize price polling
  useEffect(() => {
    loadPreferences();
    return () => {
      stopPolling();
    };
  }, [loadPreferences, stopPolling]);

  // Set watched symbols and start price polling when holdings/assets load
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
        refreshAllPrices();
        startPolling();
      }
    }
  }, [holdings, assets, setWatchedSymbols, refreshAllPrices, startPolling]);

  // Create asset symbol map (assetId -> symbol)
  const assetSymbolMap = useMemo(() => {
    const map = new Map<string, string>();
    assets.forEach((asset) => {
      map.set(asset.id, asset.symbol);
    });
    return map;
  }, [assets]);

  // Create reverse lookup (symbol -> assetId)
  const symbolToAssetId = useMemo(() => {
    const map = new Map<string, string>();
    assets.forEach((asset) => {
      map.set(asset.symbol.toUpperCase(), asset.id);
    });
    return map;
  }, [assets]);

  // Convert prices Map (keyed by symbol) to Map<string, Decimal> (keyed by assetId)
  // This is what the tax-estimator expects
  // Use lastFetchTime as a recalculation trigger since Map reference doesn't change
  const pricesMap = useMemo(() => {
    const map = new Map<string, Decimal>();
    prices.forEach((priceData, symbol) => {
      if (priceData?.displayPrice != null) {
        const assetId = symbolToAssetId.get(symbol.toUpperCase());
        if (assetId) {
          map.set(assetId, new Decimal(priceData.displayPrice));
        }
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastFetchTime, symbolToAssetId]);

  if (!currentPortfolio) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight">Tax Analysis</h1>
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            Please select a portfolio to view tax analysis.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Tax Analysis</h1>
          <p className="text-muted-foreground">Loading holdings data...</p>
        </div>
      </div>
    );
  }

  if (holdings.length === 0) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Tax Analysis</h1>
          <p className="text-muted-foreground">
            Analyze unrealized gains and estimate tax liability for{' '}
            {currentPortfolio.name}
          </p>
        </div>

        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              You don&apos;t have any holdings yet. Add some transactions to see
              tax analysis.
            </span>
            <Link href="/transactions">
              <Button variant="outline" size="sm">
                Add Transactions
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Tax Analysis</h1>
          <p className="text-muted-foreground">
            Unrealized gains analysis and tax liability estimates for{' '}
            {currentPortfolio.name}
          </p>
        </div>
        <Link href="/settings/tax">
          <Button variant="outline">Tax Settings</Button>
        </Link>
      </div>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          This analysis shows unrealized gains if all positions were sold today.
          Tax rates can be configured in Tax Settings. Consult a tax
          professional for actual tax liability.
        </AlertDescription>
      </Alert>

      <TaxAnalysisTab
        holdings={holdings}
        prices={pricesMap}
        assetSymbolMap={assetSymbolMap}
      />
    </div>
  );
}
