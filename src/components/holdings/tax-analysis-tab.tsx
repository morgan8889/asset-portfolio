'use client';

import { useMemo, useState } from 'react';
import { Decimal } from 'decimal.js';
import {
  Card,
  Metric,
  Text,
  Flex,
  Grid,
} from '@tremor/react';
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
import { ArrowUpDown, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { Holding } from '@/types/asset';
import { estimateTaxLiability } from '@/lib/services/tax-estimator';
import { useTaxSettingsStore } from '@/lib/stores/tax-settings';
import { cn } from '@/lib/utils';

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
    () => estimateTaxLiability(holdings, prices, taxSettings),
    [holdings, prices, taxSettings]
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
          comparison =
            a.purchaseDate.getTime() - b.purchaseDate.getTime();
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
          comparison = a.holdingPeriod === b.holdingPeriod ? 0 : a.holdingPeriod === 'long' ? 1 : -1;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [taxAnalysis.lots, sortField, sortDirection]);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="h-8 px-2 hover:bg-transparent"
    >
      {label}
      <ArrowUpDown className={cn(
        "ml-2 h-4 w-4",
        sortField === field && "text-primary"
      )} />
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <Grid numItemsMd={2} numItemsLg={4} className="gap-6">
        <Card>
          <Text>Total Unrealized Gains</Text>
          <Metric>
            ${taxAnalysis.totalUnrealizedGain.toFixed(2)}
          </Metric>
          <Flex className="mt-2">
            <Text className="truncate text-sm">
              Net after losses
            </Text>
          </Flex>
        </Card>

        <Card>
          <Text>Short-Term Gains</Text>
          <Metric className="text-yellow-600">
            ${taxAnalysis.shortTermGains.toFixed(2)}
          </Metric>
          <Flex className="mt-2">
            <Text className="truncate text-sm">
              Taxed at {taxSettings.shortTermRate.mul(100).toFixed(1)}%
            </Text>
          </Flex>
        </Card>

        <Card>
          <Text>Long-Term Gains</Text>
          <Metric className="text-green-600">
            ${taxAnalysis.longTermGains.toFixed(2)}
          </Metric>
          <Flex className="mt-2">
            <Text className="truncate text-sm">
              Taxed at {taxSettings.longTermRate.mul(100).toFixed(1)}%
            </Text>
          </Flex>
        </Card>

        <Card>
          <Text>Estimated Tax Liability</Text>
          <Metric className="text-red-600">
            ${taxAnalysis.totalEstimatedTax.toFixed(2)}
          </Metric>
          <Flex className="mt-2">
            <Text className="truncate text-sm">
              If all sold today
            </Text>
          </Flex>
        </Card>
      </Grid>

      {/* Tax Lot Table */}
      <Card>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Tax Lot Analysis</h3>
              <p className="text-sm text-muted-foreground">
                {sortedLots.length} lot{sortedLots.length !== 1 ? 's' : ''} across all holdings
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead>
                    <SortButton field="purchaseDate" label="Purchase Date" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="quantity" label="Quantity" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="costBasis" label="Cost Basis" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="currentValue" label="Current Value" />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton field="unrealizedGain" label="Gain/Loss" />
                  </TableHead>
                  <TableHead>
                    <SortButton field="holdingPeriod" label="Period" />
                  </TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedLots.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No tax lots to display
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedLots.map((lot, index) => (
                    <TableRow key={`${lot.lotId}-${index}`}>
                      <TableCell className="font-medium">
                        {lot.assetSymbol}
                      </TableCell>
                      <TableCell>
                        {format(lot.purchaseDate, 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        {lot.quantity.toFixed(4)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${lot.costBasis.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${lot.currentValue.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium',
                          lot.unrealizedGain.greaterThan(0)
                            ? 'text-green-600'
                            : lot.unrealizedGain.lessThan(0)
                              ? 'text-red-600'
                              : ''
                        )}
                      >
                        ${lot.unrealizedGain.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            lot.holdingPeriod === 'long'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          }
                        >
                          {lot.holdingPeriod === 'long' ? 'Long-Term' : 'Short-Term'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {lot.lotType === 'espp'
                              ? 'ESPP'
                              : lot.lotType === 'rsu'
                                ? 'RSU'
                                : 'Standard'}
                          </Badge>
                          {lot.lotType === 'espp' && lot.bargainElement && (
                            <span
                              className="text-xs text-muted-foreground"
                              title={`Bargain element: $${lot.bargainElement.toFixed(2)}`}
                            >
                              💰
                            </span>
                          )}
                        </div>
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
