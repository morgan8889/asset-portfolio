'use client';

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import Decimal from 'decimal.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Holding } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { TaxAnalysisTab } from './tax-analysis-tab';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface HoldingDetailModalProps {
  holding: Holding;
  assetSymbol: string;
  assetName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPrice?: number;
}

export function HoldingDetailModal({
  holding,
  assetSymbol,
  assetName,
  open,
  onOpenChange,
  currentPrice,
}: HoldingDetailModalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Create single-holding maps for TaxAnalysisTab
  const pricesMap = useMemo(() => {
    const map = new Map<string, Decimal>();
    if (currentPrice) {
      map.set(holding.assetId, new Decimal(currentPrice));
    }
    return map;
  }, [currentPrice, holding.assetId]);

  const assetSymbolMap = useMemo(() => {
    const map = new Map<string, string>();
    map.set(holding.assetId, assetSymbol);
    return map;
  }, [holding.assetId, assetSymbol]);

  // Calculate metrics
  const totalCost = holding.costBasis;
  const currentValue = currentPrice
    ? holding.quantity.mul(currentPrice)
    : holding.currentValue;
  const unrealizedGain = currentValue.minus(totalCost);
  const unrealizedGainPercent = totalCost.greaterThan(0)
    ? unrealizedGain.div(totalCost).mul(100).toNumber()
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {assetSymbol} - Holding Details
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{assetName}</p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="lots">Tax Lots</TabsTrigger>
            <TabsTrigger value="tax">Tax Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card className="p-4">
                <div className="mb-1 text-sm text-muted-foreground">
                  Quantity
                </div>
                <div className="text-2xl font-bold">
                  {holding.quantity.toFixed(4)}
                </div>
              </Card>

              <Card className="p-4">
                <div className="mb-1 text-sm text-muted-foreground">
                  Average Cost
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(holding.averageCost.toNumber())}
                </div>
              </Card>

              <Card className="p-4">
                <div className="mb-1 text-sm text-muted-foreground">
                  Cost Basis
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(totalCost.toNumber())}
                </div>
              </Card>

              <Card className="p-4">
                <div className="mb-1 text-sm text-muted-foreground">
                  Current Value
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(currentValue.toNumber())}
                </div>
              </Card>
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="mb-1 text-sm text-muted-foreground">
                    Unrealized Gain/Loss
                  </div>
                  <div
                    className={`flex items-center gap-2 text-3xl font-bold ${
                      unrealizedGain.greaterThanOrEqualTo(0)
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {unrealizedGain.greaterThanOrEqualTo(0) ? (
                      <TrendingUp className="h-8 w-8" />
                    ) : (
                      <TrendingDown className="h-8 w-8" />
                    )}
                    {formatCurrency(unrealizedGain.toNumber())}
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-1 text-sm text-muted-foreground">
                    Percentage
                  </div>
                  <div
                    className={`text-3xl font-bold ${
                      unrealizedGain.greaterThanOrEqualTo(0)
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {unrealizedGainPercent >= 0 ? '+' : ''}
                    {unrealizedGainPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="mb-2 text-sm text-muted-foreground">
                  Last Updated
                </div>
                <div className="text-lg font-medium">
                  {format(holding.lastUpdated, 'MMM dd, yyyy HH:mm')}
                </div>
              </Card>

              <Card className="p-4">
                <div className="mb-2 text-sm text-muted-foreground">
                  Number of Lots
                </div>
                <div className="text-lg font-medium">{holding.lots.length}</div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lots" className="mt-4 space-y-4">
            {holding.lots.length === 0 ? (
              <Card className="p-8">
                <p className="text-center text-muted-foreground">
                  No tax lots found for this holding
                </p>
              </Card>
            ) : (
              holding.lots.map((lot) => (
                <Card key={lot.id} className="p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          lot.lotType === 'espp'
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                            : lot.lotType === 'rsu'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                        }
                      >
                        {lot.lotType === 'espp'
                          ? 'ESPP'
                          : lot.lotType === 'rsu'
                            ? 'RSU'
                            : 'Standard'}
                      </Badge>
                      <span className="text-sm font-medium">
                        {format(lot.purchaseDate, 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {lot.remainingQuantity.toFixed(4)} shares
                      </div>
                      <div className="text-xs text-muted-foreground">
                        @ {formatCurrency(lot.purchasePrice.toNumber())}/share
                      </div>
                    </div>
                  </div>

                  {/* ESPP-specific metadata */}
                  {lot.lotType === 'espp' && (
                    <div className="mb-3 grid grid-cols-2 gap-3 rounded bg-purple-50 p-3 dark:bg-purple-950/20">
                      {lot.grantDate && (
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Grant Date
                          </div>
                          <div className="text-sm font-medium">
                            {format(lot.grantDate, 'MMM dd, yyyy')}
                          </div>
                        </div>
                      )}
                      {lot.bargainElement && (
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Bargain Element
                          </div>
                          <div className="text-sm font-medium text-purple-700 dark:text-purple-400">
                            {formatCurrency(lot.bargainElement.toNumber())}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* RSU-specific metadata */}
                  {lot.lotType === 'rsu' && (
                    <div className="mb-3 grid grid-cols-2 gap-3 rounded bg-blue-50 p-3 dark:bg-blue-950/20">
                      {lot.vestingDate && (
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Vesting Date
                          </div>
                          <div className="text-sm font-medium">
                            {format(lot.vestingDate, 'MMM dd, yyyy')}
                          </div>
                        </div>
                      )}
                      {lot.vestingPrice && (
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Vesting Price (FMV)
                          </div>
                          <div className="text-sm font-medium text-blue-700 dark:text-blue-400">
                            {formatCurrency(lot.vestingPrice.toNumber())}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 border-t pt-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Total Cost</div>
                      <div className="font-medium">
                        {formatCurrency(
                          lot.purchasePrice
                            .mul(lot.remainingQuantity)
                            .toNumber()
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Purchased</div>
                      <div className="font-medium">
                        {lot.quantity.toFixed(4)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Sold</div>
                      <div className="font-medium">
                        {lot.soldQuantity.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  {lot.notes && (
                    <div className="mt-3 border-t pt-3">
                      <div className="mb-1 text-xs text-muted-foreground">
                        Notes
                      </div>
                      <div className="text-sm">{lot.notes}</div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="tax" className="mt-4">
            <TaxAnalysisTab
              holdings={[holding]}
              prices={pricesMap}
              assetSymbolMap={assetSymbolMap}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
