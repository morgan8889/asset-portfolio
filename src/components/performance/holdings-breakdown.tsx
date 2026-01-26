'use client';

/**
 * Holdings Breakdown Component
 *
 * Sortable table showing individual holding performance.
 * Includes gain/loss, percentage change, and portfolio weight.
 *
 * @module components/performance/holdings-breakdown
 */

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { HoldingPerformanceData } from '@/types/performance';

// =============================================================================
// Types
// =============================================================================

type SortField = 'symbol' | 'name' | 'value' | 'gain' | 'percent' | 'weight';
type SortDirection = 'asc' | 'desc';

interface HoldingsBreakdownProps {
  holdings: HoldingPerformanceData[];
  isLoading?: boolean;
  className?: string;
}

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted animate-pulse rounded flex-1" />
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
      <p className="text-sm text-muted-foreground">No holdings to display</p>
      <p className="text-xs text-muted-foreground mt-1">
        Add transactions to see holding performance
      </p>
    </div>
  );
}

// =============================================================================
// Sort Button
// =============================================================================

interface SortButtonProps {
  field: SortField;
  label: string;
  currentSort: SortConfig;
  onSort: (field: SortField) => void;
  className?: string;
}

function SortButton({ field, label, currentSort, onSort, className }: SortButtonProps) {
  const isActive = currentSort.field === field;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-8 px-2 -ml-2', className)}
      onClick={() => onSort(field)}
    >
      {label}
      {isActive ? (
        currentSort.direction === 'asc' ? (
          <ArrowUp className="ml-1 h-4 w-4" />
        ) : (
          <ArrowDown className="ml-1 h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function HoldingsBreakdown({
  holdings,
  isLoading = false,
  className,
}: HoldingsBreakdownProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'percent',
    direction: 'desc',
  });

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    setSortConfig((current) => ({
      field,
      direction:
        current.field === field && current.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  // Sort holdings
  const sortedHoldings = useMemo(() => {
    const sorted = [...holdings];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortConfig.field) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'value':
          comparison = a.currentValue.comparedTo(b.currentValue);
          break;
        case 'gain':
          comparison = a.absoluteGain.comparedTo(b.absoluteGain);
          break;
        case 'percent':
          comparison = a.percentGain - b.percentGain;
          break;
        case 'weight':
          comparison = a.weight - b.weight;
          break;
        default:
          comparison = 0;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [holdings, sortConfig]);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-lg">Holdings Performance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton />
        ) : holdings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="relative overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">
                    <SortButton
                      field="symbol"
                      label="Symbol"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead>
                    <SortButton
                      field="name"
                      label="Name"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton
                      field="value"
                      label="Value"
                      currentSort={sortConfig}
                      onSort={handleSort}
                      className="justify-end ml-auto"
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton
                      field="gain"
                      label="Gain/Loss"
                      currentSort={sortConfig}
                      onSort={handleSort}
                      className="justify-end ml-auto"
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton
                      field="percent"
                      label="Return %"
                      currentSort={sortConfig}
                      onSort={handleSort}
                      className="justify-end ml-auto"
                    />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton
                      field="weight"
                      label="Weight"
                      currentSort={sortConfig}
                      onSort={handleSort}
                      className="justify-end ml-auto"
                    />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedHoldings.map((holding) => {
                  const isPositive = holding.percentGain >= 0;
                  const gainColor = isPositive ? 'text-green-600' : 'text-red-600';
                  const GainIcon = isPositive ? TrendingUp : TrendingDown;

                  return (
                    <TableRow key={holding.holdingId}>
                      <TableCell className="font-medium">
                        {holding.symbol}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {holding.name}
                        {holding.isInterpolated && (
                          <span className="ml-1 text-xs text-muted-foreground">*</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(holding.currentValue.toNumber())}
                      </TableCell>
                      <TableCell className={cn('text-right', gainColor)}>
                        <span className="flex items-center justify-end gap-1">
                          <GainIcon className="h-3 w-3" />
                          {isPositive ? '+' : ''}
                          {formatCurrency(holding.absoluteGain.toNumber())}
                        </span>
                      </TableCell>
                      <TableCell className={cn('text-right font-medium', gainColor)}>
                        {isPositive ? '+' : ''}
                        {holding.percentGain.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {holding.weight.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {sortedHoldings.some((h) => h.isInterpolated) && (
              <p className="text-xs text-muted-foreground mt-2">
                * Holdings marked with asterisk have estimated prices
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default HoldingsBreakdown;
