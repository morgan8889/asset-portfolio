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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  DollarSign,
  Edit,
  Globe2,
} from 'lucide-react';
import { usePortfolioStore, usePriceStore } from '@/lib/stores';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { PriceDisplay } from '@/components/dashboard/price-display';
import { Holding, LivePriceData, Exchange, Asset } from '@/types';
import { getExchangeBadgeColor } from '@/lib/services/asset-search';
import { isUKSymbol } from '@/lib/utils/market-utils';
import { ManualPriceUpdateDialog } from '@/components/forms/manual-price-update-dialog';
import { RegionOverrideDialog } from '@/components/forms/region-override-dialog';
import { getAssetAnnualYield } from '@/lib/services/property-service';

interface HoldingDisplayData {
  id: string;
  assetId: string;
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
  asset?: Asset;
  ownershipPercentage?: number;
  valuationMethod?: 'AUTO' | 'MANUAL';
  isRental?: boolean;
  annualYield?: number;
}

const HoldingsTableComponent = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] =
    useState<keyof HoldingDisplayData>('symbol');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [priceUpdateAsset, setPriceUpdateAsset] = useState<Asset | null>(null);
  const [regionUpdateAsset, setRegionUpdateAsset] = useState<Asset | null>(
    null
  );

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

      // Calculate annual yield for rental properties using helper function
      const annualYield = asset ? getAssetAnnualYield(asset) : undefined;

      return {
        id: holding.id,
        assetId: holding.assetId,
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
        asset,
        ownershipPercentage: holding.ownershipPercentage,
        valuationMethod: asset?.valuationMethod,
        isRental: asset?.rentalInfo?.isRental,
        annualYield,
      };
    });
  }, [holdings, assets, getLivePrice]);

  const filteredAndSortedHoldings = useMemo(() => {
    let filtered = displayHoldings.filter(
      (holding) =>
        (holding.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          holding.name.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (typeFilter === 'all' || holding.type === typeFilter)
    );

    filtered.sort((a, b) => {
      const aValue = a[sortField] ?? '';
      const bValue = b[sortField] ?? '';

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [displayHoldings, searchTerm, typeFilter, sortField, sortDirection]);

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
      case 'real_estate':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'bond':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'commodity':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
      case 'cash':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'other':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading && holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            Loading holdings...
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
            <p className="mb-4 text-destructive">{error}</p>
            <Button onClick={handleRetry}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (holdings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <p className="mb-4">No holdings yet.</p>
            <p className="text-sm">
              Add transactions to see your portfolio holdings here.
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
          <CardTitle>Holdings ({filteredAndSortedHoldings.length})</CardTitle>
          <div className="flex gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search holdings..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="stock">Stock</SelectItem>
                <SelectItem value="etf">ETF</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="real_estate">Real Estate</SelectItem>
                <SelectItem value="bond">Bond</SelectItem>
                <SelectItem value="commodity">Commodity</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('symbol')}
                >
                  Symbol{' '}
                  {sortField === 'symbol' &&
                    (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('quantity')}
                >
                  Quantity{' '}
                  {sortField === 'quantity' &&
                    (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('currentValue')}
                >
                  Net Value{' '}
                  {sortField === 'currentValue' &&
                    (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead
                  className="cursor-pointer text-right"
                  onClick={() => handleSort('gainLoss')}
                >
                  Gain/Loss{' '}
                  {sortField === 'gainLoss' &&
                    (sortDirection === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedHoldings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No holdings match your search criteria
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedHoldings.map((holding) => (
                  <TableRow key={holding.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <div>{holding.symbol}</div>
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            variant="outline"
                            className={getTypeColor(holding.type)}
                          >
                            {holding.type.toUpperCase()}
                          </Badge>
                          {holding.valuationMethod === 'MANUAL' && (
                            <Badge
                              variant="outline"
                              className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
                            >
                              Manual
                            </Badge>
                          )}
                          {holding.isRental &&
                            holding.annualYield !== undefined && (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                              >
                                Rental: {holding.annualYield.toFixed(2)}%
                              </Badge>
                            )}
                          {holding.ownershipPercentage &&
                            holding.ownershipPercentage < 100 && (
                              <Badge variant="outline" className="text-xs">
                                {holding.ownershipPercentage}% owned
                              </Badge>
                            )}
                          {holding.exchange &&
                            holding.exchange !== 'UNKNOWN' && (
                              <Badge
                                className={getExchangeBadgeColor(
                                  holding.exchange as Exchange
                                )}
                                variant="outline"
                              >
                                {holding.exchange}
                              </Badge>
                            )}
                          {!holding.exchange && isUKSymbol(holding.symbol) && (
                            <Badge
                              className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              variant="outline"
                            >
                              LSE
                            </Badge>
                          )}
                        </div>
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
                              showChange={false}
                              size="sm"
                            />
                          );
                        }
                        return (
                          <div className="font-mono">
                            {formatCurrency(holding.currentPrice)}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(holding.currentValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className={`flex items-center justify-end gap-1 ${
                          holding.gainLoss >= 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {holding.gainLoss >= 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <div>
                          <div>{formatCurrency(holding.gainLoss)}</div>
                          <div className="text-xs">
                            ({formatPercentage(holding.gainLossPercent)})
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {holding.asset?.valuationMethod === 'MANUAL' && (
                            <DropdownMenuItem
                              onClick={() =>
                                setPriceUpdateAsset(holding.asset!)
                              }
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Update Price
                            </DropdownMenuItem>
                          )}
                          {holding.asset && (
                            <DropdownMenuItem
                              onClick={() =>
                                setRegionUpdateAsset(holding.asset!)
                              }
                            >
                              <Globe2 className="mr-2 h-4 w-4" />
                              Set Region
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Manual Price Update Dialog */}
      {priceUpdateAsset && (
        <ManualPriceUpdateDialog
          asset={priceUpdateAsset}
          open={!!priceUpdateAsset}
          onOpenChange={(open) => !open && setPriceUpdateAsset(null)}
        />
      )}

      {/* Region Override Dialog */}
      {regionUpdateAsset && (
        <RegionOverrideDialog
          asset={regionUpdateAsset}
          open={!!regionUpdateAsset}
          onOpenChange={(open) => !open && setRegionUpdateAsset(null)}
        />
      )}
    </Card>
  );
};

export const HoldingsTable = memo(HoldingsTableComponent);
