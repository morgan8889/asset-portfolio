'use client';

/**
 * Recent Activity Widget
 *
 * Displays recent transactions in the portfolio.
 * Can be used standalone with DashboardContainer.
 */

import { memo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Calendar } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Transaction } from '@/types';
import { transactionQueries, assetQueries } from '@/lib/db';
import { Asset } from '@/types';
import { usePortfolioStore } from '@/lib/stores';

interface RecentActivityWidgetProps {
  portfolioId?: string;
  limit?: number;
  isLoading?: boolean;
}

// Transaction type badge colors
const TYPE_BADGE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  buy: { bg: 'bg-green-100', text: 'text-green-700', label: 'Buy' },
  sell: { bg: 'bg-red-100', text: 'text-red-700', label: 'Sell' },
  dividend: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Dividend' },
  transfer_in: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Transfer In' },
  transfer_out: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Transfer Out' },
  split: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Split' },
  reinvestment: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Reinvest' },
};

function getTransactionBadge(type: string) {
  const style = TYPE_BADGE_STYLES[type] || { bg: 'bg-gray-100', text: 'text-gray-700', label: type };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function ActivitySkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              <div>
                <div className="h-4 w-24 bg-muted animate-pulse rounded mb-1" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </div>
            </div>
            <div className="text-right">
              <div className="h-4 w-16 bg-muted animate-pulse rounded mb-1" />
              <div className="h-3 w-12 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActivityEmpty() {
  return (
    <Card data-testid="recent-activity-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <p className="text-muted-foreground">No recent activity</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add transactions to see activity here
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface TransactionRowProps {
  transaction: Transaction;
  assetMap: Map<string, Asset>;
}

function TransactionRow({ transaction, assetMap }: TransactionRowProps) {
  const asset = assetMap.get(transaction.assetId);
  const displaySymbol = asset?.symbol || transaction.assetId;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{displaySymbol}</span>
            {getTransactionBadge(transaction.type)}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatDate(transaction.date)}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-medium">
          {formatCurrency(Number(transaction.totalAmount))}
        </div>
        <div className="text-sm text-muted-foreground">
          {transaction.quantity.toString()} shares
        </div>
      </div>
    </div>
  );
}

export const RecentActivityWidget = memo(function RecentActivityWidget({
  portfolioId,
  limit = 5,
  isLoading: externalLoading = false,
}: RecentActivityWidgetProps) {
  const { currentPortfolio } = usePortfolioStore();
  const effectivePortfolioId = portfolioId || currentPortfolio?.id;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assetMap, setAssetMap] = useState<Map<string, Asset>>(new Map());
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!effectivePortfolioId) {
      setTransactions([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchActivity() {
      setLoading(true);
      try {
        const [allTransactions, assets] = await Promise.all([
          transactionQueries.getByPortfolio(effectivePortfolioId!),
          assetQueries.getAll(),
        ]);

        if (cancelled) return;

        // Sort by date descending and take the limit
        const sorted = [...allTransactions].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setTransactions(sorted.slice(0, limit));
        setTotalCount(sorted.length);
        setAssetMap(new Map(assets.map((a) => [a.id, a])));
      } catch (error) {
        console.error('Failed to load recent activity:', error);
        if (!cancelled) {
          setTransactions([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchActivity();

    return () => {
      cancelled = true;
    };
  }, [effectivePortfolioId, limit]);

  if (externalLoading || loading) {
    return <ActivitySkeleton />;
  }

  if (!effectivePortfolioId || transactions.length === 0) {
    return <ActivityEmpty />;
  }

  return (
    <Card data-testid="recent-activity-widget">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              assetMap={assetMap}
            />
          ))}
        </div>
        {totalCount > limit && (
          <div className="text-center pt-4">
            <Button variant="outline" size="sm">
              View All {totalCount} Transactions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

RecentActivityWidget.displayName = 'RecentActivityWidget';
