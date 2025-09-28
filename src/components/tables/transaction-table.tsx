'use client';

import { useState, useEffect, useMemo, memo } from 'react';
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
  Calendar,
  DollarSign,
  Filter
} from 'lucide-react';
import { useTransactionStore, usePortfolioStore } from '@/lib/stores';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Transaction, TransactionType } from '@/types';

interface TransactionTableProps {
  showPortfolioFilter?: boolean;
}

export const getTransactionTypeBadge = (type: TransactionType) => {
  const typeConfig = {
    buy: { label: 'Buy', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
    sell: { label: 'Sell', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    dividend: { label: 'Dividend', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
    interest: { label: 'Interest', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
    split: { label: 'Split', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
    transfer_in: { label: 'Transfer In', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300' },
    transfer_out: { label: 'Transfer Out', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
    fee: { label: 'Fee', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' },
    tax: { label: 'Tax', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
    spinoff: { label: 'Spinoff', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
    merger: { label: 'Merger', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
    reinvestment: { label: 'Reinvest', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  };

  const config = typeConfig[type] || typeConfig.buy;
  return (
    <Badge variant="secondary" className={config.color}>
      {config.label}
    </Badge>
  );
};

const TransactionTableComponent = ({ showPortfolioFilter = false }: TransactionTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');

  const {
    transactions,
    filteredTransactions,
    loading,
    error,
    loadTransactions,
    filterTransactions,
    clearError
  } = useTransactionStore();

  const { currentPortfolio } = usePortfolioStore();

  useEffect(() => {
    if (currentPortfolio?.id) {
      loadTransactions(currentPortfolio.id);
    }
  }, [currentPortfolio?.id, loadTransactions]);

  const displayTransactions = useMemo(() => {
    let filtered = filteredTransactions.length > 0 ? filteredTransactions : transactions;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.assetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredTransactions, transactions, searchTerm, filterType]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <div>Loading transactions...</div>
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
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-red-600 mb-2">Error loading transactions: {error}</div>
            <Button onClick={() => { clearError(); loadTransactions(currentPortfolio?.id); }} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayTransactions.length === 0 && !searchTerm && filterType === 'all') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No transactions found</p>
            <p className="text-sm">Add your first transaction to get started tracking your portfolio.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transaction History</span>
          <Badge variant="outline">{displayTransactions.length} transactions</Badge>
        </CardTitle>

        {/* Search and Filter Controls */}
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by symbol or notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as TransactionType | 'all')}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">All Types</option>
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
            <option value="dividend">Dividend</option>
            <option value="split">Split</option>
            <option value="transfer_in">Transfer In</option>
            <option value="transfer_out">Transfer Out</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {displayTransactions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No transactions match your search criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Fees</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(transaction.date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getTransactionTypeBadge(transaction.type)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {transaction.assetId}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.quantity.toString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(parseFloat(transaction.price.toString()))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(parseFloat(transaction.totalAmount.toString()))}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {transaction.fees.toString() !== '0' ? formatCurrency(parseFloat(transaction.fees.toString())) : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {transaction.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const TransactionTable = memo(TransactionTableComponent);