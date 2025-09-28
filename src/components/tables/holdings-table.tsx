'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Search, TrendingUp, TrendingDown, MoreHorizontal, DollarSign } from 'lucide-react';
import { usePortfolioStore } from '@/lib/stores';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { Holding } from '@/types';

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
}

export function HoldingsTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof HoldingDisplayData>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const {
    holdings,
    assets,
    currentPortfolio,
    loading,
    error,
    loadHoldings,
    clearError
  } = usePortfolioStore();

  useEffect(() => {
    if (currentPortfolio?.id) {
      loadHoldings(currentPortfolio.id);
    }
  }, [currentPortfolio?.id, loadHoldings]);

  // Transform real holdings data for display
  const displayHoldings = useMemo((): HoldingDisplayData[] => {
    return holdings.map((holding) => {
      const asset = assets.find((a) => a.id === holding.assetId);
      const currentValue = parseFloat(holding.currentValue.toString());
      const costBasis = parseFloat(holding.costBasis.toString());
      const gainLoss = parseFloat(holding.unrealizedGain.toString());
      const quantity = parseFloat(holding.quantity.toString());
      const currentPrice = quantity > 0 ? currentValue / quantity : 0;

      return {
        id: holding.id,
        symbol: asset?.symbol || holding.assetId,
        name: asset?.name || 'Unknown Asset',
        quantity,
        currentPrice,
        currentValue,
        costBasis,
        gainLoss,
        gainLossPercent: holding.unrealizedGainPercent,
        type: asset?.type || 'other',
      };
    });
  }, [holdings, assets]);

  const filteredAndSortedHoldings = useMemo(() => {
    let filtered = displayHoldings.filter(
      (holding) =>
        holding.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        holding.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

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

  const totalValue = filteredAndSortedHoldings.reduce((sum, holding) => sum + holding.currentValue, 0);
  const totalGainLoss = filteredAndSortedHoldings.reduce((sum, holding) => sum + holding.gainLoss, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Error loading holdings: {error}</div>
            <Button onClick={() => { clearError(); if (currentPortfolio?.id) loadHoldings(currentPortfolio.id); }} variant="outline">
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
          <div className="text-center text-muted-foreground py-8">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No holdings found</p>
            <p className="text-sm">Add your first transaction to see your holdings here.</p>
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
                className="pl-8 w-64"
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
            <span className={`font-medium ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalGainLoss)} ({formatPercentage((totalGainLoss / (totalValue - totalGainLoss)) * 100)})
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
                  className="cursor-pointer hover:bg-muted/50 text-right"
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
                  className="cursor-pointer hover:bg-muted/50 text-right"
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
                  className="cursor-pointer hover:bg-muted/50 text-right"
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
                  className="cursor-pointer hover:bg-muted/50 text-right"
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'No holdings found matching your search.' : 'No holdings in this portfolio yet.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedHoldings.map((holding) => (
                  <TableRow key={holding.symbol} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-bold">{holding.symbol}</span>
                        <Badge className={getTypeColor(holding.type)} variant="secondary">
                          {holding.type.toUpperCase()}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-48 truncate text-sm text-muted-foreground">
                        {holding.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {holding.quantity.toFixed(holding.type === 'crypto' ? 4 : 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(holding.currentPrice)}
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
                        <div className={`font-mono text-sm ${
                          holding.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
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
}