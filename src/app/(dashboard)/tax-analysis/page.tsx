'use client';

import { useMemo } from 'react';
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
  const { currentPortfolio, holdings } = usePortfolioStore();
  const { prices } = usePriceStore();
  const { assets } = useAssetStore();

  // Create asset symbol map
  const assetSymbolMap = useMemo(() => {
    const map = new Map<string, string>();
    assets.forEach((asset) => {
      map.set(asset.id, asset.symbol);
    });
    return map;
  }, [assets]);

  // Convert prices to Map<string, Decimal>
  const pricesMap = useMemo(() => {
    const map = new Map<string, Decimal>();
    Object.entries(prices).forEach(([assetId, price]) => {
      if (price !== null && price !== undefined) {
        map.set(assetId, new Decimal(price));
      }
    });
    return map;
  }, [prices]);

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
