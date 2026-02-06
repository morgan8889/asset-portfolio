'use client';

import { useMemo, useState } from 'react';
import Decimal from 'decimal.js';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { Holding } from '@/types/asset';
import { estimateTaxLiability } from '@/lib/services/tax-estimator';
import { useTaxSettingsStore } from '@/lib/stores/tax-settings';
import { cn } from '@/lib/utils';
import {
  checkDispositionStatus,
  getDispositionReason,
  getTaxImplicationMessage,
} from '@/lib/services/espp-validator';

interface TaxAnalysisTabProps {
  holdings: Holding[];
  prices: Map<string, Decimal>;
  assetSymbolMap: Map<string, string>;
}

type SortField =
  | 'purchaseDate'
  | 'quantity'
  | 'costBasis'
  | 'currentValue'
  | 'unrealizedGain'
  | 'holdingPeriod';
type SortDirection = 'asc' | 'desc';

/**
 * Tax Analysis Tab Component
 *
 * Displays comprehensive tax analysis for portfolio holdings:
 * - Summary cards showing total unrealized gains and estimated tax liability
 * - Detailed tax lot table with ST/LT classification
 * - Sortable columns for analysis
 * - ESPP disqualifying disposition warnings
 *
 * Features:
 * - Real-time tax calculations based on user settings
 * - Color-coded holding periods (green=LT, yellow=ST)
 * - Lot type badges (Standard, ESPP, RSU)
 * - Sortable table for flexible analysis
 */
