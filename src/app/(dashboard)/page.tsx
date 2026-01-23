'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePortfolioStore, useTransactionStore } from '@/lib/stores';
import { formatCurrency, formatPercentage, formatDate } from '@/lib/utils';
import { PortfolioChart } from '@/components/charts/portfolio-chart';
import { AllocationDonut } from '@/components/charts/allocation-donut';
import { HoldingsTable } from '@/components/tables/holdings-table';
import { AddTransactionDialog } from '@/components/forms/add-transaction';
import { CreatePortfolioDialog } from '@/components/forms/create-portfolio';
import { getTransactionTypeBadge } from '@/components/tables/transaction-table';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  PieChart,
  Download,
  FileSpreadsheet,
  BarChart3,
  RefreshCw,
  Calendar,
} from 'lucide-react';

export default function DashboardPage() {
  const {
    currentPortfolio,
    metrics,
    loadPortfolios,
    setCurrentPortfolio,
    portfolios,
    loading,
    error,
  } = usePortfolioStore();

  const {
    transactions,
    loadTransactions,
    loading: transactionsLoading,
  } = useTransactionStore();

  useEffect(() => {
    loadPortfolios();
  }, [loadPortfolios]);

  useEffect(() => {
    if (portfolios.length > 0 && !currentPortfolio) {
      setCurrentPortfolio(portfolios[0]);
    }
  }, [portfolios, currentPortfolio, setCurrentPortfolio]);

  useEffect(() => {
    if (currentPortfolio?.id) {
      loadTransactions(currentPortfolio.id);
    }
  }, [currentPortfolio?.id, loadTransactions]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <div className="text-lg">Loading portfolio data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Error: {error}</div>
          <Button onClick={() => loadPortfolios()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!currentPortfolio) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Welcome to Portfolio Tracker</h2>
            <p className="text-muted-foreground max-w-md">
              Create your first portfolio to start tracking your investments and analyzing your financial performance.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <CreatePortfolioDialog />
            <Button variant="outline">Import Data</Button>
          </div>
        </div>
      </div>
    );
  }

  const totalValue = metrics?.totalValue?.toString() || '0';
  const totalGain = metrics?.totalGain?.toString() || '0';
  const totalGainPercent = metrics?.totalGainPercent || 0;
  const dayChange = metrics?.dayChange?.toString() || '0';
  const dayChangePercent = metrics?.dayChangePercent || 0;

  const gainLossAmount = parseFloat(totalGain);
  const dayChangeAmount = parseFloat(dayChange);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">Portfolio:</p>
            <Badge variant="outline" className="font-medium">
              {currentPortfolio.name}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {currentPortfolio.type.toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <AddTransactionDialog />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Value */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(parseFloat(totalValue))}
            </div>
            <p className="text-xs text-muted-foreground">
              Current market value
            </p>
          </CardContent>
        </Card>

        {/* Total Gain/Loss */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
            {gainLossAmount >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              gainLossAmount >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {gainLossAmount >= 0 ? '+' : ''}{formatCurrency(gainLossAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(totalGainPercent)} from cost basis
            </p>
          </CardContent>
        </Card>

        {/* Day Change */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Day Change</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              dayChangeAmount >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {dayChangeAmount >= 0 ? '+' : ''}{formatCurrency(dayChangeAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPercentage(dayChangePercent)} from yesterday
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Button size="sm" variant="outline" className="w-full justify-start">
              <TrendingUp className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start">
              <PieChart className="h-4 w-4 mr-2" />
              Rebalance
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Portfolio Performance Chart */}
        <div className="md:col-span-2">
          <PortfolioChart />
        </div>

        {/* Asset Allocation Chart */}
        <div className="md:col-span-1">
          <AllocationDonut />
        </div>
      </div>

      {/* Holdings Table */}
      <HoldingsTable />

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <div>Loading activity...</div>
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No recent activity</p>
              <p className="text-sm">
                Add your first transaction to see activity here
              </p>
              <div className="mt-4">
                <AddTransactionDialog />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{transaction.assetId}</span>
                          {getTransactionTypeBadge(transaction.type)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(transaction.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatCurrency(parseFloat(transaction.totalAmount.toString()))}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.quantity.toString()} shares
                      </div>
                    </div>
                  </div>
                ))}
              {transactions.length > 5 && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm">
                    View All Transactions
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}