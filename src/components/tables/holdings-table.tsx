'use client';

import { useState, useMemo, memo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Search,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  DollarSign,
} from 'lucide-react';
import { usePortfolioStore, usePriceStore } from '@/lib/stores';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { PriceDisplay } from '@/components/dashboard/price-display';
import { Holding, LivePriceData, Exchange } from '@/types';
import { getExchangeBadgeColor } from '@/lib/services/asset-search';
import { isUKSymbol } from '@/lib/utils/market-utils';

interface HoldingDisplayData {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
  type: string;
  exchange?: string;
}

const HoldingsTableComponent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] =
    useState<keyof HoldingDisplayData>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const { holdings, assets, currentPortfolio, loading, error, clearError } =
    usePortfolioStore();

  // Get live prices from the price store
  const {
    prices: livePrices,
    loading: priceLoading,
    preferences,
  } = usePriceStore();

  // Holdings are loaded by useDashboardData hook - no need to load here

  // Get live price for a symbol
  const getLivePrice = useCallback(
    (symbol: string): LivePriceData | undefined => {
      return livePrices.get(symbol.toUpperCase());
    },
    [livePrices]
  );

  // Transform real holdings data for display
  const displayHoldings = useMemo((): HoldingDisplayData[] => {
    return holdings.map((holding) => {
      const asset = assets.find((a) => a.id === holding.assetId);
      const symbol = asset?.symbol || holding.assetId;

      // Try to get live price from price store
      const livePrice = getLivePrice(symbol);
      const livePriceValue = livePrice
        ? parseFloat(livePrice.displayPrice)
        : undefined;

      const costBasis = parseFloat(holding.costBasis.toString());
      const quantity = parseFloat(holding.quantity.toString());

      // Use live price if available, otherwise fall back to stored price
      const currentPrice =
        livePriceValue !== undefined
          ? livePriceValue
          : quantity > 0
            ? parseFloat(holding.currentValue.toString()) / quantity
            : 0;

      const currentValue = quantity * currentPrice;
      const gainLoss = currentValue - costBasis;
      const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;

      return {
        id: holding.id,
        symbol,
        name: asset?.name || 'Unknown Asset',
        quantity,
        currentPrice,
        currentValue,
        costBasis,
        gainLoss,
        gainLossPercent,
        type: asset?.type || 'other',
        exchange: asset?.exchange || livePrice?.exchange,
      };
    });
  }, [holdings, assets, getLivePrice]);

  const filteredAndSortedHoldings = useMemo(() => {
    let filtered = displayHoldings.filter(
      (holding) =>
        holding.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        holding.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortField] ?? '';
      const bValue = b[sortField] ?? '';

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [displayHoldings, searchTerm, sortField, sortDirection]);

  const handleSort = (field: keyof HoldingDisplayData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRetry = useCallback(() => {
    clearError();
    if (currentPortfolio?.id) {
      usePortfolioStore.getState().loadHoldings(currentPortfolio.id);
    }
  }, [clearError, currentPortfolio?.id]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'stock':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'crypto':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'etf':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const totalValue = filteredAndSortedHoldings.reduce(
    (sum, holding) => sum + holding.currentValue,
    0
  );
  const totalGainLoss = filteredAndSortedHoldings.reduce(
    (sum, holding) => sum + holding.gainLoss,
    0
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
              <div>Loading holdings...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <div className="mb-2 text-red-600">
              Error loading holdings: {error}
            </div>
            <Button onClick={handleRetry} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayHoldings.length === 0 && !searchTerm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <DollarSign className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p className="mb-2 text-lg font-medium">No holdings found</p>
            <p className="text-sm">
              Add your first transaction to see your holdings here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Holdings</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search holdings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-8"
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Value: </span>
            <span className="font-medium">{formatCurrency(totalValue)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Gain/Loss: </span>
            <span
              className={`font-medium ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(totalGainLoss)} (
              {formatPercentage(
                (totalGainLoss / (totalValue - totalGainLoss)) * 100
              )}
              )
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('symbol')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Symbol</span>
                    {sortField === 'symbol' && (
                      <span className="text-xs">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Name</span>
                    {sortField === 'name' && (
                      <span className="text-xs">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-right hover:bg-muted/50"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Quantity</span>
                    {sortField === 'quantity' && (
                      <span className="text-xs">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-right hover:bg-muted/50"
                  onClick={() => handleSort('currentPrice')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Price</span>
                    {sortField === 'currentPrice' && (
                      <span className="text-xs">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-right hover:bg-muted/50"
                  onClick={() => handleSort('currentValue')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Market Value</span>
                    {sortField === 'currentValue' && (
                      <span className="text-xs">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer text-right hover:bg-muted/50"
                  onClick={() => handleSort('gainLoss')}
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Gain/Loss</span>
                    {sortField === 'gainLoss' && (
                      <span className="text-xs">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedHoldings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    {searchTerm
                      ? 'No holdings found matching your search.'
                      : 'No holdings in this portfolio yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedHoldings.map((holding) => (
                  <TableRow key={holding.symbol} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-bold">
                          {holding.symbol}
                        </span>
                        <Badge
                          className={getTypeColor(holding.type)}
                          variant="secondary"
                        >
                          {holding.type.toUpperCase()}
                        </Badge>
                        {/* Show exchange badge for UK stocks */}
                        {holding.exchange && holding.exchange !== 'UNKNOWN' && (
                          <Badge
                            className={getExchangeBadgeColor(
                              holding.exchange as Exchange
                            )}
                            variant="outline"
                          >
                            {holding.exchange}
                          </Badge>
                        )}
                        {/* Detect UK symbol if exchange not set */}
                        {!holding.exchange && isUKSymbol(holding.symbol) && (
                          <Badge
                            className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            variant="outline"
                          >
                            LSE
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-48 truncate text-sm text-muted-foreground">
                        {holding.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {holding.quantity.toFixed(
                        holding.type === 'crypto' ? 4 : 0
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const livePrice = getLivePrice(holding.symbol);
                        if (livePrice) {
                          return (
                            <PriceDisplay
                              priceData={livePrice}
                              loading={priceLoading}
                              showTimestamp={preferences.showStalenessIndicator}
                              showStaleness={preferences.showStalenessIndicator}
                              showChange={false}
                              size="sm"
                              className="ml-auto items-end"
                            />
                          );
                        }
                        return (
                          <span className="font-mono">
                            {formatCurrency(holding.currentPrice)}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(holding.currentValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        {holding.gainLoss >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <div
                          className={`font-mono text-sm ${
                            holding.gainLoss >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          <div>{formatCurrency(holding.gainLoss)}</div>
                          <div className="text-xs">
                            ({formatPercentage(holding.gainLossPercent)})
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export const HoldingsTable = memo(HoldingsTableComponent);
