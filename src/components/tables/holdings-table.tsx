'use client';

import { useState, useMemo } from 'react';
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
import { Search, TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react';
import { usePortfolioStore } from '@/lib/stores';
import { formatCurrency, formatPercentage } from '@/lib/utils';

interface HoldingData {
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
  const [sortField, setSortField] = useState<keyof HoldingData>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Mock data for now - replace with actual store data
  const mockHoldings = useMemo((): HoldingData[] => [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      quantity: 100,
      currentPrice: 195.89,
      currentValue: 19589,
      costBasis: 15000,
      gainLoss: 4589,
      gainLossPercent: 30.59,
      type: 'stock',
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corporation',
      quantity: 50,
      currentPrice: 378.85,
      currentValue: 18942.5,
      costBasis: 17500,
      gainLoss: 1442.5,
      gainLossPercent: 8.24,
      type: 'stock',
    },
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      quantity: 0.5,
      currentPrice: 43000,
      currentValue: 21500,
      costBasis: 22000,
      gainLoss: -500,
      gainLossPercent: -2.27,
      type: 'crypto',
    },
    {
      symbol: 'SPY',
      name: 'SPDR S&P 500 ETF',
      quantity: 25,
      currentPrice: 451.02,
      currentValue: 11275.5,
      costBasis: 10500,
      gainLoss: 775.5,
      gainLossPercent: 7.38,
      type: 'etf',
    },
  ], []);

  const filteredAndSortedHoldings = useMemo(() => {
    let filtered = mockHoldings.filter(
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
  }, [mockHoldings, searchTerm, sortField, sortDirection]);

  const handleSort = (field: keyof HoldingData) => {
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