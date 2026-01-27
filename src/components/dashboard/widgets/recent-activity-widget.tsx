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
const TYPE_BADGE_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  buy: { bg: 'bg-green-100', text: 'text-green-700', label: 'Buy' },
  sell: { bg: 'bg-red-100', text: 'text-red-700', label: 'Sell' },
  dividend: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Dividend' },
  transfer_in: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    label: 'Transfer In',
  },
  transfer_out: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    label: 'Transfer Out',
  },
  split: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Split' },
  reinvestment: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Reinvest' },
};

function getTransactionBadge(type: string) {
  const style = TYPE_BADGE_STYLES[type] || {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    label: type,
  };
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}

function ActivitySkeleton() {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              <div>
                <div className="mb-1 h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="text-right">
              <div className="mb-1 h-4 w-16 animate-pulse rounded bg-muted" />
              <div className="h-3 w-12 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActivityEmpty() {
  return (
    <Card data-testid="recent-activity-widget" className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <div className="flex h-full flex-col items-center justify-center text-center">
          <Activity className="mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No recent activity</p>
          <p className="mt-1 text-sm text-muted-foreground">
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
  currency: string;
}

const TransactionRow = memo(function TransactionRow({
  transaction,
  assetMap,
  currency,
}: TransactionRowProps) {
  const asset = assetMap.get(transaction.assetId);
  const displaySymbol = asset?.symbol || transaction.assetId;

  return (
    <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
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
          {formatCurrency(transaction.totalAmount.toNumber(), currency)}
        </div>
        <div className="text-sm text-muted-foreground">
          {transaction.quantity.toString()} shares
        </div>
      </div>
    </div>
  );
});

export const RecentActivityWidget = memo(function RecentActivityWidget({
  portfolioId,
  limit = 5,
  isLoading: externalLoading = false,
}: RecentActivityWidgetProps) {
  const { currentPortfolio } = usePortfolioStore();
  const effectivePortfolioId = portfolioId || currentPortfolio?.id;
  const currency = currentPortfolio?.currency || 'USD';

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
    <Card data-testid="recent-activity-widget" className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0 flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
          {transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              assetMap={assetMap}
              currency={currency}
            />
          ))}
        </div>
        {totalCount > limit && (
          <div className="flex-shrink-0 pt-4 text-center">
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