export function TaxAnalysisTab({
  holdings,
  prices,
  assetSymbolMap,
}: TaxAnalysisTabProps) {
  const { taxSettings } = useTaxSettingsStore();
  const [sortField, setSortField] = useState<SortField>('purchaseDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Calculate tax analysis
  const taxAnalysis = useMemo(
    () => estimateTaxLiability(holdings, prices, taxSettings, assetSymbolMap),
    [holdings, prices, taxSettings, assetSymbolMap]
  );

  // Handle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort lots
  const sortedLots = useMemo(() => {
    return [...taxAnalysis.lots].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'purchaseDate':
          comparison = a.purchaseDate.getTime() - b.purchaseDate.getTime();
          break;
        case 'quantity':
          comparison = a.quantity.minus(b.quantity).toNumber();
          break;
        case 'costBasis':
          comparison = a.costBasis.minus(b.costBasis).toNumber();
          break;
        case 'currentValue':
          comparison = a.currentValue.minus(b.currentValue).toNumber();
          break;
        case 'unrealizedGain':
          comparison = a.unrealizedGain.minus(b.unrealizedGain).toNumber();
          break;
        case 'holdingPeriod':
          comparison =
            a.holdingPeriod === b.holdingPeriod
              ? 0
              : a.holdingPeriod === 'long'
                ? 1
                : -1;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [taxAnalysis.lots, sortField, sortDirection]);

  // Stable loading logic based on actual data state
  // Only show loading if we have holdings but no tax lots AND no prices yet
  const isLoading = holdings.length > 0 && taxAnalysis.lots.length === 0 && prices.size === 0;

  const SortButton = ({
    field,
    label,
  }: {
    field: SortField;
    label: string;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-8 px-2 hover:bg-transparent"
    >
      {label}
      <ArrowUpDown
        className={cn('ml-2 h-4 w-4', sortField === field && 'text-primary')}
      />
    </Button>
  );

  // Loading state - only show when genuinely waiting for price data
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="mt-2 h-3 w-40" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <Skeleton className="mb-4 h-6 w-48" />
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards - Reduced to 3 for compactness */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Net Unrealized Gain/Loss</p>
            <p
              className={cn(
                'mt-1 text-2xl font-semibold',
                taxAnalysis.netUnrealizedGain.lessThan(0) && 'text-red-600 dark:text-red-400'
              )}
            >
              ${taxAnalysis.netUnrealizedGain.toFixed(2)}
            </p>
            <p className="mt-2 truncate text-sm text-muted-foreground">
              Gains: ${taxAnalysis.totalUnrealizedGain.toFixed(0)} / Losses: $
              {taxAnalysis.totalUnrealizedLoss.toFixed(0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Short-Term / Long-Term</p>
            <p className="mt-1 text-2xl font-semibold">
              <span className="text-yellow-600 dark:text-yellow-400">
                ${taxAnalysis.shortTermGains.toFixed(0)}
              </span>
              {' / '}
              <span className="text-green-600 dark:text-green-400">
                ${taxAnalysis.longTermGains.toFixed(0)}
              </span>
            </p>
            <p className="mt-2 truncate text-sm text-muted-foreground">
              Taxed at {taxSettings.shortTermRate.mul(100).toFixed(1)}% /{' '}
              {taxSettings.longTermRate.mul(100).toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Estimated Tax Liability</p>
            <p className="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
              ${taxAnalysis.totalEstimatedTax.toFixed(2)}
            </p>
            <p className="mt-2 truncate text-sm text-muted-foreground">If all sold today</p>
          </CardContent>
        </Card>
      </div>

      {/* Tax Lot Table */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-center justify-between px-4 pt-4">
            <div>
              <h3 className="text-lg font-semibold">Tax Lot Analysis</h3>
              <p className="text-sm text-muted-foreground">
                {sortedLots.length} lot{sortedLots.length !== 1 ? 's' : ''}{' '}
                across all holdings
              </p>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-20">Asset</TableHead>
                  <TableHead className="w-28">
                    <SortButton field="purchaseDate" label="Date" />
                  </TableHead>
                  <TableHead className="w-20 text-right">
                    <SortButton field="quantity" label="Qty" />
                  </TableHead>
                  <TableHead className="w-24 text-right">
                    <SortButton field="costBasis" label="Cost" />
                  </TableHead>
                  <TableHead className="w-24 text-right">
                    <SortButton field="currentValue" label="Value" />
                  </TableHead>
                  <TableHead className="w-24 text-right">
                    <SortButton field="unrealizedGain" label="Gain" />
                  </TableHead>
                  <TableHead className="w-24">
                    <SortButton field="holdingPeriod" label="Period" />
                  </TableHead>
                  <TableHead className="w-20">Type</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLots.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground"
                    >
                      No tax lots to display
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedLots.map((lot, index) => (
                    <TableRow key={`${lot.lotId}-${index}`}>
                      <TableCell className="py-2 font-medium">
                        {lot.assetSymbol}
                      </TableCell>
                      <TableCell className="py-2 text-sm">
                        {format(lot.purchaseDate, 'MM/dd/yy')}
                      </TableCell>
                      <TableCell className="py-2 text-right text-sm">
                        {lot.quantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="py-2 text-right text-sm">
                        ${lot.costBasis.toFixed(0)}
                      </TableCell>
                      <TableCell className="py-2 text-right text-sm">
                        ${lot.currentValue.toFixed(0)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'py-2 text-right text-sm font-medium',
                          lot.unrealizedGain.greaterThan(0)
                            ? 'text-green-600 dark:text-green-400'
                            : lot.unrealizedGain.lessThan(0)
                              ? 'text-red-600 dark:text-red-400'
                              : ''
                        )}
                      >
                        ${lot.unrealizedGain.toFixed(0)}
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            lot.holdingPeriod === 'long'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          )}
                          aria-label={
                            lot.holdingPeriod === 'long'
                              ? 'Long-term'
                              : 'Short-term'
                          }
                        >
                          {lot.holdingPeriod === 'long' ? 'LT' : 'ST'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          aria-label={
                            lot.lotType === 'espp'
                              ? 'ESPP (Employee Stock Purchase Plan)'
                              : lot.lotType === 'rsu'
                                ? 'RSU (Restricted Stock Unit)'
                                : 'Standard'
                          }
                        >
                          {lot.lotType === 'espp'
                            ? 'ESPP'
                            : lot.lotType === 'rsu'
                              ? 'RSU'
                              : 'Std'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        {lot.lotType === 'espp' && lot.grantDate ? (
                          (() => {
                            const hypotheticalSellDate = new Date();
                            const dispositionCheck = checkDispositionStatus(
                              lot.grantDate,
                              lot.purchaseDate,
                              hypotheticalSellDate
                            );
                            const reason =
                              getDispositionReason(dispositionCheck);
                            const bargainElementValue =
                              lot.bargainElement || new Decimal(0);
                            const message = getTaxImplicationMessage(
                              dispositionCheck,
                              bargainElementValue
                            );

                            // Calculate days manually
                            const daysFromGrant = Math.floor(
                              (hypotheticalSellDate.getTime() -
                                lot.grantDate.getTime()) /
                                (1000 * 60 * 60 * 24)
                            );
                            const daysFromPurchase = Math.floor(
                              (hypotheticalSellDate.getTime() -
                                lot.purchaseDate.getTime()) /
                                (1000 * 60 * 60 * 24)
                            );
                            const daysUntilTwoYearsFromGrant = Math.max(
                              0,
                              Math.floor(
                                (dispositionCheck.twoYearsFromGrant.getTime() -
                                  hypotheticalSellDate.getTime()) /
                                  (1000 * 60 * 60 * 24)
                              )
                            );
                            const daysUntilOneYearFromPurchase = Math.max(
                              0,
                              Math.floor(
                                (dispositionCheck.oneYearFromPurchase.getTime() -
                                  hypotheticalSellDate.getTime()) /
                                  (1000 * 60 * 60 * 24)
                              )
                            );

                            if (dispositionCheck.isQualifying) {
                              return (
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-xs text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  aria-label="Qualifying disposition"
                                >
                                  ✓
                                </Badge>
                              );
                            }

                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant="outline"
                                      className="cursor-help bg-amber-50 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-400"
                                      aria-label="Disqualifying disposition warning"
                                    >
                                      ⚠️
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium">
                                        {message}
                                      </p>
                                      <div className="space-y-1 text-xs text-muted-foreground">
                                        <div>
                                          Grant to today: {daysFromGrant} days (
                                          {dispositionCheck.meetsGrantRequirement
                                            ? '✓'
                                            : '✗'}{' '}
                                          need {daysUntilTwoYearsFromGrant}{' '}
                                          more)
                                        </div>
                                        <div>
                                          Purchase to today: {daysFromPurchase}{' '}
                                          days (
                                          {dispositionCheck.meetsPurchaseRequirement
                                            ? '✓'
                                            : '✗'}{' '}
                                          need {daysUntilOneYearFromPurchase}{' '}
                                          more)
                                        </div>
                                      </div>
                                      <p className="text-xs text-amber-600 dark:text-amber-400">
                                        If sold today, bargain element would be
                                        taxed as ordinary income
                                      </p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}
